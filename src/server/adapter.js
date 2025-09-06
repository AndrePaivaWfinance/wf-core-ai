// src/server/adapter.js
const { BotFrameworkAdapter } = require('botbuilder');
const logger = require('../utils/logger');

function createAdapter() {
  logger.info('🔌 Creating Bot Framework Adapter', {
    hasCredentials: !!(process.env.MicrosoftAppId || process.env.MICROSOFT_APP_ID),
    environment: process.env.NODE_ENV || 'development'
  });

  const adapterConfig = {
    authConfiguration: {
      requiredEndorsements: []
    }
  };

  // Add credentials if available
  const appId = process.env.MicrosoftAppId || process.env.MICROSOFT_APP_ID;
  const appPassword = process.env.MicrosoftAppPassword || process.env.MICROSOFT_APP_PASSWORD;
  
  if (appId && appPassword) {
    adapterConfig.appId = appId.trim();
    adapterConfig.appPassword = appPassword.trim();
    
    const tenantId = process.env.MicrosoftAppTenantId || process.env.MICROSOFT_APP_TENANT_ID;
    if (tenantId) {
      adapterConfig.channelAuthTenant = tenantId;
      logger.info('🏢 Multi-tenant configuration detected');
    }
  } else {
    logger.warn('🔓 Development mode - running without authentication');
  }

  const adapter = new BotFrameworkAdapter(adapterConfig);

  // Error handler
  adapter.onTurnError = async (context, error) => {
    logger.error('❌ Adapter turn error', error, {
      channelId: context.activity?.channelId,
      activityType: context.activity?.type
    });

    // Don't send error response for auth errors or non-message activities
    const shouldNotRespond = 
      error.statusCode === 401 || 
      error.statusCode === 403 ||
      context.activity?.type !== 'message';

    if (!shouldNotRespond) {
      try {
        await context.sendActivity("Desculpe, tive um problema técnico. Tente novamente.");
      } catch (sendError) {
        logger.error('❌ Could not send error message', sendError);
      }
    }
  };

  logger.info('✅ Adapter configuration complete');
  return adapter;
}

module.exports = { createAdapter };