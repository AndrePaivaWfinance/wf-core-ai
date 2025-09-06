// ================================================
// SISTEMA DE MEMÓRIA E APRENDIZAGEM - MESH
// ================================================
// src/core/memory/MemoryManager.js

const logger = require('../../utils/logger');

class MeshMemoryManager {
  constructor() {
    // Tipos de memória
    this.conversationMemory = new Map(); // Conversas por usuário
    this.userProfiles = new Map();       // Perfis dos usuários
    this.learningData = new Map();       // Dados de aprendizagem
    this.contextMemory = new Map();      // Contexto de negócios
    this.skillsUsage = new Map();        // Uso de skills por usuário
    
    // Configurações
    this.maxConversationHistory = 50;   // Máximo de mensagens por usuário
    this.learningThreshold = 5;         // Mínimo de interações para aprender
    this.memoryCleanupInterval = 24 * 60 * 60 * 1000; // 24 horas
    
    // Inicialização
    this.initializeMemorySystem();
  }

  // ================================================
  // INICIALIZAÇÃO E CONFIGURAÇÃO
  // ================================================
  
  initializeMemorySystem() {
    logger.info('🧠 Initializing MESH Memory System...');
    
    // Cleanup automático de memória antiga
    setInterval(() => {
      this.cleanupOldMemories();
    }, this.memoryCleanupInterval);
    
    logger.info('✅ MESH Memory System initialized');
  }

  // ================================================
  // MEMÓRIA DE CONVERSAS
  // ================================================
  
  async saveConversation(userId, userMessage, botResponse, metadata = {}) {
    try {
      if (!this.conversationMemory.has(userId)) {
        this.conversationMemory.set(userId, []);
      }
      
      const conversation = this.conversationMemory.get(userId);
      const timestamp = new Date().toISOString();
      
      // Adicionar nova interação
      conversation.push({
        timestamp,
        userMessage: userMessage.substring(0, 1000), // Limitar tamanho
        botResponse: botResponse.substring(0, 2000),
        metadata: {
          ...metadata,
          channel: metadata.channelId || 'unknown',
          messageLength: userMessage.length,
          responseLength: botResponse.length,
          processingTime: metadata.processingTime || 0
        }
      });
      
      // Manter apenas as últimas N conversas
      if (conversation.length > this.maxConversationHistory) {
        conversation.splice(0, conversation.length - this.maxConversationHistory);
      }
      
      // Atualizar perfil do usuário
      await this.updateUserProfile(userId, {
        lastInteraction: timestamp,
        totalInteractions: conversation.length
      });
      
      logger.debug('💾 Conversation saved', {
        userId: userId.substring(0, 8) + '...',
        messageCount: conversation.length
      });
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to save conversation:', error.message);
      return false;
    }
  }

  getConversationHistory(userId, limit = 10) {
    try {
      const conversations = this.conversationMemory.get(userId) || [];
      return conversations.slice(-limit).map(conv => ({
        timestamp: conv.timestamp,
        userMessage: conv.userMessage,
        botResponse: conv.botResponse,
        channel: conv.metadata.channel
      }));
    } catch (error) {
      logger.error('❌ Failed to get conversation history:', error.message);
      return [];
    }
  }

  // ================================================
  // PERFIS DE USUÁRIO
  // ================================================
  
  async updateUserProfile(userId, updates) {
    try {
      if (!this.userProfiles.has(userId)) {
        this.userProfiles.set(userId, this.createDefaultProfile(userId));
      }
      
      const profile = this.userProfiles.get(userId);
      
      // Atualizar dados básicos
      Object.assign(profile, updates);
      profile.lastUpdated = new Date().toISOString();
      
      // Analisar padrões de uso
      await this.analyzeUserPatterns(userId, profile);
      
      return profile;
    } catch (error) {
      logger.error('❌ Failed to update user profile:', error.message);
      return null;
    }
  }

  createDefaultProfile(userId) {
    return {
      userId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      
      // Estatísticas básicas
      totalInteractions: 0,
      averageSessionLength: 0,
      preferredChannel: 'unknown',
      
      // Preferências identificadas
      preferences: {
        responseStyle: 'professional', // professional, casual, detailed
        preferredTopics: [],
        frequentQuestions: [],
        timeZone: 'America/Sao_Paulo'
      },
      
      // Contexto de negócios
      businessContext: {
        role: 'unknown',           // CFO, Analyst, Manager, etc.
        department: 'unknown',     // Finance, Accounting, etc.
        company: 'unknown',
        commonTasks: [],           // Tarefas frequentes
        expertise: []              // Áreas de expertise
      },
      
      // Dados de aprendizagem
      learning: {
        successfulInteractions: 0,
        problematicTopics: [],
        improvementAreas: [],
        satisfactionScore: 0
      }
    };
  }

  getUserProfile(userId) {
    return this.userProfiles.get(userId) || this.createDefaultProfile(userId);
  }

  // ================================================
  // SISTEMA DE APRENDIZAGEM
  // ================================================
  
  async recordLearningEvent(eventType, data, userId = null) {
    try {
      const timestamp = new Date().toISOString();
      const learningKey = `${eventType}_${timestamp}`;
      
      const learningEvent = {
        eventType,
        timestamp,
        userId,
        data,
        processed: false
      };
      
      this.learningData.set(learningKey, learningEvent);
      
      // Processar aprendizagem se houver dados suficientes
      if (this.learningData.size >= this.learningThreshold) {
        await this.processLearningData();
      }
      
      logger.debug('📚 Learning event recorded', {
        eventType,
        userId: userId?.substring(0, 8) + '...' || 'system'
      });
      
    } catch (error) {
      logger.error('❌ Failed to record learning event:', error.message);
    }
  }

  async processLearningData() {
    try {
      const unprocessedEvents = Array.from(this.learningData.values())
        .filter(event => !event.processed);
      
      if (unprocessedEvents.length === 0) return;
      
      // Agrupar eventos por tipo
      const eventGroups = this.groupEventsByType(unprocessedEvents);
      
      // Processar cada tipo de evento
      for (const [eventType, events] of Object.entries(eventGroups)) {
        await this.processEventGroup(eventType, events);
      }
      
      // Marcar eventos como processados
      unprocessedEvents.forEach(event => {
        event.processed = true;
        event.processedAt = new Date().toISOString();
      });
      
      logger.info('🎓 Learning data processed', {
        eventsProcessed: unprocessedEvents.length,
        eventTypes: Object.keys(eventGroups)
      });
      
    } catch (error) {
      logger.error('❌ Failed to process learning data:', error.message);
    }
  }

  groupEventsByType(events) {
    return events.reduce((groups, event) => {
      if (!groups[event.eventType]) {
        groups[event.eventType] = [];
      }
      groups[event.eventType].push(event);
      return groups;
    }, {});
  }

  async processEventGroup(eventType, events) {
    switch (eventType) {
      case 'successful_interaction':
        await this.learnFromSuccessfulInteractions(events);
        break;
      case 'failed_interaction':
        await this.learnFromFailedInteractions(events);
        break;
      case 'user_feedback':
        await this.learnFromUserFeedback(events);
        break;
      case 'skill_usage':
        await this.learnFromSkillUsage(events);
        break;
      default:
        logger.debug('Unknown learning event type:', eventType);
    }
  }

  // ================================================
  // APRENDIZAGEM ESPECÍFICA POR TIPO
  // ================================================
  
  async learnFromSuccessfulInteractions(events) {
    try {
      const patterns = this.analyzeSuccessPatterns(events);
      
      // Atualizar perfis de usuários baseado em sucessos
      for (const event of events) {
        if (event.userId) {
          const profile = this.getUserProfile(event.userId);
          profile.learning.successfulInteractions++;
          
          // Identificar tópicos de sucesso
          if (event.data.topic) {
            if (!profile.preferences.preferredTopics.includes(event.data.topic)) {
              profile.preferences.preferredTopics.push(event.data.topic);
            }
          }
        }
      }
      
      logger.debug('📈 Learned from successful interactions', {
        eventsCount: events.length,
        patternsFound: patterns.length
      });
      
    } catch (error) {
      logger.error('❌ Failed to learn from successful interactions:', error.message);
    }
  }

  async learnFromFailedInteractions(events) {
    try {
      // Identificar padrões de falha
      const failurePatterns = this.analyzeFailurePatterns(events);
      
      // Registrar tópicos problemáticos
      for (const event of events) {
        if (event.userId) {
          const profile = this.getUserProfile(event.userId);
          
          if (event.data.topic && !profile.learning.problematicTopics.includes(event.data.topic)) {
            profile.learning.problematicTopics.push(event.data.topic);
          }
          
          if (event.data.improvementArea && !profile.learning.improvementAreas.includes(event.data.improvementArea)) {
            profile.learning.improvementAreas.push(event.data.improvementArea);
          }
        }
      }
      
      logger.debug('📉 Learned from failed interactions', {
        eventsCount: events.length,
        failurePatternsFound: failurePatterns.length
      });
      
    } catch (error) {
      logger.error('❌ Failed to learn from failed interactions:', error.message);
    }
  }

  async learnFromSkillUsage(events) {
    try {
      // Analisar uso de skills por usuário
      const skillUsageMap = new Map();
      
      for (const event of events) {
        if (event.userId && event.data.skillName) {
          const key = `${event.userId}_${event.data.skillName}`;
          if (!skillUsageMap.has(key)) {
            skillUsageMap.set(key, 0);
          }
          skillUsageMap.set(key, skillUsageMap.get(key) + 1);
        }
      }
      
      // Atualizar preferências de usuários
      skillUsageMap.forEach((count, key) => {
        const [userId, skillName] = key.split('_');
        const profile = this.getUserProfile(userId);
        
        // Adicionar skill às tarefas comuns se usado frequentemente
        if (count >= 3 && !profile.businessContext.commonTasks.includes(skillName)) {
          profile.businessContext.commonTasks.push(skillName);
        }
      });
      
      logger.debug('🎯 Learned from skill usage', {
        eventsCount: events.length,
        uniqueSkillUsages: skillUsageMap.size
      });
      
    } catch (error) {
      logger.error('❌ Failed to learn from skill usage:', error.message);
    }
  }

  // ================================================
  // ANÁLISE DE PADRÕES
  // ================================================
  
  async analyzeUserPatterns(userId, profile) {
    try {
      const conversations = this.getConversationHistory(userId, 20);
      if (conversations.length < 3) return; // Poucos dados para análise
      
      // Analisar padrões de horário
      const timePatterns = this.analyzeTimePatterns(conversations);
      
      // Analisar tópicos frequentes
      const topicPatterns = this.analyzeTopicPatterns(conversations);
      
      // Analisar estilo de comunicação
      const communicationStyle = this.analyzeCommunicationStyle(conversations);
      
      // Atualizar perfil com insights
      profile.preferences.responseStyle = communicationStyle;
      profile.preferences.frequentQuestions = topicPatterns.slice(0, 5);
      
      logger.debug('🔍 User patterns analyzed', {
        userId: userId.substring(0, 8) + '...',
        conversationsAnalyzed: conversations.length,
        topicsFound: topicPatterns.length
      });
      
    } catch (error) {
      logger.error('❌ Failed to analyze user patterns:', error.message);
    }
  }

  analyzeSuccessPatterns(events) {
    // Implementar análise de padrões de sucesso
    return events.map(event => ({
      pattern: event.data.successFactor || 'unknown',
      frequency: 1,
      context: event.data.context
    }));
  }

  analyzeFailurePatterns(events) {
    // Implementar análise de padrões de falha
    return events.map(event => ({
      pattern: event.data.failureReason || 'unknown',
      frequency: 1,
      context: event.data.context
    }));
  }

  analyzeTimePatterns(conversations) {
    // Analisar horários preferidos de interação
    const hours = conversations.map(conv => {
      return new Date(conv.timestamp).getHours();
    });
    
    // Encontrar horário mais comum
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
  }

  analyzeTopicPatterns(conversations) {
    // Analisar tópicos mais discutidos
    const topics = [];
    
    conversations.forEach(conv => {
      const message = conv.userMessage.toLowerCase();
      
      // Identificar tópicos financeiros
      if (message.includes('fluxo') && message.includes('caixa')) {
        topics.push('fluxo_caixa');
      }
      if (message.includes('conciliação') || message.includes('conciliacao')) {
        topics.push('conciliacao_bancaria');
      }
      if (message.includes('relatório') || message.includes('relatorio')) {
        topics.push('relatorios');
      }
      if (message.includes('dre')) {
        topics.push('dre');
      }
      if (message.includes('balanço') || message.includes('balanco')) {
        topics.push('balanco_patrimonial');
      }
    });
    
    // Contar frequência de tópicos
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([topic]) => topic);
  }

  analyzeCommunicationStyle(conversations) {
    // Analisar estilo de comunicação do usuário
    const avgMessageLength = conversations.reduce((sum, conv) => {
      return sum + conv.userMessage.length;
    }, 0) / conversations.length;
    
    if (avgMessageLength > 100) {
      return 'detailed'; // Usuário gosta de detalhes
    } else if (avgMessageLength < 30) {
      return 'concise'; // Usuário prefere respostas concisas
    } else {
      return 'professional'; // Estilo profissional padrão
    }
  }

  // ================================================
  // CONTEXTUALIZAÇÃO PARA RESPOSTAS
  // ================================================
  
  getContextForResponse(userId, currentMessage) {
    try {
      const profile = this.getUserProfile(userId);
      const recentHistory = this.getConversationHistory(userId, 5);
      
      return {
        userProfile: {
          role: profile.businessContext.role,
          department: profile.businessContext.department,
          expertise: profile.businessContext.expertise,
          preferredStyle: profile.preferences.responseStyle,
          commonTasks: profile.businessContext.commonTasks
        },
        conversationContext: {
          recentTopics: recentHistory.map(conv => this.extractTopicFromMessage(conv.userMessage)),
          lastInteraction: profile.lastInteraction,
          sessionLength: recentHistory.length
        },
        learningInsights: {
          successfulTopics: profile.preferences.preferredTopics,
          problematicAreas: profile.learning.problematicTopics,
          improvementNeeded: profile.learning.improvementAreas
        }
      };
    } catch (error) {
      logger.error('❌ Failed to get context for response:', error.message);
      return { userProfile: {}, conversationContext: {}, learningInsights: {} };
    }
  }

  extractTopicFromMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('fluxo') && lowerMessage.includes('caixa')) return 'fluxo_caixa';
    if (lowerMessage.includes('conciliação')) return 'conciliacao';
    if (lowerMessage.includes('relatório')) return 'relatorios';
    if (lowerMessage.includes('dre')) return 'dre';
    if (lowerMessage.includes('balanço')) return 'balanco';
    
    return 'general';
  }

  // ================================================
  // LIMPEZA E MANUTENÇÃO
  // ================================================
  
  cleanupOldMemories() {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 dias
      let cleanedCount = 0;
      
      // Limpar dados de aprendizagem antigos
      for (const [key, event] of this.learningData.entries()) {
        if (new Date(event.timestamp).getTime() < cutoffTime) {
          this.learningData.delete(key);
          cleanedCount++;
        }
      }
      
      // Limpar conversas muito antigas (manter só o essencial)
      for (const [userId, conversations] of this.conversationMemory.entries()) {
        const filteredConversations = conversations.filter(conv => {
          return new Date(conv.timestamp).getTime() > cutoffTime;
        });
        
        if (filteredConversations.length !== conversations.length) {
          this.conversationMemory.set(userId, filteredConversations);
          cleanedCount += conversations.length - filteredConversations.length;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info('🧹 Memory cleanup completed', {
          itemsCleaned: cleanedCount,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      logger.error('❌ Memory cleanup failed:', error.message);
    }
  }

  // ================================================
  // MÉTODOS PÚBLICOS PARA INTEGRAÇÃO
  // ================================================
  
  async recordSuccessfulInteraction(userId, topic, context) {
    await this.recordLearningEvent('successful_interaction', {
      topic,
      context,
      timestamp: new Date().toISOString()
    }, userId);
  }

  async recordFailedInteraction(userId, topic, reason, context) {
    await this.recordLearningEvent('failed_interaction', {
      topic,
      failureReason: reason,
      context,
      timestamp: new Date().toISOString()
    }, userId);
  }

  async recordSkillUsage(userId, skillName, success, executionTime) {
    await this.recordLearningEvent('skill_usage', {
      skillName,
      success,
      executionTime,
      timestamp: new Date().toISOString()
    }, userId);
  }

  async recordUserFeedback(userId, satisfaction, feedback) {
    await this.recordLearningEvent('user_feedback', {
      satisfaction, // 1-5
      feedback,
      timestamp: new Date().toISOString()
    }, userId);
    
    // Atualizar score de satisfação do usuário
    const profile = this.getUserProfile(userId);
    const currentScore = profile.learning.satisfactionScore || 0;
    profile.learning.satisfactionScore = (currentScore + satisfaction) / 2;
  }

  // ================================================
  // ESTATÍSTICAS E RELATÓRIOS
  // ================================================
  
  getMemoryStats() {
    return {
      users: this.userProfiles.size,
      conversations: Array.from(this.conversationMemory.values())
        .reduce((sum, convs) => sum + convs.length, 0),
      learningEvents: this.learningData.size,
      contextEntries: this.contextMemory.size,
      timestamp: new Date().toISOString()
    };
  }

  getUserStats(userId) {
    const profile = this.getUserProfile(userId);
    const conversations = this.getConversationHistory(userId, 100);
    
    return {
      userId,
      totalInteractions: profile.totalInteractions,
      memberSince: profile.createdAt,
      lastSeen: profile.lastInteraction,
      preferredTopics: profile.preferences.preferredTopics,
      commonTasks: profile.businessContext.commonTasks,
      satisfactionScore: profile.learning.satisfactionScore,
      conversationsThisWeek: conversations.filter(conv => {
        const convDate = new Date(conv.timestamp);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return convDate > weekAgo;
      }).length
    };
  }
}

module.exports = { MeshMemoryManager };