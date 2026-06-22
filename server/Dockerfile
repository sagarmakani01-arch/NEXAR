FROM node:20-alpine

WORKDIR /app

# Install system dependencies (git needed for project init)
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY src/ ./src/

# Create data directories
RUN mkdir -p /data/projects

# Cloud Run sets PORT env var (default 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/api/health || exit 1

CMD ["node", "src/index.js"]
