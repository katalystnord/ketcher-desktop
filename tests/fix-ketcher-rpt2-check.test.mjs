import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, write, read, run } from './helpers.mjs';

const SCRIPT = 'fix-ketcher-rpt2-check.cjs';
const REACT = 'ketcher/packages/ketcher-react/rollup.config.ts';
const MACRO = 'ketcher/packages/ketcher-macromolecules/rollup.config.ts';

// The two packages call the plugin differently — the reason this script matches
// the call rather than a fixed argument block.
const REACT_CFG = `export default {
  plugins: [
    json(),
    typescript({
      tsconfig: './tsconfig.build.json',
    }),
  ],
}
`;

const MACRO_CFG = `export default {
  plugins: [
    typescript({
      typescript: ttypescript,
      tsconfigOverride: {
        exclude: ['*.test.ts'],
      },
    }),
  ],
}
`;

function fixture({ react = REACT_CFG, macro = MACRO_CFG } = {}) {
  const root = makeFixture(SCRIPT);
  if (react !== null) write(root, REACT, react);
  if (macro !== null) write(root, MACRO, macro);
  return root;
}

test('disables the typecheck in both packages', () => {
  const root = fixture();
  const { status, stdout } = run(root, SCRIPT);
  assert.equal(status, 0);
  assert.match(stdout, /typecheck disabled for 2 package\(s\)/);
  for (const f of [REACT, MACRO]) assert.match(read(root, f), /check:\s*false/);
});

test('handles the macromolecules call shape, which takes other options', () => {
  const root = fixture();
  run(root, SCRIPT);
  const out = read(root, MACRO);
  assert.match(out, /check:\s*false/);
  // The existing options must survive.
  assert.match(out, /typescript: ttypescript/);
  assert.match(out, /exclude: \['\*\.test\.ts'\]/);
});

test('is idempotent — no duplicate option on rebuilds', () => {
  const root = fixture();
  run(root, SCRIPT);
  const afterFirst = read(root, REACT);
  const { stdout } = run(root, SCRIPT);
  assert.match(stdout, /already had it disabled/);
  assert.equal(read(root, REACT), afterFirst);
  assert.equal((read(root, REACT).match(/check:\s*false/g) ?? []).length, 1);
});

test('no-ops on Ketcher 3.19+, which deleted these rollup configs', () => {
  const root = fixture({ react: null, macro: null });
  const { status, stdout } = run(root, SCRIPT);
  assert.equal(status, 0);
  assert.match(stdout, /no rollup config \(Ketcher 3\.19\+\)/);
});

test('fails loudly if upstream reshapes the plugin call', () => {
  // Better to stop the build than to silently ship an un-patched config that
  // then dies deep in a rollup typecheck.
  const root = fixture({ react: 'export default { plugins: [json()] }\n' });
  const { status, stderr } = run(root, SCRIPT);
  assert.equal(status, 1);
  assert.match(stderr, /no rollup-plugin-typescript2 call found/);
});
