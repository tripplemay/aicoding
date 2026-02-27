# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install yt-dlp, ffmpeg, and sqlite3 CLI
RUN apk add --no-cache python3 py3-pip ffmpeg sqlite && \
    pip3 install --break-system-packages yt-dlp

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Init DB schema on first run, then start server
CMD ["sh", "-c", "DB_PATH=$(echo $DATABASE_URL | sed 's/file://') && sqlite3 \"$DB_PATH\" 'CREATE TABLE IF NOT EXISTS \"HistoryItem\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"toolId\" TEXT NOT NULL, \"title\" TEXT NOT NULL, \"input\" TEXT NOT NULL, \"output\" TEXT NOT NULL, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);' && exec node server.js"]
