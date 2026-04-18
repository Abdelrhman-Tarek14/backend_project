# ── Stage 1: Build ──
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production Dependencies ──
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 3: Runner ──
FROM node:22-alpine AS runner

# Create data directory with correct permissions for the node user
RUN mkdir -p /app/data && chown -R node:node /app
WORKDIR /app

# Copy production files
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

ENV NODE_ENV=production

# SIGTERM handling
CMD ["node", "dist/index.js"]
