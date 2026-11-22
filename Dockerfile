# Multi-stage Dockerfile for DeepTier
# Stage 1: Build client and bundle server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install all dependencies required for building
RUN npm install

# Copy source code and config files
COPY . .

# Build Vite client assets (dist/) and bundle server (server.js)
RUN npm run build

# Stage 2: Minimal production runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for container health check
RUN apk add --no-cache curl

# Copy package manifest and install production dependencies only
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled frontend and bundled server from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

# Run as non-root user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
