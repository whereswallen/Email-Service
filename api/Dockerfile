## Build stage — compiles TypeScript (api + sdk)
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY api/package.json api/package-lock.json* ./api/
RUN cd api && npm ci

# Copy source
COPY api/tsconfig.json ./api/
COPY api/src/ ./api/src/
COPY sdk/ ./sdk/

# Build
RUN cd api && npx tsc

## Runtime stage
FROM node:20-alpine

WORKDIR /app

COPY api/package.json api/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/api/dist/ ./dist/

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
