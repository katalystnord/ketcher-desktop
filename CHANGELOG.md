# Changelog

All notable changes to Ketcher Desktop will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Ketcher Desktop uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.18.0-rc.2] — 2026-07-06

### Added

- Copy-format dropdown (bottom-right of the canvas): choose whether Ctrl+C copies the molecule as PNG (default), SVG, or a raw Molfile. Only one format is ever written to the clipboard at a time — some apps grab plain text over an image when both are present, so writing several formats at once isn't reliable.
- SVG copies are re-declared in physical `cm` units (geometry untouched) so vector apps like Inkscape and LibreOffice Draw import them at a real, consistent size instead of Ketcher's tiny native ~87×76 unitless canvas.

### Changed

- Default copy-to-clipboard PNG size reduced from 800px/300 DPI (~6.8cm) to 400px/300 DPI (~3.4cm) — a more compact inline size for notes and documents.

## [1.0.0] — 2026-06-06

Initial release.

### Added

- Electron wrapper around the [Ketcher](https://github.com/epam/ketcher) chemical structure editor (v3.17.0-rc.1)
- Standalone (offline) mode — full Indigo WASM engine bundled, no backend server required
- Custom `app://` protocol with `registerSchemesAsPrivileged` so the renderer is treated as a secure context (required for WASM and correct relative URL resolution)
- Linux targets: AppImage (portable) and deb (Debian/Ubuntu)
- Windows target: NSIS installer
- macOS target: DMG
- App icon — Ketcher hexagon logo with transparent background, 512×512
- AppStream metainfo (`build/com.ketcher.desktop.metainfo.xml`) for GNOME Software / KDE Discover integration
- `.desktop` file with `MimeType` entries for `.mol`, `.rxn`, `.sdf`, `.smi`, `.cml`, `.inchi` — files open in Ketcher Desktop on double-click
- deb post-install/post-remove hooks: install AppStream metainfo to `/usr/share/metainfo/` and refresh `update-desktop-database`
- Playwright REPL driver (`scripts/drive.mjs`) for automated UI testing on a live X display
- `scripts/build-ketcher.sh` — builds the Ketcher SPA with Node 24 via nvm, including workarounds for the `ButtonsConfig` type shim and `react-refresh` peer dependency
- `scripts/update-ketcher.sh` — pulls upstream Ketcher commits and stages the submodule bump

### Fixed

- `npm_config_prefix` conflict that prevented nvm from switching to Node 24 inside npm scripts
- `ButtonsConfig` missing from `ketcher-react` dist — patched by splitting `build:packages` → shim → `build:example`
- Default Electron menu removed (`Menu.setApplicationMenu(null)`)
- App was loading the remote-mode `index.html` (requires a backend); switched to `standalone/index.html`

### Notes

- Ketcher is tracked as a git submodule (`ketcher/` → `github.com/epam/ketcher`, master branch)
- The `app://` protocol serves `ketcher/example/dist/` in dev and `resources/ketcher-dist/` in packaged builds
- WASM files are excluded from the asar archive via `asarUnpack` so they can be loaded directly
