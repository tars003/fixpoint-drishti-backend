# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Copy built application from builder stage
COPY --from=builder --chown=nodeuser:nodejs /usr/src/app .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodeuser:nodejs logs

# Set environment variables (replace with your actual values)
ENV NODE_ENV=development
ENV PORT=3000
ENV API_VERSION=v1
ENV DB_NAME=iot_tracking

# Production credentials hardcoded:
ENV MONGODB_URI="mongodb+srv://ajay123:ajay123@transactions.puvlf.mongodb.net/iot_tracking"
ENV JWT_SECRET="KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30"
ENV API_KEY="askldhsKSADksdhfsd##$#$$^^"

# Optional settings
ENV JWT_EXPIRES_IN=7d
ENV RATE_LIMIT_WINDOW_MS=900000
ENV RATE_LIMIT_MAX_REQUESTS=100
ENV ALERT_RATE_LIMIT_MAX=10
ENV LOG_LEVEL=info
ENV ALLOWED_ORIGINS="*"

# Switch to non-root user
USER nodeuser

# Expose the port the app runs on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/app.js"]