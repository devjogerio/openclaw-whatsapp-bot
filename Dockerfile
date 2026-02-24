# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies for build
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Switch to non-root user
USER node

# Start command
CMD [ "node", "dist/server.js" ]
