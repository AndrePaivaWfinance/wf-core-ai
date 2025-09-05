// MESH Platform - Entry Point Integrado (mesh-refining + wf-core-ia)
const { configPromise } = require('./config/env');
const logger = require('./core/utils/logger');
const { appInsights } = require('./core/monitoring/appInsights');
const { createMeshBot } = require('./bots/mesh');

class MeshPlatform {
  constructor() {
    this.server = null;
    this.adapter = null;
    this.meshBot = null;
    this.config = null;
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      this.setupMonitoring();
      
      logger.info('=== MESH PLATFORM MULTIBOT INITIALIZATION ===', {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      });

      // 1. Carregar configuração (mesh-refining)
      this.config = await configPromise;
      
      logger.info('Configuration loaded successfully', {
        port: this.config.port,
        environment: this.config.env,
        hasBotCredentials: !!(this.config.bot.appId && this.config.bot.appPassword),
        hasAzureOpenAI: !!(this.config.azure.endpoint && this.config.azure.apiKey)
      });

      // 2. Inicializar componentes
      await this.initializeWithRetry();

      logger.info('=== MESH PLATFORM STARTED SUCCESSFULLY ===', {
        port: this.config.port,
        healthCheck: `http://localhost:${this.config.port}/healthz`,
        messagesEndpoint: `http://localhost:${this.config.port}/api/messages`
      });

      this.scheduleHealthCheck();

    } catch (error) {
      logger.error('CRITICAL INITIALIZATION ERROR', {
        error: error.message,
        stack: error.stack
      });
      
      if (appInsights.defaultClient) {
        appInsights.defaultClient.trackEvent({
          name: 'PlatformStartupFailed',
          properties: { error: error.message }
        });
      }
      
      process.exit(1);
    }
  }

  async initializeWithRetry(maxRetries = 3, retryDelay = 2000) {
    const components = [
      { name: 'Server', method: this.initializeServer.bind(this) },
      { name: 'Adapter', method: this.initializeAdapter.bind(this) },
      { name: 'MESH Bot (Modular)', method: this.initializeMeshBot.bind(this) },
      { name: 'Routes', method: this.initializeRoutes.bind(this) }
    ];

    for (const component of components) {
      await this.retryOperation(component.name, component.method, maxRetries, retryDelay);
    }

    await this.startServer();
  }

  async retryOperation(name, operation, maxRetries, retryDelay) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Initializing ${name}, attempt ${attempt}/${maxRetries}`);
        await operation();
        logger.info(`✅ ${name} initialized successfully`);
        return;
      } catch (error) {
        lastError = error;
        logger.warn(`Failed to initialize ${name}, attempt ${attempt}/${maxRetries}`, {
          error: error.message
        });

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    throw new Error(`Failed to initialize ${name} after ${maxRetries} attempts: ${lastError.message}`);
  }

  async initializeServer() {
    // Usar servidor Restify do core
    const { createServer } = require('./core/server/createServer');
    this.server = createServer();
  }

  async initializeAdapter() {
    // Usar adapter do core
    const { createAdapter } = require('./core/server/adapter');
    this.adapter = createAdapter({
      appId: this.config.bot.appId,
      appPassword: this.config.bot.appPassword,
      appType: this.config.bot.appType,
      tenantId: this.config.bot.tenantId
    });

    // Error handler integrado
    this.adapter.onTurnError = async (context, error) => {
      logger.error('Bot Framework Turn Error', {
        error: error.message,
        stack: error.stack,
        conversationId: context.activity.conversation?.id,
        userId: context.activity.from?.id
      });

      if (appInsights.defaultClient) {
        appInsights.defaultClient.trackException({
          exception: error,
          properties: {
            type: 'TurnError',
            conversationId: context.activity.conversation?.id,
            channelId: context.activity.channelId
          }
        });
      }

      await context.sendActivity('Desculpe, ocorreu um erro inesperado. Nossa equipe já foi notificada.');
    };
  }

  async initializeMeshBot() {
    // Usar factory modular
    logger.info('Creating MESH Bot with modular architecture...');
    
    this.meshBot = await createMeshBot({
      azure: this.config.azure,
      openai: this.config.openai,
      env: this.config.env
    });

    logger.info('✅ MESH Bot created with modular framework');
  }

  async initializeRoutes() {
    // Usar routes do core
    const { registerMessagesRoute } = require('./core/routes/messages');
    registerMessagesRoute(this.server, this.adapter, this.meshBot);
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`🚀 MESH Platform listening on port ${this.config.port}`);
          logger.info('🤖 Multibot architecture ready');
          resolve();
        }
      });
    });
  }

  setupMonitoring() {
    // Sistema de monitoramento
    process.on('exit', (code) => {
      logger.info('Process exiting', { code });
    });

    // Memory monitoring
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      
      if (appInsights.defaultClient) {
        appInsights.defaultClient.trackMetric({
          name: 'MemoryUsage',
          value: memoryUsage.heapUsed / 1024 / 1024
        });
      }
    }, 60000);
  }

  scheduleHealthCheck() {
    setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${this.config.port}/healthz`);
        if (!response.ok) {
          logger.error('Internal health check failed', {
            status: response.status,
            statusText: response.statusText
          });
        }
      } catch (error) {
        logger.error('Internal health check error', {
          error: error.message
        });
      }
    }, 300000);
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('Shutting down MESH Platform gracefully');

    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            logger.info('Server closed');
            resolve();
          });
        });
      }

      logger.info('MESH Platform shutdown completed');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }
}

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION', {
    error: error.message,
    stack: error.stack
  });

  if (appInsights.defaultClient) {
    appInsights.defaultClient.trackException({
      exception: error,
      properties: { type: 'UncaughtException' }
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });

  if (appInsights.defaultClient) {
    appInsights.defaultClient.trackException({
      exception: reason instanceof Error ? reason : new Error(String(reason)),
      properties: { type: 'UnhandledRejection' }
    });
  }
});

// Graceful shutdown handlers
const setupShutdownHandlers = (platform) => {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      await platform.shutdown();
    });
  });

  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      logger.info('Received shutdown message from process manager');
      platform.shutdown();
    }
  });
};

// Startup
async function startMeshPlatform() {
  const platform = new MeshPlatform();
  setupShutdownHandlers(platform);
  
  try {
    await platform.initialize();
  } catch (error) {
    logger.error('Failed to start MESH Platform', {
      error: error.message,
      stack: error.stack
    });
    await platform.shutdown();
  }
}

// Execute
startMeshPlatform();

module.exports = { MeshPlatform, startMeshPlatform };