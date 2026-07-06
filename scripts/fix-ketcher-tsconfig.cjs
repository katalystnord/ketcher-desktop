#!/usr/bin/env node
// ketcher-react/tsconfig.build.json pairs moduleResolution:"node16" with
// module:"esnext" — an invalid combination (TS5110) that modern TypeScript
// rejects outright, and has no explicit rootDir either. The resulting bogus
// rootDir inference makes rollup-plugin-typescript2 emit a declaration path
// that escapes outDir ("../../../../src/Editor.d.ts"), which rollup then
// refuses to write. Fix: moduleResolution "bundler" (correct for a
// Rollup-bundled library anyway) + explicit rootDir "./src".
//
// See fix-ketcher-typescript-resolution.cjs for why this path is computed via
// __dirname instead of a bash-interpolated string.
const fs = require('fs');
const path = require('path');

const tsconfigPath = path.join(__dirname, '..', 'ketcher', 'packages', 'ketcher-react', 'tsconfig.build.json');
const cfg = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
cfg.compilerOptions.moduleResolution = 'bundler';
cfg.compilerOptions.rootDir = './src';
fs.writeFileSync(tsconfigPath, JSON.stringify(cfg, null, 2) + '\n');
