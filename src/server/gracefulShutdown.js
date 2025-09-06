// src/server/gracefulShutdown.js
import logger from '../utils/logger.js';

const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
const SHUTDOWN_TIMEOUT = 10000;

export function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
    
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setTimeout(() => {
      logger.info('🚪 Process exiting gracefully');
      process.exit(0);
    }, 1000);
  };
  
  const forceShutdown = () => {
    logger.error('⏰ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  };
  
  SHUTDOWN_SIGNALS.forEach(signal => {
    process.on(signal, () => {
      shutdown(signal);
      setTimeout(forceShutdown, SHUTDOWN_TIMEOUT);
    });
  });
  
  logger.info('✅ Graceful shutdown handlers registered');
}