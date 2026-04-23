# ── Stage 1: Build ──
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments for production environment
ARG VITE_API_URL
ARG VITE_SOCKET_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Caching dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve (Nginx) ──
FROM nginx:alpine AS runner

# Copy custom Nginx configuration for routing support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: Adjust permissions for Nginx to run as non-root if needed, 
# although alpine nginx default is usually fine for edge.
# Keeping it simple and standard for Nginx Alpine.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
