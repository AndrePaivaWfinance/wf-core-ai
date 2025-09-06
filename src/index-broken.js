// ================================================
// MESH PLATFORM - CAMINHOS CORRIGIDOS
// ================================================

const { configPromise } = require('./config/env');
const { createServer } = require('./server/createServer');
const { createAdapter } = require('./server/adapter');
const { registerMessagesRoute } = require('./routes/messages');
const logger = require('./utils/logger');

class MeshPlatform {
  constructor() {
    this.server = null;
    this.adapter = null;
    this.meshBot = null;
    this.config = null;
  }

  async initialize() {
    try {
      logger.info('=== MESH PLATFORM NATURAL STARTING ===');

      // Carregar configuração
      this.config = await configPromise;
      
      logger.info('Configuration loaded', {
        environment: this.config.env,
        port: this.config.port,
        hasBotCredentials: !!(this.config.bot.appId && this.config.bot.appPassword),
        hasAzureOpenAI: !!(this.config.azure.endpoint && this.config.azure.apiKey),
        hasOpenAI: !!this.config.openai.apiKey
      });

      // Criar servidor
      this.server = createServer();
      logger.info('✅ Server created');
      
      // Criar adapter Bot Framework
      this.adapter = createAdapter({
        appId: this.config.bot.appId,
        appPassword: this.config.bot.appPassword
      });
      logger.info('✅ Bot Framework adapter created');

      // Criar MESH Bot Natural (simplificado)
      this.meshBot = await this.createSimpleMeshBot();
      logger.info('✅ MESH Bot created');

      // Registrar rotas
      registerMessagesRoute(this.server, this.adapter, this.meshBot);
      logger.info('✅ Routes registered');

      // Iniciar servidor
      await this.startServer();

      logger.info('=== MESH PLATFORM READY ===', {
        port: this.config.port,
        approach: 'natural_communication',
        healthCheck: `http://localhost:${this.config.port}/healthz`,
        botEndpoint: `http://localhost:${this.config.port}/api/messages`
      });

    } catch (error) {
      logger.error('INITIALIZATION ERROR:', error);
      process.exit(1);
    }
  }

  async createSimpleMeshBot() {
    // Importar dinamicamente para evitar problemas de caminho
    try {
      const MeshBot = require('./bot/index');
      const llmService = require('./services/llm');
      
      const meshBot = new MeshBot(llmService, {
        azure: this.config.azure,
        openai: this.config.openai
      });
      
      return meshBot;
      
    } catch (error) {
      logger.warn('Could not load MeshBot, creating simple fallback', { error: error.message });
      
      // Fallback simples se não conseguir carregar
      return this.createFallbackBot();
    }
  }

  createFallbackBot() {
    const { ActivityHandler, MessageFactory } = require('botbuilder');
    
    class SimpleMeshBot extends ActivityHandler {
      constructor() {
        super();
        
        this.onMessage(async (context, next) => {
          const text = (context.activity.text || '').trim();
          
          let response = "";
          
          if (!text) {
            response = "Oi! Sou o MESH, analista financeiro da Wfinance. Em que posso ajudar?";
          } else if (text.toLowerCase().includes('fluxo') && text.toLowerCase().includes('caixa')) {
            response = "Para análise de fluxo de caixa, posso processar dados em tempo real e gerar relatórios. Qual período você precisa analisar?";
          } else if (text.toLowerCase().includes('conciliação') || text.toLowerCase().includes('conciliacao')) {
            response = "Conciliação bancária é uma das minhas especialidades. Qual banco ou conta você precisa conciliar?";
          } else if (text.toLowerCase().includes('relatório') || text.toLowerCase().includes('relatorio')) {
            response = "Posso gerar vários tipos de relatórios financeiros. Que tipo você tem em mente? DRE, balanço, fluxo de caixa?";
          } else {
            response = "Como analista de BPO Financeiro da Wfinance, posso ajudar com análises de fluxo de caixa, conciliações bancárias e relatórios gerenciais. O que você precisa?";
          }
          
          await context.sendActivity(MessageFactory.text(response));
          await next();
        });

        this.onMembersAdded(async (context, next) => {
          for (const member of context.activity.membersAdded) {
            if (member.id !== context.activity.recipient.id) {
              const welcomeText = `Olá ${member.name || 'colega'}! Sou o MESH, analista financeiro da Wfinance. Estou aqui para ajudar com processos financeiros.`;
              await context.sendActivity(MessageFactory.text(welcomeText));
            }
          }
          await next();
        });
        
        logger.info('✅ Simple fallback MESH Bot created');
      }
    }
    
    return new SimpleMeshBot();
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`🚀 MESH Platform listening on port ${this.config.port}`);
          resolve();
        }
      });
    });
  }

  async shutdown() {
    logger.info('Shutting down MESH Platform...');
    
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(() => {
          logger.info('Server closed');
          resolve();
        });
      });
    }
    
    process.exit(0);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// Graceful shutdown
const platform = new MeshPlatform();

['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await platform.shutdown();
  });
});

// Start platform
platform.initialize();

module.exports = { MeshPlatform };