// MESH Bot Factory - Com integração completa
const { MeshBot } = require('./MeshBot');
const { ServiceIntegrator } = require('../../core/ServiceIntegrator');

async function createMeshBot(config) {
  // Criar bot
  const meshBot = new MeshBot(config);
  
  // Criar e inicializar services
  const serviceIntegrator = new ServiceIntegrator(config);
  await serviceIntegrator.initialize();
  
  // Integrar services com bot
  serviceIntegrator.integrateWithBot(meshBot);
  
  console.log('🎉 MESH Bot criado com todos os services integrados');
  return meshBot;
}

function createMeshBotSync(config) {
  console.log('⚠️ Creating MESH Bot without async services integration');
  return new MeshBot(config);
}

module.exports = { 
  MeshBot, 
  createMeshBot,
  createMeshBotSync
};
