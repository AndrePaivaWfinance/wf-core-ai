# 🤖 MESH Platform - Multibot Framework

**Arquitetura modular integrada com funcionalidade completa do mesh-refining**

## 🎯 Visão Geral

O MESH Platform combina:
- ✅ **Base funcional** do `mesh-refining` (LLM service robusto, servidor Restify, personalidade)
- ✅ **Arquitetura modular** do `wf-core-ia` (BaseBot, Skills, BotFactory)
- 🚀 **Escalabilidade** para múltiplos bots futuros

## 📁 Estrutura Integrada

```
src/
├── index.js                     # 🚀 Entry point integrado
├── config/                      # ⚙️ Configuração (mesh-refining)
├── server/                      # 🌐 Restify + Adapter (mesh-refining)  
├── services/                    # 🔧 LLM Service robusto (mesh-refining)
├── monitoring/                  # 📊 App Insights (mesh-refining)
├── utils/                       # 🛠️ Logger + utilidades (mesh-refining)
├── routes/                      # 📡 Bot Framework routes (mesh-refining)
├── bot/personality/             # 🧠 MESH Personality (mesh-refining)
├── core/                        # 🏗️ Framework modular (wf-core-ia)
│   ├── bot/BaseBot.js          # Base para todos os bots
│   ├── BotFactory.js           # Factory para criar bots
│   ├── memory/                 # Sistema de memória
│   └── llm/                    # Interface LLM
├── skills/                      # 🎯 Skills modulares (wf-core-ia)
│   ├── BaseSkill.js            # Framework de skills
│   └── financial/              # Skills financeiras MESH
│       ├── FluxoCaixaSkill.js
│       └── ConciliacaoSkill.js
└── bots/                       # 🤖 Bots específicos (wf-core-ia)
    └── mesh/                   # MESH Bot
        ├── MeshBot.js          # Bot integrado
        └── index.js            # Factory integrado
```

## 🔧 Como Funciona

### **1. Inicialização Integrada**
```javascript
// src/index.js - Entry point principal
MeshPlatform → Server Restify → Bot Framework → MESH Bot Modular
```

### **2. MESH Bot Modular**
```javascript
// Herda BaseBot + funcionalidade mesh-refining
class MeshBot extends BaseBot {
  // Skills registradas automaticamente
  // LLM service com circuit breaker
  // Personalidade MESH integrada
  // Memory manager preparado
}
```

### **3. Fluxo de Processamento**
```
Mensagem → Skills (prioridade) → LLM (fallback) → Resposta formatada
```

## 🚀 Executar

### **Desenvolvimento**
```bash
npm install
npm run dev
```

### **Produção**
```bash
npm run production
```

### **Validação**
```bash
npm run validate-syntax
npm run health-check
```

## 🎯 MESH - Analista BPO Financeiro

### **Funcionalidades Atuais:**
✅ **LLM Service robusto** - Azure OpenAI + OpenAI com circuit breaker  
✅ **Skills financeiras** - Fluxo de caixa, Conciliação  
✅ **Personalidade MESH** - Analista sênior Wfinance  
✅ **Bot Framework** - Teams + WebChat  
✅ **Monitoramento** - Application Insights  

### **Funcionalidades Planejadas:**
🔄 **Consultas Cosmos DB** - Dados financeiros  
🔄 **Integração ERP** - APIs Wfinance + clientes  
🔄 **Relatórios HTML** - Templates automáticos  
🔄 **Email automation** - Envio relatórios  
🔄 **Gestão documentos** - Contabilidade  

## 🧪 Testar MESH

### **1. Health Check**
```bash
curl http://localhost:3978/healthz
```

### **2. Testar Skills**
- **Fluxo de caixa**: "Preciso do relatório de fluxo de caixa"
- **Conciliação**: "Como está a conciliação bancária?"

### **3. Testar LLM**
- **Análise**: "Analise nossa situação financeira"
- **Processos**: "Como otimizar nossos processos BPO?"

## 🏗️ Criar Novos Bots

### **1. Definir Bot**
```javascript
// src/bots/novobot/NovoBotBot.js
class NovoBot extends BaseBot {
  constructor(config) {
    super(config);
    this.registerSkill(new MinhaSkill());
  }
}
```

### **2. Registrar no Factory**
```javascript
// src/core/BotFactory.js
static createBot(type, config) {
  if (type === "mesh") return createMeshBot(config);
  if (type === "novobot") return createNovoBot(config);
}
```

### **3. Usar**
```javascript
const novoBot = await BotFactory.createBot("novobot", config);
```

## 📊 Monitoramento

### **Logs**
```bash
# Development
npm run debug

# Production logs
# Azure App Service → Monitoring → Log stream
```

### **Application Insights**
- Request timing
- Memory usage  
- Error tracking
- Custom events

## 🔧 Configuração

### **Variáveis de Ambiente**
```bash
# Bot Framework
MICROSOFT_APP_ID=your-app-id
MICROSOFT_APP_PASSWORD=your-app-password

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Monitoring
APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

### **Desenvolvimento Local**
1. Copie `.env.example` para `.env`
2. Configure suas credenciais
3. Execute `npm run dev`
4. Use ngrok para Teams testing

## 🚢 Deploy

### **Docker**
```bash
docker build -t mesh-platform .
docker run -p 3978:3978 --env-file .env mesh-platform
```

### **Azure Web App**
```bash
# Via GitHub Actions (automatizado)
# ou Azure CLI
az webapp up --name mesh-platform --resource-group rg-mesh
```

## 🤝 Contribuir

1. **Fork** o repositório
2. **Crie** feature branch (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -am 'Add nova funcionalidade'`)
4. **Push** para branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** Pull Request

## 📝 Notas de Versão

### **v2.1.0 - Integração Completa**
- ✅ Arquitetura modular funcional
- ✅ MESH Bot com skills + LLM
- ✅ Base para múltiplos bots
- ✅ Personalidade MESH integrada
- ✅ Monitoramento completo

### **Próximas Versões**
- **v2.2.0**: Cosmos DB integration
- **v2.3.0**: ERP APIs integration  
- **v2.4.0**: HTML report generation
- **v3.0.0**: Multi-tenant support

---

**MESH Platform** - Desenvolvido pela equipe Wfinance  
*Analista BPO Financeiro IA + Framework Multibot*