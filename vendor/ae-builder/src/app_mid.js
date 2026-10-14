const fv = (v, s) => Array.isArray(v) ? v[0] + v[1] * s.fate / v[2] : v;
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const STATN = { str: '힘', int: '지능', spd: '속도', luck: '행운', mp: 'MP', end: '내구', spr: '정신' };
const SOL_STAT = s => s === 'end' || s === 'spr';   // 내구·정신: 루나틱 솔선에만 쓰임
const solOn = () => lunatic.some(x => x.t === '솔선');
// 솔선에 더할 장비 내구·정신: 직접 입력이면 그 값, 아니면 장착(후보 포함) 장비에서 합산
function solEquip(sol, items, s) {
  if (sol.eqManual) return { end: +sol.eqEnd || 0, spr: +sol.eqSpr || 0 };
  const eq = { end: 0, spr: 0 };
  for (const it of items) for (const e of it.fx || []) if (e.k === 'stat' && SOL_STAT(e.s) && interpret(e, s, PHYS.includes(s.kind))[1]) eq[e.s] += Math.floor(fv(e.v, s));
  return eq;
}
const ENV = { '가열': 'eHeat', '특수': 'eSpecial', '날씨': 'eWeather', '지표': 'eGround', '대기': 'eAir' };
const SELF = { '독': 'sPoison', '페인': 'sPain', '봉인': 'sSeal', '도발': 'sTaunt' };
const UNIQUE = { aim: 1, weak: 1, mpatk: 1, enemies: 1, enh: 1 }; // 효과 중복 불가

// 효과 하나 → [라벨, 적용 여부, 칩 클래스]
function interpret(e, s, phys) {
  const elemOk = e.e === 'all' ? s.elem !== '무속성' : e.e === 'none' ? s.elem === '무속성' : e.e === s.elem;
  const envP = e.env ? e.env + (e.env === '날씨' || e.env === '지표' || e.env === '대기' ? ' 계통' : '') + ' 환경 · ' : '';
  const envOk = !e.env || s[ENV[e.env]];
  let r;
  switch (e.k) {
    case 'stat': { const v = Math.floor(fv(e.v, s)); r = [`${STATN[e.s]}${v >= 0 ? '+' : ''}${v}`, !SOL_STAT(e.s) || solOn()]; break; }
    case 'crit': r = [`크리율+${e.v}%`, phys, 'c']; break;
    case 'mcrit': r = [`마법 크리율+${e.v}%`, !phys, 'c']; break;
    case 'cpow': r = [`크리 위력+${e.v}%`, phys, 'c']; break;
    case 'mcpow': r = [`마법 크리 위력+${e.v}%`, !phys, 'c']; break;
    case 'elem': { const v = fv(e.v, s); r = [`${e.e === 'all' ? '모든 속성' : e.e === 'none' ? '무속성' : e.e + ' 속성'}${v >= 0 ? '+' : ''}${+v.toFixed(2)}%`, elemOk]; break; }
    case 'hp': r = e.cond === 'hpmax' ? [`HP 최대 +${e.v}%`, s.hpPct >= 100] : [`HP ${e.th || 50}%↓ +${e.v}%`, s.hpPct <= (e.th || 50)]; break;
    case 'growth': r = [`성장 +${Math.min(e.per * s.turns, e.max)}%`, s.turns > 0]; break;
    case 'tstat': r = [`대상 ${e.cond === 't_pain' ? '페인' : '독'} +${e.v}%`, e.cond === 't_pain' ? s.tPain : s.tPoison]; break;
    case 'aim': r = [`겨누어 쏘기 +${e.v}%`, !s.af]; break;
    case 'enemies': r = [`적 수 +${e.per * Math.max(0, s.enemies - 1)}%`, s.enemies > 1]; break;
    case 'gekoku': r = [`하극상 +${AECalc.rd(s.tlv * s.tlv / e.d, 2)}%`, true]; break;
    case 'mpatk': r = [`MP 소비 공격 +${e.v}%`, true]; break;  // 일반 공격에도 적용
    case 'zone': r = [`ZONE 각성 +${e.v}%`, s.zone]; break;
    case 'zonet': { // 극 ○○진 = ○○진을 ZONE 각성한 상태
      const geuk = e.z.startsWith('극 '), base = geuk ? e.z.slice(2) : e.z;
      r = [`${e.z} +${e.v}%`, s.zoneT === base && (!geuk || s.zone)]; break;
    }
    case 'weak': r = [`약점 +${e.v}%`, s.aff === '약점']; break;
    case 'wins': r = [`누계 승리 +${e.v}%`, s.wins]; break;
    case 'fateally': { const n = e.who === '명' ? s.meiAllies : s.fateAllies; r = [`${e.who || '천'} 아군 +${e.per * n}%`, n > 0]; break; }
    case 'enh': { const st = e.cond.replace('self_', ''); r = [`${st} 인핸스 +${e.v}%`, !!s[SELF[st]]]; break; }
    case 'normal': r = [`일반 공격 +${e.v}%`, s.normalAtk]; break;
    case 'mppct': r = [`MP${e.v > 0 ? '+' : ''}${e.v}%`, true]; break;
    case 'hpinfo': r = [`HP${e.v > 0 ? '+' : ''}${e.v}${e.pct ? '%' : ''}`, false]; break;
    case 'fallen': r = [`쓰러진 아군 +${Math.min(e.per * s.fallen, e.max)}%`, s.fallen > 0]; break;
    default: r = ['?', false];
  }
  return [(e.party ? '아군 전체 ' : '') + envP + r[0], r[1] && envOk, r[2] || ''];
}

// ZONE 자체 효과 (덴기스, 「시스템 ZONE 편」 기준. 괄호 값 = ZONE 각성(극) 시)
const WT_ATK = { '검': '베기', '도': '베기', '도끼': '베기', '창': '찌르기', '활': '찌르기', '권갑': '타격', '망치': '타격', '지팡이': '마법' };
// 공격 타입: 직접 고르거나, 자동이면 무기 기준 (검·도·도끼 베기 / 창·활 찌르기 / 권갑·망치 타격 / 지팡이 마법)
// 공격 타입 자동: 무기 기준. 단, 스킬이 마법 공격이면 무기와 상관없이 '마법' (예: 검 - 마법)
// 지팡이로 쓰는 물리 스킬: 자동이면 베기로 봄 (다르면 공격 타입을 직접 고름)
const physTypeOf = (s, wt) => wt === '지팡이' ? '베기' : WT_ATK[wt] || '';
const atkTypeOf = s => (s.clsSel || clsOfWeapon(calcWeaponType())) === '마법' ? '마법' : ((s.atkType !== '마법' && s.atkType) || physTypeOf(s, calcWeaponType()));
const noTypeWhy = s => '공격 타입을 골라 주세요';
function zoneEffect(s) {
  const z = s.zoneT, el = s.elem, k = !!s.zone && ZONE_AWK.includes(z), t = atkTypeOf(s), none = el === '무속성';
  const E4 = { '열화진': ['불', '바람'], '수천진': ['물', '불'], '지열진': ['땅', '물'], '풍왕진': ['바람', '땅'] };
  const TY = { '황참진': '베기', '순돌진': '찌르기', '굉타진': '타격', '환마진': '마법' };
  const SKY = ['불', '물', '땅', '바람'], MEI = ['번개', '그림자', '결정'];
  const r = (v, why) => ({ v, why, k });
  if (!z) return r(0, '');
  if (E4[z]) { const [up, dn] = E4[z]; return el === up ? r(k ? 100 : 50, `${up} 속성`) : el === dn ? r(-50, `${dn} 속성`) : r(0, `${el}에는 효과 없음`); }
  if (z === '초뢰진') return el === '번개' ? r(k ? 60 : 30, '번개 속성') : el === '그림자' ? r(-30, '그림자 속성') : r(0, `${el}에는 효과 없음`);
  if (z === '각음진') {
    if (none) return r(0, '무속성에는 효과 없음');
    const res = s.aff === '저항';
    return el === '그림자' ? r(res ? (k ? 200 : 100) : (k ? 100 : 50), '그림자 속성' + (res ? ' · 저항 시' : ''))
      : r(res ? (k ? 90 : 60) : 30, '그림자 외 속성' + (res ? ' · 저항 시' : ''));
  }
  if (z === '휘정진') {
    if (none) return r(0, '무속성에는 효과 없음');
    const wk = s.aff === '약점';
    return el === '결정' ? r(wk ? (k ? 220 : 110) : (k ? 60 : 30), '결정 속성' + (wk ? ' · 약점 시' : ''))
      : r(wk ? (k ? 130 : 50) : -30, '결정 외 속성' + (wk ? ' · 약점 시' : ''));
  }
  if (TY[z]) return !t ? r(0, noTypeWhy(s)) : t === TY[z] ? r(k ? 60 : 30, `${t} 타입`) : r(k ? -60 : -30, `${t} 타입`);
  if (z === '쌍격진 참돌') return !t ? r(0, noTypeWhy(s)) : ['베기', '찌르기'].includes(t) ? r(k ? 60 : 30, `${t} 타입`) : r(-30, `${t} 타입`);
  if (z === '쌍격진 참마') return !t ? r(0, noTypeWhy(s)) : ['베기', '마법'].includes(t) ? r(30, `${t} 타입`) : r(-30, `${t} 타입`);
  if (z === '섬격진') return r(30, '모든 타입');
  if (z === '월광진') return MEI.includes(el) ? r(30, `${el} 속성`) : SKY.includes(el) ? r(-30, `${el} 속성`) : r(0, '무속성에는 효과 없음');
  if (z === '견수진') return r(-50, '모든 가하는 대미지');
  if (z === '성해진') return s.afGauge >= 100 ? r(100, '어나더 포스 게이지 100%') : r(0, '어나더 포스 게이지 100%일 때만');
  return r(0, '');
}

// 장착 장비 목록(무기 → 방어구 → 배지 순) → 계산기 입력
function buildInput(items, s) {
  const phys = PHYS.includes(s.kind);
  const st = { str: s.str, int: s.int, spd: s.spd, luck: s.luck, mp: s.mp, end: 0, spr: 0 };   // end·spr = 장비가 주는 내구·정신 (솔선용)

  const rows = {}; const push = (r, v) => { (rows[r] = rows[r] || []).push(v); };
  let crit = (phys ? s.bCrit : s.bMcrit); const cpow = [], elemE = [];
  const uniq = {};
  let atk = 0, mag = 0;
  for (const it of items) {
    if (it.slot === 'weapon') { atk = it.atk || 0; mag = it.mag || 0; }
    for (const e of it.fx) {
      if (!interpret(e, s, phys)[1]) continue;
      if (UNIQUE[e.k]) {
        const key = e.k === 'enh' ? e.cond : e.k;
        const v = e.k === 'enemies' ? e.per * (s.enemies - 1) : e.v;
        if (!uniq[key] || v > uniq[key].v) uniq[key] = { k: e.k, v };
        continue;
      }
      switch (e.k) {
        case 'stat': st[e.s] += Math.floor(fv(e.v, s)); break;
        case 'crit': case 'mcrit': crit += e.v; break;
        case 'cpow': case 'mcpow': cpow.push(e.v); break;
        case 'elem': elemE.push(fv(e.v, s)); break;
        case 'hp': push(36, e.v); break;
        case 'normal': push(37, e.v); break;
        case 'tstat': push(40, e.v); break;
        case 'fallen': push(42, Math.min(e.per * s.fallen, e.max)); break;
        case 'zone': push(49, e.v); break;
        case 'zonet': push(50, e.v); break;
        case 'fateally': push(51, e.per * (e.who === '명' ? s.meiAllies : s.fateAllies)); break;
        case 'gekoku': push(52, e.d); break;
        case 'growth': push(53, Math.min(e.per * s.turns, e.max)); break;
        case 'wins': push(55, e.v); break;
        case 'mppct': push(19, e.v); break;
      }
    }
  }
  if (phys) crit += st.luck / 16;
  // ZONE 자체 효과 + ZONE 어빌리티 (계산기 56행 'ZONE, ZONE 어빌리티', 합산)
  if (!['회복', '치유'].includes(s.kind)) { const z = zoneEffect(s); if (z.v) push(56, z.v); }
  if (s.zoneT && s.zoneAb) push(56, s.zoneAb);
  // 파티원 P글래스터(공명의 힘·격진의 힘 포함)는 itemsWith에서 장비 효과로 더해짐
  for (const key in uniq) {
    const u = uniq[key];
    if (u.k === 'enh') push(41, u.v);
    else if (u.k === 'mpatk' || u.k === 'enemies') push(43, u.v);
  }
  // 다른 아군의 P글래스터 대미지 증가 (장비 효과, 계산기 43행 공격 대미지 UP)
  if (s.pDmg && s.pMode !== 'pick') push(43, s.pDmg);
  if (s.pElem && s.pMode !== 'pick') elemE.push(s.pElem);   // P글래 속성 공격 (직접 입력, 계산기 35행)
  // P글래 선택 모드: 적용 합에 직접 더하는 값
  if (s.pMode === 'pick') { if (s.pAddDmg) push(43, s.pAddDmg); if (s.pAddElem) elemE.push(s.pAddElem); }
  const skUp = s.skMul > 0 ? Math.round((s.skMul - 1) * 1e8) / 1e6 : 0;   // n배 → 증가 % (부동소수 오차 제거)
  if (skUp) push(25, skUp);   // 스킬 위력 강화 (스킬 자체 위력 증가·필살기 위력 UP·모드 체인지 합) — 25행, 합연산
  const one = v => [v, null, null, null];
  const R = {};
  for (const r in rows) R[r] = rows[r].slice();
  if (R[52]) R[52] = R[52].slice(0, 2);
  if (R[55]) R[55] = one(Math.max(...R[55]));
  if (uniq.weak) R[26] = one(uniq.weak.v);
  if (uniq.aim) R[48] = one(uniq.aim.v);
  if (elemE.length) R[35] = elemE.slice();
  const cpX = phys ? s.bCpow : s.bMcpow;   // 기타 보정: 물리는 크리티컬 위력, 마법은 마법 크리티컬 위력
  const cp = cpow.concat(cpX ? [cpX] : []); if (cp.length) R[46] = cp;
  [[20, s.bStr], [21, s.bInt], [22, s.bSpd], [23, s.bDef], [24, s.bMdef], [27, s.bRes], [28, s.bERes], [29, s.bElemNE], [33, s.bWield]].forEach(([r, v]) => { if (v) R[r] = one(v); });
  if (s.bCombo && s.bCombo !== 100) R[34] = one(s.bCombo);
  // 정신 통일·심기일체(최대 MP × 계수), 호시탐탐 — 계산기 30·31행
  // 정신 통일은 마법 공격에만, 심기일체는 물리 공격에만 적용
  const cu = [s.cu1 && !phys ? s.cu1v : null, s.cu2 && phys ? s.cu2v : null];
  if (cu.some(v => v !== null)) R[30] = cu.concat([null, null]);
  if (s.hoshi) R[31] = one(s.hoshi);
  if (s.bGeko > 0) R[32] = one(s.bGeko);   // 하극상 (버프, Not E) — 계산기 32행
  // 루나틱 (계산기 44행: 결사 → 심안 순서)
  // 루나틱 솔선: 초기 내구만큼 힘, 초기 정신만큼 지능 증가 — 초기 스탯이 아닌 상태 효과 고정값 (계산기 14·15행)
  //  → 공격·마력에는 반영, (1+힘/32) 배율과 속성 보정에는 미반영, 약점 계산에는 반영
  // 기타 합(힘·지능)도 같은 상태 효과 고정값으로 처리
  const sol = lunatic.find(x => x.t === '솔선');
  // 솔선의 초기 내구·정신 = 캐릭터 값(장비 제외) + 장착 장비가 주는 내구·정신
  const solEq = sol ? (sol.eqManual ? { end: +sol.eqEnd || 0, spr: +sol.eqSpr || 0 } : { end: st.end, spr: st.spr }) : null;
  const fx14 = [s.gStr, sol ? +sol.end + solEq.end : 0].filter(v => v), fx15 = [s.gInt, sol ? +sol.spr + solEq.spr : 0].filter(v => v);
  if (fx14.length) R[14] = fx14.concat([null, null, null, null]).slice(0, 4);
  if (fx15.length) R[15] = fx15.concat([null, null, null, null]).slice(0, 4);
  if (s.gSpd) R[16] = [s.gSpd, null, null, null];
  // 결사: 대미지 ×1.7 + 크리티컬 확정 / 심안: 대미지 ×1.5 + 약점 배율 +1
  const kessa = lunatic.some(x => x.t === '결사'), shinan = lunatic.some(x => x.t === '심안');
  if (kessa || shinan) R[44] = [kessa ? 70 : null, shinan ? 50 : null];
  if (shinan && s.aff === '약점') R[26] = (R[26] || []).filter(v => v !== null).concat([100]);   // 약점 배율 +1 (계산기 26행)
  if (s.bWeak) R[26] = (R[26] || []).filter(v => v !== null).concat([s.bWeak]);   // 기타 보정: 약점 배율 증가 (계산기 26행)
  // MP 최대치 % U/D (계산기 19행): 전투 조건 + 배지의 MP % (최대 4칸, 감쇠 연산)
  const mpList = (s.mpPct ? [s.mpPct] : []).concat(rows[19] || []).slice(0, 4);
  if (mpList.length) R[19] = mpList.concat([null, null, null, null]).slice(0, 4); else delete R[19];
  if (s.mpFix) R[13] = one(s.mpFix);   // MP 최대치 고정값 U/D (계산기 13행)
  const inp = {
    D3: '아군', D4: st.mp, D5: st.str + atk + s.atkAdj, D6: st.int + mag + s.magAdj, D7: st.str, D8: st.int, D9: st.spd, D10: st.luck,
    G3: s.range, G4: s.elem === '무속성' ? '무속성' : '속성', G5: s.kind, G6: s.power,
    J3: s.tlv, J4: s.tdef, J5: s.tmdef, J6: s.aff, F67: 'ON', FM: s.bFinal > 0 ? +s.bFinal : 1, rows: R };   // FM: 최종 대미지 배율 (비우거나 0이면 1배)
  return { inp, crit: lunatic.some(x => x.t === '결사') ? 100 : Math.max(0, Math.min(100, crit)) };   // 결사: 크리티컬 확정
}

const MULTI_UP = { 1: 0, 2: 25, 3: 50, 4: 100, 5: 200 };   // 다단 강화: n번째 Hit 위력 UP %
function evalBuild(items, s) {
  // 스킬 종류가 '무기 기준 (자동)'이면 이 조합의 무기(후보 무기 포함)로 정함
  if (s.kindAuto) { const w = items.find(it => it.slot === 'weapon'); const k = kindFor(s, w ? w.t : baseType()); if (k !== s.kind) s = Object.assign({}, s, { kind: k }); }
  const b = buildInput(items, s), r = AECalc.calc(b.inp);
  const h = Math.max(1, s.hits), p = b.crit / 100;
  const mpP = b.inp.rows[19] ? Math.max(-100, Math.min(100, AECalc.decay(b.inp.rows[19]).reduce((x, y) => x + y, 0))) : 0;
  const mpB = b.inp.D4 + (b.inp.rows[13] ? AECalc.rd(b.inp.rows[13][0], 0) : 0);
  const mpEff = mpB + AECalc.rd(mpB * mpP / 100, 0);   // 버프 적용 최대 MP (계산기와 같은 방식)
  // 다단 강화: Hit마다 위력 UP이 달라서 (1타 +0 · 2타 +25 · 3타 +50 · 4타 +100 · 5타~ +200%) 타마다 따로 계산해 더함 — 25행에 합연산
  const hitR = [r];
  if (s.bMulti && h > 1) {
    const memo = { 0: r };
    for (let i = 2; i <= h; i++) {
      const u = MULTI_UP[Math.min(i, 5)];
      if (!memo[u]) { const rows = Object.assign({}, b.inp.rows); rows[25] = (rows[25] || []).filter(v => v !== null && v !== undefined).concat([u]); memo[u] = AECalc.calc(Object.assign({}, b.inp, { rows })); }
      hitR.push(memo[u]);
    }
  } else for (let i = 2; i <= h; i++) hitR.push(r);
  const tot = f => hitR.reduce((a, x) => a + f(x), 0);
  const out = { r, sp: (r.V30 - 1) * 100, gk: (r.V52 - 1) * 100, mp: mpEff, crit: b.crit, n: tot(x => x.n.avg), c: tot(x => x.c.avg), max: tot(x => x.c.max), exp: tot(x => x.n.avg * (1 - p) + x.c.avg * p) };
  // 25억 초과 경감 전 대미지 (경감이 걸린 경우에만 다시 계산)
  if (hitR.some(x => Math.max(x.n.max, x.c.max) >= 2.5e9)) {
    const r0 = AECalc.calc(Object.assign({}, b.inp, { F67: 'OFF' }));
    const hr0 = s.bMulti && h > 1 ? hitR.map((x, i) => i === 0 ? r0 : AECalc.calc(Object.assign({}, b.inp, { F67: 'OFF', rows: Object.assign({}, b.inp.rows, { 25: (b.inp.rows[25] || []).filter(v => v !== null && v !== undefined).concat([MULTI_UP[Math.min(i + 1, 5)]]) }) }))) : hitR.map(() => r0);
    out.raw = { n: hr0.reduce((a, x) => a + x.n.avg, 0), c: hr0.reduce((a, x) => a + x.c.avg, 0), exp: hr0.reduce((a, x) => a + x.n.avg * (1 - p) + x.c.avg * p, 0) };
  }
  return out;
}
