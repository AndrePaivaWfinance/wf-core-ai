# MESH Framework - Arquitetura Modular

## 🎯 Framework Criado Automaticamente

### Estrutura:
```
src/
├── core/                    # 🧠 Framework reutilizável
│   ├── bot/BaseBot.js      # Base para todos os bots
│   ├── BotFactory.js       # Factory para criar bots
│   ├── memory/             # Sistema de memória
│   └── llm/                # Serviços LLM
├── skills/                  # 🎯 Skills modulares
│   ├── BaseSkill.js        # Framework de skills
│   └── financial/          # Skills financeiras
│       ├── FluxoCaixaSkill.js
│       └── ConciliacaoSkill.js
└── bots/                   # 🤖 Bots específicos
    └── mesh/               # MESH Bot
        ├── MeshBot.js      # Implementação
        └── index.js        # Entry point
```

### Como funciona:
1. **BaseBot** = Framework para qualquer bot
2. **BaseSkill** = Framework para qualquer skill
3. **MeshBot** = Bot específico com skills financeiras
4. **BotFactory** = Criar novos bots facilmente

### Testar:
```bash
# Testar sintaxe
node -c src/bots/mesh/MeshBot.js

# Executar (após integração)
npm start
```

### Criar novo bot:
```javascript
// Novo bot em 20 linhas
class NovoBot extends BaseBot {
  constructor(config) {
    super(config);
    this.registerSkill(new MinhaSkill());
  }
}
```

🎉 Framework modular completo!

a ideia é criar uma base de codigo para multiplus bots que iremos criar ao longo do tempo. vamos focar no mesh no primeiro momento, mas aparecereão outros. 
