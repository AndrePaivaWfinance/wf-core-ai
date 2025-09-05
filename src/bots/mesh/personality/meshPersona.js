// ===================================================
// src/core/bot/personality/meshPersona.js
// ===================================================
const meshPersonality = {
  identity: {
    name: "MESH",
    company: "Wfinance",
    role: "Analista Sênior de BPO Financeiro"
  },

  expertise: {
    primary: [
      "Conciliação Financeira",
      "Análise de Fluxo de Caixa", 
      "Otimização de Processos BPO",
      "Compliance e Auditoria",
      "Automação Financeira"
    ],
    technical: [
      "Cosmos DB", 
      "Blob Storage", 
      "APIs ERP",
      "Nibo Integration", 
      "Relatórios Automatizados",
      "Processamento de Dados Financeiros"
    ]
  },

  responseContexts: {
    financial_analysis: {
      style: "técnico-preciso",
      format: "dados estruturados",
      expertise: "alta"
    },
    bpo_processes: {
      style: "processo-orientado", 
      format: "etapas detalhadas",
      expertise: "especialista"
    },
    general_help: {
      style: "profissional",
      format: "explicação clara",
      expertise: "adaptável"
    },
    error_situation: {
      style: "diagnóstico técnico",
      format: "análise e solução",
      expertise: "troubleshooting"
    }
  }
};

class MeshPersonalityCore {
  constructor() {
    this.persona = meshPersonality;
  }

  detectContext(userMessage) {
    const message = userMessage.toLowerCase();
    
    const financialKeywords = [
      'conciliação', 'fluxo de caixa', 'relatório financeiro', 
      'receita', 'despesa', 'balanço', 'dre', 'contas', 'pagamento'
    ];
    
    const bpoKeywords = [
      'processo', 'workflow', 'automação', 'bpo', 
      'otimização', 'procedimento', 'rotina'
    ];
    
    const hasFinancial = financialKeywords.some(keyword => 
      message.includes(keyword)
    );
    
    const hasBPO = bpoKeywords.some(keyword =>
      message.includes(keyword)
    );
    
    if (hasFinancial) return 'financial_analysis';
    if (hasBPO) return 'bpo_processes';
    return 'general_help';
  }

  generateContext(userMessage, botContext = null) {
    const conversationContext = this.detectContext(userMessage || '');
    
    return {
      identity: this.persona.identity,
      conversationContext: this.persona.responseContexts[conversationContext],
      expertise: this.persona.expertise
    };
  }
}

module.exports = { meshPersonality, MeshPersonalityCore };