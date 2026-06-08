#!/usr/bin/env bash
# Generates the pre-fetched npm source list required for the Flatpak sandbox
# build. Only the root package.json dependencies are processed — the Ketcher
# SPA is included as a pre-built archive rather than built in the sandbox
# (the Ketcher lockfile uses npm workspaces in a format flatpak-node-generator
# cannot fully resolve). Must be re-run when package-lock.json changes.
#
# Prerequisites:
#   pip install flatpak-node-generator   (or pipx install flatpak-node-generator)
#
# Usage:
#   bash scripts/generate-flatpak-sources.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
OUT="$ROOT/flatpak"

if ! command -v flatpak-node-generator &>/dev/null; then
  echo "ERROR: flatpak-node-generator not found."
  echo "       Install with: pip install flatpak-node-generator"
  exit 1
fi

echo "→ Generating sources for root package (418 packages)..."
flatpak-node-generator npm "$ROOT/package-lock.json" \
  --output "$OUT/generated-sources.json"

echo ""
echo "✓ Sources written to flatpak/generated-sources.json"
echo ""
echo "For the Flathub submission you also need ketcher-dist.tar.gz:"
echo "  tar -czf ketcher-dist.tar.gz -C ketcher/example dist"
echo "  sha256sum ketcher-dist.tar.gz"
echo "Upload the tarball as a release asset and fill in the URL + sha256"
echo "in the commented-out sources block in flatpak/com.ketcher.desktop.yml."
