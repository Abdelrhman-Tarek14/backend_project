# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

# Create data directory for persistence
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
