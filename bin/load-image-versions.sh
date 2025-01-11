
export WEB_APP_VERSION=$(npm run get-current-version --workspace packages/web-app | tail -n 1)
export SYNC_SERVICE_VERSION=$(npm run get-current-version --workspace packages/sync-service | tail -n 1)
export CADDY_VERSION=0.1.1

export WEB_APP_BASE_IMAGE_VERSION=${WEB_APP_VERSION}
export WEB_APP_IMAGE_VERSION=${WEB_APP_VERSION}
export SYNC_SERVICE_BASE_IMAGE_VERSION=${SYNC_SERVICE_VERSION}
export SYNC_SERVICE_IMAGE_VERSION=${SYNC_SERVICE_VERSION}
export CADDY_IMAGE_VERSION=${CADDY_VERSION}
