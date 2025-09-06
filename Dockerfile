FROM node:20-alpine

LABEL maintainer="MESH Team"
LABEL version="2.1.0"
LABEL description="MESH - Analista de BPO Financeiro IA"

RUN apk add --no-cache curl dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S meshbot -u 1001

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

COPY src ./src

RUN chown -R meshbot:nodejs /app

ENV NODE_ENV=production
ENV PORT=3978

EXPOSE 3978

USER meshbot

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3978/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
