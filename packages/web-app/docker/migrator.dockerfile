FROM sophistree/web-app-base AS builder

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy"]
