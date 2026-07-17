#!/usr/bin/env bash

set -euo pipefail

###############################################################################
# Configuration
###############################################################################

REMOTE="origin"
FALLBACK_BRANCH="main"
START_COMMAND="./base-pi/run.sh"

###############################################################################

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "Not inside a git repository"
    exit 1
}

START_DIR="$(dirname "$START_COMMAND")"
START_FILE="$(basename "$START_COMMAND")"

FETCH_OK=false
for i in {1..10}; do
    if git fetch "$REMOTE"; then
        FETCH_OK=true
        break
    fi
    sleep 1
done

if ! $FETCH_OK; then
    echo "Couldn't update; launching existing application."
    cd "$START_DIR"
    exec "./$START_FILE"
fi

CURRENT_BRANCH="$(git branch --show-current)"

if git ls-remote --exit-code --heads "$REMOTE" "$CURRENT_BRANCH" >/dev/null 2>&1; then
    TARGET_BRANCH="$CURRENT_BRANCH"
    echo "Current branch exists on $REMOTE: $TARGET_BRANCH"
else
    TARGET_BRANCH="$FALLBACK_BRANCH"
    echo "Current branch no longer exists on $REMOTE; switching to $TARGET_BRANCH"
    git switch "$TARGET_BRANCH"
fi

echo "Fast-forwarding from $REMOTE/$TARGET_BRANCH"

git merge --ff-only "$REMOTE/$TARGET_BRANCH"

echo "Launching application..."

cd "$START_DIR"
exec "./$START_FILE"
