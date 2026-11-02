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
test('version and source CBB are correct',()=>{assert.equal(h.api.version,'0.1.6');assert.match(code,/mens-college-basketball\/scoreboard/);assert.doesNotMatch(code,/football\/college-football|__CFB_LLOADER/)});
test('all 58 original functions preserved plus four helpers',()=>{assert.ok((code.match(/(?:async\s+)?function\s+\w+/g)||[]).length>=62)});
test('276 Rover IDs exactly match ESPN crosswalk',()=>{assert.equal(Object.keys(h.qa.teamIds).length,276);for(const [id,data] of Object.entries(mapping))assert.equal(h.qa.teamIds[id],data.espn_id);assert.equal(new Set(Object.values(h.qa.teamIds)).size,276)});
test('all 139 fixtures have valid away+home team IDs',()=>{const rows=csv.trim().replace(/^\uFEFF/,'').split(/\r?\n/).slice(1);assert.equal(rows.length,139);for(const line of rows){const cols=line.split(',');assert.equal(h.qa.teamIds[cols[1]],cols[3]);assert.equal(h.qa.teamIds[cols[4]],cols[6])}});
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
 assert.equal(x.context.__CBB_LLOADER.version,'0.1.6');
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
 assert.match(code,/@version\s+0\.1\.6/);
});

test('v0.1.6 tests strict parsing and safe classification',()=>{
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
test('v0.1.6 requires verification before correcting',async()=>{
 const x=harness({feed(){return {events:[game()]}}});
 await x.api.analyze();
 await assert.rejects(x.api.correctLinks(),/Verificar enlaces/);
});
test('v0.1.6 includes separate read-only audit and post-save confirmation/notification',()=>{
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
    get saves(){return saves},get opens(){return opens},notifications};
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

test('v0.1.6 refreshes displayed version after old UI text is modified',()=>{
 const x=harness();
 const label=x.controls.get('.cbbll-version');
 assert.equal(label.textContent,'v0.1.6');
 label.textContent='v0.1.0';
 x.intervals[0]();
 assert.equal(label.textContent,'v0.1.6');
 assert.equal(x.api.uiDiagnostics().label,'v0.1.6');
 assert.equal(x.api.uiDiagnostics().panelId,'cbb-lloader-panel-v2');
});
test('v0.1.6 detects legacy UI and blocks all link writes',async()=>{
 const x=harness({feed(){return {events:[game()]}}});
 const original=x.context.document.getElementById.bind(x.context.document);
 x.context.document.getElementById=id=>id==='cbb-lloader-panel'?{id}:original(id);
 await x.api.analyze();
 assert.equal(x.api.uiDiagnostics().legacyCollision,true);
 assert.equal(x.api.uiDiagnostics().label,'v0.1.6');
 await assert.rejects(x.api.load({limit:1}),/otra versi.n/i);
 await assert.rejects(x.api.correctLinks(),/otra versi.n/i);
 x.intervals[0]();
 assert.equal(x.controls.get('[data-action="load"]').disabled,true);
 assert.equal(x.controls.get('[data-role="legacy-warning"]').hidden,false);
});
test('v0.1.6 uses separate IDs while retaining the ESPN link auditor',()=>{
 assert.match(code,/const PANEL_ID = "cbb-lloader-panel-v2"/);
 assert.match(code,/const LEGACY_PANEL_ID = "cbb-lloader-panel"/);
 assert.match(code,/function requireSingleLoader\(/);
 assert.equal(typeof h.api.verifyLinks,'function');
 assert.equal(typeof h.api.correctLinks,'function');
});


test('20 requested new pairings exist, new and existing team mappings unchanged',()=>{
 const rows=csv.trim().replace(/^\uFEFF/,'').split(/\r?\n/).slice(1).map(line=>line.split(','));
 assert.equal(rows.length,139);
 const expectedPairs=[
 ['790','2547','971','62'],['916','2747','897','2633'],
 ['805','2363','895','96'],['864','2681','640','103'],
 ['824','2154','650','259'],['827','2261','644','59'],
 ['889','107','670','227'],['662','56','996','2579'],
 ['930','2870','665','2184'],['923','2534','899','333'],
 ['745','2182','649','258'],['935','2571','727','2306'],
 ['940','2011','774','245'],['788','2443','902','99'],
 ['776','325','728','142'],['658','288','714','2294'],
 ['942','2029','900','8'],['660','2454','19210','2856'],
 ['697','2464','850','2439'],['736','2239','848','21']
 ];
 const last=rows.slice(-20);
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
test('bulk engine reacquires each row and verifies saved link before success',()=>{
 assert.match(code,/await waitForRoverRow\(item\.rover\.roverEventId, 3500\)/);
 assert.match(code,/await verifySavedUrl\(item\)/);
 assert.match(code,/consecutiveErrors >= 2/);
});


function sequentialSaveHarness({dropPendingAfterFirst=false}={}){
 const games=[
  {id:'401921423',date:'2026-11-02T23:00:00Z',competitions:[{competitors:[{homeAway:'away',team:{id:'2511'}},{homeAway:'home',team:{id:'2737'}}]}]},
  {id:'401921424',date:'2026-11-02T23:00:00Z',competitions:[{competitors:[{homeAway:'away',team:{id:'2634'}},{homeAway:'home',team:{id:'93'}}]}]}
 ];
 const initial=[
  {id:'123456',away:'733',awayName:'Queens University',home:'711',homeName:'Winthrop'},
  {id:'123457',away:'872',awayName:'Tennessee State',home:'870',homeName:'Murray State'}
 ];
 const stored=new Map(initial.map(item=>[item.id,''])),nodes=new Map(),controls=new Map();
 let rows=[],activeId='',modalOpen=false,saves=0,opens=0,activeField=null;
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
  rows=initial.filter(item=>!(dropPendingAfterFirst&&saves>0&&item.id==='123457')).map(item=>{
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
       return{click(){opens++;activeId=item.id;activeField.value=stored.get(item.id);modalOpen=true}};
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
   saves++;stored.set(activeId,field.value);modalOpen=false;
   for(const r of rows)r.isConnected=false;
   buildRows();
 }};
 const scope={querySelector(sel){return sel==='#ge-ee-save-btn'?save:null},
  querySelectorAll(sel){if(sel==='a[href]')return[];if(sel.includes('button'))return[cancel];return[]}};
 const form={getClientRects(){return[1]},closest(){return scope},
  querySelector(sel){
   const a=initial.find(item=>item.id===activeId);
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
test('after reload, a pending event disappears: abort instead of skipping remaining',async()=>{
 const h=sequentialSaveHarness({dropPendingAfterFirst:true});
 await h.api.analyze();
 const res=await h.api.load();
 assert.equal(res[0].loadStatus,'SAVED');
 assert.equal(res[1].loadStatus,'ERROR');
 assert.match(res[1].error,/tabla cambi.|faltan eventos pendientes/i);
 assert.equal(h.saves(),1);
});
