(function(){
'use strict';
const E = window.AEOpt;
const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHARS_TEXT = document.getElementById('db-chars').textContent;
const CHARS_BASE = JSON.parse(CHARS_TEXT);
const BOSSES = JSON.parse(document.getElementById('db-bosses').textContent);
const BUDDIES = (()=>{ try{ return JSON.parse((document.getElementById('db-buddies')||{}).textContent||'{}')||{}; }catch(e){ return {}; } })();
const DECKS = (()=>{ try{ return JSON.parse((document.getElementById('db-decks')||{}).textContent||'[]')||[]; }catch(e){ return []; } })();
const META = (()=>{ try{ return JSON.parse((document.getElementById('db-meta')||{}).textContent||'{}')||{}; }catch(e){ return {}; } })();
const ROLE_KR = {dps:'딜러',support:'버퍼',debuffer:'디버퍼',healer:'힐러',tank:'탱커',zone:'존',breaker:'브레이커'};
const STYLE_KR = {NS:'노멀',AS:'어나더',ES:'엑스트라',AC:'이시층'};
const CONTENT_KR = c => (c||'').replace('星詠みの書架','성영의 서가').replace(/^廻生$/,'회생(과거와의 결투)').replace(/^顕現/,'현현').replace(/^外史/,'외사');
const ENEMY_TYPES = ['fire','water','earth','wind','thunder','shade','crystal','slash','pierce','blunt','magic'];
const REL_CYCLE = [null,'weak','resist','null','absorb'];
const REL_KR = {weak:'약점',resist:'내성',null:'무효',absorb:'흡수'};
const NEED_KR = {barrier_pierce:'배리어 관통',cleanse:'해제',guard:'수호·비호',status_immune:'상태이상 무효',break:'브레이크',burst:'순간 화력',sustain:'장기전',zone_control:'존 관리',single_target:'단일 대상',multi_target:'다수 대상'};
const GL_PRESETS = {
  def:{label:'기본값 따름'}, auto:{label:'자동(최적)',v:{mode:'auto'}},
  e3:{label:'속성 3',v:{mode:'preset',e:3,pa:0,po:0}}, e4:{label:'속성 4',v:{mode:'preset',e:4,pa:0,po:0}},
  e2pp2:{label:'속성 2 + 독·페 2',v:{mode:'preset',e:2,pa:1,po:1}}, pp22:{label:'독 2 + 페인 2',v:{mode:'preset',e:0,pa:2,po:2}},
  pa3:{label:'페인 3',v:{mode:'preset',e:0,pa:3,po:0}}, po3:{label:'독 3',v:{mode:'preset',e:0,pa:0,po:3}},
  mix:{label:'속성1·페1·독1',v:{mode:'preset',e:1,pa:1,po:1}}, none:{label:'없음/미각성',v:{mode:'none'}}
};
function glKey(gl){ if(!gl) return 'def'; if(gl.mode==='auto') return 'auto'; if(gl.mode==='none') return 'none';
  for(const [k,p] of Object.entries(GL_PRESETS)) if(p.v&&p.v.mode==='preset'&&p.v.e===gl.e&&p.v.pa===gl.pa&&p.v.po===gl.po) return k; return 'e3'; }
function glText(g){ if(!g) return ''; if(g.mode==='none') return '글래 없음'; const p=[]; if(g.e) p.push(g.rebel ? '반역·HP저하'+(g.e>2?'·속성'+(g.e-2):'') : '속성'+g.e); if(g.pa) p.push('페인'+g.pa); if(g.po) p.push('독'+g.po); if(g.z) p.push('각성의 힘'); return p.join('·')||'—'; }

/* ---------- 상태 ---------- */
let state = null, chars = [], prepped = [], byId = new Map(), cap = 1;
const DEF_STATE = ()=>({v:1, sample:true, owned:{}, custom:[], settings:{}, plan:{mode:'burst', enemy:{}, bossId:'', locked:[], excluded:[], backLocked:[], enemyCount:1, maxDiff:4, focus:null, weights:{b:70,s:40,t:30}, kesId:'', pledge:{nokill:false,size:6,comp:{on:false,elem:[],weap:[],n:3},turns:0}, buddy:{main:'auto',sub:'auto'}}, rosterView:{}, goals:[], buddies:{}});
const FT_KR = {slash:'참격', blunt:'타격', pierce:'돌격', magic:'마법'};
const FOCUS_LIST = ['fire','water','earth','wind','thunder','shade','crystal'].map(v=>({kind:'elem',v})).concat(['slash','blunt','pierce','magic'].map(v=>({kind:'wt',v})));
const focusLabel = f => !f ? '전체' : f.kind==='elem' ? (E.ELEM_KR[f.v]||f.v)+' 속성' : (FT_KR[f.v]||f.v);
const sameFocus = (a,b) => (!a&&!b) || (a&&b&&a.kind===b.kind&&a.v===b.v);
function settings(){ return Object.assign({}, E.DEFAULT_SETTINGS, state.settings, {enemyCount: state.plan.enemyCount||1}); }
function rebuildChars(){
  chars = CHARS_BASE.concat(state.custom||[]);
  prepped = chars.map(E.prepChar);
  byId = new Map(prepped.map(p=>[p.id,p]));
  cap = E.computeCap(prepped, settings());
  WK.dbKey = JSON.stringify(state.custom||[]);
}
function sampleOwned(){
  const o={};
  for(const c of CHARS_BASE) if(c.tier==='SS'||c.tier==='S') o[c.id]={t:80,s:!!c.stellar,m:0,g:'none',gl:null};
  return o;
}

/* ---------- 저장 (계정 db → 없으면 이 기기) ---------- */
let db=null, uid=null, saveTimer=null, storeKind='local';
const LS_KEY='aeopt_state_v1';
function setSaveText(t){ const el=$('#saveState'); if(el) el.textContent=t; }
async function loadState(){
  let loaded=null;
  try{ const raw=localStorage.getItem(LS_KEY); if(raw) loaded=JSON.parse(raw); }catch(e){}
  state = Object.assign(DEF_STATE(), loaded||{});
  state.plan = Object.assign(DEF_STATE().plan, state.plan||{});
  if(!loaded){ state.owned = sampleOwned(); state.sample=true; }
}
async function connectDb(){
  if(!window.claude || !window.claude.use) return;
  try{
    const [d,u] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if(!d||!u) return;
    const id = await u.id(); if(!id) return;
    db=d; uid=id; storeKind='account';
    const snap = await db.doc('data/users/'+uid+'/state').get();
    if(snap.exists){
      const remote = snap.data().json ? JSON.parse(snap.data().json) : null;
      if(remote && (!state._ts || (remote._ts||0) >= state._ts)){
        state = Object.assign(DEF_STATE(), remote);
        state.plan = Object.assign(DEF_STATE().plan, state.plan||{});
        rebuildChars(); renderAll(); runPlan();
      }
    }
    setSaveText('내 계정에 저장됨');
  }catch(e){ db=null; setSaveText('이 기기에만 저장됨'); }
}
function save(){
  state._ts = Date.now();
  clearTimeout(saveTimer);
  setSaveText('저장 중…');
  saveTimer = setTimeout(async ()=>{
    const json = JSON.stringify(state);
    try{ localStorage.setItem(LS_KEY, json); }catch(e){}
    if(db && uid){
      try{ await db.doc('data/users/'+uid+'/state').set({json, ts:state._ts}); setSaveText('내 계정에 저장됨'); }
      catch(e){ setSaveText('계정 저장 실패 · 이 기기에만 저장됨'); }
    } else setSaveText('이 기기에만 저장됨');
  }, 1200);
}
function touchRoster(){ if(state.sample){ state.sample=false; } shareDirty=true; save(); }

/* ---------- 탭 ---------- */
const TABS=['plan','roster','perchar','focus','goal','boss','method'];
function showTab(name){
  $$('.tab[data-tab]').forEach(t=>t.setAttribute('aria-selected', t.dataset.tab===name?'true':'false'));
  $$('.panel').forEach(p=>p.classList.toggle('on', p.id==='p-'+name));
  try{ localStorage.setItem('aeopt_tab', name); }catch(e){}
  if(name==='plan' && SHARE && shareDirty) renderShare(); // 보유가 바뀌었으면 공유 카드 다시 계산
}

/* ---------- 공용 렌더 조각 ---------- */
const elChip = e => `<span class="el ${esc(e)}">${esc(E.ELEM_KR[e]||e)}</span>`;
const alDot = a => `<span class="al ${a==='light'?'light':'shadow'}" title="${a==='light'?'천':'명'}"></span>`;
function ownedList(){ return Object.keys(state.owned).filter(id=>byId.has(id)); }
function progOf(id){ return E.charProg(byId.get(id), state.owned[id], settings()); }

/* ---------- 백그라운드 계산 (Web Worker) ----------
   엔진 <script id="engine-js">의 코드 + 아래 workerMain을 Blob 워커로 띄운다.
   워커는 가벼운 결과(id 목록·점수)만 돌려주고, 화면 쪽에서 팀을 되살려 ev·diff를 다시 계산한다.
   워커를 못 쓰면 지금처럼 메인 스레드에서 엔진을 직접 돌린다. */
function workerMain(){
  'use strict';
  /* 이 함수는 문자열로 워커에 들어간다. 바깥 변수를 쓰지 않는다. */
  const E = self.AEOpt;
  let byId = new Map();
  const liteOpt = r => r.error ? {error:r.error, results:[], evaluated:r.evaluated||0, poolSize:r.poolSize||0, focus:r.focus||null} : {
    results: r.results.map(x=>({rank:x.rank, ids:x.team.map(c=>c.id), score:x.score, rel:x.rel, norm:x.norm, miss:x.miss, recCount:x.recCount,
      reserveIds:x.reserves.map(c=>c.id), fixedBackIds:[...(x.fixedBack||[])]})),
    decks:(r.decks||[]).map(d=>({focus:d.focus, ids:d.team.map(c=>c.id), reserveIds:d.reserves.map(c=>c.id), fixedBackIds:[...(d.fixedBack||[])], score:d.score, rel:d.rel, norm:d.norm, miss:d.miss, recCount:d.recCount})),
    evaluated:r.evaluated, poolSize:r.poolSize, pool:r.pool, weights:r.weights, focus:r.focus||null};
  const litePc = r => r.error ? {error:r.error} : {
    list: r.list.map(x=>x.none ? {id:x.pc.id, none:true} : {id:x.pc.id, teamIds:x.team.map(c=>c.id), score:x.score, rel:x.rel}),
    evaluated:r.evaluated, poolSize:r.poolSize};
  self.onmessage = async e=>{
    const m = e.data;
    if(m.type==='init'){
      const chars = JSON.parse(m.base).concat(m.custom||[]);
      byId = new Map(chars.map(c=>{ const p=E.prepChar(c); return [p.id,p]; }));
      self.postMessage({type:'ready', n:byId.size});
      return;
    }
    const id = m.id;
    try{
      const owned = m.ids.filter(k=>byId.has(k)).map(k=>({pc:byId.get(k), prog:E.charProg(byId.get(k), m.own[k], m.S)}));
      const input = Object.assign({}, m.input, {owned, settings:m.S, cap:m.cap});
      const prog = f=>self.postMessage({type:'progress', id, f});
      let r;
      if(m.type==='optimize') r = liteOpt(await E.optimize(input, prog));
      else if(m.type==='perChar') r = litePc(await E.perCharBest(input, prog));
      else throw new Error('알 수 없는 요청');
      self.postMessage({type:'done', id, r});
    }catch(err){ self.postMessage({type:'error', id, msg:String(err&&err.message||err)}); }
  };
}
const WK = {ok:null, url:null, chans:{}, seq:0, dbKey:'[]'};
const CALC = window.__edenCalc = {worker:0, main:0, last:''}; // 어느 경로로 계산했는지 (확인용)
const CANCELED = {canceled:true}, FALLBACK = {fallback:true};
function calcStat(k){ CALC[k]++; CALC.last=k; }
function makeWorker(){
  if(WK.ok===false || typeof Worker==='undefined' || typeof Blob==='undefined' || !window.URL || !URL.createObjectURL){ WK.ok=false; return null; }
  try{
    if(!WK.url){
      const eng=document.getElementById('engine-js'); if(!eng) throw new Error('engine-js 없음');
      WK.url = URL.createObjectURL(new Blob([eng.textContent, '\n;(', workerMain.toString(), ')();\n'], {type:'text/javascript'}));
    }
    const w = new Worker(WK.url);
    w.postMessage({type:'init', base:CHARS_TEXT, custom:state.custom||[]});
    return w;
  }catch(e){ WK.ok=false; return null; }
}
function dropChan(chan, c, result){
  clearTimeout(c.timer);
  try{ c.w.terminate(); }catch(e){}
  if(WK.chans[chan]===c) delete WK.chans[chan];
  const j=c.job; c.job=null; if(j) j.resolve(result);
}
/* 채널(plan·pc·fx)마다 워커 하나. 같은 채널에 새 계산이 오면 하던 계산은 버린다. */
function viaWorker(chan, msg, onProgress){
  if(WK.ok===false) return Promise.resolve(FALLBACK);
  let c = WK.chans[chan];
  if(c && c.job) { dropChan(chan, c, CANCELED); c=null; }
  if(c && c.db!==WK.dbKey) { dropChan(chan, c, CANCELED); c=null; }
  if(!c){
    const w = makeWorker(); if(!w) return Promise.resolve(FALLBACK);
    c = WK.chans[chan] = {w, db:WK.dbKey, ready:false, job:null, timer:0};
    // 처음 뜰 때 응답이 없으면(차단 등) 메인 스레드로
    c.timer = setTimeout(()=>{ if(!c.ready){ WK.ok=false; dropChan(chan, c, FALLBACK); } }, 10000);
    w.onmessage = e=>{
      const m=e.data;
      if(m.type==='ready'){ c.ready=true; WK.ok=true; clearTimeout(c.timer); return; }
      const j=c.job; if(!j || m.id!==j.id) return;
      if(m.type==='progress'){ if(j.onProgress) j.onProgress(m.f); return; }
      c.job=null;
      if(m.type==='done') j.resolve(m.r);
      else { console.warn('[편성 계산] 워커 오류, 메인 스레드로 다시 계산:', m.msg); j.resolve(FALLBACK); }
    };
    w.onerror = e=>{ if(e && e.preventDefault) e.preventDefault(); if(!c.ready) WK.ok=false; dropChan(chan, c, FALLBACK); };
  }
  return new Promise(resolve=>{
    const id = ++WK.seq;
    c.job = {id, resolve, onProgress};
    try{ c.w.postMessage(Object.assign({id}, msg)); }catch(e){ c.job=null; resolve(FALLBACK); }
  });
}
function jobSnap(){
  const ids=ownedList(), own={};
  for(const id of ids) own[id]=state.owned[id];
  return {ids, own:JSON.parse(JSON.stringify(own)), S:settings(), cap};
}
const progJ = (J,id) => E.charProg(byId.get(id), J.own[id], J.S);
// timeline: 실전(N턴 총딜)의 1턴을 속도·선제 순서로 — 화면에 되살리는 팀도 엔진 탐색과 같은 값이 되게
const ctxOf = (inp, J) => Object.assign(E.buildCtx(Object.assign({pgl: pglInput()}, inp), J ? ownedJ(J) : ownedList().map(id=>({pc:byId.get(id), prog:progOf(id)}))), {timeline:true});
const ownedJ = J => J.ids.filter(id=>byId.has(id)).map(id=>({pc:byId.get(id), prog:progJ(J,id)}));
/* E.optimize와 같은 모양의 결과를 돌려준다. 새 계산에 밀려 버려지면 null */
async function calcOptimize(chan, inp, onProgress, J){
  J = J || jobSnap();
  if(inp && inp.pgl===undefined) inp = Object.assign({pgl: pglInput()}, inp);
  const lr = await viaWorker(chan, {type:'optimize', ids:J.ids, own:J.own, S:J.S, cap:J.cap, input:inp}, onProgress);
  if(lr===CANCELED) return null;
  if(lr===FALLBACK){ calcStat('main'); return E.optimize(Object.assign({}, inp, {owned:ownedJ(J), settings:J.S, cap:J.cap}), onProgress); }
  calcStat('worker');
  const ctx = ctxOf(Object.assign({}, inp, {focus: lr.focus||inp.focus||null}), J);
  const results = [];
  for(const y of lr.results||[]){
    if(y.ids.some(id=>!byId.has(id))) continue;
    const team=y.ids.map(id=>byId.get(id)), progs=y.ids.map(id=>progJ(J,id));
    results.push({rank:y.rank, team, progs, ev:E.evalTeam(team, progs, inp.enemy||null, J.S, J.cap, ctx),
      reserves:y.reserveIds.filter(id=>byId.has(id)).map(id=>byId.get(id)), score:y.score, rel:y.rel, norm:y.norm, miss:y.miss||[],
      recCount:y.recCount, diff:E.teamDifficulty(team), fixedBack:new Set(y.fixedBackIds||[])});
  }
  const decks = [];
  for(const y of lr.decks||[]){
    if(y.ids.some(id=>!byId.has(id))) continue;
    const team=y.ids.map(id=>byId.get(id)), progs=y.ids.map(id=>progJ(J,id));
    decks.push({focus:y.focus, team, progs, ev:E.evalTeam(team, progs, inp.enemy||null, J.S, J.cap, ctx), reserves:y.reserveIds.filter(id=>byId.has(id)).map(id=>byId.get(id)),
      fixedBack:new Set(y.fixedBackIds||[]), score:y.score, rel:y.rel, norm:y.norm, miss:y.miss||[], recCount:y.recCount, diff:E.teamDifficulty(team)});
  }
  return Object.assign({}, lr, {results, decks});
}
async function calcPerChar(inp, onProgress){
  const J = jobSnap();
  if(inp && inp.pgl===undefined) inp = Object.assign({pgl: pglInput()}, inp);
  const lr = await viaWorker('pc', {type:'perChar', ids:J.ids, own:J.own, S:J.S, cap:J.cap, input:inp}, onProgress);
  if(lr===CANCELED) return null;
  if(lr===FALLBACK){ calcStat('main'); return E.perCharBest(Object.assign({}, inp, {owned:ownedJ(J), settings:J.S, cap:J.cap}), onProgress); }
  calcStat('worker');
  if(lr.error) return lr;
  const ctx = ctxOf(inp, J), memo = new Map(), list = [];
  for(const y of lr.list){
    const pc=byId.get(y.id); if(!pc) continue;
    if(y.none || y.teamIds.some(id=>!byId.has(id))){ list.push({pc, none:true}); continue; }
    const k=y.teamIds.join();
    let t=memo.get(k);
    if(!t){ const team=y.teamIds.map(id=>byId.get(id)), progs=y.teamIds.map(id=>progJ(J,id));
      t={team, progs, ev:E.evalTeam(team, progs, inp.enemy||null, J.S, J.cap, ctx), diff:E.teamDifficulty(team)}; memo.set(k,t); }
    list.push({pc, score:y.score, rel:y.rel, team:t.team, progs:t.progs, ev:t.ev, diff:t.diff});
  }
  return {list, evaluated:lr.evaluated, poolSize:lr.poolSize};
}

/* ---------- 장비 추천 · 빌드 코드 (어나더에덴 빌더의 장비 데이터·계산식, 출처: 딩) ----------
   장비 데이터(ae-data.json, 약 1MB)는 처음 쓸 때만 받아 온다. 탐색은 장비 전용 워커에서 (못 쓰면 메인 스레드). */
const EQ = window.AEEq, EQ_URL = 'vendor/ae-builder/ae-data.json';
const EQS = {data:null, loading:null, w:null, wok:null, seq:0, jobs:new Map(), q:Promise.resolve(), cache:new Map()};
function eqLoad(){
  if(EQS.data) return Promise.resolve(EQS.data);
  if(!EQ || !window.AECalc) return Promise.reject(new Error('장비 계산 모듈을 불러오지 못했습니다.'));
  if(location.protocol==='file:') return Promise.reject(new Error('파일로 연 페이지에서는 장비 데이터를 받을 수 없습니다. 게시된 사이트에서 써 주세요.'));
  if(!EQS.loading) EQS.loading = fetch(new URL(EQ_URL, location.href).href)
    .then(r=>{ if(!r.ok) throw new Error('장비 데이터를 받지 못했습니다 ('+r.status+')'); return r.json(); })
    .then(d=>{ EQ.init(d); EQS.data=d; return d; })
    .catch(e=>{ EQS.loading=null; throw e; });
  return EQS.loading;
}
function eqWorkerMain(){
  'use strict';
  /* 문자열로 워커에 들어간다. 바깥 변수를 쓰지 않는다. */
  self.onmessage = async e=>{
    const m=e.data;
    if(m.type==='init'){ self.AEEq.init(m.data); return; }
    try{
      const r = await self.AEEq.optimize(m.s, m.wt, Object.assign({}, m.opts||{}, {onTick:n=>self.postMessage({type:'tick', id:m.id, n})}));
      self.postMessage({type:'done', id:m.id, r:{best:r.best, evals:r.evals, why:r.why||null}});
    }catch(err){ self.postMessage({type:'error', id:m.id, msg:String(err&&err.message||err)}); }
  };
}
function eqWorker(){
  if(EQS.w || EQS.wok===false) return EQS.w;
  try{
    const a=document.getElementById('aecalc-js'), b=document.getElementById('eqopt-js');
    if(!a||!b||typeof Worker==='undefined') throw new Error('no worker');
    const url = URL.createObjectURL(new Blob([a.textContent,'\n',b.textContent,'\n;(',eqWorkerMain.toString(),')();\n'],{type:'text/javascript'}));
    const w = new Worker(url);
    w.onmessage = e=>{ const m=e.data, j=EQS.jobs.get(m.id); if(!j) return;
      if(m.type==='tick'){ if(j.onTick) j.onTick(m.n); return; }
      EQS.jobs.delete(m.id); if(m.type==='done') j.resolve(m.r); else j.fallback(); };
    w.onerror = e=>{ if(e&&e.preventDefault) e.preventDefault(); EQS.wok=false; try{ w.terminate(); }catch(x){} EQS.w=null; const js=[...EQS.jobs.values()]; EQS.jobs.clear(); js.forEach(j=>j.fallback()); };
    w.postMessage({type:'init', data:EQS.data});
    EQS.w=w; EQS.wok=true; return w;
  }catch(e){ EQS.wok=false; return null; }
}
/* 최적 장비 탐색 (같은 조건이면 저장된 결과를 다시 씀, 한 번에 하나씩) */
async function eqOptimize(s, wt, opts, onTick){
  await eqLoad();
  const key = JSON.stringify([s, wt, opts&&opts.from||null]);
  if(EQS.cache.has(key)) return EQS.cache.get(key);
  const main = ()=>EQ.optimize(s, wt, Object.assign({}, opts||{}, {onTick})).then(r=>({best:r.best, evals:r.evals, why:r.why||null}));
  const run = ()=>new Promise((resolve, reject)=>{
    const w = eqWorker(); if(!w){ main().then(resolve, reject); return; }
    const id=++EQS.seq; EQS.jobs.set(id, {resolve, onTick, fallback:()=>main().then(resolve, reject)});
    try{ w.postMessage({id, s, wt, opts:opts||{}}); }catch(e){ EQS.jobs.delete(id); main().then(resolve, reject); }
  });
  const p = EQS.q.then(run, run); EQS.q = p.catch(()=>{});
  const r = await p; if(r && r.best) EQS.cache.set(key, r); return r;
}

const EL_B = {fire:'불',water:'물',earth:'땅',wind:'바람',thunder:'번개',shade:'그림자',crystal:'결정',none:'무속성'};
const WT_B = {slash:'베기', pierce:'찌르기', blunt:'타격', magic:'마법'};
const STAT_B = {pwr:'힘', int:'지능', spd:'속도'};
const ZONE_BLD = ['열화진','수천진','지열진','풍왕진','초뢰진','각음진','휘정진','황참진','순돌진','굉타진','환마진','성해진','쌍격진 참마','쌍격진 참돌','섬격진','월광진','견수진'];
const clampP = v => Math.max(-100, Math.min(100, Math.round(+v||0)));
const baseName = n => String(n||'').replace(/\s*\(.*\)\s*$/,'').trim();
/* 빌더 기본 스탯(물리 캐릭터 기준)을 주 스탯에 맞게 */
function eqBaseStats(kind, stat){ const s={str:237, int:162, spd:249, luck:150, mp:512}; if(kind==='mag' && stat!=='pwr'){ s.str=162; s.int=237; } return s; }
/* 캐릭터 기본 스탯(위키 Stats Index) + 천명치 보너스 → 빌더 스탯 칸 (장비 제외) */
function wikiStats(c, fate){ const w=E.statsAt(c.stats, c.fateTbl, +fate||0); return w ? {str:w.pwr, int:w.int, spd:w.spd, luck:w.lck, mp:w.mp} : null; }
const realSt = st => st && st.str && !E.isBuilderDefault(st) ? st : null;
/* 속도 +n을 채우는 장비 (딩 빌더 장비 시트 기준 최대치) */
function spdGearTip(n){
  if(n<=20) return '속도 장신구(팔찌·목걸이·반지 +20) 또는 속도 배지(+50)·힘/지능 속도 배지(+40)';
  if(n<=30) return '백요의 목걸이(+30)·별의 광휘 등 속도 +30 배지 또는 속도 배지(+50)·힘/지능 속도 배지(+40)';
  if(n<=40) return '힘/지능 속도 배지(+40) 또는 속도 배지(+50)';
  if(n<=50) return '속도 배지(+50), 또는 속도 장신구(+20~30)와 속도 +20~30 배지';
  return '속도 배지(+50)에 속도 장신구(+20~30)까지';
}
/* 캐릭터 스탯 표 (레벨 최대·장비 제외): 천명치 0 / 현재 / 255 */
const STAT_KR = {hp:'HP', mp:'MP', pwr:'힘', int:'지성', spd:'속도', end:'내구', spr:'정신', lck:'운'};
let SPD_SORTED = null;
function spdRank(v){ if(!SPD_SORTED) SPD_SORTED = prepped.filter(p=>p.stats).map(p=>p.stats[4]).sort((a,b)=>b-a); let n=0; for(const x of SPD_SORTED) if(x>v) n++; return {n:n+1, of:SPD_SORTED.length}; }
function statBoxHtml(c, t){
  if(!c.stats) return `<div class="statbox"><p class="hint">기본 스탯 자료가 없습니다 (위키 Stats Index에 없는 캐릭터). 천명 보너스만 계산에 씁니다.</p></div>`;
  const cols = [0].concat(t>0 && t<255 ? [t] : [], [255]);
  const V = cols.map(v=>E.statsAt(c.stats, c.fateTbl, v));
  const ms = c.mainStat, rk = spdRank(c.stats[4]);
  return `<div class="statbox"><table class="sttbl"><thead><tr><th scope="col">스탯</th>${cols.map(v=>`<th scope="col">천명 ${v}${v===t?' (지금)':''}</th>`).join('')}</tr></thead><tbody>
    ${E.STAT_ORDER.map(k=>`<tr${k===ms?' class="main"':''}><th scope="row">${STAT_KR[k]}${k===ms?' <span class="hint">주 스탯</span>':''}</th>${V.map(o=>`<td class="num">${o[k].toLocaleString()}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="hint">레벨 최대·장비 제외(위키 Stats Index). 천명치 255에서 힘~운 +10. 기본 속도 ${rk.n}위 / ${rk.of}명 — AF 대기 단축 기준 249는 장비 포함 속도.</p></div>`;
}
/* 조합 결과의 한 캐릭터 → 빌더 계산 조건 (평상 주력기 · 이 조합의 버프·존·약점) */
function eqCondFromTeam(x, i){
  const c=x.team[i], ev=x.ev, S=settings();
  const co = ev.normal.cores[i] || ev.sb.cores[i]; if(!co) return null;
  const z = ev.normal.zone, zt = z && z.level ? z.label.replace(/^[극절]·/,'').replace('·',' ') : '';
  const o = (x.owns&&x.owns[i]) || state.owned[c.id] || null;
  const others = x.team.filter((_,k)=>k!==i).concat(x.reserves||[]);
  const share = ev.mule ? (ev.mule.k[i]||0) : 0;
  const fate = o ? (+o.t||0) : 80;
  const st = realSt(o && o.build && o.build.st) || wikiStats(c, fate) || eqBaseStats(co.kind, co.stat);
  const s = {
    str:st.str, int:st.int, spd:st.spd, luck:st.luck, mp:st.mp, who: baseName(c.name), fate, tlv:140,
    atkCls: co.kind==='mag'?'마법':'물리', kind: STAT_B[co.stat]||'', atkType: co.kind==='mag'?'':(WT_B[co.wt]||''),
    elem: EL_B[co.el]||'무속성', range: co.tgt==='st'?'단일':'전체',
    power: Math.max(10, Math.round(co.sizeV*100*co.mult/(co.baseHits||1))), hits: Math.max(1, Math.round(co.totHits)),
    aff: co.rel==='weak'?'약점':co.rel==='resist'?'저항':'통상',
    zoneT: ZONE_BLD.includes(zt)?zt:'', zone: !!(z && z.level>=2 && ZONE_BLD.includes(zt)),
    tPain: !!(ev.A&&(ev.A.inf ? ev.A.inf.pain>=0.5 : ev.A.painAny)), tPoison: !!(ev.A&&(ev.A.inf ? ev.A.inf.poison>=0.5 : ev.A.painAny)),
    enemies: co.tgt==='aoe' ? Math.max(1, S.enemyCount||1) : 1,
    fateAllies: others.filter(m=>m.align==='light').length, meiAllies: others.filter(m=>m.align!=='light').length,
    bCrit: co.kind==='phys' ? clampP((co.critR-0.2)*100) : 0, bMcrit: co.kind==='mag' ? clampP(co.critR*100) : 0,
    bCpow: co.kind==='phys' ? clampP((co.critD||0)*100) : 0, bMcpow: co.kind==='mag' ? clampP((co.critD||0)*100) : 0,
    bStr:0, bInt:0, bSpd:0, bElemNE: co.el!=='none' ? clampP(co.elB*100) : 0, bWield: clampP(co.wB*100),
    bRes: clampP(-co.physR*100), bERes: clampP(-co.typeR*100),
    cu1: co.kind==='mag' && !!((c.self||{}).mental_focus || x.team.some(m=>(m.party||{}).mental_focus)),
    cu2: co.kind==='phys' && !!((c.self||{}).singular_focus || x.team.some(m=>(m.party||{}).singular_focus)),
    pMode:'direct', pElem: Math.round(share*(S.mulePct||0.3)*100), pDmg:0
  };
  s[{pwr:'bStr',int:'bInt',spd:'bSpd'}[co.stat]||'bStr'] = clampP(co.statB*100);
  return {s, wt: E.WEAPON_KR[c.weapon], c, own:o};
}
/* 캐릭터 평상 주력기 조건 (빌드 코드 평가용). v: {crit, pain, zone, cu} — 파티 상황 유형 */
const ZONE_OF_EL = {fire:'열화진',water:'수천진',earth:'지열진',wind:'풍왕진',thunder:'초뢰진',shade:'각음진',crystal:'휘정진'};
const ZONE_OF_WT = {slash:'황참진',pierce:'순돌진',blunt:'굉타진',magic:'환마진'};
function eqCondNeutral(c, st, fate, v){
  const pain=v.pain, zone=v.zone;
  const sk = c.main || c.sb; if(!sk) return null;
  const kind = sk.kind==='mag'?'mag':'phys', el = sk.element||c.elem||'none', tgt = sk.target==='st'?'st':'aoe';
  const T = E.SIZE_TABLE[tgt+'_'+kind+'_'+(el==='none'?'no':'el')] || E.SIZE_TABLE.aoe_phys_el;
  const sizeV = T[E.SIZE_IDX[sk.size]??3]/100, hits = Math.max(1, sk.hits||1), stat = sk.stat==='int'?'int':sk.stat==='spd'?'spd':'pwr';
  const wt = kind==='mag' ? 'magic' : (sk.weapon_type||c.wt);
  const b = realSt(st) || wikiStats(c, fate) || eqBaseStats(kind, stat);
  return {str:b.str, int:b.int, spd:b.spd, luck:b.luck, mp:b.mp, who: baseName(c.name), fate: +fate||0, tlv:140,
    atkCls: kind==='mag'?'마법':'물리', kind: STAT_B[stat], atkType: kind==='mag'?'':(WT_B[wt]||''),
    elem: EL_B[el]||'무속성', range: tgt==='st'?'단일':'전체', power: Math.max(10, Math.round(sizeV*100*Math.max(1, sk.mult||1)/hits)), hits,
    aff:'통상', zoneT: zone ? (ZONE_OF_EL[el]||ZONE_OF_WT[wt]||'') : '', zone:!!zone, tPain:!!pain, tPoison:!!pain, enemies:1,
    bCrit: kind==='phys'?v.crit:0, bMcrit: kind==='mag'?v.crit:0, cu1: kind==='mag'&&!!v.cu, cu2: kind==='phys'&&!!v.cu, pMode:'direct', pElem:0, pDmg:0};
}
const eqCode = (cond, b) => EQ.buildCode({who:cond.s.who, wt:cond.wt, equip:b.equip, ore:b.ore, wc:b.wc,
  st:{str:cond.s.str, int:cond.s.int, spd:cond.s.spd, luck:cond.s.luck, mp:cond.s.mp, fate:cond.s.fate, atkAdj:0, magAdj:0},
  p:{f:{pMode:'direct', pDmg:'0', pElem:String(cond.s.pElem||0), pAddDmg:'0', pAddElem:'0'}, l:[]}});
const builderUrl = (cond, code, id) => 'builder.html#'+new URLSearchParams(Object.assign({who:cond.s.who, wt:cond.wt}, id?{id}:{}, code?{code}:{}, {s:JSON.stringify(cond.s)})).toString();
function eqCondText(s){
  const t=[s.elem, s.range, s.hits+'타', s.atkCls+(s.kind?'('+s.kind+')':'')];
  if(s.aff!=='통상') t.push(s.aff);
  if(s.zoneT) t.push((s.zone?'극 ':'')+s.zoneT);
  const cr = s.atkCls==='마법' ? s.bMcrit : s.bCrit; if(cr) t.push('크리율 보정 '+(cr>0?'+':'')+cr+'%');
  const sb = s.bStr||s.bInt||s.bSpd; if(sb) t.push((s.bStr?'힘':s.bInt?'지능':'속도')+' +'+sb+'%');
  if(s.bElemNE) t.push('속성 대미지 +'+s.bElemNE+'%');
  if(s.bRes||s.bERes) t.push('적 내성 '+[s.bRes,s.bERes].filter(Boolean).map(v=>v+'%').join('·'));
  if(s.tPain) t.push('적 독·페인');
  if(s.pElem) t.push('P글래 공유 +'+s.pElem+'%');
  if(s.cu1||s.cu2) t.push(s.cu1?'정신통일':'심기일체');
  t.push('천명치 '+s.fate);
  return t;
}
const eqItemName = (k, b) => {
  const id=b.equip[k]; if(!id) return '<span class="hint">비움</span>';
  const it=EQ.ITEMS()[id]; if(!it) return esc(id);
  let x=esc(it.n);
  if(EQ.GS.includes(k)) x+=` <span class="hint">· ${esc(EQ.oreName(it, b.ore[k]||''))}</span>`;
  if(it.wch && b.wc && b.wc[id]) x+=` <span class="hint">· ${esc(it.wch.map((c,ci)=>(c.opts[+b.wc[id][ci]||0]||c.opts[0]).t).join(', '))}</span>`;
  return x;
};
function eqTableHtml(b, fate){
  return `<table class="eqtbl">${EQ.OPT_ALL.map(k=>{ const lk=EQ.lockOf(k, fate);
    return `<tr><th>${esc(EQ.slotLabel(k))}</th><td>${lk?`<span class="hint">잠김 · 천명치 ${lk} 필요</span>`:eqItemName(k,b)}</td></tr>`; }).join('')}</table>`;
}
/* 추천 세팅 패널의 '추천 장비 찾기' */
async function runEqRec(btn){
  const key=btn.dataset.eqrec, i=+btn.dataset.i, rec=RES.get(key); if(!rec) return;
  const box=btn.closest('.eqbox'), out=box.querySelector('.eqout');
  const cond=eqCondFromTeam(rec.x, i); if(!cond){ out.innerHTML='<p class="hint">이 캐릭터는 공격 스킬 정보가 없어 장비를 계산할 수 없습니다.</p>'; return; }
  btn.disabled=true; out.innerHTML='<p class="hint" role="status">장비 데이터를 받는 중…</p>';
  try{
    await eqLoad();
    const own=cond.own, from = own && own.build && own.build.equip && own.build.wt===cond.wt ? {equip:own.build.equip, ore:own.build.ore||{}} : null;
    const t0=Date.now();
    const r = await eqOptimize(cond.s, cond.wt, from?{from}:{}, n=>{ const el=out.querySelector('[role=status]'); if(el) el.textContent=`장비 조합을 찾는 중… ${n.toLocaleString()}개 계산 (${((Date.now()-t0)/1000).toFixed(0)}초)`; });
    if(!document.body.contains(out)) return;
    if(!r || !r.best){ out.innerHTML=`<p class="hint ng">${esc(r&&r.why||'장비를 찾지 못했습니다.')}</p>`; return; }
    const b=r.best, d=b.detail, code=eqCode(cond, b);
    let mine='';
    if(from){ const m=EQ.evalState({equip:from.equip, ore:from.ore, wc:own.build.wc||{}}, EQ.makeS(cond.s), cond.wt); if(m && m.exp>0) mine = `<div class="hint">내 빌드(보유 탭에 넣은 코드)는 이 조건에서 ${fmtN(m.exp)} → 추천 장비가 <b>${m.exp>=d.exp*0.995?'거의 같음':'+'+((d.exp/m.exp-1)*100).toFixed(1)+'%'}</b></div>`; }
    const locks=EQ.OPT_ALL.map(k=>EQ.lockOf(k,cond.s.fate)).filter(Boolean);
    out.innerHTML = `${eqTableHtml(b, cond.s.fate)}
      <div class="eqsum">기대 대미지 <b class="num">${fmtN(d.exp)}</b> <span class="hint">(일반 ${fmtN(d.n)} · 크리 ${fmtN(d.c)} · 크리율 ${+d.crit.toFixed(1)}%)</span></div>
      ${mine}
      <div class="hint">조건: ${esc(eqCondText(cond.s).join(' · '))}</div>
      ${locks.length?`<div class="hint">천명치를 올리면 ${[...new Set(locks)].sort((a,b)=>a-b).map(v=>v===120?'120: 배지 2번째 칸':'200: 글래스터 4번째 칸').join(' · ')}이 열립니다.</div>`:''}
      <div class="hint">스킬 위력은 크기·배율로 추정한 값이라 대미지 숫자는 참고용이고, 장비끼리 비교는 빌더와 같은 계산식입니다. ${r.evals.toLocaleString()}개 조합 계산.</div>
      <div class="eqbtns"><a class="btn small" href="${esc(builderUrl(cond, code, cond.c.id))}" target="_blank" rel="noopener">빌더에서 열기 ↗</a>${cond.own?` <button type="button" class="btn small" data-eqsave="${esc(cond.c.id)}">내 캐릭터 빌드로 저장</button>`:''} <span class="hint" role="status"></span></div>`;
    out.dataset.code = code;
  }catch(e){ if(document.body.contains(out)) out.innerHTML=`<p class="hint ng">${esc(e.message||e)}</p>`; }
  finally{ btn.disabled=false; }
}

/* 빌드 코드 → 보유 캐릭터 장비 (최적 장비 대비 화력 비율 · P글래 공유 · 스탯) */
async function eqApplyCode(id, text, onMsg){
  const c=byId.get(id), o=state.owned[id]; if(!c||!o) throw new Error('보유 캐릭터가 아닙니다.');
  await eqLoad();
  const R=EQ.parseCode(text); if(R.err) throw new Error(R.err);
  const wt=E.WEAPON_KR[c.weapon];
  if(R.wt && R.wt!==wt) throw new Error(`${c.name}은(는) ${wt} 캐릭터인데 이 빌드는 ${R.wt} 빌드입니다.`);
  if(!R.equip.weapon) throw new Error('빌드에 무기가 없습니다.');
  // 빌드에 캐릭터 스탯이 들어 있으면 그 값(빌더 기본값이면 무시하고 위키 기본 스탯)
  const st = realSt(R.st && R.st.str ? {str:+R.st.str, int:+R.st.int, spd:+R.st.spd, luck:+R.st.luck, mp:+R.st.mp} : null);
  const fate = R.st && R.st.fate!=null ? +R.st.fate : (+o.t||0);
  const from={equip:R.equip, ore:R.ore};
  // 장비 완성도: 파티 상황 유형 4가지에서 같은 조건의 최적 장비 대비 비율을 재고, 이 빌드에 가장 맞는 상황의 값을 쓴다
  // (빌드는 보통 쓰는 파티에 맞춰 짜므로 상황 차이가 아니라 장비 수준만 반영하려는 것)
  const V=[{crit:100,pain:1,zone:1,cu:1,n:'풀버프·극존·독페인'},{crit:100,pain:0,zone:1,cu:0,n:'크리 100%·극존'},{crit:100,pain:0,zone:0,cu:0,n:'크리 100%'},{crit:30,pain:0,zone:0,cu:0,n:'버프 적음'}];
  const r=[];
  for(let k=0;k<V.length;k++){
    if(onMsg) onMsg(`최적 장비와 비교하는 중… (${k+1}/${V.length})`);
    const s=eqCondNeutral(c, st, fate, V[k]); if(!s) throw new Error('공격 스킬 정보가 없어 평가할 수 없습니다.');
    const best=await eqOptimize(s, wt, {from, restarts:0});
    const mine=EQ.evalState({equip:R.equip, ore:R.ore, wc:R.wc||{}}, EQ.makeS(s), wt);
    r.push(+(best && best.best && best.best.v>0 ? mine.exp/Math.max(mine.exp, best.best.v) : 1).toFixed(4));
  }
  const qi=r.indexOf(Math.max(...r));
  const ps=EQ.pShares(R.equip, R.ore);
  // 장비 포함 속도·운 (속도 순서·AF 행동 수에 씀)
  let tot=null; try{ tot=EQ.statsOf({equip:R.equip, ore:R.ore, wc:R.wc||{}}, EQ.makeS(eqCondNeutral(c, st, fate, V[qi])), wt); }catch(e){}
  o.build={code:R.code, wt, equip:R.equip, ore:R.ore, wc:R.wc||{}, st, fate, q:r[qi], qn:V[qi].n, r, ps, spdTot: tot?Math.round(tot.spd):0, lckTot: tot?Math.round(tot.luck):0,
    weapon:EQ.nameOf(R.equip.weapon), miss:R.miss||[], at:new Date().toISOString().slice(0,10)};
  touchRoster();
  return o.build;
}
function buildBadge(o){
  const b=o&&o.build; if(!b) return '';
  const p=Math.round((b.q||0)*100);
  const tip=`${b.weapon} · 장비 완성도 ${p}% (${b.qn||''} 상황에서 최적 장비 대비)${b.ps&&b.ps.length?` · P글래 공유 ${b.ps.length}개`:''}${b.miss&&b.miss.length?` · 찾지 못한 장비: ${b.miss.join(', ')}`:''}`;
  return `<span class="badge${p>=97?' okb':p<85?' warn':''}" title="${esc(tip)}">장비 ${p}%</span>`;
}
function buildCtlHtml(c, o){
  const b=o.build;
  return `<span class="bld">${b?`${buildBadge(o)} <a class="lnk" href="${esc('builder.html#'+new URLSearchParams({who:baseName(c.name), wt:E.WEAPON_KR[c.weapon]||'', id:c.id, code:b.code}).toString())}" target="_blank" rel="noopener">빌더 ↗</a> <button type="button" class="lnk" data-bact="edit">코드 바꾸기</button> <button type="button" class="lnk" data-bact="del">빌드 빼기</button>`
    : `<button type="button" class="lnk" data-bact="edit" title="장비 빌더의 빌드 코드(AEB1.…)를 넣으면 실제 장비로 계산합니다">장비 빌드 코드</button>`}</span>
    <div class="bldin" hidden><input type="text" placeholder="AEB1.… (장비 빌더 → 빌드 비교 → 코드 복사)" aria-label="${esc(c.name)} 빌드 코드" autocomplete="off" spellcheck="false"><button type="button" class="btn small" data-bact="apply">적용</button><span class="hint" role="status"></span></div>`;
}
async function onBuildAct(btn){
  const row=btn.closest('.row'); if(!row) return; const id=row.dataset.id, o=state.owned[id]; if(!o) return;
  const act=btn.dataset.bact, box=row.querySelector('.bldin');
  if(act==='edit'){ box.hidden=!box.hidden; if(!box.hidden) box.querySelector('input').focus(); return; }
  if(act==='del'){ delete o.build; touchRoster(); row.outerHTML=rowHtml(byId.get(id)); return; }
  if(act==='apply'){
    const inp=box.querySelector('input'), msg=box.querySelector('[role=status]');
    btn.disabled=true; msg.textContent='장비 데이터를 받는 중…';
    try{ await eqApplyCode(id, inp.value, t=>{ msg.textContent=t; }); const cur=$(`#roster .row[data-id="${CSS.escape(id)}"]`); if(cur) cur.outerHTML=rowHtml(byId.get(id)); }
    catch(e){ msg.textContent=e.message||String(e); btn.disabled=false; }
  }
}

/* 장비 빌더에서 '편성 연구실로 보내기'로 넘어온 빌드 */
const INBOX_KEY='eden-lab-inbox';
function readInbox(){ try{ const m=JSON.parse(localStorage.getItem(INBOX_KEY)||'null'); return m&&m.code?m:null; }catch(e){ return null; } }
function renderInbox(){
  const bar=$('#inboxBar'); if(!bar) return;
  const m=readInbox(); if(!m){ bar.hidden=true; bar.innerHTML=''; return; }
  const wt=m.wt||'';
  const cands=ownedList().map(id=>byId.get(id)).filter(c=>!wt || E.WEAPON_KR[c.weapon]===wt).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  const pick=(m.id && cands.find(c=>c.id===m.id)) || cands.find(c=>baseName(c.name)===m.who) || null;
  bar.innerHTML = `<b>장비 빌더에서 보낸 빌드</b>${m.who?` (${esc(m.who)}${wt?' · '+esc(wt):''})`:wt?` (${esc(wt)})`:''}
    ${cands.length?`<select id="inboxTo" aria-label="저장할 캐릭터">${pick?'':'<option value="">캐릭터 선택…</option>'}${cands.map(c=>`<option value="${esc(c.id)}"${pick&&pick.id===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select>
    <button type="button" class="btn small" id="inboxSave">이 캐릭터 빌드로 저장</button>`:`<span class="hint">${esc(wt||'이 무기')} 보유 캐릭터가 없습니다.</span>`}
    <button type="button" class="btn small" id="inboxDrop">닫기</button> <span class="hint" role="status" id="inboxMsg"></span>`;
  bar.hidden=false;
}
async function saveInbox(){
  const m=readInbox(), id=($('#inboxTo')||{}).value; if(!m) return renderInbox();
  if(!id){ $('#inboxMsg').textContent='저장할 캐릭터를 고르세요.'; return; }
  $('#inboxSave').disabled=true;
  try{ const b=await eqApplyCode(id, m.code, t=>{ $('#inboxMsg').textContent=t; }); try{ localStorage.removeItem(INBOX_KEY); }catch(e){}
    renderInbox(); renderRoster(); flash(`${byId.get(id).name} 장비 빌드를 저장했습니다`); }
  catch(e){ $('#inboxMsg').textContent=e.message||String(e); $('#inboxSave').disabled=false; }
}

/* ---------- 버디 ---------- */
const BUD_SURV = ['tetra','tetra_as','gansu_as','choco','tyusia','jiruya','pisuke'];
const BUD_AURA = ['jiruya','moke','pitan_as','hanyamo','gansu','mea','kuramaru','kyumos','kyumos_as'];
const ownBud = ()=>Object.keys(state.buddies||{}).filter(k=>state.buddies[k] && BUDDIES[k]);
function budPick(){
  const P=state.plan, B=P.buddy||(P.buddy={main:'auto',sub:'auto'}), own=ownBud();
  if(!own.length) return {main:null, sub:null, auto:true};
  let main = B.main==='none' ? null : B.main==='auto' ? (BUD_SURV.find(k=>own.includes(k)) || own[0]) : (own.includes(B.main) ? B.main : null);
  let sub = B.sub==='none' ? null : B.sub==='auto' ? (BUD_AURA.find(k=>own.includes(k) && k!==main) || null) : (own.includes(B.sub) && B.sub!==main ? B.sub : null);
  return {main, sub};
}
function buddyInput(){ const b=budPick(); if(!b.main && !b.sub) return null; return {main: b.main?Object.assign({id:b.main}, BUDDIES[b.main]):null, sub: b.sub?Object.assign({id:b.sub}, BUDDIES[b.sub]):null}; }
const budName = k => k && BUDDIES[k] ? BUDDIES[k].kr : '';
function renderBudGrid(){
  const g=$('#budGrid'); if(!g) return;
  g.innerHTML = Object.entries(BUDDIES).map(([k,b])=>`<label><input type="checkbox" data-bud="${esc(k)}" ${state.buddies&&state.buddies[k]?'checked':''}><span>${esc(b.kr)}<span class="hint">${esc(b.jp)}</span></span></label>`).join('');
  $('#budN').textContent = ownBud().length;
}

/* ---------- 연성 P글래 보유 (무기 퍼스널리티 × 대미지 P글래, 딩 님 빌더 목록 기준) ---------- */
const PGL_WEAP = ['검','도','도끼','창','활','권갑','망치','지팡이'];
const PGL_COLS = [['fire','폭염의 힘','불'],['water','격류의 힘','물'],['earth','격진의 힘','땅'],['wind','열풍의 힘','바람'],['thunder','분뇌의 힘','번개'],['shade','검은 그림자의 힘','그림자'],['crystal','결정의 힘','결정'],['none','허공의 힘','무속성'],['hp','HP 최대 시 강화','HP 최대'],['low','HP 저하 시 강화','HP 저하'],['zone','각성의 힘','각성(극존)']];
/* 무기 외 퍼스널리티·속성 P글래(딩 빌더 목록): 전능의 힘(36종 +25%), HP 최대 시 강화(동방·서방·마수·성직자·로스트 랩 +30%, 속성 +10%), 각성의 힘(IDA 스쿨·로스트 랩 +5%), HP 저하 시 강화(미래 혁명가 +40%) */
const PGLP_COLS = [['all','전능의 힘','전능'],['hp','HP 최대 시 강화','HP 최대'],['zone','각성의 힘','각성'],['low','HP 저하 시 강화','HP 저하']];
const pglPRows = () => { const has = (x,k) => k==='all' ? E.PGL_ALL.includes(x) : k==='hp' ? E.PGL_HPMAX.includes(x) || Object.values(E.PGL_ELEMP).includes(x) : k==='zone' ? E.PGL_ZONE5.includes(x) : E.PGL_HPLOW.includes(x);
  const xs = [...E.PGL_ALL].sort((a,b)=>(E.PERS_KR[a]||a).localeCompare(E.PERS_KR[b]||b,'ko')).concat(Object.values(E.PGL_ELEMP));
  return xs.map(x=>({x, kr:E.PERS_KR[x]||x, cols:PGLP_COLS.map(([k])=>has(x,k))})); };
const pglState = () => (state.pgl = state.pgl || {});
function pglCount(){ let n=0; const P=state.pgl||{}; for(const w in P){ if(w==='_p') continue; for(const k in P[w]) if(P[w][k]>0) n++; } for(const x in (P._p||{})) for(const k in P._p[x]) if(P._p[x][k]>0) n++; return n; }
/* 엔진 입력: 표시가 하나도 없으면 null(전부 있다고 가정). '2개 이상'은 셔틀 최대 수(4)로 */
function pglInput(){ if(!pglCount()) return null; const o={}; for(const w of PGL_WEAP){ const r=(state.pgl||{})[w]||{}; o[w]={}; for(const [k] of PGL_COLS) o[w][k]= r[k]>=2 ? 2 : (r[k]||0); }
  o._p={}; const PP=(state.pgl||{})._p||{}; for(const x in PP){ o._p[x]={}; for(const [k] of PGLP_COLS) o._p[x][k] = PP[x][k]>=2 ? 2 : (PP[x][k]||0); } return o; }
function renderPglTbl(){
  const t=$('#pglTbl'); if(!t) return;
  const P=state.pgl||{}, lab=['없음','1개','2개 이상'];
  t.innerHTML = `<thead><tr><th scope="col">퍼스널리티</th>${PGL_COLS.map(([k,n,s])=>`<th scope="col" title="${esc(n)}">${esc(s)}</th>`).join('')}</tr></thead><tbody>`
    + PGL_WEAP.map(w=>`<tr><th scope="row">${esc(w)}</th>${PGL_COLS.map(([k,n])=>{ const v=(P[w]&&P[w][k])||0; return `<td><button type="button" class="pgc v${v}" data-pw="${esc(w)}" data-pk="${k}" aria-label="${esc(n)} <${esc(w)}>: ${lab[v]}">${v===0?'–':v===1?'1':'2+'}</button></td>`; }).join('')}</tr>`).join('') + '</tbody>';
  const t2=$('#pglTblP'); const PP=P._p||{};
  if(t2) t2.innerHTML = `<thead><tr><th scope="col">퍼스널리티</th>${PGLP_COLS.map(([k,n,s])=>`<th scope="col" title="${esc(n)}">${esc(s)}</th>`).join('')}</tr></thead><tbody>`
    + pglPRows().map(r=>`<tr><th scope="row">${esc(r.kr)}</th>${PGLP_COLS.map(([k,n],ci)=>{ if(!r.cols[ci]) return '<td class="na">·</td>'; const v=(PP[r.x]&&PP[r.x][k])||0; return `<td><button type="button" class="pgc v${v}" data-pp="${esc(r.x)}" data-pk="${k}" aria-label="${esc(n)} <${esc(r.kr)}>: ${lab[v]}">${v===0?'–':v===1?'1':'2+'}</button></td>`; }).join('')}</tr>`).join('') + '</tbody>';
  const n=pglCount(); $('#pglN').textContent = n ? `${n}종 표시` : (settings().pglAssumeAll ? '표시 없음 · 전부 있다고 가정' : '표시 없음 · 셔틀 공유 없음');
}

/* ---------- 결현현(결실 현현) 서약 ---------- */
function plOf(){
  const P=state.plan; const d={nokill:false,size:6,comp:{on:false,elem:[],weap:[],n:3},turns:0};
  P.pledge = Object.assign(d, P.pledge||{}); P.pledge.comp = Object.assign({on:false,elem:[],weap:[],n:3}, P.pledge.comp||{});
  return P.pledge;
}
/* 필수 캐릭터: 5성을 보유했으면 그 캐릭터, 아니면 보유한 AS(어나더 스타일) */
function kesRequired(b){ if(state.owned[b.required]) return b.required; return (b.required_alt||[]).find(a=>state.owned[a])||null; }
function plExample(b){
  const PL=plOf(); const L=(b.pledges&&b.pledges.list)||[];
  PL.nokill=false; PL.size=6; PL.comp={on:false,elem:[],weap:[],n:3}; PL.turns=0;
  for(const x of L){ for(const c of (x.conds||[{kind:x.kind}])){
    if(c.kind==='nokill') PL.nokill=true;
    else if(c.kind==='size' && c.max) PL.size=Math.min(PL.size, c.max);
    else if(c.kind==='comp' && !c.gender){ PL.comp={on:true, elem:c.elem||[], weap:c.weap||[], n:c.n||3}; }
    else if(c.kind==='turns' && c.max && (!PL.turns || c.max<PL.turns)) PL.turns=c.max;
  } }
  return b.pledges && b.pledges.as_of ? b.pledges.as_of : '';
}
function pledgeInput(b){
  const PL=plOf(), rid=kesRequired(b);
  return {required: rid || b.required, comp: PL.comp.on && (PL.comp.elem.length||PL.comp.weap.length) ? {elem:PL.comp.elem.slice(), weap:PL.comp.weap.slice(), n:+PL.comp.n||3} : null,
    size: +PL.size||6, nokill: !!PL.nokill, turns: +PL.turns||0};
}
function pledgeText(pl){
  const t=[];
  if(pl.nokill) t.push('전투불능 없이');
  if(pl.size<6) t.push(pl.size+'명 이하');
  if(pl.comp) t.push([...pl.comp.elem.map(e=>E.ELEM_KR[e]), ...pl.comp.weap.map(w=>E.WEAPON_KR[w])].join('·')+' '+pl.comp.n+'명 이상');
  if(pl.turns) t.push(pl.turns+'턴 이내');
  return t.join(' · ')||'서약 없음';
}

/* ---------- 편성 탭 ---------- */
function renderPlanControls(){
  const P=state.plan;
  $$('#modeSeg button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.mode===P.mode?'true':'false'));
  $('#bossRow').hidden = P.mode!=='boss';
  { const nb=$('#burstN'); if(nb) nb.value = String(settings().burstTurns||3); $('#nturnRow').hidden = !['weak','boss','custom'].includes(P.mode); }
  $('#weightRow').hidden = P.mode!=='custom';
  $('#kesRow').hidden = P.mode!=='kesshitsu';
  const sel=$('#bossSel');
  if(!sel.options.length){
    sel.innerHTML = '<option value="">보스 선택…</option>' + BOSSES.filter(b=>!b.kesshitsu).map(b=>`<option value="${esc(b.id)}">${esc(b.name_kr)} · ${esc(CONTENT_KR(b.content))}</option>`).join('');
  }
  sel.value = P.bossId||'';
  { // 버디
    const own=ownBud(), B=P.buddy||(P.buddy={main:'auto',sub:'auto'});
    const opt=(sel,v)=>`<option value="auto"${v==='auto'?' selected':''}>자동</option><option value="none"${v==='none'?' selected':''}>없음</option>`+own.map(k=>`<option value="${esc(k)}"${v===k?' selected':''}>${esc(budName(k))}</option>`).join('');
    $('#budMain').innerHTML=opt('m',B.main); $('#budSub').innerHTML=opt('s',B.sub);
    const pk=budPick();
    $('#budHint').textContent = own.length ? `지금 계산: 메인 ${budName(pk.main)||'없음'} · 서브 ${budName(pk.sub)||'없음'}` : '보유 캐릭터 탭의 "보유 버디"에서 가진 버디를 체크하면 버디 효과를 넣어 계산합니다.';
  }
  { // 성향 직접 조절
    const W=P.weights||(P.weights={b:70,s:40,t:30});
    [['wB','b'],['wS','s'],['wT','t']].forEach(([id,k])=>{ $('#'+id).value=W[k]; $('#'+id+'v').textContent=W[k]; });
  }
  { // 결현현
    const ks=$('#kesSel');
    if(!ks.options.length) ks.innerHTML='<option value="">보스 선택…</option>'+BOSSES.filter(b=>b.kesshitsu).map(b=>{ const rq=byId.get(b.required); return `<option value="${esc(b.id)}">${esc(b.name_kr)}${rq?' · 필수 '+esc(rq.name):''}</option>`; }).join('');
    ks.value=P.kesId||'';
    const kb=BOSSES.find(b=>b.id===P.kesId);
    if(kb){ const rid=kesRequired(kb), rq=byId.get(kb.required);
      $('#kesReq').innerHTML = `필수: <b>${esc(rq?rq.name:kb.required_jp||'')}</b>${(kb.required_alt||[]).length?` <span class="hint">(${esc(kb.required_alt.map(a=>byId.get(a)?byId.get(a).name:a).join('·'))}도 가능할 수 있음)</span>`:''} ${rid?'<span class="ok">보유</span>':'<span class="ng">미보유</span>'} · 약점 ${esc((kb.weak||[]).map(k=>E.ELEM_KR[k]||E.WT_KR[k]||k).join('·')||'없음')}`;
    } else $('#kesReq').textContent='';
    const PL=plOf();
    $('#plNokill').checked=!!PL.nokill; $('#plSize').value=String(PL.size||6); $('#plComp').checked=!!PL.comp.on; $('#plCompN').value=PL.comp.n||3; $('#plTurns').value=PL.turns||0;
    $('#plCompBox').innerHTML = E.ELEMS.map(e=>`<button type="button" data-pce="${e}" aria-pressed="${PL.comp.elem.includes(e)}">${esc(E.ELEM_KR[e])}</button>`).join('') + Object.entries(E.WEAPON_KR).map(([k,v])=>`<button type="button" data-pcw="${k}" aria-pressed="${PL.comp.weap.includes(k)}">${esc(v)}</button>`).join('');
  }
  $('#enemyGrid').innerHTML = ENEMY_TYPES.map(t=>{
    const r=P.enemy[t]||'';
    const lab = E.ELEM_KR[t]||E.WT_KR[t];
    return `<button type="button" class="etype" data-t="${t}" data-rel="${r}" aria-label="${lab} ${REL_KR[r]||'보통'}">${lab}<small>${REL_KR[r]||'보통'}</small></button>`;
  }).join('');
  $$('#countSeg button').forEach(b=>b.setAttribute('aria-pressed', +b.dataset.n===(P.enemyCount||1)?'true':'false'));
  $$('#diffSeg button').forEach(b=>b.setAttribute('aria-pressed', +b.dataset.lv===(P.maxDiff||4)?'true':'false'));
  $('#focusSeg').innerHTML = [null].concat(FOCUS_LIST).map((f,k)=>`<button type="button" data-fi="${k-1}" aria-pressed="${sameFocus(f,P.focus)?'true':'false'}">${f&&f.kind==='elem'?`<span class="dot ${f.v}"></span>`:''}${esc(f?(f.kind==='elem'?E.ELEM_KR[f.v]:FT_KR[f.v]):'전체')}</button>`).join('');
  renderChips('#lockChips', P.locked, 'locked');
  renderChips('#exChips', P.excluded, 'excluded');
  renderChips('#backChips', P.backLocked||[], 'backLocked');
  $('#optDiverse').checked = settings().diverse!==false;
  $('#optCap').checked = settings().capOn!==false;
}
function renderChips(sel, list, key){
  $(sel).innerHTML = list.filter(id=>byId.has(id)).map(id=>`<span class="chip">${esc(byId.get(id).name)}<button type="button" data-rm="${esc(id)}" data-key="${key}" aria-label="${esc(byId.get(id).name)} 빼기">×</button></span>`).join('');
}
function setupPicker(inputSel, dropSel, key, max){
  const inp=$(inputSel), drop=$(dropSel);
  let hl=-1, items=[];
  const close=()=>{ drop.hidden=true; hl=-1; };
  const refresh=()=>{
    const q=inp.value.trim().toLowerCase();
    const own=ownedList().map(id=>byId.get(id));
    items = own.filter(c=>!state.plan.locked.includes(c.id)&&!state.plan.excluded.includes(c.id)&&!(state.plan.backLocked||[]).includes(c.id))
      .filter(c=>!q || c.name.toLowerCase().includes(q) || (c.raw.name_jp||'').toLowerCase().includes(q) || c.id.includes(q)).slice(0,30);
    drop.innerHTML = items.length ? items.map((c,i)=>`<button type="button" data-i="${i}" class="${i===hl?'hl':''}">${elChip(c.elem)} ${esc(c.name)} <span class="tier ${c.tier}">${esc(c.tier)}</span></button>`).join('')
      : `<div class="hint" style="padding:8px 10px">보유 캐릭터 중 일치하는 이름이 없습니다.</div>`;
    drop.hidden=false;
  };
  const pick=i=>{
    const c=items[i]; if(!c) return;
    const L=state.plan[key] || (state.plan[key]=[]);
    if(L.length>=max){ inp.value=''; close(); return; }
    L.push(c.id); inp.value=''; close(); save(); renderPlanControls();
  };
  inp.addEventListener('focus',refresh); inp.addEventListener('input',()=>{hl=-1;refresh();});
  inp.addEventListener('keydown',e=>{
    if(drop.hidden) return;
    if(e.key==='ArrowDown'){hl=Math.min(hl+1,items.length-1);refresh();e.preventDefault();}
    else if(e.key==='ArrowUp'){hl=Math.max(hl-1,0);refresh();e.preventDefault();}
    else if(e.key==='Enter'){pick(hl<0?0:hl);e.preventDefault();}
    else if(e.key==='Escape') close();
  });
  drop.addEventListener('mousedown',e=>{ const b=e.target.closest('button[data-i]'); if(b){ e.preventDefault(); pick(+b.dataset.i);} });
  inp.addEventListener('blur',()=>setTimeout(close,120));
}

let runToken=0;
async function runPlan(){
  const P=state.plan, my=++runToken;
  const out=$('#results');
  const kes = P.mode==='kesshitsu';
  const boss = P.mode==='boss' ? BOSSES.find(b=>b.id===P.bossId) : kes ? BOSSES.find(b=>b.id===P.kesId) : null;
  if(P.mode==='boss' && !boss){ out.innerHTML=`<div class="empty">보스를 고르면 그 보스의 약점·기믹에 맞춘 1~5순위 편성을 계산합니다.</div>`; return; }
  if(kes && !boss){ out.innerHTML=`<div class="empty">결실 현현 보스를 고르고 이번 주 서약을 체크하면, 필수 캐릭터를 넣고 서약 조건에 맞는 1~5순위 편성을 계산합니다.</div>`; return; }
  if(kes && !kesRequired(boss)){ const rq=byId.get(boss.required); out.innerHTML=`<div class="empty">필수 캐릭터: <b>${esc(rq?rq.name:boss.required_jp||'')}</b> (미보유) — 이 보스는 필수 캐릭터가 파티에 있어야 도전할 수 있습니다. 보유 캐릭터 탭에서 체크해 주세요.</div>`; return; }
  const ids=ownedList();
  if(ids.length<4){ out.innerHTML=`<div class="empty">보유 캐릭터가 4명 이상이어야 편성을 짤 수 있습니다. <b>보유 캐릭터</b> 탭에서 체크해 주세요.</div>`; return; }
  const enemy={}; let any=false;
  for(const [k,v] of Object.entries(P.enemy)) if(v){ enemy[k]=v; any=true; }
  const rec = boss ? prepped.filter(c=>(boss.recommended||[]).includes(c.raw.name_jp)).map(c=>c.id) : [];
  const mode = kes ? 'boss' : P.mode;
  const pledge = kes ? pledgeInput(boss) : null;
  $('#runBtn').disabled=true; $('#prog').hidden=false; $('#prog i').style.width='0%';
  const r = await calcOptimize('plan', {locked:P.locked, excluded:P.excluded, backLocked:P.backLocked||[], mode, enemy:any?enemy:null, boss, recommendedIds:rec, maxDiff:P.maxDiff||4, focus:P.focus||null,
      weights: P.mode==='custom' ? Object.assign({}, P.weights) : null, pledge, buddy: buddyInput()},
    f=>{ if(my===runToken) $('#prog i').style.width=Math.round(f*100)+'%'; });
  if(my!==runToken || !r) return;
  $('#runBtn').disabled=false; $('#prog').hidden=true;
  if(r.error){ out.innerHTML=`<div class="empty">${esc(r.error)}</div>`; return; }
  r.pledge = pledge;
  renderResults(r, boss, any?enemy:null, P.mode);
}

function fmtN(v){ if(!isFinite(v)) return '—'; if(v>=1e12) return (v/1e12).toFixed(2)+'조'; if(v>=1e8) return (v/1e8).toFixed(v>=1e10?0:v>=1e9?1:2)+'억'; if(v>=1e4) return (v/1e4).toFixed(1)+'만'; return v.toFixed(0); }
const MODE_KR={opener:'개전 속공',burst:'최고점 딜',sustain:'지속 딜',stability:'안정성',weak:'약점 맞춤',boss:'보스 맞춤',kesshitsu:'결현현',custom:'직접 조절'};
const RES = new Map(); // 카드 키 → 결과 (추천 세팅 패널용)
function teamWarns(x, boss, enemy, ex){
  const ev=x.ev, sbz=ev.sb.zone;
  const top = ev.sb.per.indexOf(Math.max(...ev.sb.per)), co = ev.sb.cores[top];
  const warns = (x.miss||[]).slice();
  const needPierce = boss&&boss.needs&&boss.needs.barrier_pierce;
  if(needPierce && co && !co.pierce) warns.push({t:'주딜 배리어 관통 없음'});
  if(ev.survDet.heal===0) warns.push({t:'회복 수단 없음'});
  x.team.forEach((c,i)=>{ if(c.stellar && state.owned[c.id] && state.owned[c.id].s && (x.progs[i].t||0)<15) warns.push({t:c.name+': 천명치 15 미만 → 성도 스킬 미반영'}); });
  if(!ev.hasSB) warns.push({t:'성도각성 캐릭터 없음 → 스텔라 버스트 불가'});
  for(const z of (ev.sb.zones||[])) if(z.by && sbz && z.by===sbz.by) for(const u of (z.unmet||[])) warns.push({t:(byId.get(z.by)?byId.get(z.by).name:'')+': '+u});
  if(sbz && sbz.how==='스킬 각성') warns.push({t:'극존은 스킬로 각성해야 함(준비 1턴)'});
  if(enemy && ev.sb.cores.some(c=>c&&(c.rel==='null'||c.rel==='absorb'))) warns.push({t:'무효·흡수 당하는 공격자 포함'});
  for(const n of ex.notes){
    if(n.lvl==='ok') continue;
    const short = n.text.length>46 ? n.text.slice(0,46)+'…' : n.text;
    warns.push({t:`${n.name}: ${n.lvl==='off'?'버프 조건 미충족':'버프 일부만 적용'} — ${short}`, full:n.text});
  }
  if(ex.posTotal && ex.posOk<ex.posTotal) warns.push({t:`위치 버프 ${ex.posTotal}개 중 ${ex.posOk}개만 동시에 성립`});
  const seen=new Set(); return warns.filter(w=>{ if(seen.has(w.t)) return false; seen.add(w.t); return true; });
}
function memHtml(x, i, key, focus, lockSet){
  const c=x.team[i], ev=x.ev, cs=ev.sb.cores[i], sbTot=ev.sb.per.reduce((a,b)=>a+b,0)||1, share=ev.sb.per[i]/sbTot;
  const gq = cs&&cs.gq;
  const off = focus && !E.charFocusMatch(c, focus);
  const notMine = x.shared && x.real && !x.mine[i];
  return `<div class="mem${lockSet&&lockSet.has(c.id)?' locked':''}" role="button" tabindex="0" aria-expanded="false" data-sk="${key}" data-i="${i}" title="눌러서 추천 세팅 보기">
    <div class="nm">${esc(c.name)}${notMine?' <span class="badge warn">미보유</span>':''}</div>
    <div class="meta">${elChip(c.elem)} ${esc(E.WEAPON_KR[c.weapon]||c.weapon)} ${alDot(c.align)} <span class="tier ${c.tier}">${esc(c.tier)}</span> ${(c.roles||[]).slice(0,2).map(r=>esc(ROLE_KR[r]||r)).join('·')}</div>
    <div class="sk">${cs?(cs.usingSB?'SB ':'')+esc(cs.skill||''):''}${cs&&cs.rel?` · <b>${esc(REL_KR[cs.rel])}</b>`:''}</div>
    <div class="sk">${gq?'글래 '+esc(glText(gq))+(gq.painOK||!(gq.pa||gq.po)?'':' (독·페 미부여)'):''}</div>
    <div class="share" title="SB 턴 대미지 비중 ${(share*100).toFixed(0)}%"><i style="width:${(share*100).toFixed(0)}%"></i></div>
    <div class="sk">SB 턴 비중 <span class="num">${(share*100).toFixed(0)}%</span>${off?' <span class="badge">지정 외 · 지원</span>':''}</div>
    <div class="tap">추천 세팅 ▾</div>
  </div>`;
}
const HOT = {opener:'o',burst:'b',sustain:'s',stability:'t',weak:'s',boss:'',kesshitsu:'',custom:''};
function renderResults(r, boss, enemy, mode){
  const P=state.plan, out=$('#results');
  mode = mode||P.mode;
  for(const k of [...RES.keys()]) if(k[0]==='p') RES.delete(k);
  let h='';
  if(state.sample) h+=`<div class="notice">예시 보유 목록(SS·S 티어 전원, 천명치 80, 성도각성 완료 가정)으로 계산한 결과입니다. <b>보유 캐릭터</b> 탭에서 실제 보유·천명치·글래스터를 입력하면 그 기준으로 다시 짭니다.</div>`;
  const enemyTxt = enemy ? Object.entries(enemy).map(([k,v])=>(E.ELEM_KR[k]||E.WT_KR[k])+' '+REL_KR[v]).join(', ') : '중립(약점·내성 없음)';
  const W=r.weights, wTxt = mode==='custom'&&W ? ` (공격성 ${Math.round(W.b*100)}% · 유지력 ${Math.round(W.s*100)}% · 안정성 ${Math.round(W.t*100)}%)` : '';
  h+=`<div class="runmeta">${esc(MODE_KR[mode])}${esc(wTxt)}${r.pledge?' · 서약: <b>'+esc(pledgeText(r.pledge))+'</b>':''}${r.focus?' · <b>'+esc(focusLabel(r.focus))+'</b> 화력만':''} · 상대 ${esc(boss?boss.name_kr:'')}${boss?' — ':''}${esc(enemyTxt)} · 적 ${P.enemyCount||1}체${(P.maxDiff||4)<4?` · 난이도 Lv${P.maxDiff} 이하`:''} · 후보 ${r.poolSize}명에서 ${r.evaluated.toLocaleString()}개 조합 평가</div>`;
  if(!r.results.length) h+=`<div class="empty">조건을 만족하는 조합이 없습니다. 난이도 상한을 올리거나 고정·제외 캐릭터를 줄여 보세요.</div>`;
  const all=r.results, mx=k=>Math.max(...all.map(y=>y.ev[k]));
  const ref = all.length ? {sbTurn:all[0].ev.sbTurn, af:mx('af'), sustain:mx('sustain'), surv:mx('surv')} : null;
  const lockSet=new Set(P.locked);
  for(const x of all){
    const key='p'+x.rank; RES.set(key, {x, focus:r.focus, mode, bossId:boss?boss.id:''});
    h+=cardHtml(x, key, {boss, enemy, focus:r.focus, ref, hot:HOT[mode], lockSet});
  }
  const decks=(r.decks||[]).filter(d=>!all.some(x=>sameTeam(x.team,d.team)));
  if(decks.length){
    h+=`<section class="decks"><h3>속성덱 · 타입덱</h3><p class="hint" style="margin:0">전방 3명 이상이 같은 속성·공격 타입으로 싸우는 조합 중 가장 좋은 것. 점수는 위 1위를 100으로 둔 값입니다. 눌러서 자세히 보기.</p>`;
    decks.forEach((d,k)=>{ const key='d'+k; d.rank=k+1; RES.set(key,{x:d, focus:r.focus, mode, bossId:boss?boss.id:''}); DECKCTX[key]={boss, enemy, focus:r.focus, ref, hot:HOT[mode], lockSet};
      h+=`<button type="button" class="deckrow" data-deck="${key}" aria-expanded="false"><span class="dk">${d.focus.kind==='elem'?`<span class="dot ${d.focus.v}"></span> `:''}${esc(focusLabel(d.focus))}</span><span class="dm">${d.team.map(c=>esc(c.name)).join(', ')}</span><span class="num">${(d.rel*100).toFixed(0)}</span></button><div class="deckcard" id="dc-${key}" hidden></div>`; });
    h+='</section>';
  }
  out.innerHTML=h;
}
const DECKCTX={};
const sameTeam=(a,b)=>a.length===b.length && a.every(c=>b.some(d=>d.id===c.id));
function toggleDeck(btn){
  const key=btn.dataset.deck, box=$('#dc-'+key), rec=RES.get(key); if(!box||!rec) return;
  const open=btn.getAttribute('aria-expanded')==='true';
  btn.setAttribute('aria-expanded', open?'false':'true');
  if(open){ box.hidden=true; return; }
  if(!box.innerHTML){ const o=DECKCTX[key]; box.innerHTML=cardHtml(rec.x, key, o).replace('<div class="rank">'+rec.x.rank+'<small>위</small></div>', `<div class="rank" style="font-size:15px">${esc(focusLabel(rec.x.focus))}</div>`); }
  box.hidden=false;
}
/* 버디 줄: 지금 계산한 버디 + 화력 위주 추천 메인 */
function budLine(x, o){
  const own=ownBud(); if(!own.length) return '';
  const cur=buddyInput(); const cm=cur&&cur.main?cur.main.id:null, cs=cur&&cur.sub?cur.sub.id:null;
  let tip='';
  try{
    const BV = ev => state.plan.mode==='burst' ? ev.dummyT : ev.burst;
    if(!x._budBest){ let best=null; const base=BV(x.ev);
      for(const k of own){ if(k===cs) continue; const bd={main:Object.assign({id:k},BUDDIES[k]), sub:cur&&cur.sub||null};
        const ev=E.evalTeam(x.team, x.progs, o&&o.enemy||null, x.S||settings(), cap, {focus:o&&o.focus||null, buddy:bd});
        if(!best || BV(ev)>best.v) best={k, v:BV(ev)}; }
      x._budBest = best && best.k!==cm && best.v>base*1.03 ? {k:best.k, g:best.v/base-1} : null; }
    if(x._budBest) tip = ` · 화력 위주면 메인 버디 <b>${esc(budName(x._budBest.k))}</b> (세팅 후 폭딜 +${(x._budBest.g*100).toFixed(0)}%)`;
  }catch(e){}
  return `<div class="hint">버디: 메인 ${esc(budName(cm)||'없음')} · 서브 ${esc(budName(cs)||'없음')}${tip}</div>`;
}
/* 턴별 화력 줄: 1턴(보장~속도 맞춤) · 2턴 · SB · AF */
function tlOf(x, o){
  const ev=x.ev; if(ev.tl) return ev.tl;
  const boss=o&&o.boss;
  try{ ev.tl = E.turnTimeline(x.team, x.progs, o&&o.enemy||null, x.S||settings(), cap, {focus:o&&o.focus||null, needPierce:!!(boss&&boss.needs&&boss.needs.barrier_pierce)}, ev); }catch(e){ ev.tl=null; }
  return ev.tl;
}
/* N턴 계산 순서 한 줄: 턴별 AF·SB 발동과 그 턴 대미지 */
function bsimHtml(ev){
  const b=ev.bsim; if(!b || !b.turns || !b.turns.length) return '';
  const st=b.afStart||{g:50,why:[]};
  const turn = r=>`<li><b>${r.t}턴</b> <span class="hint">AF ${Math.round(r.g)}% · SB ${ev.hasSB?Math.round(r.s)+'%':'—'}</span> ${r.af?`<span class="tag">AF${r.af<100?` ${r.af}%`:''}</span> `:''}${r.sb==='af'?`<span class="tag">AF 끝에 SB ×${r.combo.toFixed(1)}</span> `:r.sb==='turn'?'<span class="tag">SB</span> ':''}<span class="num">${fmtN(r.d)}</span></li>`;
  return `<div class="bsim"><div class="hint">실전 참고: 개전부터 ${b.N}턴 총 <b class="num">${fmtN(b.total)}</b> · 시작 AF ${st.g}%${st.why&&st.why.length?` (${esc(st.why.join(', '))})`:''} · 시작 SB ${ev.hasSB?Math.round(b.s0)+'%':'성도 없음'}</div><ol>${b.turns.map(turn).join('')}</ol></div>`;
}
/* 최고점 = 허수아비 어포딜 한 줄: AF 행동 딜 + AF 끝 SB(콤보 배율) */
function dummyHtml(x){
  const d=x.ev.dummy; if(!d || d.fast) return '';
  const nm=i=>esc(x.team[i].name), tot=d.per.reduce((a,b)=>a+b,0)||1;
  const top=d.per.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).filter(p=>p[0]/tot>=0.05).map(([v,i])=>`${nm(i)} ${Math.round(v/tot*100)}%`).join(' · ');
  const ord=(x.ex&&x.ex.order)||d.n.map((_,i)=>i);
  const sbTxt = d.sbWhen ? ` + SB <span class="num">${fmtN(d.sb)}</span> <span class="hint">(AF ${d.sbAt}번째 행동에서 SB 게이지 100%)</span>` : d.sbNeed ? ` <span class="hint">· SB 못 씀 (AF가 끝날 때 SB 게이지 ${Math.round(d.sbGauge)}%)</span>` : ' <span class="hint">· 성도 없음</span>';
  const mu = d.mule && d.mule.auto && !(d.mule.inv) ? ' · 후열 연성 P글래 셔틀 2명 가정' : '';
  return `<div class="dummy"><div><b>최고점(허수아비 어포딜)</b> <b class="num">${fmtN(d.total)}</b> = AF 행동 <span class="num">${fmtN(d.af)}</span> <span class="hint">(${ord.map(i=>nm(i)+' '+d.n[i]).join(' · ')}회, 콤보 75%→${Math.round(d.fin*100)}%)</span>${sbTxt}</div><div class="hint">허수아비 1턴 · AF 100%로 시작 · 존 ${esc(d.zFull&&d.zFull.level?d.zFull.label+(d.zFull.byName?' ('+d.zFull.byName+')':''):'없음')}${d.sbAt!=null&&x.ev.sb.zone&&x.ev.sb.zone.level&&x.ev.sb.zone.how==='SB 시'&&(!d.zFull||x.ev.sb.zone.key!==d.zFull.key)?' → SB 후 '+esc(x.ev.sb.zone.label):''} · 왼쪽 버퍼부터 행동하며 버프를 깔고, 버프는 행동한 뒤부터${mu} · 딜 비중 ${top}</div></div>`;
}
function timelineHtml(x, o){
  const tl=tlOf(x,o), ev=x.ev; if(!tl) return dummyHtml(x)+bsimHtml(ev);
  const pTxt = tl.known ? (tl.p>=0.99?'버퍼가 모두 빠름':tl.p<=0.01?'버퍼가 모두 느림':`버퍼가 빠른 쌍 ${Math.round(tl.p*100)}%`) : '속도 모름 → 반반';
  const cell=(k,v,sub,hot)=>`<div class="tlc${hot?' hot':''}"><div class="k">${k}</div><div class="v">${fmtN(v)}</div>${sub?`<div class="s">${sub}</div>`:''}</div>`;
  return `<div class="tline" aria-label="턴별 화력">
    ${cell('1턴', tl.t1, `보장 ${fmtN(tl.t1g)} ~ 속도 맞춤 ${fmtN(tl.t1u)}<br>${esc(pTxt)}`, o.hot==='o')}
    ${cell('2턴', tl.t2, '버프 깔린 평타 턴')}
    ${cell('SB 턴', ev.sbTurn, ev.hasSB?'게이지 차면':'성도 없음')}
    ${cell('AF 1회', ev.af, `${ev.afA&&ev.afA.auto?`행동 ${ev.afA.n.join('·')}회 · 약 ${ev.afA.dur.toFixed(0)}초 · `:''}콤보 ${(ev.avgCombo*100).toFixed(0)}%${ev.afTurns?` · 약 ${ev.afTurns.toFixed(1)}턴마다 (턴당 게이지 ${Math.round(ev.afGain)}%)`:''}`)}
  </div>${dummyHtml(x)}${bsimHtml(ev)}`;
}
/* 결과 카드 한 장. 편성 추천 결과와 공유받은 조합이 같이 쓴다. */
function cardHtml(x, key, o){
  const boss=o.boss, enemy=o.enemy, ref=o.ref, hot=o.hot, shared=!!x.shared;
  const ev=x.ev, sbz=ev.sb.zone, nz=ev.normal.zone;
  const ex = x.ex = E.explainTeam(x.team, x.progs, ev, x.S||settings(), {});
  const top = ev.sb.per.indexOf(Math.max(...ev.sb.per));
  const co = ev.sb.cores[top];
  const tSum = x.progs.reduce((a,p)=>a+(p.t||0),0);
  const warns = teamWarns(x, boss, enemy, ex);
  const order = ex.order;
  const rel = k => ref ? ev[k]/(ref[k]||1) : null;
  return `<section class="card${x.rank===1?' first':''}${shared?' shared':''}">
      ${o.head||''}
      <div class="card-head">
        <div class="rank">${shared?'<span class="rk-s">공유</span>':`${x.rank}<small>위</small>`}</div>
        <span class="diff lv${x.diff.lv}" title="운용 난이도 점수 ${x.diff.v.toFixed(1)}">Lv${x.diff.lv} ${esc(x.diff.kr)}</span>
        <span class="zonebadge" title="스텔라 버스트 턴 기준 존">${esc(sbz&&sbz.level?sbz.label:'존 없음')}${sbz&&sbz.byName&&sbz.level?` <span class="hint">· ${esc(sbz.byName)}${sbz.how?' · '+esc(sbz.how):''}</span>`:''}</span>
        <span class="flux">${alDot('light')} 천 ${ev.light} · ${alDot('shadow')} 명 ${ev.shadow} → ${ev.flux==='light'?'천의 흐름':ev.flux==='shadow'?'명의 흐름':'천명 동수'} · 천명치 합 <span class="num">${tSum}</span></span>
        ${shared?'':`<div class="scorebar"><span>종합 ${(x.rel*100).toFixed(0)}</span><div class="bar"><i style="width:${(x.rel*100).toFixed(0)}%"></i></div></div>`}
        <span class="cbtns"><button type="button" class="btn small" data-goalsave="${key}">${shared?'내 목표로 저장':'목표로 저장'}</button>${shared?'':`<button type="button" class="btn small" data-share="${key}">링크 복사</button>`}</span>
      </div>
      ${o.basis?`<div class="basis">${o.basis}</div>`:''}
      <div class="order">전방 배치 <span class="hint">왼쪽 → 오른쪽${ex.posTotal?` · 위치 버프 ${ex.posOk}/${ex.posTotal} 성립`:''} · 버퍼·서포터 왼쪽, 주 딜러 오른쪽 (AF는 왼쪽부터 자동 선택)</span></div>
      <div class="members">${order.map(i=>memHtml(x,i,key,o.focus,o.lockSet)).join('')}</div>
      <div class="setup" data-for="${key}" hidden></div>
      ${shared?'':`<div class="reserve">후열: ${x.reserves.length?x.reserves.map(c=>`<b>${esc(c.name)}</b>${x.fixedBack&&x.fixedBack.has(c.id)?' <span class="fixed">고정</span>':''}${muleBadge(x,c)}`).join(', '):'—'} <span class="hint">(셔틀·회복·수호·해제 보강 기준)</span>${budLine(x, o)}${muleLine(x)}</div>`}
      ${timelineHtml(x, o)}
      <div class="metrics">
        ${metric('최고점 (허수아비 어포딜)', ev.dummyT, rel('dummyT'), hot==='b')}
        ${metric('SB 턴 화력', ev.sbTurn, rel('sbTurn'), false)}
        ${metric('AF 1회 화력', ev.af, rel('af'), false)}
        ${metric('지속 (평상+AF 주기)', ev.sustain, rel('sustain'), hot==='s')}
        ${metric('생존력', ev.surv, rel('surv'), hot==='t', true)}
      </div>
      ${warns.length?`<div class="warns">${warns.map(w=>`<span class="warn"${w.full?` title="${esc(w.full)}"`:''}>${esc(w.t)}</span>`).join('')}</div>`:''}
      <details class="why turns"${boss&&(x.rank===1||shared)?' open':''}><summary>턴별 운영${boss?' · '+esc(boss.name_kr)+' 기믹 대응':''}</summary>${turnPlanHtml(x, boss)}</details>
      <details class="why"><summary>계산 근거·운용 포인트 보기 (주딜 ${esc(x.team[basisTop(x)].name)} 기준)</summary>
        ${basisHtml(x)}
        <div class="grid">
          <div><span>존 (SB / 평상)</span><span class="num">${esc(sbz&&sbz.level?sbz.label:'없음')} / ${esc(nz&&nz.level?nz.label:'없음')}</span></div>
          <div><span>회복/배리어/해제/수호</span><span class="num">${ev.survDet.heal}/${ev.survDet.barrier}/${ev.survDet.cleanse}/${ev.survDet.guard}</span></div>
        </div>
        ${ex.notes.length?`<ul class="ops">${ex.notes.map(n=>`<li><b>${esc(n.name)}</b> <span class="cond ${n.lvl}">${n.lvl==='ok'?'조건 충족':n.lvl==='off'?'조건 미충족':'일부 적용'}</span> ${esc(n.text)}${n.to.length?` → 대상 ${esc(n.to.join(', '))}`:''}</li>`).join('')}</ul>`:''}
        <ul class="ops">${x.team.filter(c=>c.cxWhy&&c.cxWhy.length).map(c=>`<li><b>${esc(c.name)}</b>: ${esc(c.cxWhy.join(' · '))}</li>`).join('')}${x.diff.noHeal?'<li>회복 수단이 없어 피격 관리 부담 +</li>':''}${x.team.every(c=>!(c.cxWhy&&c.cxWhy.length))?'<li>특별히 신경 쓸 조작 요소가 적습니다.</li>':''}</ul>
      </details>
    </section>`;
}

/* 계산 근거: 최고점(허수아비)의 주 딜러 1명, 버프가 다 깔린 AF 중 공격 1회를 딩 계산기 순서대로 */
function basisTop(x){ const d=x.ev.dummy; const per=(d&&!d.fast&&d.per&&d.per.length===x.team.length)?d.per:x.ev.sb.per; return per.indexOf(Math.max(...per)); }
function basisHtml(x){
  const ev=x.ev, d=ev.dummy, i=basisTop(x), c=x.team[i], S=x.S||settings();
  const useD = d && !d.fast && d.full;
  const co = useD ? d.full[i] : ev.sb.cores[i], z = useD ? d.zFull : ev.sb.zone;
  if(!co) return '<p class="hint">주 딜러의 공격 정보가 없습니다.</p>';
  const fin = useD ? d.fin : ev.avgCombo;
  const h0 = E.hitInfo(co, z, S, 0.75), h1 = E.hitInfo(co, z, S, fin);
  const sbx = useD && d.sbCo && d.sbCo[i] ? d.sbCo[i] : null, hs = sbx ? E.hitInfo(sbx.co, sbx.z, S, sbx.combo) : null;
  const sk = co.usingSB ? c.sb : c.main;
  const P = v=>pctTxt(v), X = v=>'×'+(+v).toFixed(2);
  const row = (k,v,sub)=>`<tr><th>${k}</th><td class="num">${v}</td><td class="hint">${sub||''}</td></tr>`;
  const ln = [];
  const hitsTxt = `${co.baseHits}타${co.totHits>co.baseHits*(1+(co.rep||0))+1e-9?' + 연격 1':''}${co.rep?` · 재공격 ${+co.rep.toFixed(2)}`:''}`;
  ln.push(row('스킬', esc(co.skill||''), `${esc(SIZE_KR[sk&&sk.size]||'')} ${co.mult>1?esc(+co.mult.toFixed(2))+'배':''} · ${hitsTxt}${co.st1?' · 단일 ×1.1':''} · ${esc(E.ELEM_KR[co.el]||'')} ${esc(E.WT_KR[co.wt]||'')}`));
  ln.push(row('기본 대미지 (위력 100%)', `${fmtN(co.bh.n)} / 크리 ${fmtN(co.bh.c)}`, `딩 v4.016 식: (공격력 − 방어/2)×(1+스탯/32)×1.75×속성 보정. 공격력에 스탯 버프 +${P(co.statB)}${co.flatP?` · 고정값 +${Math.round(co.flatP)}`:''}${co.defR?` · 방어 디버프 −${P(co.defR)}`:''}`));
  ln.push(row('속성 · 무기종', `+${P(co.elB)} · +${P(co.wB)}`, '같은 묶음은 감쇠 합산(1 + A + A·B …), 상한 100%'));
  ln.push(row('정신통일·심기일체·하극상', `+${P(co.specB)}`, co.mpF?`최대 MP ${Math.round(co.mpTot)}${co.mpB?` (MP +${P(co.mpB)})`:''} × ${co.kind==='mag'?'0.23':'0.16'}% = ${P(co.mpF)} (상한 250%)`:'MP 비례 버프 없음'));
  const luna=[]; if(co.kess) luna.push('결사 ×1.7·크리 확정'); if(co.shin) luna.push('심안 ×1.5');
  const dsrc=Object.entries(co.dmgS||{}).map(([k,v])=>({prayer:'기도',song:'가창',self:'자신',other:'기타'}[k]||k)+' +'+P(v));
  ln.push(row('루나틱 · 주는 대미지', `${X(co.lunaF)} · ${X(co.dmgUp)}`, (luna.join(' · ')||'루나틱 없음')+' / '+(dsrc.join(' · ')||'기도·가창 없음')));
  ln.push(row('내성 디버프', `×${(1+co.typeR+co.physR).toFixed(2)}`, `속성 내성 −${P(co.typeR)} + ${co.kind==='mag'?'마법':'물리'} 내성 −${P(co.physR)} (합산)`));
  ln.push(row('크리티컬', `${P(Math.min(co.critR,1))} · ${X(co.cR)}`, `크리 확률${co.critR>1?` (${P(co.critR)}${co.oc>0?`, 오버크리 ${P(co.oc)} 확률로 2배`:''})`:''} · 크리타÷일반타 (방어/4·×3.25, 크리 위력 +${P(co.critD)})`));
  ln.push(row('약점 · 브레이크', `${X(co.relF)} · ${X(co.brk)}`, co.rel==='weak'?'약점: 물리 1.85+마력 비례 · 마법 2'+(co.shin?' (+1 심안)':''):'허수아비는 약점 없음'));
  ln.push(row('존', X(h1.zf), esc(z&&z.level?z.label:'없음')+(useD?' (허수아비 AF에서 고른 존)':'')));
  const gq=co.gq||{};
  ln.push(row('글래스터 · 장비', `${X(gq.f||1)} · ${X(co.gearF||1)}`, `${esc(glText(gq))}${gq.share?` (셔틀 P글래 공유)`:''} · 장비는 무기종 표준 풀장비(딩 빌더 최적 빌드)`));
  if(co.auraR) ln.push(row('아군 전체 글래', X(co.auraF||1), `후열 셔틀 ${co.auraR.nb}명: 공명의 힘 +${P(co.auraR.r51)}(51행)${co.auraR.r50?` · 격진의 힘 +${P(co.auraR.r50)}(50행)`:''}`));
  if(co.linkHits) ln.push(row('연계 추가타', `${+co.linkHits.toFixed(2)}회/행동`, '연계를 받은 공격마다 1타씩, 각자 속성·존 배율'));
  const hit = (h,lab)=>`${lab} 경감 전 ${fmtN(h.pre.n)} / 크리 ${fmtN(h.pre.c)}${h.oc>0?` / 오버크리 ${fmtN(h.pre.oc)}`:''} → 25억 경감 ${fmtN(h.cap.n)} / ${fmtN(h.cap.c)} → 콤보 ${Math.round(h.combo*100)}% ${fmtN(h.fin.n)} / ${fmtN(h.fin.c)}${h.oc>0?` / ${fmtN(h.fin.oc)}`:''}`;
  ln.push(row('1타', `${fmtN(h0.avg)} → ${fmtN(h1.avg)}`, `기대값(크리율 반영), AF 콤보 75% → ${Math.round(fin*100)}%. 99.99억 상한`));
  const det = `<div class="hint">${hit(h0,'콤보 시작:')}</div><div class="hint">${hit(h1,'콤보 끝:')}</div>`;
  const act = useD ? `<div class="hint">AF ${d.n[i]}회 행동 · 행동 1회 = 1타 × ${+co.totHits.toFixed(2)}타${co.linkHits?` + 연계 ${+co.linkHits.toFixed(2)}`:''}${co.nT>1?` × 적 ${co.nT}체`:''} → 콤보 끝 기준 ${fmtN(h1.act)}</div>` : '';
  const sbl = hs ? `<div class="hint">SB ${esc(sbx.co.skill||'')}: AF ${d.sbAt}번째 행동에서 콤보 ${Math.round(sbx.combo*100)}% · 1타 ${fmtN(hs.avg)} × ${+sbx.co.totHits.toFixed(2)}타 = ${fmtN(hs.act)}</div>` : '';
  return `<div class="basis-tbl"><div class="hint">${useD?'최고점(허수아비) 기준: 버프·디버프·존이 다 깔린 AF 중 공격 1회':'SB 턴 기준'} · 각 칸은 곱해집니다</div><table>${ln.join('')}</table>${det}${act}${sbl}</div>`;
}
/* ---------- 조합 공유 링크 ---------- */
let SHARE = null, shareDirty = false; // SHARE: {ids, mode, bossId, focus}
function parseShare(hash){
  const h=String(hash||'').replace(/^#/,''); if(!/^share=/.test(h)) return null;
  let q; try{ q=new URLSearchParams(h); }catch(e){ return null; }
  const ids=(q.get('share')||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,4);
  let mode=q.get('m')||'burst'; if(!MODE_KR[mode]) mode='burst';
  const fp=(q.get('f')||'').split(':');
  const f=FOCUS_LIST.find(x=>x.kind===fp[0]&&x.v===fp[1]);
  return {ids, mode, bossId:q.get('b')||'', focus:f?Object.assign({},f):null};
}
function shareUrl(rec){
  const base = location.origin && location.origin!=='null' ? location.origin+location.pathname : location.href.split('#')[0];
  let u = base+'#share='+rec.x.team.map(c=>encodeURIComponent(c.id)).join(',')+'&m='+encodeURIComponent(rec.mode||'burst');
  if(rec.mode==='boss' && rec.bossId) u+='&b='+encodeURIComponent(rec.bossId);
  if(rec.focus) u+='&f='+rec.focus.kind+':'+rec.focus.v;
  return u;
}
function copyShare(key, btn){
  const rec=RES.get(key); if(!rec) return;
  const url=shareUrl(rec);
  const fallback=()=>showLinkBox(btn, url);
  try{
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(()=>flash('링크를 복사했습니다'), fallback);
    else fallback();
  }catch(e){ fallback(); }
}
function showLinkBox(btn, url){
  const row=btn.closest('.frow'), host = row ? row.querySelector('.fmain') : btn.closest('.card'); if(!host) return;
  let box=[...host.children].find(el=>el.classList.contains('sharelink'));
  if(!box){
    box=document.createElement('div'); box.className='sharelink';
    const anchor = row ? host.querySelector('.fmeta') : host.querySelector('.card-head');
    anchor.insertAdjacentElement('afterend', box);
  }
  box.innerHTML=`<input type="text" readonly value="${esc(url)}" aria-label="공유 링크"><button type="button" class="btn small" data-linkclose="1">닫기</button><span class="hint">자동 복사가 막혀 있습니다. 링크를 선택해 복사하세요.</span>`;
  const inp=box.querySelector('input'); inp.focus(); inp.select();
  let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
  if(ok){ flash('링크를 복사했습니다'); box.querySelector('.hint').textContent='복사했습니다.'; }
}
function renderShare(){
  const box=$('#shareBox'); if(!box) return;
  RES.delete('s0'); shareDirty=false;
  if(!SHARE){ box.hidden=true; box.innerHTML=''; return; }
  const sh=SHARE;
  const boss = sh.mode==='boss' ? BOSSES.find(b=>b.id===sh.bossId)||null : null;
  const mode = sh.mode==='boss'&&!boss ? 'burst' : sh.mode;
  const cond = [MODE_KR[mode]].concat(boss?[boss.name_kr]:[], sh.focus?[focusLabel(sh.focus)+' 화력만']:[]).join(' · ');
  const head = `<div class="sharehead"><b>${esc(sh.label||'공유받은 조합')}</b><span class="hint">${esc(cond)}</span><button type="button" class="btn small" data-shareclose="1">닫기</button></div>`;
  const team = sh.ids.map(id=>byId.get(id));
  box.hidden=false;
  if(team.length!==4 || team.some(c=>!c)){
    box.innerHTML=`<section class="card shared">${head}<div class="hint">링크에 든 캐릭터 일부를 이 페이지 데이터에서 찾을 수 없습니다. 데이터 기준일이 다르거나 직접 추가한 캐릭터일 수 있습니다.</div></section>`;
    return;
  }
  const S = Object.assign({}, settings(), {enemyCount: boss&&boss.needs&&boss.needs.multi_target&&!boss.needs.single_target?3:1});
  const enemy = boss ? bossToEnemy(boss) : null;
  const real = !state.sample;
  const mine = team.map(c=>!!(real && state.owned[c.id]));
  const owns = team.map((c,i)=>mine[i] ? Object.assign(BASE_OWN(), state.owned[c.id]) : {t:80, s:!!c.stellar, m:0, g:'none', gl:null});
  const progs = team.map((c,i)=>E.charProg(c, owns[i], S));
  const ev = E.evalTeam(team, progs, enemy, S, cap, ctxOf({boss, focus:sh.focus, backLocked:state.plan.backLocked||[]}));
  const x = {rank:'공유', team, progs, ev, reserves:[], miss:[], diff:E.teamDifficulty(team), rel:1, fixedBack:new Set(), shared:true, real, mine, owns, S};
  RES.set('s0', {x, focus:sh.focus, mode, bossId:boss?boss.id:''});
  const n=mine.filter(Boolean).length;
  const basis = !real ? '기준: 내 보유 정보가 아직 없어 4명 모두 천명치 80·성도각성으로 가정했습니다.'
    : n===4 ? '기준: 내 보유 정보(천명치·현현·글래스터)로 계산했습니다.'
    : n===0 ? '기준: 4명 모두 미보유라 천명치 80·성도각성으로 가정했습니다.'
    : `기준: 보유한 ${n}명은 내 보유 정보로, 미보유 ${4-n}명은 천명치 80·성도각성으로 가정했습니다.`;
  box.innerHTML = cardHtml(x, 's0', {boss, enemy, focus:sh.focus, ref:null, hot:HOT[mode], lockSet:null, head, basis:esc(basis)});
}
function revealShare(){ // 좁은 화면에선 조건 패널 아래에 있으므로 카드가 보이게 내려 준다
  const box=$('#shareBox'); if(!box||box.hidden) return;
  const top=box.getBoundingClientRect().top, head=($('.top')||{}).offsetHeight||0;
  if(top<head || top>innerHeight*0.6) window.scrollTo({top:Math.max(0, top+scrollY-head-12)});
}
function closeShare(){
  SHARE=null; renderShare();
  try{ history.replaceState(null, '', location.pathname+location.search); }catch(e){ try{ location.hash=''; }catch(e2){} }
}

/* ---------- 보편 추천 덱 (커뮤니티) ---------- */
const ZJP_KR = {'水天陣':'수천진','烈火陣':'열화진','地裂陣':'지열진','風王陣':'풍왕진','招雷陣':'초뢰진','刻陰陣':'각음진','輝晶陣':'휘정진','煌斬陣':'황참진','瞬突陣':'순돌진','轟打陣':'굉타진','幻魔陣':'환마진','双撃陣・斬突':'쌍격진·참돌','双撃陣・斬魔':'쌍격진·참마','月光陣':'월광진','閃撃陣':'섬격진'};
const BASIS_KR = {non_af:'비어포 기준', af:'어포 기준', both:'기준 미기재'};
let mdSort='zone', mdCache=null, mdKey='';
function mdEval(){
  const key = JSON.stringify([state.sample, state.owned, settings(), pglInput()]);
  if(mdCache && mdKey===key) return mdCache;
  const S = Object.assign({}, settings(), {enemyCount:1}), real = !state.sample;
  mdCache = DECKS.map((d,k)=>{
    const team = d.members.map(id=>byId.get(id));
    if(team.some(c=>!c)) return {d, k, team, mine:[], ev:null};
    const mine = team.map(c=>!!(real && state.owned[c.id]));
    const progs = team.map((c,i)=>E.charProg(c, mine[i] ? Object.assign(BASE_OWN(), state.owned[c.id]) : {t:80, s:!!c.stellar, m:0, g:'none', gl:null}, S));
    let ev=null; try{ ev = E.evalTeam(team, progs, null, S, cap, ctxOf({backLocked:[]})); }catch(e){}
    return {d, k, team, mine, ev};
  });
  mdKey = key; return mdCache;
}
function renderMetaDecks(){
  const box=$('#mdList'); if(!box) return;
  $$('#mdSort button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.k===mdSort?'true':'false'));
  const L = mdEval().filter(r=>r.ev);
  if(!L.length){ box.innerHTML='<div class="empty">추천 덱 자료가 없습니다.</div>'; return; }
  const mxN = Math.max(...L.map(r=>r.ev.sustainNoAF))||1, mxD = Math.max(...L.map(r=>r.ev.dummyT))||1;
  const ZO = Object.keys(ZJP_KR), zi = r=>{ const i=ZO.indexOf(r.d.zone); return i<0?99:i; };
  const arr = L.slice().sort(mdSort==='normal' ? (a,b)=>b.ev.sustainNoAF-a.ev.sustainNoAF : mdSort==='dummy' ? (a,b)=>b.ev.dummyT-a.ev.dummyT : (a,b)=>(zi(a)-zi(b))||(a.k-b.k));
  const real = !state.sample;
  const nameOf = id=>esc((byId.get(id)||{name:id}).name);
  const num = (k,v,mx)=>`<div class="mdm"><div class="k">${k}</div><div class="v num">${fmtN(v)}</div><div class="bar"><i style="width:${Math.max(2,Math.round(v/mx*100))}%"></i></div></div>`;
  box.innerHTML = arr.map(r=>{
    const d=r.d, miss=r.team.filter((c,i)=>real && !r.mine[i]).length;
    const alts = Object.entries(d.alts||{}).filter(([,v])=>v&&v.length).map(([slot,v])=>`${+slot+1}번 ${v.map(nameOf).join('·')}`).join(' / ');
    const src = d.source ? `<a href="${esc(d.source)}" target="_blank" rel="noopener">${esc(d.source_name||'출처')}${d.date?' '+esc(d.date):''} ↗</a>` : esc(d.source_name||'출처 미상');
    return `<div class="mdrow">
      <div class="mdhead"><span class="zonebadge">${esc(ZJP_KR[d.zone]||'ZONE 미기재')}</span> <b>${esc(d.name)}</b> <span class="mdtag b-${esc(d.basis)}">${esc(BASIS_KR[d.basis]||d.basis)}</span> <span class="hint">${esc(d.use||'')}</span></div>
      <div class="mdmem">${r.team.map((c,i)=>`<span class="${real&&!r.mine[i]?'miss':''}">${esc(c.name)}${real&&!r.mine[i]?' <small>미보유</small>':''}</span>`).join('<span class="sep">/</span>')}${d.back&&d.back.length?` <span class="hint">· 후열 ${d.back.map(nameOf).join(', ')}</span>`:''}</div>
      ${alts?`<div class="hint">대체 후보: ${alts}</div>`:''}
      <div class="mdnums">${num('비어포 평상 턴', r.ev.sustainNoAF, mxN)}${num('SB 턴', r.ev.sbTurn, Math.max(...L.map(q=>q.ev.sbTurn))||1)}${num('최고점(어포딜)', r.ev.dummyT, mxD)}</div>
      <div class="hint">${d.note?esc(d.note)+' · ':''}출처 ${src}${real&&miss?` · 미보유 ${miss}명`:''}</div>
      <div><button type="button" class="btn small" data-mdopen="${r.k}">카드로 자세히</button></div>
    </div>`;
  }).join('');
}
function openMetaDeck(k){
  const d=DECKS[k]; if(!d) return;
  SHARE = {ids:d.members.slice(), mode: d.basis==='non_af' ? 'sustain' : 'burst', bossId:'', focus:null, label:'추천 덱 · '+d.name};
  renderShare(); revealShare();
}

/* ---------- 후열 글래스터 셔틀 ---------- */
const slotTxt = v => Number.isInteger(v) ? String(v) : v.toFixed(1);
function muleBadge(x, c){ const mu=x.ev.mule; if(!mu) return ''; const w=mu.auto?mu.wp:null; return w && c.pers && c.pers.has(w) ? ' <span class="fixed">셔틀</span>' : ''; }
function allocTxt(al){ if(!al) return ''; if(al.names && al.names.length) return al.names.join(' · ')+` (속성·HP +${Math.round(al.e)}%${al.z?` · 존 각성 +${Math.round(al.z)}%`:''})`;
  if(al.pct) return [al.e?`속성·HP +${al.e}%`:'', al.z?`존 +${al.z}%`:'', al.t?`특정 존 +${al.t}%`:''].filter(Boolean).join(' · ');
  if(al.el==null) return '';
  return [al.el?`${al.el>1?al.el+'×':''}속성 P`:'', al.hp?`${al.hp>1?al.hp+'×':''}HP 최대 P`:'', al.z?`${al.z>1?al.z+'×':''}각성의 힘`:''].filter(Boolean).join(' · ')+` (+${al.ev}%${al.z?` · 극존 중 ×${(1+0.25*al.z).toFixed(2)}`:''})`; }
function muleGot(x){
  const mu=x.ev.mule; if(!mu) return [];
  return x.team.map((c,i)=>{ const co=x.ev.sb.cores[i], al=co&&co.gq&&co.gq.alloc, at=allocTxt(al); if(!(mu.k[i]>0) && !(mu.kd&&mu.kd[i]) && !(al&&al.names&&al.names.length)) return null;
    if(al && al.names) return `${esc(c.name)}: ${esc(at)}`;
    return `${esc(c.name)} ${al&&al.pct?'':al&&al.el!=null?`P글래 ${al.e+al.z}개`:'+'+slotTxt(mu.k[i])+'칸'}${at?` (${esc(at)})`:''}`; }).filter(Boolean);
}
function muleLine(x){
  const mu=x.ev.mule; if(!mu) return settings().muleOn!==false && !pglCount() ? `<div class="hint">P글래 셔틀: 보유 탭 '연성 P글래 보유'에 가진 것을 표시하면 후열 셔틀 공유를 계산합니다 (표시 전에는 없다고 봄)</div>` : '';
  const got = muleGot(x);
  const fr = (mu.front||[]).map(j=>esc(x.team[j].name));
  const zoneTip = x.ev.sb.zone && x.ev.sb.zone.level>=2 ? ' · 극존(ZONE 각성)이 깔리면 셔틀마다 각성의 힘(+25%)을 섞는 게 이득 (속성 P글래와 다른 그룹이라 곱해짐)' : '';
  if(mu.auto && mu.plan){ const sl = (mu.carriers||[]).reduce((a,m)=>a+m.slots,0), pl = mu._pm && mu._pm.size ? [...mu._pm.values()].pop() : null, sw = pl && pl.shuttleWeap;
    return `<div class="hint">P글래 셔틀 가정: 후열 ${sw&&sw.length?sw.map(w=>esc(w)+' 캐릭터').join(' + '):'셔틀 '+mu.mules.length+'명'}(천명치 200, ${sl}칸)이 ${pglCount()?'표시한':'모든'} 잠재 연성 P글래를 종류마다 ${pglCount()?'표시한 수만큼':'1개씩'} 나눠 달고, 장착 조건(무기종·퍼스널리티·속성)이 같은 아군에게 공유 → ${got.join(', ')||'—'}. 남는 칸엔 아군 전체 글래(공명·격진의 힘)</div>`; }
  if(mu.auto) return `<div class="hint">P글래 셔틀 가정: ${esc(E.PERS_KR[mu.wp]||mu.wp)} 퍼스널리티 ${mu.mules.length?`후열 ${mu.mules.length}명`:''}${mu.mules.length&&fr.length?' + ':''}${fr.length?`전열 서포터 ${fr.join(', ')}`:''}이 잠재 연성한 P글래를 공유 → ${got.join(', ')||'—'}${zoneTip}</div>`;
  return `<div class="hint">후열 고정 셔틀의 P글래 공유: ${got.join(', ')||'<span class="ng">무기 퍼스널리티가 맞는 전열 캐릭터 없음</span>'}</div>`;
}

/* ---------- 턴별 운영 ---------- */
const PCT = v => Math.round(v)+'%';
function buffSummary(c){
  const p=c.party||{}, out=[];
  if(!p || p.scope==='none') return out;
  const st=[['pwr','완력'],['int','지성'],['spd','속도']].filter(([k])=>p[k]>0);
  if(st.length){ const v=Math.max(...st.map(([k])=>p[k])); out.push(st.map(x=>x[1]).join('·')+' '+PCT(v)); }
  if(p.all_elem_atk>0) out.push('전속성 공격 '+PCT(p.all_elem_atk));
  const ea=Object.entries(p.elem_atk||{}).filter(([k,v])=>v>0); if(ea.length) out.push(ea.map(([k])=>E.ELEM_KR[k]).join('·')+' 공격 '+PCT(Math.max(...ea.map(x=>x[1]))));
  const wa=Object.entries(p.weapon_atk||{}).filter(([k,v])=>v>0); if(wa.length) out.push((wa.some(([k])=>k==='all')?'전무기종':wa.map(([k])=>E.WEAPON_KR[k]||FT_KR[k]||k).join('·'))+' 대미지 '+PCT(Math.max(...wa.map(x=>x[1]))));
  if(p.crit_rate>0) out.push('크리율 '+PCT(p.crit_rate)); if(p.crit_dmg>0) out.push('크리 피해 '+PCT(p.crit_dmg));
  if(p.singular_focus) out.push('심기일체'); if(p.mental_focus) out.push('정신통일'); if(p.overthrow) out.push('하극상');
  if(p.over_crit) out.push('오버크리티컬'); if(p.multihit) out.push('다단강화'); if(p.extra_hit) out.push('연격수+1'); if(p.barrier_pierce) out.push('배리어 관통'); if(p.link) out.push('연계');
  return out;
}
function debuffSummary(c){
  const d=c.deb||{}, out=[];
  const st=[['pwr','완력'],['int','지성'],['spd','속도']].filter(([k])=>d[k]>0); if(st.length) out.push('적 '+st.map(x=>x[1]).join('·')+' −'+PCT(Math.max(...st.map(([k])=>d[k]))));
  if(d.all_elem_res>0) out.push('전속성 내성 −'+PCT(d.all_elem_res));
  const er=Object.entries(d.elem_res||{}).filter(([k,v])=>v>0); if(er.length) out.push(er.map(([k])=>E.ELEM_KR[k]).join('·')+' 내성 −'+PCT(Math.max(...er.map(x=>x[1]))));
  if(d.phys_res>0) out.push('물리 내성 −'+PCT(d.phys_res)); if(d.mag_res>0) out.push('마법 내성 −'+PCT(d.mag_res));
  const wr=Object.entries(d.weapon_res||{}).filter(([k,v])=>v>0); if(wr.length) out.push(wr.map(([k])=>FT_KR[k]||k).join('·')+' 내성 −'+PCT(Math.max(...wr.map(x=>x[1]))));
  if(c.breakT) out.push('브레이크'); if(c.weakExpose) out.push('약점 부여('+(E.ELEM_KR[c.weakExpose]||FT_KR[c.weakExpose]||c.weakExpose)+')');
  if(c.pain) out.push('독·페인');
  return out;
}
const SUP_KR={heal:'회복',barrier:'배리어',cleanse:'해제',guard:'수호',taunt:'도발',status_immune:'상태이상 무효',mp_recover:'MP 회복'};
function whoHas(team, f){ return team.filter(f).map(c=>c.name); }
function turnPlanHtml(x, boss){
  const team=x.team, ev=x.ev, ex=x.ex, sbz=ev.sb.zone, nz=ev.normal.zone;
  const sum=a=>a.reduce((q,v)=>q+v,0)||1;
  const shSB=ev.sb.per.map(v=>v/sum(ev.sb.per)), shN=ev.normal.per.map(v=>v/sum(ev.normal.per));
  const mainI = shSB.indexOf(Math.max(...shSB)), mainN = shN.indexOf(Math.max(...shN));
  const dealers = team.map((c,i)=>i).filter(i=>shSB[i]>=0.2 || shN[i]>=0.2);
  const order = ex.order;
  const nm = i=>`<b>${esc(team[i].name)}</b>`;
  const T = [];
  // 개전
  const o0 = [`전방 배치(왼→오): ${order.map(nm).join(' · ')}${x.reserves&&x.reserves.length?` / 후열 ${x.reserves.map(c=>esc(c.name)).join(', ')}`:''}`];
  if(ev.mule){ const mu=ev.mule, got=team.map((c,i)=>(mu.k[i]>0||(mu.kd&&mu.kd[i]))?esc(c.name):null).filter(Boolean);
    if(got.length) o0.push(mu.auto ? `글래 셔틀: ${esc(E.PERS_KR[mu.wp]||mu.wp)} 퍼스널리티 ${mu.mules.length?`후열 ${mu.mules.length}명`:''}${(mu.front||[]).length?`${mu.mules.length?' + ':''}전열 서포터 ${mu.front.map(j=>esc(team[j].name)).join(', ')}`:''}에게 잠재 연성 P글래 장착 → ${got.join(', ')} 대미지 증가` : `후열 셔틀(${mu.mules.map(m=>esc(m.name||'')).join(', ')})의 P글래가 ${got.join(', ')}에게 공유`); }
  { const inf = ev.A && ev.A.inf;
    if(inf && !(inf.poison>0) && !(inf.pain>0)){
      const sh=team.map((c,i)=>shSB[i]), mi=sh.indexOf(Math.max(...sh));
      try{ const p2=x.progs.map((p,k)=>k===mi?Object.assign({},p,{gl:Object.assign({mode:'auto'},p.gl||{},{ore:true}),_gq0:null,_gq1:null}):p);
        for(const k in p2[mi]) if(k.indexOf('_gq')===0) delete p2[mi][k];
        const ev2=E.evalTeam(team, p2, null, x.S||settings(), cap, {});
        const g=ev2.burst/Math.max(1e-9, ev.burst);
        if(g>1.02) o0.push(`독·페인을 거는 캐릭터가 없음 → <b>${esc(team[mi].name)}</b>의 글래스터 1개에 <b>잠재 광석</b>을 달면 공격으로 독·페인이 걸려 독·페인 글래스터가 켜짐 (세팅 후 폭딜 약 +${((g-1)*100).toFixed(0)}%)`);
      }catch(e){}
    }
  }
  if(sbz && sbz.level && sbz.how==='개전 자동') o0.push(`${esc(sbz.byName)}: 전투 시작과 함께 <b>${esc(sbz.label)}</b> 자동 전개`);
  team.forEach((c,i)=>{ const ts=c.raw.tags||[]; if(ts.includes('taunt')||c.sup.taunt>=2) o0.push(`${nm(i)}: 도발로 공격 받아내기`); });
  if(boss) (boss.mechanics||[]).filter(m=>/개시|시작|개전|선제|첫 턴/.test(m)).slice(0,2).forEach(m=>o0.push(`<span class="hint">보스: ${esc(m)}</span>`));
  T.push(['개전', o0]);
  // 1턴: 세팅
  const o1=[];
  const zoneBy = sbz&&sbz.level ? team.findIndex(c=>c.id===sbz.by) : -1;
  if(zoneBy>=0 && sbz.how!=='개전 자동') o1.push(`${nm(zoneBy)}: ${esc(sbz.how==='SB 시'?(nz&&nz.level?nz.label:'존'):sbz.how==='스킬 각성'?sbz.label.replace(/^[극절]·/,''):sbz.label)} 전개${sbz.how==='극 글래스터'?' (극 글래스터)':''}`);
  team.forEach((c,i)=>{
    if(dealers.includes(i) && shSB[i]>=0.35) return;
    const b=buffSummary(c); if(b.length) o1.push(`${nm(i)}: 버프 — ${esc(b.slice(0,4).join(', '))}${(ex.notes.find(n=>n.j===i&&n.lvl!=='ok'))?' <span class="cond part">조건 확인</span>':''}`);
  });
  team.forEach((c,i)=>{ const d=debuffSummary(c); if(d.length && !(shSB[i]>=0.35)) o1.push(`${nm(i)}: 디버프 — ${esc(d.slice(0,4).join(', '))}`); });
  team.forEach((c,i)=>{ const ts=(c.raw.tags||[]).join(' ')+' '+(c.cxWhy||[]).join(' ');
    if(/prayer|기도/.test(ts)) o1.push(`${nm(i)}: 기도 시작(유지)`); else if(/song|가창|노래/.test(ts)) o1.push(`${nm(i)}: 가창 시작(3턴마다 갱신)`); });
  dealers.forEach(i=>{ const c=team[i]; if(/축적|누적|스택|모드|상태/.test((c.cxWhy||[]).join(' '))) o1.push(`${nm(i)}: 축적·상태 준비 <span class="hint">${esc((c.raw.req_ko||c.raw.req||'').slice(0,60))}</span>`); });
  { const tl = ev.tl;
    if(tl && tl.givers && tl.givers.length && tl.t1u > tl.t1g*1.05){
      const att = team.map((c,i)=>i).filter(i=>tl.actT1[i] && (shN[i]>=0.25||shSB[i]>=0.3));
      const gv = tl.givers.filter(j=>!att.includes(j));
      const sp = i=>(x.progs[i]&&x.progs[i].spd)||0, spT = i=>sp(i)?` (속도 ${sp(i)})`:'';
      const fastD = Math.max(0, ...att.map(sp)), slow = gv.filter(j=>sp(j) && fastD && sp(j)<=fastD);
      if(att.length && gv.length){
        if(gv.every(j=>sp(j)) && att.every(i=>sp(i)) && !slow.length) o1.push(`속도 순서 OK: 버퍼 ${gv.map(j=>nm(j)+spT(j)).join(', ')}가 딜러 ${att.map(i=>nm(i)+spT(i)).join(', ')}보다 빨라 1턴 공격에 버프·디버프가 들어감 (1턴 딜 ${fmtN(tl.t1u)})`);
        else if(slow.length) o1.push(`속도 순서: 버퍼 ${slow.map(j=>nm(j)+spT(j)).join(', ')}가 딜러 ${att.map(i=>nm(i)+spT(i)).join(', ')}보다 느림 → 버퍼 속도 <b>+${fastD-Math.min(...slow.map(sp))+1} 이상</b>(${esc(spdGearTip(fastD-Math.min(...slow.map(sp))+1))})이면 1턴 딜 ${fmtN(tl.t1g)} → ${fmtN(tl.t1u)}, 아니면 딜러는 2턴부터 본격 공격`);
        else o1.push(`속도 순서: 버퍼 ${gv.map(nm).join(', ')} → 딜러 ${att.map(nm).join(', ')} 순서여야(<b>버퍼가 더 빨라야</b>) 1턴 공격에 버프·디버프가 들어감 (1턴 딜 ${fmtN(tl.t1g)} → ${fmtN(tl.t1u)}) — 버퍼에 속도 글래스터·배지, 아니면 딜러는 2턴부터 본격 공격`);
      }
    }
    o1.push('AF 중에는 누르는 순서대로 바로 행동하므로 버프 → 딜 순서를 직접 맞출 수 있음'); }
  if(!o1.length) o1.push('특별한 준비 없이 바로 공격');
  T.push(['1턴 · 세팅', o1]);
  // 2턴
  const o2=[];
  if(sbz && sbz.level>=2 && sbz.how==='스킬 각성') o2.push(`${esc(sbz.byName)}: 존 각성 → <b>${esc(sbz.label)}</b>`);
  const shortB = team.map((c,i)=>i).filter(i=>team[i].rules && team[i].rules.list.some(r=>r.w.t!=null));
  if(shortB.length) o2.push(`${shortB.map(nm).join(', ')}: 짧은 버프(VC·초회·개막 한정)는 SB 턴 직전에 맞춰 쓰기`);
  o2.push(`${dealers.map(nm).join(', ')||nm(mainN)}: 평상 공격 — ${esc((ev.normal.cores[mainN]&&ev.normal.cores[mainN].skill)||'')} 위주, 버프·디버프 남은 턴 확인`);
  T.push(['2턴', o2]);
  // 폭딜 턴
  const o3=[];
  if(ev.hasSB){
    const co=ev.sb.cores[mainI];
    o3.push(`버프·디버프·존(${esc(sbz&&sbz.level?sbz.label:'없음')})이 모두 켜진 턴에 <b>스텔라 버스트</b> — 주딜 ${nm(mainI)} ${esc(co&&co.usingSB?co.skill:'')}`);
  } else o3.push('성도각성 캐릭터가 없어 SB 없이 AF로 폭딜');
  o3.push(`이어서 <b>AF</b>: 평균 콤보 ${(ev.avgCombo*100).toFixed(0)}% 기준, 타수 많은 공격으로 콤보를 쌓고 ${nm(mainI)}로 마무리`);
  T.push(['3턴~ · 폭딜', o3]);
  // 유지·생존
  const o4=[];
  for(const k of ['heal','barrier','cleanse','guard','status_immune']){ const w=whoHas(team,c=>(c.sup[k]||0)>=2); if(w.length) o4.push(`${SUP_KR[k]}: ${w.map(esc).join(', ')}`); }
  if(team.some(c=>c.sup.revive)) o4.push(`부활: ${whoHas(team,c=>c.sup.revive).map(esc).join(', ')}`);
  if(!o4.length) o4.push('<span class="ng">회복·배리어 담당이 약함 → 후열 교대로 보강</span>');
  const sim = ev.sim;
  if(sim){
    team.forEach((c,i)=>{
      if(c.buffAct && sim.buffN[i]) o4.push(`${nm(i)}: 파티 버프 ${c.buffTurns>=99?'상시':c.buffTurns+'턴'}마다 다시 걸기 (MP ${sim.costMain&&c.mpBuff!=null?c.mpBuff:'?'}${sim.upt[i]<0.99?` · ${sim.H}턴 중 ${Math.round(sim.upt[i]*100)}%만 유지 — MP 부족`:''})`);
      if(sim.out[i] && (shN[i]>=0.15 || shSB[i]>=0.2)) o4.push(`<span class="ng">${esc(team[i].name)}: MP ${sim.costMain[i]}짜리 주력기를 ${sim.mainN[i]}번 쓰면 ${sim.out[i]}턴째 MP 부족</span> → 그 전에 후열과 교대(후열은 턴당 MP 10% 회복), MP 회복 지원·MP 소비 감소 글래스터로 늦추기`);
    });
  }
  o4.push('버프 지속이 끝나는 턴에 다시 걸고, 존이 꺼지면 바로 재전개');
  T.push(['유지 · 생존', o4]);
  // 보스 기믹
  if(boss){
    const ob=[];
    const pierceW = team.map((c,i)=>i).filter(i=>(team[i].party||{}).barrier_pierce || (ev.sb.cores[i]&&ev.sb.cores[i].pierce)).map(nm);
    const multi = team.map((c,i)=>i).filter(i=>ev.normal.cores[i] && ev.normal.cores[i].totHits>=4).map(nm);
    const aoe = team.map((c,i)=>i).filter(i=>ev.normal.cores[i] && ev.normal.cores[i].tgt==='aoe' && shN[i]>=0.1).map(nm);
    const cleanse = whoHas(team,c=>(c.sup.cleanse||0)>=1||(c.sup.status_immune||0)>=1).map(esc);
    const guard = whoHas(team,c=>(c.sup.barrier||0)>=2||(c.sup.guard||0)>=1||(c.sup.taunt||0)>=1).map(esc);
    const healer = whoHas(team,c=>(c.sup.heal||0)>=2).map(esc);
    const res = (x.reserves||[]).map(c=>esc(c.name));
    const pick=(arr,alt)=>arr.length?arr.join(', '):`<span class="ng">없음</span>${alt?` → ${alt}`:''}`;
    const guardRule = ()=>`대비: ${pick(guard)} 배리어·수호, ${pick(healer)} 회복으로 HP 채워 두기`;
    const RULES=[
      [/소환|분신|부하/, ()=>`전체 공격으로 소환체부터 정리: ${pick(aoe)}`],
      [/피격 1회|연격|다단|스택.*(감소|깎)/, ()=>`연타로 스택 깎기: ${pick(multi,'후열 다단 캐릭터 교대')}`],
      [/배리어|장벽/, ()=>`배리어 관통: ${pick(pierceW,'다단 공격으로 먼저 벗기기')}`],
      [/버프\s*해제|버프.*(초기화|지움)|초기화/, ()=>`해제 직후 1턴 재세팅: ${team.map((c,i)=>i).filter(i=>buffSummary(team[i]).length).map(nm).join(', ')||'—'}`],
      [/혼란|암흑|기절|수면|봉인|석화|마비|공포|매혹|상태이상|독/, ()=>`해제·무효: ${pick(cleanse,res.length?'후열 '+res.join(', '):'')}`],
      [/즉사|息吹|숨결|전체.*(피해|공격)|고정 피해|대미지 대폭|강력/, guardRule],
      [/존|ZONE/, ()=>sbz&&sbz.level?`존이 깨지면 ${esc(sbz.byName)} 재전개`:'존 담당 없음'],
      [/반격|카운터|반사/, ()=>'반격 조건을 피해 한 방이 큰 공격 위주로'],
      [/HP\s*\d+\s*%|페이즈|스토퍼/, ()=>'페이즈 전환(HP 구간) 직전엔 SB·AF를 아끼고, 전환 직후 버프가 풀리면 다시 세팅'],
    ];
    for(const m of (boss.mechanics||[])){
      const hits = RULES.filter(([re],k)=>re.test(m) && !(RULES[k][1]===guardRule && /처리|필요/.test(m))).slice(0,2);
      ob.push(`${esc(m)}${hits.map(h=>`<div class="tip">→ ${h[1](m)}</div>`).join('')}`);
    }
    if(boss.phases) ob.unshift(`<span class="hint">페이즈: ${esc(boss.phases)}</span>`);
    T.push(['보스 기믹 대응', ob]);
  }
  return `<ol class="tplan">${T.map(([h,ls])=>`<li><div class="th">${esc(h)}</div><ul>${ls.map(l=>`<li>${l}</li>`).join('')}</ul></li>`).join('')}</ol>`;
}

/* ---------- 추천 세팅 패널 ---------- */
function chainOnText(on){
  const one = o=>{ const act=o.act||'attack';
    const el=(o.elem||[]).map(e=>E.ELEM_KR[e]).join('·'), wt=(o.wt||[]).map(w=>FT_KR[w]).join('·');
    if(act==='attack') return `${el?el+' ':''}${wt?wt+' ':''}${o.kind==='mag'?'마법 ':o.kind==='phys'?'물리 ':''}${o.tgt==='aoe'?'전체 ':o.tgt==='st'?'단일 ':''}공격 스킬`;
    return {buff:'버프 스킬', debuff:'디버프 스킬', heal:'회복 스킬', skill:'스킬', any:'행동'}[act]||act; };
  const who = (on.by||'other')==='any' ? '아군' : '다른 아군';
  if(Array.isArray(on.rand)) return `${who}의 (턴마다 무작위) ${on.rand.map(one).join(' / ')}`;
  return `${who}의 ${one(on)}`;
}
const TGT_KR={st:'단일',aoe:'전체'}, KIND_KR={phys:'물리',mag:'마법'}, SIZE_KR={s:'소',m:'중',l:'대',xl:'특대',xxl:'극대'};
function skillLine(sk){
  if(!sk) return '';
  const el = sk.element&&sk.element!=='none' ? (E.ELEM_KR[sk.element]||sk.element)+' ' : '무속성 ';
  const wt = FT_KR[sk.weapon_type] || '';
  return `<b${sk.skill_jp?` title="원문: ${esc(sk.skill_jp)}"`:''}>${esc(sk.skill||'')}</b> <span class="hint">${esc(TGT_KR[sk.target]||'')} ${esc(el)}${esc(wt||KIND_KR[sk.kind]||'')} ${esc(SIZE_KR[sk.size]||'')} ${sk.mult>1?esc(sk.mult)+'배 ':''}${sk.hits>1?esc(sk.hits)+'타':''}${sk.repeat?` · 재공격 ${esc(sk.repeat)}`:''}${sk.crit_sure?' · 확정 크리':''}${sk.barrier_pierce?' · 배리어 관통':''}</span>${(sk.cond_ko||sk.condition)?`<div class="hint">${esc(sk.cond_ko||sk.condition)}</div>`:''}`;
}
function setupHtml(x, i){
  const c=x.team[i], pr=x.progs[i], o=(x.owns&&x.owns[i])||state.owned[c.id]||{}, ev=x.ev, r=c.raw;
  const ex = x.ex || (x.ex=E.explainTeam(x.team,x.progs,ev,settings(),{}));
  const sum=a=>a.reduce((s,v)=>s+v,0)||1;
  const sSB=ev.sb.per[i]/sum(ev.sb.per), sN=ev.normal.per[i]/sum(ev.normal.per), share=Math.max(sSB,sN);
  const role = share>=0.35?'주 딜러':share>=0.12?'보조 딜러':'서포터';
  const dealer = share>=0.12;
  const order = ex.order;
  const slot = order.indexOf(i)+1;
  const nm = k=>esc(x.team[k].name);
  const L = []; // 이 조합에서
  if(x.shared && !x.mine[i]) L.push(x.real ? '<li><span class="ng">미보유</span> — 아래 값은 천명치 80·성도각성으로 가정한 것</li>' : '<li class="hint">보유 정보가 없어 천명치 80·성도각성으로 가정한 값입니다</li>');
  L.push(`<li>${role} · SB 턴 비중 <span class="num">${(sSB*100).toFixed(0)}%</span> · 평상 턴 <span class="num">${(sN*100).toFixed(0)}%</span></li>`);
  { const st = c.stats ? E.statsAt(c.stats, c.fateTbl, pr.t||0) : null;
    if(st) L.push(`<li>스탯 <span class="hint">(천명치 ${pr.t||0}, 장비 제외)</span>: ${E.STAT_ORDER.map(k=>`${k===c.mainStat?'<b>':''}${STAT_KR[k]} ${st[k].toLocaleString()}${k===c.mainStat?'</b>':''}`).join(' · ')}${pr.spdSrc==='build'?` · <span class="hint">빌드 장비 포함 속도 ${pr.spd}</span>`:''}</li>`);
    else L.push(`<li class="hint">스탯: 기본 스탯 자료 없음 (위키에 없는 캐릭터)</li>`); }
  L.push(`<li>전방 <b>왼쪽에서 ${slot}번째</b>${ex.posTotal?'':' (위치 버프 없음 · 버퍼는 왼쪽, 딜러는 오른쪽: AF가 왼쪽부터 자동 선택돼 버프가 먼저 깔림)'}</li>`);
  for(const rl of ex.rel){
    if(rl.j===i) L.push(`<li>위치 버프 대상 <b>${nm(rl.i)}</b>을(를) 바로 ${rl.side==='r'?'오른쪽':rl.side==='l'?'왼쪽':'옆'}에</li>`);
    else if(rl.i===i) L.push(`<li><b>${nm(rl.j)}</b>의 위치 버프를 받음 → ${nm(rl.j)} 바로 ${rl.side==='r'?'오른쪽':rl.side==='l'?'왼쪽':'옆'}에 서기</li>`);
  }
  if(c.chain){
    const tS = ev.sb.chain ? ev.sb.chain.trig[i] : 0, tN = ev.normal.chain ? ev.normal.chain.trig[i] : 0;
    for(const e of c.chain) L.push(`<li>체인 어빌리티: ${esc(chainOnText(e.on||{}))}마다 추격 (턴당 최대 ${e.max||1}회${e.every>1?`, ${e.every}회마다 공격`:''}) → 이 조합에서 SB 턴 약 <b>${tS.toFixed(1)}회</b> · 평상 턴 약 ${tN.toFixed(1)}회${tS<0.5?' <span class="ng">— 발동시킬 아군이 거의 없음</span>':''}</li>`);
  }
  const note = ex.notes.find(n=>n.j===i);
  if(note && note.text) L.push(`<li>주는 버프 조건: <span class="cond ${note.lvl}">${note.lvl==='ok'?'이 조합에서 충족':note.lvl==='off'?'이 조합에서 미충족':'일부만 충족'}</span> <span class="hint">${esc(note.text)}</span></li>`);
  const zc = (ev.sb.zones||[]).find(z=>z.by===c.id);
  if(c.zone){
    const used = ev.sb.zone && ev.sb.zone.by===c.id;
    L.push(`<li>존: ${esc(E.ZONE_KR[c.zone.type]||c.zone.type)}${c.zone.awakened?' (극/절 가능)':''} — ${used?`<b>이 조합의 존 담당</b> (${esc(ev.sb.zone.label)}${ev.sb.zone.how?' · '+esc(ev.sb.zone.how):''})`:'이 조합에서는 다른 존을 씀'}${zc&&zc.unmet&&zc.unmet.length?`<div class="hint">${zc.unmet.map(esc).join(' / ')}</div>`:''}</li>`);
  }
  // 육성·장비
  const G = [];
  const t = +o.t||0;
  const mark = ok=>ok?'<span class="ok">✓</span>':'<span class="ng">!</span>';
  if(c.stellar){
    if(!o.s) G.push(`<li>${mark(false)} 성도각성: 입력 안 됨 → 성도 스킬·SB 미반영</li>`);
    const steps=[[15,'성도 스킬 사용'],[30,'성도 스킬 완전'],[80,'스탯 노드']].concat(dealer?[[200,'공격 글래스터 4칸']]:[]);
    G.push(`<li>천명치 목표: ${steps.map(([v,l])=>`${t>=v?'<span class="ok">':'<span class="ng">'}${v}</span> ${l}`).join(' · ')} <span class="hint">(현재 ${t})</span></li>`);
  } else {
    G.push(`<li>성도각성 없음 · 천명치는 120 배지 칸${dealer?' · 200 글래스터 4칸':''} · 255 전 스탯 <span class="hint">(현재 ${t})</span></li>`);
  }
  // 전용 글래스터
  const g=o.g||'none', GK={none:'없음',vc:'상급(VC)',shin:'진',goku:'극'};
  if(c.zone && c.zoneAwak){
    const needGoku = zc && zc.unmet && zc.unmet.length && !(ev.sb.zone&&ev.sb.zone.by===c.id&&ev.sb.zone.level>=2&&ev.sb.zone.how!=='극 글래스터');
    G.push(`<li>${mark(needGoku ? g==='goku' : (g==='shin'||g==='goku'))} 전용 글래스터: <b>${needGoku?'극 권장':'진 이상'}</b>${needGoku?' — 극이면 조건 없이 개전 극존':' — 극존 조건은 편성으로 충족'} <span class="hint">(현재 ${GK[g]})</span></li>`);
  } else if(dealer){
    G.push(`<li>${mark(g==='shin'||g==='goku')} 전용 글래스터: 진 ×1.07 · 극 ×1.12 <span class="hint">(현재 ${GK[g]})</span></li>`);
  } else G.push(`<li>전용 글래스터: 딜 비중이 낮아 우선순위 낮음 <span class="hint">(현재 ${GK[g]})</span></li>`);
  // 공격 글래스터
  if(dealer){
    const inf = (ev.A && ev.A.inf) || {poison:0, pain:0, by:{poison:[], pain:[]}};
    const noOre = Object.assign({}, inf); // 이 캐릭터의 잠재 광석 효과를 뺀 파티 가동률
    if(pr.gl && pr.gl.ore){ const others = E.inflictOf(x.team.map((m,k)=>k===i?Object.assign({},m,{inflict:m.inflict}):m), x.progs.map((p,k)=>k===i?Object.assign({},p,{gl:Object.assign({},p.gl,{ore:false})}):p), settings()); noOre.poison=others.poison; noOre.pain=others.pain; }
    const best = E.grastaFactor({gl:{mode:'auto'}, slots:pr.slots}, noOre);
    const cur = ev.sb.cores[i] && ev.sb.cores[i].gq;
    let txt = `<b>${esc(glText(best))}</b> (×${best.f.toFixed(2)})`;
    const ore = E.grastaFactor({gl:{mode:'auto',ore:true}, slots:pr.slots}, noOre);
    if(ore.f>best.f*1.02) txt += ` · <b>잠재 광석</b>을 글래스터 1개에 달면 이 캐릭터가 공격으로 독·페인을 직접 걸어 <b>${esc(glText(ore))}</b> (×${ore.f.toFixed(2)})`;
    const nmL = L=>[...new Set(L)].map(k=>x.team[k].name).join(', ');
    txt += `<div class="hint">이 조합의 독: ${inf.poison>0?esc(nmL(inf.by.poison))+` (평상 가동 ${Math.round(inf.poison*100)}%)`:'없음'} · 페인: ${inf.pain>0?esc(nmL(inf.by.pain))+` (${Math.round(inf.pain*100)}%)`:'없음'} — 독·페인 글래스터는 대상이 그 상태일 때만 ×1.3</div>`;
    G.push(`<li>${mark(cur && (cur.f/(cur.alloc&&cur.alloc.f ? cur.alloc.f : 1))>=best.f-1e-6)} 공격 글래스터: ${txt} <span class="hint">(현재 ${cur?esc(glText(cur)):'—'}, ${pr.slots}칸)</span></li>`);
    const mu=ev.mule; const wpk=E.WEAPON_PERS[c.weapon];
    if(mu){ const al = cur && cur.alloc, at = allocTxt(al);
      G.push(`<li>${mark(mu.k[i]>0 || (mu.kd&&mu.kd[i]))} 셔틀 P글래 공유: ${mu.k[i]>0||(mu.kd&&mu.kd[i])?`${al&&al.pct?'':al&&al.el!=null?`P글래 ${al.e+al.z}개 `:'+'+slotTxt(mu.k[i])+'칸 '}(${esc(E.PERS_KR[wpk]||wpk)} 퍼스널리티)${at?` — ${esc(at)}`:''}`:`없음 — ${esc(E.PERS_KR[wpk]||wpk)} 퍼스널리티 셔틀이 있으면 1명당 속성 P글래·HP 최대 P글래(극존이면 각성의 힘까지)`}</li>`); }
    if(mu && pglCount()){ // 연성 P글래 보유를 표시했으면 이 캐릭터에게 빠진 것
      const r=(state.pgl||{})[E.WEAPON_KR[c.weapon]]||{}, el=(co0=>co0?co0.el:(c.elem||'none'))(ev.sb.cores[i]||ev.normal.cores[i]);
      const want=[[el, (PGL_COLS.find(x=>x[0]===el)||[])[1]], ['hp','HP 최대 시 강화'], ...((ev.sb.zone&&ev.sb.zone.level>=2)||(ev.normal.zone&&ev.normal.zone.level>=2)?[['zone','각성의 힘']]:[])].filter(([k,n])=>n && !(r[k]>0));
      if(want.length) G.push(`<li>! 연성하면 좋은 P글래: ${want.map(([k,n])=>`<b>${esc(n)}</b>&lt;${esc(E.WEAPON_KR[c.weapon])}&gt;`).join(', ')} <span class="hint">(보유 탭 '연성 P글래 보유' 기준, 셔틀이 달면 이 캐릭터에게 공유)</span></li>`); }
    if((mu && mu.front||[]).includes(i)) G.push(`<li>이 캐릭터는 전열 서포터라 자기 공격 글래스터 대신 <b>잠재 연성한 P글래</b>를 달아 딜러에게 공유하는 쪽이 이득</li>`);
    if(c.manifestMax===0) G.push(`<li>현현 무기: 이 캐릭터는 없음</li>`);
    else G.push(`<li>${mark((+o.m||0)>=(c.manifestMax||1))} 현현 무기: ${c.manifestMax===2?'진현현까지 있음':c.manifestMax===1?'현현 있음':'현현 ×1.08 · 진현현 ×1.15'} <span class="hint">(현재 ${['없음','현현','진현현'][+o.m||0]})</span></li>`);
    if(ev.afA && ev.afA.auto){ const fa=ev.afA.fast[i], kn=ev.afA.known&&ev.afA.known[i], sp=ev.afA.spd&&ev.afA.spd[i], S0=settings(), gs=E.gearSpdOf(c, S0), gAuto=S0.gearSpd==null||S0.gearSpd==='';
      const gTxt = gs ? ` + 장비 ${gs}${gAuto?'(자동: 대미지 최적 장비 기준)':''}` : ', 장비 제외';
      const src = kn==='build'?'빌드 코드, 장비 포함':kn==='build-st'?`빌드에 넣은 스탯${gTxt}`:kn==='wiki'?`기본 스탯·천명치 ${pr.t}${gTxt}`:'모름';
      const need = !fa && sp ? 249-sp : 0;
      G.push(`<li>${mark(fa)} AF 중 행동 <b>${ev.afA.n[i]}회</b> (AF 약 ${ev.afA.dur.toFixed(0)}초) · 속도 ${sp?`<b>${sp}</b> (${fa?'249 이상':'249 미만'})`:(fa?'249 이상':'249 미만')} <span class="hint">${src}</span>${fa?'':need>0?` — 속도 <b>+${need}</b>이면 249: ${esc(spdGearTip(need))}. AF 대기 시간이 1초씩 줄어 행동이 늘 수 있지만 대미지 장비 한 칸을 내주는 셈`:' — 속도 249를 넘기면 AF 대기 시간이 1초씩 줄어 행동이 늘어날 수 있음'}</li>`); }
    const sm = ev.sim;
    if(sm){ const mi=sm.mainN[i], H=sm.H;
      G.push(`<li>${mark(!sm.out[i])} MP: 주력기 ${c.mpMain!=null?c.mpMain:'?'} · 최대 약 ${sm.mpMax[i]} → ${H}턴 중 주력기 ${mi}번${sm.out[i]?`, ${sm.out[i]}턴째부터 부족 → MP 소비 감소 글래스터·MP 회복 지원·후열 교대`:' (여유)'}</li>`); }
  } else {
    G.push(`<li>공격 글래스터: 딜 비중이 낮아 생존·MP 회복 계열 권장</li>`);
  }
  const S2 = [];
  if(c.stellar && c.sb) S2.push(`<li>SB: ${skillLine(c.sb)}</li>`);
  if(c.main) S2.push(`<li>평상: ${skillLine(c.main)}</li>`);
  if(r.req) S2.push(`<li>본령 조건: <span class="hint">${esc(r.req_ko||r.req)}</span></li>`);
  const O = (c.cxWhy||[]).map(w=>`<li>${esc(w)}</li>`);
  return `<div class="shead"><b>${esc(c.name)}</b> ${(c.elems.length?c.elems:['none']).map(elChip).join('')} ${esc(E.WEAPON_KR[c.weapon]||'')} ${alDot(c.align)} <span class="tier ${c.tier}">${esc(c.tier||'-')}</span> <span class="hint">${esc(STYLE_KR[r.style]||'')}${c.stellar?' · 성도':''}${(r.ex&&r.ex.pers_ko&&r.ex.pers_ko.length)?' · 퍼스널리티 '+esc(r.ex.pers_ko.join('·')):''}</span><button type="button" class="btn small sclose" data-sclose="1">닫기</button></div>
    <div><h4>이 조합에서</h4><ul>${L.join('')}</ul></div>
    <div><h4>추천 육성·장비</h4><ul>${G.join('')}</ul></div>
    <div><h4>주력 스킬</h4><ul>${S2.join('')||'<li class="hint">—</li>'}</ul></div>
    <div class="eqbox"><h4>장비 <span class="hint">(${esc(E.WEAPON_KR[c.weapon]||'')} · 장비 데이터·계산식 출처: 딩)</span></h4>
      ${o.build?`<p class="hint">내 빌드: ${esc(o.build.weapon||'')} ${buildBadge(o)} — 보유 탭에 넣은 코드로 계산 중</p>`:''}
      <p><button type="button" class="btn small" data-eqrec="${esc(x._key||'')}" data-i="${i}">추천 장비 찾기</button> <span class="hint">이 조합의 버프·존·약점·P글래 공유 조건에서 기대 대미지가 가장 높은 무기·방어구·배지·글래스터·광석을 찾습니다 (몇 초)</span></p>
      <div class="eqout"></div>
      <p><a href="${esc((()=>{ const cd=eqCondFromTeam(x,i); return cd?builderUrl(cd, o.build&&o.build.code||'', c.id):'builder.html'; })())}" target="_blank" rel="noopener">장비 빌더에서 직접 비교 ↗</a> <span class="hint">이 조합 조건을 채워서 엽니다</span></p></div>
    <div><h4>운용 포인트</h4><ul>${O.join('')}${r.note_kr?`<li class="hint">${esc(r.note_kr)}</li>`:''}</ul></div>`;
}
function toggleSetup(memEl){
  const key=memEl.dataset.sk, i=+memEl.dataset.i, rec=RES.get(key); if(!rec) return;
  const box=memEl.closest('.card,.fcard').querySelector(`.setup[data-for="${key}"]`); if(!box) return;
  const open = memEl.getAttribute('aria-expanded')==='true';
  $$(`[data-sk="${key}"]`).forEach(m=>m.setAttribute('aria-expanded','false'));
  if(open){ box.hidden=true; return; }
  memEl.setAttribute('aria-expanded','true');
  rec.x._key = key;
  box.innerHTML = setupHtml(rec.x, i); box.hidden=false;
}
function pctTxt(v){ return v==null?'0%':Math.round(v*100)+'%'; }
function metric(k,v,rel,hot,isSurv){ // rel이 null이면 비교 막대 없이 값만
  const bar = rel===null ? '' : `<div class="bar"><i style="width:${(Math.max(0,Math.min(1,rel||0))*100).toFixed(0)}%"></i></div>`;
  return `<div class="metric${hot?' hot':''}"><div class="k">${k}</div><div class="v">${isSurv?v.toFixed(0)+'점':fmtN(v)}</div>${bar}</div>`; }

/* ---------- 캐릭터별 최적 ---------- */
let pcResult=null, pcToken=0;
async function runPerChar(){
  const P=state.plan, my=++pcToken;
  const boss = P.mode==='boss' ? BOSSES.find(b=>b.id===P.bossId) : null;
  const ids=ownedList();
  if(ids.length<4){ $('#pcTable').innerHTML='<div class="empty">보유 캐릭터가 4명 이상이어야 합니다.</div>'; return; }
  const enemy={}; let any=false; for(const [k,v] of Object.entries(P.enemy)) if(v){ enemy[k]=v; any=true; }
  const rec = boss ? prepped.filter(c=>(boss.recommended||[]).includes(c.raw.name_jp)).map(c=>c.id) : [];
  $('#pcRun').disabled=true; $('#pcProg').hidden=false; $('#pcProg i').style.width='0%';
  const r = await calcPerChar({excluded:P.excluded, backLocked:P.backLocked||[], mode:P.mode==='kesshitsu'||(P.mode==='boss'&&!boss)?'burst':P.mode, enemy:any?enemy:null, boss, recommendedIds:rec, maxDiff:P.maxDiff||4, focus:P.focus||null,
      weights: P.mode==='custom' ? Object.assign({}, P.weights) : null, buddy: buddyInput()},
    f=>{ if(my===pcToken) $('#pcProg i').style.width=Math.round(f*100)+'%'; });
  if(my!==pcToken || !r) return;
  $('#pcRun').disabled=false; $('#pcProg').hidden=true;
  if(r.error){ $('#pcTable').innerHTML=`<div class="empty">${esc(r.error)}</div>`; return; }
  pcResult=r;
  $('#pcMeta').textContent = `${MODE_KR[P.mode]}${P.focus?' · '+focusLabel(P.focus):''}${boss?' · '+boss.name_kr:''}${(P.maxDiff||4)<4?' · 난이도 Lv'+P.maxDiff+' 이하':''} · ${r.evaluated.toLocaleString()}개 조합`;
  renderPerChar();
}
function renderPerChar(){
  if(!pcResult) return;
  const q=($('#pcQ').value||'').trim().toLowerCase();
  const rows = pcResult.list.filter(x=>!q || x.pc.name.toLowerCase().includes(q) || (x.pc.raw.name_jp||'').toLowerCase().includes(q));
  $('#pcTable').innerHTML = `<table class="pct"><thead><tr><th>#</th><th>캐릭터</th><th>점수</th><th>함께 쓸 3명</th><th>존</th><th>난이도</th><th></th></tr></thead><tbody>${
    rows.map((x,i)=>{
      if(x.none) return `<tr><td class="num">—</td><td class="who">${esc(x.pc.name)}</td><td colspan="5" class="hint">난이도 상한 안에서 조합을 찾지 못했습니다.</td></tr>`;
      const z=x.ev.sb.zone;
      const mates=x.team.filter(c=>c.id!==x.pc.id);
      return `<tr><td class="num">${pcResult.list.indexOf(x)+1}</td>
        <td class="who">${elChip(x.pc.elem)} ${esc(x.pc.name)}</td>
        <td><div class="sc"><span class="num">${Math.round(x.rel*100)}</span><div class="bar"><i style="width:${Math.round(x.rel*100)}%"></i></div></div></td>
        <td class="mates">${mates.map(c=>`<b>${esc(c.name)}</b>`).join(' · ')}</td>
        <td>${esc(z&&z.level?z.label:'—')}${z&&z.how?`<div class="zonehow">${esc(z.how)}</div>`:''}</td>
        <td><span class="diff lv${x.diff.lv}">Lv${x.diff.lv} ${esc(x.diff.kr)}</span></td>
        <td><button type="button" class="btn small" data-focus="${esc(x.pc.id)}">1~5위 보기</button></td></tr>`;
    }).join('')}</tbody></table>`;
}

/* ---------- 속성·타입별 조합 ---------- */
let fxToken=0;
async function runFocusAll(){
  const P=state.plan, my=++fxToken;
  const boss = P.mode==='boss' ? BOSSES.find(b=>b.id===P.bossId) : null;
  const ids=ownedList(), grid=$('#fxGrid');
  if(ids.length<4){ grid.innerHTML='<div class="empty">보유 캐릭터가 4명 이상이어야 합니다.</div>'; return; }
  const enemy={}; let any=false; for(const [k,v] of Object.entries(P.enemy)) if(v){ enemy[k]=v; any=true; }
  const rec = boss ? prepped.filter(c=>(boss.recommended||[]).includes(c.raw.name_jp)).map(c=>c.id) : [];
  const mode = P.mode==='kesshitsu'||(P.mode==='boss'&&!boss)?'burst':P.mode, J = jobSnap(), cond = {mode, bossId:boss?boss.id:''};
  for(const k of [...RES.keys()]) if(k[0]==='f') RES.delete(k);
  grid.innerHTML = FOCUS_LIST.map((f,k)=>`<section class="fcard" id="fx-${k}"><div class="fhead"><h3>${f.kind==='elem'?`<span class="dot ${f.v}"></span>`:''}${esc(focusLabel(f))}</h3><span class="hint">대기 중…</span></div></section>`).join('');
  $('#fxRun').disabled=true; $('#fxProg').hidden=false; $('#fxProg i').style.width='0%';
  $('#fxMeta').textContent = `${MODE_KR[P.mode]==='보스 맞춤'&&!boss?'최고점 딜':MODE_KR[P.mode]}${boss?' · '+boss.name_kr:''}${(P.maxDiff||4)<4?' · 난이도 Lv'+P.maxDiff+' 이하':''}`;
  for(let k=0;k<FOCUS_LIST.length;k++){
    const f=FOCUS_LIST[k];
    const r = await calcOptimize('fx', {locked:[], excluded:P.excluded, backLocked:P.backLocked||[], mode, enemy:any?enemy:null, boss, recommendedIds:rec, maxDiff:P.maxDiff||4, focus:f, maxPool:28, topN:3, buddy: buddyInput(), weights: P.mode==='custom' ? Object.assign({}, P.weights) : null},
      v=>{ if(my===fxToken) $('#fxProg i').style.width=Math.round((k+v)/FOCUS_LIST.length*100)+'%'; }, J);
    if(my!==fxToken || !r) return;
    $('#fx-'+k).outerHTML = fcardHtml(f, k, r, cond);
  }
  $('#fxRun').disabled=false; $('#fxProg').hidden=true;
}
function fcardHtml(f, k, r, cond){
  const head = `<div class="fhead"><h3>${f.kind==='elem'?`<span class="dot ${f.v}"></span>`:''}${esc(focusLabel(f))}</h3><button type="button" class="btn small" data-fgo="${k}">1~5위 자세히</button></div>`;
  if(r.error || !r.results || !r.results.length) return `<section class="fcard" id="fx-${k}">${head}<div class="hint">${esc(r.error||'조건에 맞는 조합이 없습니다.')}</div></section>`;
  const top = r.results[0].ev;
  const rows = r.results.map(x=>{
    const key=`f${k}-${x.rank}`; RES.set(key,{x, focus:f, mode:cond.mode, bossId:cond.bossId});
    const ex = x.ex = E.explainTeam(x.team, x.progs, x.ev, settings(), {});
    const order = ex.order;
    const dm = cond.mode==='burst' && x.ev.dummy && !x.ev.dummy.fast && x.ev.dummy.per ? x.ev.dummy : null; // 최고점 모드: 허수아비 기준
    const z = dm ? dm.zFull : x.ev.sb.zone, bad=ex.notes.filter(n=>n.lvl==='off').length;
    const shr = dm ? dm.per : x.ev.sb.per, sbTot=shr.reduce((a,b)=>a+b,0)||1;
    return `<div class="frow">
      <div class="frank">${x.rank}</div>
      <div class="fmain">
        <div class="fmem">${order.map(i=>{ const c=x.team[i], sh=shr[i]/sbTot; return `<span class="mchip${sh>=0.35?' main':''}" role="button" tabindex="0" aria-expanded="false" data-sk="${key}" data-i="${i}" title="추천 세팅 보기">${elChip(c.elem)} ${esc(c.name)}</span>`; }).join('')}</div>
        <div class="fmeta"><span>${esc(z&&z.level?z.label:'존 없음')}</span> · <span class="diff lv${x.diff.lv}">Lv${x.diff.lv}</span> · ${dm?`최고점 <span class="num">${fmtN(x.ev.dummyT)}</span> <span class="hint">(허수아비 어포딜${dm.sbAt?` · AF ${dm.sbAt}번째에 SB`:''})</span>`:`SB 턴 <span class="num">${fmtN(x.ev.sbTurn)}</span> · 평상 <span class="num">${fmtN(x.ev.sustain)}</span>`}${bad?` · <span class="ng">버프 조건 미충족 ${bad}</span>`:''} · <button type="button" class="linkbtn" data-goalsave="${key}">목표로 저장</button> · <button type="button" class="linkbtn" data-share="${key}">링크 복사</button></div>
        <div class="setup" data-for="${key}" hidden></div>
      </div></div>`;
  }).join('');
  return `<section class="fcard" id="fx-${k}">${head}${rows}</section>`;
}


/* ---------- 목표 세팅 ---------- */
const G_RANK={none:0,vc:1,shin:2,goku:3}, G_KR={none:'없음',vc:'상급(VC)',shin:'진',goku:'극'}, M_KR=['없음','현현','진현현'];
const BASE_OWN = ()=>({t:0,s:false,m:0,g:'none',gl:null});
function planCtx(){
  const P=state.plan, boss = P.mode==='boss' ? BOSSES.find(b=>b.id===P.bossId) : null;
  const enemy={}; let any=false; for(const [k,v] of Object.entries(P.enemy)) if(v){ enemy[k]=v; any=true; }
  return {boss, enemy:any?enemy:null, ctx:ctxOf({boss, backLocked:P.backLocked||[]}), mode:P.mode};
}
function evalWith(team, owns){
  const S=settings(), pc=planCtx();
  const progs = team.map((c,i)=>E.charProg(c, owns[i], S));
  return E.evalTeam(team, progs, pc.enemy, S, cap, pc.ctx);
}
function goalScore(ev, mode){ return mode==='sustain' ? ev.sustain : mode==='stability' ? ev.sustain : ev.sbTurn + 0.5*ev.af; }
function defaultTarget(c, dealer, needGoku){
  const cur = state.owned[c.id] || BASE_OWN();
  const t = Math.max(+cur.t||0, c.stellar ? (dealer?200:80) : (dealer?200:0));
  const g = needGoku ? 'goku' : (dealer && G_RANK[cur.g||'none']<2 ? 'shin' : (cur.g||'none'));
  return {t, s: !!c.stellar || !!cur.s, m: Math.max(+cur.m||0, dealer && c.manifestMax>0 ? c.manifestMax : 0), g: G_RANK[g]>=G_RANK[cur.g||'none']?g:(cur.g||'none'),
    gl: dealer ? {mode:'auto', ore: !!(cur.gl&&cur.gl.ore)} : (cur.gl||null)};
}
function makeGoal(ids, x, mode){
  const team = ids.map(id=>byId.get(id)).filter(Boolean); if(team.length!==4) return null;
  const ev = x ? x.ev : evalWith(team, team.map(c=>Object.assign(BASE_OWN(), state.owned[c.id]||{}, {t:Math.max(80,+(state.owned[c.id]||{}).t||0), s:!!c.stellar})));
  const sum=a=>a.reduce((q,v)=>q+v,0)||1;
  const sh = team.map((c,i)=>Math.max(ev.sb.per[i]/sum(ev.sb.per), ev.normal.per[i]/sum(ev.normal.per)));
  const tgt={};
  team.forEach((c,i)=>{
    const zc=(ev.sb.zones||[]).find(z=>z.by===c.id);
    const needGoku = !!(c.zone && c.zoneAwak && zc && zc.unmet && zc.unmet.length);
    tgt[c.id]=defaultTarget(c, sh[i]>=0.12, needGoku);
  });
  return {id:'g'+Date.now().toString(36), members:ids, tgt, mode:mode||state.plan.mode, ts:Date.now()};
}
function saveGoalFromResult(key){
  const rec=RES.get(key); if(!rec) return;
  const ids=rec.x.team.map(c=>c.id);
  state.goals = state.goals||[];
  if(state.goals.some(g=>g.members.slice().sort().join()===ids.slice().sort().join())){ flash('이미 같은 조합이 목표에 있습니다.'); return; }
  const g=makeGoal(ids, rec.x, rec.mode); if(!g) return;
  state.goals.unshift(g); save(); renderGoals(); flash('목표 세팅 탭에 저장했습니다.');
}
function flash(t){ let el=$('#flash'); if(!el){ el=document.createElement('div'); el.id='flash'; el.className='flash'; el.setAttribute('role','status'); document.body.appendChild(el); } el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),2200); }
function thresholdsCrossed(c, a, b){
  const L=[]; const add=(v,l)=>{ if(a<v && b>=v) L.push(v+' '+l); };
  if(c.stellar){ add(15,'성도 스킬'); add(30,'성도 스킬 완전'); add(50,'스탯'); add(80,'스탯 노드'); }
  add(120,'배지 칸'); add(200,'글래스터 4칸'); add(255,'전 스탯');
  return L;
}
function goalAnalysis(g){
  const team=g.members.map(id=>byId.get(id)); if(team.some(c=>!c)) return null;
  const curOwn = team.map(c=>Object.assign(BASE_OWN(), state.owned[c.id]||{}));
  const tgOwn = team.map((c,i)=>{ const t=g.tgt[c.id]||{}; return Object.assign({}, curOwn[i], t, {gl: t.gl===undefined?curOwn[i].gl:t.gl}); });
  const evC=evalWith(team, curOwn), evT=evalWith(team, tgOwn);
  const mode=g.mode||state.plan.mode, sC=goalScore(evC,mode)||1e-9, sT=goalScore(evT,mode);
  const S=settings();
  const items=[];
  team.forEach((c,i)=>{
    const cu=curOwn[i], tg=tgOwn[i], owned=!!state.owned[c.id];
    const push=(label, patch, extra)=>{
      const own2=curOwn.map((o,k)=>k===i?Object.assign({},o,patch):o);
      const gain = goalScore(evalWith(team, own2), mode)/sC - 1;
      items.push({i, label, gain, extra});
    };
    if(!owned) items.push({i, label:'캐릭터 획득', gain:null, need:true});
    if(c.stellar && tg.s && !cu.s) push('성도각성', {s:true, t:Math.max(cu.t,15)}, '천명치 15 이상과 함께');
    if((+tg.t||0) > (+cu.t||0)){ const cr=thresholdsCrossed(c, +cu.t||0, +tg.t); push(`천명치 ${cu.t||0} → ${tg.t} (+${tg.t-(cu.t||0)})`, {t:+tg.t, s:tg.s}, cr.join(' · ')); }
    if((+tg.m||0) > (+cu.m||0)) push(`${M_KR[+tg.m]} 무기`, {m:+tg.m});
    if(G_RANK[tg.g||'none'] > G_RANK[cu.g||'none']) push(`전용 글래스터 ${G_KR[tg.g]}`, {g:tg.g}, tg.g==='goku'&&c.zone?'극존 해금':'');
    const infC = evC.A.inf || evC.A.painAny;
    const fC=E.grastaFactor(E.charProg(c,cu,S), infC).f, fT=E.grastaFactor(E.charProg(c,Object.assign({},cu,{gl:tg.gl}),S), infC).f;
    if(tg.gl && fT>fC+1e-6){ const gq=E.grastaFactor(E.charProg(c,Object.assign({},cu,{gl:tg.gl}),S), infC); push(`공격 글래스터 → ${glText(gq)}${tg.gl.ore&&!(cu.gl&&cu.gl.ore)?' + 잠재 광석':''}`, {gl:tg.gl}); }
  });
  const minor = items.filter(x=>!x.need && Math.abs(x.gain)<0.001);
  const main = items.filter(x=>x.need || Math.abs(x.gain)>=0.001);
  main.sort((a,b)=>(b.need?1:0)-(a.need?1:0) || (b.gain||0)-(a.gain||0));
  return {minor, team, curOwn, tgOwn, evC, evT, gainAll: sT/sC-1, items:main, mode};
}
function renderGoals(){
  const box=$('#goalList'); if(!box) return;
  const G=state.goals||[];
  $('#tabGoalN').textContent=G.length;
  if(!G.length){ box.innerHTML='<div class="empty">아직 목표가 없습니다. 편성 추천 결과에서 <b>목표로 저장</b>을 누르거나 위에서 4명을 골라 보세요.</div>'; return; }
  box.innerHTML = G.map(goalHtml).join('');
}
function goalHtml(g){
  const A=goalAnalysis(g);
  if(!A) return `<section class="card goal" data-goal="${esc(g.id)}"><div class="card-head"><b>삭제된 캐릭터가 포함된 목표</b><button type="button" class="btn small" data-gdel="${esc(g.id)}">삭제</button></div></section>`;
  const {team, curOwn, tgOwn, evC, evT, items} = A;
  const unowned = team.filter(c=>!state.owned[c.id]);
  const done = items.filter(x=>!x.need).length===0 && !unowned.length;
  const pctS = v=>(v>=0?'+':'')+(v*100).toFixed(1)+'%';
  const mem = team.map((c,i)=>{
    const cu=curOwn[i], tg=tgOwn[i], o=!!state.owned[c.id], gk=glKey(tg.gl);
    const st=(ok)=>ok?'<span class="ok">✓</span>':'<span class="ng">남음</span>';
    return `<div class="gmem" data-gid="${esc(g.id)}" data-cid="${esc(c.id)}">
      <div class="gh"><b>${esc(c.name)}</b> ${elChip(c.elem)} <span class="tier ${c.tier}">${esc(c.tier||'-')}</span> ${o?'':'<span class="badge warn">미보유</span>'}</div>
      <div class="grow"><span>천명치</span><span class="num">${cu.t||0}</span><span>→</span><input type="number" min="0" max="255" data-gf="t" value="${tg.t||0}" aria-label="${esc(c.name)} 목표 천명치">${st((cu.t||0)>=(tg.t||0))}</div>
      ${c.stellar?`<div class="grow"><span>성도각성</span><span>${cu.s?'완료':'안 함'}</span><span>→</span><label><input type="checkbox" data-gf="s" ${tg.s?'checked':''}> 목표</label>${st(!tg.s||cu.s)}</div>`:''}
      <div class="grow"><span>현현</span><span>${M_KR[+cu.m||0]}</span><span>→</span>${c.manifestMax===0?'<span class="hint">현현 무기 없음</span>':`<select data-gf="m">${M_KR.slice(0,(c.manifestMax||2)+1).map((l,k)=>`<option value="${k}"${(+tg.m||0)===k?' selected':''}>${l}</option>`).join('')}</select>`}${st((+cu.m||0)>=(+tg.m||0))}</div>
      <div class="grow"><span>전용 글래</span><span>${G_KR[cu.g||'none']}</span><span>→</span><select data-gf="g">${Object.entries(G_KR).map(([k,l])=>`<option value="${k}"${(tg.g||'none')===k?' selected':''}>${l}</option>`).join('')}</select>${st(G_RANK[cu.g||'none']>=G_RANK[tg.g||'none'])}</div>
      <div class="grow"><span>공격 글래</span><span>${esc({def:'기본',auto:'자동',none:'없음'}[glKey(cu.gl)]||GL_PRESETS[glKey(cu.gl)].label)}</span><span>→</span><select data-gf="gl">${Object.entries(GL_PRESETS).map(([k,p])=>`<option value="${k}"${gk===k?' selected':''}>${p.label}</option>`).join('')}</select><label title="잠재 광석"><input type="checkbox" data-gf="ore" ${tg.gl&&tg.gl.ore?'checked':''} ${tg.gl?'':'disabled'}> 광석</label></div>
    </div>`;
  }).join('');
  const list = items.length ? `<ol class="gitems">${items.map(x=>`<li><b>${esc(team[x.i].name)}</b> · ${esc(x.label)}${x.extra?` <span class="hint">(${esc(x.extra)})</span>`:''} ${x.need?'<span class="ng">편성 필수</span>':`<span class="gain">${pctS(x.gain)}</span>`}</li>`).join('')}</ol>`
    : (A.minor.length?'':'<p class="ok" style="margin:0">목표를 모두 채웠습니다.</p>');
  const minorTxt = A.minor.length ? `<p class="hint" style="margin:6px 0 0">화력 변화가 거의 없는 항목: ${A.minor.map(x=>esc(team[x.i].name+' '+x.label)).join(', ')} — 이 조합에서는 딜 비중이 낮거나 이미 상한이라 우선순위가 낮습니다.</p>` : '';
  const mlabel = {burst:'최고점',sustain:'지속',stability:'지속',weak:'최고점',boss:'최고점'}[A.mode]||'최고점';
  return `<section class="card goal" data-goal="${esc(g.id)}">
    <div class="card-head">
      <div class="gname">${team.map(c=>esc(c.name)).join(' · ')}</div>
      ${done?'<span class="cond ok">달성</span>':''}
      <span class="hint">${esc(MODE_KR[A.mode]||'')} 기준</span>
      <button type="button" class="btn small" data-gdel="${esc(g.id)}" style="margin-left:auto">삭제</button>
    </div>
    <div class="metrics">
      <div class="metric"><div class="k">지금 SB 턴</div><div class="v">${unowned.length?'—':fmtN(evC.sbTurn)}</div></div>
      <div class="metric"><div class="k">목표 SB 턴</div><div class="v">${fmtN(evT.sbTurn)}</div></div>
      <div class="metric"><div class="k">지금 일반 턴</div><div class="v">${unowned.length?'—':fmtN(evC.sustain)}</div></div>
      <div class="metric hot"><div class="k">목표 달성 시 ${mlabel}</div><div class="v">${unowned.length?'획득 후':pctS(A.gainAll)}</div></div>
    </div>
    <div><h4 class="gsub">남은 것 · 화력 오르는 순서</h4>${list}${minorTxt}<p class="hint" style="margin:6px 0 0">퍼센트는 그 항목 하나만 채웠을 때 이 조합의 ${mlabel} 화력 변화입니다. 재료 개수·입수처는 계산하지 않습니다.</p></div>
    <div class="gmems">${mem}</div>
  </section>`;
}
function onGoalInput(e){
  const t=e.target, row=t.closest('.gmem'); if(!row||!t.dataset.gf) return;
  const g=(state.goals||[]).find(x=>x.id===row.dataset.gid); if(!g) return;
  const id=row.dataset.cid, tg=g.tgt[id]||(g.tgt[id]={}), f=t.dataset.gf;
  if(f==='t') tg.t=Math.max(0,Math.min(255,parseInt(t.value||'0',10)||0));
  else if(f==='s') tg.s=t.checked;
  else if(f==='m') tg.m=+t.value;
  else if(f==='g') tg.g=t.value;
  else if(f==='gl'){ const p=GL_PRESETS[t.value]; tg.gl = p.v ? Object.assign({}, p.v, {ore: tg.gl?!!tg.gl.ore:false}) : null; }
  else if(f==='ore'){ if(tg.gl) tg.gl.ore=t.checked; }
  save();
  clearTimeout(onGoalInput._t);
  onGoalInput._t = setTimeout(()=>{ const sec=$(`#goalList .goal[data-goal="${g.id}"]`); if(sec) sec.outerHTML=goalHtml(g); }, 0);
}
let goalPick=[];
function setupGoalPicker(){
  const inp=$('#goalIn'), drop=$('#goalDrop'); let items=[];
  const close=()=>{ drop.hidden=true; };
  const refresh=()=>{
    const q=inp.value.trim().toLowerCase(); if(!q){ close(); return; }
    items=prepped.filter(c=>!goalPick.includes(c.id) && (c.name.toLowerCase().includes(q)||(c.raw.name_jp||'').toLowerCase().includes(q))).slice(0,30);
    drop.innerHTML = items.map((c,i)=>`<button type="button" data-i="${i}">${elChip(c.elem)} ${esc(c.name)} <span class="tier ${c.tier}">${esc(c.tier)}</span>${state.owned[c.id]?'':' <span class="badge">미보유</span>'}</button>`).join('') || '<div class="hint" style="padding:8px 10px">일치하는 캐릭터가 없습니다.</div>';
    drop.hidden=false;
  };
  const render=()=>{ $('#goalChips').innerHTML=goalPick.map(id=>`<span class="chip">${esc(byId.get(id).name)}<button type="button" data-gpr="${esc(id)}" aria-label="빼기">×</button></span>`).join(''); $('#goalAdd').disabled=goalPick.length!==4; $('#goalAdd').textContent=goalPick.length===4?'목표로 추가':`목표로 추가 (${goalPick.length}/4)`; };
  inp.addEventListener('input',refresh); inp.addEventListener('focus',refresh); inp.addEventListener('blur',()=>setTimeout(close,120));
  drop.addEventListener('mousedown',e=>{ const b=e.target.closest('button[data-i]'); if(!b) return; e.preventDefault(); if(goalPick.length<4) goalPick.push(items[+b.dataset.i].id); inp.value=''; close(); render(); });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter' && items[0] && !drop.hidden){ e.preventDefault(); if(goalPick.length<4) goalPick.push(items[0].id); inp.value=''; close(); render(); } });
  $('#goalChips').addEventListener('click',e=>{ const b=e.target.closest('[data-gpr]'); if(!b) return; goalPick=goalPick.filter(x=>x!==b.dataset.gpr); render(); });
  $('#goalAdd').addEventListener('click',()=>{ if(goalPick.length!==4) return; const g=makeGoal(goalPick.slice(), null); if(!g) return; state.goals=state.goals||[]; state.goals.unshift(g); goalPick=[]; render(); save(); renderGoals(); });
  render();
}

/* ---------- 보유 탭 ---------- */
function rosterFilters(){
  return {q:($('#rq').value||'').trim().toLowerCase(), el:$('#rel').value, wp:$('#rwp').value, al:$('#ral').value, tier:$('#rtier').value, own:$('#rown').value};
}
function renderRoster(){
  const F=rosterFilters();
  const list = prepped.filter(c=>{
    if(F.q && !(c.name.toLowerCase().includes(F.q) || (c.raw.name_jp||'').toLowerCase().includes(F.q))) return false;
    if(F.el && !c.elems.includes(F.el)) return false;
    if(F.wp && c.weapon!==F.wp) return false;
    if(F.al && c.align!==F.al) return false;
    if(F.tier && (c.tier||'-')!==F.tier) return false;
    const o=!!state.owned[c.id];
    if(F.own==='own' && !o) return false; if(F.own==='no' && o) return false;
    return true;
  }).sort((a,b)=>{
    const ta={SS:0,S:1,A:2,B:3,C:4}[a.tier]??5, tb={SS:0,S:1,A:2,B:3,C:4}[b.tier]??5;
    return ta-tb || (b.score-a.score) || a.name.localeCompare(b.name,'ko');
  });
  rosterShown = list.map(c=>c.id);
  $('#roster').innerHTML = list.map(rowHtml).join('') || `<div class="empty">조건에 맞는 캐릭터가 없습니다.</div>`;
  $('#selNoneConfirm').hidden = true;
  updateRosterCount();
}
let rosterShown = [];
/* 보유 수 · 전체 선택 체크 상태 (표시된 캐릭터 기준) */
function updateRosterCount(){
  const own = ownedList().length, n = rosterShown.length, k = rosterShown.filter(id=>state.owned[id]).length;
  $('#rcount').textContent = `보유 ${own}명 · 표시 ${n}명 / 전체 ${prepped.length}명`;
  $('#tabOwnN').textContent = own;
  const cb = $('#selAll'), F = rosterFilters(), filtered = !!(F.q||F.el||F.wp||F.al||F.tier||F.own);
  cb.checked = n>0 && k===n; cb.indeterminate = k>0 && k<n; cb.disabled = n===0;
  $('#selAllLbl').textContent = filtered ? `표시된 ${n}명 전체 선택` : `전체 선택 (${n}명)`;
}
function selectAllShown(on){
  if(on){
    for(const id of rosterShown) if(!state.owned[id]) state.owned[id]={t:0,s:!!byId.get(id).stellar,m:0,g:'none',gl:null};
    touchRoster(); renderRoster(); return;
  }
  const lose = rosterShown.filter(id=>state.owned[id]);
  if(!lose.length){ updateRosterCount(); return; }
  // 해제는 입력한 천명치·글래스터도 함께 지워지므로 한 번 더 확인
  updateRosterCount();
  $('#selNoneMsg').textContent = `표시된 보유 ${lose.length}명을 해제할까요? 천명치·글래스터 입력도 지워집니다.`;
  $('#selNoneConfirm').hidden = false;
}
function rowHtml(c){
  const o=state.owned[c.id];
  const r=c.raw;
  const head=`<input type="checkbox" id="own-${esc(c.id)}" data-own="${esc(c.id)}" ${o?'checked':''} aria-label="${esc(c.name)} 보유">
    <label class="who" for="own-${esc(c.id)}"><span class="n">${esc(c.name)}${r._custom?' <span class="badge">직접 추가</span>':''}</span>
    <span class="m">${(c.elems.length?c.elems:['none']).map(elChip).join('')} ${esc(E.WEAPON_KR[c.weapon]||'')} ${alDot(c.align)}${c.align==='light'?'천':'명'} <span class="tier ${c.tier}">${esc(c.tier||'-')}</span> ${esc(STYLE_KR[r.style]||'')}${c.stellar?' · 성도':''}</span></label>`;
  const stBtn = `<button type="button" class="lnk" data-stat aria-expanded="false" title="기본 스탯과 천명치별 값">스탯</button>`;
  if(!o) return `<div class="row off" data-id="${esc(c.id)}">${head}<div class="ctl">${stBtn}<span class="hint">${esc((r.note_kr||'').slice(0,70))}${(r.note_kr||'').length>70?'…':''}</span></div><div class="stwrap" hidden></div></div>`;
  const t=+o.t||0;
  const warn = c.stellar && o.s && t<15 ? `<span class="badge warn">15 미만: 성도 스킬 잠김</span>` : '';
  const gk = glKey(o.gl);
  return `<div class="row" data-id="${esc(c.id)}">${head}
    <div class="ctl">
      <span class="tm"><label for="t-${esc(c.id)}">천명치</label><input type="number" min="0" max="255" id="t-${esc(c.id)}" data-f="t" value="${t}">
        <span class="tmbar" title="15·30·50·80 성도 포인트 / 200 글래스터 칸 / 255 전 스탯">${[15,30,50,80,200,255].map(v=>`<b style="left:${v/255*100}%"></b>`).join('')}<i style="width:${Math.min(t,255)/255*100}%"></i></span></span>
      <label><input type="checkbox" data-f="s" ${o.s?'checked':''} ${c.stellar?'':'disabled'}> 성도각성</label>
      <label>현현 <select data-f="m"><option value="0"${!o.m?' selected':''}>없음</option><option value="1"${o.m==1?' selected':''}>현현</option><option value="2"${o.m==2?' selected':''}>진현현</option></select></label>
      <label>전용 글래 <select data-f="g">${[['none','없음'],['vc','상급(VC)'],['shin','진'],['goku','극']].map(([v,l])=>`<option value="${v}"${(o.g||'none')===v?' selected':''}>${l}</option>`).join('')}</select></label>
      <label>공격 글래 <select data-f="gl">${Object.entries(GL_PRESETS).map(([k,p])=>`<option value="${k}"${gk===k?' selected':''}>${p.label}</option>`).join('')}</select></label>
      <label title="잠재 광석: 장착 캐릭터가 공격으로 독·페인을 직접 부여"><input type="checkbox" data-f="ore" ${o.gl&&o.gl.ore?'checked':''} ${o.gl?'':'disabled'}> 잠재 광석</label>
      <span class="badge">${t>=200?'글래 4칸':'글래 3칸'}</span>${warn}
      ${buildCtlHtml(c, o)} ${stBtn}
    </div><div class="stwrap" hidden></div></div>`;
}
function onRosterChange(e){
  const t=e.target;
  if(t.dataset.own){
    const id=t.dataset.own;
    if(t.checked) state.owned[id]={t:0,s:!!byId.get(id).stellar,m:0,g:'none',gl:null};
    else delete state.owned[id];
    touchRoster();
    const row=t.closest('.row'); row.outerHTML=rowHtml(byId.get(id));
    updateRosterCount();
    return;
  }
  const row=t.closest('.row'); if(!row||!t.dataset.f) return;
  const id=row.dataset.id, o=state.owned[id]; if(!o) return;
  const f=t.dataset.f;
  if(f==='t'){ o.t=Math.max(0,Math.min(255,parseInt(t.value||'0',10)||0)); }
  else if(f==='s') o.s=t.checked;
  else if(f==='m') o.m=+t.value;
  else if(f==='g') o.g=t.value;
  else if(f==='gl'){ const p=GL_PRESETS[t.value]; o.gl = p.v ? Object.assign({}, p.v, {ore: o.gl?!!o.gl.ore:false}) : null; }
  else if(f==='ore'){ if(o.gl) o.gl.ore=t.checked; }
  touchRoster();
  if(f==='t'||f==='gl'||f==='s'){ row.outerHTML=rowHtml(byId.get(id)); }
}
function renderDefGl(){
  const g=Object.assign({}, E.DEFAULT_SETTINGS.grastaDefault, state.settings.grastaDefault||{});
  const k=glKey(g);
  $('#defGl').innerHTML = Object.entries(GL_PRESETS).filter(([k])=>k!=='def').map(([kk,p])=>`<option value="${kk}"${kk===k?' selected':''}>${p.label}</option>`).join('');
  $('#defOre').checked=!!g.ore;
}

/* ---------- 이름으로 한 번에 체크 ---------- */
// 공백·괄호·전각 차이 무시: "질퍼니 AS" = "질퍼니(AS)" = "질퍼니（AS）"
const normName = s => String(s||'').normalize('NFKC').toLowerCase().replace(/[\s()\[\]{}【】「」『』〈〉《》<>·・]/g,'');
function nameIndex(){
  const m=new Map(), put=(n,id)=>{ const k=normName(n); if(k && !m.has(k)) m.set(k,id); };
  for(const c of prepped) put(c.name, c.id);           // 한국어 이름 우선
  for(const c of prepped){ put(c.raw.name_jp, c.id); put(c.id, c.id); }
  return m;
}
function matchName(tok, idx){
  const k=normName(tok);
  if(idx.has(k)) return {id:idx.get(k), t:null, name:tok};
  const m=tok.match(/^(.*?)[\s:：=]*(\d{1,3})\s*$/); // 이름 뒤 숫자 = 천명치
  if(m && normName(m[1])){
    const t=Math.min(255, parseInt(m[2],10));
    const k2=normName(m[1]); return {id:idx.get(k2)||null, t, name:m[1].trim()};
  }
  return {id:null, t:null, name:tok};
}
function editDist(a,b){
  if(a===b) return 0; if(!a.length) return b.length; if(!b.length) return a.length;
  let prev=Array.from({length:b.length+1},(_,j)=>j);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[b.length];
}
function suggestName(q){
  const k=normName(q); if(!k) return null;
  let best=null, bd=Infinity;
  for(const c of prepped) for(const n of [c.name, c.raw.name_jp]){
    const kn=normName(n); if(!kn) continue;
    const d = (kn.includes(k)||k.includes(kn)) ? Math.abs(kn.length-k.length)*0.3 : editDist(k,kn);
    if(d<bd){ bd=d; best=c; }
  }
  return best && bd<=Math.max(1, Math.ceil(k.length/2)) ? best.name : null;
}
function quickCheck(){
  const toks=String($('#quickText').value||'').split(/[\n\r,;\t，、；]+/).map(t=>t.trim()).filter(Boolean);
  const msg=$('#quickMsg');
  if(!toks.length){ msg.textContent='이름을 줄바꿈이나 쉼표로 나눠 넣어 주세요.'; return; }
  const idx=nameIndex(), found=new Map(), miss=[];
  for(const tok of toks){
    const r=matchName(tok, idx);
    if(!r.id){ if(!miss.includes(r.name)) miss.push(r.name); continue; }
    if(r.t!=null || !found.has(r.id)) found.set(r.id, r.t);
  }
  let added=0, upd=0;
  if(found.size && $('#quickReset').checked) state.owned={};
  for(const [id,t] of found){
    const o=state.owned[id];
    if(!o){ state.owned[id]={t:t!=null?t:0, s:!!byId.get(id).stellar, m:0, g:'none', gl:null}; added++; }
    else if(t!=null && (+o.t||0)!==t){ o.t=t; upd++; }
  }
  if(found.size){ touchRoster(); renderRoster(); $('#quickReset').checked=false; }
  const detail = [added?`새로 ${added}명`:'', upd?`천명치 갱신 ${upd}명`:''].filter(Boolean).join(' · ');
  msg.innerHTML = `<b>${found.size}명 체크</b>${detail?` (${detail})`:''}`
    + (miss.length ? `, 못 찾은 이름: ${miss.map(n=>{ const sg=suggestName(n); return `<span class="miss">${esc(n)}</span>${sg?` <span class="hint">(혹시: ${esc(sg)}?)</span>`:''}`; }).join(', ')}` : '');
}

/* ---------- 직접 추가 ---------- */
function addCustom(e){
  e.preventDefault();
  const v=id=>$('#'+id).value, n=id=>+($('#'+id).value||0);
  const name=v('cName').trim(); if(!name){ $('#cMsg').textContent='이름을 입력하세요.'; return; }
  const el=v('cEl'), wp=v('cWp'), kind=v('cKind');
  const wt = kind==='mag'?'magic':(E.WEAPON_TYPE[wp]||'slash');
  const ztype=v('cZone');
  const c={id:'custom_'+Date.now().toString(36), _custom:true, name_kr:name, name_jp:'', style:'NS', element:[el], weapon:wp, align:v('cAl'),
    stellar:n('cSbMult')>0, release_jp:'', tier:'', score:0, roles:[v('cRole')],
    main:{skill:'주력 스킬', target:v('cTgt'), kind, stat:kind==='mag'?'int':'pwr', element:el, weapon_type:wt, mult:n('cMult')||1, size:v('cSize'), hits:n('cHits')||1, repeat:n('cRep'), crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x:1, condition:''},
    sb: n('cSbMult')>0 ? {skill:'성도 스킬', target:v('cTgt'), kind, stat:kind==='mag'?'int':'pwr', element:el, weapon_type:wt, mult:n('cSbMult'), size:'xxl', hits:n('cHits')||1, repeat:0, crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x:1, condition:''} : null,
    self_buff:{pwr:n('cSelfStat'), int:n('cSelfStat'), spd:0, elem_atk:n('cSelfEl'), weapon_atk:0, crit_rate:0, crit_dmg:0, over_crit:false, singular_focus:false, mental_focus:false, overthrow:false, eagle_eyes:false, weak_dmg:0, multihit:false},
    party_buff:{scope:'all', restrict:'', pwr:n('cPStat'), int:n('cPStat'), spd:0, all_elem_atk:n('cPEl'), elem_atk:{}, weapon_atk:{}, crit_rate:0, crit_dmg:0, over_crit:false, singular_focus:false, mental_focus:false, overthrow:false, eagle_eyes:false, weak_dmg:0, multihit:false, link:false, barrier_pierce:false, extra_hit:false, mp_cost_zero:false},
    debuff:{pwr:0,int:0,spd:0, all_elem_res:n('cDEl'), elem_res:{}, phys_res:n('cDPh'), mag_res:n('cDMg'), weapon_res:{}, break:'', weak_expose:'', pain_poison:$('#cPain').checked},
    zone: ztype ? {type: ztype==='elem'?el:ztype==='weap'?wt:ztype, awakened:$('#cZoneAw').checked, condition: $('#cZoneAw').checked?'ZONE 각성 가능':''} : null,
    support:{heal:n('cHeal'), barrier:n('cBar'), cleanse:n('cCln'), revive:false, guard:n('cGrd'), taunt:0, mp_recover:0, af_gauge:0, status_immune:0},
    req:'', tags:[], note_kr:'직접 추가한 캐릭터'};
  state.custom.push(c);
  state.owned[c.id]={t:n('cT'), s:c.stellar, m:0, g:'none', gl:null};
  touchRoster(); rebuildChars(); renderRoster(); renderCustomList();
  $('#cMsg').textContent=`${name} 추가됨 (보유로 체크됨).`;
  e.target.reset();
}
function renderCustomList(){
  $('#customList').innerHTML = (state.custom||[]).map(c=>`<span class="chip">${esc(c.name_kr)} <button type="button" data-delc="${esc(c.id)}" aria-label="${esc(c.name_kr)} 삭제">×</button></span>`).join('') || '<span class="hint">직접 추가한 캐릭터가 없습니다.</span>';
}

/* ---------- 보스 탭 ---------- */
let curBoss = null;
function renderBossList(){
  const f=$('#bossFilter').value, q=($('#bossQ').value||'').trim().toLowerCase();
  const list=BOSSES.filter(b=>(!f||b.content.startsWith(f)) && (!q || b.name_kr.toLowerCase().includes(q) || (b.name_jp||'').toLowerCase().includes(q)));
  $('#bossList').innerHTML=list.map(b=>`<button type="button" class="bossitem" data-boss="${esc(b.id)}" aria-current="${curBoss===b.id}"><div class="bn">${esc(b.name_kr)}</div><div class="bc">${esc(CONTENT_KR(b.content))} · 약점 ${b.weak.length?b.weak.map(t=>E.ELEM_KR[t]||E.WT_KR[t]).join('·'):'없음'}</div></button>`).join('') || '<div class="hint">일치하는 보스가 없습니다.</div>';
  if(!curBoss && list.length){ curBoss=list[0].id; renderBossList(); return; }
  renderBossDetail();
}
function relChips(label, arr, cls){ if(!arr||!arr.length) return ''; return `<span class="t">${label}</span>${arr.map(t=>`<span class="etype" data-rel="${cls}" style="display:inline-block;padding:1px 8px;cursor:default">${esc(E.ELEM_KR[t]||E.WT_KR[t]||t)}</span>`).join('')}`; }
function renderBossDetail(){
  const b=BOSSES.find(x=>x.id===curBoss); const box=$('#bossDetail');
  if(!b){ box.innerHTML='<div class="hint">왼쪽에서 보스를 고르세요.</div>'; return; }
  const ownJp=new Map(ownedList().map(id=>[byId.get(id).raw.name_jp, byId.get(id).name]));
  const allJp=new Map(prepped.map(c=>[c.raw.name_jp,c.name]));
  const needs=Object.entries(b.needs||{}).filter(([k,v])=>v).map(([k])=>`<span class="need">${esc(NEED_KR[k]||k)}</span>`).join('');
  box.innerHTML=`<div><div class="hint">${esc(CONTENT_KR(b.content))}${b.name_jp?' · '+esc(b.name_jp):''}</div><h2>${esc(b.name_kr)}</h2></div>
    <div class="rels">${relChips('약점',b.weak,'weak')} ${relChips('내성',b.resist,'resist')} ${relChips('무효',b.null,'null')} ${relChips('흡수',b.absorb,'absorb')}${(!b.weak.length&&!b.resist.length&&!b.null.length&&!b.absorb.length)?'<span class="hint">약점·내성 정보 없음 (전속성 등배로 계산)</span>':''}</div>
    <div class="sec"><h3>필요 요소</h3><div class="needs">${needs||'<span class="hint">—</span>'}</div></div>
    <div class="sec"><h3>페이즈</h3><p>${esc(b.phases||'—')}</p></div>
    <div class="sec"><h3>핵심 기믹</h3><ul>${(b.mechanics||[]).map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>
    <div class="sec"><h3>공략 요약</h3><p>${esc(b.strategy_kr||'—')}</p></div>
    <div class="sec"><h3>공략 추천 캐릭터 <span class="hint">(초록 = 보유)</span></h3><div class="recs">${(b.recommended||[]).map(j=>{const kr=allJp.get(j); const own=ownJp.has(j); return `<span class="rec ${own?'own':kr?'':'no'}">${esc(kr||j)}</span>`;}).join('')||'<span class="hint">—</span>'}</div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button type="button" class="btn primary" id="bossGo">이 보스로 편성 추천</button>${b.source?`<a href="${esc(b.source)}" target="_blank" rel="noopener" class="hint">출처: altema</a>`:''}</div>`;
}
function bossToEnemy(b){ const en={}; (b.absorb||[]).forEach(t=>en[t]='absorb'); (b.null||[]).forEach(t=>en[t]='null'); (b.resist||[]).forEach(t=>en[t]='resist'); (b.weak||[]).forEach(t=>en[t]='weak'); return en; }
function applyBoss(id){
  const b=BOSSES.find(x=>x.id===id); if(!b) return;
  state.plan.mode='boss'; state.plan.bossId=id; state.plan.enemy=bossToEnemy(b);
  state.plan.enemyCount = b.needs&&b.needs.multi_target&&!b.needs.single_target?3:1;
  save(); renderPlanControls();
}

/* ---------- 계산 방식 탭: 상수 ---------- */
function renderConsts(){
  const S=settings();
  const z=(k,i)=>`<input type="number" step="0.1" min="0" id="${k}${i}" data-arr="${k}" data-i="${i}" value="${S[k][i]}">`;
  $('#constBox').innerHTML=`
    <div class="crow h"><span></span><span>일반</span><span>극</span><span>절</span></div>
    <div class="crow"><span>속성 존 (같은 속성)</span>${z('zoneElem',0)}${z('zoneElem',1)}${z('zoneElem',2)}</div>
    <div class="crow"><span>공격종 존 (같은 종류)</span>${z('zoneWeap',0)}${z('zoneWeap',1)}${z('zoneWeap',2)}</div>
    <div class="crow"><span>상극 속성 / 다른 공격종</span><input type="number" step="0.05" id="cOpp" value="${S.zoneOppElem}"><input type="number" step="0.05" id="cOff" value="${S.zoneOffWeap}"><span></span></div>
    <div class="crow"><span>AF 행동 수</span><label class="checkrow" style="align-items:center" title="게이지(초당 10% 감소, 타격으로 충전)와 속도(249 기준 대기 시간)로 캐릭터별 행동 수를 계산"><input type="checkbox" id="cAfAuto" ${S.afAuto!==false?'checked':''}> 자동(게이지·속도)</label><label style="display:flex;gap:4px;align-items:center" title="자동을 끄면 모두 이 횟수">고정 <input type="number" step="1" min="1" max="15" id="cAf" value="${S.afActions}" style="width:56px"></label><label class="checkrow" style="align-items:center" title="지속 딜에 AF 주기(턴당 게이지 충전으로 계산)를 넣음"><input type="checkbox" id="cAfCycle" ${S.afCycle!==false?'checked':''}> 지속 딜에 AF 주기</label></div>
    <div class="crow"><span>AF 연출 시간(초) · 속도</span><input type="number" step="0.5" min="0.5" max="5" id="cAfAnim" value="${S.afAnim}"><label class="checkrow" style="align-items:center" title="빌드 코드가 없는 캐릭터의 속도를 249 이상으로 볼지"><input type="checkbox" id="cAfFast" ${S.afFastDefault?'checked':''}> 빌드 없는 캐릭터도 속도 249 이상</label><span></span></div>
    <div class="crow"><span>개전 게이지: AF 시작 % · SB 행동당 %</span><input type="number" step="10" min="0" max="100" id="cAfStart" value="${S.afStart}" title="전투 시작 AF 게이지 (이월 최대 50%). 뮬루스(ES)·이즈나·질퍼니(AS)+피탄은 조건이 맞으면 100%"><input type="number" step="0.5" min="0" max="10" id="cSbAct" value="${S.sbPerAct}" title="SB 게이지: 아군 행동(AF 중 포함) 1회당 %"><span></span></div>
    <div class="crow"><span>캐릭터 스탯 · 장비 속도</span><label class="checkrow" style="align-items:center" title="위키 Stats Index의 기본 스탯과 천명치 보너스로 주 스탯 대미지(힘·지성·속도), 운(물리 크리율), 속도(1턴 버프 순서·AF 행동 수)를 계산"><input type="checkbox" id="cUseStats" ${S.useStats!==false?'checked':''}> 기본 스탯 반영</label><label style="display:flex;gap:4px;align-items:center" title="빌드 코드가 없는 캐릭터의 장비 속도. 비우면 자동: 딩 빌더 장비 시트로 찾은 대미지 최적 장비의 속도(지팡이 +20, 도끼·권갑 +40, 그 외 +30)">장비 속도 + <input type="number" step="5" min="0" max="200" id="cGearSpd" value="${S.gearSpd==null||S.gearSpd===''?'':S.gearSpd}" placeholder="자동" style="width:64px"></label><span></span></div>
    <div class="crow"><span>요격: 적 1체 턴당 타수 · 전체 공격 비율</span><input type="number" step="0.5" min="0.5" max="10" id="cEnHits" value="${S.enemyHits}" title="적 1체가 평상 턴에 아군에게 넣는 타수. 요격은 맞은 타수마다 1번"><input type="number" step="0.1" min="0" max="1" id="cEnAoE" value="${S.enemyAoE}" title="그중 전체 공격 비율. 전체 공격은 전열 모두가 맞고, 수세(아군 전체공격 대신 받기)면 전열 수만큼 한 캐릭터가 맞음"><span></span></div>
    <div class="crow"><span>일반 턴 MP·버프 시뮬레이션</span><label class="checkrow" style="align-items:center"><input type="checkbox" id="cSim" ${S.simOn!==false?'checked':''}> 사용</label><span></span><span></span></div>
    <div class="crow"><span>시뮬레이션 턴 수</span><input type="number" step="1" min="2" max="20" id="cSimT" value="${S.simTurns}"><span></span><span></span></div>
    <div class="crow"><span>기본 MP 최대치 (천명치로 +120까지)</span><input type="number" step="10" min="200" max="900" id="cMp" value="${S.mpBase}"><span></span><span></span></div>
    <div class="crow"><span>후열 P글래 셔틀 반영</span><label class="checkrow" style="align-items:center"><input type="checkbox" id="cMule" ${S.muleOn!==false?'checked':''}> 사용</label><label class="checkrow" style="align-items:center" title="후열 고정이 없을 때 주딜 무기 퍼스널리티 셔틀 2명 가정"><input type="checkbox" id="cMuleAuto" ${S.muleAuto!==false?'checked':''}> 자동 가정</label><label class="checkrow" style="align-items:center" title="자동 가정일 때 같은 퍼스널리티의 전열 서포터도 셔틀로"><input type="checkbox" id="cMuleFront" ${S.muleFront!==false?'checked':''}> 전열 서포터도</label></div>
    <div class="crow"><span>연성 P글래 표시가 없을 때</span><label class="checkrow" style="align-items:center" title="보유 탭에서 연성 P글래를 하나도 표시하지 않았을 때 전부 가졌다고 보고 셔틀 공유를 계산 (끄면 공유 없음)"><input type="checkbox" id="cPglAll" ${S.pglAssumeAll?'checked':''}> 전부 있다고 가정</label><span></span><span></span></div>
    <div class="crow"><span>셔틀 1명 글래스터 칸 / 속성·HP P글래 1개 수치</span><input type="number" step="1" min="1" max="4" id="cMuleSl" value="${S.muleSlots}"><input type="number" step="0.05" min="0" max="1" id="cMulePct" value="${S.mulePct}"><span></span></div>
    <div class="crow"><span>AF 재공격 1회 연출 (기본 연출의 배수)</span><input type="number" step="0.1" min="0" max="1.5" id="cRepAnim" value="${S.afRepAnim!=null?S.afRepAnim:0.5}" title="재공격·연속 실행은 한 행동 안에서 이어 쳐서 쿨타임은 행동당 한 번만 늘고, AF 게이지는 실행마다 찹니다. 이어 치는 연출 시간을 기본 연출의 몇 배로 볼지"><span></span><span></span></div>
    <div class="crow"><span>아군 전체 글래 (공명의 힘·격진의 힘)</span><label class="checkrow" style="align-items:center" title="빌더 코어의 '아군 전체' 글래스터. 후열 셔틀 1명당 남는 칸(일반 존 2칸, 극존 1칸)에 공명의 힘 <많은 쪽 천/명>(전후방 그 성향 1명당 +5%, 51행)과 격진의 힘 <펼친 존>(+15%, 50행)을 단다고 봅니다"><input type="checkbox" id="cAura" ${S.auraGl!==false?'checked':''}> 후열 셔틀이 장착</label><span></span><span></span></div>
    <div class="crow"><span>소비 MP 배율 (MP 감소 글래스터면 0.85·0.75)</span><input type="number" step="0.05" min="0.3" max="1.5" id="cMpMul" value="${S.mpCostMul}"><span></span><span></span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small" id="constReset">기본값으로</button><span class="hint">바꾸면 다음 계산부터 반영됩니다. 절존 배율은 극존과 같습니다.</span></div>`;
}
function onConst(e){
  const t=e.target; const S=state.settings;
  if(t.dataset.arr){ const k=t.dataset.arr; S[k]=(S[k]||E.DEFAULT_SETTINGS[k]).slice(); S[k][+t.dataset.i]=+t.value||0; }
  else if(t.id==='cOpp') S.zoneOppElem=+t.value; else if(t.id==='cOff') S.zoneOffWeap=+t.value;
  else if(t.id==='cAf') S.afActions=Math.max(1,Math.min(15,+t.value||5));
  else if(t.id==='cAfCycle') S.afCycle=t.checked;
  else if(t.id==='cAfAuto') S.afAuto=t.checked;
  else if(t.id==='cAfFast') S.afFastDefault=t.checked;
  else if(t.id==='cUseStats') S.useStats=t.checked;
  else if(t.id==='cAfStart') S.afStart=Math.max(0,Math.min(100,+t.value||0));
  else if(t.id==='cSbAct') S.sbPerAct=Math.max(0,Math.min(10,+t.value||0));
  else if(t.id==='cPglAll'){ S.pglAssumeAll=t.checked; renderPglTbl(); }
  else if(t.id==='cEnHits') S.enemyHits=Math.max(0.5,Math.min(10,+t.value||2));
  else if(t.id==='cEnAoE') S.enemyAoE=Math.max(0,Math.min(1,+t.value||0));
  else if(t.id==='cGearSpd') S.gearSpd = t.value==='' ? null : Math.max(0,Math.min(200,Math.round(+t.value||0)));
  else if(t.id==='cAfAnim') S.afAnim=Math.max(0.5,Math.min(5,+t.value||2));
  else if(t.id==='cSim') S.simOn=t.checked;
  else if(t.id==='cAura') S.auraGl=t.checked;
  else if(t.id==='cRepAnim') S.afRepAnim=Math.max(0,Math.min(1.5,+t.value||0));
  else if(t.id==='cMule') S.muleOn=t.checked;
  else if(t.id==='cMuleAuto') S.muleAuto=t.checked;
  else if(t.id==='cMuleFront') S.muleFront=t.checked;
  else if(t.id==='cMuleSl') S.muleSlots=Math.max(1,Math.min(4,+t.value||3));
  else if(t.id==='cMulePct') S.mulePct=Math.max(0,Math.min(1,+t.value||0.3));
  else if(t.id==='cSimT') S.simTurns=Math.max(2,Math.min(20,+t.value||6));
  else if(t.id==='cMp') S.mpBase=Math.max(200,Math.min(900,+t.value||450));
  else if(t.id==='cMpMul') S.mpCostMul=Math.max(0.3,Math.min(1.5,+t.value||1));
  else return;
  cap=E.computeCap(prepped, settings()); save();
}

/* ---------- 내보내기/불러오기 ---------- */
const exportObj = ()=>({owned:state.owned, custom:state.custom, settings:state.settings, goals:state.goals||[], buddies:state.buddies||{}, pgl:state.pgl||{}});
function exportState(){ const ta=$('#ioText'); ta.value=JSON.stringify(exportObj()); ta.select();
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(()=>{$('#ioMsg').textContent='복사했습니다. 메모장 등에 붙여 두세요.';},()=>{$('#ioMsg').textContent='선택된 텍스트를 직접 복사하세요.';});
  else $('#ioMsg').textContent='선택된 텍스트를 직접 복사하세요.'; }
function applyImport(text, okMsg, badMsg){
  try{ const d=JSON.parse(text); if(!d||!d.owned||typeof d.owned!=='object') throw 0;
    state.owned=d.owned; state.custom=Array.isArray(d.custom)?d.custom:[]; state.settings=d.settings||{}; state.sample=false; if(Array.isArray(d.goals)) state.goals=d.goals; if(d.buddies&&typeof d.buddies==='object') state.buddies=d.buddies; if(d.pgl&&typeof d.pgl==='object') state.pgl=d.pgl;
    save(); rebuildChars(); renderAll(); $('#ioMsg').textContent=okMsg||'불러왔습니다.'; return true; }
  catch(e){ $('#ioMsg').textContent=badMsg||'형식이 맞지 않습니다. 내보내기로 만든 텍스트 전체를 붙여 넣으세요.'; return false; }
}
function importState(){ applyImport($('#ioText').value); }
function saveFile(){
  const d=new Date(), ymd=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const name=`eden-party-lab-백업-${ymd}.json`;
  try{
    const url=URL.createObjectURL(new Blob([JSON.stringify(exportObj())], {type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download=name; a.hidden=true;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
    $('#ioMsg').textContent=`${name} 파일로 내려받았습니다.`;
  }catch(e){ $('#ioMsg').textContent='이 화면에서는 파일 저장이 막혀 있습니다. 내보내기(복사)를 쓰세요.'; }
}
async function openFile(e){
  const inp=e.target, f=inp.files&&inp.files[0]; if(!f) return;
  try{
    if(f.size>5*1024*1024) throw new Error('big');
    const text = f.text ? await f.text() : await new Promise((ok,ng)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=ng; r.readAsText(f); });
    applyImport(text, `${f.name}에서 불러왔습니다.`, '백업 파일 형식이 아닙니다. "파일로 저장"으로 만든 .json 파일을 고르세요.');
  }catch(err){ $('#ioMsg').textContent='파일을 읽지 못했습니다.'; }
  inp.value='';
}

/* ---------- 데이터 기준일 ---------- */
function renderMeta(){
  const n=CHARS_BASE.length, m=BOSSES.length, d=META.updated||'';
  const el=$('#dbMeta'); if(el) el.innerHTML=`데이터 기준 <span class="num">${esc(d||'—')}</span> · 캐릭터 <span class="num">${n}</span> · 보스 <span class="num">${m}</span>`;
  const dm=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  $$('[data-meta]').forEach(s=>{ const k=s.dataset.meta;
    if(k==='chars') s.textContent=n; else if(k==='bosses') s.textContent=m;
    else if(k==='date' && dm) s.textContent=`${+dm[1]}년 ${+dm[2]}월 ${+dm[3]}일`; });
}

/* ---------- 이벤트 ---------- */
function bind(){
  $$('.tab[data-tab]').forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.tab)));
  $('#modeSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-mode]'); if(!b) return; state.plan.mode=b.dataset.mode; save(); renderPlanControls(); if(b.dataset.mode!=='boss') runPlan(); else if(state.plan.bossId) runPlan(); else runPlan(); });
  // 버디
  $('#budMain').addEventListener('change',e=>{ state.plan.buddy.main=e.target.value; save(); renderPlanControls(); runPlan(); });
  $('#budSub').addEventListener('change',e=>{ state.plan.buddy.sub=e.target.value; save(); renderPlanControls(); runPlan(); });
  $('#pglTbl').addEventListener('click',e=>{ const b=e.target.closest('[data-pw]'); if(!b) return; const P=pglState(), w=b.dataset.pw, k=b.dataset.pk;
    P[w]=P[w]||{}; P[w][k]=(((P[w][k]||0)+1)%3); if(!P[w][k]) delete P[w][k]; if(!Object.keys(P[w]).length) delete P[w];
    touchRoster(); renderPglTbl(); const nb=$(`#pglTbl [data-pw="${w}"][data-pk="${k}"]`); if(nb) nb.focus(); });
  $('#pglTblP').addEventListener('click',e=>{ const b=e.target.closest('[data-pp]'); if(!b) return; const P=pglState(), x=b.dataset.pp, k=b.dataset.pk; const Q=P._p=P._p||{};
    Q[x]=Q[x]||{}; Q[x][k]=(((Q[x][k]||0)+1)%3); if(!Q[x][k]) delete Q[x][k]; if(!Object.keys(Q[x]).length) delete Q[x]; if(!Object.keys(Q).length) delete P._p;
    touchRoster(); renderPglTbl(); const nb=$(`#pglTblP [data-pp="${x}"][data-pk="${k}"]`); if(nb) nb.focus(); });
  $('#pglClear').addEventListener('click',()=>{ state.pgl={}; touchRoster(); renderPglTbl(); });
  $('#budGrid').addEventListener('change',e=>{ const k=e.target.dataset.bud; if(!k) return; state.buddies=state.buddies||{}; if(e.target.checked) state.buddies[k]=true; else delete state.buddies[k]; touchRoster(); renderBudGrid(); renderPlanControls(); });
  renderBudGrid(); renderPglTbl();
  // 성향 직접 조절
  $('#weightRow').addEventListener('input',e=>{ const k=e.target.dataset.w; if(!k) return; state.plan.weights[k]=+e.target.value; $('#'+e.target.id+'v').textContent=e.target.value; });
  $('#weightRow').addEventListener('change',e=>{ if(!e.target.dataset.w) return; save(); runPlan(); });
  // 결현현
  $('#kesSel').addEventListener('change',e=>{ const b=BOSSES.find(x=>x.id===e.target.value); state.plan.kesId=e.target.value||'';
    if(b){ state.plan.enemy=bossToEnemy(b); state.plan.enemyCount = (b.enemies&&b.enemies.length>1)||(b.needs&&b.needs.multi_target) ? Math.min(3, (b.enemies||[]).length||2) : 1; }
    save(); renderPlanControls(); runPlan(); });
  const plChanged=()=>{ save(); renderPlanControls(); runPlan(); };
  $('#plNokill').addEventListener('change',e=>{ plOf().nokill=e.target.checked; plChanged(); });
  $('#plSize').addEventListener('change',e=>{ plOf().size=+e.target.value; plChanged(); });
  $('#plComp').addEventListener('change',e=>{ plOf().comp.on=e.target.checked; plChanged(); });
  $('#plCompN').addEventListener('change',e=>{ plOf().comp.n=Math.max(1,Math.min(6,+e.target.value||3)); plChanged(); });
  $('#plTurns').addEventListener('change',e=>{ plOf().turns=Math.max(0,Math.min(99,+e.target.value||0)); plChanged(); });
  $('#plCompBox').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; const C=plOf().comp; const L = b.dataset.pce ? C.elem : C.weap, v=b.dataset.pce||b.dataset.pcw;
    const i=L.indexOf(v); if(i>=0) L.splice(i,1); else L.push(v); C.on=true; plChanged(); });
  $('#plExample').addEventListener('click',()=>{ const b=BOSSES.find(x=>x.id===state.plan.kesId); if(!b){ flash('보스를 먼저 고르세요'); return; } const d=plExample(b); flash(d?`${d} 서약으로 채웠습니다 — 이번 주 서약과 다르면 고쳐 주세요`:'이 보스 페이지에 서약 예시가 없습니다'); plChanged(); });
  $('#results').addEventListener('click',e=>{ const b=e.target.closest('button[data-deck]'); if(b) toggleDeck(b); });
  $('#bossSel').addEventListener('change',e=>{ if(e.target.value) applyBoss(e.target.value); else { state.plan.bossId=''; save(); renderPlanControls(); } runPlan(); });
  $('#enemyGrid').addEventListener('click',e=>{ const b=e.target.closest('.etype'); if(!b) return; const t=b.dataset.t; const cur=state.plan.enemy[t]||null; const nx=REL_CYCLE[(REL_CYCLE.indexOf(cur)+1)%REL_CYCLE.length]; if(nx) state.plan.enemy[t]=nx; else delete state.plan.enemy[t]; save(); renderPlanControls(); });
  $('#enemyClear').addEventListener('click',()=>{ state.plan.enemy={}; save(); renderPlanControls(); });
  $('#countSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-n]'); if(!b) return; state.plan.enemyCount=+b.dataset.n; save(); renderPlanControls(); });
  document.addEventListener('click',e=>{ const b=e.target.closest('button[data-rm]'); if(!b) return; const L=state.plan[b.dataset.key]; const i=L.indexOf(b.dataset.rm); if(i>=0) L.splice(i,1); save(); renderPlanControls(); });
  { const md=$('#metaDecks'); if(md){
      md.addEventListener('toggle',()=>{ if(md.open){ $('#mdList').innerHTML='<div class="empty">계산 중…</div>'; setTimeout(renderMetaDecks, 30); } });
      $('#mdSort').addEventListener('click',e=>{ const b=e.target.closest('button[data-k]'); if(!b) return; mdSort=b.dataset.k; renderMetaDecks(); });
      $('#mdList').addEventListener('click',e=>{ const b=e.target.closest('button[data-mdopen]'); if(b) openMetaDeck(+b.dataset.mdopen); }); } }
  $('#diffSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-lv]'); if(!b) return; state.plan.maxDiff=+b.dataset.lv; save(); renderPlanControls(); runPlan(); });
  $('#optDiverse').addEventListener('change',e=>{ state.settings.diverse=e.target.checked; save(); });
  $('#optCap').addEventListener('change',e=>{ state.settings.capOn=e.target.checked; save(); });
  $('#runBtn').addEventListener('click',runPlan);
  $('#burstN').addEventListener('change',e=>{ state.settings.burstTurns=Math.max(1,Math.min(10,+e.target.value||3)); save(); runPlan(); });
  $('#focusSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-fi]'); if(!b) return; const k=+b.dataset.fi; state.plan.focus = k<0?null:Object.assign({},FOCUS_LIST[k]); save(); renderPlanControls(); runPlan(); });
  $('#fxRun').addEventListener('click', runFocusAll);
  document.addEventListener('click',e=>{ const b=e.target.closest('button[data-goalsave]'); if(b) saveGoalFromResult(b.dataset.goalsave); });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button[data-share]'); if(b){ copyShare(b.dataset.share, b); return; }
    const c=e.target.closest('button[data-linkclose]'); if(c){ c.closest('.sharelink').remove(); return; }
    if(e.target.closest('button[data-shareclose]')) closeShare();
  });
  window.addEventListener('hashchange',()=>{
    const sh=parseShare(location.hash);
    if(sh){ SHARE=sh; renderShare(); showTab('plan'); revealShare(); return; }
    const h=(location.hash||'').slice(1); if(TABS.includes(h)) showTab(h);
  });
  $('#goalList').addEventListener('change', onGoalInput);
  $('#goalList').addEventListener('click',e=>{ const b=e.target.closest('button[data-gdel]'); if(!b) return; state.goals=(state.goals||[]).filter(g=>g.id!==b.dataset.gdel); save(); renderGoals(); });
  setupGoalPicker();
  $('#fxGrid').addEventListener('click',e=>{ const b=e.target.closest('button[data-fgo]'); if(!b) return; state.plan.focus=Object.assign({},FOCUS_LIST[+b.dataset.fgo]); state.plan.locked=[]; save(); renderPlanControls(); showTab('plan'); runPlan(); });
  const onMem = e=>{ if(e.target.closest('[data-sclose]')){ const box=e.target.closest('.setup'); const key=box.dataset.for; $$(`[data-sk="${key}"]`).forEach(m=>m.setAttribute('aria-expanded','false')); box.hidden=true; return; }
    const m=e.target.closest('[data-sk]'); if(!m) return; if(e.type==='keydown'){ if(e.key!=='Enter'&&e.key!==' ') return; e.preventDefault(); } toggleSetup(m); };
  ['#results','#fxGrid','#shareBox'].forEach(sel=>{ $(sel).addEventListener('click',onMem); $(sel).addEventListener('keydown',onMem); });
  setupPicker('#lockIn','#lockDrop','locked',3);
  setupPicker('#exIn','#exDrop','excluded',20);
  setupPicker('#backIn','#backDrop','backLocked',2);
  $('#pcRun').addEventListener('click', runPerChar);
  $('#pcQ').addEventListener('input', renderPerChar);
  $('#pcTable').addEventListener('click', e=>{ const b=e.target.closest('button[data-focus]'); if(!b) return; const id=b.dataset.focus;
    state.plan.locked=[id]; state.plan.excluded=state.plan.excluded.filter(x=>x!==id); save(); renderPlanControls(); showTab('plan'); runPlan(); });
  ['#rq','#rel','#rwp','#ral','#rtier','#rown'].forEach(s=>$(s).addEventListener('input',renderRoster));
  $('#roster').addEventListener('change',onRosterChange);
  $('#bulkTop').addEventListener('click',()=>{ for(const c of prepped) if((c.tier==='SS'||c.tier==='S')&&!state.owned[c.id]) state.owned[c.id]={t:0,s:!!c.stellar,m:0,g:'none',gl:null}; touchRoster(); renderRoster(); });
  $('#roster').addEventListener('click',e=>{ const b=e.target.closest('[data-bact]'); if(b) onBuildAct(b);
    const sb=e.target.closest('[data-stat]'); if(sb){ const row=sb.closest('.row'), w=row&&row.querySelector('.stwrap'); if(!w) return;
      const open = w.hidden; if(open){ const o=state.owned[row.dataset.id]; w.innerHTML=statBoxHtml(byId.get(row.dataset.id), o?(+o.t||0):0); }
      w.hidden=!open; sb.setAttribute('aria-expanded', String(open)); } });
  $('#roster').addEventListener('keydown',e=>{ if(e.key==='Enter' && e.target.closest('.bldin input')){ e.preventDefault(); const b=e.target.closest('.bldin').querySelector('[data-bact="apply"]'); if(b) onBuildAct(b); } });
  document.addEventListener('click',e=>{ const b=e.target.closest('button[data-eqrec]'); if(b){ runEqRec(b); return; }
    const s=e.target.closest('button[data-eqsave]'); if(s){ const out=s.closest('.eqout'), msg=s.parentNode.querySelector('[role=status]'); s.disabled=true;
      eqApplyCode(s.dataset.eqsave, out.dataset.code||'', t=>{ msg.textContent=t; }).then(b=>{ msg.textContent='저장했습니다 · 이제 조합 계산에 이 장비를 씁니다'; if($('#p-roster').classList.contains('on')) renderRoster(); }).catch(err=>{ msg.textContent=err.message||String(err); s.disabled=false; }); } });
  $('#inboxBar') && $('#inboxBar').addEventListener('click',e=>{ if(e.target.id==='inboxSave') saveInbox(); else if(e.target.id==='inboxDrop'){ try{ localStorage.removeItem(INBOX_KEY); }catch(x){} renderInbox(); } });
  window.addEventListener('storage',e=>{ if(e.key===INBOX_KEY) renderInbox(); });
  window.addEventListener('focus',renderInbox);
  renderInbox();
  $('#selAll').addEventListener('change',e=>selectAllShown(e.target.checked));
  $('#selNoneYes').addEventListener('click',()=>{ for(const id of rosterShown) delete state.owned[id]; touchRoster(); renderRoster(); });
  $('#selNoneNo').addEventListener('click',()=>{ $('#selNoneConfirm').hidden=true; updateRosterCount(); });
  $('#bulkNone').addEventListener('click',()=>{ $('#bulkConfirm').hidden=false; });
  $('#bulkNoneYes').addEventListener('click',()=>{ state.owned={}; state.sample=false; save(); $('#bulkConfirm').hidden=true; renderRoster(); });
  $('#bulkNoneNo').addEventListener('click',()=>{ $('#bulkConfirm').hidden=true; });
  $('#bulkFate').addEventListener('change',e=>{ const lt=e.target.value==='lt'; $('#bulkFateN').hidden=!lt; if(lt) $('#bulkFateN').focus(); });
  $('#bulkFateGo').addEventListener('click',()=>{
    const sel=$('#bulkFate').value, v = sel==='lt' ? Math.max(0, Math.min(79, parseInt($('#bulkFateN').value||'0',10)||0)) : +sel;
    const st=$('#bulkStellar').checked; let n=0;
    for(const id of rosterShown){ const o=state.owned[id]; if(!o) continue; o.t=v; if(st && byId.get(id).stellar) o.s=true; n++; }
    if(!n){ flash('표시된 캐릭터 중 보유한 캐릭터가 없습니다.'); return; }
    touchRoster(); renderRoster(); flash(`보유 ${n}명 천명치 ${v}${st?' · 성도각성':''}으로 바꿨습니다`);
  });
  $('#defGl').addEventListener('change',e=>{ const p=GL_PRESETS[e.target.value]; state.settings.grastaDefault=Object.assign({}, p.v, {ore:$('#defOre').checked}); save(); });
  $('#defOre').addEventListener('change',e=>{ const g=Object.assign({}, E.DEFAULT_SETTINGS.grastaDefault, state.settings.grastaDefault||{}); g.ore=e.target.checked; state.settings.grastaDefault=g; save(); });
  $('#customForm').addEventListener('submit',addCustom);
  $('#customList').addEventListener('click',e=>{ const b=e.target.closest('button[data-delc]'); if(!b) return; const id=b.dataset.delc; state.custom=state.custom.filter(c=>c.id!==id); delete state.owned[id]; save(); rebuildChars(); renderRoster(); renderCustomList(); });
  $('#ioExport').addEventListener('click',exportState);
  $('#ioImport').addEventListener('click',importState);
  $('#ioSave').addEventListener('click',saveFile);
  $('#ioOpen').addEventListener('click',()=>$('#ioFile').click());
  $('#ioFile').addEventListener('change',openFile);
  $('#quickGo').addEventListener('click',quickCheck);
  $('#bossFilter').addEventListener('change',renderBossList); $('#bossQ').addEventListener('input',renderBossList);
  $('#bossList').addEventListener('click',e=>{ const b=e.target.closest('[data-boss]'); if(!b) return; curBoss=b.dataset.boss; renderBossList(); });
  $('#bossDetail').addEventListener('click',e=>{ if(e.target.id==='bossGo'){ applyBoss(curBoss); showTab('plan'); runPlan(); } });
  $('#constBox').addEventListener('change',onConst);
  $('#constBox').addEventListener('click',e=>{ if(e.target.id==='constReset'){ ['zoneElem','zoneWeap','zoneOppElem','zoneOffWeap','statK','afActions','afCycle','afAuto','afAnim','afFastDefault','useStats','gearSpd','enemyHits','enemyAoE','simOn','simTurns','mpBase','mpCostMul','muleOn','muleAuto','muleFront','pglAssumeAll','afStart','burstTurns','sbPerAct','muleSlots','mulePct','auraGl','afRepAnim'].forEach(k=>delete state.settings[k]); cap=E.computeCap(prepped, settings()); save(); renderConsts(); } });
}
function renderAll(){ renderPlanControls(); renderRoster(); renderBudGrid(); renderPglTbl(); renderDefGl(); renderCustomList(); renderBossList(); renderConsts(); renderGoals(); renderShare(); $('#quickReset').checked=!!state.sample; }

/* ---------- 시작 ---------- */
(async function init(){
  await loadState();
  rebuildChars();
  bind();
  SHARE = parseShare(location.hash);
  renderAll(); renderMeta();
  let tab='plan'; try{ tab=localStorage.getItem('aeopt_tab')||'plan'; }catch(e){}
  const h=(location.hash||'').slice(1); if(TABS.includes(h)) tab=h;
  if(SHARE) tab='plan';
  showTab(tab);
  if(SHARE) requestAnimationFrame(revealShare);
  setSaveText(state.sample?'예시 데이터 · 아직 저장 안 함':'이 기기에 저장됨');
  runPlan();
  connectDb();
})();
})();
