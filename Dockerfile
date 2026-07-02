# ── Build Stage ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Runtime Stage ──
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/src/lib/generated ./src/lib/generated
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/next.config.mjs ./

USER app
EXPOSE 3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npx", "next", "start"]
