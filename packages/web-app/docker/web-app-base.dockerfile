ARG BASE_VERSION=latest
FROM sophistree/base:${BASE_VERSION}

WORKDIR /sophistree/packages/web-app
RUN npx prisma generate
RUN npm run build
