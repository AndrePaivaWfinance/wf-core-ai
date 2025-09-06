// src/index.js - VERSÃO ES MODULE
import 'dotenv/config'; // Carrega .env automaticamente
import logger from './utils/logger.js';
import { createServer } from './server/createServer.js';
import { createAdapter } from './server/adapter.js';
import { MeshBotPureNatural } from './bots/mesh/MeshBot.js';
import { setupGracefulShutdown } from './server/gracefulShutdown.js';

// Configuração manual
const config = {
  port: process.env.PORT || 3978,
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Log inicial
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: '✅ Configuration initialized',
  service: 'MESH Platform',
  environment: config.nodeEnv,
  config: {
    port: config.port,
    hasBotCredentials: !!(config.appId && config.appPassword)
  }
}));

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
    logger.error('❌ Critical startup error', error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { start };