FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests for both frontend and backend to leverage caching
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY backend-node/package.json backend-node/package-lock.json ./backend-node/

# Copy source
COPY frontend ./frontend
COPY backend-node ./backend-node

# Build frontend
RUN cd frontend && npm ci && npm run build

# Build backend
RUN cd backend-node && npm ci && npm run build

FROM node:20-alpine
WORKDIR /app

# Copy built backend and its production node_modules
COPY --from=builder /app/backend-node/dist ./dist
COPY --from=builder /app/backend-node/node_modules ./node_modules

# Copy built frontend assets to be served by the backend
COPY --from=builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "dist/index.js"]
