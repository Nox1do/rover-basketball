import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const playwright=require(require.resolve('playwright',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const read=name=>JSON.parse(fs.readFileSync(new URL(`fixtures/${name}`,import.meta.url),'utf8'));
const originalEspn=read('espn-final.json'), originalFox=read('fox-final.json');
const schedule=read('fox-schedule-2025.json'), main=read('fox-schedule-main.json');
const map=JSON.parse(fs.readFileSync(new URL('../data/cbb-rover-espn-fox-team-map.json',import.meta.url),'utf8'));
const code=id=>Object.keys(map).find(k=>map[k].espn_id===id);
const copy=x=>JSON.parse(JSON.stringify(x));
let browser;
before(async()=>{browser=await playwright.firefox.launch({headless:true,
  ...(process.env.CBB_FIREFOX_CONTAINER ? {
    env:{...process.env,MOZ_DISABLE_CONTENT_SANDBOX:'1'},
    firefoxUserPrefs:{'security.sandbox.content.level':0}
  } : {})
});});
after(async()=>{await browser?.close();});

function fixtureHtml({rv2=false,league='CBB'}={}){
  const row=(side,name)=>`<tr><th>${name}</th>${['Q1','Q2','Q3','Q4','OT','TOT'].map(s=>`<td><input id="1195994${side}${s}Basq" name="${side}${s}[]" value="9"></td>`).join('')}</tr>`;
  const editor=`<input type="hidden" name="evento[]" value="1195994"><input type="hidden" id="1195994-Edited" value="0"><table><thead><tr><th>Equipo</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>OT</th><th>F</th></tr></thead><tbody>${row('T1','Michigan')}${row('T2','Duke')}</tbody></table><select id="1195994-Estado">${['NO INICIADO','EN PROGRESO','H1 COMPLETADO','FINALIZADO','CANCELADO'].map((x,i)=>`<option value="${i}">${x}</option>`).join('')}</select>`;
  const filters=`<label for="${rv2?'rv2_categoria':'categoria'}">CATEGORY</label><select id="${rv2?'rv2_categoria':'categoria'}"><option>BASKETBALL</option><option>FOOTBALL</option></select><label for="liga">LEAGUE</label><span ${rv2?'id="rv2_ligaC"':''}><select id="liga"><option ${league==='CBB'?'selected':''}>CBB</option><option ${league==='NBA'?'selected':''}>NBA</option></select></span><input id="${rv2?'rv2_fecha':'fecha'}" name="fecha" value="${rv2?'02/21/2026':'21/02/2026'}"><button id="rv2_searchBtn">Search</button>`;
  const list=rv2?`<div id="rv2_listContainer"><table><tr id="rv2-row-1195994" class="rv2-event-row rv2-selected"><td>1195994</td><td>${map[code('130')].rover_name}</td><td>${map[code('150')].rover_name}</td></tr></table></div>`:`<table id="tablaEventos"><tr tkt="1195994" data-content="21/02/2026"><td>#1195994</td><td>${code('130')} Michigan</td><td>${code('150')} Duke</td></tr></table>`;
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${filters}${list}<form id="test-result-form"><div id="${rv2?'rv2_editor':'resEditContainer'}">${editor}</div></form></body></html>`;
}
function responseData(phase){
  const espn=copy(originalEspn),fox=copy(originalFox);
  if(phase==='HALFTIME'){
    espn.header.competitions[0].status={period:1,displayClock:'0:00',type:{state:'in',name:'STATUS_HALFTIME',description:'Halftime',detail:'Halftime',completed:false}};
    for(const c of espn.header.competitions[0].competitors){c.linescores=c.linescores.slice(0,1);c.score=c.linescores[0].displayValue;}
    fox.header.statusLine='HALFTIME';fox.header.eventStatus=1;
    for(const r of fox.linescore.rows){r.columns.find(c=>c.index===2).text='';r.columns.find(c=>c.index===3).text=r.columns.find(c=>c.index===1).text;}
  }else if(phase==='H2'){
    espn.header.competitions[0].status={period:2,displayClock:'8:14',type:{state:'in',name:'STATUS_IN_PROGRESS',description:'In Progress',detail:'8:14 - 2nd Half',completed:false}};
    fox.header.statusLine='2ND HALF 8:14';fox.header.eventStatus=1;
  }
  return {espn,fox};
}
async function setup(t,options={}){
  const debug=message=>{if(process.env.CBB_DEBUG)console.error(message);};
  debug('setup context');
  const context=await browser.newContext({timezoneId:'America/Santo_Domingo'});
  t.after(()=>context.close());
  const page=await context.newPage();const requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(process.env.CBB_DEBUG)page.on('console',message=>console.error('BROWSER',message.text()));
  const data=responseData(options.phase||'FINAL');
  if(options.mismatch)data.fox.linescore.rows[0].columns.find(x=>x.index===1).text='34';
  const state={data,summaryHook:null,foxUnavailable:false};
  await page.exposeFunction('__testHttp',async request=>{
    requests.push(request);assert.equal(request.method,'GET');
    const url=new URL(request.url);let result;
    if(url.hostname==='site.api.espn.com'){
      if(url.pathname.endsWith('/summary')){if(state.summaryHook)await state.summaryHook();result=data.espn;}
      else result={events:[{id:'401817238',date:'2026-02-21T23:30:00Z',name:'Michigan at Duke',competitions:data.espn.header.competitions}]};
    }else if(url.hostname==='api.foxsports.com'){
      if(state.foxUnavailable)throw new Error('FOX unavailable fixture');
      if(url.pathname.endsWith('/schedule-main'))result=main;
      else if(url.pathname.includes('/schedule-segment/'))result=schedule;
      else if(url.pathname.endsWith('/data'))result=data.fox;
      else throw new Error(`Unexpected FOX request ${url.pathname}`);
    }else throw new Error(`Unexpected host ${url.hostname}`);
    return {status:200,responseText:JSON.stringify(result)};
  });
  await page.route('**/*',route=>route.fulfill({status:200,contentType:'text/html',body:fixtureHtml(options)}));
  await page.goto('http://cbb-fixture.test/');
  debug('page ready');
  await page.evaluate(rv2=>{
    window.GM={xmlHttpRequest:o=>window.__testHttp(o)};window.unsafeWindow=window;
    if(rv2)window._rv2_currentEvento='1195994';
    window.fieldEvents=[];
    window.submitEvents=0;
    document.querySelector('#test-result-form').addEventListener('submit',e=>{e.preventDefault();window.submitEvents++;});
    for(const type of ['input','change'])document.addEventListener(type,e=>window.fieldEvents.push([e.target.id,e.type]));
  },Boolean(options.rv2));
  await page.addScriptTag({path:fileURLToPath(new URL('../src/CBB-Espn-Fox.user.js',import.meta.url))});
  debug('script ready');
  if(options.league!=='NBA')await page.waitForFunction(()=>window.__CBB_ESPN_FOX.getActiveAutoLink(window.__CBB_ESPN_FOX.getCurrentRoverEvent()));
  return {page,requests,errors,state};
}
async function values(page){return page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('[id^="1195994"]')].filter(x=>'value'in x).map(x=>[x.id,x.value])));}

test('Firefox CLASSIC: full automatic match, update button, Q2/Q4 and Edited events',async t=>{
  const {page,requests,errors}=await setup(t);
  await page.locator('[data-espn-action="update-result"]').click();
  await page.waitForFunction(()=>document.getElementById('1195994-Estado').value==='3');
  const v=await values(page);
  assert.equal(v['1195994T1Q2Basq'],'33');assert.equal(v['1195994T1Q4Basq'],'30');assert.equal(v['1195994T2Q2Basq'],'35');assert.equal(v['1195994T2Q4Basq'],'33');
  assert.equal(v['1195994T1Q1Basq'],'');assert.equal(v['1195994T1Q3Basq'],'');assert.equal(v['1195994T1OTBasq'],'0');assert.equal(v['1195994T1TOTBasq'],'63');assert.equal(v['1195994-Edited'],'1');
  assert.equal(await page.evaluate(()=>window.fieldEvents.some(([id,type])=>id==='1195994T1Q2Basq'&&type==='change')),true);
  assert.equal(await page.evaluate(()=>window.submitEvents),0);
  assert.ok(requests.every(x=>x.method==='GET'));assert.deepEqual(errors,[]);
});
test('Firefox RV2: selection and editor identities allow the same Q2/Q4 plan',async t=>{
  const {page,errors}=await setup(t,{rv2:true});
  const result=await page.evaluate(()=>window.__CBB_ESPN_FOX.updateLinkedResult());
  assert.equal(result.applied,true);const v=await values(page);assert.equal(v['1195994T1Q2Basq'],'33');assert.equal(v['1195994T1Q4Basq'],'30');assert.deepEqual(errors,[]);
});
for(const phase of ['HALFTIME','H2'])test(`Firefox ${phase}: only confirmed H1 enters Q2 and total`,async t=>{
  const {page,errors}=await setup(t,{phase});const result=await page.evaluate(()=>window.__CBB_ESPN_FOX.updateLinkedResult());
  assert.equal(result.applied,true);const v=await values(page);
  assert.equal(v['1195994-Estado'],'2');assert.equal(v['1195994T1Q2Basq'],'33');assert.equal(v['1195994T1TOTBasq'],'33');
  for(const s of ['Q1','Q3','Q4','OT'])assert.equal(v[`1195994T1${s}Basq`],'');assert.deepEqual(errors,[]);
});
test('Firefox source mismatch leaves every field untouched',async t=>{
  const {page}=await setup(t,{mismatch:true});const before=await values(page);
  const result=await page.evaluate(()=>window.__CBB_ESPN_FOX.updateLinkedResult());assert.equal(result.reason,'FOX_ESPN_SCORE_MISMATCH');assert.deepEqual(await values(page),before);
});
test('Firefox unavailable FOX leaves every field untouched',async t=>{
  const {page,state}=await setup(t);state.foxUnavailable=true;const before=await values(page);
  const result=await page.evaluate(()=>window.__CBB_ESPN_FOX.updateLinkedResult());assert.equal(result.applied,false);assert.deepEqual(await values(page),before);
});
test('Firefox missing destination control blocks all writes including Edited',async t=>{
  const {page}=await setup(t);await page.locator('[id="1195994T2Q4Basq"]').evaluate(el=>el.remove());const before=await values(page);
  const result=await page.evaluate(()=>window.__CBB_ESPN_FOX.updateLinkedResult());assert.equal(result.reason,'MISSING_CONTROLS');assert.deepEqual(await values(page),before);
});
test('Firefox does not downgrade an already-final Rover event to H1',async t=>{
  const {page}=await setup(t,{phase:'HALFTIME'});await page.locator('[id="1195994-Estado"]').selectOption('3');const before=await values(page);
  const result=await page.evaluate(()=>window.__CBB_ESPN_FOX.updateLinkedResult());assert.equal(result.reason,'ROVER_ALREADY_FINAL');assert.deepEqual(await values(page),before);
});
for(const change of ['league','editor'])test(`Firefox ${change} switch during HTTP prevents stale writes`,async t=>{
  const {page,state}=await setup(t);let release,arrived;const wait=new Promise(r=>arrived=r);const gate=new Promise(r=>release=r);
  state.summaryHook=()=>{arrived();return gate;};const before=await values(page);
  const pending=page.evaluate(()=>window.__CBB_ESPN_FOX.updateLinkedResult());await wait;
  if(change==='league')await page.locator('#liga').selectOption('NBA');
  else await page.locator('input[name="evento[]"]').evaluate(el=>el.value='1195995');
  release();const result=await pending;assert.equal(result.applied,false);assert.deepEqual(await values(page),before);
});
test('Firefox NBA: script remains inactive with no result requests',async t=>{
  const {page,requests}=await setup(t,{league:'NBA'});assert.equal(await page.evaluate(()=>window.__CBB_ESPN_FOX.isCBBView()),false);
  assert.equal(await page.locator('[data-espn-action="update-result"]').count(),0);assert.equal(requests.length,0);
});
