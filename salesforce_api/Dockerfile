# Build Stage
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /app/dist ./dist
# Create data folder and set permissions for the node user
RUN mkdir -p data && chown -R node:node /app

USER node

CMD ["node", "dist/index.js"]
