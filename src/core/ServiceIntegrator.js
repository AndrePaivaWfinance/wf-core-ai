// Service Integrator - Conecta LLM, Memory e Bot
const { BaseLLMService } = require('./llm/LLMService');
const { BaseMemoryManager } = require('./memory/MemoryManager');

class ServiceIntegrator {
  constructor(config) {
    this.config = config;
    this.llmService = null;
    this.memoryManager = null;
  }

  async initialize() {
    // Inicializar LLM Service
    if (this.config.azure?.endpoint || this.config.openai?.apiKey) {
      this.llmService = new BaseLLMService(this.config);
      console.log('✅ LLM Service initialized');
    }

    // Inicializar Memory Manager
    if (this.config.cosmos?.endpoint) {
      this.memoryManager = new BaseMemoryManager(
        this.config.cosmos.endpoint,
        this.config.cosmos.key,
        this.config.cosmos.database
      );
      await this.memoryManager.initialize();
      console.log('✅ Memory Manager initialized');
    }
  }

  integrateWithBot(bot) {
    if (this.llmService) {
      bot.setLLMService(this.llmService);
    }
    
    if (this.memoryManager) {
      bot.setMemoryManager(this.memoryManager);
    }
    
    console.log('🔗 Services integrated with bot');
  }

  getLLMService() {
    return this.llmService;
  }

  getMemoryManager() {
    return this.memoryManager;
  }
}

module.exports = { ServiceIntegrator };
