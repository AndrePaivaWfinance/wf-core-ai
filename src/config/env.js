// src/config/env.js - VERSÃO CORRIGIDA
const path = require('path');
const fs = require('fs');

class ConfigManager {
  constructor() {
    this.config = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      env: process.env.NODE_ENV || 'development',
      port: Number(process.env.PORT || process.env.WEBSITES_PORT || 3978),
      isProduction: process.env.NODE_ENV === 'production',
      
      // Bot Framework configuration
      bot: {
        appId: process.env.MICROSOFT_APP_ID || '',
        appPassword: process.env.MICROSOFT_APP_PASSWORD || '',
        appType: process.env.MICROSOFT_APP_TYPE || 'MultiTenant',
        tenantId: process.env.MICROSOFT_APP_TENANT_ID || ''
      },

      // OpenAI configuration
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      },

      // Azure OpenAI configuration
      azure: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
        apiKey: process.env.AZURE_OPENAI_API_KEY || '',
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-06-01'
      }
    };
  }

  async initialize() {
    try {
      // Load .env in development
      if (this.config.env === 'development') {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          require('dotenv').config({ path: envPath });
          console.log('✅ .env file loaded');
          
          // Reload config after .env
          this.config = this.getDefaultConfig();
        } else {
          console.log('ℹ️ No .env file found, using environment variables');
        }
      }

      console.log('✅ Configuration initialized', {
        environment: this.config.env,
        port: this.config.port,
        hasBotCredentials: !!(this.config.bot.appId && this.config.bot.appPassword),
        hasAzureOpenAI: !!(this.config.azure.endpoint && this.config.azure.apiKey),
        hasOpenAI: !!this.config.openai.apiKey
      });
      
      return this.config;
      
    } catch (error) {
      console.error('❌ Configuration error:', error.message);
      return this.config;
    }
  }

  getConfig() {
    return this.config;
  }
}

// Singleton instance
const configManager = new ConfigManager();

// Initialize and export promise
const configPromise = configManager.initialize()
  .then(() => {
    console.log('✅ Configuration ready');
    return configManager.getConfig();
  })
  .catch((error) => {
    console.error('❌ Configuration failed:', error.message);
    return configManager.getConfig();
  });

module.exports = { configPromise, ConfigManager };