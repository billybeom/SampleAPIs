# ── Stage 1: dependency install ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Run as non-root (required for OpenShift arbitrary-UID policy)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup package.json ./

EXPOSE 3002
ENV NODE_ENV=production
ENV PORT=3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "src/index.js"]
