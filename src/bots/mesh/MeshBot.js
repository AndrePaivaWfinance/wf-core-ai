// MESH Bot - Com LLM e Memory integrados
const { BaseBot } = require('../../core/bot/BaseBot');
const { FluxoCaixaSkill } = require('../../skills/financial/FluxoCaixaSkill');
const { ConciliacaoSkill } = require('../../skills/financial/ConciliacaoSkill');

class MeshBot extends BaseBot {
  constructor(config) {
    super(config);
    this.setupMeshSkills();
    this.setupMeshServices();
    console.log('🤖 MESH Bot inicializado com framework completo');
  }

  setupMeshSkills() {
    this.registerSkill(new FluxoCaixaSkill());
    this.registerSkill(new ConciliacaoSkill());
    console.log('✅ MESH skills registradas:', Array.from(this.skills.keys()));
  }

  setupMeshServices() {
    // LLM e Memory serão injetados externamente
    console.log('🔗 MESH services setup completed');
  }

  async handleNewMember(context, member) {
    const welcomeMessage = `👋 **Bem-vindo ao MESH!**

Sou seu analista de BPO Financeiro da Wfinance.

**Posso ajudar com:**
• Relatórios de fluxo de caixa
• Conciliação bancária  
• Análises financeiras
• Integração com ERPs

Como posso ajudá-lo hoje, ${member.name || 'usuário'}?`;

    await context.sendActivity(welcomeMessage);
  }
}

module.exports = { MeshBot };
