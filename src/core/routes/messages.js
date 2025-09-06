const logger = require('../../utils/logger');

function setupRoutes(server, adapter, meshBot) {
  // Health check
  server.get('/healthz', (req, res, next) => {
    res.send(200, { 
      status: 'OK', 
      service: 'MESH Platform',
      timestamp: new Date().toISOString()
    });
    return next();
  });
  
  // Root endpoint
  server.get('/', (req, res, next) => {
    res.send(200, {
      name: 'MESH Platform',
      description: 'Analista de BPO Financeiro IA - Wfinance',
      version: '2.0.0',
      endpoints: {
        health: '/healthz',
        messages: '/api/messages'
      }
    });
    return next();
  });
  
  // Bot messages endpoint
  server.post('/api/messages', async (req, res, next) => {
    try {
      await adapter.processActivity(req, res, async (context) => {
        await meshBot.run(context);
      });
    } catch (error) {
      logger.error('Error processing activity', error);
      
      if (!res.headersSent) {
        res.send(500, { 
          error: 'Internal server error',
          message: 'Failed to process message'
        });
      }
    }
    return next();
  });

  // HEAD endpoint for health checks
  server.head('/api/messages', (req, res, next) => {
    res.send(200);
    return next();
  });
}

module.exports = { setupRoutes };