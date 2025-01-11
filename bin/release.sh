#!/bin/bash
set -euo pipefail

# Creates a Github release and deploys a version of the web app to the prod environment.

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

versions="WEB_APP_VERSION=${WEB_APP_VERSION}, SYNC_SERVICE_VERSION=${SYNC_SERVICE_VERSION}"

log "Starting release process. ${versions}"

# Create GitHub release
log "Creating GitHub release..."
if ! command -v gh &> /dev/null; then
    error "GitHub CLI (gh) is not installed. Please install it first."
fi

if ! gh auth status &> /dev/null; then
    error "Please login to GitHub CLI first using 'gh auth login'"
fi

# Get the last web-app release tag
LAST_TAG=$(git tag --sort=-v:refname | grep "^web-app-v" | head -n1)
if [[ -z "$LAST_TAG" ]]; then
    log "No previous web-app release tag found, using first commit"
    LAST_COMMIT=$(git rev-list --max-parents=0 HEAD)
else
    LAST_COMMIT=$LAST_TAG
fi

# Create release notes from git log
RELEASE_NOTES=$(git log --pretty=format:"- %s" ${LAST_COMMIT}..HEAD)
if [[ -z "$RELEASE_NOTES" ]]; then
    RELEASE_NOTES="No changes documented"
fi

NEW_TAG="web-app-v${WEB_APP_VERSION}"
gh release create "${NEW_TAG}" \
    --title "Web App Release v${WEB_APP_VERSION}" \
    --notes "${RELEASE_NOTES}" || error "Failed to create GitHub release"

# Deploy to production
log "Deploying to production..."
./bin/deploy.sh "prod" || error "Failed to deploy to production"

# Get the repository URL from git config
REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')
RELEASE_URL="${REPO_URL}/releases/tag/${NEW_TAG}"

success "Release completed successfully!"
success "- GitHub release created: ${RELEASE_URL}"
success "- Deployed to production: https://sophistree.app"
