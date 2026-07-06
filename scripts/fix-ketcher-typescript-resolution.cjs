#!/usr/bin/env node
// typescript is a devDependency of each ketcher/packages/* workspace, not the
// root, and npm does not reliably hoist it to ketcher/node_modules — confirmed
// non-deterministic across otherwise-identical installs, even though it's
// already installed under each package's own node_modules. rollup-plugin-typescript2
// is hoisted to ketcher/node_modules and needs require('typescript') to resolve
// from there (Node's require only walks up, not into sibling package dirs), or the
// build intermittently fails with "Cannot find module 'typescript'". Copy one of
// the existing installs in — not `npm install`, which rewrites the lockfile and
// risks perturbing unrelated resolutions; not a symlink, which needs elevated
// privileges on Windows.
//
// Paths are computed via __dirname/path.join rather than passed in from bash,
// so this works identically under Git Bash's MSYS path translation (Windows CI)
// and native POSIX shells (Linux/macOS CI, local dev) — a bash-computed
// absolute path spliced into an inline `node -e` string does NOT get MSYS's
// automatic POSIX->Windows path conversion (that only rewrites literal
// command-line arguments), so it used to leak an unusable MSYS-style path
// straight into native Windows Node and fail with ENOENT.
const fs = require('fs');
const path = require('path');

const ketcherDir = path.join(__dirname, '..', 'ketcher');
const dest = path.join(ketcherDir, 'node_modules', 'typescript');
const src = path.join(ketcherDir, 'packages', 'ketcher-react', 'node_modules', 'typescript');

if (!fs.existsSync(dest) && fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
}
