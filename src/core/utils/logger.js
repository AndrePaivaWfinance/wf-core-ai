// src/utils/logger.js
class Logger {
  static log(level, message, properties = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...properties };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }
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