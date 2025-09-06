// ================================================
// LLM SERVICE MÍNIMO - SEM SCRIPTS, TOTALMENTE NATURAL
// ================================================

const logger = require('../core/utils/logger');

class MinimalNaturalLLM {
  constructor() {
    this.fetch = this.getFetch();
    this.initialized = false;
  }

  getFetch() {
    if (typeof globalThis !== 'undefined' && globalThis.fetch) {
      return globalThis.fetch.bind(globalThis);
    }
    if (typeof fetch !== 'undefined') return fetch;
    try {
      return require('node-fetch');
    } catch (error) {
      return null;
    }
  }

  async initialize() {
    this.initialized = true;
    logger.info('✅ Minimal Natural LLM initialized');
  }

  // ================================================
  // PROMPT MÍNIMO E NATURAL
  // ================================================

  buildMinimalPrompt() {
    return `Você é o MESH, analista sênior de BPO Financeiro da Wfinance há 5 anos.

Converse naturalmente como um profissional experiente conversaria. Seja direto, prático e útil.

Suas principais atividades:
- Análise de fluxo de caixa
- Conciliação bancária  
- Relatórios financeiros
- Integração de sistemas (Cosmos DB, APIs ERP, Nibo)

Responda em português brasileiro, de forma natural e profissional.`;
  }

  // ================================================
  // PROCESSAMENTO SIMPLES
  // ================================================

  async processMessage(text, config, context = null) {
    if (!text?.trim()) {
      return "Oi! Em que posso ajudar?";
    }

    if (!this.fetch) {
      return this.simpleFallback(text);
    }

    try {
      // Tentar Azure OpenAI primeiro
      if (config?.azure?.endpoint && config?.azure?.apiKey) {
        const result = await this.tryAzure(text, config.azure);
        if (result) return result;
      }

      // Fallback OpenAI
      if (config?.openai?.apiKey) {
        const result = await this.tryOpenAI(text, config.openai);
        if (result) return result;
      }

      return this.simpleFallback(text);

    } catch (error) {
      logger.error('LLM error:', error.message);
      return this.simpleFallback(text);
    }
  }

  async tryAzure(text, azureConfig) {
    try {
      const { endpoint, apiKey, deployment, apiVersion } = azureConfig;
      
      const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion || '2024-06-01'}`;
      
      const response = await this.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: this.buildMinimalPrompt() },
            { role: 'user', content: text }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data?.choices?.[0]?.message?.content?.trim();

    } catch (error) {
      return null;
    }
  }

  async tryOpenAI(text, openaiConfig) {
    try {
      const { apiKey, model } = openaiConfig;
      
      const response = await this.fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.buildMinimalPrompt() },
            { role: 'user', content: text }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data?.choices?.[0]?.message?.content?.trim();

    } catch (error) {
      return null;
    }
  }

  // ================================================
  // FALLBACK SIMPLES
  // ================================================

  simpleFallback(text) {
    const lower = text.toLowerCase();
    
    if (lower.includes('fluxo') && lower.includes('caixa')) {
      return "Para fluxo de caixa, posso analisar qualquer período. Qual você precisa?";
    }
    
    if (lower.includes('conciliação') || lower.includes('conciliacao')) {
      return "Conciliação bancária é algo que faço bastante. Qual banco?";
    }
    
    if (lower.includes('relatório') || lower.includes('relatorio')) {
      return "Que tipo de relatório você está pensando?";
    }
    
    if (lower.includes('help') || lower.includes('ajuda')) {
      return "Trabalho com análises financeiras, conciliações e relatórios. O que você precisa?";
    }
    
    return "Como posso ajudar? Trabalho principalmente com processos financeiros.";
  }
}

// Instância singleton
const minimalLLM = new MinimalNaturalLLM();

// Auto-inicializar
minimalLLM.initialize();

// Função de exportação
async function processMessage(text, config, context) {
  return await minimalLLM.processMessage(text, config, context);
}

module.exports = {
  processMessage,
  MinimalNaturalLLM,
  minimalLLM
};