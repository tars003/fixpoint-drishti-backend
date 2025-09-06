# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source code
COPY . .

# Build the React app
# RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Expose port 5000
EXPOSE 5000

# Start the server
CMD ["npm", "run", "dev"]
