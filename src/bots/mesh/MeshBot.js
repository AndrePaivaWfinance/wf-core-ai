// MESH Bot Integrado - BaseBot + Funcionalidade mesh-refining
const { BaseBot } = require('../../core/bot/BaseBot');
const { FluxoCaixaSkill } = require('../../skills/financial/FluxoCaixaSkill');
const { ConciliacaoSkill } = require('../../skills/financial/ConciliacaoSkill');
const { createMeshPrompt } = require('../../bot/personality/promptBuilder');
const { MeshResponseFormatter } = require('../../bot/personality/responseFormatter');
const logger = require('../../utils/logger');

class MeshBot extends BaseBot {
  constructor(config) {
    super(config);
    
    // MESH específico
    this.responseFormatter = new MeshResponseFormatter();
    this.promptBuilder = createMeshPrompt;
    
    // Setup MESH
    this.setupMeshSkills();
    this.setupMeshPersonality();
    
    logger.info('🤖 MESH Bot inicializado com framework modular + funcionalidade completa');
  }

  setupMeshSkills() {
    // Registrar skills financeiras
    this.registerSkill(new FluxoCaixaSkill());
    this.registerSkill(new ConciliacaoSkill());
    
    logger.info('✅ MESH skills registradas:', Array.from(this.skills.keys()));
  }

  setupMeshPersonality() {
    // Configurar personalidade MESH
    this.meshPersonality = {
      identity: {
        name: "MESH",
        company: "Wfinance", 
        role: "Analista Sênior de BPO Financeiro"
      },
      expertise: [
        "Conciliação Financeira",
        "Análise de Fluxo de Caixa",
        "Otimização de Processos BPO",
        "Compliance e Auditoria",
        "Automação Financeira"
      ]
    };
    
    logger.info('✅ MESH personality configured');
  }

  // Override processMessage para integrar LLM com Skills
  async processMessage(context) {
    const text = (context.activity.text || '').trim();
    const userId = context.activity.from?.id || 'unknown';
    const requestId = context.activity.id || `mesh-${Date.now()}`;

    logger.debug('MESH processing message', {
      requestId,
      textLength: text.length,
      userId,
      skillsCount: this.skills.size
    });

    try {
      // 1. Verificar skills específicas primeiro (prioridade)
      for (const [name, skill] of this.skills) {
        if (await skill.canHandle(text, context)) {
          logger.info(`Executing skill: ${name}`, { requestId });
          
          try {
            const result = await skill.execute({}, context);
            const formattedResponse = this.formatMeshResponse(result.data, context);
            
            await context.sendActivity(formattedResponse);
            await this.saveToMemory(userId, text, formattedResponse);
            
            logger.info('Skill executed successfully', { 
              requestId, 
              skill: name,
              responseLength: formattedResponse.length 
            });
            return;
          } catch (skillError) {
            logger.error(`Skill ${name} execution error`, {
              requestId,
              error: skillError.message
            });
            // Continue para LLM fallback
          }
        }
      }

      // 2. Fallback para LLM com personalidade MESH
      if (this.llmService) {
        logger.debug('Using LLM service with MESH personality', { requestId });
        
        try {
          // Usar LLM service do mesh-refining
          const llmResponse = await this.llmService.processMessage(text, this.config, context);
          const formattedResponse = this.formatMeshResponse(llmResponse, context);
          
          await context.sendActivity(formattedResponse);
          await this.saveToMemory(userId, text, formattedResponse);
          
          logger.info('LLM response successful', {
            requestId,
            responseLength: formattedResponse.length
          });
          return;
        } catch (llmError) {
          logger.error('LLM service error', {
            requestId,
            error: llmError.message
          });
        }
      }

      // 3. Resposta padrão MESH
      const defaultResponse = this.getMeshDefaultResponse(text);
      await context.sendActivity(defaultResponse);
      
      logger.info('Default MESH response sent', { requestId });

    } catch (error) {
      logger.error('MESH processMessage error', {
        requestId,
        error: error.message,
        stack: error.stack
      });

      // Resposta de erro natural
      const errorResponse = 'Desculpe, não foi possível processar sua solicitação no momento. Como analista de BPO da Wfinance, estou aqui para ajudar com questões financeiras assim que o sistema normalizar.';
      await context.sendActivity(errorResponse);
    }
  }

  async handleNewMember(context, member) {
    const userName = member.name || 'colega';
    
    const welcomeMessage = `Olá, ${userName}! 👋

Sou o **MESH**, analista sênior de BPO Financeiro da Wfinance.

**Posso ajudar com:**
• Relatórios de fluxo de caixa
• Conciliação bancária
• Análises financeiras
• Otimização de processos
• Compliance e auditoria

Como posso ajudá-lo hoje?`;

    const formattedWelcome = this.formatMeshResponse(welcomeMessage, context);
    await context.sendActivity(formattedWelcome);
    
    logger.info('MESH welcome message sent', {
      userName,
      channelId: context.activity.channelId
    });
  }

  formatMeshResponse(response, context) {
    if (!this.responseFormatter) {
      return response;
    }

    const meshContext = this.extractMeshContext(context);
    return this.responseFormatter.formatForCurrentSystem(response, meshContext);
  }

  extractMeshContext(context) {
    if (!context?.activity) return { general: true };
    
    return {
      isTeams: context.activity.channelId === 'msteams',
      isWebChat: context.activity.channelId === 'webchat',
      channelId: context.activity.channelId,
      userName: context.activity.from?.name || 'usuário',
      isGroup: context.activity.conversation?.isGroup || false
    };
  }

  getMeshDefaultResponse(text) {
    if (!text) {
      return 'Como posso ajudá-lo com questões de BPO financeiro hoje?';
    }

    const responses = [
      'Como analista de BPO da Wfinance, posso ajudá-lo com processos financeiros. Poderia especificar sua necessidade?',
      'Estou aqui para auxiliar com questões financeiras e de processos. Em que posso ajudar?',
      'Sou especialista em BPO financeiro. Poderia detalhar sua solicitação?'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Métodos específicos MESH para futuras funcionalidades
  async consultarCosmos(query) {
    // TODO: Implementar consulta Cosmos DB
    logger.info('Cosmos query requested', { query });
    return { success: false, message: 'Funcionalidade em desenvolvimento' };
  }

  async gerarRelatorio(tipo, parametros) {
    // TODO: Implementar geração de relatórios
    logger.info('Report generation requested', { tipo, parametros });
    return { success: false, message: 'Funcionalidade em desenvolvimento' };
  }

  async integrarERP(acao, dados) {
    // TODO: Implementar integração ERP
    logger.info('ERP integration requested', { acao, dados });
    return { success: false, message: 'Funcionalidade em desenvolvimento' };
  }

  // Override para logging específico MESH
  async saveToMemory(userId, input, output) {
    if (this.memoryManager) {
      try {
        await this.memoryManager.saveConversation(userId, [
          { role: 'user', content: input, timestamp: new Date().toISOString() },
          { role: 'mesh', content: output, timestamp: new Date().toISOString() }
        ]);
        
        logger.debug('MESH conversation saved to memory', { userId });
      } catch (error) {
        logger.error('MESH memory save error', {
          userId,
          error: error.message
        });
      }
    }
  }
}

module.exports = { MeshBot };