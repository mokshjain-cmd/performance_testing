# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files and TypeScript config
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy Google Cloud Service Account key if exists
# Make sure to add this to .dockerignore if it contains sensitive data
COPY big-celerity-488305-e1-14f72f49398f.json* ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
