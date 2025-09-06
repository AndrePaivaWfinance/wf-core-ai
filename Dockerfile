FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S mesh -u 1001

USER mesh

EXPOSE 3978

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3978/healthz || exit 1

CMD ["npm", "start"]