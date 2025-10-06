# Use Node.js 20
FROM node:20-alpine

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

# Start application
CMD ["node", "dist/index.js"]
