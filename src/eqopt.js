/* ===== 장비 최적화 (화면 없는 버전) =====
   "어나더에덴 빌더"의 장비 효과 해석·계산기 입력·최적 빌드 탐색을 옮긴 것.
   계산 공식·장비 데이터 출처: 딩 (AE 대미지 계산기 v4.016 · 장비 정리 시트)
   AECalc(vendor/ae-builder/ae-engine.js)가 먼저 로드돼 있어야 한다. */
(function (root) {
'use strict';
const AEC = () => root.AECalc;

const TYPES = ['지팡이', '검', '도', '도끼', '창', '활', '권갑', '망치'];
const ARMOR_OF = { '지팡이': '반지', '검': '팔찌', '도': '반지', '도끼': '목걸이', '창': '팔찌', '활': '반지', '권갑': '목걸이', '망치': '팔찌' };
const PHYS = ['물리공격', '지능기반 물리', '속도기반 물리'];
const GS = ['g1', 'g2', 'g3', 'g4', 'gs'];
const SLOTS = [['weapon', '무기'], ['armor', '방어구'], ['badge1', '배지 1'], ['badge2', '배지 2'], ['g1', '글래스터 1'], ['g2', '글래스터 2'], ['g3', '글래스터 3'], ['g4', '글래스터 4'], ['gs', '전용 글래스터']];
const OPT_ALL = SLOTS.map(x => x[0]);
const SLOT_LOCK = { badge2: 120, g4: 200 };
const lockOf = (k, fate) => SLOT_LOCK[k] && (+fate || 0) < SLOT_LOCK[k] ? SLOT_LOCK[k] : 0;
const ZONE_AWK = ['열화진', '수천진', '지열진', '풍왕진', '초뢰진', '각음진', '휘정진', '황참진', '순돌진', '굉타진', '환마진', '쌍격진 참돌', '쌍격진 참마', '월광진']; // 극·쌍격진 참마·극·월광진도 있음(game-info ZONE 1-2-12·13, 2026-10-19 — 딩 코어 목록엔 없음)
const KIND_OF = { '물리': { '힘': '물리공격', '지능': '지능기반 물리', '속도': '속도기반 물리' }, '마법': { '지능': '마법공격', '힘': '힘기반 마법', '속도': '속도기반 마법' } };
const clsOfWeapon = wt => wt === '지팡이' ? '마법' : '물리';
const baseOfWeapon = wt => wt === '지팡이' ? '지능' : '힘';
const kindOf = (cls, base) => KIND_OF[cls][base] || KIND_OF[cls][cls === '마법' ? '지능' : '힘'];
const STATN = { str: '힘', int: '지능', spd: '속도', luck: '행운', mp: 'MP', end: '내구', spr: '정신' };
const ENV = { '가열': 'eHeat', '특수': 'eSpecial', '날씨': 'eWeather', '지표': 'eGround', '대기': 'eAir' };
const SELF = { '독': 'sPoison', '페인': 'sPain', '봉인': 'sSeal', '도발': 'sTaunt' };
const UNIQUE = { aim: 1, weak: 1, mpatk: 1, enemies: 1, enh: 1 };
const MULTI_UP = { 1: 0, 2: 25, 3: 50, 4: 100, 5: 200 };
const BADGE_STAT_WORD = { '힘': 'str', '지능': 'int', '속도': 'spd', '행운': 'luck', 'MP': 'mp', '내구': 'end', '정신': 'spr', 'HP': 'hp' };
const DMG_STATS = ['str', 'int', 'spd', 'luck', 'mp'];
const SOL_STAT = s => s === 'end' || s === 'spr';

/* 빌더 화면 기본값 (template.html) */
const DEFAULT_S = {
  str: 237, int: 162, spd: 249, luck: 150, mp: 512, fate: 255, atkAdj: 0, magAdj: 0, who: '',
  atkCls: '', elem: '불', range: '전체', normalAtk: false, power: 60, hits: 1, kind: '', atkType: '',
  tlv: 140, aff: '통상', tdef: 174, tmdef: 174, tPoison: false, tPain: false, hpPct: 100, afGauge: 0,
  zoneT: '', zoneAb: 0, af: false, zone: false, wins: true, sPoison: false, sPain: false, sSeal: false, sTaunt: false,
  eHeat: false, eSpecial: false, eWeather: false, eGround: false, eAir: false, turns: 10, enemies: 1,
  fateAllies: 0, meiAllies: 0, skMul: 1, fallen: 0, pMode: 'direct', pDmg: 0, pElem: 0, pAddDmg: 0, pAddElem: 0,
  cu1: false, cu2: false, mpFix: 0, mpPct: 0, bStr: 0, bInt: 0, bSpd: 0, bWield: 0, bElemNE: 0, hoshi: 0, bGeko: 0,
  bMulti: false, bDef: 0, bMdef: 0, bRes: 0, bERes: 0, bCrit: 0, bMcrit: 0, bCpow: 0, bMcpow: 0, bCombo: 100,
  gStr: 0, gInt: 0, gSpd: 0, bWeak: 0, bFinal: 1
};
function makeS(o) {
  const s = Object.assign({}, DEFAULT_S, o || {});
  s.cu1v = 0.23; s.cu2v = 0.16;
  s.kindBase = s.kind; s.clsSel = s.atkCls; s.kindAuto = !s.atkCls || !s.kindBase;
  if (!ZONE_AWK.includes(s.zoneT)) s.zone = false;
  return s;
}

let DATA = null, ITEMS = {}, ORES = {}, BYNAME = {}, ready = false;
function init(data) {
  DATA = { w: data.weapons || data.w, armor: data.armor, badges: data.badges, gl: data.glasters || data.gl, ores: data.ores };
  ITEMS = {}; BYNAME = {};
  DATA.w.forEach((x, i) => { x.id = x.id || 'w' + i; x.slot = 'weapon'; ITEMS[x.id] = x; });
  DATA.armor.forEach((x, i) => { x.id = x.id || 'a' + i; x.slot = 'armor'; ITEMS[x.id] = x; });
  DATA.badges.forEach((x, i) => { x.id = x.id || 'b' + i; x.slot = 'badge'; ITEMS[x.id] = x; });
  DATA.gl.forEach((x, i) => { x.id = x.id || 'g' + i; x.slot = 'glaster'; ITEMS[x.id] = x; });
  ORES = { '': { id: '', n: '각성', fx: [] }, pot: { id: 'pot', n: '각성 + 잠재 연성 (잠재 광석)', fx: [] } };
  DATA.ores.forEach((x, i) => { if (x.n === '잠재 광석') return; x.id = x.id || 'o' + i; ORES[x.id] = x; });
  uOre = {}; const uv = {}; for (const o of Object.values(ORES)) for (const e of (o.fx || [])) if (UNIQUE[e.k] && o.id && o.id !== 'pot' && (+e.v || +e.per || 0) > (uv[e.k] || 0)) { uv[e.k] = +e.v || +e.per || 0; uOre[e.k] = o.id; }
  for (const id in ITEMS) { const x = ITEMS[id]; (BYNAME[x.n] = BYNAME[x.n] || []).push(id); }
  ready = true;
}

const fv = (v, s) => Array.isArray(v) ? v[0] + v[1] * s.fate / v[2] : v;
function interpret(e, s, phys) {
  const elemOk = e.e === 'all' ? s.elem !== '무속성' : e.e === 'none' ? s.elem === '무속성' : e.e === s.elem;
  const envOk = !e.env || s[ENV[e.env]];
  let ok;
  switch (e.k) {
    case 'stat': ok = !SOL_STAT(e.s); break;
    case 'crit': case 'cpow': ok = phys; break;
    case 'mcrit': case 'mcpow': ok = !phys; break;
    case 'elem': ok = elemOk; break;
    case 'hp': ok = e.cond === 'hpmax' ? s.hpPct >= 100 : s.hpPct <= (e.th || 50); break;
    case 'growth': ok = s.turns > 0; break;
    case 'tstat': ok = e.cond === 't_pain' ? s.tPain : s.tPoison; break;
    case 'aim': ok = !s.af; break;
    case 'enemies': ok = s.enemies > 1; break;
    case 'gekoku': case 'mpatk': case 'mppct': ok = true; break;
    case 'zone': ok = s.zone; break;
    case 'zonet': { const geuk = e.z.startsWith('극 '), base = geuk ? e.z.slice(2) : e.z; ok = s.zoneT === base && (!geuk || s.zone); break; }
    case 'weak': ok = s.aff === '약점'; break;
    case 'wins': ok = s.wins; break;
    case 'fateally': ok = (e.who === '명' ? s.meiAllies : s.fateAllies) > 0; break;
    case 'enh': ok = !!s[SELF[e.cond.replace('self_', '')]]; break;
    case 'normal': ok = s.normalAtk; break;
    case 'fallen': ok = s.fallen > 0; break;
    default: ok = false;
  }
  return ok && envOk;
}
const WT_ATK = { '검': '베기', '도': '베기', '도끼': '베기', '창': '찌르기', '활': '찌르기', '권갑': '타격', '망치': '타격', '지팡이': '마법' };
const physTypeOf = wt => wt === '지팡이' ? '베기' : WT_ATK[wt] || '';
const atkTypeOf = (s, wt) => (s.clsSel || clsOfWeapon(wt)) === '마법' ? '마법' : ((s.atkType !== '마법' && s.atkType) || physTypeOf(wt));
function zoneEffect(s, wt) {
  const z = s.zoneT, el = s.elem, k = !!s.zone && ZONE_AWK.includes(z), t = atkTypeOf(s, wt), none = el === '무속성';
  const E4 = { '열화진': ['불', '바람'], '수천진': ['물', '불'], '지열진': ['땅', '물'], '풍왕진': ['바람', '땅'] };
  const TY = { '황참진': '베기', '순돌진': '찌르기', '굉타진': '타격', '환마진': '마법' };
  const SKY = ['불', '물', '땅', '바람'], MEI = ['번개', '그림자', '결정'];
  if (!z) return 0;
  if (E4[z]) { const [up, dn] = E4[z]; return el === up ? (k ? 100 : 50) : el === dn ? -50 : 0; }
  if (z === '초뢰진') return el === '번개' ? (k ? 60 : 30) : el === '그림자' ? -30 : 0;
  if (z === '각음진') { if (none) return 0; const res = s.aff === '저항'; return el === '그림자' ? (res ? (k ? 200 : 100) : (k ? 100 : 50)) : (res ? (k ? 90 : 60) : 30); }
  if (z === '휘정진') { if (none) return 0; const wk = s.aff === '약점'; return el === '결정' ? (wk ? (k ? 220 : 110) : (k ? 60 : 30)) : (wk ? (k ? 130 : 50) : -30); }
  if (TY[z]) return !t ? 0 : t === TY[z] ? (k ? 60 : 30) : (k ? -60 : -30);
  if (z === '쌍격진 참돌') return !t ? 0 : ['베기', '찌르기'].includes(t) ? (k ? 60 : 30) : -30;
  if (z === '쌍격진 참마') return !t ? 0 : ['베기', '마법'].includes(t) ? (k ? 60 : 30) : -30; // 극 +60(사용자 확인 2026-10-19 — 딩 코어는 극이어도 +30)
  if (z === '섬격진') return 30;
  if (z === '월광진') return MEI.includes(el) ? (k ? 60 : 30) : SKY.includes(el) ? -30 : 0; // 극 +60(사용자 확인 2026-10-19)
  if (z === '견수진') return -50;
  if (z === '성해진') return s.afGauge >= 100 ? 100 : 0;
  return 0;
}
function buildInput(items, s, wt) {
  const phys = PHYS.includes(s.kind);
  const st = { str: s.str, int: s.int, spd: s.spd, luck: s.luck, mp: s.mp };
  const rows = {}; const push = (r, v) => { (rows[r] = rows[r] || []).push(v); };
  let crit = phys ? s.bCrit : s.bMcrit; const cpow = [], elemE = [], uniq = {};
  // 스킬로 이미 받는 중복 불가 효과(MP消費攻撃·약점 대미지 강화 등, s.uSk): 장비·광석의 같은 효과는 더 클 때만 (사용자 확인 2026-10-16: 같은 옵은 스킬이든 배지든 중복 안 됨)
  if (s.uSk) for (const k in s.uSk) { const v = +s.uSk[k] || 0; if (v <= 0) continue; if (k === 'aim' && s.af) continue; if (k === 'weak' && s.aff !== '약점') continue; uniq[k] = { k, v, sk: true }; }
  let atk = 0, mag = 0;
  for (const it of items) {
    if (it.slot === 'weapon') { atk = it.atk || 0; mag = it.mag || 0; }
    for (const e of it.fx) {
      if (!interpret(e, s, phys)) continue;
      if (UNIQUE[e.k]) { const key = e.k === 'enh' ? e.cond : e.k; const v = e.k === 'enemies' ? e.per * (s.enemies - 1) : e.v; if (!uniq[key] || v > uniq[key].v) uniq[key] = { k: e.k, v }; continue; }
      switch (e.k) {
        case 'stat': if (st[e.s] !== undefined) st[e.s] += Math.floor(fv(e.v, s)); break;
        case 'crit': case 'mcrit': crit += e.v; break;
        case 'cpow': case 'mcpow': cpow.push(e.v); break;
        case 'elem': elemE.push(fv(e.v, s)); break;
        case 'hp': push(36, e.v); break;
        case 'normal': push(37, e.v); break;
        case 'tstat': push(40, e.v); break;
        case 'fallen': push(42, Math.min(e.per * s.fallen, e.max)); break;
        case 'zone': push(49, e.v); break;
        case 'zonet': push(e.z.startsWith('극 ') ? 49 : 50, e.v); break;   // 빌더 코어: '극 ○○진 전개 시'는 ZONE 각성 상태라 49행(ZONE 각성 중 대미지와 합), 그 외 특정 ZONE은 50행
        case 'fateally': push(51, e.per * (e.who === '명' ? s.meiAllies : s.fateAllies)); break;
        case 'gekoku': push(52, e.d); break;
        case 'growth': push(53, Math.min(e.per * s.turns, e.max)); break;
        case 'wins': push(55, e.v); break;
        case 'mppct': push(19, e.v); break;
      }
    }
  }
  if (phys) crit += st.luck / 16;
  if (!['회복', '치유'].includes(s.kind)) { const z = zoneEffect(s, wt); if (z) push(56, z); }
  if (s.zoneT && s.zoneAb) push(56, s.zoneAb);
  for (const key in uniq) { const u = uniq[key]; if (u.k === 'enh') push(41, u.v); else if (u.k === 'mpatk' || u.k === 'enemies') push(43, u.v); }
  if (s.pDmg) push(43, s.pDmg);
  if (s.pElem) elemE.push(s.pElem);
  const skUp = s.skMul > 0 ? Math.round((s.skMul - 1) * 1e8) / 1e6 : 0; if (skUp) push(25, skUp);
  const one = v => [v, null, null, null];
  const R = {}; for (const r in rows) R[r] = rows[r].slice();
  if (R[52]) R[52] = R[52].slice(0, 2);
  if (R[55]) R[55] = one(Math.max(...R[55]));
  // 약점 대미지 강화(포박의 공격·시련 광석 등, 중복 불가 → 최대값 하나): 약점 배율(26행)에 더하지 않고 대미지에 바로 곱함 (사용자 확인값)
  if (uniq.weak) R[43] = (R[43] || []).concat([uniq.weak.v]);
  if (uniq.aim) R[48] = one(uniq.aim.v);
  if (elemE.length) R[35] = elemE.slice();
  const cpX = phys ? s.bCpow : s.bMcpow; const cp = cpow.concat(cpX ? [cpX] : []); if (cp.length) R[46] = cp;
  [[20, s.bStr], [21, s.bInt], [22, s.bSpd], [23, s.bDef], [24, s.bMdef], [27, s.bRes], [28, s.bERes], [29, s.bElemNE], [33, s.bWield]].forEach(([r, v]) => { if (v) R[r] = one(v); });
  if (s.bCombo && s.bCombo !== 100) R[34] = one(s.bCombo);
  const cu = [s.cu1 && !phys ? s.cu1v : null, s.cu2 && phys ? s.cu2v : null];
  if (cu.some(v => v !== null)) R[30] = cu.concat([null, null]);
  if (s.hoshi) R[31] = one(s.hoshi);
  if (s.bGeko > 0) R[32] = one(s.bGeko);
  if (s.gStr) R[14] = [s.gStr, null, null, null];
  if (s.gInt) R[15] = [s.gInt, null, null, null];
  if (s.gSpd) R[16] = [s.gSpd, null, null, null];
  if (s.bWeak) R[26] = (R[26] || []).filter(v => v !== null).concat([s.bWeak]);
  const mpList = (s.mpPct ? [s.mpPct] : []).concat(rows[19] || []).slice(0, 4);
  if (mpList.length) R[19] = mpList.concat([null, null, null, null]).slice(0, 4); else delete R[19];
  if (s.mpFix) R[13] = one(s.mpFix);
  const inp = { D3: '아군', D4: st.mp, D5: st.str + atk + s.atkAdj, D6: st.int + mag + s.magAdj, D7: st.str, D8: st.int, D9: st.spd, D10: st.luck,
    G3: s.range, G4: s.elem === '무속성' ? '무속성' : '속성', G5: s.kind, G6: s.power, J3: s.tlv, J4: s.tdef, J5: s.tmdef, J6: s.aff, F67: 'ON', FM: s.bFinal > 0 ? +s.bFinal : 1, rows: R };
  return { inp, crit: Math.max(0, Math.min(100, crit)), elemSum: elemE.reduce((a, b) => a + b, 0) };
}
function evalBuild(items, s, wt) {
  if (s.kindAuto) { const k = kindOf(s.clsSel || clsOfWeapon(wt), s.kindBase || baseOfWeapon(wt)); if (k !== s.kind) s = Object.assign({}, s, { kind: k }); }
  const A = AEC(), b = buildInput(items, s, wt), r = A.calc(b.inp);
  const h = Math.max(1, s.hits), p = b.crit / 100;
  const hitR = [r];
  if (s.bMulti && h > 1) {
    const memo = { 0: r };
    for (let i = 2; i <= h; i++) { const u = MULTI_UP[Math.min(i, 5)]; if (!memo[u]) { const rows = Object.assign({}, b.inp.rows); rows[25] = (rows[25] || []).filter(v => v !== null && v !== undefined).concat([u]); memo[u] = A.calc(Object.assign({}, b.inp, { rows })); } hitR.push(memo[u]); }
  } else for (let i = 2; i <= h; i++) hitR.push(r);
  const tot = f => hitR.reduce((a, x) => a + f(x), 0);
  return { crit: b.crit, elemSum: b.elemSum, n: tot(x => x.n.avg), c: tot(x => x.c.avg), exp: tot(x => x.n.avg * (1 - p) + x.c.avg * p) };
}

/* 장비 → 계산용 항목 */
const badgeVarKeys = b => { if (!b || b.slot !== 'badge') return null; const ws = b.n.replace(/\s*배지$/, '').split(/\s+/); if (!ws.length || !ws.every(w => w in BADGE_STAT_WORD)) return null; return ws.map(w => BADGE_STAT_WORD[w]); };
const statPri = kind => ({ '물리공격': ['str', 'luck', 'int', 'spd'], '지능기반 물리': ['int', 'luck', 'str', 'spd'], '속도기반 물리': ['spd', 'luck', 'str', 'int'],
  '마법공격': ['int', 'spd', 'str', 'luck'], '힘기반 마법': ['str', 'int', 'spd', 'luck'], '속도기반 마법': ['spd', 'int', 'str', 'luck'] }[kind] || ['str', 'int', 'spd', 'luck']).concat(['end', 'spr']);
const choiceFx = (g, kind) => (g.ch || []).map(c => ({ k: 'stat', s: statPri(kind).find(x => c.o.includes(x)) || c.o[0], v: c.v })).filter(e => DMG_STATS.includes(e.s));
const glasterEff = (g, oid, kind) => ({ slot: 'glaster', n: g.n, fx: g.st.concat(choiceFx(g, kind), oid === 'pot' && g.canPot ? g.fxP : g.fxA) });
const defOre = g => g && g.pot ? 'pot' : '';
const oreName = (g, oid) => oid === 'pot' ? '각성 + 잠재 연성' : oid ? '각성 + ' + (ORES[oid] ? ORES[oid].n : oid) : '각성';
/* 'N종류 중 하나(…)' 무기·방어구: 고른 옵션 효과를 붙임 (sel = { 장비 id: [줄별 옵션 번호] }) */
const withW = (it, sel) => { if (!it.wch) return it; const ch = (sel && sel[it.id]) || []; const add = []; it.wch.forEach((c, i) => { const o = c.opts[+ch[i] || 0] || c.opts[0]; add.push(...o.fx); }); return add.length ? Object.assign({}, it, { fx: it.fx.concat(add) }) : it; };
function itemsOf(st, s, wt, sel) {
  const out = [];
  sel = sel || st.wc;
  for (const k of OPT_ALL) {
    if (lockOf(k, s.fate)) continue;
    const id = st.equip[k]; if (!id) continue;
    const it = ITEMS[id]; if (!it) continue;
    if (GS.includes(k)) { let oid = st.ore[k] || ''; if (oid === 'pot' && !it.canPot) oid = ''; out.push(glasterEff(it, oid, s.kind)); if (oid && oid !== 'pot' && ORES[oid] && !it.noRef) out.push(ORES[oid]); }
    else if (k === 'armor' && st.equip.weapon && ITEMS[st.equip.weapon] && it.t !== ARMOR_OF[ITEMS[st.equip.weapon].t]) continue;
    else out.push(withW(it, sel));
  }
  return out;
}
const kindFor = (s, wt) => kindOf(s.clsSel || clsOfWeapon(wt), s.kindBase || baseOfWeapon(wt));
/* 장비 포함 스탯 (빌더의 D7~D10: 힘·지능·속도·운) — 조건부 스탯 장비는 이 조건 기준 */
function statsOf(st, s, wt) {
  const s2 = Object.assign({}, s, { kind: kindFor(s, wt) });
  const b = buildInput(itemsOf(st, s2, wt, st.wc || {}), s2, wt).inp;
  return { str: b.D7, int: b.D8, spd: b.D9, luck: b.D10, mp: b.D4, atk: b.D5, mag: b.D6 };
}
function evalState(st, s, wt) {
  const s2 = Object.assign({}, s, { kind: kindFor(s, wt) });
  // 선택형 장비: 코드에 정해진 줄은 그대로, 나머지는 대미지가 가장 높은 옵션 (빌더의 자동 선택과 같음)
  const fixed = st.wc || {}, free = [];
  for (const k of ['weapon', 'armor']) { const it = ITEMS[st.equip[k]]; if (!it || !it.wch) continue; it.wch.forEach((c, i) => { const f = fixed[it.id] && fixed[it.id][i]; if (f === undefined || f === '' || f === null) free.push([it.id, i, c.opts.length]); }); }
  if (!free.length) return evalBuild(itemsOf(st, s2, wt, fixed), s2, wt);
  let best = null;
  const sel = {}; for (const id in fixed) sel[id] = fixed[id].slice();
  const rec = j => {
    if (j === free.length) { const r = evalBuild(itemsOf(st, s2, wt, sel), s2, wt); if (!best || r.exp > best.exp + 1e-9) { best = r; best.wc = JSON.parse(JSON.stringify(sel)); } return; }
    const [id, i, n] = free[j]; (sel[id] = sel[id] || []);
    for (let o = 0; o < n; o++) { sel[id][i] = o; rec(j + 1); }
  };
  rec(0);
  return best;
}

/* 최적 빌드: 칸마다 가장 좋은 걸로 바꾸기를 반복 (빌더의 optSearch와 같은 방식, 고정·후보 지정 없이) */
function pools(s, wt) {
  const who = (s.who || '').trim();
  const ok = it => !it.only || (who && it.only.split('/').some(n => who === n || who.startsWith(n)));
  const special = g => g.ck === 'char' || g.fam === '특수계';
  const glOk = g => (!g.wt || g.wt === wt) && g.dmg && ok(g);
  return {
    weapon: DATA.w.filter(w => w.t === wt && ok(w)).map(w => w.id),
    armor: DATA.armor.filter(a => a.t === ARMOR_OF[wt] && ok(a)).map(a => a.id),
    badge: DATA.badges.filter(b => ok(b) && !badgeVarKeys(b) && (b.fx || []).some(e => e.k !== 'hpinfo' && !(e.k === 'stat' && SOL_STAT(e.s)))).map(b => b.id),
    gl: DATA.gl.filter(g => !special(g) && glOk(g)).map(g => g.id),
    gs: DATA.gl.filter(g => special(g) && glOk(g) && !/의 증표$/.test(g.n)).map(g => g.id)
  };
}
const oresOfAll = gid => {
  const g = ITEMS[gid]; if (!g) return [''];
  if (g.noRef) return g.canPot ? ['', 'pot'] : [''];
  return Object.values(ORES).filter(o => (o.id !== 'pot' || g.canPot) && (o.id === '' || o.id === 'pot' || (o.fx || []).some(e => !(e.k === 'stat' && SOL_STAT(e.s))))).map(o => o.id);
};
const clone = st => ({ equip: Object.assign({}, st.equip), ore: Object.assign({}, st.ore) });
const uniqOf = id => { const it = ITEMS[id]; return it ? [...new Set((it.fx || []).filter(e => UNIQUE[e.k]).map(e => e.k))] : []; };
let uOre = {}; // 중복 불가 효과 → 그 효과를 주는 광석 중 값이 가장 큰 것
const nameOf = id => ITEMS[id] ? ITEMS[id].n : id;
function dup(st, slot, id) {
  if (!id || slot === 'weapon' || slot === 'armor') return false;
  const n = nameOf(id), grp = slot.startsWith('badge') ? ['badge1', 'badge2'] : GS;
  return grp.some(k => k !== slot && st.equip[k] && nameOf(st.equip[k]) === n);
}
async function optimize(sIn, wt, opts) {
  opts = opts || {};
  const s = makeS(sIn); s.kind = kindFor(s, wt);
  const P = pools(s, wt), SL = OPT_ALL.filter(k => !lockOf(k, s.fate));
  let evals = 0; const memo = new Map();
  const keyOf = st => OPT_ALL.map(k => (st.equip[k] || '-') + (GS.includes(k) ? '@' + (st.ore[k] || '') : '')).join('|');
  // AF 비중(opts.afW, 2026-10-16): 실전 대미지 대부분이 AF면 겨누어 쏘기(AF 밖에서만) 같은 효과는 그만큼만 — 평상·AF 조건을 비중대로 섞음
  const afW = Math.max(0, Math.min(1, +opts.afW || 0)), sAF = afW > 0 ? Object.assign({}, s, { af: true }) : null;
  const ev = st => { const key = keyOf(st); const hit = memo.get(key); if (hit !== undefined) return hit; evals++; const m = opts.metric || 'exp';
    const v = afW > 0 ? (1 - afW) * evalState(st, s, wt)[m] + afW * evalState(st, sAF, wt)[m] : evalState(st, s, wt)[m]; memo.set(key, v); return v; };
  let last = Date.now();
  const tick = async () => { if (opts.signal && opts.signal.aborted) return true; if (Date.now() - last > 60) { last = Date.now(); if (opts.onTick) opts.onTick(evals); await new Promise(r => setTimeout(r, 0)); } return false; };
  const poolOf = k => k === 'weapon' ? P.weapon : k === 'armor' ? P.armor : k.startsWith('badge') ? P.badge : k === 'gs' ? P.gs : P.gl;
  async function climb(st, val) {
    for (let pass = 0; pass < 20; pass++) {
      let moved = false;
      for (const k of SL) {
        let best = null, bv = val;
        for (const id of k === 'weapon' ? poolOf(k) : [null, ...poolOf(k)]) {
          if (id === st.equip[k] || dup(st, k, id)) continue;
          const t = clone(st); t.equip[k] = id;
          if (GS.includes(k)) { const os = id ? oresOf(id) : ['']; t.ore[k] = os.includes(st.ore[k]) ? st.ore[k] : (id ? defOre(ITEMS[id]) : ''); if (!os.includes(t.ore[k])) t.ore[k] = os[0]; }
          const v = ev(t); if (v > bv + 1e-6) { bv = v; best = t; }
          if (await tick()) return [st, val];
        }
        if (best) { st = best; val = bv; moved = true; }
        if (GS.includes(k) && st.equip[k]) {
          let bo = null;
          for (const o of oresOf(st.equip[k])) { if (o === st.ore[k]) continue; const t = clone(st); t.ore[k] = o; const v = ev(t); if (v > val + 1e-6) { val = v; bo = t; } }
          if (bo) { st = bo; moved = true; }
        }
      }
      // 중복 불가 효과(겨누어 쏘기·약점·MP 소비·적 수·인핸스)를 배지·방어구 대신 글래스터 광석으로 받고 그 칸을 다른 장비로 (한 칸씩 바꾸기로는 못 찾는 이동, 사용자 지적 2026-10-16)
      for (const k of SL) {
        if (k === 'weapon' || GS.includes(k) || !st.equip[k]) continue;
        for (const q of uniqOf(st.equip[k])) {
          const oid = uOre[q]; if (!oid) continue;
          for (const g of GS) {
            if (!SL.includes(g) || !st.equip[g] || !oresOfAll(st.equip[g]).includes(oid) || st.ore[g] === oid) continue;
            let bt = null, bv2 = val;
            for (const id of [null, ...poolOf(k)]) { if (id === st.equip[k] || dup(st, k, id)) continue; const t = clone(st); t.ore[g] = oid; t.equip[k] = id; const v = ev(t); if (v > bv2 + 1e-6) { bv2 = v; bt = t; } if (await tick()) return [st, val]; }
            if (bt) { st = bt; val = bv2; moved = true; break; }
          }
        }
      }
      if (!moved) break;
    }
    return [st, val];
  }
  const empty = { equip: {}, ore: {} }; OPT_ALL.forEach(k => { empty.equip[k] = null; empty.ore[k] = ''; });
  if (!P.weapon.length) return { best: null, evals, why: `${wt} 무기 데이터가 없습니다.` };
  let bw = null, bwv = -1; for (const id of P.weapon) { const t = clone(empty); t.equip.weapon = id; const v = ev(t); if (v > bwv) { bwv = v; bw = id; } }
  const base = clone(empty); base.equip.weapon = bw;
  // 속도: 칸별로 혼자 넣었을 때 점수가 높은 후보만 남김 (방어구 15 · 배지 25 · 글래스터 40 · 전용 15 · 광석 10)
  // 단독 점수는 무기 효과를 뺀 상태로 잼 (무기가 이미 가진 중복 불가 효과 때문에 좋은 후보가 빠지지 않게)
  const neutral = st => itemsOf(st, s, wt).map(it => it.slot === 'weapon' ? { slot: 'weapon', atk: it.atk, mag: it.mag, fx: [] } : it);
  const soloV = st => evalBuild(neutral(st), Object.assign({}, s, { kind: kindFor(s, wt) }), wt)[opts.metric || 'exp'];
  const solo = (k, ids, keep) => ids.map(id => { const t = clone(base); t.equip[k] = id; if (GS.includes(k)) t.ore[k] = defOre(ITEMS[id]); evals++; return [soloV(t), id]; }).sort((a, b) => b[0] - a[0]).slice(0, keep).map(x => x[1]);
  P.armor = solo('armor', P.armor, opts.keepArmor || 15); P.badge = solo('badge1', P.badge, opts.keepBadge || 30);
  P.gl = solo('g1', P.gl, opts.keepGl || 40); P.gs = solo('gs', P.gs, opts.keepGs || 15);
  const baseV = soloV(base), oreScore = {};
  for (const o of Object.values(ORES)) { if (!o.id || o.id === 'pot') continue; oreScore[o.id] = evalBuild(neutral(base).concat([o]), Object.assign({}, s, { kind: kindFor(s, wt) }), wt)[opts.metric || 'exp'] - baseV; evals++; }
  const goodOres = new Set(Object.entries(oreScore).sort((a, b) => b[1] - a[1]).slice(0, opts.keepOre || 10).map(x => x[0]));
  const oresOf = gid => oresOfAll(gid).filter(o => o === '' || o === 'pot' || goodOres.has(o));
  const starts = [base];
  if (opts.from && opts.from.equip) { const f = clone(empty); for (const k of OPT_ALL) { f.equip[k] = opts.from.equip[k] || null; f.ore[k] = opts.from.ore && opts.from.ore[k] || ''; } if (f.equip.weapon && ITEMS[f.equip.weapon] && ITEMS[f.equip.weapon].t === wt) starts.push(f); }
  // 칸별 상위 후보에서 무작위 출발점 몇 개
  const top = {};
  for (const k of ['armor', 'badge1', 'g1', 'gs']) {
    top[k] = poolOf(k).map(id => { const t = clone(base); t.equip[k] = id; if (GS.includes(k)) { const os = oresOf(id); t.ore[k] = os.includes(defOre(ITEMS[id])) ? defOre(ITEMS[id]) : os[0]; } return [ev(t), id]; }).sort((a, b) => b[0] - a[0]).slice(0, 20).map(x => x[1]);
    if (await tick()) break;
  }
  { // 칸별 단독 상위로 채운 출발점
    const g = clone(base), put = (k, arr, i) => { for (const id of arr.slice(i)) { if (!dup(g, k, id)) { g.equip[k] = id; if (GS.includes(k)) { const os = oresOf(id); g.ore[k] = os.includes(defOre(ITEMS[id])) ? defOre(ITEMS[id]) : os[0]; } return; } } };
    if (SL.includes('armor')) put('armor', top.armor || [], 0);
    ['badge1', 'badge2'].filter(k => SL.includes(k)).forEach(k => put(k, top.badge1 || [], 0));
    ['g1', 'g2', 'g3', 'g4'].filter(k => SL.includes(k)).forEach(k => put(k, top.g1 || [], 0));
    if (SL.includes('gs')) put('gs', top.gs || [], 0);
    starts.push(g);
  }
  let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let r = 0; r < (opts.restarts ?? 1); r++) {
    const t = clone(base), pick = (k, arr) => { for (let i = 0; i < 20 && arr && arr.length; i++) { const id = arr[rnd(arr.length)]; if (!dup(t, k, id)) { t.equip[k] = id; if (GS.includes(k)) { const os = oresOf(id); t.ore[k] = os.includes(defOre(ITEMS[id])) ? defOre(ITEMS[id]) : os[0]; } return; } } };
    if (SL.includes('armor')) pick('armor', top.armor);
    ['badge1', 'badge2'].filter(k => SL.includes(k)).forEach(k => pick(k, top.badge1));
    ['g1', 'g2', 'g3', 'g4'].filter(k => SL.includes(k)).forEach(k => pick(k, top.g1));
    if (SL.includes('gs')) pick('gs', top.gs);
    starts.push(t);
  }
  let best = null;
  for (let i = 0; i < starts.length; i++) {
    const [st, v] = await climb(starts[i], ev(starts[i]));
    if (!best || v > best.v) best = { st, v };
    if (opts.onStart) opts.onStart(i + 1, starts.length);
    if (opts.signal && opts.signal.aborted) break;
  }
  const D = best ? evalState(best.st, s, wt) : null;
  return { best: best && { equip: best.st.equip, ore: best.st.ore, wc: (D && D.wc) || {}, v: best.v, detail: D }, evals, wt, s };
}

/* 빌드 코드 (빌더와 같은 형식: AEB1. + base64url(JSON)) */
const b64e = str => { const u = new TextEncoder().encode(str); let b = ''; for (let i = 0; i < u.length; i += 8192) b += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64d = str => { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const b = atob(str), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new TextDecoder().decode(u); };
function buildCode(o) {
  const out = { v: 1, who: o.who || '', st: o.st || null, eq: {}, ore: {}, bv: {}, wc: {}, gc: {}, cu: [], wt: o.wt || '' };
  for (const k of OPT_ALL) {
    const id = o.equip && o.equip[k], it = id && ITEMS[id]; if (!it) continue;
    out.eq[k] = [id, it.n, it.t || ''];
    if (GS.includes(k)) { const oid = (o.ore && o.ore[k]) || ''; out.ore[k] = [oid, oreName(it, oid)]; }
  }
  if (o.wc) for (const id in o.wc) if (Object.values(o.equip || {}).includes(id)) out.wc[id] = o.wc[id].map(String);
  if (o.p) out.p = o.p;
  return 'AEB1.' + b64e(JSON.stringify(out));
}
function findItem(k, id, name, type) {
  const kind = k === 'weapon' ? 'weapon' : k === 'armor' ? 'armor' : k.startsWith('badge') ? 'badge' : 'glaster';
  if (id && ITEMS[id] && ITEMS[id].n === name) return id;
  const ids = (BYNAME[name] || []).filter(i => ITEMS[i].slot === kind);
  return (type && ids.find(i => ITEMS[i].t === type)) || ids[0] || null;
}
function findOre(g, oid, name) {
  if (oid !== undefined && ORES[oid] && oreName(g, oid) === name) return oid;
  if (!name) return oid && ORES[oid] ? oid : '';
  if (name === oreName(g, 'pot')) return 'pot';
  const n = name.replace(/^각성(\s*\+\s*)?/, ''); if (!n) return '';
  const o = Object.values(ORES).find(x => x.n === n); return o ? o.id : '';
}
function parseCode(txt) {
  const m = String(txt || '').match(/AEB1\.[A-Za-z0-9_-]+/);
  if (!m) return { err: '빌드 코드(AEB1.…)를 찾지 못했습니다.' };
  let o; try { o = JSON.parse(b64d(m[0].slice(5))); } catch (e) { return { err: '빌드 코드를 읽지 못했습니다.' }; }
  const R = { code: m[0], who: o.who || '', st: o.st || null, wt: TYPES.includes(o.wt) ? o.wt : '', equip: {}, ore: {}, miss: [], p: o.p || null };
  for (const k of OPT_ALL) {
    const e = o.eq && o.eq[k]; if (!e) continue;
    const id = findItem(k, e[0], e[1], e[2]);
    if (!id) { R.miss.push(e[1]); continue; }
    R.equip[k] = id;
    if (GS.includes(k)) { const oe = (o.ore && o.ore[k]) || ['', '']; R.ore[k] = findOre(ITEMS[id], oe[0], oe[1]); }
  }
  R.wc = {};
  for (const id in (o.wc || {})) { const it = ITEMS[id]; if (it && it.wch && Object.values(R.equip).includes(id)) R.wc[id] = o.wc[id].map(v => v === '' || v === null ? undefined : +v); }
  if (!R.wt && R.equip.weapon) R.wt = ITEMS[R.equip.weapon].t;
  return R;
}
/* 빌드가 남에게 공유하는 P글래 효과(잠재 연성한 P글래스터의 【P】 효과) */
function pShares(equip, ore) {
  const out = [];
  for (const k of ['g1', 'g2', 'g3', 'g4']) {
    const g = equip && ITEMS[equip[k]]; if (!g || !g.hasP) continue;
    const pot = (ore && ore[k]) === 'pot' && g.canPot;
    const fx = (pot ? g.fxP : g.fxA).filter(e => e.pp || e.party);
    const cond = (g.conds || [])[0] || '';
    for (const e of fx) out.push({ n: g.n, wt: g.wt || (TYPES.includes(cond.replace(/[<>()]/g, '')) ? cond.replace(/[<>()]/g, '') : ''), party: !!e.party, k: e.k, e: e.e || '', v: typeof e.v === 'number' ? e.v : (Array.isArray(e.v) ? e.v[0] : 0), z: e.z || '' });
  }
  return out;
}
const slotLabel = k => (SLOTS.find(x => x[0] === k) || [k, k])[1];

const API = { init, isReady: () => ready, makeS, optimize, evalState, evalBuild, statsOf, buildCode, parseCode, pShares, oreName, nameOf, slotLabel, itemsOf, lockOf, TYPES, ARMOR_OF, OPT_ALL, GS, ITEMS: () => ITEMS, ORES: () => ORES, DEFAULT_S };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AEEq = API;
})(typeof window !== 'undefined' ? window : globalThis);
