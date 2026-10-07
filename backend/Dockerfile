# backend/Dockerfile
# ======================================================
# Node.js backend — production
# ======================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (layer caching)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# ======================================================
# Runtime stage
# ======================================================
FROM node:20-alpine

WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package*.json ./

# Ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/server.js"]