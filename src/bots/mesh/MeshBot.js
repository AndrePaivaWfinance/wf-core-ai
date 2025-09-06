// src/bots/mesh/MeshBot.js
import { ActivityHandler } from 'botbuilder';
import logger from '../../utils/logger.js';

/**
 * Classe MeshBotPureNatural - Bot especializado em análise financeira
 * Implementa um assistente virtual com comunicação natural para processos de BPO Financeiro
 */
class MeshBotPureNatural extends ActivityHandler {
  constructor() {
    super();
    
    this.identity = {
      name: "MESH",
      role: "Analista Sênior de BPO Financeiro", 
      company: "Wfinance",
      experience: "5 anos",
      specialization: "Análises financeiras, conciliações bancárias e relatórios"
    };
    
    this.responseTemplates = {
      greetings: [
        "Olá! Sou o MESH, analista financeiro da Wfinance. Como posso auxiliá-lo hoje?",
        "Saudações! Estou aqui para ajudar com questões financeiras. No que posso ser útil?",
        "Bem-vindo! Sou especialista em BPO Financeiro. Como posso assisti-lo?"
      ],
      defaultResponses: [
        "Compreendo. Poderia detalhar um pouco mais sua necessidade?",
        "Entendido. Para melhor ajudá-lo, preciso de mais informações específicas.",
        "Percebi. Qual aspecto específico requer minha atenção?"
      ]
    };
    
    this.financialTerms = {
      cashFlow: ['fluxo de caixa', 'fluxo caixa', 'projeção financeira'],
      reconciliation: ['conciliação bancária', 'conciliacao bancaria', 'conciliação'],
      reports: ['relatório financeiro', 'relatorio financeiro', 'dre', 'balanço']
    };
    
    this.setupHandlers();
    logger.info('MESH Bot inicializado - Comunicação natural especializada em BPO Financeiro');
  }

  /**
   * Configura os manipuladores de atividades do bot
   */
  setupHandlers() {
    // Manipulador de mensagens
    this.onMessage(async (context, next) => {
      try {
        await this.processMessage(context);
      } catch (error) {
        logger.error('Erro no processamento de mensagem', { 
          error: error.message, 
          stack: error.stack 
        });
        await this.sendErrorMessage(context);
      } finally {
        await next();
      }
    });

    // Manipulador de novos membros na conversa
    this.onMembersAdded(async (context, next) => {
      try {
        for (const member of context.activity.membersAdded) {
          if (member.id !== context.activity.recipient.id) {
            await this.handleNewMember(context, member);
          }
        }
      } catch (error) {
        logger.error('Erro ao processar novo membro', { 
          error: error.message, 
          stack: error.stack 
        });
      } finally {
        await next();
      }
    });
  }

  /**
   * Processa mensagens recebidas do usuário
   * @param {Object} context - Contexto da atividade do Bot Framework
   */
  async processMessage(context) {
    const userMessage = (context.activity.text || '').trim();
    const userId = context.activity.from?.id || 'unknown-user';
    
    if (!userMessage) {
      await context.sendActivity("Olá! Como posso ajudá-lo hoje?");
      return;
    }

    logger.info('Mensagem recebida', { 
      userId, 
      messageLength: userMessage.length,
      messagePreview: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '')
    });

    const response = this.generateResponse(userMessage);
    
    await context.sendActivity(response);
    logger.info('Resposta enviada', { 
      userId, 
      responseLength: response.length 
    });
  }

  /**
   * Gera resposta contextual baseada na mensagem do usuário
   * @param {String} text - Texto da mensagem do usuário
   * @returns {String} Resposta contextual apropriada
   */
  generateResponse(text) {
    const normalizedText = text.toLowerCase();
    
    if (this.isGreeting(normalizedText)) {
      return this.generateGreetingResponse();
    }
    
    if (this.isFinancialTopic(normalizedText)) {
      return this.generateFinancialResponse(normalizedText);
    }
    
    if (this.isQuestion(normalizedText)) {
      return this.generateQuestionResponse();
    }
    
    return this.generateDefaultResponse();
  }

  /**
   * Verifica se a mensagem é um cumprimento
   * @param {String} text - Texto normalizado
   * @returns {Boolean} Verdadeiro se for um cumprimento
   */
  isGreeting(text) {
    const greetingPatterns = [
      'oi', 'olá', 'ola', 'hello', 'hi', 'e aí', 'tudo bem', 
      'bom dia', 'boa tarde', 'boa noite'
    ];
    return greetingPatterns.some(greeting => text.includes(greeting));
  }

  /**
   * Verifica se a mensagem trata de tópicos financeiros
   * @param {String} text - Texto normalizado
   * @returns {Boolean} Verdadeiro se for sobre finanças
   */
  isFinancialTopic(text) {
    const financialTerms = [
      ...this.financialTerms.cashFlow,
      ...this.financialTerms.reconciliation,
      ...this.financialTerms.reports,
      'bancária', 'bancaria', 'financeiro', 'contábil', 'contabil'
    ];
    return financialTerms.some(term => text.includes(term));
  }

  /**
   * Verifica se a mensagem é uma pergunta
   * @param {String} text - Texto normalizado
   * @returns {Boolean} Verdadeiro se for uma pergunta
   */
  isQuestion(text) {
    const questionPatterns = ['?', 'como', 'quando', 'onde', 'por que', 'porque', 'qual'];
    return questionPatterns.some(pattern => text.includes(pattern));
  }

  /**
   * Gera resposta para cumprimentos
   * @returns {String} Resposta de cumprimento
   */
  generateGreetingResponse() {
    const randomIndex = Math.floor(Math.random() * this.responseTemplates.greetings.length);
    return this.responseTemplates.greetings[randomIndex];
  }

  /**
   * Gera resposta para tópicos financeiros
   * @param {String} text - Texto normalizado
   * @returns {String} Resposta especializada
   */
  generateFinancialResponse(text) {
    if (this.financialTerms.cashFlow.some(term => text.includes(term))) {
      return "Para análise de fluxo de caixa, posso auxiliar com projeções e análise de sazonalidade. Qual período específico você precisa analisar?";
    }
    
    if (this.financialTerms.reconciliation.some(term => text.includes(term))) {
      return "Conciliação bancária é uma das minhas especialidades! Poderia informar de qual instituição bancária você precisa realizar a conciliação?";
    }
    
    if (this.financialTerms.reports.some(term => text.includes(term))) {
      return "Posso auxiliar na geração de relatórios financeiros: DRE, balanço patrimonial, indicadores de performance. Qual tipo específico de relatório você necessita?";
    }
    
    return "Como especialista em BPO Financeiro, posso auxiliar com análises financeiras, conciliações bancárias, relatórios gerenciais e projeções. Qual é sua necessidade específica?";
  }

  /**
   * Gera resposta para perguntas
   * @returns {String} Resposta para perguntas
   */
  generateQuestionResponse() {
    return "Excelente questionamento! Como analista financeiro sênior, posso auxiliar com diversas questões de negócio. Poderia detalhar um pouco mais sua necessidade?";
  }

  /**
   * Gera resposta padrão
   * @returns {String} Resposta padrão
   */
  generateDefaultResponse() {
    const randomIndex = Math.floor(Math.random() * this.responseTemplates.defaultResponses.length);
    return this.responseTemplates.defaultResponses[randomIndex];
  }

  /**
   * Manipula a adição de novos membros à conversa
   * @param {Object} context - Contexto da atividade
   * @param {Object} member - Informações do novo membro
   */
  async handleNewMember(context, member) {
    const userName = member.name || 'colega';
    const welcomeMessage = `Olá ${userName}! Sou o MESH, analista sênior de BPO Financeiro da Wfinance. Como posso auxiliá-lo hoje?`;
    
    await context.sendActivity(welcomeMessage);
    logger.info('Mensagem de boas-vindas enviada', { userId: member.id });
  }

  /**
   * Envia mensagem de erro para o usuário
   * @param {Object} context - Contexto da atividade
   */
  async sendErrorMessage(context) {
    try {
      await context.sendActivity(
        "Enfrentamos uma dificuldade técnica momentânea. Poderia tentar novamente, por favor?"
      );
    } catch (error) {
      logger.error('Falha ao enviar mensagem de erro', { 
        error: error.message, 
        stack: error.stack 
      });
    }
  }
}

export { MeshBotPureNatural };