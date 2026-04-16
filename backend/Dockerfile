# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Stage 2: Production Dependencies Only
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate

# Stage 3: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runner
FROM node:22-alpine AS runner
# Create app and logs directory and give node user ownership so winston logger can write files
RUN mkdir -p /app/logs && chown -R node:node /app
WORKDIR /app

# Copy production files with correct ownership
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=prod-deps /app/prisma ./prisma

USER node

ENV NODE_ENV=production
EXPOSE 3000

# Start directly with node for better signal handling (SIGTERM)
CMD ["node", "dist/main"]
