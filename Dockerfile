# Use Node.js 20 Alpine  
FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy shared directory
COPY shared ./shared

# Copy rest-api files
COPY rest-api ./rest-api

# Install dependencies and build
WORKDIR /app/rest-api
RUN npm ci --no-cache && \
    npm run build && \
    ls -la dist && \
    echo "Build successful - dist exists!" && \
    npm prune --production && \
    echo "Production deps only"

# Verify everything is in place
RUN ls -la && \
    ls -la dist && \
    echo "Final verification OK!"

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Debug: Check what's actually in the container
CMD ["sh", "-c", "echo '=== PWD ===' && pwd && echo '=== /app contents ===' && ls -la /app && echo '=== /app/rest-api contents ===' && ls -la /app/rest-api && echo '=== /app/rest-api/dist contents ===' && ls -la /app/rest-api/dist && echo '=== Starting app ===' && node /app/rest-api/dist/index.js"]
# Trigger clean build
