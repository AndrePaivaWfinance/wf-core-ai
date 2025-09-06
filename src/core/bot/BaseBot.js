// src/core/bot/BaseBot.js
const { ActivityHandler, MessageFactory } = require('botbuilder');
const logger = require('../../utils/logger');
const metrics = require('../monitoring/metrics');

class BaseBot extends ActivityHandler {
  constructor(config = {}) {
    super();
    this.config = config;
    this.skills = new Map();
    this.middlewares = [];
    this.metrics = metrics;
    
    this.setupHandlers();
    this.setupMetrics();
    
    logger.info('BaseBot initialized', {
      skillsCount: this.skills.size,
      middlewaresCount: this.middlewares.length
    });
  }

  setupHandlers() {
    this.onMessage(this.handleMessage.bind(this));
    this.onMembersAdded(this.handleMembersAdded.bind(this));
    this.onConversationUpdate(this.handleConversationUpdate.bind(this));
    this.onTokenResponseEvent(this.handleTokenResponse.bind(this));
  }

  setupMetrics() {
    // Registrar métricas customizadas
    this.metrics.registerCounter('messages_received_total');
    this.metrics.registerCounter('messages_processed_total');
    this.metrics.registerHistogram('message_processing_duration_seconds');
  }

  async handleMessage(context, next) {
    const startTime = Date.now();
    const messageId = context.activity.id || `msg-${Date.now()}`;
    
    try {
      this.metrics.incrementCounter('messages_received_total');
      
      const result = await this.processMessageWithMiddlewares(context);
      
      if (result.handled) {
        this.metrics.incrementCounter('messages_processed_total');
        const duration = (Date.now() - startTime) / 1000;
        this.metrics.observeHistogram('message_processing_duration_seconds', duration);
        
        logger.info('Message processed successfully', {
          messageId,
          duration,
          processingType: result.type
        });
      }
      
    } catch (error) {
      this.metrics.incrementCounter('messages_processing_errors_total');
      
      logger.error('Message processing failed', error, {
        messageId,
        activityType: context.activity.type
      });
      
      await this.handleProcessingError(context, error);
    } finally {
      await next();
    }
  }

  async processMessageWithMiddlewares(context) {
    // Executar middlewares
    for (const middleware of this.middlewares) {
      const result = await middleware(context);
      if (result?.handled) return result;
    }
    
    // Processamento padrão
    return await this.processMessage(context);
  }

  async processMessage(context) {
    const text = (context.activity.text || '').trim();
    
    // Tentar skills primeiro
    for (const [skillName, skill] of this.skills) {
      if (await skill.canHandle(text, context)) {
        try {
          const result = await skill.execute({ text }, context);
          return { handled: true, type: 'skill', skill: skillName, result };
        } catch (error) {
          logger.error(`Skill execution failed: ${skillName}`, error);
          throw error;
        }
      }
    }
    
    // Fallback para processamento padrão
    return await this.defaultMessageProcessing(context);
  }

  async defaultMessageProcessing(context) {
    const response = this.generateResponse(context.activity.text);
    await context.sendActivity(MessageFactory.text(response));
    return { handled: true, type: 'default' };
  }

  // ... outros métodos profissionais

  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
    return this;
  }

  registerSkill(skill) {
    if (!skill || !skill.name) {
      throw new Error('Skill must have a name');
    }
    this.skills.set(skill.name, skill);
    logger.info('Skill registered', { skill: skill.name });
  }

  async handleProcessingError(context, error) {
    // Error handling profissional
    const errorMessage = this.config.environment === 'production'
      ? 'Desculpe, ocorreu um erro inesperado. Nossa equipe foi notificada.'
      : `Erro: ${error.message}`;

    await context.sendActivity(MessageFactory.text(errorMessage));
  }
}

module.exports = { BaseBot };