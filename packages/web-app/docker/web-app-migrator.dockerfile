ARG BASE_VERSION=latest
FROM sophistree/web-app-base:${BASE_VERSION} AS builder

# Prefer node:18-alpine, but: https://github.com/prisma/prisma/issues/25817#issuecomment-2529926082
FROM node:18-alpine3.20

WORKDIR /sophistree
COPY --from=builder /sophistree/package.json ./package.json
COPY --from=builder /sophistree/node_modules ./node_modules

WORKDIR /sophistree/packages/web-app/
COPY --from=builder /sophistree/packages/web-app/node_modules ./node_modules
COPY --from=builder /sophistree/packages/web-app/package.json ./package.json
COPY --from=builder /sophistree/packages/web-app/prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy"]
