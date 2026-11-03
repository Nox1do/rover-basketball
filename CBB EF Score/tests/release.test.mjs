import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const script=new URL('../scripts/release.mjs',import.meta.url);
const RAW='https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB%20EF%20Score/dist/';
function fixture(t,{notes=true,source}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cbb-ef-release-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'src'));fs.mkdirSync(path.join(root,'scripts'));
  if(fs.existsSync(script))fs.copyFileSync(script,path.join(root,'scripts/release.mjs'));
  fs.writeFileSync(path.join(root,'VERSION'),'0.0.1\n');
  fs.writeFileSync(path.join(root,'package.json'),'{"name":"cbb-espn-fox","version":"0.0.1","private":true}\n');
  fs.writeFileSync(path.join(root,'CHANGELOG.md'),notes?'# Changes\n\n## 0.0.2\nRelease\n\n## 0.0.3\nNext\n':'# Changes\n');
  fs.writeFileSync(path.join(root,'src/CBB-Espn-Fox.user.js'),source||'// ==UserScript==\n// @name CBB Espn-Fox\n// @namespace https://roversport.net/\n// @version 0.0.1\n// @match https://www.roversport.net/adm/es/*\n// ==/UserScript==\n\n(() => {\n    const VERSION = "0.0.1";\n    console.log(VERSION);\n})();\n');
  return root;
}
const run=(root,...args)=>spawnSync(process.execPath,[path.join(root,'scripts/release.mjs'),...args],{cwd:root,encoding:'utf8'});
const read=(root,file)=>fs.readFileSync(path.join(root,file),'utf8');

test('release updates runtime/header/package version and stable Firefox update files together',t=>{
  const root=fixture(t);const r=run(root,'0.0.2');assert.equal(r.status,0,r.stderr);
  const source=read(root,'src/CBB-Espn-Fox.user.js');
  assert.match(source,/const VERSION = "0\.0\.2"/);assert.match(source,/@version\s+0\.0\.2/);
  assert.ok(source.includes('@updateURL    '+RAW+'CBB-Espn-Fox.meta.js'));
  assert.ok(source.includes('@downloadURL  '+RAW+'CBB-Espn-Fox.user.js'));
  assert.equal(read(root,'dist/CBB-Espn-Fox.user.js'),source);
  assert.equal(read(root,'dist/CBB-Espn-Fox.txt'),source);
  assert.equal(read(root,'versions/CBB-Espn-Fox-v0.0.2.user.js'),source);
  const meta=read(root,'dist/CBB-Espn-Fox.meta.js');assert.ok(meta.endsWith('// ==/UserScript==\n'));assert.ok(!meta.includes('console.log'));
  assert.equal(read(root,'VERSION'),'0.0.2\n');assert.equal(JSON.parse(read(root,'package.json')).version,'0.0.2');
  assert.equal(run(root,'--check').status,0);
});
test('publishing a later version preserves the previous immutable snapshot',t=>{
  const root=fixture(t);assert.equal(run(root,'0.0.2').status,0);const previous=read(root,'versions/CBB-Espn-Fox-v0.0.2.user.js');
  assert.equal(run(root,'0.0.3').status,0);assert.equal(read(root,'versions/CBB-Espn-Fox-v0.0.2.user.js'),previous);
  assert.equal(read(root,'dist/CBB-Espn-Fox.user.js'),read(root,'versions/CBB-Espn-Fox-v0.0.3.user.js'));
});
test('release rejects equal/older versions without modifying the source',t=>{
  const root=fixture(t);assert.equal(run(root,'0.0.2').status,0);const before=read(root,'src/CBB-Espn-Fox.user.js');
  for(const version of ['0.0.2','0.0.1']){const r=run(root,version);assert.notEqual(r.status,0);assert.match(r.stderr,/mayor/);assert.equal(read(root,'src/CBB-Espn-Fox.user.js'),before);}
});
test('missing release notes prevent any distribution writes',t=>{
  const root=fixture(t,{notes:false});const before=read(root,'src/CBB-Espn-Fox.user.js');const r=run(root,'0.0.2');assert.notEqual(r.status,0);assert.match(r.stderr,/CHANGELOG/);
  assert.equal(read(root,'src/CBB-Espn-Fox.user.js'),before);assert.equal(fs.existsSync(path.join(root,'dist')),false);
});
test('existing history cannot be overwritten by another release',t=>{
  const root=fixture(t);assert.equal(run(root,'0.0.2').status,0);fs.writeFileSync(path.join(root,'versions/CBB-Espn-Fox-v0.0.3.user.js'),'historical');
  const r=run(root,'0.0.3');assert.notEqual(r.status,0);assert.match(r.stderr,/histórica/);assert.equal(read(root,'versions/CBB-Espn-Fox-v0.0.3.user.js'),'historical');assert.equal(read(root,'VERSION'),'0.0.2\n');
});
test('release checker rejects source/dist or metadata divergence',t=>{
  const root=fixture(t);assert.equal(run(root,'0.0.2').status,0);
  fs.appendFileSync(path.join(root,'dist/CBB-Espn-Fox.user.js'),'\n// edited dist');const r=run(root,'--check');assert.notEqual(r.status,0);assert.match(r.stderr,/dist/);
});
test('invalid userscript identity is rejected before writing files',t=>{
  const root=fixture(t);const file=path.join(root,'src/CBB-Espn-Fox.user.js');fs.writeFileSync(file,read(root,'src/CBB-Espn-Fox.user.js').replace('CBB Espn-Fox','CFB FOX'));
  const r=run(root,'0.0.2');assert.notEqual(r.status,0);assert.match(r.stderr,/@name/);assert.equal(fs.existsSync(path.join(root,'dist')),false);
});
test('release regenerates the embedded team map from data without retaining retired codes',t=>{
  const root=fixture(t);const file=path.join(root,'src/CBB-Espn-Fox.user.js');
  fs.writeFileSync(file,read(root,'src/CBB-Espn-Fox.user.js').replace('    console.log(VERSION);','    const TEAM_MAP = {\n        "19210":{"rover_name":"California Baptist","espn_id":"2856","fox_id":"648"}\n    };\n    console.log(VERSION);'));
  fs.mkdirSync(path.join(root,'data'));fs.writeFileSync(path.join(root,'data/cbb-rover-espn-fox-team-map.json'),JSON.stringify({'984':{rover_code:'984',rover_name:'California Baptist',espn_id:'2856',fox_id:'648'}}));
  const result=run(root,'0.0.2');assert.equal(result.status,0,result.stderr);
  const published=read(root,'dist/CBB-Espn-Fox.user.js');assert.ok(published.includes('"984":'));assert.ok(!published.includes('"19210":'));assert.equal(run(root,'--check').status,0);
});
test('release keeps the lockfile root version synchronized without changing dependencies',t=>{
  const root=fixture(t);const locked={name:'cbb-espn-fox',version:'0.0.1',lockfileVersion:3,packages:{'':{name:'cbb-espn-fox',version:'0.0.1'},'node_modules/example':{version:'2.0.0'}}};
  fs.writeFileSync(path.join(root,'package-lock.json'),JSON.stringify(locked));assert.equal(run(root,'0.0.2').status,0);
  const updated=JSON.parse(read(root,'package-lock.json'));assert.equal(updated.version,'0.0.2');assert.equal(updated.packages[''].version,'0.0.2');assert.deepEqual(updated.packages['node_modules/example'],locked.packages['node_modules/example']);
});
test('empty metadata cannot cross lines, remove @match or consume a release version',t=>{
  const root=fixture(t);const file=path.join(root,'src/CBB-Espn-Fox.user.js');
  const source=read(root,'src/CBB-Espn-Fox.user.js').replace('// @version 0.0.1','// @version');fs.writeFileSync(file,source);
  for(const args of [['0.0.2','--dry-run'],['0.0.2']]){
    const result=run(root,...args);assert.notEqual(result.status,0);assert.match(result.stderr,/@version/);
    assert.equal(read(root,'src/CBB-Espn-Fox.user.js'),source);assert.equal(read(root,'VERSION'),'0.0.1\n');assert.equal(fs.existsSync(path.join(root,'versions')),false);
  }
});
test('incompatible lockfile is rejected before any files or version are updated',t=>{
  const root=fixture(t);const file=path.join(root,'package-lock.json');const lock='{"version":"0.0.1","lockfileVersion":1}\n';fs.writeFileSync(file,lock);
  const source=read(root,'src/CBB-Espn-Fox.user.js');
  for(const args of [['0.0.2','--dry-run'],['0.0.2']]){
    const result=run(root,...args);assert.notEqual(result.status,0);assert.match(result.stderr,/package-lock/);
    assert.equal(read(root,'src/CBB-Espn-Fox.user.js'),source);assert.equal(read(root,'VERSION'),'0.0.1\n');assert.equal(read(root,'package-lock.json'),lock);assert.equal(fs.existsSync(path.join(root,'versions')),false);
  }
});
