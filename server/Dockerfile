FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Expose your dev port (change if needed)
EXPOSE 3000

# Run dev script
CMD ["npm", "run", "dev"]