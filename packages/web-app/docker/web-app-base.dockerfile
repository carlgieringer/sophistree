FROM node:18-alpine

RUN npm install -g npm

WORKDIR /sophistree
COPY . .
RUN npm install

WORKDIR /sophistree/packages/web-app
RUN npx prisma generate
RUN npm run build
