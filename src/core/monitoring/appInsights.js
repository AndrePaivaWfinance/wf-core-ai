let appInsights = {
  defaultClient: null
};

function initializeAppInsights() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (connectionString) {
    try {
      const ai = require('applicationinsights');
      ai.setup(connectionString)
        .setAutoCollectRequests(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .start();
      
      appInsights.defaultClient = ai.defaultClient;
      console.log('✅ Application Insights initialized');
    } catch (error) {
      console.warn('⚠️ Application Insights package not available, monitoring disabled');
    }
  } else {
    console.log('ℹ️ Application Insights not configured (APPLICATIONINSIGHTS_CONNECTION_STRING not set)');
  }
  
  return appInsights;
}

// Initialize immediately
appInsights = initializeAppInsights();

module.exports = { appInsights };
