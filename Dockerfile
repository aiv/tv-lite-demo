# ── Stage 1: build React frontend ─────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# .env is passed as a BuildKit secret — available to Vite during build but never baked into any layer
RUN --mount=type=secret,id=dotenv,dst=/app/.env npm run build:react

# ── Stage 2: production runtime ───────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Runtime deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js ./
COPY --from=builder /app/dist ./dist

# Runtime env vars (server-side only)
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
