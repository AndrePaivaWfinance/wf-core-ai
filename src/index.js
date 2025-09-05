// MESH Platform - Entry Point Sem Dependências Externas
console.log('🚀 MESH Platform iniciando...');

// Logger interno simples
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

// Config simples
const getConfig = () => {
  // Carregar .env se existir
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

class MeshPlatform {
  constructor() {
    this.server = null;
    this.config = getConfig();
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info('=== MESH PLATFORM STARTING ===', {
        port: this.config.port,
        env: this.config.env
      });

      await this.createServer();
      await this.startServer();

      logger.info('=== MESH PLATFORM STARTED ===', {
        port: this.config.port,
        healthCheck: `http://localhost:${this.config.port}/healthz`
      });

    } catch (error) {
      logger.error('CRITICAL ERROR:', error.message);
      process.exit(1);
    }
  }

  async createServer() {
    const restify = require('restify');
    
    this.server = restify.createServer({
      name: 'mesh-platform',
      version: '2.1.0',
      ignoreTrailingSlash: true
    });

    // Plugins básicos
    this.server.use(restify.plugins.acceptParser(this.server.acceptable));
    this.server.use(restify.plugins.queryParser());
    this.server.use(restify.plugins.bodyParser());

    // Health check
    this.server.get('/healthz', (req, res, next) => {
      res.send(200, {
        status: 'OK',
        service: 'MESH Platform',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.1.0',
        config: {
          environment: this.config.env,
          hasBotCredentials: !!(this.config.bot.appId && this.config.bot.appPassword),
          hasAzureOpenAI: !!(this.config.azure.endpoint && this.config.azure.apiKey),
          hasOpenAI: !!this.config.openai.apiKey
        }
      });
      return next();
    });

    // Root endpoint
    this.server.get('/', (req, res, next) => {
      res.send(200, {
        service: 'MESH Platform - BPO Financial Analyst',
        company: 'Wfinance',
        version: '2.1.0',
        status: 'running',
        endpoints: {
          health: '/healthz',
          messages: '/api/messages'
        },
        timestamp: new Date().toISOString()
      });
      return next();
    });

    // Bot messages endpoint (básico por enquanto)
    this.server.post('/api/messages', async (req, res) => {
      try {
        // Resposta básica do MESH
        const response = {
          type: 'message',
          text: `🤖 **MESH - Analista BPO Financeiro**

Olá! Sou o MESH da Wfinance, especialista em:
• Análise de fluxo de caixa
• Conciliação bancária  
• Relatórios gerenciais
• Otimização de processos financeiros

**Status atual:** Sistema básico funcionando
**Próximos passos:** Integração completa com Azure OpenAI

Como posso ajudá-lo hoje?`,
          timestamp: new Date().toISOString()
        };

        res.send(200, response);
        logger.info('Message processed');
      } catch (error) {
        logger.error('Message processing error:', error.message);
        res.send(500, { error: 'Internal server error' });
      }
    });

    // Status endpoint
    this.server.get('/api/messages', (req, res, next) => {
      res.send(200, {
        service: 'MESH - BPO Financial Analyst',
        company: 'Wfinance',
        version: '2.1.0',
        status: 'active',
        capabilities: [
          'Financial Analysis',
          'BPO Process Optimization',
          'Cash Flow Insights',
          'Compliance Support'
        ],
        timestamp: new Date().toISOString()
      });
      return next();
    });

    logger.info('✅ Server created with basic routes');
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err);
        } else {
          this.isRunning = true;
          logger.info(`🚀 Server listening on port ${this.config.port}`);
          logger.info(`🔗 Health check: http://localhost:${this.config.port}/healthz`);
          logger.info(`🤖 Bot endpoint: http://localhost:${this.config.port}/api/messages`);
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

// Error handling
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// Graceful shutdown
const platform = new MeshPlatform();

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

module.exports = { MeshPlatform };