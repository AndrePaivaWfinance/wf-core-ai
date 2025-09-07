#!/usr/bin/env node

const restify = require('restify');

const config = {
  port: process.env.PORT || 3978
};

console.log('MESH Platform iniciando...');
console.log(`Porta: ${config.port}`);

// Criar servidor
const server = restify.createServer({
  name: 'MESH Platform',
  version: '1.0.0'
});

server.use(restify.plugins.bodyParser());

// Health check
server.get('/healthz', (req, res, next) => {
  res.json({
    status: 'OK',
    service: 'MESH Platform',
    timestamp: new Date().toISOString()
  });
  return next();
});

// Bot endpoint básico
server.post('/api/messages', (req, res, next) => {
  console.log('Mensagem recebida');
  res.json({
    type: 'message',
    text: 'MESH funcionando'
  });
  return next();
});

// Iniciar servidor
server.listen(config.port, () => {
  console.log(`MESH rodando na porta ${config.port}`);
  console.log(`Health: http://localhost:${config.port}/healthz`);
  console.log('MESH pronto');
});

process.on('SIGTERM', () => {
  console.log('Encerrando...');
  server.close(() => process.exit(0));
});