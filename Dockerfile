# Dockerfile para MeshBot - Versão Simplificada
FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json .
COPY package-lock.json* ./

# Instalar dependências de produção apenas
RUN npm ci --only=production

# Copiar código da aplicação
COPY src/ ./src/

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S meshbot -u 1001 && \
    chown -R meshbot:nodejs /app

USER meshbot

# Expor porta
EXPOSE 3978

# Comando de inicialização
CMD ["node", "src/index.js"]