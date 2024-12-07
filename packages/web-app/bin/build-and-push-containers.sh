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

# Check if version argument is provided
if [[ $# -ne 1 ]]; then
    error "Usage: $0 <version>"
fi

VERSION=$1

log "Starting build and push process for version ${VERSION}"

# Build and push Docker images
cd docker

log "Building base image..."
docker build -t sophistree/web-app-base:${VERSION} -f web-app-base.dockerfile ../../.. || error "Failed to build base image"
docker push sophistree/web-app-base:${VERSION} || error "Failed to push base image"

log "Building and pushing versioned images..."
export BASE_IMAGE_VERSION=${VERSION}
export WEB_APP_IMAGE_VERSION=${VERSION}
export CADDY_IMAGE_VERSION=${VERSION}

docker compose build || error "Failed to build images"
docker compose push || error "Failed to push images"

# Return to web-app directory
cd ..

success "Build and push completed successfully for version ${VERSION}!"
success "- Docker images available at: https://hub.docker.com/r/sophistree/"
