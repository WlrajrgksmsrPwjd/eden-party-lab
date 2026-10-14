
// ── 최적 빌드 찾기: 고른 무기 종류 안에서 무기까지, 방어구·배지·글래스터(연성 포함)를 바꿔 가며 기대 대미지가 가장 큰 조합 찾기 ──
// 조건은 지금 페이지 설정 그대로 (HP, 존, 솔선, P글래, 대상 상태, 턴 수 등)
// 크리티컬 여부: exp = 크리율 반영 기대값 / c = 크리티컬 확정 / n = 크리티컬 없음
const OPT_METRIC = { exp: '기대값 (크리율 반영)', c: '크리티컬 확정', n: '크리티컬 없음' };
let optMetric = 'exp';
// 어나더 포스: page = 왼쪽 '어나더 포스 중' 설정 따름 / on = AF 중으로 계산 / off = AF 아닐 때로 계산
const OPT_AF = { page: '설정 따름', on: 'AF 중', off: 'AF 아님' };
let optAF = 'page';
// 최적 빌드 계산에 쓰는 조건 = 페이지 설정 + 이 창의 선택 (보스 레벨 빈칸 = 140)
function optS() { const s = S(); if (!s.tlv) s.tlv = 140; if (optAF !== 'page') s.af = optAF === 'on'; return s; }
try { const m = localStorage.getItem('ae-opt-metric'); if (OPT_METRIC[m]) optMetric = m; } catch (e) {}
// 고정 장비 목록: [{ kind, id, ore }] — '+ 고정 추가'로 늘림. 찾을 때 kind에 맞는 칸에 차례로 넣고 그 칸은 바꾸지 않음 (글래스터는 연성까지 고정)
const PIN_KIND = { weapon: '무기', armor: '방어구', badge: '배지', gl: '글래스터', gs: '전용 글래스터' };
const PIN_SLOTS = { weapon: ['weapon'], armor: ['armor'], badge: ['badge1', 'badge2'], gl: ['g1', 'g2', 'g3', 'g4'], gs: ['gs'] };
const slotKind = k => k === 'weapon' ? 'weapon' : k === 'armor' ? 'armor' : k.startsWith('badge') ? 'badge' : k === 'gs' ? 'gs' : 'gl';
let optPins = [];
try {
  const v = JSON.parse(localStorage.getItem('ae-opt-pin') || '[]');
  if (Array.isArray(v)) optPins = v.filter(p => p && PIN_KIND[p.kind]).map(p => ({ kind: p.kind, id: ITEMS[p.id] || p.id === 'custom' ? p.id : '', ore: p.ore || '' }));
  else if (v && typeof v === 'object') for (const k in v) if (v[k] && ITEMS[v[k].id]) optPins.push({ kind: slotKind(k), id: v[k].id, ore: v[k].ore || '' });   // 예전 칸별 저장
} catch (e) {}
const optSavePin = () => { try { localStorage.setItem('ae-opt-pin', JSON.stringify(optPins)); } catch (e) {} };
function optPinWhyItem(kind, id) {   // 고른 무기 종류와 맞지 않는 고정 장비
  const it = ITEMS[id]; if (!it) return '';
  if (kind === 'armor' && it.t !== ARMOR_OF[optWT]) return `${optWT}에는 ${ARMOR_OF[optWT]}만 장착 가능`;
  if ((kind === 'gl' || kind === 'gs') && it.wt && it.wt !== optWT) return `${it.wt} 전용`;
  return '';
}
// 고정 목록 → 칸 배치. why: 계산에서 빠지는 이유 (종류 불일치, 같은 장비 중복, 칸 부족·잠김)
function optPinPlan(s) {
  // 같은 부위에 칸보다 많이 고정하면: 그 부위는 고정한 장비들 중에서 대미지가 가장 높은 조합을 고름 (choose)
  const map = {}, why = optPins.map(() => ''), note = optPins.map(() => ''), choose = {}, valid = {}, empty = {};
  const wFirst = optPinWeapon();
  optPins.forEach((p, i) => {
    if (!p.id) {   // 미장착 고정: 그 부위 칸 하나를 비워 둠 (무기도 가능 — 공격력·마력 0, 효과 없음)
      (empty[p.kind] = empty[p.kind] || []).push(i); return;
    }
    if (optExcl.has(p.id)) { why[i] = '미보유 장비'; return; }
    if (p.kind === 'weapon' && wFirst && ITEMS[p.id].t !== wFirst.t) { why[i] = `무기 종류 다름 (${ITEMS[p.id].t})`; return; }
    const w = optPinWhyItem(p.kind, p.id); if (w) { why[i] = w; return; }
    if (optPins.some((q, j) => j < i && q.id && q.kind === p.kind && optName(q.id) === optName(p.id))) { why[i] = '같은 장비 중복'; return; }
    (valid[p.kind] = valid[p.kind] || []).push({ i, id: p.id, ore: p.kind === 'gl' || p.kind === 'gs' ? (p.ore || '') : '' });
  });
  // 미장착 고정은 그 부위의 뒤쪽 칸부터 비움 (예: 배지 1개 미장착 → 배지 2 비움)
  const freeOf = {};
  for (const kind in PIN_SLOTS) {
    let free = PIN_SLOTS[kind].filter(k => !lockOf(k, s.fate));
    const E = empty[kind] || [];
    E.forEach(i => { if (!free.length) { why[i] = '비울 칸이 없음 (천명 잠김 또는 이미 다 비움)'; return; } const k = free.pop(); map[k] = { id: null, ore: '' }; note[i] = `${optSlotLabel(k)} 비워 둠`; });
    freeOf[kind] = free;
  }
  for (const kind in valid) {
    const L = valid[kind], free = freeOf[kind];
    if (!free.length) { L.forEach(x => { why[x.i] = (empty[kind] || []).length ? '남은 칸이 없음 (미장착 고정이 칸을 차지)' : '천명 부족으로 칸이 잠김'; }); continue; }
    if (L.length <= free.length) L.forEach((x, j) => { map[free[j]] = { id: x.id, ore: x.ore }; });
    else { choose[kind] = { slots: free, items: L }; L.forEach(x => { note[x.i] = `${PIN_KIND[kind]} 고정 ${L.length}개 중 ${free.length}개를 대미지가 높은 쪽으로 고름`; }); }
  }
  return { map, why, note, choose };
}
const optPinned = (k, id) => !!id && optPins.some(p => p.kind === slotKind(k) && p.id === id);
const optPinWeapon = () => { const p = optPins.find(p => p.kind === 'weapon' && ITEMS[p.id]); return p ? ITEMS[p.id] : null; };
let optCtl = null, optRes = null, optLastFocus = null, optWT = '';
const OPT_WT = ['검', '도', '도끼', '창', '활', '권갑', '망치', '지팡이'];
const OPT_ALL = ['weapon', 'armor', 'badge1', 'badge2', 'g1', 'g2', 'g3', 'g4', 'gs'];
let OPT_SLOTS = OPT_ALL, optChooseSlots = new Set();   // 찾을 때 천명으로 잠긴 칸은 뺌
// 무기 미장착 고정: 무기 칸은 비우고(공격력·마력 0, 효과 없음) 무기 종류는 고른 종류 그대로 — 방어구·전용 글래스터·조건 판정 모두 그 종류 기준
const optNoW = () => optPins.some(p => p.kind === 'weapon' && !p.id);
const optSpecial = g => g.ck === 'char' || g.fam === '특수계';
const optSolStat = e => e.k === 'stat' && SOL_STAT(e.s);

function optPools(s) {
  const who = s.who.trim(), wt = optWT, sol = solOn();
  const ok = it => (!it.only || (who && it.only.includes(who))) && !optExcl.has(it.id);
  const solG = g => sol && g.st.concat(g.fxA, g.fxP).some(optSolStat);
  const glOk = g => (!g.wt || g.wt === wt) && (g.dmg || solG(g) || isClassPledge(g)) && ok(g);
  const badgeOk = b => ok(b) && (badgeVarKeys(b) || (b.fx || []).some(e => e.k !== 'hpinfo' && (sol || !optSolStat(e))));
  const badges = DATA.badges.filter(badgeOk).map(b => b.id);
  return {
    weapon: DATA.w.filter(w => w.t === wt && ok(w)).map(w => w.id),
    armor: DATA.armor.filter(a => a.t === ARMOR_OF[wt] && ok(a)).map(a => a.id),
    badge: badges,
    gl: DATA.gl.filter(g => !optSpecial(g) && glOk(g)).map(g => g.id),
    gs: DATA.gl.filter(g => optSpecial(g) && glOk(g)).map(g => g.id),
  };
}
let optOreFix = {};   // 고정 후보 글래스터: 연성 고정
const optOres = gid => {
  if (optOreFix[gid] !== undefined) return [optOreFix[gid]];
  const g = ITEMS[gid]; if (!g) return [''];
  if (g.noRef) return g.canPot ? ['', 'pot'] : [''];
  const sol = solOn();
  return Object.values(ORES).filter(o => (o.id !== 'pot' || g.canPot) && (o.id === '' || o.id === 'pot' || o.fx.some(e => sol || !optSolStat(e)))).map(o => o.id);
};
const optName = id => id === 'custom' ? 'custom' : (ITEMS[id] ? ITEMS[id].n : id);

// 평가: 전역 equip/ore/badgeVal을 잠시 바꿔 계산 (호출한 쪽에서 복원)
function optMakeEval(s, bvById) {
  let n = 0;
  const f = st => {
    n++;
    Object.assign(equip, st.equip); Object.assign(ore, st.ore);
    badgeVal = { badge1: bvById[st.equip.badge1] || [], badge2: bvById[st.equip.badge2] || [] };
    baseWT = optWT; try { return evalBuild(itemsWith(null, null, s), s)[optMetric]; } finally { baseWT = null; }
  };
  f.count = () => n;
  return f;
}
const optClone = st => ({ equip: Object.assign({}, st.equip), ore: Object.assign({}, st.ore) });
// 글래스터 1~4칸은 순서만 다른 조합을 같은 빌드로 봄
const optKey = st => (st.equip.weapon || '-') + '#' + ['armor', 'badge1', 'badge2'].map(k => st.equip[k] || '-').sort().join('|') + '#' + ['g1', 'g2', 'g3', 'g4'].map(k => (st.equip[k] || '-') + '@' + (st.ore[k] || '')).sort().join('|') + '#' + (st.equip.gs || '-') + '@' + (st.ore.gs || '');

// 같은 장비(이름 기준)는 두 칸에 못 낌
function optDup(st, slot, id) {
  if (!id || slot === 'weapon' || slot === 'armor') return false;
  const n = optName(id), grp = slot.startsWith('badge') ? ['badge1', 'badge2'] : GS;
  return grp.some(k => k !== slot && st.equip[k] && optName(st.equip[k]) === n);
}

// 한 칸씩 가장 좋은 걸로 바꾸기를 더 안 바뀔 때까지 반복
async function optClimb(st, val, P, ev, tick) {
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (const k of OPT_SLOTS) {
      const pool = k === 'weapon' ? P.weapon : k === 'armor' ? P.armor : k.startsWith('badge') ? P.badge : k === 'gs' ? P.gs : P.gl;
      let best = null, bv = val;
      for (const id of k === 'weapon' || optChooseSlots.has(k) ? pool : [null, ...pool]) {
        if (id === st.equip[k] || optDup(st, k, id)) continue;
        const t = optClone(st); t.equip[k] = id;
        if (GS.includes(k)) { const os = id ? optOres(id) : ['']; t.ore[k] = os.includes(st.ore[k]) ? st.ore[k] : (id ? defOre(ITEMS[id]) : ''); if (!os.includes(t.ore[k])) t.ore[k] = os[0]; }
        const v = ev(t); if (v > bv + 1e-6) { bv = v; best = t; }
        if (await tick()) return [st, val];
      }
      if (best) { st = best; val = bv; moved = true; }
      if (GS.includes(k) && st.equip[k]) {   // 연성
        let bo = null;
        for (const o of optOres(st.equip[k])) { if (o === st.ore[k]) continue; const t = optClone(st); t.ore[k] = o; const v = ev(t); if (v > val + 1e-6) { val = v; bo = t; } }
        if (bo) { st = bo; moved = true; }
      }
    }
    if (!moved) break;
  }
  // 마무리: 각 글래스터 칸에서 상위 후보들을 연성까지 함께 바꿔 보기
  let again = true;
  while (again) {
    again = false;
    for (const k of GS.filter(x => OPT_SLOTS.includes(x))) {
      const pool = k === 'gs' ? P.gs : P.gl, sc = [];
      for (const id of pool) { if (optDup(st, k, id) || id === st.equip[k]) continue; const t = optClone(st); t.equip[k] = id; t.ore[k] = defOre(ITEMS[id]); if (!optOres(id).includes(t.ore[k])) t.ore[k] = optOres(id)[0]; sc.push([ev(t), id]); if (await tick()) return [st, val]; }
      sc.sort((a, b) => b[0] - a[0]);
      for (const [, id] of sc.slice(0, 8)) for (const o of optOres(id)) {
        const t = optClone(st); t.equip[k] = id; t.ore[k] = o; const v = ev(t);
        if (v > val + 1e-6) { val = v; st = t; again = true; }
        if (await tick()) return [st, val];
      }
    }
    if (again) { const r = await optClimb(st, val, P, ev, tick); st = r[0]; val = r[1]; again = false; }
  }
  return [st, val];
}

async function optSearch(s, opts) {
  opts = opts || {};
  const save = { equip: Object.assign({}, equip), ore: Object.assign({}, ore), bv: badgeVal };
  const bvById = {}; ['badge1', 'badge2'].forEach(k => { if (equip[k] && badgeVal[k] && badgeVal[k].length) bvById[equip[k]] = badgeVal[k]; });
  if (!optWT) optWT = equip.weapon && ITEMS[equip.weapon] ? ITEMS[equip.weapon].t : '검';
  if (optPinWeapon()) optWT = optPinWeapon().t;
  const P = opts.pools || optPools(s), ev = optMakeEval(s, bvById);
  const restore = () => { Object.assign(equip, save.equip); Object.assign(ore, save.ore); badgeVal = save.bv; };
  let last = performance.now(), stop = false;
  const tick = async () => {
    if (opts.signal && opts.signal.aborted) { stop = true; return true; }
    if (performance.now() - last > 40) { restore(); if (opts.onTick) opts.onTick(ev.count()); await new Promise(r => setTimeout(r, 0)); last = performance.now(); }
    return false;
  };
  const found = new Map();
  try {
    const PLAN = optPinPlan(s), PM = PLAN.map, CH = PLAN.choose;
    // 후보 중 선택하는 부위: 그 부위 후보를 고정한 장비들로 제한, 글래스터 연성도 고정값으로
    optOreFix = {}; optChooseSlots = new Set();
    for (const kind in CH) {
      const ids = CH[kind].items.map(x => x.id); CH[kind].items.forEach(x => { if (kind === 'gl' || kind === 'gs') optOreFix[x.id] = x.ore; });
      P[{ weapon: 'weapon', armor: 'armor', badge: 'badge', gl: 'gl', gs: 'gs' }[kind]] = ids; CH[kind].slots.forEach(k => optChooseSlots.add(k));
    }
    OPT_SLOTS = OPT_ALL.filter(k => !lockOf(k, s.fate) && !PM[k]);
    const pinAll = st => {
      for (const k in PM) { st.equip[k] = PM[k].id; st.ore[k] = PM[k].ore; }
      for (const kind in CH) {   // 후보 부위: 후보가 아닌 장비는 빼고 빈 칸은 후보로 채움
        const ids = CH[kind].items.map(x => x.id);
        CH[kind].slots.forEach(k => { if (st.equip[k] && !ids.includes(st.equip[k])) { st.equip[k] = null; st.ore[k] = ''; } });
        CH[kind].slots.forEach(k => { if (st.equip[k]) return; const x = CH[kind].items.find(x => !CH[kind].slots.some(q => st.equip[q] && optName(st.equip[q]) === optName(x.id))); if (x) { st.equip[k] = x.id; st.ore[k] = x.ore; } });
      }
      return st;
    };
    const cur = { equip: {}, ore: {} }; SLOTS.forEach(([k]) => { cur.equip[k] = save.equip[k] || null; cur.ore[k] = save.ore[k] || ''; });
    const curV = save.equip.weapon ? ev(cur) : 0;
    // 지금 무기가 고른 종류가 아니면: 그 종류에서 단독 점수가 가장 높은 무기로 시작 (나머지 칸은 비움)
    if (PM.weapon) cur.equip.weapon = PM.weapon.id;
    else if (CH.weapon) { let bw = null, bv = -1; for (const id of P.weapon) { const t = optClone(cur); t.equip.weapon = id; const v = ev(t); if (v > bv) { bv = v; bw = id; } } if (ITEMS[cur.equip.weapon || ''] && ITEMS[cur.equip.weapon].t !== optWT) OPT_ALL.forEach(k => { if (k !== 'weapon') { cur.equip[k] = null; cur.ore[k] = ''; } }); cur.equip.weapon = bw; }
    else if (!cur.equip.weapon || ITEMS[cur.equip.weapon].t !== optWT || !P.weapon.includes(cur.equip.weapon)) {
      OPT_ALL.forEach(k => { if (k !== 'weapon') { cur.equip[k] = null; cur.ore[k] = ''; } });
      let bw = null, bv = -1; for (const id of P.weapon) { const t = optClone(cur); t.equip.weapon = id; const v = ev(t); if (v > bv) { bv = v; bw = id; } }
      cur.equip.weapon = bw;
    }
    OPT_ALL.forEach(k => { if (lockOf(k, s.fate)) { cur.equip[k] = null; cur.ore[k] = ''; } });
    // 고정 장비와 같은 이름이 다른 칸에 있으면 비움
    pinAll(cur); OPT_SLOTS.forEach(k => { if (cur.equip[k] && optDup(cur, k, cur.equip[k])) { cur.equip[k] = null; cur.ore[k] = ''; } });
    if (!cur.equip.weapon && !PM.weapon) return { best: null, alts: [], cur: curV, evals: ev.count(), stopped: false, pools: P };
    // 출발점: 지금 장비 / 빈 상태 / 칸별 상위 후보에서 무작위 몇 개
    const empty = optClone(cur); OPT_SLOTS.forEach(k => { if (k !== 'weapon') { empty.equip[k] = null; empty.ore[k] = ''; } });
    const starts = [cur, pinAll(empty)];
    const top = {};
    for (const k of ['armor', 'badge1', 'g1', 'gs']) {
      const pool = k === 'armor' ? P.armor : k === 'badge1' ? P.badge : k === 'gs' ? P.gs : P.gl;
      top[k] = pool.map(id => { const t = optClone(empty); t.equip[k] = id; if (GS.includes(k)) { const os = optOres(id); t.ore[k] = os.includes(defOre(ITEMS[id])) ? defOre(ITEMS[id]) : os[0]; } return [ev(t), id]; }).sort((a, b) => b[0] - a[0]).slice(0, 25).map(x => x[1]);
      if (await tick()) break;
    }
    let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let r = 0; r < (opts.restarts ?? 6); r++) {
      const t = optClone(empty), pick = (k, arr) => { for (let i = 0; i < 20; i++) { const id = arr[rnd(arr.length)]; if (!optDup(t, k, id)) { t.equip[k] = id; if (GS.includes(k)) { const os = optOres(id); t.ore[k] = os.includes(defOre(ITEMS[id])) ? defOre(ITEMS[id]) : os[0]; } return; } } };
      if (OPT_SLOTS.includes('armor') && top.armor && top.armor.length) pick('armor', top.armor);
      if (top.badge1 && top.badge1.length) ['badge1', 'badge2'].filter(k => OPT_SLOTS.includes(k)).forEach(k => pick(k, top.badge1));
      if (top.g1 && top.g1.length) ['g1', 'g2', 'g3', 'g4'].filter(k => OPT_SLOTS.includes(k)).forEach(k => pick(k, top.g1));
      if (OPT_SLOTS.includes('gs') && top.gs && top.gs.length) pick('gs', top.gs);
      starts.push(pinAll(t));
    }
    for (let i = 0; i < starts.length && !stop; i++) {
      const st0 = starts[i]; const [st, v] = await optClimb(st0, ev(st0), P, ev, tick);
      found.set(optKey(st), { st, v });
      if (opts.onStart) opts.onStart(i + 1, starts.length);
    }
    const list = [...found.values()].sort((a, b) => b.v - a.v).filter((x, i, A) => i === 0 || Math.round(x.v) !== Math.round(A[i - 1].v));
    return { best: list[0], alts: list.slice(1, 3), cur: curV, evals: ev.count(), stopped: stop, pools: P };
  } finally { restore(); optOreFix = {}; optChooseSlots = new Set(); }
}

// 찾은 빌드의 능력치와 적용 효과 (전역 장비를 잠시 바꿔 계산)
const OPT_ROWS = [[35, '속성 공격 (합)', 'sum'], [43, '공격 대미지 UP', 'list'], [36, 'HP 조건', 'list'], [40, '대상 상태이상', 'list'], [41, '인핸스', 'list'], [26, '약점', 'list'], [48, '겨누어 쏘기', 'list'], [37, '일반 공격', 'list'], [53, '성장', 'list'], [49, 'ZONE 각성', 'list'], [50, '특정 ZONE', 'list'], [56, 'ZONE', 'list'], [51, '천·명 아군', 'list'], [42, '쓰러진 아군', 'list'], [52, '하극상', 'list'], [55, '누계 승리', 'list'], [46, '크리 위력', 'list'], [19, 'MP %', 'list']];
function optDetail(st, s, wt) {
  const save = { equip: Object.assign({}, equip), ore: Object.assign({}, ore), bv: badgeVal };
  const bvById = {}; ['badge1', 'badge2'].forEach(k => { if (equip[k] && badgeVal[k] && badgeVal[k].length) bvById[equip[k]] = badgeVal[k]; });
  try {
    Object.assign(equip, st.equip); Object.assign(ore, st.ore); if (wt) baseWT = wt;
    badgeVal = { badge1: bvById[st.equip.badge1] || [], badge2: bvById[st.equip.badge2] || [] };
    const items = itemsWith(null, null, s);
    let s2 = s; if (s.kindAuto) { const w = items.find(it => it.slot === 'weapon'); const k = kindFor(s, w ? w.t : baseType()); if (k !== s.kind) s2 = Object.assign({}, s, { kind: k }); }
    const phys = PHYS.includes(s2.kind), b = buildInput(items, s2), r = evalBuild(items, s);
    const rows = OPT_ROWS.map(([n, label, how]) => { const v = (b.inp.rows[n] || []).filter(x => x !== null && x !== undefined); if (!v.length) return null; if (n === 50) {   // 특정 ZONE: 어느 진(ZONE)인지 함께 표시
        const zs = items.flatMap(it => (it.fx || []).filter(e => e.k === 'zonet')).map(e => interpret(e, s2, phys)).filter(c => c[1]).map(c => c[0]);
        return [label + ' (전개 중인 진)', zs.length ? zs.join(' · ') : v.map(x => pctTxt(x)).join(' · ')];
      }
      if (n === 52) { const lv = s2.tlv || 140; return [label, v.map(d => pctTxt(AECalc.rd(lv * lv / d, 2))).join(' · ')]; } return [label, how === 'sum' ? pctTxt(v.reduce((a, c) => a + c, 0)) : v.map(x => pctTxt(x)).join(' · ')]; }).filter(Boolean);
    // 칸별 효과 (✓ 적용 / ✕ 조건 안 맞음)
    const per = {};
    for (const k of OPT_ALL) {
      if (lockOf(k, s.fate)) continue;
      const id = st.equip[k]; if (!id) continue;
      let fx;
      if (GS.includes(k)) { const g = ITEMS[id]; let oid = st.ore[k]; if (oid === 'pot' && !g.canPot) oid = ''; fx = glasterEff(g, oid).fx.concat(oid && oid !== 'pot' && ORES[oid] && !g.noRef ? ORES[oid].fx : []); }
      else { let it = withWChoice(getItem(id, s), s2); if (k.startsWith('badge')) it = badgeWithVals(it, k); fx = it.fx || []; }
      per[k] = fx.map(e => interpret(e, s2, phys)).filter(c => c[0] !== '?').map(c => ({ t: c[0], ok: !!c[1] }));
    }
    return {
      kind: s2.kind, phys, atk: b.inp.D5, mag: b.inp.D6, str: b.inp.D7, int: b.inp.D8, spd: b.inp.D9, luck: b.inp.D10, mp: r.mp, crit: b.crit,
      n: r.n, c: r.c, exp: r.exp, rows, per,
    };
  } finally { Object.assign(equip, save.equip); Object.assign(ore, save.ore); badgeVal = save.bv; baseWT = null; }
}

// ── 내보내기: 표(2차원 배열) → 시트 붙여넣기용 TSV / CSV 파일 ──
let optDl = null, optExportOpen = false;
(async () => { try { if (window.claude && claude.use) optDl = await claude.use('downloads'); } catch (e) { optDl = null; } if (!$('optModal').hidden) renderOpt(); })();
function optTable(s) {
  const R = optRes, b = R.best, D = R.detail || (R.detail = optDetail(b.st, s, optWT));
  const mName = { exp: '기대 대미지', c: '크리티컬 대미지', n: '일반(비크리) 대미지' }[optMetric];
  return buildTable({ wt: optWT, title: 'AE 최적 빌드', basis: [OPT_METRIC[optMetric], mName, Math.round(b.v)], cond: optCondText(s), st: b.st, s, D });
}
const optTSV = T => T.map(r => r.map(c => String(c).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
const optCSV = T => '\ufeff' + T.map(r => r.map(c => { const v = String(c); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
async function optCopy(s) {
  const txt = optTSV(optTable(s)), msg = $('optExMsg');
  try { await navigator.clipboard.writeText(txt); msg.textContent = '복사했습니다. 엑셀·구글 시트에 붙여넣으면 표가 됩니다.'; return; } catch (e) {}
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove(); msg.textContent = ok ? '복사했습니다. 엑셀·구글 시트에 붙여넣으면 표가 됩니다.' : '복사가 막혀 있습니다. 아래 표를 길게 눌러(드래그해) 직접 복사해 주세요.';
}
async function optSaveCSV(s) {
  const msg = $('optExMsg'); if (!optDl) return;
  const w = ITEMS[optRes.best.st.equip.weapon];
  try { const r = await optDl.save({ filename: `AE_최적빌드_${optWT}_${(w ? w.n : '').replace(/[\\/:*?"<>|\s]+/g, '_')}.csv`, data: optCSV(optTable(s)) }); msg.textContent = r && r.status === 'delivered' ? '' : '저장했습니다.'; }
  catch (e) { const c = e && e.code; msg.textContent = c === 'declined' ? '저장을 취소했습니다.' : c === 'rate_limited' ? '잠시 후 다시 시도해 주세요.' : '저장하지 못했습니다' + (c ? ` [${c}]` : '') + '. "표 복사"를 써 주세요.'; if (['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(c)) { optDl = null; renderOpt(); } }
}

// 고정 장비 고르기: 검색 + 드롭다운이 합쳐진 칸 (콤보박스)
const optPinList = kind => kind === 'weapon' ? DATA.w.filter(w => w.t === optWT) : kind === 'armor' ? DATA.armor.filter(a => a.t === ARMOR_OF[optWT]) : kind === 'badge' ? DATA.badges
  : DATA.gl.filter(g => (kind === 'gs') === optSpecial(g) && (!g.wt || g.wt === optWT));
const optPinLabel = (kind, x) => kind === 'weapon' ? x.n : x.n + (x.wt ? ` <${x.wt}>` : '');
let optCbAct = -1;
function optCbOpen(inp) {
  const i = +inp.dataset.pc, p = optPins[i], box = document.getElementById('cbl' + i); if (!p || !box) return;
  const q = inp.value.trim(), cur = p.id && ITEMS[p.id] ? optPinLabel(p.kind, ITEMS[p.id]) : '';
  const noneOk = true, curL = p.id && ITEMS[p.id] ? cur : noneOk ? OPT_NONE : '';
  const L = optPinList(p.kind).filter(x => !q || q === curL || optPinLabel(p.kind, x).includes(q));
  const show = L.slice(0, 60), none = noneOk && (!q || q === curL || OPT_NONE.includes(q)) ? `<div class="cbo${!p.id ? ' on' : ''}" role="option" id="cbo${i}_n" data-pv="" data-pi="${i}" aria-selected="${!p.id}">${OPT_NONE} <span class="hint">(이 부위 칸 하나를 비워 둠)</span></div>` : '';
  box.innerHTML = none + (show.length ? show.map((x, j) => `<div class="cbo${x.id === p.id ? ' on' : ''}" role="option" id="cbo${i}_${j}" data-pv="${esc(x.id)}" data-pi="${i}" aria-selected="${x.id === p.id}">${esc(optPinLabel(p.kind, x))}</div>`).join('') + (L.length > show.length ? `<div class="cbo-more">${L.length - show.length}개 더 — 이름을 더 입력하세요</div>` : '')
    : none ? '' : '<div class="cbo-more">맞는 장비가 없습니다</div>');
  box.hidden = false; inp.setAttribute('aria-expanded', 'true'); optCbAct = -1;
}
const OPT_NONE = '미장착';
const optPinVal = p => p.id && ITEMS[p.id] ? optPinLabel(p.kind, ITEMS[p.id]) : OPT_NONE;
function optCbClose(inp) { const box = document.getElementById('cbl' + inp.dataset.pc); if (box) box.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); }
function optCbPick(i, id) {
  const p = optPins[i]; if (!p) return; p.id = id; const it = ITEMS[id];
  p.ore = it && (p.kind === 'gl' || p.kind === 'gs') ? (optOres(id).includes(defOre(it)) ? defOre(it) : optOres(id)[0]) : '';
  optSavePin(); optRes = null; renderOpt();
}

// ── 화면 ──
function optCondText(s) {
  const on = [['tPain', '대상 페인'], ['tPoison', '대상 독'], ['sPoison', '자신 독'], ['sPain', '자신 페인'], ['sSeal', '자신 봉인'], ['sTaunt', '자신 도발'], ['normalAtk', '일반 공격'], ['eHeat', '가열 환경'], ['eSpecial', '특수 환경'], ['eWeather', '날씨 환경'], ['eGround', '지표 환경'], ['eAir', '대기 환경'], ['bMulti', '다단 강화']].filter(([k]) => s[k]).map(x => x[1]).concat(s.skMul > 0 && s.skMul !== 1 ? [`스킬 위력 ×${s.skMul}`] : []);
  const pm = s.pMode === 'pick' ? `P글래 ${pgl.length}개 장착` : s.pMode === 'direct' && (s.pDmg || s.pElem) ? `P글래 직접 입력 (대미지 ${s.pDmg || 0}%, 속성 ${s.pElem || 0}%)` : 'P글래 없음';
  return [
    `무기 종류 ${optWT}${optNoW() ? ' (미장착)' : ''}`, Object.keys(optPinPlan(s).map).length ? `고정 ${Object.keys(optPinPlan(s).map).length}칸` : '', (lockOf('badge2', s.fate) || lockOf('g4', s.fate)) ? `천명 ${s.fate}: ${[lockOf('badge2', s.fate) ? '배지 2' : '', lockOf('g4', s.fate) ? '글래스터 4' : ''].filter(Boolean).join('·')} 잠김` : `천명 ${s.fate}`, `${s.elem} · ${atkTypeOf(s) || '-'} · ${s.range}`, `상성 ${s.aff}`, s.aff === '약점' && s.bWeak ? `약점 배율 +${s.bWeak}%` : '', lunatic.length ? '루나틱 ' + lunatic.map(x => x.t).join('·') : '', s.bFinal > 0 && s.bFinal !== 1 ? `최종 ×${s.bFinal}` : '', s.af ? 'AF 중' : 'AF 아님', `HP ${s.hpPct}%`,
    `존 ${s.zoneT ? (s.zone ? '극 ' : '') + s.zoneT : '없음'}`, `솔선 ${solOn() ? '켬' : '끔'}`, pm, `${s.turns}턴째`,
    `보스 Lv ${s.tlv || 140}`, s.enemies > 1 ? `적 ${s.enemies}명` : '', s.fallen ? `쓰러진 아군 ${s.fallen}` : '', ...on,
  ].filter(Boolean);
}
function optSlotLabel(k) { return (SLOTS.find(x => x[0] === k) || [k, k])[1]; }
function renderOpt() {
  const s = optS(), box = $('optBody');
  if (!optWT) optWT = equip.weapon && ITEMS[equip.weapon] ? ITEMS[equip.weapon].t : (OPT_WT.includes(curType) ? curType : '검');
  if (optPinWeapon()) optWT = optPinWeapon().t;
  let h = `<label class="f opt-wt">무기 종류 ${optPinWeapon() ? '(고정한 무기의 종류)' : optNoW() ? '(무기는 미장착, 장비·조건은 이 종류 기준)' : '(이 종류 안에서 무기도 고릅니다)'}<select id="optWT"${optCtl || optPinWeapon() ? ' disabled' : ''}>${OPT_WT.map(w => `<option${w === optWT ? ' selected' : ''}>${w}</option>`).join('')}</select></label>`;
  h += `<label class="f opt-wt">크리티컬<select id="optMetric"${optCtl ? ' disabled' : ''}>${Object.entries(OPT_METRIC).map(([k, v]) => `<option value="${k}"${k === optMetric ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`;
  h += `<div class="opt-cond"><b>이 조건으로 찾습니다</b> <span class="hint">(조건은 왼쪽 설정에서 바꾸세요)</span><div>${optCondText(s).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>`;
  { // 고정할 장비: 줄마다 종류 · 장비 · (글래스터면) 연성
    const plan = optPinPlan(s), opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(l)}</option>`;
    const listOf = optPinList;
    h += `<div class="opt-pin"><div class="opt-pin-h"><b>고정할 장비</b> <span class="hint">${optPins.length ? '고정한 칸은 바꾸지 않고 나머지만 찾습니다' : '없음 — "+ 고정 추가"나 결과의 📌로 고정하세요'}</span></div>`;
    h += optPins.map((p, i) => {
      const L = listOf(p.kind), it = p.id ? getItem(p.id, s) : null, why = plan.why[i];
      const ores = (p.kind === 'gl' || p.kind === 'gs') && it ? `<select data-po="${i}" aria-label="연성">${optOres(p.id).map(o => opt(o, oreName(it, o), o === (p.ore || ''))).join('')}</select>` : '';
      return `<div class="pinrow${why ? ' bad' : ''}${!p.id ? ' none' : ''}"><span class="pin-n">📌 ${i + 1}</span><select data-pk="${i}" aria-label="종류">${Object.entries(PIN_KIND).map(([k, v]) => opt(k, v, k === p.kind)).join('')}</select>`
        + `<span class="cbx"><input type="text" data-pc="${i}" value="${esc(optPinVal(p))}" placeholder="장비 이름 검색 · 눌러서 목록" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cbl${i}" aria-label="고정할 장비" autocomplete="off"><span class="cbx-arr" aria-hidden="true">▾</span><div class="cbl" id="cbl${i}" role="listbox" hidden></div></span>${ores}`
        + `${why ? `<span class="hint bad">${esc(why)}${p.id ? ' · 계산 제외' : ''}</span>` : plan.note[i] ? `<span class="hint">${esc(plan.note[i])}</span>` : ''}<button class="lx" type="button" data-pdel="${i}" aria-label="고정 ${i + 1} 삭제">×</button></div>`;
    }).join('');
    h += `<div class="shot-act"><button class="btn" type="button" id="optPinAdd">+ 고정 추가</button>${OPT_ALL.some(k => equip[k]) ? '<button class="btn" type="button" id="optPinAll">지금 장비 전부 고정</button>' : ''}${optPins.length ? '<button class="btn" type="button" id="optPinClear">고정 모두 풀기</button>' : ''}</div></div>`;
  }
  if (optExcl.size) h += `<div class="opt-excl"><b>미보유 장비</b> <span class="hint">(빌드 후보에서 빠짐)</span> ${[...optExcl].map(id => `<span class="tag">${esc(optName(id))} <button class="lx" type="button" data-oinc="${esc(id)}" aria-label="${esc(optName(id))} 보유로 바꾸기">×</button></span>`).join('')} <button class="btn" type="button" id="optExclClear" style="padding:1px 8px">모두 되돌리기</button></div>`;
  h += `<div class="shot-act"><button class="btn solid" type="button" id="optGo"${optCtl ? ' disabled' : ''}>${optCtl ? '찾는 중…' : optRes ? '다시 찾기' : '찾기'}</button>${optCtl ? '<button class="btn" type="button" id="optStop">중지</button>' : ''}<span class="hint" id="optMsg"></span></div>`;
  if (optRes && optRes.best) {
    const R = optRes, b = R.best, d = b.v - R.cur;
    const D = R.detail || (R.detail = optDetail(b.st, s, optWT));
    h += `<div class="opt-sum"><span class="k">찾은 빌드 ${optMetric === 'exp' ? '기대 대미지' : optMetric === 'c' ? '크리티컬 대미지' : '일반(비크리) 대미지'}</span> <b class="v">${fmt(b.v)}</b> ${R.cur ? '' : '<span class="hint">(지금 무기가 없어 비교 없음)</span>'}<span class="${d > 0 ? 'up' : d < 0 ? 'down' : 'zero'}"${R.cur ? '' : ' hidden'}>지금 대비 ${d >= 0 ? '+' : ''}${fmt(d)} (${R.cur ? (d / R.cur * 100 >= 0 ? '+' : '') + (d / R.cur * 100).toFixed(1) : '-'}%)</span>${R.stopped ? ' <span class="hint">(중지해서 끝까지 찾지 못함)</span>' : ''}</div>`;
    h += `<table class="shot-tb opt-tb"><thead><tr><th>칸</th><th>장비</th><th>지금</th><th></th></tr></thead><tbody>${((PMr) => OPT_ALL.map(k => {
      if (lockOf(k, s.fate)) return `<tr><td>${esc(optSlotLabel(k))}</td><td class="hint" colspan="3">🔒 잠김 (천명 ${lockOf(k, s.fate)} 이상 필요)</td></tr>`;
      const id = b.st.equip[k], it = id ? getItem(id, s) : null, same = id === (equip[k] || null) && (!GS.includes(k) || (b.st.ore[k] || '') === (ore[k] || ''));
      const o = (GS.includes(k) && it ? `<div class="hint">연성: ${esc(oreName(it, b.st.ore[k] || ''))}</div>` : '')
        + (D && D.per[k] && D.per[k].length ? `<div class="opt-fx">${D.per[k].map(c => `<span class="${c.ok ? 'ok' : 'no'}">${c.ok ? '' : '✕ '}${esc(c.t)}</span>`).join('')}</div>` : '');
      const now = equip[k] ? esc(getItem(equip[k], s) ? getItem(equip[k], s).n : '') : '<span class="hint">비어 있음</span>';
      return `<tr${same ? '' : ' class="chg"'}><td>${esc(optSlotLabel(k))}</td><td>${PMr.map[k] ? '<span class="tag pinned">📌 고정</span> ' : Object.values(PMr.choose).some(c => c.slots.includes(k)) ? '<span class="tag pinned">📌 고정 후보 중 선택</span> ' : ''}${it ? esc(it.n) : '<span class="hint">비움</span>'}${o}</td><td class="hint">${now}</td><td>${id ? `<button class="lx${optPinned(k, id) ? ' on' : ''}" type="button" data-opin="${k}" title="${optPinned(k, id) ? '고정 풀기' : '이 장비 고정'}" aria-label="${esc(it ? it.n : id)} ${optPinned(k, id) ? '고정 풀기' : '고정'}" aria-pressed="${!!(optPinned(k, id))}">📌</button>` : ''}${id && !(optPinned(k, id)) ? `<button class="lx" type="button" data-oex="${esc(id)}" title="미보유로 표시하고 다시 찾기" aria-label="${esc(it ? it.n : id)} 미보유로 표시">×</button>` : ''}</td></tr>`;
    }).join(''))(optPinPlan(s))}</tbody></table>`;
    h += `<div class="opt-stat"><b>빌드 능력치</b> <span class="hint">(${esc(D.kind)} · 장비 포함)</span><div class="opt-grid">${[
      ['공격', D.atk], ['마력', D.mag], ['힘', D.str], ['지능', D.int], ['속도', D.spd], ['행운', D.luck], ['최대 MP', D.mp], [D.phys ? '크리율' : '마법 크리율', +D.crit.toFixed(2) + '%'],
      ['일반', fmt(D.n)], ['크리티컬', fmt(D.c)], ['기대값', fmt(D.exp)],
    ].map(([k, v]) => `<span><i>${k}</i>${typeof v === 'number' ? fmt(v) : v}</span>`).join('')}</div>`
      + (D.rows.length ? `<div class="opt-rows">${D.rows.map(([k, v]) => `<span><i>${esc(k)}</i>${esc(v)}</span>`).join('')}</div>` : '')
      + `<div class="hint">장비 칸의 회색 ✕ 효과는 지금 조건에서 발동하지 않는 효과입니다. 중복 불가 효과는 가장 큰 것 하나만 계산됩니다.</div></div>`;
    h += `<div class="shot-act"><button class="btn solid" type="button" id="optApply">이 빌드 장착</button><button class="btn" type="button" id="optExport" aria-expanded="${optExportOpen}">${optExportOpen ? '내보내기 닫기' : '표로 내보내기'}</button><span class="hint">× = 갖고 있지 않은 장비를 미보유로 표시하고 다시 찾기</span></div>`;
    if (optExportOpen) {
      const T = optTable(s);
      h += `<div class="opt-ex"><div class="shot-act"><button class="btn solid" type="button" id="optCopy">표 복사 (시트에 붙여넣기)</button>${optDl ? '<button class="btn" type="button" id="optCSV">CSV 파일 저장</button>' : ''}<span class="hint" id="optExMsg"></span></div>
        <div class="opt-ex-wrap"><table class="shot-tb opt-ex-tb"><tbody>${btRowsHtml(T)}</tbody></table></div></div>`;
    }
    if (R.alts.length) h += `<div class="hint">다른 출발점에서 찾은 차선 빌드: ${R.alts.map(a => fmt(a.v)).join(' · ')}</div>`;
    h += `<div class="hint">후보 수: 무기 ${R.pools.weapon.length} · 방어구 ${R.pools.armor.length} · 배지 ${R.pools.badge.length} · 글래스터 ${R.pools.gl.length} · 전용 ${R.pools.gs.length} · 계산 ${R.evals.toLocaleString('ko-KR')}회. 칸마다 가장 좋은 장비로 바꾸기를 더 안 바뀔 때까지 반복하고, 출발점을 여러 개로 잡아 가장 좋은 결과를 고릅니다.</div>`;
  } else if (optRes) h += `<p class="hint">후보가 없습니다.</p>`;
  box.innerHTML = h;
}
async function optGo() {
  if (optCtl) return;
  optCtl = new AbortController(); optRes = null; renderOpt();
  const s = optS();
  try {
    optRes = await optSearch(s, { signal: optCtl.signal, onTick: n => { const m = $('optMsg'); if (m) m.textContent = `계산 ${n.toLocaleString('ko-KR')}회…`; } });
  } finally { optCtl = null; renderOpt(); }
}
function optApply() {
  const b = optRes && optRes.best; if (!b) return;
  const bvById = {}; ['badge1', 'badge2'].forEach(k => { if (equip[k] && badgeVal[k] && badgeVal[k].length) bvById[equip[k]] = badgeVal[k]; });
  OPT_ALL.forEach(k => { if (lockOf(k, S().fate)) return; equip[k] = b.st.equip[k] || null; if (GS.includes(k)) ore[k] = b.st.ore[k] || ''; });
  curType = equip.weapon ? ITEMS[equip.weapon].t : optWT;   // 무기 미장착이면 고른 종류 탭으로
  badgeVal = { badge1: bvById[equip.badge1] || [], badge2: bvById[equip.badge2] || [] };
  optRes = null; closeOpt(); render();
}
function openOpt() { optLastFocus = document.activeElement; $('optModal').hidden = false; renderOpt(); $('optClose').focus(); }
function closeOpt() { if (optCtl) optCtl.abort(); $('optModal').hidden = true; if (optLastFocus) optLastFocus.focus(); }
$('optOpen').onclick = openOpt;
$('optClose').onclick = closeOpt;
$('optModal').addEventListener('click', e => {
  const t = e.target;
  if (t === $('optModal')) closeOpt();
  else if (t.id === 'optGo') optGo();
  else if (t.id === 'optStop') { if (optCtl) optCtl.abort(); }
  else if (t.id === 'optApply') optApply();
  else if (t.id === 'optExport') { optExportOpen = !optExportOpen; renderOpt(); }
  else if (t.id === 'optCopy') optCopy(optS());
  else if (t.id === 'optCSV') optSaveCSV(optS());
  else if (t.closest('[data-opin]')) { const k = t.closest('[data-opin]').dataset.opin, b = optRes && optRes.best; if (!b) return; const id = b.st.equip[k];
    const i = optPins.findIndex(p => p.kind === slotKind(k) && p.id === id);
    if (i >= 0) optPins.splice(i, 1); else optPins.push({ kind: slotKind(k), id, ore: GS.includes(k) ? (b.st.ore[k] || '') : '' });
    optSavePin(); renderOpt(); }
  else if (t.closest('[data-pdel]')) { optPins.splice(+t.closest('[data-pdel]').dataset.pdel, 1); optSavePin(); optRes = null; renderOpt(); }
  else if (t.id === 'optPinAdd') {
    const s = S(), cnt = k => optPins.filter(p => p.kind === k).length, room = k => PIN_SLOTS[k].filter(x => !lockOf(x, s.fate)).length;
    const kind = ['gl', 'badge', 'gs', 'armor', 'weapon'].find(k => cnt(k) < room(k)) || 'gl';
    optPins.push({ kind, id: '', ore: '' }); optSavePin(); renderOpt();
    const sel = document.querySelector(`[data-pc="${optPins.length - 1}"]`); if (sel) sel.focus();
  }
  else if (t.id === 'optPinAll') { const s = S(); OPT_ALL.forEach(k => { if (equip[k] && !lockOf(k, s.fate) && !optPinned(k, equip[k])) optPins.push({ kind: slotKind(k), id: equip[k], ore: GS.includes(k) ? (ore[k] || '') : '' }); }); optSavePin(); optRes = null; renderOpt(); }
  else if (t.id === 'optPinClear') { optPins = []; optSavePin(); optRes = null; renderOpt(); }
  else if (t.id === 'optExclClear') { optExcl.clear(); optSaveExcl(); renderOpt(); }
  else if (t.closest('[data-oex]')) { optExcl.add(t.closest('[data-oex]').dataset.oex); optSaveExcl(); optGo(); }
  else if (t.closest('[data-oinc]')) { optExcl.delete(t.closest('[data-oinc]').dataset.oinc); optSaveExcl(); renderOpt(); }
});
$('optModal').addEventListener('input', e => { if (e.target.dataset && e.target.dataset.pc !== undefined) optCbOpen(e.target); });
$('optModal').addEventListener('focusin', e => { if (e.target.dataset && e.target.dataset.pc !== undefined) { e.target.select(); optCbOpen(e.target); } });
$('optModal').addEventListener('focusout', e => {
  const inp = e.target; if (!(inp.dataset && inp.dataset.pc !== undefined)) return;
  setTimeout(() => { if (document.activeElement === inp) return; optCbClose(inp); const p = optPins[+inp.dataset.pc]; inp.value = p ? optPinVal(p) : ''; }, 150);
});
$('optModal').addEventListener('mousedown', e => { const o = e.target.closest('[data-pv]'); if (o) { e.preventDefault(); optCbPick(+o.dataset.pi, o.dataset.pv); } });
$('optModal').addEventListener('keydown', e => {
  const inp = e.target; if (!(inp.dataset && inp.dataset.pc !== undefined)) return;
  const box = document.getElementById('cbl' + inp.dataset.pc); if (!box) return;
  const opts = [...box.querySelectorAll('[data-pv]')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (box.hidden) optCbOpen(inp);
    const os = [...box.querySelectorAll('[data-pv]')]; if (!os.length) return;
    optCbAct = Math.max(0, Math.min(os.length - 1, optCbAct + (e.key === 'ArrowDown' ? 1 : -1)));
    os.forEach((o, j) => o.classList.toggle('act', j === optCbAct)); os[optCbAct].scrollIntoView({ block: 'nearest' }); inp.setAttribute('aria-activedescendant', os[optCbAct].id);
  } else if (e.key === 'Enter') {
    e.preventDefault(); const o = opts[optCbAct >= 0 ? optCbAct : 0]; if (o && !box.hidden) optCbPick(+inp.dataset.pc, o.dataset.pv);
  } else if (e.key === 'Escape' && !box.hidden) { e.preventDefault(); e.stopPropagation(); optCbClose(inp); }
});
$('optModal').addEventListener('change', e => {
  const d = e.target.dataset || {};
  if (d.pk !== undefined) { const p = optPins[+d.pk]; p.kind = e.target.value; p.id = ''; p.ore = ''; optSavePin(); optRes = null; renderOpt(); return; }
  if (d.po !== undefined) { optPins[+d.po].ore = e.target.value; optSavePin(); optRes = null; renderOpt(); return; }
});
$('optModal').addEventListener('change', e => { if (e.target.id === 'optWT') { optWT = e.target.value; optRes = null; renderOpt(); }
  else if (e.target.id === 'optAF') { optAF = e.target.value; try { localStorage.setItem('ae-opt-af', optAF); } catch (x) {} optRes = null; renderOpt(); }
  else if (e.target.id === 'optMetric') { optMetric = e.target.value; try { localStorage.setItem('ae-opt-metric', optMetric); } catch (x) {} optRes = null; renderOpt(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('optModal').hidden) { e.preventDefault(); closeOpt(); } });
