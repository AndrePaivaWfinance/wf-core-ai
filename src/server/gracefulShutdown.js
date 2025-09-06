// src/server/gracefulShutdown.js
// Graceful shutdown simplificado

const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
const SHUTDOWN_TIMEOUT = 10000;

function setupGracefulShutdown(server) {
  const log = (level, message, meta = {}) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'MESH Platform',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    }));
  };

  const shutdown = async (signal) => {
    log('info', `🛑 Received ${signal}, shutting down gracefully...`);
    
    server.close(() => {
      log('info', '✅ HTTP server closed');
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setTimeout(() => {
      log('info', '🚪 Process exiting gracefully');
      process.exit(0);
    }, 1000);
  };
  
  const forceShutdown = () => {
    log('error', '⏰ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  };
  
  SHUTDOWN_SIGNALS.forEach(signal => {
    process.on(signal, () => {
      shutdown(signal);
      setTimeout(forceShutdown, SHUTDOWN_TIMEOUT);
    });
  });
  
  log('info', '✅ Graceful shutdown handlers registered');
}

module.exports = { setupGracefulShutdown };