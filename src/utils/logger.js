// src/utils/logger.js
// Logger simplificado para Restify

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json } = format;
const config = require('../config/env');

const logger = createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json()
  ),
  defaultMeta: {
    service: 'MESH Platform',
    environment: config.environment
  },
  transports: [
    new transports.Console()
  ]
});

// Métodos auxiliares
logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'API' });
};

logger.business = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'BUSINESS' });
};

module.exports = logger;