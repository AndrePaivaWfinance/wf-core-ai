// src/server/middleware/index.js
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const responseTime = require('response-time');
const config = require('../../config/env');
const logger = require('../../utils/logger');

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// CORS configuration
const corsOptions = {
  origin: config.security.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200
};

// Request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    });
  });
  
  next();
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(error.statusCode || 500).json({
    error: 'Internal Server Error',
    message: config.environment === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    ...(config.environment !== 'production' && { stack: error.stack })
  });
};

// Validation middleware
const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }
  next();
};

module.exports = {
  apiLimiter,
  securityHeaders,
  cors: cors(corsOptions),
  compression: compression(),
  responseTime: responseTime(),
  requestLogger,
  errorHandler,
  validateRequest
};