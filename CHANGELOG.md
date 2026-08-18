# Changelog

All notable changes to Ketcher Desktop will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Ketcher Desktop uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Version numbers match the bundled Ketcher release exactly — see [CONTRIBUTING.md → Versioning](CONTRIBUTING.md#versioning).

---

## [3.17.2] — 2026-08-18

**First stable release of Ketcher Desktop.** Every release before this one was a release candidate.

### Security

- Ketcher updated to **v3.17.2**, which carries the fix for an XSS vulnerability: opening a KET file containing a crafted monomer label could execute script (upstream [#10482](https://github.com/epam/ketcher/pull/10491)). A bundled dependency vulnerability was fixed in the same change. This is the reason to move to a stable line now rather than later.

### Changed

- Indigo cheminformatics engine updated to **v1.45.1**.

### Fixed

- WebGL/3D viewer restored, by switching to SwiftShader instead of disabling the GPU outright. 3D view was broken in the 3.17.0-rc and 3.18.0-rc builds on machines without usable GPU acceleration.

### Added

- `scripts/check-version.cjs` — fails the build if `package.json` and the bundled `ketcher-react` disagree on the version, so the version can never drift from what is actually inside.
- GitHub Pages landing page.
- `scripts/fix-ketcher-jsx-namespace.cjs` — Ketcher 3.17.x pins `@types/react` 19, which removed the global `JSX` namespace, but its own source still writes `JSX.Element`, so the tag does not compile as published. Upstream fixed this after the 3.17 line and never backported it; this applies their own type-only shim when the bundled Ketcher lacks it, and skips versions that already ship it.
- `scripts/fix-ketcher-rpt2-check.cjs` — disables `rollup-plugin-typescript2`'s typecheck for the `ketcher-react` and `ketcher-macromolecules` library builds. Ketcher 3.17.x does not typecheck against its own pinned toolchain, and every compiler version in range only trades one upstream type error for another. Upstream never fixed the 3.17 line; they moved the package off this plugin entirely in 3.19. The build already worked around it by hand-writing `index.d.ts` "due to upstream TS errors in the package", so this makes the situation explicit rather than a moving target. Diagnostics only — the emitted bundle is unchanged, and the build stays on upstream's own pinned TypeScript. No-op on Ketcher 3.19+.

### Changed (build)

- `scripts/build-ketcher.sh` now installs the Ketcher submodule with `npm ci` instead of `npm install`. `npm install` re-resolved against `package.json` and could silently truncate upstream's lockfile — dropping whole workspaces, after which the build failed on a missing dev tool (`shx: not found`, `cross-env: not found`) that looked like an upstream breakage. `npm ci` installs exactly the committed lockfile and never rewrites it, so builds are reproducible and that failure mode is gone.
- `scripts/fix-ketcher-tsconfig.cjs` now picks `moduleResolution` based on the TypeScript the bundled Ketcher pins — `bundler` on TypeScript 5+, `node` on the TypeScript 4.7 that 3.17.x uses, where `bundler` is rejected outright.
- The example-app build now runs with `DISABLE_ESLINT_PLUGIN=true`. create-react-app lints as part of `build`, and upstream's config loads `eslint-plugin-jest`, which reads the installed *jest* version. Ketcher's lockfile records jest as a peer dependency, and `--legacy-peer-deps` does not install peers, so the lint step aborted the build with "Unable to detect Jest version". Packaging a release is not the place to lint upstream's example app, and the emitted bundle is identical either way.

### Removed

- OCR from the feature lists in the README and elsewhere — it was never actually supported.

### A note on the version number

If you are running the `3.18.0-rc.3` pre-release, this stable build carries an *older* Ketcher. That is deliberate, and it is not a rollback of desktop work.

Ketcher Desktop takes the exact version of the Ketcher it wraps ([CONTRIBUTING.md → Versioning](CONTRIBUTING.md#versioning)). Upstream never shipped a stable `3.18.0` — that line stopped at `3.18.0-rc.3` and the release candidates moved on to `3.19.0-rc.1`. Upstream's newest *stable* is `3.17.2`, tagged 5 August, which is actually **newer** than the `3.19.0-rc.1` tag (3 August). So `3.17.2` is the most recent Ketcher that upstream considers finished, and it is the only honest number for a first stable release.

All the desktop-side work from the unreleased `3.18.0-rc.4` line — the 3D fix above included — ships here. If you want the newest upstream features and can accept release-candidate quality, the `3.19.0-rc.1` pre-release is published alongside this one.

## [3.18.0-rc.3] — 2026-07-06

### Added

- SMILES as a fourth copy-format option, alongside PNG/SVG/Molfile — compact and widely recognized outside chemistry-aware editors (database search boxes, chat, spreadsheets), at the cost of 2D layout.

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
