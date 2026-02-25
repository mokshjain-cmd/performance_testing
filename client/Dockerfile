FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (dev deps included)
RUN npm install

# Copy source files
COPY . .

# Expose your dev port (change if needed)
EXPOSE 3000

# Run dev script
CMD ["npm", "run", "dev"]