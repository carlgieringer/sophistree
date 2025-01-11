#!/bin/bash
set -euo pipefail

# Builds and pushes a version of the Docker containers

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

source bin/load-image-versions.sh

versions="WEB_APP_VERSION=${WEB_APP_VERSION}, SYNC_SERVICE_VERSION=${SYNC_SERVICE_VERSION}, CADDY_VERSION=${CADDY_VERSION}"

log "Starting build and push process. ${versions}"

# Build and push Docker images
cd docker

log "Building base images..."

docker build -t sophistree/base -f ../docker/sophistree-base.dockerfile .. || error "Failed to build sophistree-base image"
docker push sophistree/base || error "Failed to push sophistree-base image"

docker build -t sophistree/web-app-base:${WEB_APP_VERSION} -f ../packages/web-app/docker/web-app-base.dockerfile .. || error "Failed to build web-app-base image"
docker push sophistree/web-app-base:${WEB_APP_VERSION} || error "Failed to push web-app-base image"

log "Building and pushing versioned images..."
docker compose build || error "Failed to build images"
docker compose push || error "Failed to push images"

success "Build and push completed successfully! ${versions}"
success "- Docker images available at: https://hub.docker.com/r/sophistree/"
