# Build Stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Build arguments for production environment
ARG VITE_API_URL=""
ARG VITE_SOCKET_URL=""

# Set as environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine
# Copy custom Nginx configuration to support Frontend Routing (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built output to Nginx's HTML folder
COPY --from=build /app/dist /usr/share/nginx/html
# Expose port 80 inside the container
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
