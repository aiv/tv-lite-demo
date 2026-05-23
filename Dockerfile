# ── Stage 1: build React frontend ─────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# VITE_ vars are public (embedded in JS bundle) — pass as ARGs so cache invalidates when they change
ARG VITE_PRESETS
ARG VITE_RIGHT_PAD_BARS
ARG VITE_PRESET_ROTATION_ENABLED
ARG VITE_PRESET_ROTATION_INTERVAL

# Sensitive server-side keys are still passed via BuildKit secret
RUN --mount=type=secret,id=dotenv,dst=/app/.env.secret \
    set -e; \
    cp /app/.env.secret /app/.env 2>/dev/null || true; \
    npm run build:react

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
