# ── Stage 1: Build ──
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production Dependencies ──
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm install --omit=dev && npm cache clean --force
RUN npx prisma generate

# ── Stage 3: Runner (Production Image) ──
FROM node:22-alpine AS runner

# Create app and logs directory with non-root ownership
RUN mkdir -p /app/logs && chown -R node:node /app
WORKDIR /app

# Copy only the necessary production files
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

# Security: Switch to non-root user
USER node

ENV NODE_ENV=production
EXPOSE 3000

# Metadata
LABEL maintainer="Abdelrhman Tarek"
LABEL project="ETA Tool"

# SIGTERM handling
CMD ["node", "dist/main"]
