# Contributing to Ketcher Desktop

Thanks for your interest in contributing. This document covers everything you need to get a working build and open a pull request.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Git | any | with submodule support |
| Node.js | **24+** | see below — Ketcher's build toolchain requires it |
| npm | bundled with Node | |

### Node 24 via nvm

The system Node is likely too old. Install the correct version with [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 24
```

The build script switches to Node 24 automatically via nvm each time it runs, so you do not need to set it as your default.

## Getting started

```bash
# Clone with the Ketcher submodule
git clone --recurse-submodules https://github.com/YOUR_ORG/ketcher-desktop.git
cd ketcher-desktop

# If you forgot --recurse-submodules
git submodule update --init --recursive

# Install Electron dependencies (uses your system Node — any version is fine here)
npm install

# Build Ketcher and launch in dev mode
npm start
```

## Build commands

| Command | What it does |
|---|---|
| `npm start` | Launch the app from source (dev mode, no packaging) |
| `npm run build:ketcher` | Build the Ketcher SPA only |
| `npm run build` | Full build: Ketcher SPA + electron-builder packages |
| `npm run update-ketcher` | Pull latest upstream Ketcher commits and stage the submodule bump |

## Known build gotchas

### 1 — `npm_config_prefix` conflict with nvm

When npm spawns a script, it sets `npm_config_prefix=/usr/local`, which breaks nvm's ability to switch Node versions. The build script unsets it before sourcing nvm. If you see nvm errors during `build:ketcher`, this is why — check that `scripts/build-ketcher.sh` still has `unset npm_config_prefix` at the top of `switch_node()`.

### 2 — `ButtonsConfig` missing from `ketcher-react` dist

`rollup-plugin-typescript2` skips generating `dist/script/index.d.ts` for `ketcher-react` due to upstream TypeScript errors in the package. The example app imports `ButtonsConfig` through that file.

The build script works around this by splitting the build into `build:packages` → patch → `build:example`, writing a shim `dist/script/index.d.ts` that re-exports `ButtonsConfig` before the example TypeScript compilation runs. If you see a `ButtonsConfig` type error, check that the patch step in `scripts/build-ketcher.sh` is still in place.

### 3 — `react-refresh` not installed

`react-refresh` is a peer dependency that `--legacy-peer-deps` silently drops. The build script installs it explicitly after the main `npm install`. If the example build fails with a missing `react-refresh` module, check the install step in `scripts/build-ketcher.sh`.

## Project structure

```
ketcher-desktop/
├── electron/
│   ├── main.js        # Main process: app:// protocol handler, BrowserWindow
│   └── preload.js     # Exposes window.ketcherDesktop.platform
├── scripts/
│   ├── build-ketcher.sh   # Builds the Ketcher SPA (handles Node 24 switch)
│   ├── update-ketcher.sh  # Pulls upstream Ketcher commits
│   └── drive.mjs          # Playwright REPL driver for automated UI testing
├── build/
│   ├── icon.png                        # App icon (512×512, transparent)
│   └── com.ketcher.desktop.metainfo.xml  # AppStream metadata
├── docs/
│   └── screenshot.png     # Main window screenshot (referenced in README and metainfo)
└── ketcher/               # Git submodule → github.com/epam/ketcher
```

## Updating Ketcher

Ketcher is tracked as a git submodule. To pull upstream changes:

```bash
npm run update-ketcher
```

Review the diff, then commit the submodule bump and rebuild. If the upstream changes break the `ButtonsConfig` shim or the `build:example` step, see gotcha #2 above.

## Testing

There is no automated test suite for the Electron wrapper itself. To verify a change manually, use the Playwright driver:

```bash
# Requires a running X display (DISPLAY must be set)
node scripts/drive.mjs
# driver> launch
# driver> ss my-screenshot
# driver> quit
```

Screenshots land in `/tmp/shots/` by default (`SCREENSHOT_DIR` overrides this).

## Submitting a pull request

1. Fork the repo and create a branch from `master`.
2. Make your changes and verify the app still launches with `npm start`.
3. If you changed the packaging config, do a full `npm run build` and check the AppImage runs.
4. Open a pull request — describe what changed and why.

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](./LICENSE).
