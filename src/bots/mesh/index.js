// MESH Bot Factory - Versão Simplificada e Funcional
const { MeshBot } = require('./MeshBot');
const { llmService } = require('../../core/services/llm/LLMService');
const logger = require('../../core/utils/logger'); // Logger do core

async function createMeshBot(config) {
  logger.info('🏭 Creating MESH Bot with integrated services...');
  
  try {
    // 1. Criar MESH Bot
    logger.info('📱 Initializing MESH Bot instance...');
    const meshBot = new MeshBot(config);
    
    // 2. Conectar LLM Service (prioritário)
    if (llmService && typeof llmService.processMessage === 'function') {
      meshBot.setLLMService(llmService);
      logger.info('✅ LLM Service connected to MESH Bot');
    } else {
      logger.warn('⚠️ LLM Service not available - MESH will operate with skills only');
    }
    
    // 3. Setup adicional (memory manager placeholder por enquanto)
    if (config.cosmos?.endpoint) {
      // TODO: Implementar quando Cosmos DB estiver configurado
      logger.info('📝 Cosmos DB configuration detected (placeholder)');
    }
    
    // 4. Validação final
    const validation = {
      hasLLM: !!meshBot.llmService,
      hasSkills: meshBot.skills.size > 0,
      skillsList: Array.from(meshBot.skills.keys()),
      personality: !!meshBot.meshPersonality,
      config: {
        hasAzureOpenAI: !!(config?.azure?.endpoint && config?.azure?.apiKey),
        hasOpenAI: !!config?.openai?.apiKey,
        environment: config?.env || 'unknown'
      }
    };
    
    logger.info('🎉 MESH Bot created successfully', validation);
    
    // 5. Log de capacidades ativas
    logger.info('🔧 MESH Bot capabilities:', {
      llmService: validation.hasLLM ? 'Active' : 'Disabled',
      skills: validation.skillsList.join(', '),
      personality: 'MESH BPO Financial Analyst',
      channels: ['Teams', 'WebChat']
    });
    
    return meshBot;
    
  } catch (error) {
    logger.error('❌ Failed to create MESH Bot', {
      error: error.message,
      stack: error.stack
    });
    
    // Fallback: tentar criar bot mínimo
    logger.info('🔄 Attempting fallback MESH Bot creation...');
    try {
      const fallbackBot = new MeshBot(config);
      
      // Tentar conectar LLM se disponível
      if (llmService) {
        fallbackBot.setLLMService(llmService);
        logger.info('✅ Fallback bot created with LLM service');
      } else {
        logger.info('⚠️ Fallback bot created without LLM service');
      }
      
      return fallbackBot;
    } catch (fallbackError) {
      logger.error('❌ Fallback creation also failed', {
        error: fallbackError.message
      });
      throw new Error(`Unable to create MESH Bot: ${error.message}`);
    }
  }
}

function createMeshBotSync(config) {
  logger.info('⚡ Creating MESH Bot synchronously...');
  
  try {
    const meshBot = new MeshBot(config);
    
    // Conectar LLM service se disponível
    if (llmService && typeof llmService.processMessage === 'function') {
      meshBot.setLLMService(llmService);
      logger.info('✅ LLM Service connected (sync mode)');
    } else {
      logger.warn('⚠️ LLM Service not available in sync mode');
    }
    
    logger.info('✅ MESH Bot created synchronously', {
      hasLLM: !!meshBot.llmService,
      skills: Array.from(meshBot.skills.keys())
    });
    
    return meshBot;
    
  } catch (error) {
    logger.error('❌ Sync MESH Bot creation failed', {
      error: error.message
    });
    throw error;
  }
}

// Função de diagnóstico
function diagnoseServices() {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    llmService: {
      available: !!llmService,
      hasProcessMessage: llmService && typeof llmService.processMessage === 'function',
      type: llmService ? 'Integrated' : 'Missing'
    },
    dependencies: {
      logger: !!logger,
      MeshBot: !!MeshBot
    }
  };
  
  logger.info('🔍 MESH Bot services diagnosis', diagnosis);
  return diagnosis;
}

// Função para obter capacidades
function getMeshBotCapabilities() {
  return {
    botType: 'MESH - BPO Financial Analyst',
    framework: 'BaseBot + Modular Architecture',
    services: {
      llm: 'Azure OpenAI + OpenAI with circuit breaker',
      personality: 'MESH BPO Financial Analyst (Wfinance)',
      skills: ['FluxoCaixa', 'Conciliacao'],
      channels: ['Microsoft Teams', 'WebChat'],
      monitoring: 'Application Insights'
    },
    plannedFeatures: [
      'Cosmos DB integration',
      'ERP API integration',
      'HTML report generation',
      'Email automation',
      'Document management for accounting'
    ],
    version: '2.1.0'
  };
}

// Validação de saúde
function validateMeshBotHealth(meshBot) {
  if (!meshBot) {
    return { healthy: false, reason: 'Bot instance is null' };
  }
  
  const health = {
    healthy: true,
    components: {
      baseBot: !!meshBot.skills,
      llmService: !!meshBot.llmService,
      skills: meshBot.skills.size > 0,
      personality: !!meshBot.meshPersonality
    },
    skillsRegistered: Array.from(meshBot.skills.keys()),
    timestamp: new Date().toISOString()
  };
  
  // Verificar se todos os componentes essenciais estão presentes
  const criticalComponents = ['baseBot', 'skills'];
  const missingCritical = criticalComponents.filter(comp => !health.components[comp]);
  
  if (missingCritical.length > 0) {
    health.healthy = false;
    health.reason = `Missing critical components: ${missingCritical.join(', ')}`;
  }
  
  return health;
}

module.exports = { 
  MeshBot, 
  createMeshBot,
  createMeshBotSync,
  getMeshBotCapabilities,
  diagnoseServices,
  validateMeshBotHealth
};