// src/index.js - VERSÃO CORRIGIDA
console.log('🔧 Starting MESH Platform...');

// Carregar .env manualmente
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Configuração manual
const config = {
  port: process.env.PORT || 3978,
  appId: process.env.MicrosoftAppId || process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MicrosoftAppPassword || process.env.MICROSOFT_APP_PASSWORD,
  nodeEnv: process.env.NODE_ENV || 'development'
};

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: '✅ Configuration initialized',
  environment: config.nodeEnv,
  port: config.port,
  hasBotCredentials: !!(config.appId && config.appPassword)
}));

// Agora importar os módulos
try {
  const logger = require('./utils/logger');
  const { createServer } = require('./server/createServer');
  const { createAdapter } = require('./server/adapter');
  const { MeshBotPureNatural } = require('./bots/mesh/MeshBot');
  const { setupGracefulShutdown } = require('./server/gracefulShutdown');
  
  async function start() {
    try {
      logger.info('🚀 Starting MESH Platform v2.0.0');
      
      const meshBot = new MeshBotPureNatural();
      const adapter = createAdapter();
      const server = createServer(adapter, meshBot);
      
      setupGracefulShutdown(server);
      
      server.listen(config.port, () => {
        logger.info(`✅ Server running on port ${config.port}`);
        logger.info('💬 MESH está pronto para conversas naturais!');
      });
      
    } catch (error) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: '❌ Critical startup error',
        error: error.message,
        stack: error.stack
      }));
      process.exit(1);
    }
  }
  
  if (require.main === module) {
    start();
  }
  
  module.exports = { start };
  
} catch (error) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: '❌ Failed to load modules',
    error: error.message,
    stack: error.stack
  }));
  process.exit(1);
}