# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install backend deps
COPY backend/package.json /app/backend/package.json
WORKDIR /app/backend
RUN npm install --legacy-peer-deps

# Install frontend deps and build
COPY frontend/package.json /app/frontend/package.json
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/metrics-config.json ./backend/metrics-config.json 2>/dev/null || true
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 8081

CMD ["node", "backend/src/index.js"]
