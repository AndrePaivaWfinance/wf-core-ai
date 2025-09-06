// src/config/env.js
// Configuração simplificada

// Carregar .env
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const config = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3978,
  logLevel: process.env.LOG_LEVEL || 'info',
  
  botFramework: {
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    tenantId: process.env.MicrosoftAppTenantId,
    hasCredentials: !!(process.env.MicrosoftAppId && process.env.MicrosoftAppPassword)
  }
};

// Log inicial
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: '✅ Configuration initialized',
  service: 'MESH Platform',
  environment: config.environment,
  config: {
    port: config.port,
    hasBotCredentials: config.botFramework.hasCredentials
  }
}));

module.exports = config;