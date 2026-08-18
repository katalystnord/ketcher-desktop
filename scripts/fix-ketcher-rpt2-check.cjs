#!/usr/bin/env node
// Disable rollup-plugin-typescript2's typecheck for the library builds
// (ketcher-react and ketcher-macromolecules, which hit the same errors).
//
// Ketcher 3.17.x does not typecheck against its own pinned toolchain. Every
// compiler version in range trades one error for another, all of them in
// upstream's source, none affecting emitted JavaScript:
//
//   TypeScript 4.7.4 (what the tag pins) : TS2503 Cannot find namespace 'JSX'
//                                          TS2322 'onClick' not on CollapseProps
//   TypeScript 5.5.x                     : TS2322 'onClick' not on CollapseProps
//   TypeScript 6.0.3                     : TS2869 right operand of ?? unreachable
//
// Upstream did not fix these on the 3.17 line; they dropped the problem instead,
// deleting packages/ketcher-react/rollup.config.ts in 3.19 and moving the package
// off rollup-plugin-typescript2 altogether. So there is no upstream fix to backport.
//
// This build already tolerates the situation: build-ketcher.sh hand-writes
// dist/script/index.d.ts afterwards precisely because rpt2 "skips index.d.ts due to
// upstream TS errors in the package". Turning the typecheck off makes that explicit
// and contained rather than a moving target, and keeps us on upstream's own pinned
// TypeScript rather than substituting a compiler upstream never shipped with.
//
// `check: false` suppresses diagnostics only — rpt2 transpiles identically, so the
// shipped bundle is byte-for-byte what a passing typecheck would have produced.
// Type safety is upstream's concern at their CI, not something this wrapper can
// meaningfully enforce on a tag that never passed it.
//
// No-op on Ketcher versions that no longer use this rollup config (3.19+).
//
// See fix-ketcher-typescript-resolution.cjs for why paths come from __dirname.
const fs = require('fs');
const path = require('path');

const PACKAGES = ['ketcher-react', 'ketcher-macromolecules'];

// The two configs call the plugin differently (ketcher-macromolecules passes
// `typescript: ttypescript` and a tsconfigOverride), so match the call itself and
// insert the option, rather than matching a fixed argument block.
const CALL = 'typescript({';

let patched = 0;
let skipped = 0;
let missing = 0;

for (const pkg of PACKAGES) {
  const configPath = path.join(
    __dirname, '..', 'ketcher', 'packages', pkg, 'rollup.config.ts',
  );
  if (!fs.existsSync(configPath)) {
    missing++;
    continue;
  }

  const src = fs.readFileSync(configPath, 'utf8');
  if (/check:\s*false/.test(src)) {
    skipped++;
    continue;
  }

  const at = src.indexOf(CALL);
  if (at === -1) {
    console.error(`ERROR: no rollup-plugin-typescript2 call found in ${configPath}`);
    console.error('       The upstream rollup config changed shape — update this script.');
    process.exit(1);
  }

  const cut = at + CALL.length;
  fs.writeFileSync(configPath, `${src.slice(0, cut)}\n      check: false,${src.slice(cut)}`);
  patched++;
}

if (patched) console.log(`→ rpt2: typecheck disabled for ${patched} package(s)`);
if (skipped) console.log(`→ rpt2: ${skipped} package(s) already had it disabled — skipped`);
if (missing) console.log(`→ rpt2: ${missing} package(s) have no rollup config (Ketcher 3.19+) — skipped`);
