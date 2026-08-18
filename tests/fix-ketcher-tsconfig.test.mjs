import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, write, read, writeVersion, run } from './helpers.mjs';

const SCRIPT = 'fix-ketcher-tsconfig.cjs';
const TSCONFIG = 'ketcher/packages/ketcher-react/tsconfig.build.json';

// Upstream ships the broken pairing this script exists to correct:
// moduleResolution "node16" with module "esnext", and no rootDir.
const UPSTREAM = JSON.stringify({
  compilerOptions: { outDir: 'dist', module: 'esnext', moduleResolution: 'node16' },
  include: ['src'],
}, null, 2);

function fixture(tsVersion) {
  const root = makeFixture(SCRIPT);
  write(root, TSCONFIG, UPSTREAM);
  if (tsVersion) writeVersion(root, 'ketcher/node_modules/typescript', tsVersion);
  return root;
}

function config(root) {
  return JSON.parse(read(root, TSCONFIG)).compilerOptions;
}

test('uses "bundler" on TypeScript 5+', () => {
  const root = fixture('5.5.4');
  run(root, SCRIPT);
  assert.equal(config(root).moduleResolution, 'bundler');
});

test('uses "bundler" on TypeScript 6.x, as Ketcher 3.19 pins', () => {
  const root = fixture('6.0.3');
  run(root, SCRIPT);
  assert.equal(config(root).moduleResolution, 'bundler');
});

test('falls back to "node" on the TypeScript 4.7 that Ketcher 3.17.x pins', () => {
  // TypeScript 4.7 rejects "bundler" outright:
  //   TS6046: Argument for '--moduleResolution' must be: 'node', 'classic', 'node16', 'nodenext'
  const root = fixture('4.7.4');
  const { stdout } = run(root, SCRIPT);
  assert.equal(config(root).moduleResolution, 'node');
  assert.match(stdout, /TypeScript 4\.x/);
});

test('always sets an explicit rootDir', () => {
  // Without it, rollup-plugin-typescript2 infers one that escapes outDir and
  // emits declarations rollup then refuses to write.
  for (const v of ['4.7.4', '6.0.3']) {
    const root = fixture(v);
    run(root, SCRIPT);
    assert.equal(config(root).rootDir, './src');
  }
});

test('assumes a modern compiler when TypeScript is not installed yet', () => {
  const root = fixture(null);
  run(root, SCRIPT);
  assert.equal(config(root).moduleResolution, 'bundler');
});

test('prefers the hoisted TypeScript, which is the copy the plugin loads', () => {
  const root = fixture('4.7.4');
  writeVersion(root, 'ketcher/packages/ketcher-react/node_modules/typescript', '6.0.3');
  run(root, SCRIPT);
  assert.equal(config(root).moduleResolution, 'node');
});

test('leaves unrelated compiler options untouched', () => {
  const root = fixture('6.0.3');
  run(root, SCRIPT);
  assert.equal(config(root).outDir, 'dist');
  assert.equal(config(root).module, 'esnext');
  assert.deepEqual(JSON.parse(read(root, TSCONFIG)).include, ['src']);
});
