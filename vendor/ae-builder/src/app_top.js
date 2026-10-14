const DATA = /*DATA*/;
const TYPES = ['지팡이', '검', '도', '도끼', '창', '활', '권갑', '망치'];
const ARMOR_TYPES = ['전체', '팔찌', '목걸이', '반지'];
// 무기 종류별로 장착할 수 있는 방어구
const ARMOR_OF = { '지팡이': '반지', '검': '팔찌', '도': '반지', '도끼': '목걸이', '창': '팔찌', '활': '반지', '권갑': '목걸이', '망치': '팔찌' };
const FAMS = ['전체', '공격계', '생명계', '지원계', '특수계'];
const PHYS = ['물리공격', '지능기반 물리', '속도기반 물리'];
const GS = ['g1', 'g2', 'g3', 'g4', 'gs'];
// 천명에 따라 잠기는 칸: 배지 2는 천명 120 미만, 글래스터 4는 천명 200 미만에서 잠김 (장착 불가 · 계산 제외)
const SLOT_LOCK = { badge2: 120, g4: 200 };
const lockOf = (k, fate) => SLOT_LOCK[k] && (+fate || 0) < SLOT_LOCK[k] ? SLOT_LOCK[k] : 0;   // gs = 전용(특수) 글래스터 칸
const SLOTS = [['weapon', '무기'], ['armor', '방어구'], ['badge1', '배지 1'], ['badge2', '배지 2'], ['g1', '글래스터 1'], ['g2', '글래스터 2'], ['g3', '글래스터 3'], ['g4', '글래스터 4'], ['gs', '전용 글래스터']];
const $ = id => document.getElementById(id);
const fields = [...document.querySelectorAll('aside input, aside select, #sort, #dmgOnly, #withOre')];
const defaults = {};
fields.forEach(el => { defaults[el.id] = el.type === 'checkbox' ? el.checked : el.value; });

// 항목 id 부여
const ITEMS = {};
DATA.w.forEach((x, i) => { x.id = 'w' + i; x.slot = 'weapon'; ITEMS[x.id] = x; });
DATA.armor.forEach((x, i) => { x.id = 'a' + i; x.slot = 'armor'; ITEMS[x.id] = x; });
DATA.badges.forEach((x, i) => { x.id = 'b' + i; x.slot = 'badge'; ITEMS[x.id] = x; });
DATA.gl.forEach((x, i) => {
  x.id = 'g' + i; x.slot = 'glaster'; x.t = '글래스터';
  x.only = x.ck === 'char' && !x.conds.includes('(특정 캐릭터)') ? x.conds.map(c => c.replace(/[()]/g, '')).join('/') : '';  // 증표는 캐릭터마다 있으므로 이름으로 거르지 않음
  x.lines = [[`활성 · ${x.act}`, 1]].concat(x.lA.map(l => [`각성 ${l[0]}`, l[1]]), x.lP.map(l => [`잠재 연성 ${l[0]}`, l[1]]));
  x.sp = x.fam === '특수계';                                     // 특수계: 각성 상태가 기본
  x.noRef = x.lP.some(l => l[0].trim() === '(연성 불가)') && !(x.sp && x.potDitto);   // 시트에 '(연성 불가)'가 직접 적힌 경우만
  if (x.sp && !x.noRef) { x.lP = []; }                            // 〃로 이어진 잠재 연성 칸은 쓰지 않음
  x.np = x.noRef || x.sp || x.lP.some(l => l[0].includes('잠재 연성 불가')); // 잠재 연성 불가
  x.pot = (x.grade === '상급' || x.hasP) && !x.np;              // 상급·P 글래스터: 잠재 연성 장착이 기본
  x.canPot = (x.pot || x.grade === '중급') && !x.np;             // 잠재 연성 가능: 상급·중급·P
  const dmgE = e => !(e.k === 'stat' && (e.s === 'end' || e.s === 'spr'));
  x.dmg = x.fxA.filter(dmgE).length + x.fxP.filter(dmgE).length + x.st.filter(e => e.s !== 'mp' && dmgE(e)).length > 0;
  ITEMS[x.id] = x;
});
const ORES = { '': { id: '', n: '각성', fx: [], lines: [['· 광석을 연성하지 않은 각성 상태: 각성 효과를 적용합니다.', 1]], src: '' }, pot: { id: 'pot', n: '각성 + 잠재 연성 (잠재 광석)', fx: [], lines: [['· 각성한 글래스터에 잠재 광석을 연성해 효과를 강화합니다. 시트의 잠재 연성 칸에 적힌 강화된 값을 적용합니다.', 1]], src: '' } };
DATA.ores.forEach((x, i) => { if (x.n === '잠재 광석') return; x.id = 'o' + i; x.slot = 'ore'; ORES[x.id] = x; });

// 파티원 P글래스터: 다른 파티원이 장착해서 나에게 적용되는 효과
//  · 【P】 효과: 장착 조건(무기종·성격·속성 등)이 같은 파티원에게만 적용
//  · '아군 전체' 효과(격진의 힘·극 격진의 힘·공명의 힘): 파티 전원에게 적용
const isPLine = l => !!l[2] || l[0].includes('아군 전체');
const isPfx = e => e.pp || e.party;
const PG = {}, PG_LIST = [];
DATA.gl.forEach(x => {
  const la = x.lA.filter(isPLine).map(l => l[0].replace(/^·\s*/, '')), lp = x.lP.filter(isPLine).map(l => l[0].replace(/^·\s*/, ''));
  if (!la.length && !lp.length) return;
  const g = PG[x.n] || (PG[x.n] = { n: x.n, fam: x.fam, party: false, vars: [] });
  if (!PG_LIST.includes(g)) PG_LIST.push(g);
  const fxA = x.fxA.filter(isPfx), fxP = lp.length ? x.fxP.filter(isPfx) : fxA;
  const potOk = x.canPot && lp.length > 0 && lp.join('|') !== la.join('|');
  if ([...fxA, ...fxP].some(e => e.party)) g.party = true;
  const v = { la, lp: lp.length ? lp : la, fxA, fxP, potOk, dmg: fxA.concat(fxP).some(e => !(e.k === 'stat' && (e.s === 'end' || e.s === 'spr'))) };
  (x.conds.length ? x.conds : ['']).forEach(c => { if (!g.vars.some(o => o.c === c)) g.vars.push(Object.assign({ c }, v)); });
});
PG_LIST.forEach(g => { g.dmg = g.vars.some(v => v.dmg); g.same = g.vars.every(v => v.la.join('|') === g.vars[0].la.join('|') && v.lp.join('|') === g.vars[0].lp.join('|')); });
let pgl = [];   // 장착한 파티원 P글래스터: [{ n: 이름, c: 장착 조건, o: '' | 'pot', m: 내 캐릭터 해당(무기종 외 조건) }]
const PGL_MAX = 24;
const condName = c => c.replace(/[<>()]/g, '');
const pVar = p => { const g = PG[p.n]; return g && (g.vars.find(v => v.c === p.c) || g.vars[0]); };
// 장착 조건 판정: 무기종은 내 무기로 자동, 그 외(성격·속성·소속 등)는 '내 캐릭터 해당' 체크
function pCond(p) {
  const v = pVar(p); if (!v || !v.c || v.c === '(없음)') return { ok: true, why: '' };
  const t = condName(v.c);
  if (TYPES.includes(t)) { const w = calcWeaponType(); return { ok: w === t, why: w === t ? '' : `내 무기 ${w} ≠ ${t}` }; }
  return { ok: p.m === true, why: p.m === true ? '' : `'내 캐릭터 <${t}>' 체크 안 됨` };
}
// 계산용 효과: 【P】 효과는 장착 조건이 맞을 때만, '아군 전체' 효과는 항상
function pglFx(p) {
  const v = pVar(p); if (!v) return [];
  const fx = p.o === 'pot' && v.potOk ? v.fxP : v.fxA, ok = pCond(p).ok;
  return fx.filter(e => e.party || ok);
}
const pglEff = p => PG[p.n] && { slot: 'pgl', n: p.n + ' 【P】', fx: pglFx(p) };
const pDefCond = g => { const w = weaponType(); return (g.vars.find(v => v.c === `<${w}>`) || g.vars[0]).c; };

let cat = 'weapon', curType = '검', armorType = '전체', gFam = '전체', gMode = 'glaster', openKey = null;
let equip = { weapon: null, armor: null, badge1: null, badge2: null, g1: null, g2: null, g3: null, g4: null, gs: null };
let ore = { g1: '', g2: '', g3: '', g4: '', gs: '' };

function load() {
  try {
    const s = JSON.parse(localStorage.getItem('ae-build') || 'null'); if (!s) return;
    if (Array.isArray(s.customs)) { customs = s.customs.filter(c => c && c.id && CUS_SLOT[c.slot]).map(c => Object.assign({ st: {}, fx: [] }, c)); registerCustoms(); }
    // 예전 '직접 입력 배지' → 커스텀 배지로 옮김
    if (s.equip && (s.equip.badge1 === 'custom' || s.equip.badge2 === 'custom') && s.f) {
      const st = {}; [['str', 'cStr'], ['int', 'cInt'], ['spd', 'cSpd'], ['luck', 'cLuck'], ['end', 'cEnd'], ['spr', 'cSpr'], ['mp', 'cMp'], ['hp', 'cHp']].forEach(([k, id]) => { if (+s.f[id]) st[k] = +s.f[id]; });
      const c = cusAdd({ slot: 'badge', n: s.f.cName || '반복 획득 배지', st, fx: +s.f.cMpPct ? [{ type: 'mppct', v: +s.f.cMpPct }] : [] });
      ['badge1', 'badge2'].forEach(k => { if (s.equip[k] === 'custom') s.equip[k] = c.id; });
    }
    fields.forEach(el => { if (s.f && s.f[el.id] !== undefined) { if (el.type === 'checkbox') el.checked = s.f[el.id]; else el.value = s.f[el.id]; } });
    if (TYPES.includes(s.curType) || s.curType === '전체') curType = s.curType;
    // 자동 선택이 생기기 전 저장값: 종류·공격 타입을 자동으로 되돌림
    if (!(s.ver >= 2)) { $('kind').value = ''; $('atkType').value = ''; }
    // 예전 '종류'(물리공격·지능기반 물리 …) → 공격 유형 + 기반 스탯
    else if (!(s.ver >= 3) && s.f && OLD_KIND[s.f.kind]) { $('atkCls').value = OLD_KIND[s.f.kind][0]; $('kind').value = OLD_KIND[s.f.kind][1]; }
    // 예전 '속성 공격 (기타 합)' 값 → P글래 속성 공격 칸으로 옮김
    if (s.f && +s.f.bElemE) { const pick = s.f.pMode === 'pick', id = pick ? 'pAddElem' : 'pElem'; $(id).value = (+$(id).value || 0) + +s.f.bElemE; }
    if (ARMOR_TYPES.includes(s.armorType)) armorType = s.armorType;
    if (FAMS.includes(s.gFam) && s.gFam !== '특수계') gFam = s.gFam;
    if (s.gMode === 'ore') gMode = 'ore';
    if (SLOTS.some(x => x[0] === s.cat)) cat = s.cat;
    if (s.equip) for (const k in equip) equip[k] = (s.equip[k] && ITEMS[s.equip[k]]) ? s.equip[k] : null;
    if (s.pledge && s.pledge.pj && s.pledge.pn) pledge = s.pledge;
    if (s.gChoice && typeof s.gChoice === 'object') gChoice = s.gChoice;
    if (s.wChoice && typeof s.wChoice === 'object') wChoice = s.wChoice;
    if (s.solBase && typeof s.solBase === 'object') solBase = { end: +s.solBase.end || 0, spr: +s.solBase.spr || 0 };
    if (Array.isArray(s.lunatic)) lunatic = s.lunatic.filter(x => x && ['솔선', '결사', '심안'].includes(x.t));
    // 예전 저장값 '극 ○○진' → ○○진 + ZONE 각성
    if (s.f && typeof s.f.zoneT === 'string' && s.f.zoneT.startsWith('극 ')) { $('zoneT').value = s.f.zoneT.slice(2); $('zone').checked = true; }
    if (s.ore) for (const k in ore) ore[k] = ORES[s.ore[k]] ? s.ore[k] : '';
    if (s.badgeVal && typeof s.badgeVal === 'object') ['badge1', 'badge2'].forEach(k => { if (Array.isArray(s.badgeVal[k])) badgeVal[k] = s.badgeVal[k].filter(r => r && BADGE_STATS.includes(r.s)); });
    if (Array.isArray(s.pgl)) pgl = s.pgl.map(p => p && (p.n || (p.k || '').split('#')[0])).map((n, i) => n && PG[n] ? { n, c: s.pgl[i].c !== undefined ? s.pgl[i].c : PG[n].vars[0].c, o: s.pgl[i].o === 'pot' ? 'pot' : '', m: s.pgl[i].m === true } : null).filter(Boolean).slice(0, PGL_MAX);
    // 예전 전투 조건 체크(공명의 힘·격진의 힘·극 격진의 힘) → P글래 선택으로 옮김
    if (s.f && (s.f.resF || s.f.resM || s.f.zoneAlly || s.f.zoneAllyK)) {
      const add = n => { if (PG[n] && !pgl.some(p => p.n === n)) pgl.push({ n, c: PG[n].vars[0].c, o: 'pot', m: true }); };
      if (s.f.resF) add('공명의 힘 <천>');
      if (s.f.resM) add('공명의 힘 <명>');
      const z = s.f.zoneT || '';
      const findZ = geuk => PG_LIST.find(g => g.vars.some(v => v.fxP.some(e => e.k === 'zonet' && e.party && e.z === (geuk ? '극 ' : '') + z)));
      if (s.f.zoneAlly && z) { const g = findZ(false); if (g) add(g.n); }
      if (s.f.zoneAllyK && z) { const g = findZ(true); if (g) add(g.n); }
      if (pgl.length) $('pMode').value = 'pick';
    }
  } catch (e) {}
}
function save() {
  try {
    const f = {}; fields.forEach(el => { f[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    localStorage.setItem('ae-build', JSON.stringify({ f, curType, armorType, gFam, gMode, cat, equip, ore, pledge, gChoice, lunatic, pgl, badgeVal, solBase, customs, wChoice, ver: 3 }));
  } catch (e) {}
}
// 스킬 종류 자동: 무기 기준 (지팡이 → 마법공격, 그 외 → 물리공격)
// 공격 유형(물리/마법) + 기반 스탯(힘/지능/속도) → 계산기 '종류'
const KIND_OF = { '물리': { '힘': '물리공격', '지능': '지능기반 물리', '속도': '속도기반 물리' }, '마법': { '지능': '마법공격', '힘': '힘기반 마법', '속도': '속도기반 마법' } };
const OLD_KIND = { '물리공격': ['물리', '힘'], '지능기반 물리': ['물리', '지능'], '속도기반 물리': ['물리', '속도'], '마법공격': ['마법', '지능'], '힘기반 마법': ['마법', '힘'], '속도기반 마법': ['마법', '속도'] };
const clsOfWeapon = wt => wt === '지팡이' ? '마법' : '물리';
const defBase = cls => cls === '마법' ? '지능' : '힘';
const kindOf = (cls, base) => KIND_OF[cls][base || defBase(cls)] || KIND_OF[cls][defBase(cls)];
const autoKind = wt => kindOf(clsOfWeapon(wt), '');
// 기반 스탯 자동: 공격 유형(물리/마법)과 무관하게 장착 무기를 따름 (지팡이 → 지능, 그 외 → 힘)
const baseOfWeapon = wt => wt === '지팡이' ? '지능' : '힘';
const kindFor = (s, wt) => kindOf(s.clsSel || clsOfWeapon(wt), s.kindBase || baseOfWeapon(wt));
// 각성할 수 있는 ZONE (속성·타입 ZONE). ZONE이 없거나 특수 ZONE이면 ZONE 각성 불가
const ZONE_AWK = ['열화진', '수천진', '지열진', '풍왕진', '초뢰진', '각음진', '휘정진', '황참진', '순돌진', '굉타진', '환마진', '쌍격진 참돌'];
function S() {
  const o = {}; fields.forEach(el => { o[el.id] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? (+el.value || 0) : el.value); });
  o.cu1v = 0.23; o.cu2v = 0.16;   // 정신 통일·심기일체 계수 (고정)
  o.kindBase = o.kind; o.clsSel = o.atkCls; o.kindAuto = !o.atkCls || !o.kindBase;   // 무기에 따라 바뀌는지
  o.kind = kindFor(o, weaponType());
  if (!ZONE_AWK.includes(o.zoneT)) o.zone = false;
  return o;
}

// 스탯 이름만 있는 배지(속도 배지, 힘 지능 배지 등): 반복 획득으로 수치가 달라서 장착 칸에서 직접 입력
const BADGE_STAT_WORD = { '힘': 'str', '지능': 'int', '속도': 'spd', '행운': 'luck', 'MP': 'mp', '내구': 'end', '정신': 'spr', 'HP': 'hp' };
const badgeVarKeys = b => {
  if (!b || b.slot !== 'badge' || b.custom) return null;
  const ws = b.n.replace(/\s*배지$/, '').split(/\s+/);
  if (!ws.length || !ws.every(w => w in BADGE_STAT_WORD)) return null;
  return ws.map(w => BADGE_STAT_WORD[w]).filter(Boolean);
};
let badgeVal = { badge1: [], badge2: [] };   // 장착 칸별 입력: [{ s: 'spd', v: 35 }, ...] — '+'로 스탯을 골라 수치 입력
const BADGE_STATS = ['str', 'int', 'spd', 'luck', 'mp', 'end', 'spr', 'hp'];   // 선택 가능한 스탯
const BADGE_DMG = ['str', 'int', 'spd', 'luck', 'mp', 'end', 'spr'];              // 계산에 쓰이는 스탯 (내구·정신은 솔선용)
const BADGE_LABEL = { str: '힘', int: '지능', spd: '속도', luck: '행운', mp: 'MP', end: '내구', spr: '정신', hp: 'HP' };
const badgeRows = k => Array.isArray(badgeVal[k]) ? badgeVal[k] : [];
function badgeWithVals(b, slot) {
  const rows = badgeRows(slot).filter(r => BADGE_STATS.includes(r.s));
  if (!badgeVarKeys(b) || !rows.length) return b;   // 입력이 없으면 시트 값
  const fx = b.fx.filter(e => e.k !== 'stat').concat(rows.filter(r => BADGE_DMG.includes(r.s)).map(r => ({ k: 'stat', s: r.s, v: +r.v || 0 })));
  return Object.assign({}, b, { fx });
}
const getItem = (id, s) => ITEMS[id];
// 글래스터 + 연성 광석 → 계산용 항목 (잠재 광석이면 잠재 연성 효과, 아니면 각성 효과)
// 글래스터 + 연성 상태 → 계산용 항목 ('pot' = 잠재 연성 효과, 그 외 = 각성 효과)
// 진 증표 · 일반 증표: 드롭다운으로 고른 스탯과 값 (클래스마다 다름)
const PLEDGE = { '진 (5★ 클래스)의 증표': 'pj', '(5★ 클래스)의 증표': 'pn' };
const DMG_STATS = ['str', 'int', 'spd', 'luck', 'mp'];
// 증표별 [스탯, 값] 3줄 — 표의 활성 스탯 칸에서 입력
let pledge = { pj: [['', 0], ['', 0], ['', 0]], pn: [['', 0], ['', 0], ['', 0]] };
function pledgeFx(g) {
  const p = PLEDGE[g.n]; if (!p) return [];
  return pledge[p].filter(([k, v]) => k && v && DMG_STATS.includes(k)).map(([k, v]) => ({ k: 'stat', s: k, v: +v }));
}
// '(○○ 중 하나)+N' 선택 스탯: 기본은 스킬 종류에 맞는 공격 스탯 우선, 사용자가 드롭다운으로 변경
let gChoice = {};
let lunatic = [];
let solBase = null;   // 스크린샷에서 읽은 내구·정신 → 루나틱 솔선 기본값 { end, spr }   // 루나틱: [{ t: '솔선' | '결사' | '심안', end?, spr? }]
const STAT_KO = { str: '힘', int: '지능', spd: '속도', luck: '행운', end: '내구', spr: '정신' };
function statPriority() {
  const k = S().kind;
  return ({
    '물리공격': ['str', 'luck', 'int', 'spd'], '지능기반 물리': ['int', 'luck', 'str', 'spd'], '속도기반 물리': ['spd', 'luck', 'str', 'int'],
    '마법공격': ['int', 'spd', 'str', 'luck'], '힘기반 마법': ['str', 'int', 'spd', 'luck'], '속도기반 마법': ['spd', 'int', 'str', 'luck']
  }[k] || ['str', 'int', 'spd', 'luck']).concat(['end', 'spr']);
}
const autoPick = opts => statPriority().find(x => opts.includes(x)) || opts[0];
const pickOf = (g, i) => { const v = (gChoice[g.id] || [])[i]; return v && g.ch[i].o.includes(v) ? v : autoPick(g.ch[i].o); };
const choiceFx = g => (g.ch || []).map((c, i) => ({ k: 'stat', s: pickOf(g, i), v: c.v })).filter(e => DMG_STATS.includes(e.s));
const glasterEff = (g, oid) => ({ slot: 'glaster', n: g.n, fx: g.st.concat(choiceFx(g), pledgeFx(g), oid === 'pot' && g.canPot ? g.fxP : g.fxA) });
const defOre = g => g && g.pot ? 'pot' : '';   // 기본: 상급·P는 각성 + 잠재 연성, 그 외는 각성
const oreName = (g, oid) => oid === 'pot' ? '각성 + 잠재 연성' : oid ? '각성 + ' + ORES[oid].n : '각성';
// 무기 탭 '전체'일 때 기준이 되는 무기 종류 (방어구를 장착했으면 그 방어구에 맞는 첫 종류)
// baseWT: 무기를 들지 않았지만 무기 종류는 정해진 경우 (최적 빌드의 무기 미장착 고정 · 가져온 빌드)
let baseWT = null;
const baseType = () => {
  if (baseWT) return baseWT;
  if (curType !== '전체') return curType;
  const at = equip.armor && ITEMS[equip.armor] ? ITEMS[equip.armor].t : '';
  return (at && TYPES.find(x => ARMOR_OF[x] === at)) || '검';
};
const weaponType = () => equip.weapon ? ITEMS[equip.weapon].t : baseType();
// 계산 중인 조합의 무기 종류 (무기 후보를 비교할 때는 후보 무기 기준)
let calcWT = null;
const calcWeaponType = () => calcWT || weaponType();
