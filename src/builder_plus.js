/* 장비 빌더 보강(2026-10-17, 사용자 '장비 빌더도 디자인하고 쉽고 빠르고 효율적으로'):
   ① 머리띠: 편성 연구실로 돌아가기 ② 캐릭터 불러오기: 이름을 고르면 기본 스탯(천명치 반영)·주력 스킬·무기 종류를 한 번에
   (편성 연구실 보유 목록이 있으면 보유 캐릭터·천명치를 먼저) ③ 대상·전투·버프 조건은 접어 두고 바꾼 칸 수만 표시(모바일은 기본 접힘)
   ④ 모바일에서 '현재 세팅 기대 대미지'를 위에 붙여 둠. 계산 공식·장비 데이터는 그대로(출처: 딩) */
(function(){ try{
  const $id = k => document.getElementById(k);
  const D = (()=>{ try{ return JSON.parse(($id('db-bchars')||{}).textContent||'[]'); }catch(e){ return []; } })();
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = s => String(s||'').normalize('NFKC').toLowerCase().replace(/[\s()\[\]·・]/g,'');
  // 편성 연구실(같은 사이트)의 보유 목록·진명 공개 설정
  let OWN = {}, TN = false, SAMPLE = true;
  try{ const st = JSON.parse(localStorage.getItem('aeopt_state_v1')||'null'); if(st){ SAMPLE = !!st.sample; if(!st.sample) OWN = st.owned||{}; TN = !!(st.ui && st.ui.trueName); } }catch(e){}
  const nameOf = c => TN && c.tn ? c.tn : c.n;
  const ORDER = ['hp','mp','pwr','int','spd','end','spr','lck'], FK = {lck:'luck'};
  const statsAt = (s, tbl, t) => { if(!Array.isArray(s) || s.length!==8) return null; const o = {}; ORDER.forEach((k,i)=>{ let v = s[i]; if(tbl) for(const [lv,d] of tbl) if(t>=lv) v += (d[FK[k]||k]||0); o[k] = v; }); return o; };

  // ① 머리띠
  const head = document.querySelector('header.top');
  if(head){
    head.classList.add('edenhead');
    const nav = document.createElement('nav'); nav.className = 'edennav';
    nav.innerHTML = '<a class="edenback" href="index.html">← 편성 연구실</a>';
    head.insertBefore(nav, head.firstChild);
  }

  // ② 캐릭터 불러오기
  const aside = document.querySelector('aside');
  if(aside && D.length){
    const sec = document.createElement('section'); sec.className = 'pick';
    const T_OPTS = [0,30,50,80,120,200,255];
    sec.innerHTML = `<div class="sec-h">캐릭터 불러오기 <span class="pickn">${Object.keys(OWN).length ? '보유 '+Object.keys(OWN).filter(id=>D.some(c=>c.i===id)).length+'명' : ''}</span></div>
      <div class="pickrow"><input type="search" id="pkQ" placeholder="이름 검색 (예: 테오도로스)" autocomplete="off" aria-label="캐릭터 이름" aria-controls="pkL" aria-expanded="false">
        <select id="pkT" aria-label="천명치"><option value="">천명치 자동</option>${T_OPTS.map(v=>`<option value="${v}">천명 ${v}</option>`).join('')}</select></div>
      <div class="pklist" id="pkL" role="listbox" hidden></div>
      <p class="pkmsg" id="pkM" role="status">${Object.keys(OWN).length ? '편성 연구실 보유 캐릭터가 먼저 나오고, 천명치도 그대로 들어가요.' : '고르면 기본 스탯(장비 제외)·주력 스킬·무기 종류를 채워요.'}</p>`;
    aside.insertBefore(sec, aside.firstChild);
    const q = $id('pkQ'), L = $id('pkL'), M = $id('pkM'), TS = $id('pkT');
    let items = [], hl = -1;
    const TR = {SS:0,S:1,A:2,B:3,C:4};
    const list = () => {
      const k = norm(q.value);
      let arr = D.filter(c=>!k || [c.n, c.tn&&TN?c.tn:'', c.jp, c.who].concat(c.al||[]).some(x=>x && norm(x).includes(k)));
      arr.sort((a,b)=>(OWN[b.i]?1:0)-(OWN[a.i]?1:0) || (TR[a.tier]??5)-(TR[b.tier]??5) || b.sc-a.sc || nameOf(a).localeCompare(nameOf(b),'ko'));
      return arr.slice(0, k ? 40 : 24);
    };
    const draw = () => {
      items = list(); hl = Math.min(hl, items.length-1);
      L.innerHTML = items.length ? items.map((c,i)=>`<button type="button" role="option" data-pk="${i}" class="${i===hl?'hl':''}" aria-selected="${i===hl}"><b>${esc(nameOf(c))}</b> <span>${esc(c.w)}${c.tier?' · '+esc(c.tier):''}${OWN[c.i]?' · <em>보유 '+esc(OWN[c.i].t||0)+'</em>':''}</span></button>`).join('') : '<p class="pkempty">맞는 캐릭터가 없어요.</p>';
      L.hidden = false; q.setAttribute('aria-expanded','true');
    };
    const close = () => { L.hidden = true; q.setAttribute('aria-expanded','false'); hl = -1; };
    const setV = (id, v) => { const e = $id(id); if(!e || v==null) return; if(e.type==='checkbox') e.checked = !!v; else e.value = v; e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); };
    const apply = c => {
      const own = OWN[c.i], t = TS.value!=='' ? +TS.value : own ? (+own.t||0) : 255;
      const s = statsAt(c.st, c.ft, t);
      if(s){ setV('str', s.pwr); setV('int', s.int); setV('spd', s.spd); setV('luck', s.lck); setV('mp', s.mp); }
      setV('fate', t); setV('who', c.who);
      for(const k of ['atkCls','kind','atkType','elem','range','power','hits']) setV(k, c.k[k]);
      try{ // 무기 종류가 바뀌면 다른 무기 장비는 비움(전용 장비·무기 판정이 꼬이지 않게)
        if(typeof equip!=='undefined' && typeof curType!=='undefined' && c.w && curType!==c.w){
          for(const k in equip) equip[k] = null; if(typeof ore!=='undefined') for(const k in ore) ore[k] = '';
          curType = c.w; if(typeof cat!=='undefined') cat = 'weapon';
        }
      }catch(e){}
      { const exb = document.querySelector('aside .example'); if(exb) exb.hidden = true; } // 이제 예시 값이 아님
      if(typeof render==='function') render();
      q.value = ''; close();
      M.innerHTML = `<b>${esc(nameOf(c))}</b> — ${s ? `천명 ${t} 스탯` : '스탯 자료 없음(예시 값 유지)'} · ${esc(c.k.elem)} ${esc(c.k.range)} ${esc(c.k.power)}% × ${esc(c.k.hits)}타${c.sk?` (${esc(c.sk)})`:''}. <button type="button" class="btn solid" id="pkOpt">최적 빌드 찾기</button>`;
      const ob = $id('pkOpt'), oo = $id('optOpen'); if(ob && oo) ob.addEventListener('click', ()=>oo.click());
    };
    q.addEventListener('focus', draw); q.addEventListener('input', ()=>{ hl = -1; draw(); });
    q.addEventListener('keydown', e=>{
      if(e.key==='ArrowDown'){ e.preventDefault(); if(L.hidden) draw(); hl = Math.min(items.length-1, hl+1); draw(); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); hl = Math.max(0, hl-1); draw(); }
      else if(e.key==='Enter'){ e.preventDefault(); const c = items[hl>=0?hl:0]; if(c) apply(c); }
      else if(e.key==='Escape'){ close(); }
    });
    L.addEventListener('mousedown', e=>e.preventDefault());
    L.addEventListener('click', e=>{ const b = e.target.closest('button[data-pk]'); if(b){ const c = items[+b.dataset.pk]; if(c) apply(c); } });
    document.addEventListener('click', e=>{ if(!sec.contains(e.target)) close(); });
  }

  // ③ 대상·전투·버프 조건 접기(바꾼 칸 수 표시)
  if(aside){
    const secs = [...aside.querySelectorAll(':scope > section')].filter(s=>!s.classList.contains('pick'));
    const rest = secs.slice(2); // 스탯·시전 스킬 다음부터
    if(rest.length){
      const det = document.createElement('details'); det.className = 'moreconds';
      const mobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
      det.open = !mobile;
      det.innerHTML = '<summary>대상·전투·버프 조건 <span class="mcn" id="mcN"></span></summary>';
      rest[0].before(det); rest.forEach(s=>det.appendChild(s));
      const fields = [...det.querySelectorAll('input, select')].filter(e=>e.id);
      const def = new Map(fields.map(e=>[e.id, e.type==='checkbox' ? e.checked : e.value]));
      const cnt = () => { const n = fields.filter(e=>(e.type==='checkbox' ? e.checked : e.value)!==def.get(e.id)).length; const el = $id('mcN'); if(el) el.textContent = n ? `바꾼 칸 ${n}` : '기본값'; };
      det.addEventListener('input', cnt); det.addEventListener('change', cnt); setTimeout(cnt, 0);
      const rs = $id('reset'); if(rs) rs.addEventListener('click', ()=>setTimeout(cnt, 0));
    }
  }
}catch(e){ console.warn('[빌더 보강]', e); } })();
