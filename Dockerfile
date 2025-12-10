# Development Dockerfile for ChummerWeb
# Uses Node.js 22 LTS for modern features and stability

FROM node:22-alpine

# Install git (needed for some npm operations) and bash
RUN apk add --no-cache git bash

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Default command: start dev server with host binding for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
