# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --noEmit

# ---- Run stage ----
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY tsconfig.json ./
COPY src ./src

RUN addgroup -g 1001 -S anfsf && \
    adduser -S anfsf -u 1001 -G anfsf
USER anfsf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["npx", "ts-node", "src/server/index.ts"]
