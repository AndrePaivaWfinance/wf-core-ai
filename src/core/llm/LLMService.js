// Core LLM Service - Integração com Azure OpenAI/OpenAI
class BaseLLMService {
  constructor(config) {
    this.config = config;
    this.providers = new Map();
  }

  async processMessage(text, context) {
    // Implementação será adicionada
    return 'LLM Service funcionando - ' + text;
  }

  registerProvider(name, provider) {
    this.providers.set(name, provider);
  }
}

module.exports = { BaseLLMService };
