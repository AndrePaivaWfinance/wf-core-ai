// ===================================================
// src/server/createServer.js
// ===================================================
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const logger = require('../bot/utils/logger');

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