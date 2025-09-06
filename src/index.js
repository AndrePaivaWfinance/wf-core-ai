// ================================================
// MESH PLATFORM COMPLETO COM MEMÓRIA - CORRIGIDO
// ================================================
// src/index.js - Versão sem erros Restify

console.log('🧠 MESH Platform with Memory & Learning iniciando...');

// Logger interno
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: (msg, data) => {
    if (process.env.ENABLE_DEBUG_LOGS === 'true') {
      console.log(`[DEBUG] ${msg}`, data || '');
    }
  }
};

// ================================================
// MEMORY MANAGER INTEGRADO
// ================================================

class MeshMemoryManager {
  constructor() {
    this.conversationMemory = new Map();
    this.userProfiles = new Map();
    this.learningData = new Map();
    this.maxConversationHistory = 50;
    this.learningThreshold = 5;
    
    logger.info('🧠 MESH Memory Manager initialized');
  }

  async saveConversation(userId, userMessage, botResponse, metadata = {}) {
    try {
      if (!this.conversationMemory.has(userId)) {
        this.conversationMemory.set(userId, []);
      }
      
      const conversation = this.conversationMemory.get(userId);
      const timestamp = new Date().toISOString();
      
      conversation.push({
        timestamp,
        userMessage: userMessage.substring(0, 1000),
        botResponse: botResponse.substring(0, 2000),
        metadata: {
          ...metadata,
          channel: metadata.channelId || 'unknown',
          messageLength: userMessage.length,
          responseLength: botResponse.length
        }
      });
      
      if (conversation.length > this.maxConversationHistory) {
        conversation.splice(0, conversation.length - this.maxConversationHistory);
      }
      
      await this.updateUserProfile(userId, {
        lastInteraction: timestamp,
        totalInteractions: conversation.length
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to save conversation:', error.message);
      return false;
    }
  }

  getConversationHistory(userId, limit = 10) {
    const conversations = this.conversationMemory.get(userId) || [];
    return conversations.slice(-limit);
  }

  async updateUserProfile(userId, updates) {
    try {
      if (!this.userProfiles.has(userId)) {
        this.userProfiles.set(userId, this.createDefaultProfile(userId));
      }
      
      const profile = this.userProfiles.get(userId);
      Object.assign(profile, updates);
      profile.lastUpdated = new Date().toISOString();
      
      await this.analyzeUserPatterns(userId, profile);
      return profile;
    } catch (error) {
      logger.error('Failed to update user profile:', error.message);
      return null;
    }
  }

  createDefaultProfile(userId) {
    return {
      userId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      totalInteractions: 0,
      preferences: {
        responseStyle: 'professional',
        preferredTopics: [],
        frequentQuestions: []
      },
      businessContext: {
        role: 'unknown',
        department: 'unknown',
        expertise: [],
        commonTasks: []
      },
      learning: {
        successfulInteractions: 0,
        problematicTopics: [],
        satisfactionScore: 0
      }
    };
  }

  getUserProfile(userId) {
    return this.userProfiles.get(userId) || this.createDefaultProfile(userId);
  }

  async analyzeUserPatterns(userId, profile) {
    try {
      const conversations = this.getConversationHistory(userId, 20);
      if (conversations.length < 3) return;
      
      const topicPatterns = this.analyzeTopicPatterns(conversations);
      const communicationStyle = this.analyzeCommunicationStyle(conversations);
      
      profile.preferences.responseStyle = communicationStyle;
      profile.preferences.frequentQuestions = topicPatterns.slice(0, 5);
      
    } catch (error) {
      logger.error('Failed to analyze user patterns:', error.message);
    }
  }

  analyzeTopicPatterns(conversations) {
    const topics = [];
    
    conversations.forEach(conv => {
      const message = conv.userMessage.toLowerCase();
      
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
    
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([topic]) => topic);
  }

  analyzeCommunicationStyle(conversations) {
    const avgMessageLength = conversations.reduce((sum, conv) => {
      return sum + conv.userMessage.length;
    }, 0) / conversations.length;
    
    if (avgMessageLength > 100) return 'detailed';
    if (avgMessageLength < 30) return 'concise';
    return 'professional';
  }

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
          commonTasks: profile.businessContext.commonTasks,
          preferredTopics: profile.preferences.preferredTopics
        },
        conversationContext: {
          recentTopics: recentHistory.map(conv => this.extractTopicFromMessage(conv.userMessage)),
          lastInteraction: profile.lastInteraction,
          sessionLength: recentHistory.length
        },
        learningInsights: {
          successfulTopics: profile.preferences.preferredTopics,
          problematicAreas: profile.learning.problematicTopics
        }
      };
    } catch (error) {
      logger.error('Failed to get context for response:', error.message);
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

  async recordSuccessfulInteraction(userId, topic, context) {
    try {
      const profile = this.getUserProfile(userId);
      profile.learning.successfulInteractions++;
      
      if (topic && !profile.preferences.preferredTopics.includes(topic)) {
        profile.preferences.preferredTopics.push(topic);
      }
      
      if (topic && !profile.businessContext.commonTasks.includes(topic)) {
        profile.businessContext.commonTasks.push(topic);
      }
      
    } catch (error) {
      logger.error('Failed to record successful interaction:', error.message);
    }
  }

  async recordUserFeedback(userId, satisfaction, feedback) {
    try {
      const profile = this.getUserProfile(userId);
      const currentScore = profile.learning.satisfactionScore || 0;
      profile.learning.satisfactionScore = (currentScore + satisfaction) / 2;
      
    } catch (error) {
      logger.error('Failed to record user feedback:', error.message);
    }
  }

  getMemoryStats() {
    return {
      users: this.userProfiles.size,
      conversations: Array.from(this.conversationMemory.values())
        .reduce((sum, convs) => sum + convs.length, 0),
      learningEvents: this.learningData.size,
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

// ================================================
// CONFIG SIMPLES
// ================================================

const getConfig = () => {
  try {
    require('dotenv').config();
    logger.info('✅ .env loaded');
  } catch (error) {
    logger.info('ℹ️ No .env file or dotenv not available');
  }

  return {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || process.env.WEBSITES_PORT || 3978),
    bot: {
      appId: process.env.MICROSOFT_APP_ID || '',
      appPassword: process.env.MICROSOFT_APP_PASSWORD || ''
    },
    azure: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT || ''
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    }
  };
};

// ================================================
// MESH PLATFORM COM MEMÓRIA
// ================================================

class MeshPlatformWithMemory {
  constructor() {
    this.server = null;
    this.config = getConfig();
    this.memoryManager = new MeshMemoryManager();
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info('=== MESH PLATFORM WITH MEMORY STARTING ===', {
        port: this.config.port,
        env: this.config.env
      });

      await this.createServer();
      await this.startServer();

      logger.info('=== MESH PLATFORM WITH MEMORY STARTED ===', {
        port: this.config.port,
        healthCheck: `http://localhost:${this.config.port}/healthz`,
        memoryStats: `http://localhost:${this.config.port}/api/memory/stats`
      });

    } catch (error) {
      logger.error('CRITICAL ERROR:', error.message);
      process.exit(1);
    }
  }

  async createServer() {
    const restify = require('restify');
    
    this.server = restify.createServer({
      name: 'mesh-platform-memory',
      version: '2.1.0',
      ignoreTrailingSlash: true
    });

    // Plugins básicos
    this.server.use(restify.plugins.acceptParser(this.server.acceptable));
    this.server.use(restify.plugins.queryParser());
    this.server.use(restify.plugins.bodyParser());

    // ================================================
    // HEALTH CHECK COM ESTATÍSTICAS DE MEMÓRIA
    // ================================================
    this.server.get('/healthz', (req, res, next) => {
      const memoryStats = this.memoryManager.getMemoryStats();
      
      res.send(200, {
        status: 'OK',
        service: 'MESH Platform with Memory & Learning',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.1.0',
        memory: memoryStats,
        features: [
          'Conversation Memory',
          'User Learning',
          'Pattern Recognition',
          'Personalized Responses'
        ],
        config: {
          environment: this.config.env,
          hasBotCredentials: !!(this.config.bot.appId && this.config.bot.appPassword),
          hasAzureOpenAI: !!(this.config.azure.endpoint && this.config.azure.apiKey),
          hasOpenAI: !!this.config.openai.apiKey
        }
      });
      return next();
    });

    // ================================================
    // ENDPOINTS DE MEMÓRIA - CORRIGIDOS
    // ================================================
    
    // Estatísticas gerais de memória
    this.server.get('/api/memory/stats', (req, res, next) => {
      const stats = this.memoryManager.getMemoryStats();
      res.send(200, {
        memorySystem: 'MESH Memory & Learning System',
        ...stats,
        capabilities: [
          'User profiling',
          'Conversation history',
          'Learning patterns',
          'Personalized responses'
        ]
      });
      return next();
    });

    // Perfil de usuário específico
    this.server.get('/api/memory/user/:userId', (req, res, next) => {
      const userId = req.params.userId;
      const userStats = this.memoryManager.getUserStats(userId);
      
      res.send(200, {
        userProfile: userStats,
        note: 'Profile builds automatically through conversations'
      });
      return next();
    });

    // Histórico de conversas
    this.server.get('/api/memory/conversation/:userId', (req, res, next) => {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit) || 10;
      const history = this.memoryManager.getConversationHistory(userId, limit);
      
      res.send(200, {
        userId,
        conversationHistory: history,
        count: history.length,
        note: 'Conversation history helps personalize responses'
      });
      return next();
    });

    // ================================================
    // FEEDBACK ENDPOINT - CORRIGIDO (sem 'next' no async)
    // ================================================
    this.server.post('/api/memory/feedback', async (req, res) => {
      try {
        const { userId, satisfaction, feedback } = req.body;
        
        if (!userId || !satisfaction) {
          res.send(400, { error: 'userId and satisfaction (1-5) are required' });
          return;
        }

        await this.memoryManager.recordUserFeedback(userId, satisfaction, feedback);
        
        res.send(200, {
          message: 'Feedback recorded successfully',
          userId,
          satisfaction,
          note: 'Feedback helps improve future responses'
        });
        
        logger.info('📝 User feedback recorded', {
          userId: userId.substring(0, 8) + '...',
          satisfaction
        });
        
      } catch (error) {
        logger.error('❌ Failed to record feedback:', error.message);
        res.send(500, { error: 'Failed to record feedback' });
      }
    });

    // ================================================
    // BOT MESSAGES ENDPOINT COM MEMÓRIA - CORRIGIDO
    // ================================================
    this.server.post('/api/messages', async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Extrair dados da mensagem
        const userMessage = req.body.text || '';
        const userId = req.body.from?.id || req.body.userId || `anon-${Date.now()}`;
        const channelId = req.body.channelId || 'api';
        
        logger.info('📨 Processing message with memory', {
          userId: userId.substring(0, 8) + '...',
          messageLength: userMessage.length,
          channelId
        });

        // Obter contexto da memória
        const context = this.memoryManager.getContextForResponse(userId, userMessage);

        // Gerar resposta personalizada do MESH
        const botResponse = await this.generateMeshResponse(userMessage, context, userId);
        
        // Salvar conversa na memória
        const processingTime = Date.now() - startTime;
        await this.memoryManager.saveConversation(userId, userMessage, botResponse, {
          channelId,
          processingTime,
          hasContext: Object.keys(context).length > 0
        });

        // Registrar como interação bem-sucedida
        const topic = this.memoryManager.extractTopicFromMessage(userMessage);
        await this.memoryManager.recordSuccessfulInteraction(userId, topic, {
          channel: channelId,
          responseLength: botResponse.length
        });

        const response = {
          type: 'message',
          text: botResponse,
          timestamp: new Date().toISOString(),
          metadata: {
            processingTime: Date.now() - startTime,
            hasMemoryContext: true,
            userId: userId.substring(0, 8) + '...',
            personalizedResponse: Object.keys(context.userProfile).length > 0
          }
        };

        res.send(200, response);
        logger.info('✅ Message processed with memory context');
        
      } catch (error) {
        logger.error('❌ Message processing error:', error.message);
        
        res.send(500, { 
          error: 'Internal server error',
          message: 'Desculpe, ocorreu um erro no processamento. Nossa equipe foi notificada.'
        });
      }
    });

    // ================================================
    // ROOT ENDPOINT - CORRIGIDO
    // ================================================
    this.server.get('/', (req, res, next) => {
      const memoryStats = this.memoryManager.getMemoryStats();
      
      res.send(200, {
        service: 'MESH Platform - BPO Financial Analyst',
        subtitle: 'With Memory & Learning System',
        company: 'Wfinance',
        version: '2.1.0',
        status: 'running',
        features: [
          '🧠 Conversation Memory',
          '📚 User Learning',
          '🎯 Pattern Recognition', 
          '💡 Personalized Responses',
          '📊 Business Context Awareness',
          '🔄 Continuous Improvement'
        ],
        memory: memoryStats,
        endpoints: {
          health: '/healthz',
          messages: '/api/messages',
          memoryStats: '/api/memory/stats',
          userProfile: '/api/memory/user/:userId',
          conversationHistory: '/api/memory/conversation/:userId',
          feedback: '/api/memory/feedback'
        },
        examples: {
          checkMemory: 'GET /api/memory/stats',
          sendMessage: 'POST /api/messages {"text": "olá", "userId": "user123"}',
          giveFeedback: 'POST /api/memory/feedback {"userId": "user123", "satisfaction": 5}',
          viewProfile: 'GET /api/memory/user/user123'
        },
        timestamp: new Date().toISOString()
      });
      return next();
    });

    // Status do bot - CORRIGIDO
    this.server.get('/api/messages', (req, res, next) => {
      res.send(200, {
        service: 'MESH - BPO Financial Analyst with Memory',
        company: 'Wfinance',
        version: '2.1.0',
        status: 'active',
        capabilities: [
          'Financial Analysis with Context',
          'BPO Process Optimization',
          'Personalized Cash Flow Insights',
          'User-Aware Compliance Support',
          'Learning-Enhanced Recommendations'
        ],
        memoryFeatures: [
          'Remembers user preferences',
          'Learns from interactions',
          'Personalizes responses',
          'Tracks conversation history',
          'Adapts communication style'
        ],
        timestamp: new Date().toISOString()
      });
      return next();
    });

    logger.info('✅ Server created with memory-enhanced routes');
  }

  // ================================================
  // GERAÇÃO DE RESPOSTAS PERSONALIZADAS
  // ================================================
  
  async generateMeshResponse(userMessage, memoryContext, userId) {
    try {
      const lowerMessage = userMessage.toLowerCase();
      const responseStyle = memoryContext.userProfile?.preferredStyle || 'professional';
      
      // Verificar se é primeira interação ou saudação
      if (!userMessage || userMessage.trim() === '' || lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('hello')) {
        return this.generateWelcomeMessage(memoryContext, userId);
      }

      // Comandos especiais de memória
      if (lowerMessage.includes('histórico') || lowerMessage.includes('conversa anterior')) {
        return this.generateHistoryResponse(memoryContext, userId);
      }

      if (lowerMessage.includes('perfil') || lowerMessage.includes('sobre mim')) {
        return this.generateProfileResponse(memoryContext, userId);
      }

      // Respostas especializadas por tópico
      if (lowerMessage.includes('fluxo') && lowerMessage.includes('caixa')) {
        return this.generateFluxoCaixaResponse(memoryContext, responseStyle);
      }
      
      if (lowerMessage.includes('conciliação') || lowerMessage.includes('conciliacao')) {
        return this.generateConciliacaoResponse(memoryContext, responseStyle);
      }
      
      if (lowerMessage.includes('relatório') || lowerMessage.includes('relatorio')) {
        return this.generateRelatorioResponse(memoryContext, responseStyle);
      }

      // Resposta contextual baseada no histórico
      if (memoryContext.conversationContext?.recentTopics?.length > 0) {
        return this.generateContextualResponse(userMessage, memoryContext, responseStyle);
      }

      // Resposta personalizada genérica
      return this.generatePersonalizedResponse(userMessage, memoryContext, responseStyle);
      
    } catch (error) {
      logger.error('❌ Error generating MESH response:', error.message);
      return 'Desculpe, estou enfrentando dificuldades técnicas no momento. Nossa equipe já foi notificada.';
    }
  }

  generateWelcomeMessage(memoryContext, userId) {
    const profile = memoryContext.userProfile;
    const isReturningUser = profile?.role && profile.role !== 'unknown';
    
    if (isReturningUser) {
      const commonTasks = profile.commonTasks?.slice(0, 2) || [];
      const tasksText = commonTasks.length > 0 
        ? `\n\n**Suas tarefas frequentes:**\n• ${commonTasks.map(task => this.getTopicDisplayName(task)).join('\n• ')}`
        : '';
      
      return `Bem-vindo de volta! 👋

Sou o **MESH**, seu analista de BPO Financeiro da Wfinance.

**Lembro que você costuma trabalhar com:**
• ${profile.department || 'Área financeira'}
• ${profile.expertise?.join(', ') || 'Processos financeiros'}${tasksText}

💡 *Tenho ${memoryContext.conversationContext?.sessionLength || 0} conversas suas em memória para personalizar minhas respostas.*

Como posso ajudá-lo hoje?`;
    } else {
      return `Olá! 👋 Sou o **MESH**, analista sênior de BPO Financeiro da Wfinance.

**Minhas especialidades:**
• 📊 Análise de fluxo de caixa
• 🏦 Conciliação bancária  
• 📋 Relatórios gerenciais
• 💰 Controle financeiro
• 📈 Projeções e análises

**🧠 Sistema Inteligente:**
• **Aprendo** com nossas conversas
• **Lembro** de suas preferências  
• **Personalizo** respostas ao seu perfil
• **Melhoro** continuamente meu atendimento

Quanto mais conversamos, melhor posso atendê-lo! Como posso ajudá-lo hoje?`;
    }
  }

  generateFluxoCaixaResponse(memoryContext, responseStyle) {
    const profile = memoryContext.userProfile;
    const hasUsedBefore = profile?.commonTasks?.includes('fluxo_caixa');
    
    let response = `📊 **Análise de Fluxo de Caixa**\n\n`;
    
    if (hasUsedBefore) {
      response += `Como você já utilizou esta funcionalidade antes, posso prosseguir diretamente:\n\n`;
    }
    
    response += `**Serviços disponíveis:**
• Relatório de entradas e saídas
• Projeções para 30/60/90 dias
• Análise de tendências
• Identificação de gargalos
• Comparativo com períodos anteriores`;

    if (responseStyle === 'concise') {
      response = `📊 **Fluxo de Caixa**\n\nRelatórios: entradas/saídas, projeções, tendências.\n\nQual período?`;
    }

    if (!hasUsedBefore) {
      response += `\n\n💡 *Primeira vez usando? Vou lembrar suas preferências para próximas consultas.*`;
    }

    response += `\n\nQual período você gostaria de analisar?`;
    
    return response;
  }

  generateConciliacaoResponse(memoryContext, responseStyle) {
    const profile = memoryContext.userProfile;
    const recentTopics = memoryContext.conversationContext?.recentTopics || [];
    const hasUsedBefore = profile?.commonTasks?.includes('conciliacao');
    
    let response = `🏦 **Conciliação Bancária**\n\n`;
    
    if (recentTopics.includes('conciliacao')) {
      response += `Continuando nossa conversa sobre conciliação:\n\n`;
    }
    
    response += `**Processos automatizados:**
• Conciliação de extratos bancários
• Identificação de divergências
• Relatórios de pendências
• Análise de movimentações não identificadas
• Reconciliação de cartões`;

    if (hasUsedBefore) {
      response += `\n\n💡 *Baseado no seu histórico, você frequentemente usa esta funcionalidade.*`;
    }

    response += `\n\nQual banco ou período você precisa conciliar?`;
    
    return response;
  }

  generateRelatorioResponse(memoryContext, responseStyle) {
    const profile = memoryContext.userProfile;
    const preferredTopics = profile?.preferredTopics || [];
    
    let response = `📋 **Relatórios Financeiros**\n\n`;
    
    if (preferredTopics.length > 0) {
      response += `**Baseado no seu histórico, você frequentemente precisa de:**\n`;
      preferredTopics.forEach(topic => {
        response += `• ${this.getTopicDisplayName(topic)}\n`;
      });
      response += `\n`;
    }
    
    response += `**Relatórios disponíveis:**
• DRE (Demonstração do Resultado)
• Balanço Patrimonial  
• Fluxo de Caixa
• Contas a Pagar/Receber
• Análises de rentabilidade`;

    response += `\n\nQual relatório você precisa gerar?`;
    
    return response;
  }

  generateHistoryResponse(memoryContext, userId) {
    const conversations = memoryContext.conversationContext?.recentTopics || [];
    const profile = memoryContext.userProfile;
    
    if (conversations.length === 0) {
      return `📚 **Histórico de Conversas**

Esta é nossa primeira interação! 🎉

**Como funciona minha memória:**
• Lembro de tópicos que você pergunta
• Identifico suas preferências
• Personalizo minhas respostas
• Sugiro ações baseadas no seu padrão

Continue conversando comigo para que eu aprenda suas necessidades!`;
    }

    let response = `📚 **Seu Histórico Comigo**\n\n`;
    response += `**Tópicos recentes que discutimos:**\n`;
    
    conversations.slice(0, 5).forEach((topic, index) => {
      const topicName = this.getTopicDisplayName(topic);
      response += `${index + 1}. ${topicName}\n`;
    });

    if (profile?.commonTasks?.length > 0) {
      response += `\n**Suas tarefas mais frequentes:**\n`;
      profile.commonTasks.slice(0, 3).forEach(task => {
        response += `• ${this.getTopicDisplayName(task)}\n`;
      });
    }

    if (profile?.totalInteractions > 10) {
      response += `\n**Estatísticas:**
• Total de conversas: ${profile.totalInteractions}
• Estilo de comunicação: ${profile.preferredStyle}`;
      
      if (profile.learning?.satisfactionScore > 0) {
        response += `\n• Satisfação média: ${profile.learning.satisfactionScore.toFixed(1)}/5 ⭐`;
      }
    }

    response += `\n\n💡 *Quanto mais conversamos, melhor posso atendê-lo!*`;
    
    return response;
  }

  generateProfileResponse(memoryContext, userId) {
    const profile = memoryContext.userProfile;
    
    let response = `👤 **Seu Perfil no MESH**\n\n`;
    
    response += `**Informações que identifiquei:**\n`;
    response += `• Área: ${profile?.department || 'Identificando através das conversas...'}\n`;
    response += `• Função: ${profile?.role || 'Identificando através das conversas...'}\n`;
    response += `• Estilo de comunicação: ${profile?.preferredStyle || 'Profissional'}\n`;
    
    if (profile?.totalInteractions > 0) {
      response += `\n**Suas estatísticas:**\n`;
      response += `• Total de interações: ${profile.totalInteractions}\n`;
      response += `• Membro desde: ${new Date(profile.createdAt).toLocaleDateString('pt-BR')}\n`;
      response += `• Última conversa: ${new Date(profile.lastInteraction).toLocaleDateString('pt-BR')}\n`;
      
      if (profile.learning?.satisfactionScore > 0) {
        response += `• Satisfação média: ${profile.learning.satisfactionScore.toFixed(1)}/5 ⭐\n`;
      }
    }

    if (profile?.preferredTopics?.length > 0) {
      response += `\n**Seus tópicos favoritos:**\n`;
      profile.preferredTopics.forEach(topic => {
        response += `• ${this.getTopicDisplayName(topic)}\n`;
      });
    }

    response += `\n💡 *Este perfil se aprimora automaticamente com cada conversa!*`;
    
    return response;
  }

  generateContextualResponse(userMessage, memoryContext, responseStyle) {
    const recentTopics = memoryContext.conversationContext?.recentTopics || [];
    const lastTopic = recentTopics[recentTopics.length - 1];
    const profile = memoryContext.userProfile;
    
    let response = `Entendo sua solicitação. `;
    
    if (lastTopic && lastTopic !== 'general') {
      response += `Como estávamos conversando sobre **${this.getTopicDisplayName(lastTopic)}**, `;
    }
    
    response += `como seu analista de BPO Financeiro da Wfinance com memória ativa, posso ajudá-lo com:

• **Análises financeiras** personalizadas
• **Relatórios automatizados** baseados em suas preferências
• **Processos otimizados** para sua área
• **Suporte especializado** em BPO financeiro`;

    if (profile?.commonTasks?.length > 0) {
      response += `\n\n**Baseado no seu histórico:**
• ${profile.commonTasks.slice(0, 3).map(task => this.getTopicDisplayName(task)).join('\n• ')}`;
    }

    response += `\n\nComo posso ajudá-lo especificamente hoje?`;

    return response;
  }

  generatePersonalizedResponse(userMessage, memoryContext, responseStyle) {
    const profile = memoryContext.userProfile;
    
    let response = `Como seu analista de BPO Financeiro da Wfinance, posso ajudar com:

• 📊 Análise de fluxo de caixa personalizada
• 🏦 Conciliações baseadas no seu histórico  
• 📋 Relatórios adaptados ao seu perfil
• 💰 Controle financeiro contextualizado
• 📈 Análises baseadas em suas preferências`;

    if (profile?.commonTasks?.length > 0) {
      response += `\n\n**Suas necessidades mais frequentes:**
• ${profile.commonTasks.slice(0, 2).map(task => this.getTopicDisplayName(task)).join('\n• ')}

💡 *Lembro dessas preferências para atendê-lo melhor*`;
    }

    if (profile?.totalInteractions > 5) {
      response += `\n\n📊 *Baseado em ${profile.totalInteractions} conversas anteriores*`;
    }

    response += `\n\nEm que posso ajudá-lo hoje?`;
    
    return response;
  }

  // ================================================
  // MÉTODOS AUXILIARES
  // ================================================
  
  getTopicDisplayName(topic) {
    const topicNames = {
      'fluxo_caixa': 'Fluxo de Caixa',
      'conciliacao': 'Conciliação Bancária',
      'conciliacao_bancaria': 'Conciliação Bancária',
      'relatorios': 'Relatórios Financeiros',
      'dre': 'DRE',
      'balanco': 'Balanço Patrimonial',
      'balanco_patrimonial': 'Balanço Patrimonial',
      'general': 'Consulta Geral'
    };
    
    return topicNames[topic] || topic.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err);
        } else {
          this.isRunning = true;
          logger.info(`🚀 MESH Platform with Memory listening on port ${this.config.port}`);
          logger.info(`🔗 Health check: http://localhost:${this.config.port}/healthz`);
          logger.info(`🤖 Bot endpoint: http://localhost:${this.config.port}/api/messages`);
          logger.info(`🧠 Memory stats: http://localhost:${this.config.port}/api/memory/stats`);
          resolve();
        }
      });
    });
  }

  async shutdown() {
    if (!this.isRunning) return;
    
    logger.info('Shutting down gracefully...');
    
    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            logger.info('Server closed');
            resolve();
          });
        });
      }
      
      this.isRunning = false;
      logger.info('Shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error:', error.message);
      process.exit(1);
    }
  }
}

// ================================================
// ERROR HANDLING E INICIALIZAÇÃO
// ================================================

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// Graceful shutdown
const platform = new MeshPlatformWithMemory();

['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    await platform.shutdown();
  });
});

// Start the platform
async function start() {
  try {
    await platform.initialize();
  } catch (error) {
    logger.error('Failed to start platform:', error.message);
    process.exit(1);
  }
}

start();

module.exports = { MeshPlatformWithMemory };