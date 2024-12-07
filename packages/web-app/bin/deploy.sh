#!/bin/bash
set -euo pipefail

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

# Check arguments
if [[ $# -ne 2 ]]; then
    error "Usage: $0 <environment> <version>
    environment: 'dev' or 'prod'
    version: Docker image version to deploy"
fi

ENVIRONMENT=$1
VERSION=$2

# Validate environment
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    error "Environment must be either 'dev' or 'prod'"
fi

# Set deployment target based on environment
if [[ "$ENVIRONMENT" == "dev" ]]; then
    TARGET="dev.sophistree.app"
    URL="https://dev.sophistree.app"
else
    TARGET="sophistree.app"
    URL="https://sophistree.app"
fi

log "Deploying version ${VERSION} to ${ENVIRONMENT} environment..."

# Deploy to target
ssh ${TARGET} "cd /web-app/ && \
    sudo WEB_APP_IMAGE_VERSION=${VERSION} CADDY_IMAGE_VERSION=${VERSION} \
    docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && \
    sudo WEB_APP_IMAGE_VERSION=${VERSION} CADDY_IMAGE_VERSION=${VERSION} \
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up --force-recreate -d" || error "Failed to deploy to ${ENVIRONMENT}"

success "Successfully deployed version ${VERSION} to ${ENVIRONMENT}!"
success "- Available at: ${URL}"
