import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'Rs-ESPN-CBB-Resultados.user.js';
const RAW = 'https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB/dist/' + FILE;

export function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value));
  if (!match) throw new Error('Version invalida; usa MAJOR.MINOR.PATCH.');
  return match.slice(1).map(Number);
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
  }
  return 0;
}

export function stampUserscript(source, version) {
  parseVersion(version);
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim() === '// ==UserScript==');
  const end = lines.findIndex((line, index) => index > start && line.trim() === '// ==/UserScript==');
  if (start < 0 || end < 0) throw new Error('Falta el bloque de metadatos UserScript.');
  const header = lines.slice(start, end + 1);
  const tagLines = (tag) => header.filter((line) => new RegExp('^\\s*//\\s*@' + tag + '\\s+').test(line));
  const names = tagLines('name');
  if (names.length !== 1 || !/^\s*\/\/\s*@name\s+Rs - ESPN CBB Resultados\s*$/.test(names[0])) {
    throw new Error('El @name debe ser Rs - ESPN CBB Resultados.');
  }
  if (tagLines('namespace').length !== 1 || tagLines('match').length === 0) {
    throw new Error('Faltan @namespace o @match.');
  }
  for (const tag of ['version', 'updateURL', 'downloadURL']) {
    if (tagLines(tag).length > 1) throw new Error('Metadato duplicado: @' + tag);
  }
  for (const [tag, value] of [['version', version], ['updateURL', RAW], ['downloadURL', RAW]]) {
    const index = header.findIndex((line) => new RegExp('^\\s*//\\s*@' + tag + '\\s+').test(line));
    const entry = '// @' + tag.padEnd(12) + value;
    if (index >= 0) header[index] = entry;
    else header.splice(header.length - 1, 0, entry);
  }
  lines.splice(start, end - start + 1, ...header);
  return lines.join('\n');
}

export function release(version, { dryRun = false, root = ROOT } = {}) {
  parseVersion(version);
  const previous = readFileSync(join(root, 'VERSION'), 'utf8').trim();
  if (compareVersions(version, previous) <= 0) throw new Error('La version nueva debe ser mayor que ' + previous);
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  if (!changelog.includes('## [' + version + ']')) throw new Error('Falta la entrada ## [' + version + '] en CHANGELOG.md.');
  const source = readFileSync(join(root, 'src', FILE), 'utf8');
  const built = stampUserscript(source, version);
  const archive = join(root, 'versions', 'Rs-ESPN-CBB-Resultados-v' + version + '.user.js');
  const stable = join(root, 'dist', FILE);
  if (existsSync(archive)) throw new Error('La version historica ya existe y es inmutable: ' + archive);
  if (dryRun) return { version, archive, stable, dryRun: true };
  mkdirSync(dirname(archive), { recursive: true });
  mkdirSync(dirname(stable), { recursive: true });
  writeFileSync(archive, built, { encoding: 'utf8', flag: 'wx' });
  writeFileSync(stable, built, 'utf8');
  writeFileSync(join(root, 'VERSION'), version + '\n', 'utf8');
  return { version, archive, stable, dryRun: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , version, ...flags] = process.argv;
  try {
    if (!version || flags.some((flag) => flag !== '--dry-run')) throw new Error('Uso: npm run release -- X.Y.Z [--dry-run]');
    const result = release(version, { dryRun: flags.includes('--dry-run') });
    console.log((result.dryRun ? 'Validada' : 'Generada') + ' version ' + result.version);
    console.log(result.archive);
    console.log(result.stable);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
