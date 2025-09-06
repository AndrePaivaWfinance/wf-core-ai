// src/utils/logger.js
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, json, errors } = format;

// Formato personalizado para erros
const errorFormat = format((info) => {
  if (info instanceof Error) {
    return {
      ...info,
      message: info.message,
      stack: info.stack
    };
  }
  return info;
});

// Criar logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    errorFormat(),
    json()
  ),
  defaultMeta: {
    service: 'MESH Platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new transports.Console({
      format: format.json()
    })
  ],
  exceptionHandlers: [
    new transports.Console()
  ],
  rejectionHandlers: [
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

logger.performance = (message, duration, meta = {}) => {
  logger.info(message, { ...meta, type: 'PERFORMANCE', duration });
};

// Stream para Morgan (HTTP logging)
logger.stream = {
  write: (message) => {
    try {
      const logData = JSON.parse(message);
      logger.info('HTTP Request', logData);
    } catch (error) {
      logger.info('HTTP Request', { message });
    }
  }
};

export default logger;