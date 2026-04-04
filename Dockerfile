# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client 
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# ---
# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only production files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Set production environment
ENV NODE_ENV=production

EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
