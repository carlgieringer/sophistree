ARG BASE_VERSION=latest
FROM sophistree/web-app-base:${BASE_VERSION} AS builder

# Production stage
FROM node:18-alpine
WORKDIR /sophistree
COPY --from=builder /sophistree/package.json ./package.json
COPY --from=builder /sophistree/node_modules ./node_modules

WORKDIR /sophistree/packages/web-app/
COPY --from=builder /sophistree/packages/web-app/next.config.js ./
COPY --from=builder /sophistree/packages/web-app/public ./public
COPY --from=builder /sophistree/packages/web-app/.next ./.next
COPY --from=builder /sophistree/packages/web-app/node_modules ./node_modules
COPY --from=builder /sophistree/packages/web-app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
