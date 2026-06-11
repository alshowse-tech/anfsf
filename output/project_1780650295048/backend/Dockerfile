# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY . .
RUN npx tsc --noEmit

# ---- Production stage ----
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY tsconfig.json ./
COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S app && \
    adduser -S app -u 1001 -G app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/app.js"]
