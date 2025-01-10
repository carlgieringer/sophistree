ARG BASE_VERSION=latest
FROM sophistree/base:${BASE_VERSION} AS builder

# Production stage

# Prefer node:18-alpine, but: https://github.com/prisma/prisma/issues/25817#issuecomment-2529926082
FROM node:18-alpine3.20

WORKDIR /sophistree
COPY --from=builder /sophistree/package.json ./package.json
COPY --from=builder /sophistree/node_modules ./node_modules

WORKDIR /sophistree/packages/sync-service/
COPY --from=builder /sophistree/packages/sync-service/node_modules ./node_modules
COPY --from=builder /sophistree/packages/sync-service/package.json ./package.json
COPY --from=builder /sophistree/packages/sync-service/bin ./bin

EXPOSE 3000
CMD ["npm", "run", "create-table"]
