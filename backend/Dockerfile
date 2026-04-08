# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Remove devDependencies to keep only production ones for the runner
RUN npm prune --production

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Copy production files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Use non-root user for security
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 3000

# Start directly with node for better signal handling (SIGTERM)
CMD ["node", "dist/main"]
