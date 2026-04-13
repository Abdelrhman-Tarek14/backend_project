# Build Stage
FROM node:24-alpine AS build

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


# Since we will serve this via Nginx, we just need the build output.
# We can use a small image for the build output or just an alpine image to hold it.
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/dist /app/dist
CMD ["sh", "-c", "echo 'Frontend build complete. Files are in /app/dist'"]
