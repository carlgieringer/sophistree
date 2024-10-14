FROM mcr.microsoft.com/playwright:v1.48.0-noble

WORKDIR /tapestry-highlights

COPY package.json ./
# `npm ci` might be preferred, but it requires the package-lock.json in the root directory.
RUN npm install
# The image provides the deps.
RUN  npx playwright install

COPY . .

CMD ["npx", "playwright", "test"]
