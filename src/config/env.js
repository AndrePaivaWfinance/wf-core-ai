// ===================================================
// src/utils/logger.js
// ===================================================
const { appInsights } = require('./core/monitoring/appInsights');

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