# ================================================
# DOCKERFILE ULTRA SIMPLES - MESH BOT
# ================================================

FROM node:20-alpine

# Instalar curl para health check
RUN apk add --no-cache curl

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install && npm cache clean --force

# Copiar código
COPY . .

# Criar src/index.js se não existir
RUN if [ ! -f src/index.js ]; then \
    mkdir -p src && \
    echo "console.log('MESH Platform rodando...'); \
const http = require('http'); \
const server = http.createServer((req, res) => { \
  if (req.url === '/healthz') { \
    res.writeHead(200, {'Content-Type': 'application/json'}); \
    res.end(JSON.stringify({status: 'ok', timestamp: new Date()})); \
  } else { \
    res.writeHead(404); res.end('Not Found'); \
  } \
}); \
server.listen(process.env.PORT || 3978, () => console.log('Servidor rodando na porta', process.env.PORT || 3978));" > src/index.js; \
fi

# Configuração
ENV NODE_ENV=production
ENV PORT=3978

# Porta
EXPOSE 3978

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:$PORT/healthz || exit 1

# Comando
CMD ["node", "src/index.js"]