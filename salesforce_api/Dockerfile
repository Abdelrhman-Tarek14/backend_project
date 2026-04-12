# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=build /app/dist ./dist
# We still need the data folder if state is stored there
RUN mkdir -p data

CMD ["node", "dist/index.js"]
