# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Install system dependencies for native module compilation
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-setuptools \
    build-base \
    git \
    && ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@latest && \
    pnpm install --frozen-lockfile --production=false

# Build the application
COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache python3 && \
    ln -sf python3 /usr/bin/python

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S insight -u 1001

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy node_modules from builder stage
COPY --from=builder --chown=insight:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=insight:nodejs /app/dist ./dist
COPY --from=builder --chown=insight:nodejs /app/package.json ./

# Copy source code (needed for CLI execution)
COPY --chown=insight:nodejs src ./src
COPY --chown=insight:nodejs templates ./templates

# Create necessary directories with proper permissions
RUN mkdir -p /app/.insight-cache /app/insight-docs && \
    chown -R insight:nodejs /app/.insight-cache /app/insight-docs

# Switch to non-root user
USER insight

# Expose port for web server
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD pnpm dev serve --port 3000 --host 0.0.0.0 2>/dev/null || exit 1

# Default command
CMD ["pnpm", "dev"]