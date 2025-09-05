// ===================================================
// src/core/bot/BaseBot.js
// ===================================================
const { ActivityHandler } = require('botbuilder');

class BaseBot extends ActivityHandler {
  constructor(config) {
    super();
    this.config = config;
    this.skills = new Map();
    this.llmService = null;
    this.memoryManager = null;
    this.setupHandlers();
  }

  setupHandlers() {
    this.onMessage(async (context, next) => {
      await this.processMessage(context);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await this.handleNewMember(context, member);
        }
      }
      await next();
    });
  }

  async processMessage(context) {
    const text = (context.activity.text || '').trim();
    const userId = context.activity.from?.id || 'unknown';

    // 1. Verificar skills específicas primeiro
    for (const [name, skill] of this.skills) {
      if (await skill.canHandle(text, context)) {
        try {
          const result = await skill.execute({}, context);
          await context.sendActivity(result.data);
          await this.saveToMemory(userId, text, result.data);
          return;
        } catch (error) {
          console.error(`Skill ${name} error:`, error);
        }
      }
    }

    // 2. Fallback para LLM se configurado
    if (this.llmService) {
      try {
        const response = await this.llmService.processMessage(text, this.config, context);
        await context.sendActivity(response);
        await this.saveToMemory(userId, text, response);
        return;
      } catch (error) {
        console.error('LLM error:', error);
      }
    }

    // 3. Resposta padrão
    await context.sendActivity('Olá! Como posso ajudá-lo?');
  }

  async handleNewMember(context, member) {
    await context.sendActivity(`Bem-vindo, ${member.name || 'usuário'}!`);
  }

  async saveToMemory(userId, input, output) {
    if (this.memoryManager) {
      try {
        await this.memoryManager.saveConversation(userId, [
          { role: 'user', content: input },
          { role: 'assistant', content: output }
        ]);
      } catch (error) {
        console.error('Memory save error:', error);
      }
    }
  }

  registerSkill(skill) {
    this.skills.set(skill.name, skill);
    console.log(`Skill registered: ${skill.name}`);
  }

  setLLMService(llmService) {
    this.llmService = llmService;
    console.log('LLM Service connected');
  }

  setMemoryManager(memoryManager) {
    this.memoryManager = memoryManager;
    console.log('Memory Manager connected');
  }
}

module.exports = { BaseBot };
