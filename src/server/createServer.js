// src/server/createServer.js
const restify = require('restify');
const logger = require('../utils/logger');

function createServer(adapter, meshBot) {
  const server = restify.createServer({
    name: 'MESH Platform',
    version: '2.0.0',
    ignoreTrailingSlash: true,
    handleUncaughtExceptions: false
  });

  // Request logging middleware
  server.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        ip: req.connection.remoteAddress
      });
    });
    
    next();
  });

  // Security headers
  server.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Body parsing
  server.use(restify.plugins.acceptParser(server.acceptable));
  server.use(restify.plugins.queryParser({ mapParams: true }));
  server.use(restify.plugins.bodyParser({
    mapParams: false,
    maxBodySize: '1mb',
    rejectUnknown: true,
    requestBodyOnGet: false
  }));

  // Health check - FUNÇÃO REGULAR (não async) com next
  server.get('/healthz', (req, res, next) => {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: '2.0.0'
    };

    res.send(200, healthCheck);
    return next();
  });

  // API status endpoint - FUNÇÃO REGULAR com next
  server.get('/status', (req, res, next) => {
    res.send(200, {
      service: 'MESH Platform',
      status: 'operational',
      version: '2.0.0',
      endpoints: {
        health: '/healthz',
        messages: '/api/messages'
      }
    });
    return next();
  });

  // Bot messages endpoint - FUNÇÃO ASYNC sem next
  server.post('/api/messages', async (req, res) => {
    try {
      const startTime = Date.now();
      
      await adapter.processActivity(req, res, async (context) => {
        await meshBot.run(context);
      });
      
      const processingTime = Date.now() - startTime;
      logger.info('Message processed', {
        processingTime,
        activityType: req.body?.type,
        channel: req.body?.channelId
      });
      
    } catch (error) {
      logger.error('Message processing failed', error, {
        activityType: req.body?.type,
        channel: req.body?.channelId
      });
      
      if (!res.headersSent) {
        res.send(500, {
          error: 'Processing Error',
          message: 'Failed to process message'
        });
      }
    }
  });

  // HEAD endpoint - FUNÇÃO REGULAR com next
  server.head('/api/messages', (req, res, next) => {
    res.send(200);
    return next();
  });

  // 404 handler - FUNÇÃO REGULAR com next
  server.on('NotFound', (req, res, next) => {
    logger.warn('Route not found', {
      method: req.method,
      url: req.url,
      ip: req.connection.remoteAddress
    });
    
    res.send(404, {
      error: 'Endpoint Not Found',
      message: `Route ${req.method} ${req.url} not found`
    });
    return next();
  });

  // Error handler - FUNÇÃO REGULAR com next
  server.on('restifyError', (req, res, err, next) => {
    logger.error('Server error', err, { url: req.url });
    
    res.send(err.statusCode || 500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    });
    
    return next();
  });

  return server;
}

module.exports = { createServer };