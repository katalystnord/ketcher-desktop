#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KETCHER_DIR="$PROJECT_ROOT/ketcher"

TAG="${1:-}"

echo "→ Fetching latest Ketcher from upstream..."
git -C "$KETCHER_DIR" fetch --tags origin

if [ -n "$TAG" ]; then
  echo "→ Checking out tag $TAG..."
  git -C "$KETCHER_DIR" checkout "$TAG"
else
  git -C "$KETCHER_DIR" checkout master 2>/dev/null || git -C "$KETCHER_DIR" checkout main
  git -C "$KETCHER_DIR" pull --ff-only
fi

# Record the new submodule commit in this repo
git -C "$PROJECT_ROOT" add ketcher

# Sync desktop version to match Ketcher
echo ""
echo "→ Syncing version from Ketcher..."
npm --prefix "$PROJECT_ROOT" run sync-version
git -C "$PROJECT_ROOT" add "$PROJECT_ROOT/package.json"

echo ""
echo "✓ Ketcher submodule updated to $(git -C "$KETCHER_DIR" rev-parse --short HEAD)"
echo "  Run 'git commit -m \"chore: update ketcher to vX.Y.Z\"' to record the update."
echo "  Then run 'npm run build:ketcher' to rebuild."
