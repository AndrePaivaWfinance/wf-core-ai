
// src/server/adapter.js
// ===================================================
const { BotFrameworkAdapter } = require('botbuilder');

function createAdapter({ appId, appPassword }) {
  console.log('[Adapter] Creating adapter...', {
    hasCredentials: !!(appId && appPassword),
    environment: process.env.NODE_ENV || 'development'
  });

  let adapter;

  if (!appId || !appPassword) {
    console.log('[Adapter] Development mode - no credentials');
    
    adapter = new BotFrameworkAdapter({
      channelAuthTenant: process.env.MICROSOFT_APP_TENANT_ID,
      authConfiguration: {
        requiredEndorsements: []
      }
    });
    
  } else {
    console.log('[Adapter] Production mode with credentials');
    
    adapter = new BotFrameworkAdapter({
      appId: appId.trim(),
      appPassword: appPassword.trim(),
      channelAuthTenant: process.env.MICROSOFT_APP_TENANT_ID
    });
  }

  // Error handler
  adapter.onTurnError = async (context, error) => {
    const timestamp = new Date().toISOString();
    
    console.error(`[Adapter Error] [${timestamp}]:`, {
      message: error.message,
      statusCode: error.statusCode,
      channelId: context.activity?.channelId,
      activityType: context.activity?.type
    });

    // Handle authentication errors
    if (error.statusCode === 401 || error.message?.includes('Unauthorized')) {
      console.error('[Adapter] Authentication issue');
      return;
    }

    // Send generic error message
    const shouldNotRespond = 
      (error.statusCode === 401 && context.activity?.channelId === 'webchat') ||
      (error.statusCode === 403) ||
      (context.activity?.type !== 'message');

    if (!shouldNotRespond) {
      try {
        await context.sendActivity({
          type: 'message',
          text: 'Erro no processamento. Nossa equipe foi notificada.'
        });
      } catch (sendError) {
        console.error('[Adapter] Could not send error message:', sendError.message);
      }
    }
  };

  console.log('[Adapter] Configuration complete');
  return adapter;
}

module.exports = { createAdapter };