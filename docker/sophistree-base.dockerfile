
# Prefer node:18-alpine, but: https://github.com/prisma/prisma/issues/25817#issuecomment-2529926082
FROM node:18-alpine3.20

RUN npm install -g npm

WORKDIR /sophistree
COPY . .
RUN npm install
