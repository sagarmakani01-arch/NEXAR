# Build stage
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

WORKDIR /app

# Copy dependency files and install them
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Expose Vite's port
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host"]