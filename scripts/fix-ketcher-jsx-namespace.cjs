#!/usr/bin/env node
// Ketcher <=3.17.x pairs `@types/react` 19.x (per its own lockfile:
// packages/ketcher-react/node_modules/@types/react = 19.1.10) with source that
// still writes bare `JSX.Element` — e.g. src/Editor.tsx's
// MacromoleculesEditorProps.togglerComponent. @types/react 19 removed the global
// `JSX` namespace (it now lives at React.JSX), so `npm ci` of the v3.17.2 tag
// cannot compile its own source:
//
//   semantic error TS2503: Cannot find namespace 'JSX'.
//
// Upstream hit this too and fixed it after the 3.17 line by declaring the
// namespace in packages/ketcher-react/src/typings.d.ts. ketcher-macromolecules
// needs the same treatment — it is built by the same plugin from the same era. That fix was never
// backported to 3.17.x, so we apply upstream's own block here when it is absent.
// Verbatim from v3.19.0-rc.1. Type-only — it emits no runtime code.
//
// Remove this once the bundled Ketcher is a version that ships the shim itself
// (3.19.0-rc.1 and later already do, and are skipped below).
//
// See fix-ketcher-typescript-resolution.cjs for why paths come from __dirname.
const fs = require('fs');
const path = require('path');

const PACKAGES = ['ketcher-react', 'ketcher-macromolecules'];

const SHIM = `
declare namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Element = React.ReactElement<any, any>;
}
`;

let patched = 0;
let skipped = 0;

for (const pkg of PACKAGES) {
  const typingsPath = path.join(
    __dirname, '..', 'ketcher', 'packages', pkg, 'src', 'typings.d.ts',
  );
  if (!fs.existsSync(typingsPath)) continue;

  const src = fs.readFileSync(typingsPath, 'utf8');
  if (/declare\s+namespace\s+JSX\b/.test(src)) {
    skipped++;
    continue;
  }
  // Appended, not prepended: triple-slash directives are only honoured at the
  // very top of a file, so inserting a declaration above them would silently
  // disable them.
  fs.writeFileSync(typingsPath, src.replace(/\s*$/, '\n') + SHIM);
  patched++;
}

if (patched) {
  console.log(`→ typings.d.ts: added global JSX namespace shim to ${patched} package(s) (backport of upstream fix)`);
}
if (skipped) {
  console.log(`→ typings.d.ts: ${skipped} package(s) already declare the JSX namespace — skipped`);
}
