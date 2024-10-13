# Microsoft provides an image with Playwright already installed
# (mcr.microsoft.com/playwright:v1.48.0-noble), but 1) its screenshots slightly
# differ from those captured on Github Action's ubuntu-latest, and 2) when I
# tried to run a Github Action on it, it took over thirty minutes to run (before
# I canceled) presumably because it is an uncommon image.
#
# So just use ubuntu and install the deps below.
FROM ubuntu:22.04

WORKDIR /tapestry-highlights

COPY package.json ./
# `npm ci` might be preferred, but it requires the package-lock.json in the root directory.
RUN npm install
# The image provides the deps.
RUN  npx playwright install --with-deps

COPY . .

CMD ["npx", "playwright", "test"]
