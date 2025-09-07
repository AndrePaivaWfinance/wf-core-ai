# Dockerfile Simplificado - MESH Platform
FROM node:20-alpine

# Instalar dependências básicas
RUN apk add --no-cache curl

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install --production && npm cache clean --force

# Copiar código
COPY src/ ./src/

# Configurações
ENV NODE_ENV=production
ENV PORT=3978

# Expor porta
EXPOSE 3978

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:$PORT/healthz || exit 1

# Comando de inicialização
CMD ["node", "src/index.js"]