// ================================================
// MESH BOT PURE NATURAL - ZERO SCRIPTS
// ================================================
// MESH age naturalmente, sem estruturas pré-definidas

const { BaseBot } = require('../../core/bot/BaseBot');
const { FluxoCaixaSkill } = require('../../skills/financial/FluxoCaixaSkill');
const { ConciliacaoSkill } = require('../../skills/financial/ConciliacaoSkill');
const logger = require('../../core/utils/logger');

class MeshBotPureNatural extends BaseBot {
  constructor(config) {
    super(config);
    
    // Apenas informações básicas - sem scripts
    this.identity = {
      name: "MESH",
      role: "Analista Sênior de BPO Financeiro", 
      company: "Wfinance",
      experience: "5 anos"
    };
    
    // Registrar skills
    this.registerSkill(new FluxoCaixaSkill());
    this.registerSkill(new ConciliacaoSkill());
    
    logger.info('🤖 MESH Bot Pure Natural - Zero scripts, comunicação livre');
  }

  // ================================================
  // PROCESSAMENTO NATURAL SIMPLES
  // ================================================

  async processMessage(context) {
    const text = (context.activity.text || '').trim();
    const userId = context.activity.from?.id || 'unknown';
    const requestId = context.activity.id || `mesh-${Date.now()}`;

    try {
      // Se não tem texto, resposta simples
      if (!text) {
        await context.sendActivity("Oi! Em que posso ajudar?");
        return;
      }

      // Tentar skills primeiro
      for (const [skillName, skill] of this.skills) {
        if (await skill.canHandle(text, context)) {
          const result = await skill.safeExecute({}, context);
          if (result.success) {
            await context.sendActivity(result.data);
            return;
          }
        }
      }

      // Se skills não conseguiram, usar LLM naturalmente
      if (this.llmService) {
        const response = await this.llmService.processMessage(text, this.config, context);
        await context.sendActivity(response);
      } else {
        // Fallback simples e natural
        await context.sendActivity(this.naturalFallback(text));
      }

    } catch (error) {
      logger.error('Error processing message:', error);
      await context.sendActivity("Tive um problema técnico. Pode tentar de novo?");
    }
  }

  async handleNewMember(context, member) {
    const name = member.name || 'colega';
    await context.sendActivity(`Oi ${name}! Sou o MESH, analista financeiro da Wfinance. Qualquer coisa, é só falar.`);
  }

  naturalFallback(text) {
    const lower = text.toLowerCase();
    
    if (lower.includes('fluxo')) {
      return "Para fluxo de caixa, posso analisar qualquer período que você precisar. Qual você tem em mente?";
    }
    
    if (lower.includes('conciliação') || lower.includes('conciliacao')) {
      return "Conciliação bancária é uma das coisas que mais faço. Qual banco você precisa?";
    }
    
    if (lower.includes('relatório') || lower.includes('relatorio')) {
      return "Que tipo de relatório você precisa? DRE, balanço, algo específico?";
    }
    
    return "Trabalho com análises financeiras, conciliações e relatórios. O que você precisa?";
  }
}

module.exports = { MeshBotPureNatural };