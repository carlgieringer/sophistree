FROM sophistree/web-app-base AS builder

FROM node:18-alpine

WORKDIR /sophistree
COPY --from=builder /sophistree/package.json ./package.json
COPY --from=builder /sophistree/node_modules ./node_modules

WORKDIR /sophistree/packages/web-app/
COPY --from=builder /sophistree/packages/web-app/node_modules ./node_modules
COPY --from=builder /sophistree/packages/web-app/package.json ./package.json
COPY --from=builder /sophistree/packages/web-app/prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy"]
