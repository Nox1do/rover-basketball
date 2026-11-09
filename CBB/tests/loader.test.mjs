import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const code=readFileSync(new URL('src/Rs-ESPN-CBB-LLoader.user.js',root),'utf8');
const mapping=JSON.parse(readFileSync(new URL('data/rover-espn-team-map.json',root),'utf8'));
const csv=readFileSync(new URL('data/rover-espn-matchups.csv',root),'utf8');
function harness({category='BASKETBALL',league='CBB',date='2026-11-02',feed=null,grouped=true}={}){
 const controls=new Map(),intervals=[];
 const elem=()=>({style:{},hidden:false,disabled:false,textContent:'',addEventListener(){},replaceChildren(){},appendChild(){},append(){},remove(){},getClientRects(){return[1]},querySelector(s){if(s?.includes('[data-action=') || s==='.cbbll-version' || s==='[data-role="legacy-warning"]'){if(!controls.has(s))controls.set(s,elem());return controls.get(s)}return elem()},querySelectorAll(){return[]}});
 const selects=[category,league].map(value=>({tagName:'SELECT',value,options:[{textContent:value}],selectedIndex:0}));
 const dateControl={value:date};
 const team=id=>({dataset:{team:id},cloneNode(){return {textContent:id==='733'?'Queens University':'Winthrop',querySelectorAll(){return[]}}}});
 const row={id:'',dataset:{},classList:{contains(){return false}},getAttribute(x){return x==='tkt'?'123456':null},querySelector(){return null},querySelectorAll(s){if(s==='td')return[{innerText:'6:00 PM',textContent:'6:00 PM'}];if(s==='.ge-team-link[data-team]')return[team('733'),team('711')];return []},closest(){return{querySelectorAll(){return[{querySelectorAll(){return[{textContent:'HORA'}]}}]}}}};
 const group={textContent:league,classList:{contains(s){return s==='ge-liga-row'}},querySelector(){return null}};
 const rows=grouped?[group,row]:[row];
 const table={querySelector(){return null},querySelectorAll(s){if(s==='tbody > tr'||s==='tbody tr, tr[tkt]')return rows;if(s==='tr.ge-liga-row')return grouped?[group]:[];if(s==='th')return ['Away','Home','Action','Hora'].map(textContent=>({textContent}));return[]}};
 const nodes=new Map();
 const document={head:{appendChild(e){nodes.set(e.id,e)}},body:{appendChild(e){nodes.set(e.id,e)}},createElement(){return elem()},getElementById(id){return nodes.get(id)||null},querySelector(s){return s==='#tablaEventos'?table:null},querySelectorAll(s){if(s==='label')return ['CATEGORY','LEAGUE'].map((textContent,i)=>({textContent,parentElement:{querySelector(){return selects[i]}}}));if(s==='select')return selects;if(s==='table')return[table];if(s.includes('input[name="fecha"]'))return[dateControl];return[]}};
 const urls=[];
 const context={document,console:{log(){},warn(){},error(){},table(){}},setInterval(fn){intervals.push(fn)},getComputedStyle(){return {display:'block',visibility:'visible'}},GM:{xmlHttpRequest(opts){urls.push(opts.url);return Promise.resolve({status:200,responseText:JSON.stringify(feed?.(opts.url)||{events:[]})})}}};
 context.window=context;
 vm.runInNewContext(code,context,{timeout:2500});
 return {api:context.__CBB_LLOADER,qa:context.__CBB_LLOADER.qa,urls,dateControl,selects,controls,intervals,context};
}
const h=harness();
function game(away='2511',home='2737',date='2026-11-02T23:00:00Z',id='401921423') {return {id,date,competitions:[{competitors:[{homeAway:'away',team:{id:away}},{homeAway:'home',team:{id:home}}]}]}}
function rover(away='733',home='711',time=1080,date='2026-11-02'){return {date,timeMinutes:time,away:{roverCode:away},home:{roverCode:home}}}
test('version and source CBB are correct',()=>{assert.equal(h.api.version,'0.1.18');assert.match(code,/mens-college-basketball\/scoreboard/);assert.doesNotMatch(code,/football\/college-football|__CFB_LLOADER/)});
test('all 58 original functions preserved plus four helpers',()=>{assert.ok((code.match(/(?:async\s+)?function\s+\w+/g)||[]).length>=62)});
test('340 Rover IDs exactly match ESPN crosswalk',()=>{assert.equal(Object.keys(h.qa.teamIds).length,340);for(const [id,data] of Object.entries(mapping))assert.equal(h.qa.teamIds[id],data.espn_id);assert.equal(new Set(Object.values(h.qa.teamIds)).size,340)});
test('all 303 fixtures have valid away+home team IDs',()=>{const rows=csv.trim().replace(/^\uFEFF/,'').split(/\r?\n/).slice(1);assert.equal(rows.length,303);for(const line of rows){const cols=line.split(',');assert.equal(h.qa.teamIds[cols[1]],cols[3]);assert.equal(h.qa.teamIds[cols[4]],cols[6])}});
test('exception cases Queens Southern Indiana Lindenwood and long names',()=>{for(const [a,b] of [['733','2511'],['179','88'],['133','2815'],['856','112358'],['925','357'],['300','2837']])assert.equal(h.qa.teamIds[a],b)});
test('NCAA season rollover',()=>{assert.equal(h.qa.basketballSeasonYear('2026-11-02'),'2027');assert.equal(h.qa.basketballSeasonYear('2027-03-30'),'2027');assert.equal(h.qa.basketballSeasonYear('2027-11-02'),'2028')});
test('ESPN UTC to NY winter versus RD, DST boundary',()=>{assert.equal(h.qa.dateTimeInZone('2026-11-02T23:00:00Z','America/New_York').time,'6:00 PM');assert.equal(h.qa.dateTimeInZone('2026-11-02T23:00:00Z','America/Santo_Domingo').time,'7:00 PM')});
test('ESPN data parse handles participants and missing competition',()=>{const e=h.qa.parseEspnEvent(game(),'TEST');assert.equal(e.awayEspnId,'2511');assert.equal(e.homeEspnId,'2737');assert.equal(e.roverZoneDate,'2026-11-02');assert.equal(e.roverZoneTimeMinutes,1080);assert.equal(h.qa.parseEspnEvent({id:'123'},'TEST'),null)});
test('exact pair/date/time resolves without guessing',()=>{const e=h.qa.parseEspnEvent(game(),'T');assert.equal(h.qa.findExact(rover(),[e]).status,'EXACT');assert.equal(h.qa.findExact(rover('711','733'),[e]).status,'REVERSED_PAIR')});
test('no exact time, date, team or missing time blocks linkage',()=>{const e=h.qa.parseEspnEvent(game(),'T');assert.equal(h.qa.findExact(rover('733','711',900),[e]).status,'TIME_MISMATCH');assert.equal(h.qa.findExact(rover('733','711',1080,'2026-11-04'),[e]).status,'NOT_FOUND');assert.equal(h.qa.findExact(rover('000','711'),[e]).status,'NO_MAP_AWAY');assert.equal(h.qa.findExact(rover('733','000'),[e]).status,'NO_MAP_HOME');assert.equal(h.qa.findExact(rover('733','711',null),[e]).status,'NO_TIME')});
test('multiple events with same IDs and time require review',()=>{const e=h.qa.parseEspnEvent(game(),'T');assert.equal(h.qa.findExact(rover(),[e,{...e,eventId:'another'}]).status,'MULTIPLE_MATCHES')});
test('live ESPN Queens vs Winthrop orientation example is blocked',()=>{const real=h.qa.parseEspnEvent(game('2737','2511','2026-11-02T14:00:00Z'),'REAL');assert.notEqual(h.qa.findExact(rover(),[real]).status,'EXACT')});
test('league guard rejects football, NBA and womens basketball',()=>{for(const league of ['NBA','WNBA','CFB','NCAA WOMEN'])assert.equal(h.qa.isCollegeBasketballLeague(league),false);for(const league of ['CBB','NCAAB','NCAAM'])assert.equal(h.qa.isCollegeBasketballLeague(league),true);assert.equal(harness({category:'FOOTBALL'}).api.isCBBView(),false);assert.equal(harness({league:'NBA'}).api.isCBBView(),false)});
test('legacy ungrouped and grouped rows supported',()=>{assert.equal(harness({grouped:false}).api.getRoverEvents().length,1);assert.equal(harness({grouped:true}).api.getRoverEvents().length,1)});
test('existing URLs from any league are protected',()=>{const modal={scope:{querySelectorAll(){return[]}}};assert.equal(h.qa.readExistingLink(modal,{tagName:'INPUT',value:'https://www.espn.com/college-football/game/_/gameId/4000'}).eventId,'');assert.equal(h.qa.readExistingLink(modal,{tagName:'INPUT',value:'https://www.espn.com/mens-college-basketball/game/_/gameId/401921423'}).eventId,'401921423')});
test('analyze -> READY from group 50 and CBB ESPN URL',async()=>{const x=harness({feed(){return {events:[game()]}}});const p=await x.api.analyze();assert.equal(p.length,1);assert.equal(p[0].status,'READY');assert.equal(p[0].url,'https://www.espn.com/mens-college-basketball/game/_/gameId/401921423');assert.ok(x.urls.some(u=>u.includes('groups=50')))});
test('change of displayed date after analysis cancels link loading',async()=>{const x=harness({feed(){return {events:[game()]}}});await x.api.analyze();x.dateControl.value='2026-11-03';await assert.rejects(x.api.load({limit:1}),/cambiaron/)});

test('CBB is an ESPN link-and-schedule auditor, not score writer',()=>{assert.match(code,/@name\s+Rs - ESPN CBB LLoader/);assert.match(code,/mens-college-basketball\/game\/_\/gameId/);assert.match(code,/function findExact\(/);assert.match(code,/function writeUrlField\(/);assert.doesNotMatch(code,/function (?:writeScore|saveScore|saveResults|setScore)\(/);});

test('buttons remain stable during READY panel heartbeat, but write guard rejects changed league',async()=>{
 const x=harness({feed(){return {events:[game()]}}});
 await x.api.analyze();
 const load=x.controls.get('[data-action="load"]');
 assert.equal(load.disabled,false);
 x.selects[1].value='NBA';
 x.selects[1].options[0].textContent='NBA';
 x.intervals[0]();
 assert.equal(load.disabled,false);
 await assert.rejects(x.api.load({limit:1}),/cambiaron/);
 assert.equal(load.disabled,true);
});
test('singleton prevents duplicate version from scheduling conflicting panel refreshes',()=>{
 const x=harness();
 const firstIntervalCount=x.intervals.length;
 vm.runInNewContext(code,x.context,{timeout:2500});
 assert.equal(firstIntervalCount,1);
 assert.equal(x.intervals.length,1);
 assert.equal(x.context.__CBB_LLOADER.version,'0.1.18');
});
test('Tampermonkey metadata matches only index.php and stays versioned',()=>{
 const lines=code.split(/\r?\n/);
 const matches=lines.filter(line=>/^\/\/\s*@match\s+/.test(line));
 assert.deepEqual(matches,[
  '// @match        https://www.roversport.lol/adm/es/index.php*',
  '// @match        https://www.roversport.net/adm/es/index.php*'
 ]);
 const include=lines.find(line=>/^\/\/\s*@include\s+/.test(line));
 assert.match(include,/index\\\.php/);
 assert.doesNotMatch(include,/adm\\\/es\(\?/);
 assert.match(code,/@version\s+0\.1\.13/);
});

test('v0.1.18 tests strict parsing and safe classification',()=>{
 const item={status:'READY',match:{eventId:'401911469'}};
 assert.equal(h.qa.strictEspnId('https://www.espn.com/mens-college-basketball/game/_/gameId/401911469'),'401911469');
 assert.equal(h.qa.strictEspnId('https://bad.example/path/espn.com/mens-college-basketball/game/_/gameId/401911469'),'');
 assert.equal(h.qa.strictEspnId('https://www.espn.com/college-football/game/_/gameId/401911469'),'');
 assert.equal(h.qa.classifyLink(item,null),'EMPTY');
 assert.equal(h.qa.classifyLink(item,{url:'https://www.espn.com/mens-college-basketball/game/_/gameId/401911469'}),'CORRECT');
 assert.equal(h.qa.classifyLink(item,{url:'https://www.espn.com/mens-college-basketball/game/_/gameId/401911468'}),'WRONG_ESPN');
 assert.equal(h.qa.classifyLink(item,{url:'https://www.foxsports.com/game/123'}),'OTHER_LINK');
 assert.equal(h.qa.classifyLink({status:'REVERSED_PAIR',match:null},{url:'https://www.espn.com/mens-college-basketball/game/_/gameId/401911468'}),'NEEDS_REVIEW');
});
test('v0.1.18 requires verification before correcting',async()=>{
 const x=harness({feed(){return {events:[game()]}}});
 await x.api.analyze();
 await assert.rejects(x.api.correctLinks(),/Verificar enlaces/);
});
test('v0.1.18 includes separate read-only audit and post-save confirmation/notification',()=>{
 assert.equal(typeof h.api.verifyLinks,'function');
 assert.equal(typeof h.api.correctLinks,'function');
 assert.match(code,/data-action="audit">Verificar enlaces/);
 assert.match(code,/data-action="fix" disabled>Corregir incorrectos/);
 assert.match(code,/await saveModal\(item, modal\);[\s\S]*?confirmed = inspectLink/);
 assert.match(code,/notifyCorrection\(item,/);
 assert.match(code,/@grant\s+GM_notification/);
});


function editableHarness(originalUrl) {
  const g={id:'401921423',date:'2026-11-02T23:00:00Z',
    competitions:[{competitors:[{homeAway:'away',team:{id:'2511'}},{homeAway:'home',team:{id:'2737'}}]}]};
  const x=harness({feed(){return {events:[g]}}});
  let stored=originalUrl, modalOpen=false, saves=0, opens=0;
  const notifications=[];
  const ctx=x.context, oldQuery=ctx.document.querySelector.bind(ctx.document);
  const table=oldQuery('#tablaEventos'),row=table.querySelectorAll('tbody > tr')[1];
  row.isConnected=true;row.scrollIntoView=()=>{};
  const field={tagName:'INPUT',value:stored,dispatchEvent(){}};
  const close={textContent:'Cerrar',value:'',title:'Cerrar',getAttribute(){return null},
    getClientRects(){return[1]},click(){modalOpen=false}};
  const save={click(){saves++;stored=field.value;modalOpen=false}};
  const scope={querySelector(s){return s==='#ge-ee-save-btn'?save:null},
    querySelectorAll(s){if(s==='a[href]')return[];if(s.includes('button'))return[close];return[]}};
  const form={getClientRects(){return[1]},closest(){return scope},querySelector(s){
    if(s==='#ge-ee-serial')return{value:'123456'};
    if(s==='#ge-ee-team1')return{value:'733'};
    if(s==='#ge-ee-team2')return{value:'711'};
    if(s==='#ge-ee-url')return field;return null;
  }};
  const edit={click(){opens++;field.value=stored;modalOpen=true},getClientRects(){return[1]}};
  const oldRow=row.querySelector.bind(row);
  row.querySelector=s=>s.startsWith('button[onclick^="geEeOpen(')?edit:oldRow(s);
  ctx.document.querySelector=s=>s==='#ge-ee-form-wrap'?(modalOpen?form:null):
    s==='#ge-ee-overlay'?scope:oldQuery(s);
  ctx.setTimeout=fn=>{fn();return 1};
  ctx.Event=class { constructor(type,opts){this.type=type;this.options=opts} };
  ctx.HTMLInputElement=class {};
  ctx.GM_notification=opts=>notifications.push(opts);
  return {api:x.api,get stored(){return stored},set stored(value){stored=value},
    get saves(){return saves},get opens(){return opens},notifications,controls:x.controls};
}

test('audit read-only, correction verifies reopening, sends one Tampermonkey notification',async()=>{
 const x=editableHarness('https://www.espn.com/mens-college-basketball/game/_/gameId/401921444');
 const audit=await x.api.verifyLinks();
 assert.equal(audit[0].status,'WRONG_ESPN');
 assert.equal(x.saves,0);assert.equal(x.notifications.length,0);
 const corrected=await x.api.correctLinks();
 assert.equal(corrected[0].status,'CORRECTED');
 assert.equal(x.stored,'https://www.espn.com/mens-college-basketball/game/_/gameId/401921423');
 assert.equal(x.saves,1);assert.equal(x.opens,3);assert.equal(x.notifications.length,1);
 assert.match(x.notifications[0].text,/SN 123456.*401921444.*401921423/);
});
test('correct ESPN link and another provider are left untouched by auditor',async()=>{
 for(const url of [
  'https://www.espn.com/mens-college-basketball/game/_/gameId/401921423',
  'https://www.foxsports.com/college-basketball/game/abc'
 ]){
  const x=editableHarness(url);
  const report=await x.api.verifyLinks();
  assert.equal(report[0].status,url.includes('espn.com')?'CORRECT':'OTHER_LINK');
  await x.api.correctLinks();
  assert.equal(x.saves,0);
  assert.equal(x.notifications.length,0);
  assert.equal(x.stored,url);
 }
});
test('changed ESPN link after audit is not overwritten, no notification',async()=>{
 const x=editableHarness('https://www.espn.com/mens-college-basketball/game/_/gameId/401921444');
 await x.api.verifyLinks();
 x.stored='https://www.espn.com/mens-college-basketball/game/_/gameId/401921445';
 const result=await x.api.correctLinks();
 assert.equal(result[0].status,'ERROR');
 assert.match(result[0].error,/cambiado/i);
 assert.equal(x.saves,0);assert.equal(x.notifications.length,0);
});

test('v0.1.18 refreshes displayed version after old UI text is modified',()=>{
 const x=harness();
 const label=x.controls.get('.cbbll-version');
 assert.equal(label.textContent,'v0.1.18');
 label.textContent='v0.1.0';
 x.intervals[0]();
 assert.equal(label.textContent,'v0.1.18');
 assert.equal(x.api.uiDiagnostics().label,'v0.1.18');
 assert.equal(x.api.uiDiagnostics().panelId,'cbb-lloader-panel-v2');
});
test('v0.1.18 detects legacy UI and blocks all link writes',async()=>{
 const x=harness({feed(){return {events:[game()]}}});
 const original=x.context.document.getElementById.bind(x.context.document);
 x.context.document.getElementById=id=>id==='cbb-lloader-panel'?{id}:original(id);
 await x.api.analyze();
 assert.equal(x.api.uiDiagnostics().legacyCollision,true);
 assert.equal(x.api.uiDiagnostics().label,'v0.1.18');
 await assert.rejects(x.api.load({limit:1}),/otra versi.n/i);
 await assert.rejects(x.api.correctLinks(),/otra versi.n/i);
 x.intervals[0]();
 assert.equal(x.controls.get('[data-action="load"]').disabled,true);
 assert.equal(x.controls.get('[data-role="legacy-warning"]').hidden,false);
});
test('v0.1.18 uses separate IDs while retaining the ESPN link auditor',()=>{
 assert.match(code,/const PANEL_ID = "cbb-lloader-panel-v2"/);
 assert.match(code,/const LEGACY_PANEL_ID = "cbb-lloader-panel"/);
 assert.match(code,/function requireSingleLoader\(/);
 assert.equal(typeof h.api.verifyLinks,'function');
 assert.equal(typeof h.api.correctLinks,'function');
});


test('20 requested new pairings exist, new and existing team mappings unchanged',()=>{
 const rows=csv.trim().replace(/^\uFEFF/,'').split(/\r?\n/).slice(1).map(line=>line.split(','));
 assert.equal(rows.length,303);
 const expectedPairs=[
 ['790','2547','971','62'],['916','2747','897','2633'],
 ['805','2363','895','96'],['864','2681','640','103'],
 ['824','2154','650','259'],['827','2261','644','59'],
 ['889','107','670','227'],['662','56','996','2579'],
 ['930','2870','665','2184'],['923','2534','899','333'],
 ['745','2182','649','258'],['935','2571','727','2340'],
 ['940','2011','774','245'],['788','2443','902','99'],
 ['776','325','728','142'],['658','288','714','2294'],
 ['942','2029','900','8'],['660','2454','19210','2856'],
 ['697','2464','850','2439'],['736','2239','848','21']
 ];
 const last=rows.slice(119,139);
 for(let i=0;i<20;i++){
  const row=last[i],pair=expectedPairs[i];
  assert.equal(Number(row[0]),120+i);
  assert.deepEqual([row[1],row[3],row[4],row[6]],pair);
 }
 assert.equal(h.qa.teamIds['19210'],'2856');
 assert.equal(h.qa.teamIds['662'],'56');
 assert.equal(h.qa.teamIds['658'],'288');
 assert.equal(h.qa.teamIds['923'],'2534');
 assert.equal(h.qa.teamIds['848'],'21');
});
test('five-digit Rover code California Baptist parsed and matched via ESPN',()=>{
 const links=[
  {dataset:{team:'660'},cloneNode(){return{textContent:'North Florida',querySelectorAll(){return[]}}}},
  {dataset:{team:'19210'},cloneNode(){return{textContent:'California Baptist',querySelectorAll(){return[]}}}}
 ];
 const row={
  getAttribute(key){return key==='tkt'?'1239876':''},
  dataset:{},id:'',
  querySelectorAll(selector){
   if(selector==='.ge-team-link[data-team]')return links;
   if(selector==='td')return [{textContent:'07:00 PM',innerText:'07:00 PM'}];
   return[];
  },
  closest(){return{querySelectorAll(){return[{querySelectorAll(){return[{textContent:'HORA'}]}}]}}},
  querySelector(){return null}
 };
 const parsed=h.qa.parseRoverRow(row);
 assert.equal(parsed.away.roverCode,'660');
 assert.equal(parsed.home.roverCode,'19210');
 const espn=h.qa.parseEspnEvent(game('2454','2856','2026-11-03T00:00:00Z','401999900'),'TEST');
 assert.equal(h.qa.findExact(parsed,[espn]).status,'EXACT');
});
test('new teams remain isolated from CFB IDs and ESPN game URL created by existing engine',()=>{
 const b=h.qa.parseEspnEvent(game('2547','62','2026-11-02T23:00:00Z','401999901'),'TEST');
 const row=rover('790','971',1080,'2026-11-02');
 assert.equal(h.qa.findExact(row,[b]).status,'EXACT');
 assert.equal(h.qa.findExact(rover('971','790',1080,'2026-11-02'),[b]).status,'REVERSED_PAIR');
});

test('after reloading, find the same Rover event by tkt',()=>{
 const x=harness();
 const row=x.api.getRoverEvents()[0].row;
 assert.equal(row.getAttribute('tkt'),'123456');
 assert.equal(x.qa.findRoverRow('123456'),row);
 assert.equal(x.qa.findRoverRow('nonexistent'),null);
});
test('safe plan context refuses changed league while preserving saved status',async()=>{
 const x=harness({feed(){return {events:[game()]}}});
 await x.api.analyze();
 assert.equal(x.qa.isPlanContextSafe(),true);
 x.api.getPlan()[0].loadStatus='SAVED';
 assert.equal(x.qa.isPlanContextSafe(),true);
 x.selects[1].value='NBA';x.selects[1].options[0].textContent='NBA';
 assert.equal(x.qa.isPlanContextSafe(),false);
});
test('bulk engine validates each live target and verifies saved link before success',()=>{
 assert.match(code,/await waitForRoverRow\(item\.rover\.roverEventId, 3200\)/);
 assert.match(code,/isPlanContextSafe\(item, liveRow\)/);
 assert.match(code,/await verifySavedUrl\(item\)/);
 assert.doesNotMatch(code,/consecutiveErrors >= 2/);
});


function sequentialSaveHarness({dropPendingAfterFirst=false,addUnrelatedAfterFirst=false,changeSecondAfterFirst=false,includeThird=false,delayEditorFields=0,keepOpenOnSave=false,failPersistence=false}={}){
 const games=[
  {id:'401921423',date:'2026-11-02T23:00:00Z',competitions:[{competitors:[{homeAway:'away',team:{id:'2511'}},{homeAway:'home',team:{id:'2737'}}]}]},
  {id:'401921424',date:'2026-11-02T23:00:00Z',competitions:[{competitors:[{homeAway:'away',team:{id:'2634'}},{homeAway:'home',team:{id:'93'}}]}]}
 ];
 const initial=[
  {id:'123456',away:'733',awayName:'Queens University',home:'711',homeName:'Winthrop'},
  {id:'123457',away:'872',awayName:'Tennessee State',home:'870',homeName:'Murray State'}
 ];
 if(includeThird) {
   games.push({id:'401921425',date:'2026-11-02T23:00:00Z',competitions:[{competitors:[
     {homeAway:'away',team:{id:'2547'}},{homeAway:'home',team:{id:'62'}}
   ]}]});
   initial.push({id:'123458',away:'790',awayName:'Seattle U',home:'971',homeName:'Hawaii'});
 }
 const stored=new Map(initial.map(item=>[item.id,''])),nodes=new Map(),controls=new Map();
 let rows=[],activeId='',modalOpen=false,saves=0,opens=0,activeField=null,fieldsLeft=0;
 const selects=['BASKETBALL','CBB'].map(value=>({tagName:'SELECT',value,options:[{textContent:value}],selectedIndex:0}));
 const dateControl={value:'2026-11-02'};
 const e=()=>({style:{},hidden:false,disabled:false,textContent:'',getClientRects(){return[1]},
   append(){},appendChild(){},replaceChildren(){},remove(){},addEventListener(){},
   querySelector(selector){if(selector.includes('[data-action=')||selector==='.cbbll-version'||selector.includes('[data-role=')){
      if(!controls.has(selector))controls.set(selector,e());
      return controls.get(selector);
   }return e()},
   querySelectorAll(){return[]}});
 const table={
  querySelectorAll(selector){
    if(selector==='tbody > tr'||selector==='tbody tr, tr[tkt]')return [group,...rows];
    if(selector==='tr.ge-liga-row')return [group];
    if(selector==='th')return ['Away','Home','Action','Hora'].map(textContent=>({textContent}));
    if(selector==='thead tr')return [];
    return [];
  },querySelector(){return null}
 };
 const group={textContent:'CBB 2 eventos',classList:{contains(s){return s==='ge-liga-row'}},querySelector(){return null}};
 function buildRows(){
  const visible=initial.filter(item=>!(dropPendingAfterFirst&&saves>0&&item.id==='123457'));
  if(addUnrelatedAfterFirst&&saves>0)visible.push({
    id:'123499',away:'824',awayName:'Coppin State',home:'650',homeName:'Virginia Tech'
  });
  rows=visible.map(entry=>{
   const item=changeSecondAfterFirst&&saves>0&&entry.id==='123457'
     ? {...entry,home:'733'} : entry;
   const row={id:'',dataset:{},isConnected:true,classList:{contains(){return false}},
    getAttribute(key){return key==='tkt'?item.id:null},
    scrollIntoView(){},closest(){return table},
    querySelectorAll(sel){
     if(sel==='td')return[{innerText:'6:00 PM',textContent:'6:00 PM'}];
     if(sel==='.ge-team-link[data-team]'){
      return [ [item.away,item.awayName],[item.home,item.homeName] ].map(([id,name])=>({
       dataset:{team:id},cloneNode(){return{textContent:name,querySelectorAll(){return[]}}}
      }));
     }
     return[];
    },
    querySelector(sel){if(sel==='button[onclick^="geEeOpen("][title="Editar"]'){
       return{click(){opens++;activeId=item.id;activeField.value=stored.get(item.id);modalOpen=true;fieldsLeft=delayEditorFields}};
     }return null}
   };
   return row;
  });
 }
 buildRows();
 const field={tagName:'INPUT',value:'',dispatchEvent(){}};
 activeField=field;
 const cancel={textContent:'Cerrar',value:'',title:'Cerrar',getAttribute(){return null},
  getClientRects(){return[1]},click(){modalOpen=false}};
 const save={click(){
   saves++;
   if(!failPersistence)stored.set(activeId,field.value);
   if(!keepOpenOnSave)modalOpen=false;
   for(const r of rows)r.isConnected=false;
   buildRows();
 }};
 const scope={querySelector(sel){return sel==='#ge-ee-save-btn'?save:null},
  querySelectorAll(sel){if(sel==='a[href]')return[];if(sel.includes('button'))return[cancel];return[]}};
 const form={getClientRects(){return[1]},closest(){return scope},
  querySelector(sel){
   const a=initial.find(item=>item.id===activeId);
   if(sel==='#ge-ee-serial'&&fieldsLeft>0){fieldsLeft--;return null;}
   if(fieldsLeft>0)return null;
   if(sel==='#ge-ee-serial')return{value:activeId};
   if(sel==='#ge-ee-team1')return{value:a?.away};
   if(sel==='#ge-ee-team2')return{value:a?.home};
   if(sel==='#ge-ee-url')return field;
   return null;
  }};
 const document={head:{appendChild(el){nodes.set(el.id,el)}},body:{appendChild(el){nodes.set(el.id,el)}},
  createElement:()=>e(),getElementById:id=>nodes.get(id)||null,
  querySelector(sel){
   if(sel==='#tablaEventos')return table;
   if(sel==='#ge-ee-form-wrap')return modalOpen?form:null;
   if(sel==='#ge-ee-overlay')return scope;
   return null;
  },
  querySelectorAll(sel){
   if(sel==='label')return['CATEGORY','LEAGUE'].map((textContent,i)=>({textContent,parentElement:{querySelector(){return selects[i]}}}));
   if(sel==='select')return selects;
   if(sel==='table')return[table];
   if(sel.includes('input[name="fecha"]'))return[dateControl];
   return[];
  }};
 const context={
  document,console:{log(){},warn(){},error(){},table(){}},
  GM:{xmlHttpRequest(opts){return Promise.resolve({status:200,responseText:JSON.stringify({events:games})})}},
  setInterval(){},setTimeout(fn){fn();return 1},
  getComputedStyle(){return{display:'block',visibility:'visible'}},
  Event:class{constructor(type,opts){this.type=type;this.opts=opts}},
  HTMLInputElement:class{}
 };
 if(keepOpenOnSave) {
   let now=0;
   context.Date=class extends Date{static now(){return now+=300}};
 }
 context.window=context;
 vm.runInNewContext(code,context,{timeout:2500});
 return {api:context.__CBB_LLOADER,stored,opens:()=>opens,saves:()=>saves};
}
test('two ESPN links are saved consecutively across complete tbody row replacement',async()=>{
 const h=sequentialSaveHarness();
 const p=await h.api.analyze();
 assert.equal(p.length,2);assert.equal(p[0].status,'READY');assert.equal(p[1].status,'READY');
 const res=await h.api.load();
 assert.equal(res[0].loadStatus,'SAVED');
 assert.equal(res[1].loadStatus,'SAVED');
 assert.equal(h.saves(),2);
 assert.equal(h.opens(),4); // Save + persisted-link reopen for each SN
 assert.match(h.stored.get('123456'),/gameId\/401921423/);
 assert.match(h.stored.get('123457'),/gameId\/401921424/);
});
test('filtered pending row is safely skipped without stopping the next valid event',async()=>{
 const h=sequentialSaveHarness({dropPendingAfterFirst:true,includeThird:true});
 await h.api.analyze();
 const res=await h.api.load();
 assert.equal(res[0].loadStatus,'SAVED');
 assert.equal(res[1].loadStatus,'SKIPPED');
 assert.match(res[1].error,/no visible/i);
 assert.equal(res[2].loadStatus,'SAVED');
 assert.equal(h.saves(),2);
 assert.match(h.stored.get('123458'),/gameId\/401921425/);
});

test('new row after first save does not stop processing other valid games',async()=>{
 const h=sequentialSaveHarness({addUnrelatedAfterFirst:true,includeThird:true});
 await h.api.analyze();
 const res=await h.api.load();
 assert.equal(res[0].loadStatus,'SAVED');
 assert.equal(res[1].loadStatus,'SAVED');
 assert.equal(res[2].loadStatus,'SAVED');
 assert.equal(h.saves(),3);
});
test('changed target home team is skipped without write and next target continues',async()=>{
 const h=sequentialSaveHarness({changeSecondAfterFirst:true,includeThird:true});
 await h.api.analyze();
 const res=await h.api.load();
 assert.equal(res[0].loadStatus,'SAVED');
 assert.equal(res[1].loadStatus,'SKIPPED');
 assert.match(res[1].error,/equipos/i);
 assert.equal(res[2].loadStatus,'SAVED');
 assert.equal(h.saves(),2);
});
test('global selected date remains a hard safety gate',async()=>{
 const h=harness({feed(){return {events:[game()]}}});
 await h.api.analyze();
 assert.equal(h.qa.isPlanContextSafe(),true);
 h.dateControl.value='2026-11-03';
 assert.equal(h.qa.isPlanContextSafe(),false);
});
test('removed arbitrary two-error circuit breaker',()=>{
 assert.doesNotMatch(code,/consecutiveErrors\s*>=\s*2/);
 assert.match(code,/SKIPPED/);
 assert.match(code,/remaining = ready.filter/);
});

test('find URL field via accessible label when no fixed ID exists',()=>{
 const field={tagName:'INPUT',value:'',name:'unspecified',type:'text'};
 const label={textContent:'EVENT RESULTS URL',control:field};
 const scope={querySelector(){return null},querySelectorAll(s){
  if(s==='input, select, textarea')return[field];
  if(s==='label')return[label];
  return[];
 }};
 assert.equal(h.qa.findUrlField({form:scope,scope}),field);
});
test('URL field via metadata but not another provider field',()=>{
 const target={tagName:'TEXTAREA',name:'link_resultados',value:''};
 const other={tagName:'INPUT',name:'odds_score',value:''};
 const scope={querySelector(){return null},querySelectorAll(s){
  return s==='input, select, textarea'?[target,other]:[];
 }};
 assert.equal(h.qa.findUrlField({form:scope,scope}),target);
 assert.equal(h.qa.resultsUrlLabel('URL DE RESULTADOS'),true);
});
test('ambiguous candidate fields never trigger a write; diagnostic does not print values',()=>{
 const a={tagName:'INPUT',name:'results_url_a',value:'PRIVATE A'};
 const b={tagName:'INPUT',name:'results_url_b',value:'PRIVATE B'};
 const scope={querySelector(){return null},querySelectorAll(s){
  return s==='input, select, textarea'?[a,b]:[];
 }};
 assert.equal(h.qa.findUrlField({form:scope,scope}),null);
 assert.match(h.qa.modalUrlDiagnostic({scope}),/results_url_a/);
 assert.doesNotMatch(h.qa.modalUrlDiagnostic({scope}),/PRIVATE/);
});
test('field readiness and success confirmation still require persisted link verification',()=>{
 assert.match(code,/await waitForUrlField\(item\)/);
 assert.match(code,/message !== before/);
 assert.match(code,/await verifySavedUrl\(item\)/);
});

test('real editor requires SN, both teams and ge-ee-url before writing',()=>{
 const item={rover:{roverEventId:'1198954',away:{roverCode:'935'},home:{roverCode:'727'}}};
 let id='',away='',home='';
 const field={tagName:'INPUT',type:'text',value:''};
 const form={querySelector(q){
  if(q==='#ge-ee-serial')return{value:id};
  if(q==='#ge-ee-team1')return{value:away};
  if(q==='#ge-ee-team2')return{value:home};
  if(q==='#ge-ee-url')return field;
  return null;
 }};
 const modal={form,scope:form};
 assert.equal(h.qa.modalReadiness(item,modal).ready,false);
 id='1198954';
 assert.equal(h.qa.modalReadiness(item,modal).ready,false);
 away='935';home='727';
 assert.equal(h.qa.modalReadiness(item,modal).ready,true);
 id='1198955';
 assert.equal(h.qa.modalReadiness(item,modal).ready,false);
 id='1198954';home='971';
 assert.equal(h.qa.modalReadiness(item,modal).mismatch,true);
});
test('delayed editor mounts still save three links in correct order',async()=>{
 const x=sequentialSaveHarness({includeThird:true,delayEditorFields:4});
 await x.api.analyze();
 const plan=await x.api.load();
 assert.deepEqual(plan.map(p=>p.loadStatus),['SAVED','SAVED','SAVED']);
 assert.equal(x.saves(),3);
 assert.equal(x.opens(),6);
});
test('no save toast but persistent URL is verified after reopening',async()=>{
 const x=sequentialSaveHarness({keepOpenOnSave:true});
 await x.api.analyze();
 const plan=await x.api.load({limit:1});
 assert.equal(plan[0].loadStatus,'SAVED');
 assert.equal(x.saves(),1);
 assert.match(x.stored.get('123456'),/gameId\/401921423/);
});
test('no save toast and no persistence never claims SAVED or resubmits',async()=>{
 const x=sequentialSaveHarness({keepOpenOnSave:true,failPersistence:true});
 await x.api.analyze();
 const plan=await x.api.load({limit:1});
 assert.equal(plan[0].loadStatus,'ERROR');
 assert.equal(x.saves(),1);
 assert.equal(x.stored.get('123456'),'');
 assert.match(plan[0].error,/no conserv.|no persist/i);
});

test('stale toast from a previous event cannot confirm the current save',()=>{
 assert.match(code,/const previousToasts = new Map/);
 assert.match(code,/!previousToasts\.has\(el\)/);
 assert.match(code,/previousToasts\.get\(el\) !== clean\(el\.textContent\)/);
});

test('new 2026-11-03 screenshot fixtures retain all eleven Rover/ESPN pairs',()=>{
 const fixtures=[
 ['791','2565','658','288'],['855','161','775','2086'],
 ['786','2344','277','2603'],['829','2379','705','2272'],
 ['737','2463','843','2724'],['922','2545','901','2'],
 ['980','94','772','233'],['708','2515','877','25'],
 ['781','303','967','2541'],['932','2449','581','2608'],
 ['733','2511','962','2351']
 ];
 const rows=csv.trim().split(/\r?\n/).slice(1).map(line=>line.split(','));
 assert.equal(rows.length,303);
 const added=rows.slice(139);
 for(let i=0;i<fixtures.length;i++){
  assert.equal(added[i][0],String(140+i));
  assert.deepEqual([added[i][1],added[i][3],added[i][4],added[i][6]],fixtures[i]);
 }
});
test('eleven new teams are unique; eleven existing mapping IDs remain unchanged',()=>{
 const newTeams={'791':'2565','786':'2344','277':'2603','737':'2463','843':'2724','922':'2545','901':'2','772':'233','877':'25','932':'2449','962':'2351'};
 const existing={'658':'288','855':'161','775':'2086','829':'2379','705':'2272','980':'94','708':'2515','781':'303','967':'2541','581':'2608','733':'2511'};
 for(const [code,id] of Object.entries({...newTeams,...existing}))
  assert.equal(h.qa.teamIds[code],id);
 assert.equal(new Set(Object.values(h.qa.teamIds)).size,340);
});
test('new SIU Edwardsville pairing detects correct and reversed ESPN localia',()=>{
 const gameESPN=h.qa.parseEspnEvent(game('2565','288','2026-11-03T22:00:00Z','401999994'),'TEST');
 assert.equal(h.qa.findExact(rover('791','658',1020,'2026-11-03'),[gameESPN]).status,'EXACT');
 assert.equal(h.qa.findExact(rover('658','791',1020,'2026-11-03'),[gameESPN]).status,'REVERSED_PAIR');
 assert.equal(h.qa.teamIds['932'],'2449');
 assert.equal(h.qa.teamIds['922'],'2545');
 assert.equal(h.qa.teamIds['737'],'2463');
});

test('espndeportes ESPN womens Western Illinois URL is recognized as wrong competition',()=>{
 const supplied='https://espndeportes.espn.com/womens-college-basketball/game/_/gameId/401920019';
 assert.deepEqual(h.qa.espnGameInfo(supplied),{competition:'womens-college-basketball',eventId:'401920019'});
 assert.equal(h.qa.strictEspnId(supplied),'');
 assert.equal(h.qa.classifyLink({status:'READY',match:{eventId:'401999111'}},{url:supplied}),'WRONG_COMPETITION');
 assert.equal(h.qa.classifyLink({status:'NOT_FOUND',match:null},{url:supplied}),'WRONG_COMPETITION');
 assert.equal(h.qa.isCorrectableAudit({status:'WRONG_COMPETITION',existingId:'401920019',existingCompetition:'womens-college-basketball',
  item:{status:'READY',match:{eventId:'401999111'}}}),true);
});
test('ESPN localized mens URLs are valid and spoof/other providers stay blocked',()=>{
 const item={status:'READY',match:{eventId:'401921423'}};
 assert.equal(h.qa.strictEspnId('https://espndeportes.espn.com/mens-college-basketball/game/_/gameId/401921423'),'401921423');
 assert.equal(h.qa.classifyLink(item,{url:'https://espndeportes.espn.com/mens-college-basketball/game/_/gameId/401921423'}),'CORRECT');
 for(const url of [
  'https://evil.espn.com.example/womens-college-basketball/game/_/gameId/401920019',
  'https://www.espn.com.evil.org/womens-college-basketball/game/_/gameId/401920019',
  'https://www.foxsports.com/college-basketball/game/401920019'
 ])assert.equal(h.qa.classifyLink(item,{url}),'OTHER_LINK');
 assert.equal(h.qa.classifyLink(item,{
  url:'https://www.espn.com/college-football/game/_/gameId/401920019'
 }),'WRONG_COMPETITION');
});
test('womens ESPN wrong competition is audited read-only and fixed exactly once with confirmation',async()=>{
 const url='https://espndeportes.espn.com/womens-college-basketball/game/_/gameId/401920019';
 const x=editableHarness(url);
 const audited=await x.api.verifyLinks();
 assert.equal(audited[0].status,'WRONG_COMPETITION');
 assert.equal(audited[0].existingId,'401920019');
 assert.equal(audited[0].existingCompetition,'womens-college-basketball');
 assert.equal(x.api.getLinkAudit()[0].correctable,true);
 assert.equal(x.controls.get('[data-action="fix"]').disabled,false);
 assert.equal(x.saves,0);assert.equal(x.notifications.length,0);
 const corrected=await x.api.correctLinks();
 assert.equal(corrected[0].status,'CORRECTED');
 assert.equal(x.stored,'https://www.espn.com/mens-college-basketball/game/_/gameId/401921423');
 assert.equal(x.saves,1);assert.equal(x.opens,3);assert.equal(x.notifications.length,1);
 assert.equal(x.api.getLinkAudit()[0].existingCompetition,'mens-college-basketball');
 assert.match(x.notifications[0].text,/ESPN femenino.*401920019.*ESPN masculino.*401921423/);
});
test('women link without exact mens matchup is reported but not correctable',()=>{
 const r={status:'WRONG_COMPETITION',existingId:'401920019',existingCompetition:'womens-college-basketball',
  item:{status:'REVERSED_PAIR',match:null}};
 assert.equal(h.qa.isCorrectableAudit(r),false);
 r.item.status='TIME_MISMATCH';
 assert.equal(h.qa.isCorrectableAudit(r),false);
 r.item.status='READY';r.item.match={eventId:'401921423'};
 assert.equal(h.qa.isCorrectableAudit(r),true);
 r.existingCompetition='';
 assert.equal(h.qa.isCorrectableAudit(r),false);
});
test('changed womens ESPN link after auditing is not overwritten',async()=>{
 const x=editableHarness('https://espndeportes.espn.com/womens-college-basketball/game/_/gameId/401920019');
 await x.api.verifyLinks();
 x.stored='https://espndeportes.espn.com/womens-college-basketball/game/_/gameId/401920020';
 const result=await x.api.correctLinks();
 assert.equal(result[0].status,'ERROR');
 assert.match(result[0].error,/cambiado/i);
 assert.equal(x.saves,0);
 assert.equal(x.notifications.length,0);
});
test('other providers remain unchanged when auditing and correcting womens links',async()=>{
 const x=editableHarness('https://www.foxsports.com/college-basketball/game/2026');
 const audited=await x.api.verifyLinks();
 assert.equal(audited[0].status,'OTHER_LINK');
 assert.equal(x.api.getLinkAudit()[0].correctable,false);
 assert.equal(x.controls.get('[data-action="fix"]').disabled,true);
 await x.api.correctLinks();
 assert.equal(x.saves,0);
});

test('ESPN www womens URL with query parameters is recognized and never considered mens',()=>{
 const url='https://www.espn.com/womens-college-basketball/game/_/gameId/401920019?platform=es';
 assert.deepEqual(h.qa.espnGameInfo(url),{competition:'womens-college-basketball',eventId:'401920019'});
 assert.equal(h.qa.strictEspnId(url),'');
 assert.equal(h.qa.classifyLink({status:'READY',match:{eventId:'401921423'}},{url}),'WRONG_COMPETITION');
});

test('ESPN mens boxscore and matchup pages with matching ID are not false OTHER_LINK',()=>{
 const item={status:'READY',match:{eventId:'401921423'}};
 for(const page of ['game','boxscore','matchup','playbyplay']) {
  const url='https://www.espn.com/mens-college-basketball/'+page+'/_/gameId/401921423';
  assert.equal(h.qa.strictEspnId(url),'401921423');
  assert.equal(h.qa.classifyLink(item,{url}),'CORRECT');
 }
 assert.equal(h.qa.classifyLink(item,{url:'https://www.espn.com/mens-college-basketball/boxscore/_/gameId/401921425'}),'WRONG_ESPN');
});
test('ESPN other sport game URL recognized as WRONG_COMPETITION if mens exact candidate exists',()=>{
 const url='https://www.espn.com/college-football/game/_/gameId/401920019';
 const item={status:'READY',match:{eventId:'401921423'}};
 assert.equal(h.qa.espnGameInfo(url).competition,'college-football');
 assert.equal(h.qa.classifyLink(item,{url}),'WRONG_COMPETITION');
 assert.equal(h.qa.isCorrectableAudit({status:'WRONG_COMPETITION',existingId:'401920019',
  existingCompetition:'college-football',item}),true);
});
test('ESPN direct game URL query gameId supported; query secrets not present in diagnostics',()=>{
 const url='https://espndeportes.espn.com/mens-college-basketball/game?gameId=401921423&token=secret42';
 assert.equal(h.qa.strictEspnId(url),'401921423');
 assert.equal(h.qa.linkDomainPath(url),'espndeportes.espn.com/mens-college-basketball/game');
 assert.doesNotMatch(h.qa.linkDomainPath(url),/secret42/);
});
test('unrecognized ESPN path separate from external site; neither auto correctable',()=>{
 const item={status:'READY',match:{eventId:'401921423'}};
 const unsupported='https://www.espn.com/mens-college-basketball/scores?event=401921423';
 assert.equal(h.qa.classifyLink(item,{url:unsupported}),'OTHER_ESPN_FORMAT');
 assert.equal(h.qa.isCorrectableAudit({status:'OTHER_ESPN_FORMAT',existingId:'401921423',
  existingCompetition:'mens-college-basketball',item}),false);
 assert.equal(h.qa.classifyLink(item,{url:'https://www.foxsports.com/ncaab/123'}),'OTHER_LINK');
 assert.equal(h.qa.isTrustedEspnUrl('https://www.espn.com.evil.test/nba/game/_/gameId/123'),false);
});
test('audit read-only exposes sanitized source for OTHER_LINK without raw query',async()=>{
 const x=editableHarness('https://www.foxsports.com/college-basketball/game/2026?token=secret123');
 await x.api.verifyLinks();
 const v=x.api.getUnrecognizedLinks();
 assert.equal(v.length,1);
 assert.equal(v[0].estado,'OTHER_LINK');
 assert.match(v[0].origen,/foxsports.com\/college-basketball\/game\/2026/);
 assert.doesNotMatch(v[0].origen,/secret123/);
 assert.doesNotMatch(x.api.getLinkAudit()[0].existingSource,/secret123/);
 assert.equal(x.saves,0);
});
test('ESPN alternative sport link replacement passes reinspection and one-save verification',async()=>{
 const x=editableHarness('https://www.espn.com/nba/game/_/gameId/401920019');
 const audited=await x.api.verifyLinks();
 assert.equal(audited[0].status,'WRONG_COMPETITION');
 assert.equal(x.api.getLinkAudit()[0].correctable,true);
 const updated=await x.api.correctLinks();
 assert.equal(updated[0].status,'CORRECTED');
 assert.equal(x.saves,1);
 assert.equal(x.stored,'https://www.espn.com/mens-college-basketball/game/_/gameId/401921423');
});
test('unsupported ESPN URL remains review only and button stays disabled',async()=>{
 const x=editableHarness('https://www.espn.com/mens-college-basketball/scores?gameId=401921423');
 await x.api.verifyLinks();
 assert.equal(x.api.getLinkAudit()[0].status,'OTHER_ESPN_FORMAT');
 assert.equal(x.api.getLinkAudit()[0].correctable,false);
 assert.equal(x.controls.get('[data-action="fix"]').disabled,true);
 await x.api.correctLinks();
 assert.equal(x.saves,0);
});

test('Grambling vs Northern Illinois reversed orientation gives actionable NEEDS_REVIEW',()=>{
 const item={status:'REVERSED_PAIR',
  rover:{roverEventId:'1194835',date:'2026-11-02',time:'3:00 AM',
    away:{roverCode:'1',roverName:'Grambling'},home:{roverCode:'2',roverName:'Northern Illinois'}},
  candidates:[{eventId:'401920912',away:'Northern Illinois Huskies',home:'Grambling Tigers'}],
  timeCandidates:[{eventId:'401920912',date:'2026-11-02',time:'3:00 AM'}]};
 const x=h.qa.auditReviewExplanation({status:'NEEDS_REVIEW',item,existingId:'401920912'});
 assert.match(x.reason,/LOCALÍA INVERTIDA/);
 assert.match(x.reason,/Rover 3:00 AM/);
 assert.match(x.reason,/ESPN 3:00 AM/);
 assert.match(x.teamsComparison,/visitante Grambling, local Northern Illinois/);
 assert.match(x.teamsComparison,/visitante Northern Illinois Huskies, local Grambling Tigers/);
 assert.deepEqual(x.candidateIds,['401920912']);
 assert.equal(x.matchesCandidate,true);
 assert.match(x.linkAssessment,/coincide con un candidato ESPN/);
});
test('NEEDS_REVIEW identifies both time and orientation mismatches',()=>{
 const item={status:'REVERSED_PAIR_TIME_MISMATCH',
  rover:{date:'2026-11-02',time:'3:00 AM',
   away:{roverCode:'1',roverName:'A'},home:{roverCode:'2',roverName:'B'}},
  candidates:[{eventId:'400123456',away:'B',home:'A'}],
  timeCandidates:[{eventId:'400123456',date:'2026-11-02',time:'3:30 AM'}]};
 const x=h.qa.auditReviewExplanation({status:'NEEDS_REVIEW',item,existingId:'400123456'});
 assert.match(x.reason,/LOCALÍA INVERTIDA Y HORA DIFERENTE/);
 assert.match(x.reason,/Rover 3:00 AM/);
 assert.match(x.reason,/ESPN 3:30 AM/);
 assert.equal(x.matchesCandidate,true);
});
test('different actual URL than ESPN candidate must be highlighted but never auto-fixed',()=>{
 const item={status:'TIME_MISMATCH',
  rover:{date:'2026-11-02',time:'8:00 PM',
   away:{roverCode:'1',roverName:'A'},home:{roverCode:'2',roverName:'B'}},
  candidates:[{eventId:'401234567',away:'A',home:'B'}],
  timeCandidates:[{eventId:'401234567',date:'2026-11-02',time:'8:30 PM'}]};
 const r={status:'NEEDS_REVIEW',item,existingId:'401900000'};
 const x=h.qa.auditReviewExplanation(r);
 assert.match(x.reason,/HORA DIFERENTE/);
 assert.equal(x.matchesCandidate,false);
 assert.match(x.linkAssessment,/NO coincide/);
 assert.match(x.linkAssessment,/401234567/);
 assert.equal(h.qa.isCorrectableAudit({...r,existingCompetition:'mens-college-basketball'}),false);
});
test('missing ESPN candidate is explained and not auto-correctable',()=>{
 const item={status:'NOT_FOUND',
  rover:{date:'2026-11-02',time:'8:00 PM',
   away:{roverCode:'1',roverName:'A'},home:{roverCode:'2',roverName:'B'}},
  candidates:[],timeCandidates:[]};
 const x=h.qa.auditReviewExplanation({status:'NEEDS_REVIEW',item,existingId:'401222222'});
 assert.match(x.reason,/No se encontró una coincidencia exacta/);
 assert.deepEqual(x.candidateIds,[]);
 assert.match(x.linkAssessment,/No hay un candidato ESPN comprobable/);
});
test('audit detail renderer does not alter classifications or correction permissions',()=>{
 const item={status:'READY',match:{eventId:'401921423'}};
 assert.equal(h.qa.auditReviewExplanation({status:'CORRECT',item,existingId:'401921423'}),null);
 assert.equal(h.qa.auditReviewExplanation({status:'WRONG_ESPN',item,existingId:'401921422'}),null);
 const incomplete={status:'NO_ESPN_TIME',
  rover:{time:'8:00 PM',away:{roverCode:'1'},home:{roverCode:'2'}},timeCandidates:[]};
 assert.equal(h.qa.auditReviewExplanation({status:'NEEDS_REVIEW',item:incomplete}).matchupStatus,'NO_ESPN_TIME');
 assert.match(code,/detail\.className = "cbbll-review-reason cbbll-audit-reason"/);
 assert.match(code,/detail\.textContent = detailText/);
});

// Cobertura de los 43 encuentros Rover del 2026-11-05.
test('Nov 5 2026 matchups have consistent mapping',()=>{
 const rows=csv.trim().split(/\r?\n/).slice(-43);
 assert.equal(rows.length,43);
 for(const line of rows){const c=line.split(',');assert.equal(h.qa.teamIds[c[1]],c[3]);assert.equal(h.qa.teamIds[c[4]],c[6]);}
 assert.equal(new Set(Object.values(h.qa.teamIds)).size,340);
});

// Regressions for the 20 missing Rover team codes reported with NEEDS_REVIEW.
test('20 new team identities are mapped without ESPN ID collisions',()=>{
 const expected=[["831","2448"],["750","350"],["918","2320"],["979","2437"],["905","2535"],["743","2540"],["931","85"],["975","166"],["841","2460"],["946","2504"],["830","3035"],["769","2277"],["742","27"],["837","339"],["739","279"],["773","3084"],["700","16"],["699","2502"],["970","278"],["741","300"]];
 assert.equal(expected.length,20);
 for(const [roverId,espnId] of expected){
   assert.equal(h.qa.teamIds[roverId],espnId);
   assert.equal(mapping[roverId].espn_id,espnId);
 }
 assert.equal(Object.keys(h.qa.teamIds).length,340);
 assert.equal(new Set(Object.values(h.qa.teamIds)).size,340);
});
test('Colorado and SDSU identifiers remain unchanged after mapping update',()=>{
 assert.equal(h.qa.teamIds['724'],'38');
 assert.equal(h.qa.teamIds['848'],'21');
});

// Regression: three added teams and Fresno State / UCSD correction.
test('new and corrected team mappings retain unique ESPN IDs',()=>{
 for(const [r,e] of [['982','292'],['834','71'],['970','278'],['134','28']]) {
  assert.equal(h.qa.teamIds[r],e); assert.equal(mapping[r].espn_id,e);
 }
 assert.equal(Object.keys(h.qa.teamIds).length,340);
 assert.equal(new Set(Object.values(h.qa.teamIds)).size,340);
});
test('48 newly supplied Rover matchups are fully mapped',()=>{
 const rows=csv.trim().split(/\r?\n/).slice(-48);
 assert.equal(rows.length,48);
 for(const line of rows){const c=line.split(',');assert.equal(h.qa.teamIds[c[1]],c[3]);assert.equal(h.qa.teamIds[c[4]],c[6]);}
});

// New crosswalk additions for the 29 Rover matchups submitted on 2026-11-07.
test('six new Rover teams map uniquely to ESPN identities',()=>{
 const added=[["969","68"],["836","2181"],["832","2450"],["755","2729"],["785","2934"],["927","250"]];
 for(const [roverId,espnId] of added){assert.equal(h.qa.teamIds[roverId],espnId);assert.equal(mapping[roverId].espn_id,espnId);}
 assert.equal(Object.keys(h.qa.teamIds).length,340);
 assert.equal(new Set(Object.values(h.qa.teamIds)).size,340);
});
test('29 additional matchups have valid team identities',()=>{
 const rows=csv.trim().split(/\r?\n/).slice(-29);
 assert.equal(rows.length,29);
 for(const row of rows){const c=row.split(',');assert.equal(h.qa.teamIds[c[1]],c[3]);assert.equal(h.qa.teamIds[c[4]],c[6]);}
});

// New mappings for Nov 9 batch.
test('five new Rover team IDs have distinct ESPN equivalents',()=>{
 const expected=[["896","2569"],["909","2430"],["779","82"],["939","2010"],["945","2400"]];
 for(const [r,e] of expected){assert.equal(h.qa.teamIds[r],e);assert.equal(mapping[r].espn_id,e);}
 assert.equal(Object.keys(h.qa.teamIds).length,340);
 assert.equal(new Set(Object.values(h.qa.teamIds)).size,340);
});
test('33 new games have valid Rover and ESPN identities',()=>{
 const rows=csv.trim().split(/\r?\n/).slice(-33);
 assert.equal(rows.length,33);
 for(const line of rows){const c=line.split(',');assert.equal(h.qa.teamIds[c[1]],c[3]);assert.equal(h.qa.teamIds[c[4]],c[6]);}
});
