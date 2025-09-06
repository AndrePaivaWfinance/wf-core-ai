# ================================================
# MESH PLATFORM - DOCKERFILE AZURE ACR
# ================================================

# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY package-lock.json* ./

# Instalar dependências
RUN npm ci --include=dev

# Copiar código
COPY . .

# Auditar dependências
RUN npm audit --audit-level=moderate

# Stage 2: Production
FROM node:18-alpine AS production

# Instalar dependências do sistema
RUN apk add --no-cache \
    curl \
    tzdata && \
    ln -sf /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mesh -u 1001

WORKDIR /app

# Copiar node_modules e código
COPY --from=builder --chown=mesh:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mesh:nodejs /app/package*.json ./
COPY --from=builder --chown=mesh:nodejs /app/src ./src

# Criar diretório de logs
RUN mkdir -p logs && \
    chown -R mesh:nodejs logs && \
    chmod -R 755 logs

USER mesh

EXPOSE 3978

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3978/healthz || exit 1

ENV NODE_ENV=production \
    PORT=3978 \
    LOG_LEVEL=info \
    TZ=America/Sao_Paulo

CMD ["node", "src/index.js"]