#!/usr/bin/env node
// ketcher-react/tsconfig.build.json pairs moduleResolution:"node16" with
// module:"esnext" — an invalid combination (TS5110) that modern TypeScript
// rejects outright, and has no explicit rootDir either. The resulting bogus
// rootDir inference makes rollup-plugin-typescript2 emit a declaration path
// that escapes outDir ("../../../../src/Editor.d.ts"), which rollup then
// refuses to write. Fix: a bundler-appropriate moduleResolution + explicit
// rootDir "./src".
//
// Which value depends on the TypeScript the bundled Ketcher pins, so this works
// across the versions we build. "bundler" is the right answer but only exists in
// TypeScript >=5.0; Ketcher <=3.17.x pins typescript ^4.5 (resolves 4.7.4), where
// it fails with `config error TS6046: Argument for '--moduleResolution' option
// must be: 'node', 'classic', 'node16', 'nodenext'`. On TS4 use "node", which is
// the equivalent bundler-style resolution there and pairs fine with module:esnext.
//
// See fix-ketcher-typescript-resolution.cjs for why this path is computed via
// __dirname instead of a bash-interpolated string.
const fs = require('fs');
const path = require('path');

const ketcherDir = path.join(__dirname, '..', 'ketcher');
const tsconfigPath = path.join(ketcherDir, 'packages', 'ketcher-react', 'tsconfig.build.json');

// Resolve the TypeScript that rollup-plugin-typescript2 will actually load: the
// hoisted root copy if present (that is what rpt2 requires), else the package's own.
function typescriptMajor() {
  const candidates = [
    path.join(ketcherDir, 'node_modules', 'typescript', 'package.json'),
    path.join(ketcherDir, 'packages', 'ketcher-react', 'node_modules', 'typescript', 'package.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return parseInt(JSON.parse(fs.readFileSync(c, 'utf8')).version.split('.')[0], 10);
    }
  }
  return 5; // not installed yet — assume modern
}

const major = typescriptMajor();
const moduleResolution = major >= 5 ? 'bundler' : 'node';

const cfg = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
cfg.compilerOptions.moduleResolution = moduleResolution;
cfg.compilerOptions.rootDir = './src';
fs.writeFileSync(tsconfigPath, JSON.stringify(cfg, null, 2) + '\n');

console.log(`→ tsconfig.build.json: moduleResolution "${moduleResolution}" (TypeScript ${major}.x)`);
