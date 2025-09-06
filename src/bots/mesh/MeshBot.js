
// src/bots/mesh/MeshBot.js - VERSÃO SIMPLIFICADA
const { ActivityHandler, MessageFactory } = require('botbuilder');
const logger = require('../../utils/logger');

class MeshBotPureNatural extends ActivityHandler {
  constructor() {
    super();
    
    this.identity = {
      name: "MESH",
      role: "Analista Sênior de BPO Financeiro", 
      company: "Wfinance",
      experience: "5 anos"
    };
    
    this.setupHandlers();
    logger.info('🤖 MESH Bot initialized - Zero scripts, comunicação natural');
  }

  setupHandlers() {
    // Message handler
    this.onMessage(async (context, next) => {
      try {
        await this.processNaturalMessage(context);
      } catch (error) {
        logger.error('❌ Error processing message', error);
        await this.sendErrorMessage(context);
      } finally {
        await next();
      }
    });

    // Member added handler
    this.onMembersAdded(async (context, next) => {
      try {
        for (const member of context.activity.membersAdded) {
          if (member.id !== context.activity.recipient.id) {
            await this.handleNewMember(context, member);
          }
        }
      } catch (error) {
        logger.error('❌ Error handling new member', error);
      } finally {
        await next();
      }
    });
  }

  async processNaturalMessage(context) {
    const text = (context.activity.text || '').trim();
    const userId = context.activity.from?.id || 'unknown';
    
    if (!text) {
      await context.sendActivity("Oi! Em que posso ajudar?");
      return;
    }

    logger.info('💬 Message received', { userId, textLength: text.length });

    // Generate natural response
    const response = this.generateNaturalResponse(text);
    
    await context.sendActivity(response);
    logger.info('✅ Response sent', { userId, responseLength: response.length });
  }

  generateNaturalResponse(text) {
    const lowerText = text.toLowerCase();
    
    // Natural conversation patterns
    if (this.isGreeting(lowerText)) {
      return this.generateGreetingResponse();
    }
    
    if (this.isFinancialTopic(lowerText)) {
      return this.generateFinancialResponse(lowerText);
    }
    
    if (this.isQuestion(lowerText)) {
      return this.generateQuestionResponse();
    }
    
    // Default natural response
    return this.generateDefaultResponse();
  }

  isGreeting(text) {
    const greetings = ['oi', 'olá', 'ola', 'hello', 'hi', 'e aí', 'tudo bem'];
    return greetings.some(greeting => text.includes(greeting));
  }

  isFinancialTopic(text) {
    const financialTerms = [
      'fluxo', 'caixa', 'conciliação', 'conciliacao', 'bancária', 'bancaria',
      'relatório', 'relatorio', 'dre', 'balanço', 'balanco', 'financeiro'
    ];
    return financialTerms.some(term => text.includes(term));
  }

  isQuestion(text) {
    return text.includes('?') || text.startsWith('como');
  }

  generateGreetingResponse() {
    const greetings = [
      "Oi! Sou o MESH, analista financeiro da Wfinance. Como posso ajudar?",
      "Olá! Em que posso ajudar hoje?",
      "Oi! Tudo bem? No que posso ser útil?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  generateFinancialResponse(text) {
    if (text.includes('fluxo') && text.includes('caixa')) {
      return "Para análise de fluxo de caixa, posso ajudar com projeções e análise de sazonalidade. Qual período você precisa?";
    }
    
    if (text.includes('conciliação') || text.includes('conciliacao')) {
      return "Conciliação bancária é uma das minhas especialidades! De qual banco você precisa?";
    }
    
    if (text.includes('relatório') || text.includes('relatorio')) {
      return "Posso ajudar com relatórios financeiros: DRE, balanço, indicadores. Qual tipo você precisa?";
    }
    
    return "Trabalho com análises financeiras, conciliações, relatórios e projeções. O que exatamente você precisa?";
  }

  generateQuestionResponse() {
    return "Boa pergunta! Como analista financeiro, posso ajudar com diversas questões de negócio. Pode me dar mais detalhes do que precisa?";
  }

  generateDefaultResponse() {
    const responses = [
      "Entendi. Como posso ajudar com isso?",
      "Certo. Me conte mais sobre o que você precisa...",
      "Interessante. No que posso ser útil especificamente?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async handleNewMember(context, member) {
    const name = member.name || 'colega';
    const welcomeMessage = `Oi ${name}! Sou o MESH, analista financeiro da Wfinance. Como posso ajudar?`;
    await context.sendActivity(welcomeMessage);
    logger.info('👋 Welcome message sent', { userId: member.id });
  }

  async sendErrorMessage(context) {
    try {
      await context.sendActivity(
        MessageFactory.text("Tive um problema técnico. Pode tentar novamente?")
      );
    } catch (error) {
      logger.error('❌ Failed to send error message', error);
    }
  }
}

module.exports = { MeshBotPureNatural };