// ===================================================
// src/utils/logger.js
// ===================================================
const { appInsights } = require('../../monitoring/appInsights');

class Logger {
  static log(level, message, properties = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...properties };
    
    // Console output (formatado para desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }
    
    // Enviar para Application Insights se disponível
    if (appInsights.defaultClient) {
      if (level === 'error') {
        appInsights.defaultClient.trackException({
          exception: new Error(message),
          properties
        });
      } else {
        appInsights.defaultClient.trackTrace({
          message: `${level}: ${message}`,
          severity: this.getAppInsightsSeverity(level),
          properties
        });
      }
    }
  }
  
  static getAppInsightsSeverity(level) {
    const levels = {
      error: 3,
      warn: 2,
      info: 1,
      debug: 0
    };
    return levels[level] || 1;
  }
  
  static error(message, properties = {}) {
    this.log('error', message, properties);
  }
  
  static warn(message, properties = {}) {
    this.log('warn', message, properties);
  }
  
  static info(message, properties = {}) {
    this.log('info', message, properties);
  }
  
  static debug(message, properties = {}) {
    if (process.env.ENABLE_DEBUG_LOGS === 'true') {
      this.log('debug', message, properties);
    }
  }
}

module.exports = Logger;

// ===================================================
// src/monitoring/appInsights.js
// ===================================================
let appInsights = {
  defaultClient: null
};

function initializeAppInsights() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (connectionString) {
    try {
      const ai = require('applicationinsights');
      ai.setup(connectionString)
        .setAutoCollectRequests(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .start();
      
      appInsights.defaultClient = ai.defaultClient;
      console.log('✅ Application Insights initialized');
    } catch (error) {
      console.warn('⚠️ Application Insights package not available, monitoring disabled');
    }
  } else {
    console.log('ℹ️ Application Insights not configured (APPLICATIONINSIGHTS_CONNECTION_STRING not set)');
  }
  
  return appInsights;
}

// Initialize immediately
appInsights = initializeAppInsights();

module.exports = { appInsights };

// ===================================================
// src/server/createServer.js
// ===================================================
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const logger = require('./logger');

function createServer() {
  logger.info('Inicializando servidor Restify...');

  const server = restify.createServer({
    name: 'mesh-bot-endpoint',
    version: '2.1.0',
    ignoreTrailingSlash: true,
    handleUpgrades: false,
    maxParamLength: 1000
  });

  logger.info('Servidor Restify criado');

  // CORS simplificado
  const cors = corsMiddleware({
    origins: ['*'],
    allowHeaders: [
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'X-Ms-Bot-Agent',
      'X-Ms-Conversation-Id',
      'X-Request-Id'
    ],
    exposeHeaders: ['X-Request-Id', 'X-Response-Time'],
    credentials: false,
    preflightMaxAge: 600
  });

  server.pre(cors.preflight);
  server.use(cors.actual);

  // Plugins essenciais
  server.use(restify.plugins.acceptParser(server.acceptable));
  server.use(restify.plugins.queryParser({ mapParams: false }));
  server.use(restify.plugins.bodyParser({ mapParams: false, maxBodySize: 1048576 }));
  server.use(restify.plugins.gzipResponse({ threshold: 1024 }));

  // Health check
  server.get('/healthz', (req, res, next) => {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.1.0'
    };

    res.send(200, health);
    return next();
  });

  // Root endpoint
  server.get('/', (req, res, next) => {
    res.send(200, {
      name: 'MESH Platform',
      version: '2.1.0',
      endpoints: {
        bot: '/api/messages',
        health: '/healthz'
      },
      timestamp: new Date().toISOString()
    });
    return next();
  });

  logger.info('Servidor configurado com sucesso');
  return server;
}

module.exports = { createServer };

// ===================================================
// src/server/adapter.js
// ===================================================
const { BotFrameworkAdapter } = require('botbuilder');

function createAdapter({ appId, appPassword }) {
  console.log('[Adapter] Creating adapter...', {
    hasCredentials: !!(appId && appPassword),
    environment: process.env.NODE_ENV || 'development'
  });

  let adapter;

  if (!appId || !appPassword) {
    console.log('[Adapter] Development mode - no credentials');
    
    adapter = new BotFrameworkAdapter({
      channelAuthTenant: process.env.MICROSOFT_APP_TENANT_ID,
      authConfiguration: {
        requiredEndorsements: []
      }
    });
    
  } else {
    console.log('[Adapter] Production mode with credentials');
    
    adapter = new BotFrameworkAdapter({
      appId: appId.trim(),
      appPassword: appPassword.trim(),
      channelAuthTenant: process.env.MICROSOFT_APP_TENANT_ID
    });
  }

  // Error handler
  adapter.onTurnError = async (context, error) => {
    const timestamp = new Date().toISOString();
    
    console.error(`[Adapter Error] [${timestamp}]:`, {
      message: error.message,
      statusCode: error.statusCode,
      channelId: context.activity?.channelId,
      activityType: context.activity?.type
    });

    // Handle authentication errors
    if (error.statusCode === 401 || error.message?.includes('Unauthorized')) {
      console.error('[Adapter] Authentication issue');
      return;
    }

    // Send generic error message
    const shouldNotRespond = 
      (error.statusCode === 401 && context.activity?.channelId === 'webchat') ||
      (error.statusCode === 403) ||
      (context.activity?.type !== 'message');

    if (!shouldNotRespond) {
      try {
        await context.sendActivity({
          type: 'message',
          text: 'Erro no processamento. Nossa equipe foi notificada.'
        });
      } catch (sendError) {
        console.error('[Adapter] Could not send error message:', sendError.message);
      }
    }
  };

  console.log('[Adapter] Configuration complete');
  return adapter;
}

module.exports = { createAdapter };