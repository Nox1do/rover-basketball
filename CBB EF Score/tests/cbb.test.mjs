import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const candidate = new URL('src/CBB-Espn-Fox.user.js', root);
const source = fs.readFileSync(candidate, 'utf8');
const espn = JSON.parse(fs.readFileSync(new URL('tests/fixtures/espn-final.json', root), 'utf8'));
const fox = JSON.parse(fs.readFileSync(new URL('tests/fixtures/fox-final.json', root), 'utf8'));

function load(overrides = {}) {
  const storage = new Map();
  const context = {
    console: {log(){},warn(){},error(){},table(){}}, URL, Intl, Date, Map, Set,
    setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},
    performance, Event, CSS:{escape:x=>String(x)},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{querySelector:()=>null,querySelectorAll:()=>[]}, ...overrides
  };
  context.window=context;
  const instrumented=source.replace('    initUi();', `
    window.qa = { TEAM_MAP, normalizeGameSummary, normalizeFoxEvent, parseFoxLinescore,
      statusInfoFromCompetition, normalizeFoxStatus, firstHalfTotal, validateWritableGamePhase, parseEspnEvent,
      isHalftimeGame, isAfterHalftimeCatchUp, buildRoverResultPlan, buildRoverHalftimePlan,
      verifyFoxResult, foxSeasonFromDate, easternDateFromEspnDate,
      getRoverOrderedScoreTeams, buildGameProgressNotice, buildSourcesNotice,
      fetchGameSummary, fetchFoxEvent, fetchTeamSchedule, fetchScoreboardVariant,
      findFoxScheduleMatches, getTeamMap, getContext, verifyRoverResultControls,
      updateLinkedResult, contextGate,
      normalizeTeam: typeof normalizeBasketballCompetitor === 'function'
        ? normalizeBasketballCompetitor : normalizeFootballCompetitor,
      periodLabel: typeof basketballPeriodLabel === 'function'
        ? basketballPeriodLabel : footballPeriodLabel,
      season: typeof basketballSeasonYear === 'function' ? basketballSeasonYear : date=>date.slice(0,4)
    };`);
  vm.runInNewContext(instrumented,context);
  return {q:context.qa,context,storage};
}
const clone=x=>JSON.parse(JSON.stringify(x));
function realGame(q,{reversed=false}={}) {
  const map=Object.entries(q.TEAM_MAP);
  const mich=map.find(([,x])=>x.espn_id==='130')[0];
  const duke=map.find(([,x])=>x.espn_id==='150')[0];
  return q.normalizeGameSummary(clone(espn),{espnEventId:'401817238',mode:'auto',rover:{roverEventId:'1195994',date:'2026-02-21',away:{roverCode:reversed?duke:mich},home:{roverCode:reversed?mich:duke}}});
}
function foxLink(q,game,raw=fox) {
  return {ok:true,ids:{away:q.getTeamMap(game.expected.awayRoverCode).fox_id,home:q.getTeamMap(game.expected.homeRoverCode).fox_id},foxEvent:q.normalizeFoxEvent(clone(raw))};
}
function team(q,values,status={normalized:'FINAL',period:2}) {
  return q.normalizeTeam({team:{id:'150',displayName:'Duke'},homeAway:'home',score:String(values.reduce((n,v)=>n+v,0)),linescores:values.map(displayValue=>({displayValue:String(displayValue)}))},status);
}
function halfGame(q,{period=1,clock='0:00',detail='Halftime'}={}) {
  const g=realGame(q);
  g.status={normalized:'LIVE',state:'in',period,clock,name:'STATUS_HALFTIME',detail};
  g.away=q.normalizeTeam({team:{id:'130'},score:'33',linescores:[{displayValue:'33'}]},g.status);
  g.home=q.normalizeTeam({team:{id:'150'},score:'35',linescores:[{displayValue:'35'}]},g.status);
  return g;
}

test('311 CBB identities retain special LIU and distinct Miami teams',()=>{
  const {q}=load(); assert.equal(Object.keys(q.TEAM_MAP).length,311);
  assert.equal(q.getTeamMap('856').espn_id,'112358');
  assert.equal(q.getTeamMap('856').fox_id,'1468');
  assert.notEqual(q.getTeamMap('646').fox_id,q.getTeamMap('815').fox_id);
});

for(const [code,espnId,foxId,name] of [
  ['791','2565','411','SIU Edwars'],['786','2344','376','Longwood'],
  ['737','2463','67','CS North'],['922','2545','267','Southeastern Louisia'],
  ['772','233','416','South Dakota'],['877','25','222','California'],
  ['932','2449','490','ND State'],['962','2351','304','Loyola Marymount']
])test(`reported Rover ${code} ${name} resolves to its ESPN and FOX teams`,()=>{
  const {q}=load();const team=q.getTeamMap(code);
  assert.ok(team,`Missing Rover code ${code}`);
  assert.equal(team.espn_id,espnId);assert.equal(team.fox_id,foxId);assert.equal(team.rover_name,name);
});

for(const [code,espnId,foxId,name] of [
  ['277','2603','18','Saint Josephs'],
  ['843','2724','190','Wichita State'],
  ['901','2','245','Auburn']
])test(`screenshot team ${code} ${name} resolves to the correct ESPN and FOX IDs`,()=>{
  const {q}=load();const team=q.getTeamMap(code);assert.ok(team,`Missing Rover code ${code}`);
  assert.equal(team.espn_id,espnId);assert.equal(team.fox_id,foxId);assert.equal(team.rover_name,name);
});
test('all eleven screenshot encounters have both teams mapped in both providers',()=>{
  const {q}=load();
  for(const [away,home] of [['791','658'],['855','775'],['786','277'],['829','705'],['737','843'],['922','901'],['980','772'],['708','877'],['781','967'],['932','581'],['733','962']]){
    assert.ok(q.getTeamMap(away)?.espn_id&&q.getTeamMap(away)?.fox_id,`AWAY ${away}`);
    assert.ok(q.getTeamMap(home)?.espn_id&&q.getTeamMap(home)?.fox_id,`HOME ${home}`);
  }
});

test('California Baptist uses current Rover 984 with the same ESPN and FOX identity',()=>{
  const {q}=load();const team=q.getTeamMap('984');assert.ok(team,'Missing current Rover code 984');
  assert.equal(team.rover_name,'California Baptist');assert.equal(team.espn_id,'2856');assert.equal(team.fox_id,'648');
  assert.equal(q.getTeamMap('19210'),null);
});
test('real ESPN final normalizes two halves without manufacturing quarters',()=>{
  const {q}=load(); const g=realGame(q);
  assert.equal(g.away.h1,33);assert.equal(g.away.h2,30);assert.equal(g.away.final,63);
  assert.equal(g.home.h1,35);assert.equal(g.home.h2,33);assert.equal(g.home.ot,0);
  assert.equal(q.validateWritableGamePhase(g,'FINAL').ok,true);
});
test('real FOX final agrees with ESPN by IDs and both halves',()=>{
  const {q}=load();const g=realGame(q);const f=foxLink(q,g);
  assert.equal(f.foxEvent.left.h1,33);assert.equal(f.foxEvent.left.h2,30);
  assert.equal(q.verifyFoxResult(g,'FINAL',f).ok,true);
});
test('Rover final writes H1 to Q2, H2 to Q4, total and overtime; zeroes Q1/Q3',()=>{
  const {q}=load();const p=q.buildRoverResultPlan(realGame(q));
  assert.deepEqual(clone(p.scoreFields.map(x=>[x.id,x.value])),[
    ['1195994T1Q2Basq',33],['1195994T1Q4Basq',30],['1195994T1OTBasq',0],['1195994T1TOTBasq',63],['1195994T1Q1Basq',0],['1195994T1Q3Basq',0],
    ['1195994T2Q2Basq',35],['1195994T2Q4Basq',33],['1195994T2OTBasq',0],['1195994T2TOTBasq',68],['1195994T2Q1Basq',0],['1195994T2Q3Basq',0]]);
  assert.deepEqual(clone(p.clearFields),[]);
  assert.equal(p.statusValue,'3');assert.equal(p.editedId,'1195994-Edited');
});
test('halftime writes Q2 plus H1 total, zeroes Q1/Q3 and clears Q4/OT',()=>{
  const {q}=load();const g=halfGame(q);assert.equal(q.isHalftimeGame(g),true);
  assert.equal(q.validateWritableGamePhase(g,'HALFTIME').ok,true);
  const p=q.buildRoverHalftimePlan(g);
  assert.deepEqual(clone(p.scoreFields.map(x=>[x.id,x.value])),[['1195994T1Q2Basq',33],['1195994T1TOTBasq',33],['1195994T1Q1Basq',0],['1195994T1Q3Basq',0],['1195994T2Q2Basq',35],['1195994T2TOTBasq',35],['1195994T2Q1Basq',0],['1195994T2Q3Basq',0]]);
  assert.deepEqual(clone(p.clearFields.map(x=>x.id)),['1195994T1Q4Basq','1195994T1OTBasq','1195994T2Q4Basq','1195994T2OTBasq']);assert.equal(p.statusValue,'2');
  assert.equal(p.clearFields.some(x=>/Q2Basq/.test(x.id)),false);
});
test('H1 recovery during second half uses first-half partial instead of live total',()=>{
  const {q}=load();const g=realGame(q);g.status={normalized:'LIVE',period:2,state:'in',clock:'12:15',detail:'2nd Half'};
  assert.equal(q.isAfterHalftimeCatchUp(g),true);
  const p=q.buildRoverHalftimePlan(g,{retrospective:true});assert.equal(p.scoreFields[1].value,33);
  assert.equal(q.validateWritableGamePhase(g,'HALFTIME_CATCHUP').ok,true);
});
test('final plan remaps reversed home/away by team identity',()=>{
  const {q}=load();const g=realGame(q,{reversed:true});assert.equal(g.pairOrder,'REVERSED');
  const p=q.buildRoverResultPlan(g);assert.equal(p.scoreFields[0].value,35);assert.equal(p.scoreFields[3].value,68);
  assert.equal(q.verifyFoxResult(g,'FINAL',foxLink(q,g)).ok,true);
});
test('first-half zero remains a real zero',()=>{
  const {q}=load();const t=team(q,[0,30]);assert.equal(q.firstHalfTotal(t),0);
});
test('overtimes start at period 3 and aggregate without replacing H2',()=>{
  const {q}=load();const t=team(q,[35,33,8,5],{normalized:'FINAL',period:4});
  assert.equal(t.h2,33);assert.equal(t.ot,13);assert.equal(t.final,81);
  assert.deepEqual(clone(t.otPeriods.map(x=>[x.period,x.value])),[[3,8],[4,5]]);
});
test('missing overtime in a final-OT status is not converted to zero',()=>{
  const {q}=load();const t=team(q,[35,33],{normalized:'FINAL',period:3,detail:'Final/OT'});
  assert.equal(t.ot,'');
});
test('missing half and null line do not become zero',()=>{
  const {q}=load();const g=realGame(q);g.away.h2='';assert.equal(q.validateWritableGamePhase(g,'FINAL').ok,false);
  const t=q.normalizeTeam({team:{id:'150'},score:'35',linescores:[{value:null}]},{normalized:'FINAL',period:2});
  assert.equal(t.h1,'');assert.equal(t.ot,'');
});
test('inconsistent ESPN final blocks writing',()=>{
  const {q}=load();const g=realGame(q);g.home.final=69;assert.equal(q.validateWritableGamePhase(g,'FINAL').reason,'INCONSISTENT_ESPN_SCORE');
});
test('FOX different half or total blocks filling',()=>{
  const {q}=load();const g=realGame(q);const f=foxLink(q,g);f.foxEvent.left.h1=34;
  assert.equal(q.verifyFoxResult(g,'FINAL',f).ok,false);
});
test('FOX date mismatch blocks filling',()=>{
  const {q}=load();const g=realGame(q);const f=foxLink(q,g);f.foxEvent.date='2026-02-22';
  assert.equal(q.verifyFoxResult(g,'FINAL',f).reason,'FOX_DATE_MISMATCH');
});
test('FOX wrong pair blocks filling',()=>{
  const {q}=load();const g=realGame(q);const f=foxLink(q,g);f.foxEvent.left.foxTeamId='99999';
  assert.equal(q.verifyFoxResult(g,'FINAL',f).ok,false);
});
test('FOX still live cannot confirm final',()=>{
  const {q}=load();const g=realGame(q);const f=foxLink(q,g);f.foxEvent.status={normalized:'LIVE',period:2};
  assert.equal(q.verifyFoxResult(g,'FINAL',f).reason,'FOX_PHASE_NOT_CONFIRMED');
});
test('FOX halftime confirms only H1 even with precreated H2=0',()=>{
  const {q}=load();const g=halfGame(q);const f=foxLink(q,g);
  f.foxEvent.status={normalized:'HALFTIME',period:1};f.foxEvent.left.h2=0;f.foxEvent.right.h2=0;
  assert.equal(q.verifyFoxResult(g,'HALFTIME',f).ok,true);
});
test('FOX delayed in first half cannot confirm H1',()=>{
  const {q}=load();const g=halfGame(q);const f=foxLink(q,g);f.foxEvent.status={normalized:'DELAYED',period:1};
  assert.equal(q.verifyFoxResult(g,'HALFTIME',f).ok,false);
});
test('cancelled ESPN with completed=true is not final',()=>{
  const {q}=load();assert.equal(q.statusInfoFromCompetition({status:{type:{completed:true,state:'post',name:'STATUS_CANCELED',description:'Canceled'}}}).normalized,'CANCELED');
});
for(const status of ['CANCELED','POSTPONED','SUSPENDED']){
  test(`FOX ${status} takes priority over eventStatus=3`,()=>{
    const {q}=load();assert.notEqual(q.normalizeFoxStatus({header:{statusLine:status,eventStatus:3}}).normalized,'FINAL');
  });
}
test('only period 1 zero clock is a halftime fallback',()=>{
  const {q}=load();const g=halfGame(q,{period:1,clock:'0:00',detail:'End of 1st Half'});g.status.name='STATUS_IN_PROGRESS';
  assert.equal(q.isHalftimeGame(g),true);g.status.period=2;g.status.detail='End of 2nd Half';assert.equal(q.isHalftimeGame(g),false);
});
test('UI labels halves and multiple overtime correctly',()=>{
  const {q}=load();assert.equal(q.periodLabel({status:{period:1}}),'H1');assert.equal(q.periodLabel({status:{period:2}}),'H2');assert.equal(q.periodLabel({status:{period:4}}),'2OT');
  const g=realGame(q);g.status={normalized:'LIVE',period:2,clock:'18:00'};assert.match(q.buildGameProgressNotice(g).text,/H1 33-35.*H2/);
});
test('FOX basketball team URI works in schedule matching',()=>{
  const {q}=load();const r=q.findFoxScheduleMatches({entityLink:{webUrl:'/college-basketball/michigan-vs-duke-feb-21-2026-game-boxscore-261211',layout:{tokens:{id:'261211',eventUri:'basketball/cbk/events/261211',homeUri:'basketball/cbk/teams/23',awayUri:'basketball/cbk/teams/87'}}}},'87','23','2026-02-21');assert.equal(r.size,1);
});
for(const [date,espnSeason,foxSeason] of [['2026-11-02','2027','2026'],['2027-01-02','2027','2026'],['2027-04-05','2027','2026']]){
  test(`season years differ correctly for ${date}`,()=>{const {q}=load();assert.equal(q.season(date),espnSeason);assert.equal(q.foxSeasonFromDate(date),foxSeason);});
}
test('New York date conversion respects winter and daylight time',()=>{
  const {q}=load();assert.equal(q.easternDateFromEspnDate('2026-11-03T04:30:00Z'),'2026-11-02');assert.equal(q.easternDateFromEspnDate('2026-07-02T04:30:00Z'),'2026-07-02');
});
test('request builders use basketball endpoints and groups=50',async()=>{
  const requests=[];const {q}=load({GM:{xmlHttpRequest:async o=>{requests.push(o);return {status:200,responseText:'{"events":[]}'}}}});
  await q.fetchGameSummary('401817238');await q.fetchFoxEvent('261211');await q.fetchTeamSchedule('150','2027');await q.fetchScoreboardVariant('2026-11-02',{key:'NCAAM',group:'50'});
  assert.match(requests[0].url,/sports\/basketball\/mens-college-basketball\/summary/);
  assert.match(requests[1].url,/bifrost\/v1\/cbk\/event\/261211\/data/);
  assert.match(requests[2].url,/mens-college-basketball\/teams\/150\/schedule\?season=2027/);
  assert.equal(new URL(requests[3].url).searchParams.get('groups'),'50');
  assert.ok(requests.every(x=>x.method==='GET'));
});

test('second-half scoreboard promotes the active link as a writable H1 candidate',()=>{
  const {q}=load();const comp=clone(espn.header.competitions[0]);
  comp.status={period:2,type:{state:'in',name:'STATUS_IN_PROGRESS'}};
  const e=q.parseEspnEvent({id:'401817238',date:'2026-02-21T23:30:00Z',competitions:[comp]},'NCAAM');
  assert.equal(e.writableHint,true);
});

test('real FOX live status 2ND recognizes the second half without a HALF suffix',()=>{
  const {q}=load();const raw=JSON.parse(fs.readFileSync(new URL('tests/fixtures/fox-live.json',root),'utf8'));
  const status=q.normalizeFoxStatus(raw);assert.equal(status.normalized,'LIVE');assert.equal(status.period,2);
});

test('missing ESPN summary date blocks a result even if FOX date matches Rover',()=>{
  const {q}=load();const g=realGame(q);g.event.date='';g.event.easternDate='';
  assert.equal(q.verifyFoxResult(g,'FINAL',foxLink(q,g)).ok,false);
});
for(const state of ['CANCELED','POSTPONED','SUSPENDED'])test(`ESPN STATUS_${state} alone cannot be mistaken for Final`,()=>{
  const {q}=load();const status=q.statusInfoFromCompetition({status:{type:{name:`STATUS_${state}`,completed:true,state:'post'}}});
  assert.equal(status.normalized,state);
});

function overtimeSources(q,{aggregate=false,different=false}={}) {
  const game=realGame(q);
  game.away=team(q,[33,30,8,5],{normalized:'FINAL',period:4});game.away.teamId='130';
  game.home=team(q,[35,28,7,3],{normalized:'FINAL',period:4});game.home.teamId='150';
  const raw=clone(fox);raw.header.statusLine='FINAL/2OT';
  const labels=aggregate?['','1','2','OT','T']:['','1','2','OT','2OT','T'];
  raw.linescore.headers=[{columns:labels.map((text,index)=>({text,index}))}];
  raw.linescore.rows=(aggregate?[['MICH',33,30,13,76],['DUKE',35,28,10,73]]
    :[['MICH',33,30,different?9:8,different?4:5,76],['DUKE',35,28,7,3,73]])
    .map(row=>({columns:row.map((text,index)=>({text:String(text),index}))}));
  return {game,link:foxLink(q,game,raw)};
}
test('matching 2OT sources accept detailed periods and write OT sum to Rover',()=>{
  const {q}=load();const {game,link}=overtimeSources(q);
  assert.equal(q.validateWritableGamePhase(game,'FINAL').ok,true);
  assert.equal(q.verifyFoxResult(game,'FINAL',link).ok,true);
  assert.equal(q.buildRoverResultPlan(game).scoreFields[2].value,13);
});
test('FOX aggregated OT may match ESPN two overtime periods',()=>{
  const {q}=load();const {game,link}=overtimeSources(q,{aggregate:true});assert.equal(q.verifyFoxResult(game,'FINAL',link).ok,true);
});
test('different individual OT periods block even with the same total',()=>{
  const {q}=load();const {game,link}=overtimeSources(q,{different:true});assert.equal(q.verifyFoxResult(game,'FINAL',link).ok,false);
});
test('missing FOX OT cell is incomplete rather than a zero',()=>{
  const {q}=load();const {game,link}=overtimeSources(q);
  const raw=clone(link.foxEvent.raw);raw.linescore.rows[0].columns[3].text='';
  assert.equal(q.verifyFoxResult(game,'FINAL',foxLink(q,game,raw)).reason,'FOX_PERIODS_INCOMPLETE');
});

export {load, realGame, foxLink, clone, halfGame};
