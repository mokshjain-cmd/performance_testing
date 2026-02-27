FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy source
COPY . .

# Set production environment
ENV ALSO ENV=production

# Cloud Run provides PORT env variable
EXPOSE 8080

# Start your production server
CMD ["node", "server.js"]