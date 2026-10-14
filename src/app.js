(function(){
'use strict';
const E = window.AEOpt;
const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHARS_BASE = JSON.parse(document.getElementById('db-chars').textContent);
const BOSSES = JSON.parse(document.getElementById('db-bosses').textContent);
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
function glText(g){ if(!g) return ''; if(g.mode==='none') return '글래 없음'; const p=[]; if(g.e) p.push('속성'+g.e); if(g.pa) p.push('페인'+g.pa); if(g.po) p.push('독'+g.po); return p.join('·')||'—'; }

/* ---------- 상태 ---------- */
let state = null, chars = [], prepped = [], byId = new Map(), cap = 1;
const DEF_STATE = ()=>({v:1, sample:true, owned:{}, custom:[], settings:{}, plan:{mode:'burst', enemy:{}, bossId:'', locked:[], excluded:[], backLocked:[], enemyCount:1, maxDiff:4, focus:null}, rosterView:{}, goals:[]});
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
function touchRoster(){ if(state.sample){ state.sample=false; } save(); }

/* ---------- 탭 ---------- */
function showTab(name){
  $$('.tab').forEach(t=>t.setAttribute('aria-selected', t.dataset.tab===name?'true':'false'));
  $$('.panel').forEach(p=>p.classList.toggle('on', p.id==='p-'+name));
  try{ localStorage.setItem('aeopt_tab', name); }catch(e){}
}

/* ---------- 공용 렌더 조각 ---------- */
const elChip = e => `<span class="el ${esc(e)}">${esc(E.ELEM_KR[e]||e)}</span>`;
const alDot = a => `<span class="al ${a==='light'?'light':'shadow'}" title="${a==='light'?'천':'명'}"></span>`;
function ownedList(){ return Object.keys(state.owned).filter(id=>byId.has(id)); }
function progOf(id){ return E.charProg(byId.get(id), state.owned[id], settings()); }

/* ---------- 편성 탭 ---------- */
function renderPlanControls(){
  const P=state.plan;
  $$('#modeSeg button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.mode===P.mode?'true':'false'));
  $('#bossRow').hidden = P.mode!=='boss';
  const sel=$('#bossSel');
  if(!sel.options.length){
    sel.innerHTML = '<option value="">보스 선택…</option>' + BOSSES.map(b=>`<option value="${esc(b.id)}">${esc(b.name_kr)} · ${esc(CONTENT_KR(b.content))}</option>`).join('');
  }
  sel.value = P.bossId||'';
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
  const boss = P.mode==='boss' ? BOSSES.find(b=>b.id===P.bossId) : null;
  if(P.mode==='boss' && !boss){ out.innerHTML=`<div class="empty">보스를 고르면 그 보스의 약점·기믹에 맞춘 1~5순위 편성을 계산합니다.</div>`; return; }
  const ids=ownedList();
  if(ids.length<4){ out.innerHTML=`<div class="empty">보유 캐릭터가 4명 이상이어야 편성을 짤 수 있습니다. <b>보유 캐릭터</b> 탭에서 체크해 주세요.</div>`; return; }
  const enemy={}; let any=false;
  for(const [k,v] of Object.entries(P.enemy)) if(v){ enemy[k]=v; any=true; }
  const owned=ids.map(id=>({pc:byId.get(id), prog:progOf(id)}));
  const rec = boss ? prepped.filter(c=>(boss.recommended||[]).includes(c.raw.name_jp)).map(c=>c.id) : [];
  $('#runBtn').disabled=true; $('#prog').hidden=false; $('#prog i').style.width='0%';
  const r = await E.optimize({owned, locked:P.locked, excluded:P.excluded, backLocked:P.backLocked||[], mode:P.mode, enemy:any?enemy:null, boss, settings:settings(), cap, recommendedIds:rec, maxDiff:P.maxDiff||4, focus:P.focus||null},
    f=>{ if(my===runToken) $('#prog i').style.width=Math.round(f*100)+'%'; });
  if(my!==runToken) return;
  $('#runBtn').disabled=false; $('#prog').hidden=true;
  if(r.error){ out.innerHTML=`<div class="empty">${esc(r.error)}</div>`; return; }
  renderResults(r, boss, any?enemy:null);
}

function fmtN(v){ if(!isFinite(v)) return '—'; if(v>=1e8) return (v/1e8).toFixed(2)+'억'; if(v>=1e4) return (v/1e4).toFixed(1)+'만'; return v.toFixed(0); }
const MODE_KR={burst:'최고점 딜',sustain:'지속 딜',stability:'안정성',weak:'약점 맞춤',boss:'보스 맞춤'};
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
  return `<div class="mem${lockSet&&lockSet.has(c.id)?' locked':''}" role="button" tabindex="0" aria-expanded="false" data-sk="${key}" data-i="${i}" title="눌러서 추천 세팅 보기">
    <div class="nm">${esc(c.name)}</div>
    <div class="meta">${elChip(c.elem)} ${esc(E.WEAPON_KR[c.weapon]||c.weapon)} ${alDot(c.align)} <span class="tier ${c.tier}">${esc(c.tier)}</span> ${(c.roles||[]).slice(0,2).map(r=>esc(ROLE_KR[r]||r)).join('·')}</div>
    <div class="sk">${cs?(cs.usingSB?'SB ':'')+esc(cs.skill||''):''}${cs&&cs.rel?` · <b>${esc(REL_KR[cs.rel])}</b>`:''}</div>
    <div class="sk">${gq?'글래 '+esc(glText(gq))+(gq.painOK||!(gq.pa||gq.po)?'':' (독·페 미부여)'):''}</div>
    <div class="share" title="SB 턴 대미지 비중 ${(share*100).toFixed(0)}%"><i style="width:${(share*100).toFixed(0)}%"></i></div>
    <div class="sk">SB 턴 비중 <span class="num">${(share*100).toFixed(0)}%</span>${off?' <span class="badge">지정 외 · 지원</span>':''}</div>
    <div class="tap">추천 세팅 ▾</div>
  </div>`;
}
function renderResults(r, boss, enemy){
  const P=state.plan, out=$('#results');
  const hot = {burst:'b',sustain:'s',stability:'t',weak:'s',boss:''}[P.mode];
  for(const k of [...RES.keys()]) if(k[0]==='p') RES.delete(k);
  let h='';
  if(state.sample) h+=`<div class="notice">예시 보유 목록(SS·S 티어 전원, 천명치 80, 성도각성 완료 가정)으로 계산한 결과입니다. <b>보유 캐릭터</b> 탭에서 실제 보유·천명치·글래스터를 입력하면 그 기준으로 다시 짭니다.</div>`;
  const enemyTxt = enemy ? Object.entries(enemy).map(([k,v])=>(E.ELEM_KR[k]||E.WT_KR[k])+' '+REL_KR[v]).join(', ') : '중립(약점·내성 없음)';
  h+=`<div class="runmeta">${esc(MODE_KR[P.mode])}${r.focus?' · <b>'+esc(focusLabel(r.focus))+'</b> 화력만':''} · 상대 ${esc(boss?boss.name_kr:'')}${boss?' — ':''}${esc(enemyTxt)} · 적 ${P.enemyCount||1}체${(P.maxDiff||4)<4?` · 난이도 Lv${P.maxDiff} 이하`:''} · 후보 ${r.poolSize}명에서 ${r.evaluated.toLocaleString()}개 조합 평가</div>`;
  if(!r.results.length) h+=`<div class="empty">조건을 만족하는 조합이 없습니다. 난이도 상한을 올리거나 고정·제외 캐릭터를 줄여 보세요.</div>`;
  for(const x of r.results){
    const key='p'+x.rank; RES.set(key, {x, focus:r.focus});
    const ev=x.ev, sbz=ev.sb.zone, nz=ev.normal.zone;
    const ex = x.ex = E.explainTeam(x.team, x.progs, ev, settings(), {});
    const lockSet=new Set(P.locked);
    const top = ev.sb.per.indexOf(Math.max(...ev.sb.per));
    const co = ev.sb.cores[top];
    const tSum = x.progs.reduce((a,p)=>a+(p.t||0),0);
    const warns = teamWarns(x, boss, enemy, ex);
    const order = ex.posTotal ? ex.order : x.team.map((_,i)=>i);
    h+=`<section class="card${x.rank===1?' first':''}">
      <div class="card-head">
        <div class="rank">${x.rank}<small>위</small></div>
        <span class="diff lv${x.diff.lv}" title="운용 난이도 점수 ${x.diff.v.toFixed(1)}">Lv${x.diff.lv} ${esc(x.diff.kr)}</span>
        <span class="zonebadge" title="스텔라 버스트 턴 기준 존">${esc(sbz&&sbz.level?sbz.label:'존 없음')}${sbz&&sbz.byName&&sbz.level?` <span class="hint">· ${esc(sbz.byName)}${sbz.how?' · '+esc(sbz.how):''}</span>`:''}</span>
        <span class="flux">${alDot('light')} 천 ${ev.light} · ${alDot('shadow')} 명 ${ev.shadow} → ${ev.flux==='light'?'천의 흐름':ev.flux==='shadow'?'명의 흐름':'천명 동수'} · 천명치 합 <span class="num">${tSum}</span></span>
        <div class="scorebar"><span>종합 ${(x.rel*100).toFixed(0)}</span><div class="bar"><i style="width:${(x.rel*100).toFixed(0)}%"></i></div></div>
        <button type="button" class="btn small" data-goalsave="${key}">목표로 저장</button>
      </div>
      ${ex.posTotal?`<div class="order">전방 배치 <span class="hint">왼쪽 → 오른쪽 · 위치 버프 ${ex.posOk}/${ex.posTotal} 성립</span></div>`:''}
      <div class="members">${order.map(i=>memHtml(x,i,key,r.focus,lockSet)).join('')}</div>
      <div class="setup" data-for="${key}" hidden></div>
      <div class="reserve">후열: ${x.reserves.length?x.reserves.map(c=>`<b>${esc(c.name)}</b>${x.fixedBack&&x.fixedBack.has(c.id)?' <span class="fixed">고정</span>':''}`).join(', '):'—'} <span class="hint">(남는 자리는 회복·수호·해제 보강 기준)</span></div>
      <div class="metrics">
        ${metric('SB 턴 화력', ev.sbTurn, ev.sbTurn/ (r.results[0].ev.sbTurn||1), hot==='b')}
        ${metric('AF 1회 화력', ev.af, ev.af/(Math.max(...r.results.map(y=>y.ev.af))||1), hot==='b')}
        ${metric('일반 턴 평균', ev.sustain, ev.sustain/(Math.max(...r.results.map(y=>y.ev.sustain))||1), hot==='s')}
        ${metric('생존력', ev.surv, ev.surv/(Math.max(...r.results.map(y=>y.ev.surv))||1), hot==='t', true)}
      </div>
      ${warns.length?`<div class="warns">${warns.map(w=>`<span class="warn"${w.full?` title="${esc(w.full)}"`:''}>${esc(w.t)}</span>`).join('')}</div>`:''}
      <details class="why turns"${boss&&x.rank===1?' open':''}><summary>턴별 운영${boss?' · '+esc(boss.name_kr)+' 기믹 대응':''}</summary>${turnPlanHtml(x, boss)}</details>
      <details class="why"><summary>계산 근거·운용 포인트 보기 (주딜 ${esc(x.team[top].name)} 기준)</summary>
        <div class="grid">
          <div><span>스탯 버프</span><span class="num">+${pctTxt(co&&co.statB)}</span></div>
          <div><span>속성 공격 버프</span><span class="num">+${pctTxt(co&&co.elB)}</span></div>
          <div><span>무기종 대미지</span><span class="num">+${pctTxt(co&&co.wB)}</span></div>
          <div><span>정신통일·심기일체·하극상</span><span class="num">+${pctTxt(co&&co.specB)}</span></div>
          <div><span>속성 내성 디버프</span><span class="num">−${pctTxt(co&&co.typeR)}</span></div>
          <div><span>물리/마법 내성 디버프</span><span class="num">−${pctTxt(co&&co.physR)}</span></div>
          <div><span>크리티컬 확률</span><span class="num">${pctTxt(co&&Math.min(co.critR,1))}</span></div>
          <div><span>브레이크</span><span class="num">×${co?co.brk.toFixed(1):'1.0'}</span></div>
          <div><span>존 (SB / 평상)</span><span class="num">${esc(sbz&&sbz.level?sbz.label:'없음')} / ${esc(nz&&nz.level?nz.label:'없음')}</span></div>
          <div><span>AF 평균 콤보</span><span class="num">${(ev.avgCombo*100).toFixed(0)}%</span></div>
          <div><span>공격 글래스터</span><span class="num">×${co&&co.gq?co.gq.f.toFixed(2):'1.00'}</span></div>
          <div><span>회복/배리어/해제/수호</span><span class="num">${ev.survDet.heal}/${ev.survDet.barrier}/${ev.survDet.cleanse}/${ev.survDet.guard}</span></div>
        </div>
        ${ex.notes.length?`<ul class="ops">${ex.notes.map(n=>`<li><b>${esc(n.name)}</b> <span class="cond ${n.lvl}">${n.lvl==='ok'?'조건 충족':n.lvl==='off'?'조건 미충족':'일부 적용'}</span> ${esc(n.text)}${n.to.length?` → 대상 ${esc(n.to.join(', '))}`:''}</li>`).join('')}</ul>`:''}
        <ul class="ops">${x.team.filter(c=>c.cxWhy&&c.cxWhy.length).map(c=>`<li><b>${esc(c.name)}</b>: ${esc(c.cxWhy.join(' · '))}</li>`).join('')}${x.diff.noHeal?'<li>회복 수단이 없어 피격 관리 부담 +</li>':''}${x.team.every(c=>!(c.cxWhy&&c.cxWhy.length))?'<li>특별히 신경 쓸 조작 요소가 적습니다.</li>':''}</ul>
      </details>
    </section>`;
  }
  out.innerHTML=h;
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
  const order = ex.posTotal ? ex.order : team.map((_,i)=>i);
  const nm = i=>`<b>${esc(team[i].name)}</b>`;
  const T = [];
  // 개전
  const o0 = [`전방 배치(왼→오): ${order.map(nm).join(' · ')}${x.reserves&&x.reserves.length?` / 후열 ${x.reserves.map(c=>esc(c.name)).join(', ')}`:''}`];
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
const TGT_KR={st:'단일',aoe:'전체'}, KIND_KR={phys:'물리',mag:'마법'}, SIZE_KR={s:'소',m:'중',l:'대',xl:'특대',xxl:'극대'};
function skillLine(sk){
  if(!sk) return '';
  const el = sk.element&&sk.element!=='none' ? (E.ELEM_KR[sk.element]||sk.element)+' ' : '무속성 ';
  const wt = FT_KR[sk.weapon_type] || '';
  return `<b${sk.skill_jp?` title="원문: ${esc(sk.skill_jp)}"`:''}>${esc(sk.skill||'')}</b> <span class="hint">${esc(TGT_KR[sk.target]||'')} ${esc(el)}${esc(wt||KIND_KR[sk.kind]||'')} ${esc(SIZE_KR[sk.size]||'')} ${sk.mult>1?esc(sk.mult)+'배 ':''}${sk.hits>1?esc(sk.hits)+'타':''}${sk.repeat?` · 재공격 ${esc(sk.repeat)}`:''}${sk.crit_sure?' · 확정 크리':''}${sk.barrier_pierce?' · 배리어 관통':''}</span>${(sk.cond_ko||sk.condition)?`<div class="hint">${esc(sk.cond_ko||sk.condition)}</div>`:''}`;
}
function setupHtml(x, i){
  const c=x.team[i], pr=x.progs[i], o=state.owned[c.id]||{}, ev=x.ev, r=c.raw;
  const ex = x.ex || (x.ex=E.explainTeam(x.team,x.progs,ev,settings(),{}));
  const sum=a=>a.reduce((s,v)=>s+v,0)||1;
  const sSB=ev.sb.per[i]/sum(ev.sb.per), sN=ev.normal.per[i]/sum(ev.normal.per), share=Math.max(sSB,sN);
  const role = share>=0.35?'주 딜러':share>=0.12?'보조 딜러':'서포터';
  const dealer = share>=0.12;
  const order = ex.posTotal ? ex.order : x.team.map((_,k)=>k);
  const slot = order.indexOf(i)+1;
  const nm = k=>esc(x.team[k].name);
  const L = []; // 이 조합에서
  L.push(`<li>${role} · SB 턴 비중 <span class="num">${(sSB*100).toFixed(0)}%</span> · 평상 턴 <span class="num">${(sN*100).toFixed(0)}%</span></li>`);
  L.push(`<li>전방 <b>왼쪽에서 ${slot}번째</b>${ex.posTotal?'':' (위치 조건 없음 · 아무 자리나)'}</li>`);
  for(const rl of ex.rel){
    if(rl.j===i) L.push(`<li>위치 버프 대상 <b>${nm(rl.i)}</b>을(를) 바로 ${rl.side==='r'?'오른쪽':rl.side==='l'?'왼쪽':'옆'}에</li>`);
    else if(rl.i===i) L.push(`<li><b>${nm(rl.j)}</b>의 위치 버프를 받음 → ${nm(rl.j)} 바로 ${rl.side==='r'?'오른쪽':rl.side==='l'?'왼쪽':'옆'}에 서기</li>`);
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
    const painAny = ev.A && ev.A.painAny;
    const best = E.grastaFactor({gl:{mode:'auto'}, slots:pr.slots}, painAny);
    const cur = ev.sb.cores[i] && ev.sb.cores[i].gq;
    let txt = `<b>${esc(glText(best))}</b> (×${best.f.toFixed(2)})`;
    if(!painAny){ const ore = E.grastaFactor({gl:{mode:'auto',ore:true}, slots:pr.slots}, false); if(ore.f>best.f+1e-6) txt += ` · 잠재 광석을 끼우면 <b>${esc(glText(ore))}</b> (×${ore.f.toFixed(2)})`; }
    else txt += ' · 파티에 독·페인 부여자 있음';
    G.push(`<li>${mark(cur && cur.f>=best.f-1e-6)} 공격 글래스터: ${txt} <span class="hint">(현재 ${cur?esc(glText(cur))+' ×'+cur.f.toFixed(2):'—'}, ${pr.slots}칸)</span></li>`);
    G.push(`<li>${mark((+o.m||0)>=1)} 현현 무기: 현현 ×1.08 · 진현현 ×1.15 <span class="hint">(현재 ${['없음','현현','진현현'][+o.m||0]})</span></li>`);
  } else {
    G.push(`<li>공격 글래스터: 딜 비중이 낮아 생존·MP 회복 계열 권장</li>`);
  }
  const S2 = [];
  if(c.stellar && c.sb) S2.push(`<li>SB: ${skillLine(c.sb)}</li>`);
  if(c.main) S2.push(`<li>평상: ${skillLine(c.main)}</li>`);
  if(r.req) S2.push(`<li>본령 조건: <span class="hint">${esc(r.req_ko||r.req)}</span></li>`);
  const O = (c.cxWhy||[]).map(w=>`<li>${esc(w)}</li>`);
  return `<div class="shead"><b>${esc(c.name)}</b> ${(c.elems.length?c.elems:['none']).map(elChip).join('')} ${esc(E.WEAPON_KR[c.weapon]||'')} ${alDot(c.align)} <span class="tier ${c.tier}">${esc(c.tier||'-')}</span> <span class="hint">${esc(STYLE_KR[r.style]||'')}${c.stellar?' · 성도':''}</span><button type="button" class="btn small sclose" data-sclose="1">닫기</button></div>
    <div><h4>이 조합에서</h4><ul>${L.join('')}</ul></div>
    <div><h4>추천 육성·장비</h4><ul>${G.join('')}</ul></div>
    <div><h4>주력 스킬</h4><ul>${S2.join('')||'<li class="hint">—</li>'}</ul></div>
    <div><h4>운용 포인트</h4><ul>${O.join('')}${r.note_kr?`<li class="hint">${esc(r.note_kr)}</li>`:''}</ul></div>`;
}
function toggleSetup(memEl){
  const key=memEl.dataset.sk, i=+memEl.dataset.i, rec=RES.get(key); if(!rec) return;
  const box=memEl.closest('.card,.fcard').querySelector(`.setup[data-for="${key}"]`); if(!box) return;
  const open = memEl.getAttribute('aria-expanded')==='true';
  $$(`[data-sk="${key}"]`).forEach(m=>m.setAttribute('aria-expanded','false'));
  if(open){ box.hidden=true; return; }
  memEl.setAttribute('aria-expanded','true');
  box.innerHTML = setupHtml(rec.x, i); box.hidden=false;
}
function pctTxt(v){ return v==null?'0%':Math.round(v*100)+'%'; }
function metric(k,v,rel,hot,isSurv){ rel=Math.max(0,Math.min(1,rel||0)); return `<div class="metric${hot?' hot':''}"><div class="k">${k}</div><div class="v">${isSurv?v.toFixed(0)+'점':fmtN(v)}</div><div class="bar"><i style="width:${(rel*100).toFixed(0)}%"></i></div></div>`; }

/* ---------- 캐릭터별 최적 ---------- */
let pcResult=null;
async function runPerChar(){
  const P=state.plan;
  const boss = P.mode==='boss' ? BOSSES.find(b=>b.id===P.bossId) : null;
  const ids=ownedList();
  if(ids.length<4){ $('#pcTable').innerHTML='<div class="empty">보유 캐릭터가 4명 이상이어야 합니다.</div>'; return; }
  const enemy={}; let any=false; for(const [k,v] of Object.entries(P.enemy)) if(v){ enemy[k]=v; any=true; }
  const owned=ids.map(id=>({pc:byId.get(id), prog:progOf(id)}));
  const rec = boss ? prepped.filter(c=>(boss.recommended||[]).includes(c.raw.name_jp)).map(c=>c.id) : [];
  $('#pcRun').disabled=true; $('#pcProg').hidden=false; $('#pcProg i').style.width='0%';
  const r = await E.perCharBest({owned, excluded:P.excluded, backLocked:P.backLocked||[], mode:P.mode==='boss'&&!boss?'burst':P.mode, enemy:any?enemy:null, boss, settings:settings(), cap, recommendedIds:rec, maxDiff:P.maxDiff||4, focus:P.focus||null},
    f=>{ $('#pcProg i').style.width=Math.round(f*100)+'%'; });
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
  const owned=ids.map(id=>({pc:byId.get(id), prog:progOf(id)}));
  const rec = boss ? prepped.filter(c=>(boss.recommended||[]).includes(c.raw.name_jp)).map(c=>c.id) : [];
  for(const k of [...RES.keys()]) if(k[0]==='f') RES.delete(k);
  grid.innerHTML = FOCUS_LIST.map((f,k)=>`<section class="fcard" id="fx-${k}"><div class="fhead"><h3>${f.kind==='elem'?`<span class="dot ${f.v}"></span>`:''}${esc(focusLabel(f))}</h3><span class="hint">대기 중…</span></div></section>`).join('');
  $('#fxRun').disabled=true; $('#fxProg').hidden=false; $('#fxProg i').style.width='0%';
  $('#fxMeta').textContent = `${MODE_KR[P.mode]==='보스 맞춤'&&!boss?'최고점 딜':MODE_KR[P.mode]}${boss?' · '+boss.name_kr:''}${(P.maxDiff||4)<4?' · 난이도 Lv'+P.maxDiff+' 이하':''}`;
  for(let k=0;k<FOCUS_LIST.length;k++){
    const f=FOCUS_LIST[k];
    const r = await E.optimize({owned, locked:[], excluded:P.excluded, backLocked:P.backLocked||[], mode:P.mode==='boss'&&!boss?'burst':P.mode, enemy:any?enemy:null, boss, settings:settings(), cap, recommendedIds:rec, maxDiff:P.maxDiff||4, focus:f, maxPool:28, topN:3},
      v=>{ if(my===fxToken) $('#fxProg i').style.width=Math.round((k+v)/FOCUS_LIST.length*100)+'%'; });
    if(my!==fxToken) return;
    $('#fx-'+k).outerHTML = fcardHtml(f, k, r);
  }
  $('#fxRun').disabled=false; $('#fxProg').hidden=true;
}
function fcardHtml(f, k, r){
  const head = `<div class="fhead"><h3>${f.kind==='elem'?`<span class="dot ${f.v}"></span>`:''}${esc(focusLabel(f))}</h3><button type="button" class="btn small" data-fgo="${k}">1~5위 자세히</button></div>`;
  if(r.error || !r.results || !r.results.length) return `<section class="fcard" id="fx-${k}">${head}<div class="hint">${esc(r.error||'조건에 맞는 조합이 없습니다.')}</div></section>`;
  const top = r.results[0].ev;
  const rows = r.results.map(x=>{
    const key=`f${k}-${x.rank}`; RES.set(key,{x, focus:f});
    const ex = x.ex = E.explainTeam(x.team, x.progs, x.ev, settings(), {});
    const order = ex.posTotal ? ex.order : x.team.map((_,i)=>i);
    const z=x.ev.sb.zone, bad=ex.notes.filter(n=>n.lvl==='off').length;
    const sbTot=x.ev.sb.per.reduce((a,b)=>a+b,0)||1;
    return `<div class="frow">
      <div class="frank">${x.rank}</div>
      <div class="fmain">
        <div class="fmem">${order.map(i=>{ const c=x.team[i], sh=x.ev.sb.per[i]/sbTot; return `<span class="mchip${sh>=0.35?' main':''}" role="button" tabindex="0" aria-expanded="false" data-sk="${key}" data-i="${i}" title="추천 세팅 보기">${elChip(c.elem)} ${esc(c.name)}</span>`; }).join('')}</div>
        <div class="fmeta"><span>${esc(z&&z.level?z.label:'존 없음')}</span> · <span class="diff lv${x.diff.lv}">Lv${x.diff.lv}</span> · SB 턴 <span class="num">${fmtN(x.ev.sbTurn)}</span> · 평상 <span class="num">${fmtN(x.ev.sustain)}</span>${bad?` · <span class="ng">버프 조건 미충족 ${bad}</span>`:''} · <button type="button" class="linkbtn" data-goalsave="${key}">목표로 저장</button></div>
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
  return {boss, enemy:any?enemy:null, ctx:{needPierce:!!(boss&&boss.needs&&boss.needs.barrier_pierce)}, mode:P.mode};
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
  return {t, s: !!c.stellar || !!cur.s, m: +cur.m||0, g: G_RANK[g]>=G_RANK[cur.g||'none']?g:(cur.g||'none'),
    gl: dealer ? {mode:'auto', ore: !!(cur.gl&&cur.gl.ore)} : (cur.gl||null)};
}
function makeGoal(ids, x){
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
  return {id:'g'+Date.now().toString(36), members:ids, tgt, mode:state.plan.mode, ts:Date.now()};
}
function saveGoalFromResult(key){
  const rec=RES.get(key); if(!rec) return;
  const ids=rec.x.team.map(c=>c.id);
  state.goals = state.goals||[];
  if(state.goals.some(g=>g.members.slice().sort().join()===ids.slice().sort().join())){ flash('이미 같은 조합이 목표에 있습니다.'); return; }
  const g=makeGoal(ids, rec.x); if(!g) return;
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
    const fC=E.grastaFactor(E.charProg(c,cu,S), evC.A.painAny).f, fT=E.grastaFactor(E.charProg(c,Object.assign({},cu,{gl:tg.gl}),S), evC.A.painAny).f;
    if(tg.gl && fT>fC+1e-6){ const gq=E.grastaFactor(E.charProg(c,Object.assign({},cu,{gl:tg.gl}),S), evC.A.painAny); push(`공격 글래스터 → ${glText(gq)}${tg.gl.ore&&!(cu.gl&&cu.gl.ore)?' + 잠재 광석':''}`, {gl:tg.gl}); }
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
      <div class="grow"><span>현현</span><span>${M_KR[+cu.m||0]}</span><span>→</span><select data-gf="m">${M_KR.map((l,k)=>`<option value="${k}"${(+tg.m||0)===k?' selected':''}>${l}</option>`).join('')}</select>${st((+cu.m||0)>=(+tg.m||0))}</div>
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
  $('#rcount').textContent = `보유 ${ownedList().length}명 · 표시 ${list.length}명 / 전체 ${prepped.length}명`;
  $('#tabOwnN').textContent = ownedList().length;
  $('#roster').innerHTML = list.map(rowHtml).join('') || `<div class="empty">조건에 맞는 캐릭터가 없습니다.</div>`;
}
function rowHtml(c){
  const o=state.owned[c.id];
  const r=c.raw;
  const head=`<input type="checkbox" id="own-${esc(c.id)}" data-own="${esc(c.id)}" ${o?'checked':''} aria-label="${esc(c.name)} 보유">
    <label class="who" for="own-${esc(c.id)}"><span class="n">${esc(c.name)}${r._custom?' <span class="badge">직접 추가</span>':''}</span>
    <span class="m">${(c.elems.length?c.elems:['none']).map(elChip).join('')} ${esc(E.WEAPON_KR[c.weapon]||'')} ${alDot(c.align)}${c.align==='light'?'천':'명'} <span class="tier ${c.tier}">${esc(c.tier||'-')}</span> ${esc(STYLE_KR[r.style]||'')}${c.stellar?' · 성도':''}</span></label>`;
  if(!o) return `<div class="row off" data-id="${esc(c.id)}">${head}<div class="ctl"><span class="hint">${esc((r.note_kr||'').slice(0,70))}${(r.note_kr||'').length>70?'…':''}</span></div></div>`;
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
    </div></div>`;
}
function onRosterChange(e){
  const t=e.target;
  if(t.dataset.own){
    const id=t.dataset.own;
    if(t.checked) state.owned[id]={t:0,s:!!byId.get(id).stellar,m:0,g:'none',gl:null};
    else delete state.owned[id];
    touchRoster();
    const row=t.closest('.row'); row.outerHTML=rowHtml(byId.get(id));
    $('#rcount').textContent = `보유 ${ownedList().length}명`; $('#tabOwnN').textContent = ownedList().length;
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
    <div class="crow"><span>스탯 환산 계수 (1타 상한 100억 기준)</span><input type="number" step="1000" min="1000" id="cCap" value="${S.statK}"><span></span><span></span></div>
    <div class="crow"><span>AF 중 1인 행동 수</span><input type="number" step="1" min="1" max="15" id="cAf" value="${S.afActions}"><span></span><span></span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small" id="constReset">기본값으로</button><span class="hint">바꾸면 다음 계산부터 반영됩니다. 절존 배율은 극존과 같습니다.</span></div>`;
}
function onConst(e){
  const t=e.target; const S=state.settings;
  if(t.dataset.arr){ const k=t.dataset.arr; S[k]=(S[k]||E.DEFAULT_SETTINGS[k]).slice(); S[k][+t.dataset.i]=+t.value||0; }
  else if(t.id==='cOpp') S.zoneOppElem=+t.value; else if(t.id==='cOff') S.zoneOffWeap=+t.value;
  else if(t.id==='cCap'){ S.statK=Math.max(1000,+t.value||22000); }
  else if(t.id==='cAf') S.afActions=Math.max(1,Math.min(15,+t.value||5));
  else return;
  cap=E.computeCap(prepped, settings()); save();
}

/* ---------- 내보내기/불러오기 ---------- */
function exportState(){ const ta=$('#ioText'); ta.value=JSON.stringify({owned:state.owned, custom:state.custom, settings:state.settings, goals:state.goals||[]}); ta.select();
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(()=>{$('#ioMsg').textContent='복사했습니다. 메모장 등에 붙여 두세요.';},()=>{$('#ioMsg').textContent='선택된 텍스트를 직접 복사하세요.';});
  else $('#ioMsg').textContent='선택된 텍스트를 직접 복사하세요.'; }
function importState(){
  try{ const d=JSON.parse($('#ioText').value); if(!d||typeof d.owned!=='object') throw 0;
    state.owned=d.owned; state.custom=Array.isArray(d.custom)?d.custom:[]; state.settings=d.settings||{}; state.sample=false; if(Array.isArray(d.goals)) state.goals=d.goals;
    save(); rebuildChars(); renderAll(); $('#ioMsg').textContent='불러왔습니다.'; }
  catch(e){ $('#ioMsg').textContent='형식이 맞지 않습니다. 내보내기로 만든 텍스트 전체를 붙여 넣으세요.'; }
}

/* ---------- 이벤트 ---------- */
function bind(){
  $$('.tab').forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.tab)));
  $('#modeSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-mode]'); if(!b) return; state.plan.mode=b.dataset.mode; save(); renderPlanControls(); if(b.dataset.mode!=='boss') runPlan(); else if(state.plan.bossId) runPlan(); else runPlan(); });
  $('#bossSel').addEventListener('change',e=>{ if(e.target.value) applyBoss(e.target.value); else { state.plan.bossId=''; save(); renderPlanControls(); } runPlan(); });
  $('#enemyGrid').addEventListener('click',e=>{ const b=e.target.closest('.etype'); if(!b) return; const t=b.dataset.t; const cur=state.plan.enemy[t]||null; const nx=REL_CYCLE[(REL_CYCLE.indexOf(cur)+1)%REL_CYCLE.length]; if(nx) state.plan.enemy[t]=nx; else delete state.plan.enemy[t]; save(); renderPlanControls(); });
  $('#enemyClear').addEventListener('click',()=>{ state.plan.enemy={}; save(); renderPlanControls(); });
  $('#countSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-n]'); if(!b) return; state.plan.enemyCount=+b.dataset.n; save(); renderPlanControls(); });
  document.addEventListener('click',e=>{ const b=e.target.closest('button[data-rm]'); if(!b) return; const L=state.plan[b.dataset.key]; const i=L.indexOf(b.dataset.rm); if(i>=0) L.splice(i,1); save(); renderPlanControls(); });
  $('#diffSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-lv]'); if(!b) return; state.plan.maxDiff=+b.dataset.lv; save(); renderPlanControls(); runPlan(); });
  $('#optDiverse').addEventListener('change',e=>{ state.settings.diverse=e.target.checked; save(); });
  $('#optCap').addEventListener('change',e=>{ state.settings.capOn=e.target.checked; save(); });
  $('#runBtn').addEventListener('click',runPlan);
  $('#focusSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-fi]'); if(!b) return; const k=+b.dataset.fi; state.plan.focus = k<0?null:Object.assign({},FOCUS_LIST[k]); save(); renderPlanControls(); runPlan(); });
  $('#fxRun').addEventListener('click', runFocusAll);
  document.addEventListener('click',e=>{ const b=e.target.closest('button[data-goalsave]'); if(b) saveGoalFromResult(b.dataset.goalsave); });
  $('#goalList').addEventListener('change', onGoalInput);
  $('#goalList').addEventListener('click',e=>{ const b=e.target.closest('button[data-gdel]'); if(!b) return; state.goals=(state.goals||[]).filter(g=>g.id!==b.dataset.gdel); save(); renderGoals(); });
  setupGoalPicker();
  $('#fxGrid').addEventListener('click',e=>{ const b=e.target.closest('button[data-fgo]'); if(!b) return; state.plan.focus=Object.assign({},FOCUS_LIST[+b.dataset.fgo]); state.plan.locked=[]; save(); renderPlanControls(); showTab('plan'); runPlan(); });
  const onMem = e=>{ if(e.target.closest('[data-sclose]')){ const box=e.target.closest('.setup'); const key=box.dataset.for; $$(`[data-sk="${key}"]`).forEach(m=>m.setAttribute('aria-expanded','false')); box.hidden=true; return; }
    const m=e.target.closest('[data-sk]'); if(!m) return; if(e.type==='keydown'){ if(e.key!=='Enter'&&e.key!==' ') return; e.preventDefault(); } toggleSetup(m); };
  ['#results','#fxGrid'].forEach(sel=>{ $(sel).addEventListener('click',onMem); $(sel).addEventListener('keydown',onMem); });
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
  $('#bulkNone').addEventListener('click',()=>{ $('#bulkConfirm').hidden=false; });
  $('#bulkNoneYes').addEventListener('click',()=>{ state.owned={}; state.sample=false; save(); $('#bulkConfirm').hidden=true; renderRoster(); });
  $('#bulkNoneNo').addEventListener('click',()=>{ $('#bulkConfirm').hidden=true; });
  $('#bulkMax').addEventListener('click',()=>{ const F=rosterFilters(); for(const row of $$('#roster .row')){ const id=row.dataset.id; const o=state.owned[id]; if(!o) continue; o.t=Math.max(o.t||0,80); if(byId.get(id).stellar) o.s=true; } touchRoster(); renderRoster(); });
  $('#defGl').addEventListener('change',e=>{ const p=GL_PRESETS[e.target.value]; state.settings.grastaDefault=Object.assign({}, p.v, {ore:$('#defOre').checked}); save(); });
  $('#defOre').addEventListener('change',e=>{ const g=Object.assign({}, E.DEFAULT_SETTINGS.grastaDefault, state.settings.grastaDefault||{}); g.ore=e.target.checked; state.settings.grastaDefault=g; save(); });
  $('#customForm').addEventListener('submit',addCustom);
  $('#customList').addEventListener('click',e=>{ const b=e.target.closest('button[data-delc]'); if(!b) return; const id=b.dataset.delc; state.custom=state.custom.filter(c=>c.id!==id); delete state.owned[id]; save(); rebuildChars(); renderRoster(); renderCustomList(); });
  $('#ioExport').addEventListener('click',exportState);
  $('#ioImport').addEventListener('click',importState);
  $('#bossFilter').addEventListener('change',renderBossList); $('#bossQ').addEventListener('input',renderBossList);
  $('#bossList').addEventListener('click',e=>{ const b=e.target.closest('[data-boss]'); if(!b) return; curBoss=b.dataset.boss; renderBossList(); });
  $('#bossDetail').addEventListener('click',e=>{ if(e.target.id==='bossGo'){ applyBoss(curBoss); showTab('plan'); runPlan(); } });
  $('#constBox').addEventListener('change',onConst);
  $('#constBox').addEventListener('click',e=>{ if(e.target.id==='constReset'){ ['zoneElem','zoneWeap','zoneOppElem','zoneOffWeap','statK','afActions'].forEach(k=>delete state.settings[k]); cap=E.computeCap(prepped, settings()); save(); renderConsts(); } });
}
function renderAll(){ renderPlanControls(); renderRoster(); renderDefGl(); renderCustomList(); renderBossList(); renderConsts(); renderGoals(); }

/* ---------- 시작 ---------- */
(async function init(){
  await loadState();
  rebuildChars();
  bind();
  renderAll();
  let tab='plan'; try{ tab=localStorage.getItem('aeopt_tab')||'plan'; }catch(e){}
  const h=(location.hash||'').slice(1); if(['plan','roster','perchar','focus','goal','boss','method'].includes(h)) tab=h;
  showTab(tab);
  setSaveText(state.sample?'예시 데이터 · 아직 저장 안 함':'이 기기에 저장됨');
  runPlan();
  connectDb();
})();
})();
