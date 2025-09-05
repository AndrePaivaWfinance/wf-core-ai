// ===================================================
// src/core/memory/MemoryManager.js
// ===================================================
const { CosmosClient } = require('@azure/cosmos');
const logger = require('../utils/logger');

class MemoryManager {
  constructor(config) {
    this.config = config;
    this.cosmosClient = null;
    this.database = null;
    this.containers = {
      conversations: null,
      userProfiles: null,
      learning: null,
      skillContext: null
    };
    this.initialized = false;
    this.cache = new Map();
    this.cacheTtl = 300000; // 5 minutos
  }

  async initialize() {
    try {
      if (!this.config.cosmos?.endpoint || !this.config.cosmos?.key) {
        logger.warn('Cosmos DB not configured, using in-memory storage');
        return this.initializeInMemory();
      }

      // Inicializar Cosmos DB
      this.cosmosClient = new CosmosClient({
        endpoint: this.config.cosmos.endpoint,
        key: this.config.cosmos.key
      });

      // Criar/obter database
      const { database } = await this.cosmosClient.databases.createIfNotExists({
        id: this.config.cosmos.database || 'mesh-memory'
      });
      this.database = database;

      // Criar containers necessários
      await this.createContainers();
      
      this.initialized = true;
      logger.info('Memory Manager initialized with Cosmos DB');

    } catch (error) {
      logger.error('Failed to initialize Cosmos DB, falling back to in-memory', {
        error: error.message
      });
      await this.initializeInMemory();
    }
  }

  async initializeInMemory() {
    this.inMemoryStorage = {
      conversations: new Map(),
      userProfiles: new Map(),
      learning: new Map(),
      skillContext: new Map()
    };
    this.initialized = true;
    logger.info('Memory Manager initialized with in-memory storage');
  }

  async createContainers() {
    const containerConfigs = [
      {
        name: 'conversations',
        partitionKey: '/userId',
        indexingPolicy: {
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/content/*' }]
        }
      },
      {
        name: 'userProfiles',
        partitionKey: '/userId',
        indexingPolicy: {
          includedPaths: [{ path: '/*' }],
          excludedPaths: []
        }
      },
      {
        name: 'learning',
        partitionKey: '/category',
        indexingPolicy: {
          includedPaths: [{ path: '/*' }],
          excludedPaths: []
        }
      },
      {
        name: 'skillContext',
        partitionKey: '/userId',
        indexingPolicy: {
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/rawData/*' }]
        }
      }
    ];

    for (const config of containerConfigs) {
      try {
        const { container } = await this.database.containers.createIfNotExists({
          id: config.name,
          partitionKey: config.partitionKey,
          indexingPolicy: config.indexingPolicy
        });
        this.containers[config.name] = container;
        logger.debug(`Container ${config.name} ready`);
      } catch (error) {
        logger.error(`Failed to create container ${config.name}`, {
          error: error.message
        });
      }
    }
  }

  // ===================================================
  // CONVERSAS E CONTEXTO
  // ===================================================
  async saveConversation(userId, messages, metadata = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const conversationData = {
      id: `conv_${userId}_${Date.now()}`,
      userId,
      messages,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        channelId: metadata.channelId || 'unknown',
        sessionId: metadata.sessionId || this.generateSessionId(userId)
      }
    };

    if (this.cosmosClient) {
      try {
        await this.containers.conversations.items.create(conversationData);
        logger.debug('Conversation saved to Cosmos DB', { userId, messageCount: messages.length });
      } catch (error) {
        logger.error('Failed to save conversation to Cosmos DB', {
          userId,
          error: error.message
        });
        // Fallback para memória
        this.saveToMemory('conversations', conversationData.id, conversationData);
      }
    } else {
      this.saveToMemory('conversations', conversationData.id, conversationData);
    }

    // Atualizar perfil do usuário
    await this.updateUserProfile(userId, { lastInteraction: new Date().toISOString() });
  }

  async getConversationHistory(userId, limit = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `conv_history_${userId}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let conversations = [];

    if (this.cosmosClient && this.containers.conversations) {
      try {
        const query = {
          query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.metadata.timestamp DESC OFFSET 0 LIMIT @limit',
          parameters: [
            { name: '@userId', value: userId },
            { name: '@limit', value: limit }
          ]
        };

        const { resources } = await this.containers.conversations.items.query(query).fetchAll();
        conversations = resources;
      } catch (error) {
        logger.error('Failed to get conversation history from Cosmos DB', {
          userId,
          error: error.message
        });
      }
    }

    // Fallback para memória
    if (conversations.length === 0 && this.inMemoryStorage) {
      conversations = Array.from(this.inMemoryStorage.conversations.values())
        .filter(conv => conv.userId === userId)
        .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp))
        .slice(0, limit);
    }

    this.saveToCache(cacheKey, conversations);
    return conversations;
  }

  // ===================================================
  // PERFIL DO USUÁRIO E PREFERÊNCIAS
  // ===================================================
  async getUserProfile(userId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `user_profile_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let profile = null;

    if (this.cosmosClient && this.containers.userProfiles) {
      try {
        const { resource } = await this.containers.userProfiles.item(userId, userId).read();
        profile = resource;
      } catch (error) {
        if (error.code !== 404) {
          logger.error('Failed to get user profile from Cosmos DB', {
            userId,
            error: error.message
          });
        }
      }
    }

    // Fallback para memória ou criar novo perfil
    if (!profile) {
      if (this.inMemoryStorage?.userProfiles.has(userId)) {
        profile = this.inMemoryStorage.userProfiles.get(userId);
      } else {
        profile = this.createDefaultUserProfile(userId);
        await this.updateUserProfile(userId, profile);
      }
    }

    this.saveToCache(cacheKey, profile);
    return profile;
  }

  async updateUserProfile(userId, updates) {
    if (!this.initialized) {
      await this.initialize();
    }

    const currentProfile = await this.getUserProfile(userId);
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      id: userId,
      userId,
      lastUpdated: new Date().toISOString()
    };

    if (this.cosmosClient && this.containers.userProfiles) {
      try {
        await this.containers.userProfiles.items.upsert(updatedProfile);
        logger.debug('User profile updated in Cosmos DB', { userId });
      } catch (error) {
        logger.error('Failed to update user profile in Cosmos DB', {
          userId,
          error: error.message
        });
        // Fallback para memória
        this.saveToMemory('userProfiles', userId, updatedProfile);
      }
    } else {
      this.saveToMemory('userProfiles', userId, updatedProfile);
    }

    // Limpar cache
    this.cache.delete(`user_profile_${userId}`);
    return updatedProfile;
  }

  createDefaultUserProfile(userId) {
    return {
      id: userId,
      userId,
      preferences: {
        language: 'pt-BR',
        responseStyle: 'professional',
        preferredSkills: [],
        timezone: 'America/Sao_Paulo'
      },
      learning: {
        frequentQuestions: [],
        skillUsage: {},
        satisfactionScore: 0,
        feedbackCount: 0
      },
      context: {
        role: 'unknown',
        department: 'unknown',
        expertise: [],
        commonTasks: []
      },
      statistics: {
        totalInteractions: 0,
        skillsUsed: {},
        averageSessionLength: 0,
        lastInteraction: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  // ===================================================
  // SISTEMA DE APRENDIZADO
  // ===================================================
  async recordLearningEvent(category, event, metadata = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const learningData = {
      id: `learn_${category}_${Date.now()}`,
      category,
      event,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };

    if (this.cosmosClient && this.containers.learning) {
      try {
        await this.containers.learning.items.create(learningData);
        logger.debug('Learning event recorded', { category, event: event.type });
      } catch (error) {
        logger.error('Failed to record learning event', {
          category,
          error: error.message
        });
        this.saveToMemory('learning', learningData.id, learningData);
      }
    } else {
      this.saveToMemory('learning', learningData.id, learningData);
    }
  }

  async getLearningInsights(category, timeframe = '7d') {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `learning_insights_${category}_${timeframe}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let insights = { patterns: [], trends: [], recommendations: [] };

    if (this.cosmosClient && this.containers.learning) {
      try {
        const timeFilter = this.getTimeframeFilter(timeframe);
        const query = {
          query: 'SELECT * FROM c WHERE c.category = @category AND c.metadata.timestamp >= @timeFilter',
          parameters: [
            { name: '@category', value: category },
            { name: '@timeFilter', value: timeFilter }
          ]
        };

        const { resources } = await this.containers.learning.items.query(query).fetchAll();
        insights = this.analyzeLearningData(resources);
      } catch (error) {
        logger.error('Failed to get learning insights', {
          category,
          error: error.message
        });
      }
    }

    this.saveToCache(cacheKey, insights, 600000); // Cache por 10 minutos
    return insights;
  }

  // ===================================================
  // CONTEXTO DE SKILLS E AZURE FUNCTIONS
  // ===================================================
  async saveSkillContext(userId, skillName, context, azureFunctionResult = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const skillContextData = {
      id: `skill_${userId}_${skillName}_${Date.now()}`,
      userId,
      skillName,
      context,
      azureFunctionResult,
      metadata: {
        timestamp: new Date().toISOString(),
        hasAzureFunction: !!azureFunctionResult,
        executionTime: azureFunctionResult?.executionTime || null
      }
    };

    if (this.cosmosClient && this.containers.skillContext) {
      try {
        await this.containers.skillContext.items.create(skillContextData);
        logger.debug('Skill context saved', { userId, skillName });
      } catch (error) {
        logger.error('Failed to save skill context', {
          userId,
          skillName,
          error: error.message
        });
        this.saveToMemory('skillContext', skillContextData.id, skillContextData);
      }
    } else {
      this.saveToMemory('skillContext', skillContextData.id, skillContextData);
    }

    // Atualizar estatísticas do usuário
    await this.updateUserSkillStats(userId, skillName);
  }

  async getSkillContext(userId, skillName, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `skill_context_${userId}_${skillName}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let contexts = [];

    if (this.cosmosClient && this.containers.skillContext) {
      try {
        const query = {
          query: 'SELECT * FROM c WHERE c.userId = @userId AND c.skillName = @skillName ORDER BY c.metadata.timestamp DESC OFFSET 0 LIMIT @limit',
          parameters: [
            { name: '@userId', value: userId },
            { name: '@skillName', value: skillName },
            { name: '@limit', value: limit }
          ]
        };

        const { resources } = await this.containers.skillContext.items.query(query).fetchAll();
        contexts = resources;
      } catch (error) {
        logger.error('Failed to get skill context', {
          userId,
          skillName,
          error: error.message
        });
      }
    }

    // Fallback para memória
    if (contexts.length === 0 && this.inMemoryStorage) {
      contexts = Array.from(this.inMemoryStorage.skillContext.values())
        .filter(ctx => ctx.userId === userId && ctx.skillName === skillName)
        .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp))
        .slice(0, limit);
    }

    this.saveToCache(cacheKey, contexts);
    return contexts;
  }

  // ===================================================
  // MÉTODOS AUXILIARES
  // ===================================================
  generateSessionId(userId) {
    return `sess_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTimeframeFilter(timeframe) {
    const now = new Date();
    const timeMap = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const offset = timeMap[timeframe] || timeMap['7d'];
    return new Date(now.getTime() - offset).toISOString();
  }

  analyzeLearningData(data) {
    // Análise simples dos dados de aprendizado
    const patterns = [];
    const trends = [];
    const recommendations = [];

    // Analisar padrões frequentes
    const eventCounts = {};
    data.forEach(item => {
      const eventType = item.event.type || 'unknown';
      eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
    });

    // Gerar insights básicos
    Object.entries(eventCounts).forEach(([type, count]) => {
      if (count > 5) {
        patterns.push({
          type: 'frequent_event',
          description: `Evento ${type} ocorre frequentemente (${count} vezes)`,
          count
        });
      }
    });

    return { patterns, trends, recommendations };
  }

  async updateUserSkillStats(userId, skillName) {
    const profile = await this.getUserProfile(userId);
    const skillStats = profile.statistics.skillsUsed || {};
    skillStats[skillName] = (skillStats[skillName] || 0) + 1;

    await this.updateUserProfile(userId, {
      statistics: {
        ...profile.statistics,
        skillsUsed: skillStats,
        totalInteractions: profile.statistics.totalInteractions + 1
      }
    });
  }

  // Cache management
  saveToCache(key, data, ttl = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTtl
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  saveToMemory(collection, id, data) {
    if (this.inMemoryStorage && this.inMemoryStorage[collection]) {
      this.inMemoryStorage[collection].set(id, data);
    }
  }

  clearCache() {
    this.cache.clear();
    logger.debug('Memory cache cleared');
  }

  async shutdown() {
    this.clearCache();
    if (this.cosmosClient) {
      // Cosmos client não precisa de shutdown explícito
    }
    logger.info('Memory Manager shut down');
  }
}

module.exports = { MemoryManager };