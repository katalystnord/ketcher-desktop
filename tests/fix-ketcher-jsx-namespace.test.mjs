import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, write, read, run } from './helpers.mjs';

const SCRIPT = 'fix-ketcher-jsx-namespace.cjs';
const REACT = 'ketcher/packages/ketcher-react/src/typings.d.ts';
const MACRO = 'ketcher/packages/ketcher-macromolecules/src/typings.d.ts';

const WITHOUT = `declare module '*.less' {
  const classes: { [className: string]: string };
  export default classes;
}
`;

// What upstream added after the 3.17 line.
const WITH = `${WITHOUT}
declare namespace JSX {
  type Element = React.ReactElement<any, any>;
}
`;

function fixture({ react = WITHOUT, macro = WITHOUT } = {}) {
  const root = makeFixture(SCRIPT);
  if (react !== null) write(root, REACT, react);
  if (macro !== null) write(root, MACRO, macro);
  return root;
}

test('adds the JSX namespace when the bundled Ketcher lacks it', () => {
  const root = fixture();
  const { status, stdout } = run(root, SCRIPT);
  assert.equal(status, 0);
  assert.match(stdout, /added global JSX namespace shim to 2 package\(s\)/);
  for (const f of [REACT, MACRO]) assert.match(read(root, f), /declare namespace JSX/);
});

test('patches ketcher-macromolecules too, not just ketcher-react', () => {
  // Missing this cost a full build cycle: ketcher-react compiled, then
  // ketcher-macromolecules failed with the same TS2503.
  const root = fixture();
  run(root, SCRIPT);
  assert.match(read(root, MACRO), /declare namespace JSX/);
});

test('skips a package that already declares it (Ketcher 3.19+)', () => {
  const root = fixture({ react: WITH, macro: WITH });
  const { stdout } = run(root, SCRIPT);
  assert.match(stdout, /2 package\(s\) already declare/);
  // Untouched — no duplicate declaration appended.
  assert.equal((read(root, REACT).match(/declare namespace JSX/g) ?? []).length, 1);
});

test('is idempotent across repeated builds', () => {
  const root = fixture();
  run(root, SCRIPT);
  const afterFirst = read(root, REACT);
  run(root, SCRIPT);
  run(root, SCRIPT);
  assert.equal(read(root, REACT), afterFirst);
});

test('appends rather than prepends, so triple-slash directives keep working', () => {
  // A /// directive is only honoured at the very top of a file; inserting a
  // declaration above one would silently disable it.
  const root = fixture({ react: `/// <reference types="react-scripts" />\n${WITHOUT}` });
  run(root, SCRIPT);
  assert.match(read(root, REACT), /^\/\/\/ <reference types="react-scripts" \/>/);
});

test('preserves the original declarations', () => {
  const root = fixture();
  run(root, SCRIPT);
  assert.match(read(root, REACT), /declare module '\*\.less'/);
});

test('tolerates a package directory that does not exist', () => {
  const root = fixture({ macro: null });
  const { status } = run(root, SCRIPT);
  assert.equal(status, 0);
});
