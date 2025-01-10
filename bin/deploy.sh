#!/bin/bash
set -euo pipefail

# Pulls and starts a version of the Docker containers on an environment of the web app.

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
if [[ $# -ne 1 ]]; then
    error "Usage: $0 <environment>
    environment: 'dev' or 'prod'"
fi

ENVIRONMENT=$1

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

source bin/load-image-versions.sh

versions="WEB_APP_VERSION=${WEB_APP_VERSION}, SYNC_SERVICE_VERSION=${SYNC_SERVICE_VERSION}"

log "Deploying to ${ENVIRONMENT} environment. ${versions}"

# Deploy to target
ssh ${TARGET} "cd /web-app/ && \
    sudo\
     WEB_APP_IMAGE_VERSION=${WEB_APP_IMAGE_VERSION}\
     SYNC_SERVER_IMAGE_VERSION=${SYNC_SERVER_IMAGE_VERSION}\
     CADDY_IMAGE_VERSION=${CADDY_IMAGE_VERSION} \
     docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && \
    sudo\
     WEB_APP_IMAGE_VERSION=${WEB_APP_IMAGE_VERSION}\
     SYNC_SERVER_IMAGE_VERSION=${SYNC_SERVER_IMAGE_VERSION}\
     CADDY_IMAGE_VERSION=${CADDY_IMAGE_VERSION}\
     docker compose -f docker-compose.yml -f docker-compose.prod.yml up --force-recreate -d" || error "Failed to deploy to ${ENVIRONMENT}"

success "Successfully deployed to ${ENVIRONMENT}! ${versions}"
success "- Available at: ${URL}"
