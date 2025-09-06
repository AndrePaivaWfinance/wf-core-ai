// MESH PLATFORM - RESTIFY CORRIGIDO
const restify = require('restify');
const { BotFrameworkAdapter, ActivityHandler, MessageFactory } = require('botbuilder');

// Configuração
function getConfig() {
  try {
    require('dotenv').config();
  } catch (error) {
    console.log('No .env file, using environment variables');
  }
  return {
    port: Number(process.env.PORT || 3978),
    appId: process.env.MICROSOFT_APP_ID || '',
    appPassword: process.env.MICROSOFT_APP_PASSWORD || ''
  };
}

// MESH Bot Natural
class MeshBot extends ActivityHandler {
  constructor() {
    super();
    
    this.onMessage(async (context, next) => {
      const text = (context.activity.text || '').trim();
      const response = this.respond(text);
      await context.sendActivity(MessageFactory.text(response));
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          const welcome = `Oi ${member.name || 'colega'}! Sou o MESH, analista financeiro da Wfinance.`;
          await context.sendActivity(MessageFactory.text(welcome));
        }
      }
      await next();
    });
  }

  respond(text) {
    if (!text) return "Oi! Sou o MESH, analista de BPO Financeiro da Wfinance. Em que posso ajudar?";
    
    const lower = text.toLowerCase();
    
    if (lower.includes('fluxo') && lower.includes('caixa')) {
      return "Para fluxo de caixa, posso analisar qualquer período. Qual você precisa?";
    }
    
    if (lower.includes('conciliação') || lower.includes('conciliacao')) {
      return "Conciliação bancária é algo que faço bastante. Qual banco?";
    }
    
    if (lower.includes('relatório') || lower.includes('relatorio')) {
      return "Que tipo de relatório você está pensando? DRE, balanço?";
    }
    
    return "Como analista da Wfinance, posso ajudar com análises financeiras, conciliações e relatórios. O que você precisa?";
  }
}

// Start
async function start() {
  try {
    const config = getConfig();
    console.log('🚀 Starting MESH Platform');
    
    const server = restify.createServer({ name: 'mesh-platform' });
    server.use(restify.plugins.bodyParser());
    
    const adapter = new BotFrameworkAdapter({
      appId: config.appId,
      appPassword: config.appPassword
    });
    
    const meshBot = new MeshBot();
    
    // CORRIGIDO: Adicionado 'next' callback
    server.get('/healthz', (req, res, next) => {
      res.send(200, { status: 'OK', service: 'MESH', timestamp: new Date().toISOString() });
      return next();
    });
    
    // CORRIGIDO: Usar processamento assíncrono correto
    server.post('/api/messages', (req, res, next) => {
      adapter.process(req, res, async (context) => {
        await meshBot.run(context);
      });
    });
    
    adapter.onTurnError = async (context, error) => {
      console.error('Bot error:', error);
      await context.sendActivity('Tive um problema técnico. Pode tentar novamente?');
    };
    
    server.listen(config.port, () => {
      console.log(`✅ MESH running on port ${config.port}`);
      console.log(`🔗 Health: http://localhost:${config.port}/healthz`);
      console.log(`🤖 Bot: http://localhost:${config.port}/api/messages`);
      console.log('');
      console.log('💬 MESH está pronto para conversas naturais!');
    });
    
  } catch (error) {
    console.error('❌ Start failed:', error);
    process.exit(1);
  }
}

start();