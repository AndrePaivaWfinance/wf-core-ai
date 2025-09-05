// src/monitoring/appInsights.js
let appInsights = { defaultClient: null };

try {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (connectionString) {
    const ai = require('applicationinsights');
    ai.setup(connectionString)
      .setAutoCollectRequests(true)
      .setAutoCollectExceptions(true)
      .start();
    appInsights.defaultClient = ai.defaultClient;
    console.log('✅ Application Insights initialized');
  } else {
    console.log('ℹ️ Application Insights not configured');
  }
} catch (error) {
  console.log('⚠️ Application Insights not available:', error.message);
}

module.exports = { appInsights };