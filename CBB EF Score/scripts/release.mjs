import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const FILE='CBB-Espn-Fox.user.js';
const RAW='https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB%20EF%20Score/dist/';
const HOME='https://github.com/Nox1do/rover-basketball/tree/main/CBB%20EF%20Score';
const MAP_FIELDS=['rover_name','espn_id','espn_name','fox_id','fox_name'];

function parseVersion(value){
  const match=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(String(value));
  if(!match)throw new Error('Versión inválida: usa MAJOR.MINOR.PATCH.');
  const parts=match.slice(1).map(Number);
  if(!parts.every(Number.isSafeInteger))throw new Error('Versión fuera de rango.');
  return parts;
}
function compareVersions(left,right){
  const a=parseVersion(left),b=parseVersion(right);
  for(let i=0;i<3;i++)if(a[i]!==b[i])return Math.sign(a[i]-b[i]);
  return 0;
}
function read(root,file){return readFileSync(join(root,file),'utf8');}
function headerOf(source){
  const match=source.match(/^\/\/ ==UserScript==\n[\s\S]*?^\/\/ ==\/UserScript==\n?/m);
  if(!match||match.index!==0)throw new Error('Falta el bloque inicial UserScript.');
  return match[0].replace(/\n?$/,'\n');
}
function tagValues(header,tag){
  return [...header.matchAll(new RegExp('^//[\\t ]*@'+tag+'[\\t ]+([^\\r\\n]+)$','gm'))]
    .map(match=>match[1].trim()).filter(Boolean);
}
function stampUserscript(input,version){
  parseVersion(version);
  const source=input.replace(/\r\n/g,'\n');
  const originalHeader=headerOf(source);
  const names=tagValues(originalHeader,'name'),namespaces=tagValues(originalHeader,'namespace');
  if(names.length!==1||names[0]!=='CBB Espn-Fox')throw new Error('@name debe ser CBB Espn-Fox.');
  if(namespaces.length!==1||namespaces[0]!=='https://roversport.net/')throw new Error('@namespace inválido.');
  if(!tagValues(originalHeader,'match').length)throw new Error('Falta @match.');
  let header=originalHeader;
  for(const [tag,value] of [['version',version],['updateURL',RAW+'CBB-Espn-Fox.meta.js'],['downloadURL',RAW+FILE],['homepageURL',HOME]]){
    const declarations=[...header.matchAll(new RegExp('^//[\\t ]*@'+tag+'(?:[\\t ]|$)','gm'))];
    if(declarations.length>1)throw new Error('Metadato duplicado: @'+tag);
    if(declarations.length===1&&tagValues(header,tag).length!==1)throw new Error('Metadato vacío: @'+tag);
    const pattern=new RegExp('^//[\\t ]*@'+tag+'[\\t ]+[^\\r\\n]+$','m');
    const line='// @'+tag.padEnd(13)+value;
    header=pattern.test(header)?header.replace(pattern,line):header.replace('// ==/UserScript==',line+'\n// ==/UserScript==');
  }
  let body=source.slice(originalHeader.length);
  const pattern=/\bconst VERSION\s*=\s*["'][^"']+["'];/g;
  if([...body.matchAll(pattern)].length!==1)throw new Error('Debe existir una única constante VERSION.');
  body=body.replace(pattern,`const VERSION = "${version}";`);
  return header+body;
}
function synchronizeMap(source,root){
  const file=join(root,'data/cbb-rover-espn-fox-team-map.json');
  if(!existsSync(file))return source;
  const map=JSON.parse(readFileSync(file,'utf8'));
  const entries=Object.entries(map).sort(([a],[b])=>Number(a)-Number(b));
  const espn=new Set(),fox=new Set();
  if(!entries.length)throw new Error('El mapa de equipos está vacío.');
  const lines=entries.map(([code,team],i)=>{
    if(!/^\d+$/.test(code)||team.rover_code!==code||!team.rover_name||
      !/^\d+$/.test(team.espn_id)||!/^\d+$/.test(team.fox_id)||
      espn.has(String(team.espn_id))||fox.has(String(team.fox_id)))throw new Error('Identidad inválida o duplicada en mapa: '+code);
    espn.add(String(team.espn_id));fox.add(String(team.fox_id));
    const item=Object.fromEntries(MAP_FIELDS.filter(key=>key in team).map(key=>[key,team[key]]));
    return '        '+JSON.stringify(code)+': '+JSON.stringify(item)+(i<entries.length-1?',':'');
  });
  const pattern=/^    const TEAM_MAP = \{[\s\S]*?^    };$/m;
  if(!pattern.test(source))throw new Error('No se encontró TEAM_MAP en la fuente.');
  return source.replace(pattern,()=> '    const TEAM_MAP = {\n'+lines.join('\n')+'\n    };');
}
function requireNotes(root,version){
  const escaped=version.replace(/\./g,'\\.');
  if(!new RegExp('^## '+escaped+'(?:\\s|$)','m').test(read(root,'CHANGELOG.md')))throw new Error('Falta la entrada ## '+version+' en CHANGELOG.md.');
}
function readLock(root){
  if(!existsSync(join(root,'package-lock.json')))return null;
  const lock=JSON.parse(read(root,'package-lock.json'));
  if(!lock||!Number.isInteger(lock.lockfileVersion)||lock.lockfileVersion<2||
    !lock.packages||typeof lock.packages['']!=='object'||!lock.packages['']||Array.isArray(lock.packages[''])){
    throw new Error('package-lock.json incompatible: genera un lockfile moderno con packages[""].');
  }
  return lock;
}
function checkPublished(root=ROOT){
  const version=read(root,'VERSION').trim();parseVersion(version);requireNotes(root,version);
  if(JSON.parse(read(root,'package.json')).version!==version)throw new Error('package.json no coincide con VERSION.');
  const lock=readLock(root);
  if(lock){
    if(lock.version!==version||lock.packages?.['']?.version!==version)throw new Error('package-lock.json no coincide con VERSION.');
  }
  const source=read(root,'src/'+FILE);
  if(stampUserscript(synchronizeMap(source,root),version)!==source)throw new Error('Fuente, mapa, versión o URLs de actualización desincronizados.');
  for(const file of ['dist/'+FILE,'dist/CBB-Espn-Fox.txt','versions/CBB-Espn-Fox-v'+version+'.user.js']){
    if(read(root,file)!==source)throw new Error(file+' no coincide con src.');
  }
  if(read(root,'dist/CBB-Espn-Fox.meta.js')!==headerOf(source))throw new Error('dist metadata no coincide con src.');
  return {version,valid:true};
}
function release(version,{dryRun=false,root=ROOT}={}){
  parseVersion(version);
  const previous=read(root,'VERSION').trim();
  if(compareVersions(version,previous)<=0)throw new Error('La versión nueva debe ser mayor que '+previous+'.');
  requireNotes(root,version);
  const archive='versions/CBB-Espn-Fox-v'+version+'.user.js';
  if(existsSync(join(root,archive)))throw new Error('La versión histórica ya existe: '+archive);
  const built=stampUserscript(synchronizeMap(read(root,'src/'+FILE),root),version);
  if(stampUserscript(built,version)!==built)throw new Error('Los metadatos generados no son estables.');
  const pkg=JSON.parse(read(root,'package.json'));pkg.version=version;
  const lock=readLock(root);
  if(lock){lock.version=version;lock.packages[''].version=version;}
  if(dryRun)return {version,previous,dryRun:true};
  mkdirSync(join(root,'versions'),{recursive:true});mkdirSync(join(root,'dist'),{recursive:true});
  writeFileSync(join(root,archive),built,{encoding:'utf8',flag:'wx'});
  for(const file of ['src/'+FILE,'dist/'+FILE,'dist/CBB-Espn-Fox.txt'])writeFileSync(join(root,file),built,'utf8');
  writeFileSync(join(root,'dist/CBB-Espn-Fox.meta.js'),headerOf(built),'utf8');
  writeFileSync(join(root,'VERSION'),version+'\n','utf8');
  writeFileSync(join(root,'package.json'),JSON.stringify(pkg,null,2)+'\n','utf8');
  if(lock)writeFileSync(join(root,'package-lock.json'),JSON.stringify(lock,null,2)+'\n','utf8');
  return checkPublished(root);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    if(args.length===1&&args[0]==='--check')console.log('Publicación verificada:',checkPublished().version);
    else{
      if(!args[0]||args.slice(1).some(arg=>arg!=='--dry-run')||args.length>2)throw new Error('Uso: npm run release -- X.Y.Z [--dry-run] | npm run check:release');
      const result=release(args[0],{dryRun:args.includes('--dry-run')});
      console.log(result.dryRun?'Versión validada:':'Versión generada:',result.version);
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}

export {parseVersion,compareVersions,stampUserscript,synchronizeMap,checkPublished,release};
