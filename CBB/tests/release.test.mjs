import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareVersions, release, stampUserscript } from '../scripts/release.mjs';

const fixture = [
  '// ==UserScript==',
  '// @name         Rs - ESPN CBB LLoader',
  '// @namespace    https://roversport.net/',
  '// @version      0.0.1',
  '// @match        https://www.roversport.net/adm/es/*',
  '// ==/UserScript==',
  '(() => { "use strict"; })();',
  '',
].join('\n');

test('versiones semanticas: orden y validacion', () => {
  assert.equal(compareVersions('0.1.0', '0.0.0'), 1);
  assert.equal(compareVersions('1.2.0', '1.2.1'), -1);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
  assert.throws(() => compareVersions('1.0', '1.0.0'), /Version invalida/);
});

test('metadatos de Tampermonkey consistentes', () => {
  const built = stampUserscript(fixture, '0.1.0');
  assert.match(built, /@version\s+0\.1\.0/);
  assert.equal((built.match(/@updateURL/g) || []).length, 1);
  assert.equal((built.match(/@downloadURL/g) || []).length, 1);
  assert.match(built, /raw\.githubusercontent\.com\/Nox1do\/rover-basketball\/main\/CBB\/dist\//);
  assert.throws(() => stampUserscript(fixture.replace('Rs - ESPN CBB LLoader', 'CFB'), '0.1.0'), /@name/);
  assert.throws(() => stampUserscript(fixture + '\n// @downloadURL bad', 'invalid'), /Version invalida/);
});

test('release crea estable, historico, VERSION y no sobrescribe releases', () => {
  const root = mkdtempSync(join(tmpdir(), 'cbb-version-'));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'VERSION'), '0.0.0\n');
  writeFileSync(join(root, 'CHANGELOG.md'), '## [0.1.0] - 2026-11-02\n\nPrimer release.\n');
  writeFileSync(join(root, 'src', 'Rs-ESPN-CBB-LLoader.user.js'), fixture);
  const preflight = release('0.1.0', { root, dryRun: true });
  assert.equal(preflight.dryRun, true);
  assert.equal(readFileSync(join(root, 'VERSION'), 'utf8').trim(), '0.0.0');
  const actual = release('0.1.0', { root });
  assert.equal(actual.dryRun, false);
  const historical = readFileSync(actual.archive, 'utf8');
  assert.equal(readFileSync(actual.stable, 'utf8'), historical);
  assert.equal(readFileSync(actual.legacy, 'utf8'), historical);
  assert.match(historical, /@version\s+0\.1\.0/);
  assert.equal(readFileSync(join(root, 'VERSION'), 'utf8').trim(), '0.1.0');
  assert.throws(() => release('0.1.0', { root }), /mayor/);
  assert.throws(() => release('0.0.9', { root }), /mayor/);
});

test('release bloquea publicacion sin CHANGELOG', () => {
  const root = mkdtempSync(join(tmpdir(), 'cbb-changelog-'));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'VERSION'), '0.0.0');
  writeFileSync(join(root, 'CHANGELOG.md'), '## [Unreleased]\n');
  writeFileSync(join(root, 'src', 'Rs-ESPN-CBB-LLoader.user.js'), fixture);
  assert.throws(() => release('0.1.0', { root, dryRun: true }), /CHANGELOG/);
});
