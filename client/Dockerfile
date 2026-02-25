# Step 1: Build the frontend
FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files and install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the app (Vite outputs to 'dist' folder)
RUN npm run build

# Step 2: Serve the build with nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (configured for port 8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files to nginx html folder (Vite builds to 'dist')
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run expects port 8080
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]