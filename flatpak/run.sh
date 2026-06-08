#!/bin/bash
# Launch wrapper for Flatpak. zypak-wrapper (from Electron2.BaseApp) replaces
# Chrome's setuid sandbox with a Flatpak-compatible alternative.
export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID}"
exec zypak-wrapper /app/ketcher/ketcher-desktop "$@"
