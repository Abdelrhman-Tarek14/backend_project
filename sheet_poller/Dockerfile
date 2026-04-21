# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for building
COPY package*.json ./
RUN npm install

# Build the application
COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:22-alpine AS production

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Create data directory and set permissions for the 'node' user early
RUN mkdir -p /app/data && chown -R node:node /app/data

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder --chown=node:node /app/dist ./dist

# Switch to non-root user for security
USER node

# Main entry point (matches package.json)
CMD ["node", "dist/main.js"]
