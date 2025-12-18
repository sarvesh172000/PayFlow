# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Create logs directory
RUN mkdir -p logs

EXPOSE 3001

CMD ["node", "src/server.js"]
