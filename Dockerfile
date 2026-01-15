ARG server-port=4500
# Stage 1: Build Stage
FROM node:21-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy the rest of the files
COPY tsconfig.json ./
COPY src ./src
COPY index.html ./
COPY .env ./

# Build the TypeScript files
RUN npm install --only=dev && npm run build

# Stage 2: Production Image
FROM node:21-alpine

# Set working directory
WORKDIR /app

ENV PORT=4500

# Copy built files and production dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.html ./
COPY --from=builder /app/.env ./
RUN npm ci --only=production

# Add a health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:4500/health || exit 1

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the application port
EXPOSE 3100

# Start the server
CMD ["node", "dist/index.js"]