FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package manifests and source
COPY backend-node/package.json backend-node/package-lock.json ./
COPY backend-node/ ./

# Install dependencies and build
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app

# Copy built backend and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.build.js"]
