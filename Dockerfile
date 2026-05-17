# ── Stage 1: build React frontend ─────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build args for VITE_ vars
COPY . .

ARG VITE_RIGHT_PAD_BARS=10
ARG VITE_PRESET_ROTATION_ENABLED=false
ARG VITE_PRESET_ROTATION_INTERVAL=180

# Write a .env so vite picks up the ARGs at build time
RUN printf "VITE_RIGHT_PAD_BARS=%s\nVITE_PRESET_ROTATION_ENABLED=%s\nVITE_PRESET_ROTATION_INTERVAL=%s\n" \
    "$VITE_RIGHT_PAD_BARS" "$VITE_PRESET_ROTATION_ENABLED" "$VITE_PRESET_ROTATION_INTERVAL" > .env

RUN npm run build:react

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
