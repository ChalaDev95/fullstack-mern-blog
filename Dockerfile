# Multi-stage build for production

# Stage 1: Build React app
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
COPY client/ ./
RUN npm ci && npm run build

# Stage 2: Backend
FROM node:18-alpine
WORKDIR /app

# Copy server files
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client-builder /app/client/build ./public

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "index.js"]


