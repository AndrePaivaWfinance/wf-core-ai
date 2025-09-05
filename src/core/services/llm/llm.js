// src/services/llm.js - Versão Mínima Funcional
const logger = require('../utils/logger');

class LLMService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('🧠 LLM Service initializing...');
      this.initialized = true;
      logger.info('✅ LLM Service initialized');
    } catch (error) {
      logger.error('❌ LLM Service initialization failed:', error.message);
    }
  }

  async processMessage(text, config, context = null) {
    const requestId = context?.activity?.id || `req-${Date.now()}`;
    
    logger.debug('🔄 Processing LLM message', {
      requestId,
      textLength: text?.length || 0,
      hasConfig: !!config
    });

    try {
      // Por enquanto, resposta básica do MESH
      if (!text || text.trim() === '') {
        return 'Olá! Sou o MESH, analista de BPO Financeiro da Wfinance. Como posso ajudá-lo hoje?';
      }

      // Resposta contextual básica
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('fluxo') && lowerText.includes('caixa')) {
        return `📊 **Análise de Fluxo de Caixa**

Posso ajudá-lo com:
• Relatórios de entrada e saída
• Projeções financeiras
• Análise de tendências
• Identificação de gargalos

Precisa de algum relatório específico?`;
      }
      
      if (lowerText.includes('conciliação') || lowerText.includes('conciliacao')) {
        return `🏦 **Conciliação Bancária**

Serviços disponíveis:
• Conciliação automática de extratos
• Identificação de divergências
• Relatórios de pendências
• Análise de movimentações

Qual banco ou período você gostaria de conciliar?`;
      }
      
      if (lowerText.includes('relatório') || lowerText.includes('relatorio')) {
        return `📋 **Relatórios Financeiros**

Relatórios disponíveis:
• DRE (Demonstração do Resultado)
• Balanço Patrimonial
• Fluxo de Caixa
• Contas a Pagar/Receber
• Análises personalizadas

Qual relatório você precisa?`;
      }
      
      if (lowerText.includes('ajuda') || lowerText.includes('help')) {
        return `🤖 **MESH - Analista BPO Financeiro**

**Minhas especialidades:**
• 📊 Análise de fluxo de caixa
• 🏦 Conciliação bancária
• 📋 Relatórios gerenciais
• 💰 Controle financeiro
• 📈 Projeções e análises

**Como posso ajudar:**
- Digite "fluxo de caixa" para análises
- Digite "conciliação" para reconciliações
- Digite "relatório" para documentos
- Ou me conte sua necessidade específica

Estou aqui para otimizar seus processos financeiros!`;
      }

      // Resposta genérica profissional
      return `Como analista de BPO Financeiro da Wfinance, posso ajudá-lo com processos financeiros, análises e relatórios.

**Suas opções:**
• Análise de fluxo de caixa
• Conciliação bancária  
• Relatórios gerenciais
• Consultoria em processos

Poderia especificar sua necessidade? Por exemplo: "Preciso do fluxo de caixa de dezembro" ou "Como fazer conciliação do Banco do Brasil".`;

    } catch (error) {
      logger.error('❌ LLM processing error:', {
        requestId,
        error: error.message
      });
      
      return 'Desculpe, estou enfrentando dificuldades técnicas no momento. Nossa equipe já foi notificada. Tente novamente em alguns instantes.';
    }
  }

  async shutdown() {
    logger.info('🔄 LLM Service shutting down...');
    this.initialized = false;
    logger.info('✅ LLM Service shut down');
  }
}

// Singleton instance
const llmService = new LLMService();

// Initialize automatically
llmService.initialize().catch(error => {
  logger.error('Failed to auto-initialize LLM Service:', error.message);
});

// Export both the class and instance
module.exports = {
  LLMService,
  llmService,
  processMessage: (text, config, context) => llmService.processMessage(text, config, context)
};