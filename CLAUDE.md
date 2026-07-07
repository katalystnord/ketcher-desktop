# Ketcher Desktop — Project Context

## What is this project?

**Ketcher Desktop** is a native desktop application wrapping [Ketcher](https://github.com/epam/ketcher) — the open-source chemical structure editor by EPAM Systems — in an Electron shell.

- GitHub: https://github.com/katalystnord/ketcher-desktop
- First release: v3.17.0-rc.1 (June 2026)
- Built by: David, katalystnord.com / david@katalystnord.com

Ketcher is a widely used web-based chemical structure editor used by chemists to draw molecules and reactions. It runs in the browser and is embedded in many cheminformatics platforms. However, there was no standalone desktop application.

Ketcher Desktop fills that gap: it runs fully offline, requires no server or browser, and installs like any other desktop app on Linux, Windows, and macOS.

## Why it was built

Chemists in David's network wanted a native chemical structure editor they could install and use without a browser, without an internet connection, and without setting up a backend server. Ketcher is the right tool for the job — it is capable, open-source (Apache 2.0), and actively maintained. Ketcher Desktop makes it accessible to users who are not comfortable running a web app.

## Key features

- Everything Ketcher offers out of the box: 2D structure drawing, 3D visualization, template library, stereochemistry, undo/redo, OCR, macromolecules editing
- Runs fully offline — WASM-based standalone mode, no Indigo backend needed
- Formats: MDL Molfile, RXN, InChI, ChemAxon Extended SMILES, CML
- Correct-resolution clipboard copy: molecules paste into LibreOffice/Word at print quality (300 DPI PNG with embedded resolution metadata)
- Tracks upstream Ketcher releases automatically via a daily CI sync
- Available as AppImage and .deb (Linux), NSIS installer (Windows), DMG (macOS)
- Package size: AppImage ~106 MB, .deb ~74 MB, Windows ~80 MB, macOS ~110 MB

## Current status

- v3.17.0-rc.1 released and published on GitHub Releases
- Flathub submission in progress (waiting on GitHub account age restriction for PR)
- Builds are unsigned (SmartScreen / Gatekeeper warnings on Win/Mac expected)
- Auto-sync CI keeps the submodule up to date with epam/ketcher master daily

## Announcement context

David has just drafted an email to the EPAM Ketcher team announcing the project. The next step is writing a **LinkedIn post** to announce Ketcher Desktop publicly.

### Tone and audience

- David's LinkedIn audience is likely a mix of: cheminformatics professionals, computational chemists, software developers in life sciences, and general chemistry/pharma contacts
- The post should be friendly and genuine, not overly promotional
- Should credit EPAM / the Ketcher team clearly
- Should invite people to try it, star the repo, or share with chemists who might benefit

### What to include in the LinkedIn post

- What Ketcher Desktop is and why it exists
- That it is free and open source
- A link to the GitHub repo
- A thank-you to the EPAM Ketcher team
- A call to action (try it, share it, give feedback)

### What to avoid

- Overly technical jargon (WASM, Electron internals, etc.)
- Making it sound like a commercial product — it is a side project / open-source contribution
- Being too long — LinkedIn posts work best under ~150 words

---

*This file provides context for writing announcement copy. For technical/coding context used by Claude Code, see the memory files in `.claude/`.*
