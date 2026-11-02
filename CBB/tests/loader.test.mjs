import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const code=readFileSync(new URL('src/Rs-ESPN-CBB-Resultados.user.js',root),'utf8');
const mapping=JSON.parse(readFileSync(new URL('data/rover-espn-team-map.json',root),'utf8'));
const csv=readFileSync(new URL('data/rover-espn-matchups.csv',root),'utf8');
function harness({category='BASKETBALL',league='CBB',date='2026-11-02',feed=null,grouped=true}={}){
 const elem=()=>({style:{},hidden:false,disabled:false,textContent:'',addEventListener(){},replaceChildren(){},appendChild(){},querySelector(){return elem()},querySelectorAll(){return[]}});
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
 const context={document,console:{log(){},warn(){},error(){},table(){}},setInterval(){},getComputedStyle(){return {display:'block',visibility:'visible'}},GM:{xmlHttpRequest(opts){urls.push(opts.url);return Promise.resolve({status:200,responseText:JSON.stringify(feed?.(opts.url)||{events:[]})})}}};
 context.window=context;
 vm.runInNewContext(code,context,{timeout:2500});
 return {api:context.__CBB_LLOADER,qa:context.__CBB_LLOADER.qa,urls,dateControl,selects};
}
const h=harness();
function game(away='2511',home='2737',date='2026-11-02T23:00:00Z',id='401921423') {return {id,date,competitions:[{competitors:[{homeAway:'away',team:{id:away}},{homeAway:'home',team:{id:home}}]}]}}
function rover(away='733',home='711',time=1080,date='2026-11-02'){return {date,timeMinutes:time,away:{roverCode:away},home:{roverCode:home}}}
test('version and source CBB are correct',()=>{assert.equal(h.api.version,'0.1.0');assert.match(code,/mens-college-basketball\/scoreboard/);assert.doesNotMatch(code,/football\/college-football|__CFB_LLOADER/)});
test('all 58 original functions preserved plus four helpers',()=>{assert.equal((code.match(/(?:async\s+)?function\s+\w+/g)||[]).length,62)});
test('238 Rover IDs exactly match ESPN crosswalk',()=>{assert.equal(Object.keys(h.qa.teamIds).length,238);for(const [id,data] of Object.entries(mapping))assert.equal(h.qa.teamIds[id],data.espn_id);assert.equal(new Set(Object.values(h.qa.teamIds)).size,238)});
test('all 119 fixtures have valid away+home team IDs',()=>{const rows=csv.trim().replace(/^\uFEFF/,'').split(/\r?\n/).slice(1);assert.equal(rows.length,119);for(const line of rows){const cols=line.split(',');assert.equal(h.qa.teamIds[cols[1]],cols[3]);assert.equal(h.qa.teamIds[cols[4]],cols[6])}});
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
