FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

# Install all dependencies (including dev dependencies for ts-node)
COPY package*.json ./
RUN npm install

# Copy application
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 4000

# Start application with dev server (includes startup logs)
CMD ["npm", "run", "dev"]
