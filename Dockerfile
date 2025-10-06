# Use Node.js 20
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy shared directory first
COPY shared ./shared

# Copy rest-api package files
COPY rest-api/package*.json ./rest-api/

# Install dependencies
WORKDIR /app/rest-api
RUN npm ci --only=production --no-cache

# Copy rest-api source code
COPY rest-api ./

# Build TypeScript
RUN npm run build

# Verify dist directory exists
RUN ls -la dist && echo "Build successful!"

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]

