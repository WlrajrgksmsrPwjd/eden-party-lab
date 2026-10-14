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
const DEF_STATE = ()=>({v:1, sample:true, owned:{}, custom:[], settings:{}, plan:{mode:'burst', enemy:{}, bossId:'', locked:[], excluded:[], backLocked:[], enemyCount:1, maxDiff:4}, rosterView:{}});
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
  const r = await E.optimize({owned, locked:P.locked, excluded:P.excluded, backLocked:P.backLocked||[], mode:P.mode, enemy:any?enemy:null, boss, settings:settings(), cap, recommendedIds:rec, maxDiff:P.maxDiff||4},
    f=>{ if(my===runToken) $('#prog i').style.width=Math.round(f*100)+'%'; });
  if(my!==runToken) return;
  $('#runBtn').disabled=false; $('#prog').hidden=true;
  if(r.error){ out.innerHTML=`<div class="empty">${esc(r.error)}</div>`; return; }
  renderResults(r, boss, any?enemy:null);
}

function fmtN(v){ if(!isFinite(v)) return '—'; if(v>=1e8) return (v/1e8).toFixed(2)+'억'; if(v>=1e4) return (v/1e4).toFixed(1)+'만'; return v.toFixed(0); }
const MODE_KR={burst:'최고점 딜',sustain:'지속 딜',stability:'안정성',weak:'약점 맞춤',boss:'보스 맞춤'};
function renderResults(r, boss, enemy){
  const P=state.plan, out=$('#results');
  const hot = {burst:'b',sustain:'s',stability:'t',weak:'s',boss:''}[P.mode];
  let h='';
  if(state.sample) h+=`<div class="notice">예시 보유 목록(SS·S 티어 전원, 천명치 80, 성도각성 완료 가정)으로 계산한 결과입니다. <b>보유 캐릭터</b> 탭에서 실제 보유·천명치·글래스터를 입력하면 그 기준으로 다시 짭니다.</div>`;
  const enemyTxt = enemy ? Object.entries(enemy).map(([k,v])=>(E.ELEM_KR[k]||E.WT_KR[k])+' '+REL_KR[v]).join(', ') : '중립(약점·내성 없음)';
  h+=`<div class="runmeta">${esc(MODE_KR[P.mode])} · 상대 ${esc(boss?boss.name_kr:'')}${boss?' — ':''}${esc(enemyTxt)} · 적 ${P.enemyCount||1}체${(P.maxDiff||4)<4?` · 난이도 Lv${P.maxDiff} 이하`:''} · 후보 ${r.poolSize}명에서 ${r.evaluated.toLocaleString()}개 조합 평가</div>`;
  if(!r.results.length) h+=`<div class="empty">조건을 만족하는 조합이 없습니다. 난이도 상한을 올리거나 고정·제외 캐릭터를 줄여 보세요.</div>`;
  for(const x of r.results){
    const ev=x.ev, sbz=ev.sb.zone, nz=ev.normal.zone;
    const sbTot=ev.sb.total||1;
    const lockSet=new Set(P.locked);
    const top = ev.sb.per.indexOf(Math.max(...ev.sb.per));
    const co = ev.sb.cores[top];
    const tSum = x.progs.reduce((a,p)=>a+(p.t||0),0);
    const warns = x.miss.slice();
    const needPierce = boss&&boss.needs&&boss.needs.barrier_pierce;
    if(needPierce && co && !co.pierce) warns.push('주딜 배리어 관통 없음');
    if(ev.survDet.heal===0) warns.push('회복 수단 없음');
    x.team.forEach((c,i)=>{ if(c.stellar && state.owned[c.id] && state.owned[c.id].s && (x.progs[i].t||0)<15) warns.push(c.name+': 천명치 15 미만 → 성도 스킬 미반영'); });
    if(!ev.hasSB) warns.push('성도각성 캐릭터 없음 → 스텔라 버스트 불가');
    for(const z of (ev.sb.zones||[])) if(z.by && sbz && z.by===sbz.by) for(const u of (z.unmet||[])) warns.push((byId.get(z.by)?byId.get(z.by).name:'')+': '+u);
    if(sbz && sbz.how==='스킬 각성') warns.push('극존은 스킬로 각성해야 함(준비 1턴)');
    if(enemy && ev.sb.cores.some(c=>c&&(c.rel==='null'||c.rel==='absorb'))) warns.push('무효·흡수 당하는 공격자 포함');
    h+=`<section class="card${x.rank===1?' first':''}">
      <div class="card-head">
        <div class="rank">${x.rank}<small>위</small></div>
        <span class="diff lv${x.diff.lv}" title="운용 난이도 점수 ${x.diff.v.toFixed(1)}">Lv${x.diff.lv} ${esc(x.diff.kr)}</span>
        <span class="zonebadge" title="스텔라 버스트 턴 기준 존">${esc(sbz&&sbz.level?sbz.label:'존 없음')}${sbz&&sbz.byName&&sbz.level?` <span class="hint">· ${esc(sbz.byName)}${sbz.how?' · '+esc(sbz.how):''}</span>`:''}</span>
        <span class="flux">${alDot('light')} 천 ${ev.light} · ${alDot('shadow')} 명 ${ev.shadow} → ${ev.flux==='light'?'천의 흐름':ev.flux==='shadow'?'명의 흐름':'천명 동수'} · 천명치 합 <span class="num">${tSum}</span></span>
        <div class="scorebar"><span>종합 ${(x.rel*100).toFixed(0)}</span><div class="bar"><i style="width:${(x.rel*100).toFixed(0)}%"></i></div></div>
      </div>
      <div class="members">${x.team.map((c,i)=>{
        const cs=ev.sb.cores[i], share=ev.sb.per[i]/sbTot;
        const gq = cs&&cs.gq;
        return `<div class="mem${lockSet.has(c.id)?' locked':''}">
          <div class="nm">${esc(c.name)}</div>
          <div class="meta">${elChip(c.elem)} ${esc(E.WEAPON_KR[c.weapon]||c.weapon)} ${alDot(c.align)} <span class="tier ${c.tier}">${esc(c.tier)}</span> ${(c.roles||[]).slice(0,2).map(r=>esc(ROLE_KR[r]||r)).join('·')}</div>
          <div class="sk">${cs?(cs.usingSB?'SB ':'')+esc(cs.skill||''):''}${cs&&cs.rel?` · <b>${esc(REL_KR[cs.rel])}</b>`:''}</div>
          <div class="sk">${gq?'글래 '+esc(glText(gq))+(gq.painOK||!(gq.pa||gq.po)?'':' (독·페 미부여)'):''}</div>
          <div class="share" title="SB 턴 대미지 비중 ${(share*100).toFixed(0)}%"><i style="width:${(share*100).toFixed(0)}%"></i></div>
          <div class="sk">SB 턴 비중 <span class="num">${(share*100).toFixed(0)}%</span></div>
        </div>`;}).join('')}</div>
      <div class="reserve">후열: ${x.reserves.length?x.reserves.map(c=>`<b>${esc(c.name)}</b>${x.fixedBack&&x.fixedBack.has(c.id)?' <span class="fixed">고정</span>':''}`).join(', '):'—'} <span class="hint">(남는 자리는 회복·수호·해제 보강 기준)</span></div>
      <div class="metrics">
        ${metric('SB 턴 화력', ev.sbTurn, ev.sbTurn/ (r.results[0].ev.sbTurn||1), hot==='b')}
        ${metric('AF 1회 화력', ev.af, ev.af/(Math.max(...r.results.map(y=>y.ev.af))||1), hot==='b')}
        ${metric('일반 턴 평균', ev.sustain, ev.sustain/(Math.max(...r.results.map(y=>y.ev.sustain))||1), hot==='s')}
        ${metric('생존력', ev.surv, ev.surv/(Math.max(...r.results.map(y=>y.ev.surv))||1), hot==='t', true)}
      </div>
      ${warns.length?`<div class="warns">${[...new Set(warns)].map(w=>`<span class="warn">${esc(w)}</span>`).join('')}</div>`:''}
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
        <ul class="ops">${x.team.filter(c=>c.cxWhy&&c.cxWhy.length).map(c=>`<li><b>${esc(c.name)}</b>: ${esc(c.cxWhy.join(' · '))}</li>`).join('')}${x.diff.noHeal?'<li>회복 수단이 없어 피격 관리 부담 +</li>':''}${x.team.every(c=>!(c.cxWhy&&c.cxWhy.length))?'<li>특별히 신경 쓸 조작 요소가 적습니다.</li>':''}</ul>
      </details>
    </section>`;
  }
  out.innerHTML=h;
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
  const r = await E.perCharBest({owned, excluded:P.excluded, backLocked:P.backLocked||[], mode:P.mode==='boss'&&!boss?'burst':P.mode, enemy:any?enemy:null, boss, settings:settings(), cap, recommendedIds:rec, maxDiff:P.maxDiff||4},
    f=>{ $('#pcProg i').style.width=Math.round(f*100)+'%'; });
  $('#pcRun').disabled=false; $('#pcProg').hidden=true;
  if(r.error){ $('#pcTable').innerHTML=`<div class="empty">${esc(r.error)}</div>`; return; }
  pcResult=r;
  $('#pcMeta').textContent = `${MODE_KR[P.mode]}${boss?' · '+boss.name_kr:''}${(P.maxDiff||4)<4?' · 난이도 Lv'+P.maxDiff+' 이하':''} · ${r.evaluated.toLocaleString()}개 조합`;
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
function exportState(){ const ta=$('#ioText'); ta.value=JSON.stringify({owned:state.owned, custom:state.custom, settings:state.settings}); ta.select();
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(()=>{$('#ioMsg').textContent='복사했습니다. 메모장 등에 붙여 두세요.';},()=>{$('#ioMsg').textContent='선택된 텍스트를 직접 복사하세요.';});
  else $('#ioMsg').textContent='선택된 텍스트를 직접 복사하세요.'; }
function importState(){
  try{ const d=JSON.parse($('#ioText').value); if(!d||typeof d.owned!=='object') throw 0;
    state.owned=d.owned; state.custom=Array.isArray(d.custom)?d.custom:[]; state.settings=d.settings||{}; state.sample=false;
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
function renderAll(){ renderPlanControls(); renderRoster(); renderDefGl(); renderCustomList(); renderBossList(); renderConsts(); }

/* ---------- 시작 ---------- */
(async function init(){
  await loadState();
  rebuildChars();
  bind();
  renderAll();
  let tab='plan'; try{ tab=localStorage.getItem('aeopt_tab')||'plan'; }catch(e){}
  const h=(location.hash||'').slice(1); if(['plan','roster','perchar','boss','method'].includes(h)) tab=h;
  showTab(tab);
  setSaveText(state.sample?'예시 데이터 · 아직 저장 안 함':'이 기기에 저장됨');
  runPlan();
  connectDb();
})();
})();
