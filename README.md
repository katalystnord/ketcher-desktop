# Ketcher Desktop

A native desktop application wrapping [Ketcher](https://github.com/epam/ketcher) — the open-source chemical structure editor by EPAM Systems — in an [Electron](https://www.electronjs.org/) shell.

Ketcher Desktop runs entirely offline. It uses Ketcher's standalone (WASM-based) build, so no backend server is required.

---

## Features

Everything Ketcher offers, as a native desktop app:

- Fast 2D structure drawing that satisfies common chemical drawing standards
- 3D structure visualization (Miew)
- Template library including custom and user templates
- Atom and bond properties, query features, aliases, and Generic groups
- Stereochemistry support during editing, loading, and saving
- Undo/redo history
- Load and save in MDL Molfile, RXN, InChI, ChemAxon Extended SMILES, and CML formats
- Zoom, hotkeys, cut/copy/paste
- OCR — recognize structures from image files
- Copy/paste between chemical editors
- Macromolecules editing mode (switch via the top toolbar)
- Runs fully offline — no Indigo backend needed

---

## Requirements

- **Node.js 24+** — Ketcher's build toolchain requires it. Install via [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  nvm install 24
  ```
- **npm** (bundled with Node)
- **Git** (with submodule support)

---

## Getting started

```bash
# Clone with the Ketcher submodule
git clone --recurse-submodules https://github.com/your-org/ketcher-desktop.git
cd ketcher-desktop

# Install Electron dependencies
npm install

# Build Ketcher and launch in dev mode
npm start
```

`npm start` builds the Ketcher SPA on first run if the `ketcher/example/dist/` output is missing, then opens the app via Electron directly from source.

---

## Building a packaged app

```bash
npm run build
```

This runs two steps in sequence:

1. **`scripts/build-ketcher.sh`** — switches to Node 24 via nvm, installs Ketcher's dependencies, builds all packages (`ketcher-core`, `ketcher-react`, `ketcher-standalone`, `ketcher-macromolecules`), and compiles the standalone example app to `ketcher/example/dist/`.
2. **`electron-builder`** — packages the Electron shell and the Ketcher dist into platform targets.

Output lands in `dist-electron/`:

| File | Platform |
|---|---|
| `Ketcher Desktop-x.y.z.AppImage` | Linux (portable) |
| `ketcher-desktop_x.y.z_amd64.deb` | Linux (Debian/Ubuntu) |
| `Ketcher Desktop Setup x.y.z.exe` | Windows (NSIS installer) |
| `Ketcher Desktop-x.y.z.dmg` | macOS |

---

## Updating Ketcher

Ketcher is tracked as a git submodule. To pull the latest upstream commits:

```bash
npm run update-ketcher
```

This script (`scripts/update-ketcher.sh`) fetches and merges the latest changes from the Ketcher `master` branch and stages the submodule bump. Review the diff, then commit and rebuild.

---

## Architecture

```
ketcher-desktop/
├── electron/
│   ├── main.js        # Main process: app:// protocol, BrowserWindow
│   └── preload.js     # Exposes window.ketcherDesktop.platform
├── scripts/
│   ├── build-ketcher.sh   # Builds the Ketcher SPA (handles Node 24 switch)
│   ├── update-ketcher.sh  # Pulls upstream Ketcher commits
│   └── drive.mjs          # Playwright REPL driver for automated UI testing
├── build/
│   └── icon.png       # App icon (512×512, transparent background)
├── ketcher/           # Git submodule → github.com/epam/ketcher
└── package.json       # electron-builder config
```

**Custom `app://` protocol** — Ketcher's SPA is served via a registered `app://localhost/` scheme rather than `file://`. This ensures absolute asset paths (produced by the React build) resolve correctly and that the renderer context is treated as secure (required for WASM execution).

**Standalone mode** — The app loads `ketcher/example/dist/standalone/index.html`, which bundles the full Indigo WASM engine. No remote server is needed.

**Packaged resource layout** — In a packaged build, `ketcher/example/dist/` is placed into `resources/ketcher-dist/` outside the asar archive so that WASM files (which cannot be loaded from inside an asar) are accessible directly.

---

## Development

Run in dev mode (no packaging, live from source):

```bash
npm start
```

To drive the UI programmatically (useful for automated checks):

```bash
node scripts/drive.mjs
# driver> launch
# driver> ss screenshot-name
# driver> quit
```

Screenshots are saved to `/tmp/shots/` by default (`SCREENSHOT_DIR` overrides this).

---

## License

Apache License 2.0 — the same license as the upstream [Ketcher](https://github.com/epam/ketcher) project.

Copyright 2021 EPAM Systems

See [LICENSE](./LICENSE) for the full text.
