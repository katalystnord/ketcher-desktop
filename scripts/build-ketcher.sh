#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KETCHER_DIR="$PROJECT_ROOT/ketcher"

# ---------------------------------------------------------------------------
# Node version check — Ketcher requires Node >=24.
# If nvm is available, switch automatically; otherwise abort with a hint.
# ---------------------------------------------------------------------------
REQUIRED_MAJOR=24

switch_node() {
  local nvmrc="$PROJECT_ROOT/.nvmrc"
  if command -v nvm &>/dev/null || [ -s "$HOME/.nvm/nvm.sh" ]; then
    # npm sets npm_config_prefix which conflicts with nvm
    unset npm_config_prefix
    # shellcheck source=/dev/null
    [ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"
    echo "→ Switching to Node $REQUIRED_MAJOR via nvm..."
    nvm install "$REQUIRED_MAJOR" --no-progress 2>/dev/null || true
    nvm use "$REQUIRED_MAJOR"
  else
    echo "ERROR: Node $REQUIRED_MAJOR+ is required to build Ketcher."
    echo "       Current version: $(node --version)"
    echo "       Install nvm (https://github.com/nvm-sh/nvm) or switch manually."
    exit 1
  fi
}

CURRENT_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$CURRENT_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  switch_node
fi

echo "→ Node $(node --version) — OK"

# ---------------------------------------------------------------------------
# Ensure the submodule is initialised
# ---------------------------------------------------------------------------
if [ ! -f "$KETCHER_DIR/package.json" ]; then
  echo "→ Initialising Ketcher submodule..."
  git -C "$PROJECT_ROOT" submodule update --init --recursive
fi

# ---------------------------------------------------------------------------
# Install Ketcher dependencies and build
# ---------------------------------------------------------------------------
echo "→ Installing Ketcher dependencies..."
npm --prefix "$KETCHER_DIR" install --legacy-peer-deps
# react-refresh is a peer dep that --legacy-peer-deps omits; needed by the build
npm --prefix "$KETCHER_DIR" install react-refresh --legacy-peer-deps 2>/dev/null || true

echo "→ Building Ketcher packages (this takes a few minutes)..."
npm --prefix "$KETCHER_DIR" run build:packages

# rollup-plugin-typescript2 skips dist/script/index.d.ts due to upstream TS
# errors in the package; patch it so ButtonsConfig is re-exported correctly.
SCRIPT_DTS='export type { Config, ButtonsConfig } from '"'"'./builders/ketcher'"'"';
export * from '"'"'./providers'"'"';
export * from '"'"'./ui/views/toolbars/ArrowScroll'"'"';
export * from '"'"'./ui/views/toolbars/ToolbarGroupItem/ToolbarMultiToolItem/usePortalStyle'"'"';'
echo "$SCRIPT_DTS" > "$KETCHER_DIR/packages/ketcher-react/dist/script/index.d.ts"
echo "$SCRIPT_DTS" > "$KETCHER_DIR/packages/ketcher-react/dist/cjs/script/index.d.ts"

echo "→ Building Ketcher example app..."
npm --prefix "$KETCHER_DIR" run build:example

echo ""
echo "✓ Ketcher built successfully → ketcher/example/dist/"
