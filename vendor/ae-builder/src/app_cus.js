// 미보유 장비: 목록의 '미보유' 버튼으로 표시. 최적 빌드 후보·고정에서 빠짐
let optExcl = new Set();
try { (JSON.parse(localStorage.getItem('ae-opt-excl') || '[]') || []).forEach(id => optExcl.add(id)); } catch (e) {}
const optSaveExcl = () => { try { localStorage.setItem('ae-opt-excl', JSON.stringify([...optExcl])); } catch (e) {} };

// ── 커스텀 장비: 무기·방어구·배지·글래스터·전용 글래스터를 직접 만들어 후보·장착·최적 빌드에 함께 씀 ──
let customs = [];   // [{ id, slot: weapon|armor|badge|glaster|gs, t, gwt, n, atk, mag, st: { str… }, fx: [{ type, v, e }] }]
const CUS_SLOT = { weapon: '무기', armor: '방어구', badge: '배지', glaster: '글래스터', gs: '전용 글래스터' };
const CUS_STATS = [['str', '힘'], ['int', '지능'], ['spd', '속도'], ['luck', '행운'], ['end', '내구'], ['spr', '정신'], ['mp', 'MP'], ['hp', 'HP']];
// 장비가 가질 수 있는 효과 전체 (계산식이 아는 효과 종류). p: 추가 입력칸
const CUS_FX = {
  elem: '속성 공격 %', crit: '크리티컬율 %', mcrit: '마법 크리티컬율 %', cpow: '크리티컬 위력 %', mcpow: '마법 크리티컬 위력 %',
  hpmax: 'HP 최대일 때 대미지 %', hplow: 'HP ○% 이하일 때 대미지 %', tpain: '대상 페인일 때 대미지 %', tpoison: '대상 독일 때 대미지 %',
  enh: '자신 상태(인핸스)일 때 대미지 %', normal: '일반 공격 대미지 %', weak: '약점 대미지 %', aim: '겨누어 쏘기 (AF 아닐 때) %',
  mpatk: 'MP 소비 공격 대미지 %', enemies: '적 수 비례 대미지 (1명당) %', growth: '성장 (턴당) %', gekoku: '하극상 (계수)',
  zone: 'ZONE 각성 중 대미지 %', zonet: '특정 ZONE 전개 중 대미지 %', fateally: '천·명 아군 수 비례 (1명당) %', fallen: '쓰러진 아군 수 비례 (1명당) %',
  wins: '누계 승리 대미지 %', mppct: '최대 MP %',
};
const CUS_P = { hplow: [['th', 'HP 기준 %', 50]], growth: [['max', '최대 %', 30]], fallen: [['max', '최대 %', 30]], gekoku: [] };
const CUS_ENV = [['', '환경 조건 없음'], ['가열', '가열 환경'], ['특수', '특수 환경'], ['날씨', '날씨 계통 환경'], ['지표', '지표 계통 환경'], ['대기', '대기 계통 환경']];
const CUS_ZONES = () => [...$('zoneT').options].map(o => o.value).filter(Boolean);
const CUS_ELEM = [['all', '모든 속성'], ['none', '무속성'], ['불', '불'], ['물', '물'], ['땅', '땅'], ['바람', '바람'], ['번개', '번개'], ['그림자', '그림자'], ['결정', '결정']];
const cusSgn = v => (v > 0 ? '+' : '') + v;
function cusFx(c) {
  const fx = [], lines = [];
  CUS_STATS.forEach(([k, n]) => {
    const v = +(c.st || {})[k] || 0; if (!v) return;
    if (k === 'hp') { fx.push({ k: 'hpinfo', v }); lines.push([`· HP${cusSgn(v)} (대미지와 무관)`, 0]); }
    else { fx.push({ k: 'stat', s: k, v }); lines.push([`· ${n}${cusSgn(v)}`, 1]); }
  });
  (c.fx || []).forEach(f => {
    const v = +f.v || 0; if (!v || !CUS_FX[f.type]) return;
    let e, lab;
    switch (f.type) {
      case 'elem': { const el = (CUS_ELEM.find(x => x[0] === (f.e || 'all')) || [, ''])[1]; e = { k: 'elem', e: f.e || 'all', v }; lab = `${el} 공격${cusSgn(v)}%`; break; }
      case 'hpmax': e = { k: 'hp', cond: 'hpmax', v }; lab = `HP 최대일 때 대미지${cusSgn(v)}%`; break;
      case 'hplow': { const th = +f.th || 50; e = { k: 'hp', cond: 'hplow', th, v }; lab = `HP ${th}% 이하일 때 대미지${cusSgn(v)}%`; break; }
      case 'tpain': e = { k: 'tstat', cond: 't_pain', v }; lab = `대상 페인일 때 대미지${cusSgn(v)}%`; break;
      case 'tpoison': e = { k: 'tstat', cond: 't_poison', v }; lab = `대상 독일 때 대미지${cusSgn(v)}%`; break;
      case 'enh': { const st = f.st || '독'; e = { k: 'enh', cond: 'self_' + st, v }; lab = `${st} 인핸스${cusSgn(v)}%`; break; }
      case 'enemies': e = { k: 'enemies', per: v }; lab = `적 1명당 대미지${cusSgn(v)}%`; break;
      case 'growth': { const mx = +f.max || 30; e = { k: 'growth', per: v, max: mx }; lab = `성장 턴당${cusSgn(v)}% (최대 ${mx}%)`; break; }
      case 'fallen': { const mx = +f.max || 30; e = { k: 'fallen', per: v, max: mx }; lab = `쓰러진 아군 1명당${cusSgn(v)}% (최대 ${mx}%)`; break; }
      case 'gekoku': e = { k: 'gekoku', d: v }; lab = `하극상 (레벨² ÷ ${v})%`; break;
      case 'zonet': { const z = (f.zk ? '극 ' : '') + (f.z || CUS_ZONES()[0] || ''); e = { k: 'zonet', z, v }; lab = `${z} 전개 중 대미지${cusSgn(v)}%`; break; }
      case 'fateally': { const who = f.who === '명' ? '명' : '천'; e = { k: 'fateally', who, per: v }; lab = `${who} 아군 1명당${cusSgn(v)}%`; break; }
      default: e = { k: f.type, v }; lab = `${CUS_FX[f.type].replace(/ ?\(.*?\)| %$/g, '')}${cusSgn(v)}%`;
    }
    if (f.env) { e.env = f.env; lab = `${f.env} 환경 · ` + lab; }
    fx.push(e); lines.push([`· ${lab}`, 1]);
  });
  return { fx, lines };
}
function cusItem(c) {
  const { fx, lines } = cusFx(c);
  const base = { id: c.id, n: (c.n || '커스텀 장비').trim(), only: '', src: '직접 만든 커스텀 장비', custom: true, lines };
  if (c.slot === 'weapon') return Object.assign(base, { slot: 'weapon', t: c.t || '검', atk: +c.atk || 0, mag: +c.mag || 0, sn: '', fx });
  if (c.slot === 'armor') return Object.assign(base, { slot: 'armor', t: c.t || '팔찌', fx });
  if (c.slot === 'badge') return Object.assign(base, { slot: 'badge', t: '배지', fx });
  const st = fx.filter(e => e.k === 'stat' || e.k === 'hpinfo'), ef = fx.filter(e => !(e.k === 'stat' || e.k === 'hpinfo'));
  return Object.assign(base, {
    slot: 'glaster', t: '글래스터', fam: c.slot === 'gs' ? '특수계' : '커스텀', ck: c.slot === 'gs' ? 'char' : '', wt: c.gwt || '', grade: '', conds: [], ch: [],
    st, fxA: ef, fxP: ef, lA: [], lP: [], hasP: false, potDitto: false, noRef: false, np: true, pot: false, canPot: false, sp: c.slot === 'gs', dmg: true, act: '',
  });
}
const CUS_ARR = { weapon: 'w', armor: 'armor', badge: 'badges', glaster: 'gl', gs: 'gl' };
function registerCustoms() {
  for (const k of ['w', 'armor', 'badges', 'gl']) DATA[k] = DATA[k].filter(x => !x.custom);
  for (const id in ITEMS) if (ITEMS[id] && ITEMS[id].custom) delete ITEMS[id];
  for (const c of customs) { const it = cusItem(c); ITEMS[c.id] = it; DATA[CUS_ARR[c.slot]].unshift(it); }
  for (const k in equip) if (equip[k] && !ITEMS[equip[k]]) equip[k] = null;
}
const cusNewId = () => { let n = 1; while (customs.some(c => c.id === 'c' + n)) n++; return 'c' + n; };
function cusAdd(c) { const x = Object.assign({ id: cusNewId(), slot: 'badge', t: '', gwt: '', n: '', atk: 0, mag: 0, st: {}, fx: [] }, c); customs.push(x); registerCustoms(); return x; }

// 커스텀 장비 표시 태그 (삭제는 '커스텀 장비' 창에서)
const cusTagHtml = it => it && it.custom ? '<span class="tag cus">커스텀</span>' : '';

// ── 화면: 커스텀 장비 창 ──
let cusLastFocus = null;
function renderCus() {
  const opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(l)}</option>`;
  let h = customs.length ? '' : '<p class="hint">아직 만든 장비가 없습니다. "+ 새 커스텀 장비"로 만들어 보세요. 만든 장비는 후보 목록 맨 위와 최적 빌드 찾기에 함께 들어갑니다.</p>';
  h += customs.map((c, i) => {
    const sub = c.slot === 'weapon' ? `<label class="f">무기 종류<select data-cu="${i}" data-cf="t">${TYPES.map(t => opt(t, t, t === (c.t || '검'))).join('')}</select></label>`
      : c.slot === 'armor' ? `<label class="f">방어구 종류<select data-cu="${i}" data-cf="t">${['팔찌', '목걸이', '반지'].map(t => opt(t, t, t === (c.t || '팔찌'))).join('')}</select></label>`
      : c.slot === 'glaster' || c.slot === 'gs' ? `<label class="f">무기 제한<select data-cu="${i}" data-cf="gwt">${opt('', '없음', !c.gwt)}${TYPES.map(t => opt(t, t + ' 전용', t === c.gwt)).join('')}</select></label>` : '';
    const atk = c.slot === 'weapon' ? `<label class="f">공격<input type="number" data-cu="${i}" data-cf="atk" value="${+c.atk || 0}"></label><label class="f">마력<input type="number" data-cu="${i}" data-cf="mag" value="${+c.mag || 0}"></label>` : '';
    const stats = CUS_STATS.map(([k, n]) => `<label class="f">${n}<input type="number" data-cs="${i}:${k}" value="${+(c.st || {})[k] || 0}"></label>`).join('');
    const fx = (c.fx || []).map((f, j) => {
      const id = `${i}:${j}`, sel = (k, list, cur, lab) => `<select data-cx="${id}:${k}" aria-label="${lab}">${list.map(([v, l]) => opt(v, l, v === cur)).join('')}</select>`;
      const num = (k, lab, def) => `<label class="cus-n">${lab}<input type="number" data-cx="${id}:${k}" value="${f[k] !== undefined && f[k] !== '' ? +f[k] : def}"></label>`;
      let extra = '';
      if (f.type === 'elem') extra = sel('e', CUS_ELEM, f.e || 'all', '속성');
      else if (f.type === 'enh') extra = sel('st', [['독', '독'], ['페인', '페인'], ['봉인', '봉인'], ['도발', '도발']], f.st || '독', '자신 상태');
      else if (f.type === 'zonet') extra = sel('z', CUS_ZONES().map(z => [z, z]), f.z || CUS_ZONES()[0], 'ZONE') + `<label class="chk sm"><input type="checkbox" data-cx="${id}:zk"${f.zk ? ' checked' : ''}> 극 (각성)</label>`;
      else if (f.type === 'fateally') extra = sel('who', [['천', '천'], ['명', '명']], f.who || '천', '천/명');
      (CUS_P[f.type] || []).forEach(([k, lab, def]) => { extra += num(k, lab, def); });
      const vLab = f.type === 'gekoku' ? '계수' : f.type === 'growth' || f.type === 'enemies' || f.type === 'fateally' || f.type === 'fallen' ? '1당 %' : '수치';
      return `<div class="cus-fx"><span class="cbx cbx-fx"><input type="text" data-cxt="${id}" value="${esc(CUS_FX[f.type] || '')}" placeholder="효과 검색 · 눌러서 목록" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cxl${i}_${j}" aria-label="효과 종류" autocomplete="off"><span class="cbx-arr" aria-hidden="true">▾</span><div class="cbl" id="cxl${i}_${j}" role="listbox" hidden></div></span>${extra}`
        + `<label class="cus-n">${vLab}<input type="number" data-cx="${id}:v" value="${+f.v || 0}"></label>${sel('env', CUS_ENV, f.env || '', '환경 조건')}<button class="lx" type="button" data-cxdel="${id}" aria-label="효과 삭제">×</button></div>`;
    }).join('');
    const on = Object.keys(equip).filter(k => equip[k] === c.id);
    return `<div class="cus-card"><div class="cus-top"><select data-cu="${i}" data-cf="slot" aria-label="장비 종류">${Object.entries(CUS_SLOT).map(([k, v]) => opt(k, v, k === c.slot)).join('')}</select>
      <input type="text" data-cu="${i}" data-cf="n" value="${esc(c.n || '')}" placeholder="장비 이름" aria-label="장비 이름">
      <button class="btn solid" type="button" data-cueq="${i}">${on.length ? '장착됨' : '장착'}</button><button class="lx" type="button" data-cudel="${i}" aria-label="삭제">×</button></div>
      <div class="cus-grid">${sub}${atk}</div>
      <div class="sub-h">스탯</div><div class="cus-grid">${stats}</div>
      <div class="sub-h">효과</div>${fx || '<span class="hint">없음</span>'}<button class="btn" type="button" data-cxadd="${i}" style="justify-self:start;padding:2px 10px">+ 효과</button></div>`;
  }).join('');
  h += `<div class="shot-act"><button class="btn solid" type="button" id="cusNew">+ 새 커스텀 장비</button><span class="hint">감소 효과는 음수로 넣으세요. MP는 정신 통일·심기일체에, 내구·정신은 루나틱 솔선에 반영되고, HP는 표시만 됩니다.</span></div>`;
  $('cusBody').innerHTML = h;
}
const cusChanged = () => { registerCustoms(); save(); renderSoon(); };
function openCus() { cusLastFocus = document.activeElement; $('cusModal').hidden = false; renderCus(); $('cusClose').focus(); }
function closeCus() { $('cusModal').hidden = true; render(); if (cusLastFocus) cusLastFocus.focus(); }
$('cusOpen').onclick = openCus;
$('cusClose').onclick = closeCus;
$('cusModal').addEventListener('click', e => {
  const t = e.target;
  if (t === $('cusModal')) return closeCus();
  if (t.id === 'cusNew') { cusAdd({}); cusChanged(); renderCus(); const ins = document.querySelectorAll('#cusBody [data-cf="n"]'); if (ins.length) ins[ins.length - 1].focus(); return; }
  const d = t.closest('[data-cudel],[data-cueq],[data-cxadd],[data-cxdel]'); if (!d) return;
  if (d.dataset.cudel !== undefined) { customs.splice(+d.dataset.cudel, 1); cusChanged(); renderCus(); }
  else if (d.dataset.cxadd !== undefined) { customs[+d.dataset.cxadd].fx.push({ type: 'elem', e: 'all', v: 0 }); renderCus(); }
  else if (d.dataset.cxdel !== undefined) { const [i, j] = d.dataset.cxdel.split(':').map(Number); customs[i].fx.splice(j, 1); cusChanged(); renderCus(); }
  else if (d.dataset.cueq !== undefined) {
    const c = customs[+d.dataset.cueq]; registerCustoms();
    const slots = c.slot === 'weapon' ? ['weapon'] : c.slot === 'armor' ? ['armor'] : c.slot === 'badge' ? ['badge1', 'badge2'] : c.slot === 'gs' ? ['gs'] : ['g1', 'g2', 'g3', 'g4'];
    if (!slots.some(k => equip[k] === c.id)) {
      const k = slots.find(k => !equip[k] && !lockOf(k, S().fate)) || slots[0];
      equip[k] = c.id; if (GS.includes(k)) ore[k] = ''; if (k.startsWith('badge')) badgeVal[k] = [];
      if (k === 'weapon') curType = c.t || '검';
    }
    save(); render(); renderCus();
  }
});
$('cusModal').addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.cu !== undefined && d.cf !== 'slot' && t.tagName === 'INPUT') { const c = customs[+d.cu]; c[d.cf] = t.type === 'number' ? (+t.value || 0) : t.value; cusChanged(); }
  else if (d.cs !== undefined) { const [i, k] = d.cs.split(':'); customs[+i].st[k] = +t.value || 0; cusChanged(); }
  else if (d.cx !== undefined && t.tagName === 'INPUT' && t.type !== 'checkbox') { const [i, j, f] = d.cx.split(':'); customs[+i].fx[+j][f] = +t.value || 0; cusChanged(); }
});
$('cusModal').addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (t.type === 'checkbox' && d.cx !== undefined) { const [i, j, f] = d.cx.split(':'); customs[+i].fx[+j][f] = t.checked; cusChanged(); return; }
  if (t.tagName !== 'SELECT') return;
  if (d.cu !== undefined) {
    const c = customs[+d.cu]; c[d.cf] = t.value;
    if (d.cf === 'slot') { c.t = ''; c.gwt = ''; for (const k in equip) if (equip[k] === c.id) equip[k] = null; }   // 종류를 바꾸면 장착 해제
    cusChanged(); renderCus();
  } else if (d.cx !== undefined) { const [i, j, f] = d.cx.split(':'), F = customs[+i].fx[+j]; if (f === 'type') { for (const k of ['e', 'st', 'z', 'zk', 'who', 'th', 'max']) delete F[k]; } F[f] = t.value; cusChanged(); renderCus(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('cusModal').hidden) { e.preventDefault(); closeCus(); } });

// 효과 종류 고르기: 검색 + 드롭다운 (콤보박스)
let cxAct = -1;
function cxOpen(inp) {
  const [i, j] = inp.dataset.cxt.split(':').map(Number), f = customs[i] && customs[i].fx[j], box = document.getElementById(`cxl${i}_${j}`); if (!f || !box) return;
  const q = inp.value.trim(), all = Object.entries(CUS_FX), L = all.filter(([, l]) => !q || q === CUS_FX[f.type] || l.includes(q));
  box.innerHTML = L.length ? L.map(([k, l], n) => `<div class="cbo${k === f.type ? ' on' : ''}" role="option" id="cxo${i}_${j}_${n}" data-cxv="${k}" aria-selected="${k === f.type}">${esc(l)}</div>`).join('') : '<div class="cbo-more">맞는 효과가 없습니다</div>';
  box.hidden = false; inp.setAttribute('aria-expanded', 'true'); cxAct = -1;
}
function cxClose(inp) { const [i, j] = inp.dataset.cxt.split(':'); const box = document.getElementById(`cxl${i}_${j}`); if (box) box.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); }
function cxPick(inp, v) {
  const [i, j] = inp.dataset.cxt.split(':').map(Number), F = customs[i].fx[j];
  if (F.type !== v) { for (const k of ['e', 'st', 'z', 'zk', 'who', 'th', 'max']) delete F[k]; F.type = v; }
  cusChanged(); renderCus();
}
$('cusModal').addEventListener('input', e => { if (e.target.dataset && e.target.dataset.cxt !== undefined) cxOpen(e.target); });
$('cusModal').addEventListener('focusin', e => { if (e.target.dataset && e.target.dataset.cxt !== undefined) { e.target.select(); cxOpen(e.target); } });
$('cusModal').addEventListener('focusout', e => {
  const inp = e.target; if (!(inp.dataset && inp.dataset.cxt !== undefined)) return;
  setTimeout(() => { if (document.activeElement === inp) return; cxClose(inp); const [i, j] = inp.dataset.cxt.split(':').map(Number), f = customs[i] && customs[i].fx[j]; if (f) inp.value = CUS_FX[f.type] || ''; }, 150);
});
$('cusModal').addEventListener('mousedown', e => { const o = e.target.closest('[data-cxv]'); if (!o) return; e.preventDefault(); const inp = o.closest('.cbx').querySelector('input'); cxPick(inp, o.dataset.cxv); });
$('cusModal').addEventListener('keydown', e => {
  const inp = e.target; if (!(inp.dataset && inp.dataset.cxt !== undefined)) return;
  const [i, j] = inp.dataset.cxt.split(':'), box = document.getElementById(`cxl${i}_${j}`); if (!box) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (box.hidden) cxOpen(inp);
    const os = [...box.querySelectorAll('[data-cxv]')]; if (!os.length) return;
    cxAct = Math.max(0, Math.min(os.length - 1, cxAct + (e.key === 'ArrowDown' ? 1 : -1)));
    os.forEach((o, n) => o.classList.toggle('act', n === cxAct)); os[cxAct].scrollIntoView({ block: 'nearest' }); inp.setAttribute('aria-activedescendant', os[cxAct].id);
  } else if (e.key === 'Enter') { e.preventDefault(); const os = [...box.querySelectorAll('[data-cxv]')], o = os[cxAct >= 0 ? cxAct : 0]; if (o && !box.hidden) cxPick(inp, o.dataset.cxv); }
  else if (e.key === 'Escape' && !box.hidden) { e.preventDefault(); e.stopPropagation(); cxClose(inp); }
});

// ── 'N종류 중 하나(…)' 무기·방어구: 고를 수 있게 (기본 = 대미지가 가장 높은 쪽) ──
let wChoice = {};   // { 장비 id: [줄 순서별 선택 '' = 자동 | 옵션 번호] }
function wParseOpt(t) {
  t = t.trim(); let m;
  if ((m = t.match(/^HP 최대 시 대미지\+(\d+)%$/))) return [{ k: 'hp', cond: 'hpmax', v: +m[1] }];
  if ((m = t.match(/^(힘|지능|속도|행운|내구|정신|MP)\+(\d+)$/))) return [{ k: 'stat', s: { 힘: 'str', 지능: 'int', 속도: 'spd', 행운: 'luck', 내구: 'end', 정신: 'spr', MP: 'mp' }[m[1]], v: +m[2] }];
  if ((m = t.match(/^(불|물|땅|바람|번개|그림자|결정) 속성 공격\+(\d+)%$/))) return [{ k: 'elem', e: m[1], v: +m[2] }];
  return [];
}
for (const it of [...DATA.w, ...DATA.armor]) {
  const wch = [];
  (it.lines || []).forEach((l, li) => {
    const m = l[0].match(/^·\s*\d+종류 중 하나\((.*)\)$/); if (!m) return;
    const opts = m[1].split(' / ').map(t => ({ t: t.trim(), fx: wParseOpt(t) }));
    if (opts.some(o => o.fx.length)) wch.push({ li, opts });
  });
  if (wch.length) it.wch = wch;
}
const wForce = {};   // 자동 계산 중 강제 선택 { id: [i, 옵션] }
let wAuto = new Map();
function wPick(it, i, s) {
  const f = wForce[it.id]; if (f && f[0] === i) return f[1];
  const u = (wChoice[it.id] || [])[i]; if (u !== undefined && u !== '' && it.wch[i].opts[+u]) return +u;
  const key = it.id + ':' + i; if (wAuto.has(key)) return wAuto.get(key);
  // 자동: 지금 조건에서 대미지가 가장 높은 옵션
  wAuto.set(key, 0);
  const slot = it.slot === 'weapon' ? 'weapon' : 'armor';
  let best = 0, bv = -Infinity;
  it.wch[i].opts.forEach((o, oi) => { wForce[it.id] = [i, oi]; try { const v = evalBuild(itemsWith(slot, it.id, s), s).exp; if (v > bv + 1e-9) { bv = v; best = oi; } } catch (e) {} });
  delete wForce[it.id]; wAuto.set(key, best); return best;
}
function withWChoice(it, s) {
  if (!it || !it.wch) return it;
  const add = []; it.wch.forEach((c, i) => { add.push(...c.opts[wPick(it, i, s)].fx); });
  return add.length ? Object.assign({}, it, { fx: it.fx.concat(add) }) : it;
}

// ── 확인된 실제 수치로 고친 무기 (시트 값이 범위·오차로 부정확했던 것) — 범위 처리보다 먼저 ──
const WFIX = [["지팡이", "항마의 지팡이 (재가공)", 26, 218], ["지팡이", "백식의 지팡이", 27, 218], ["지팡이", "이클립스 스태프", 27, 218], ["지팡이", "아공의 지팡이 (재가공)", 26, 218], ["지팡이", "홍옥의 사자 (재가공)", 26, 218], ["지팡이", "부평화의 지팡이", 26, 218], ["지팡이", "비취 결정의 지팡이 (재가공)", 26, 218], ["지팡이", "오푸스 로드", 26, 218], ["지팡이", "글래티 아이기스 (재가공)", 26, 218], ["지팡이", "아세트 비터 (재가공)", 26, 218], ["지팡이", "명귀의 석장 (재가공)", 26, 218], ["지팡이", "플라즈마 로드", 26, 218], ["지팡이", "고래수염", 28, 218], ["지팡이", "메이스 오브 제우스", 28, 218], ["지팡이", "솟구치는 용기의 구름", 19, 155], ["지팡이", "드림 스태프", 18, 155], ["지팡이", "항마의 지팡이", 18, 155], ["지팡이", "팩 픽 블룸", 19, 155], ["검", "환영을 두른 창광의 검 (재가공)", 218, 26], ["검", "항마의 검 (재가공)", 218, 26], ["검", "백식의 검", 218, 27], ["검", "이클립스 소드", 218, 27], ["검", "아공의 검 (재가공)", 218, 26], ["검", "숙련의 솜씨 (재가공)", 218, 26], ["검", "부평화의 검", 218, 26], ["검", "비취 결정의 검 (재가공)", 218, 26], ["검", "오푸스 소드", 218, 26], ["검", "델리아 크시포스 (재가공)", 218, 26], ["검", "구천 요괴검 (재가공)", 218, 26], ["검", "플라즈마 소드", 218, 26], ["검", "심연을 자르는 찰나의 광망", 155, 19], ["검", "나이트 윙", 155, 18], ["검", "항마의 검", 155, 18], ["검", "그립 소드", 155, 19], ["검", "블러드 블레이드", 155, 19], ["검", "페어 소드", 155, 19], ["검", "연옥의 검", 155, 18], ["검", "인연의 검", 155, 18], ["도", "항마의 도 (재가공)", 227, 37], ["도", "백식의 도", 227, 38], ["도", "이클립스 블레이드", 227, 38], ["도", "아공의 도 (재가공)", 227, 37], ["도", "명발의 태도 (재가공)", 227, 37], ["도", "부평화의 도", 227, 37], ["도", "비취 결정의 도 (재가공)", 227, 37], ["도", "오푸스 대거", 227, 37], ["도", "월류영광 (재가공)", 227, 37], ["도", "명귀의 대태토 (재가공)", 227, 37], ["도", "전거일문자", 227, 37], ["도", "거장의 도 (재가공)", 210, 34], ["도", "용골의 도 (재가공)", 210, 34], ["도", "환음 (재가공)", 210, 34], ["도", "아주로 라마 (재가공)", 210, 34], ["도", "앵영 (재가공)", 210, 34], ["도", "희도유성 (재가공)", 210, 34], ["도", "오거닉스", 210, 33], ["도", "여왕 고양이의 도 (Lv16)", 192, 31], ["도", "버터플라이 소드", 192, 32], ["도", "프로토 바쿠스", 192, 32], ["도", "흡혼탈백의 도", 192, 32], ["도", "기디언 셰켈", 192, 32], ["도", "월류영광", 192, 32], ["도", "천공 의장병의 도", 192, 32], ["도", "연대기의 도", 192, 32], ["도", "기계식 도", 192, 32], ["도", "명발의 태도", 192, 32], ["도", "비취 결정의 도", 192, 32], ["도", "명귀의 대태토", 192, 32], ["도", "메이지 매셔", 172, 30], ["도", "복원된 시간의 도", 172, 29], ["도", "불굴의 도", 172, 29], ["도", "물 정령의 도", 172, 29], ["도", "만물을 가르는 일섬", 161, 27], ["도", "희도유성", 161, 26], ["도", "항마의 도", 161, 26], ["도", "두 번째 별", 161, 27], ["도끼", "환영을 두른 창광의 도끼 (재가공)", 235, 10], ["도끼", "엔포스 액스", 235, 10], ["도끼", "항마의 도끼 (재가공)", 235, 11], ["도끼", "백식의 도끼", 235, 10], ["도끼", "이클립스 액스", 235, 10], ["도끼", "아공의 도끼 (재가공)", 235, 11], ["도끼", "결식의 날카로운 꼬리 (재가공)", 235, 11], ["도끼", "부평화의 도끼", 235, 10], ["도끼", "비취 결정의 도끼 (재가공)", 235, 11], ["도끼", "오푸스 액스", 235, 10], ["도끼", "헤카테 섀튼 (재가공)", 235, 11], ["도끼", "명귀의 도끼 (재가공)", 235, 11], ["도끼", "플라즈마 액스", 235, 10], ["도끼", "여왕 고양이의 도끼 (Lv16)", 200, 8], ["도끼", "프로토 마르스", 200, 8], ["도끼", "흡혼탈백의 도끼", 200, 8], ["도끼", "바르젤 셰켈", 200, 8], ["도끼", "헤카테 섀튼", 199, 8], ["도끼", "천공 의장병의 도끼", 200, 8], ["도끼", "연대기의 도끼", 200, 8], ["도끼", "기계식 도끼", 200, 8], ["도끼", "결식의 날카로운 꼬리", 200, 8], ["도끼", "비취 결정의 도끼", 200, 8], ["도끼", "명귀의 도끼", 200, 8], ["도끼", "마나 해칫", 137, 6], ["도끼", "팔콘 액스", 137, 5], ["창", "엔포스 파이크", 218, 27], ["창", "항마의 창 (재가공)", 218, 26], ["창", "백식의 창", 218, 27], ["창", "이클립스 스피어", 218, 27], ["창", "아공의 창 (재가공)", 218, 26], ["창", "맹돌의 모악 (재가공)", 218, 26], ["창", "부평화의 창", 218, 26], ["창", "비취 결정의 창 (재가공)", 218, 26], ["창", "오푸스 스피어", 218, 26], ["창", "울칸 액투스 (재가공)", 218, 26], ["창", "명귀의 언월도 (재가공)", 218, 26], ["창", "플라즈마 스피어", 218, 26], ["활", "여왕 고양이의 활 (Lv16)", 167, 47], ["활", "프로토 디아나", 167, 47], ["활", "흡혼탈백의 활", 167, 47], ["활", "게셰트 셰켈", 167, 47], ["활", "홍련·석산", 166, 47], ["활", "천공 의장병의 활", 167, 47], ["활", "연대기의 활", 167, 47], ["활", "기계식 활", 167, 47], ["활", "남만의 쌍저", 167, 47], ["활", "비취 결정의 활", 167, 47], ["활", "명귀의 활", 167, 47], ["활", "쥔 자와 구한 자", 140, 39], ["활", "롤리팝 슛", 139, 39], ["활", "항마의 활", 139, 39], ["권갑", "환영을 두른 창광의 권갑 (재가공)", 213, 35], ["권갑", "항마의 권갑 (재가공)", 213, 35], ["권갑", "백식의 권갑", 214, 36], ["권갑", "이클립스 글러브", 214, 36], ["권갑", "아공의 권갑 (재가공)", 213, 35], ["권갑", "수천의 바늘 구슬 (재가공)", 213, 35], ["권갑", "부평화의 권갑", 213, 35], ["권갑", "비취 결정의 권갑 (재가공)", 213, 35], ["권갑", "오푸스 피스트", 213, 35], ["권갑", "벌크 파우스트 (재가공)", 213, 35], ["권갑", "명귀의 갈고리발톱 (재가공)", 213, 35], ["권갑", "플라즈마 피스트", 213, 35], ["권갑", "작열을 담은 호완", 152, 25], ["권갑", "토토 럭키 핸드", 151, 25], ["권갑", "항마의 권갑", 151, 25], ["권갑", "마나 피스트", 124, 21], ["권갑", "팔콘 너클", 124, 20], ["망치", "진명핵의 파성퇴 EX", 171, 125], ["망치", "붉은 용 물방울 파성퇴 EX", 171, 125], ["망치", "흑룡루의 파성퇴 EX", 171, 125], ["망치", "아공의 망치", 171, 124], ["망치", "무지마 해머", 171, 125], ["망치", "프로토 불카누스", 167, 121], ["망치", "흡혼탈백의 망치", 167, 121], ["망치", "워 해머 얼티마니아", 166, 121], ["망치", "프로메티온", 166, 121], ["망치", "비취 결정의 망치", 167, 121], ["망치", "번쾌 요괴추", 167, 121], ["망치", "찬란한 황금의 태양", 140, 102], ["망치", "토토 해머 헤드", 139, 101], ["망치", "항마의 망치", 139, 101]];
for (const [t, n, atk, mag] of WFIX) for (const w of DATA.w) if (w.t === t && w.n === n) { w.atk = atk; w.mag = mag; delete w.ar; w.sn = ''; w.fixed = true; }
// ── 공격·마력이 범위로 적힌 무기: 범위의 최댓값으로 계산 ──
for (const w of DATA.w) {
  if (Array.isArray(w.ar)) { w.atkMin = w.ar[0]; w.atkMax = w.ar[1]; w.atk = w.atkMax; }
  const m = (w.sn || '').match(/마력 범위 표기\((\d+)~(\d+)\)/);
  if (m) { w.magMin = +m[1]; w.magMax = +m[2]; w.mag = w.magMax; }
  const note = [w.atkMax !== undefined ? `공격 ${w.atkMin}~${w.atkMax}` : '', w.magMax !== undefined ? `마력 ${w.magMin}~${w.magMax}` : ''].filter(Boolean).join(' · ');
  if (note) w.sn = `${note} (범위 표기, 최댓값으로 계산)`;
}
