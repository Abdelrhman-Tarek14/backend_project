# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# We need to ensure the environment variables for Vite are set if needed
# ARG VITE_API_URL
# ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Since we will serve this via Nginx, we just need the build output.
# We can use a small image for the build output or just an alpine image to hold it.
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/dist /app/dist
CMD ["sh", "-c", "echo 'Frontend build complete. Files are in /app/dist'"]
