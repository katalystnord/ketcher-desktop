#!/usr/bin/env bash
# Generates the pre-fetched npm source lists required for the Flatpak sandbox
# build. Must be re-run whenever package-lock.json or ketcher/package-lock.json
# changes. Output files are gitignored — do not commit them.
#
# Prerequisites:
#   pip install flatpak-node-generator
#   (or: python3 -m pip install flatpak-node-generator)
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

echo "→ Generating sources for root package..."
flatpak-node-generator npm "$ROOT/package-lock.json" \
  --output "$OUT/generated-sources.json"

echo "→ Generating sources for ketcher submodule..."
flatpak-node-generator npm "$ROOT/ketcher/package-lock.json" \
  --output "$OUT/generated-sources-ketcher.json"

echo ""
echo "✓ Sources written to flatpak/generated-sources.json"
echo "  and flatpak/generated-sources-ketcher.json"
echo ""
echo "These files are gitignored. Include them in the Flathub submission"
echo "directory (com.ketcher.desktop/) alongside the manifest."
