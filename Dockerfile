# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20.20.2-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Run stage ----
FROM node:20.20.2-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild better-sqlite3 && \
    apk del python3 make g++
COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S anfsf && \
    adduser -S anfsf -u 1001 -G anfsf && \
    mkdir -p /app/.anfsf /app/output && \
    chown -R anfsf:anfsf /app/.anfsf /app/output
USER anfsf

EXPOSE 3000

VOLUME ["/app/.anfsf", "/app/output"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/server/index.js"]
