import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, writeVersion, run } from './helpers.mjs';

const SCRIPT = 'check-version.cjs';

function fixture(desktopVersion, ketcherVersion) {
  const root = makeFixture(SCRIPT);
  writeVersion(root, '.', desktopVersion);
  writeVersion(root, 'ketcher/packages/ketcher-react', ketcherVersion);
  return root;
}

test('passes when the desktop version matches the bundled Ketcher', () => {
  const { status, stdout } = run(fixture('3.17.2', '3.17.2'), SCRIPT);
  assert.equal(status, 0);
  assert.match(stdout, /3\.17\.2 matches bundled Ketcher/);
});

test('fails when the versions drift', () => {
  // The drift this guards against really happened: the wrapper sat at 3.18.0-rc.4
  // while the bundled Ketcher was still 3.18.0-rc.1.
  const { status, stderr } = run(fixture('3.18.0-rc.4', '3.18.0-rc.1'), SCRIPT);
  assert.equal(status, 1);
  assert.match(stderr, /version drift/i);
  assert.match(stderr, /3\.18\.0-rc\.4/);
  assert.match(stderr, /3\.18\.0-rc\.1/);
});

test('fails on a pre-release mismatch that differs only by suffix', () => {
  const { status } = run(fixture('3.19.0', '3.19.0-rc.1'), SCRIPT);
  assert.equal(status, 1);
});

test('points at sync-version rather than suggesting a hand edit', () => {
  const { stderr } = run(fixture('1.0.0', '2.0.0'), SCRIPT);
  assert.match(stderr, /npm run sync-version/);
  assert.match(stderr, /do not hand-edit/i);
});
