# Use Node.js 20
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy shared directory first
COPY shared ./shared

# Copy rest-api package files
COPY rest-api/package*.json ./rest-api/

# Install ALL dependencies (including devDependencies for build)
WORKDIR /app/rest-api
RUN npm ci --no-cache

# Copy rest-api source code
COPY rest-api ./

# Build TypeScript
RUN npm run build

# Verify dist directory exists
RUN ls -la dist && echo "Build successful!"

# Production stage
FROM node:20-alpine

WORKDIR /app/rest-api

# Copy package files
COPY rest-api/package*.json ./

# Install only production dependencies
RUN npm ci --only=production --no-cache

# Copy built files from builder
COPY --from=builder /app/rest-api/dist ./dist

# Copy shared directory (for runtime if needed)
COPY --from=builder /app/shared ../shared

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]

