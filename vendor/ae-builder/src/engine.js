// AE 대미지 계산기 v4.016 (원작자: 딩) '계산기' 시트의 JS 이식판 — 출처를 남겨 주세요
// inp: { D3..D10, G3..G6, J3..J6, F67, FM, rows: {13:[F,G,H,I], ...} } (빈칸은 null, 행 번호 = v4.016 계산기 시트 행)
(function (root) {
  // Excel처럼 유효숫자 15자리로 맞춘 뒤 자르기 (예: 760400×(1.005−1)=3801.99999999992 → 3801)
  const p15 = v => Number(v.toPrecision(15));
  function rd(x, n) { // Excel ROUNDDOWN (0 방향 절사)
    const p = Math.pow(10, n || 0);
    return Math.trunc(p15(x * p)) / p;
  }
  function ru(x, n) { // Excel ROUNDUP (0에서 멀어지는 방향)
    const p = Math.pow(10, n || 0), v = p15(x * p);
    return (v > 0 ? Math.ceil(v) : Math.floor(v)) / p;
  }
  const nums = a => (a || []).filter(v => v !== null && v !== undefined && v !== '').map(Number);
  const sum = a => nums(a).reduce((s, v) => s + v, 0);
  function large(a, k) { const s = nums(a).sort((x, y) => y - x); return s[k - 1]; }
  function small(a, k) { const s = nums(a).sort((x, y) => x - y); return s[k - 1]; }
  // 감쇠 연산 W..Z (19~24, 27~29, 33, 58행)
  function decay(cells) {
    const n = nums(cells).length, pos = nums(cells).filter(v => v > 0).length;
    const out = [0, 0, 0, 0];
    if (n < 1) return out;
    out[0] = pos >= 1 ? rd(large(cells, 1), 2) : rd(small(cells, 1), 2);
    for (let k = 2; k <= 4; k++) {
      if (n < k) { out[k - 1] = 0; continue; }
      const prev = out[k - 2];
      if (pos >= k) out[k - 1] = rd(prev * rd(large(cells, k), 2) / 100, 2);
      else out[k - 1] = rd(pos === k - 1 ? small(cells, 1) : prev * (-1) * rd(small(cells, k - pos), 2) / 100, 2);
    }
    return out;
  }
  function decayV(cells, lo, hi) { return 1 + Math.max(lo, Math.min(hi, sum(decay(cells)))) / 100; }

  function calc(inp) {
    const R = r => inp.rows[r] || [null, null, null, null];
    const G5 = inp.G5, G4 = inp.G4, G3 = inp.G3, D3 = inp.D3 || '아군';
    const D4 = +inp.D4, D5 = +inp.D5, D6 = +inp.D6, D7 = +inp.D7, D8 = +inp.D8, D9 = +inp.D9;
    const J3 = +inp.J3, J4 = +inp.J4, J5 = +inp.J5, J6 = inp.J6;
    const W = r => R(r).map(v => (v === null || v === undefined || v === '') ? 0 : rd(+v, 0));
    const fixed = r => W(r).reduce((s, v) => s + v, 0); // SUM(W:Z) 고정값
    const V19 = decayV(R(19), -100, 100), V20 = decayV(R(20), -100, 100), V21 = decayV(R(21), -100, 100), V22 = decayV(R(22), -100, 100);
    const V23 = decayV(R(23), -100, 100), V24 = decayV(R(24), -100, 100);
    const in_ = (...xs) => xs.includes(G5);
    const fx = (base, r, V) => base + fixed(r) + rd((base + fixed(r)) * (V - 1), 0);
    let X3, X4, X5, X6, X7, X8;
    if (in_('물리공격', '힘기반 마법', '페인')) X3 = D7; else if (in_('마법공격', '지능기반 물리', '독')) X3 = D8; else if (in_('속도기반 물리', '속도기반 마법')) X3 = fx(D9, 16, V22); else X3 = false;
    if (in_('물리공격', '힘기반 마법', '페인')) X4 = fx(D7, 14, V20); else if (in_('마법공격', '지능기반 물리', '독', '회복', '치유')) X4 = fx(D8, 15, V21); else if (in_('속도기반 물리', '속도기반 마법')) X4 = fx(D9, 16, V22); else X4 = false;
    if (in_('물리공격', '힘기반 마법', '페인')) X5 = fx(D5, 14, V20); else if (in_('마법공격', '지능기반 물리', '독')) X5 = fx(D6, 15, V21); else if (in_('속도기반 물리', '속도기반 마법')) X5 = fx(D5 - D7 + D9, 16, V22); else X5 = false;
    if (in_('물리공격', '속도기반 물리')) X6 = D6; else if (in_('마법공격', '힘기반 마법', '속도기반 마법', '지능기반 물리')) X6 = D8; else X6 = false;
    if (in_('물리공격', '회복', '치유')) X7 = fx(D8, 15, V21) + D6 - D8; else if (G5 === '지능기반 물리') X7 = fx(D8, 15, V21); else if (in_('속도기반 물리', '속도기반 마법')) X7 = fx(D9, 16, V22) + D6 - D8; else X7 = false;
    if (in_('물리공격', '지능기반 물리', '속도기반 물리', '페인')) X8 = '물리'; else if (in_('마법공격', '힘기반 마법', '속도기반 마법', '독')) X8 = '마법'; else if (G5 === '회복') X8 = '회복'; else X8 = '치유';
    const def = X8 === '물리' ? fx(J4, 17, V23) : fx(J5, 18, V24);
    const X10 = (X8 === '물리' || X8 === '마법') ? (X5 - def / 2) * (1 + (D3 === '아군' ? X3 : X4) / 32) * 1.75 : (1 + X4 / 64) * Math.sqrt(2 * X7) * 6.5;
    const X11 = (X8 === '물리' || X8 === '마법') ? (X5 - def / 4) * (1 + (D3 === '아군' ? X3 : X4) / 32) * 3.25 : 0;
    const X12 = 1 + (G4 === '무속성' ? 0 : (ru(Math.sqrt((D3 === '아군' ? X6 : (X6 + fixed(15) + rd((X6 + fixed(15)) * (V21 - 1), 0))) * 10 + 16), 5) - 4) / 64);
    // 위력
    const G6 = +inp.G6;
    // v4.016: 위력 % UP은 합연산 — ROUNDDOWN(ROUNDUP(위력) × (1 + 합/100))
    const W25 = sum(R(25).map(v => rd(+(v || 0), 2) / 100));
    const V25 = rd(ru(G6, 0) * (1 + W25), 0) / 100;
    let V26;
    if (in_('독', '페인', '회복', '치유')) V26 = 1;
    else if (J6 === '약점') V26 = (X8 === '마법' ? 2 : 1.85 + (X7 + Math.pow(2 * X7, 0.5)) / 512) + sum(R(26)) / 100;
    else V26 = { '통상': 1, '저항': 0.25, '무효': 0, '흡수': 0.5 }[J6];
    V26 = rd(V26, 4);
    const V27 = 1 - Math.max(-100, Math.min(100, sum(decay(R(27))))) / 100;
    const V28 = 1 - (G4 === '무속성' ? 0 : Math.max(-100, Math.min(100, sum(decay(R(28))))) / 100);
    const V29 = decayV(R(29), -100, 100);
    // 30~32행 상태(NE)
    const mpTot = D4 + fixed(13) + rd((D4 + fixed(13)) * (V19 - 1), 0);
    const r30 = R(30), r31 = R(31), r32 = R(32);
    const blank = v => v === null || v === undefined || v === '';
    const wx = [];
    [0, 1].forEach(i => { if (!blank(r30[i])) wx.push(Math.min(250, mpTot * rd(+r30[i], 2))); });
    [0, 1].forEach(i => { if (!blank(r31[i])) wx.push(rd(+r31[i], 2)); });
    [0, 1].forEach(i => { if (!blank(r32[i])) { const d = +r32[i]; wx.push(Math.min(100, rd(d ? J3 * J3 / d : 0, 2))); } });
    // decay over up to 6 values (Y30,Y31,Y32,Z30,Z31,Z32)
    function decayN(vals, m) {
      const n = vals.length, pos = vals.filter(v => v > 0).length, out = [];
      const L = k => vals.slice().sort((a, b) => b - a)[k - 1], S = k => vals.slice().sort((a, b) => a - b)[k - 1];
      for (let k = 1; k <= m; k++) {
        if (n < k) { out.push(0); continue; }
        if (k === 1) { out.push(pos >= 1 ? rd(L(1), 2) : rd(S(1), 2)); continue; }
        const prev = out[k - 2];
        if (pos >= k) out.push(rd(prev * rd(L(k), 2) / 100, 2));
        else out.push(rd(pos === k - 1 ? S(1) : prev * (-1) * rd(S(k - pos), 2) / 100, 2));
      }
      return out;
    }
    // 시트에서는 W30:X32(빈칸 포함 6칸, 빈 칸은 수식 결과 0이 아닌 값으로 존재) — COUNTA가 수식 셀을 모두 셈
    const wxAll = [];
    for (const r of [30, 31, 32]) for (const i of [0, 1]) {
      const v = R(r)[i];
      if (r === 30) wxAll.push(Math.min(250, mpTot * rd(+(v || 0), 2)));
      else if (r === 31) wxAll.push(rd(+(v || 0), 2));
      else { const d = +(v || 0); wxAll.push(Math.min(100, rd(d ? J3 * J3 / d : 0, 2))); }
    }
    const V30 = 1 + Math.max(-100, Math.min(350, sum(decayN(wxAll, 6)))) / 100;
    const V33 = decayV(R(33), -100, 100);
    const f34 = R(34)[0];
    const V34 = (!blank(f34) && +f34 !== 0) ? +f34 / 100 : 1;
    const W35 = sum(R(35).map(v => rd(+(v || 0), 2))) / 100;
    const H36 = R(36).map(v => rd(+(v || 0), 2) / 100), H37 = R(37).map(v => rd(+(v || 0), 2) / 100);
    const W38 = sum(R(38).map(v => rd(+(v || 0), 2))) / 100;
    const mul = r => R(r).map(v => 1 + rd(+(v || 0), 2) / 100);
    const M39 = mul(39), M40 = mul(40), M41 = mul(41), M43 = mul(43), M45 = mul(45), M57 = mul(57), M65 = mul(65);
    const W42 = 1 + sum(R(42).map(v => rd(+(v || 0), 2))) / 100;
    const M44 = mul(44);
    const sumV = r => 1 + sum(R(r).map(v => rd(+(v || 0), 2))) / 100;
    const V46 = sumV(46), V49 = sumV(49), V50 = sumV(50), V51 = sumV(51), V56 = sumV(56);
    const one = r => 1 + rd(+(R(r)[0] || 0), 2) / 100;
    const V47 = one(47), V48 = one(48), V55 = one(55), V60 = one(60), V62 = one(62), V63 = one(63), V64 = one(64);   // v4.016 행 번호 (59행 피격 대미지 감소 추가로 한 칸씩 밀림)
    const w52 = [0, 1].map(i => { const d = +(R(52)[i] || 0); return rd(d ? J3 * J3 / d : 0, 2); });
    const V52 = 1 + sum(decayN(w52, 2)) / 100;
    const H53 = R(53).map(v => rd(+(v || 0), 2) / 100), H54 = R(54).map(v => rd(+(v || 0), 2) / 100);
    const V58 = decayV(R(58), -100, 100), V59 = decayV(R(59), -100, 100);   // 59: 피격 대미지 감소 (오라와 같은 감쇠 연산)
    const V61 = G3 === '단일' ? 1.1 : 1;
    const W66 = rd(+(R(66)[0] || 0), 0);
    const F67 = inp.F67 || inp.F66 || 'ON';
    const pp = in_('독', '페인');

    function pipeline(crit, seed) {
      const AD = crit ? X11 : X10;
      let AH;
      if (X8 === '물리' || X8 === '마법') AH = X5 * seed / 25.6; else AH = Math.sqrt(2 * X7) * seed / 5.12;
      const AJ = rd(AH === 0 ? 0 : (Math.max(1, AD * X12) + AH) * V25, 0);
      let v = rd(AJ * V26, 0);
      v = v + rd(v * (V27 - 1), 0) + rd(v * (V28 - 1), 0);
      v = G5 === '회복' ? AJ : v + rd(v * (V29 - 1), 0);
      v = v + rd(v * (V30 - 1), 0);
      v = v + rd(v * (V33 - 1), 0);
      v = rd(v * V34, 0);
      let a = v + rd(v * W35, 0); for (const h of H36) a += rd(v * h, 0); for (const h of H37) a += rd(v * h, 0); v = a;
      v = v + rd(v * W38, 0);
      for (const m of M39) v = v + rd(v * (m - 1), 0);
      for (const m of M40) v = v + rd(v * (m - 1), 0);
      for (const m of M41) v = v + rd(v * (m - 1), 0);
      v = v + rd(v * (W42 - 1), 0);
      for (const m of M43) v = v + rd(v * (m - 1), 0);
      v = v + rd(v * (M44[0] - 1), 0); v = v + rd(v * (M44[1] - 1), 0);
      for (const m of M45) v = v + rd(v * (m - 1), 0);
      v = v + rd(v * (crit ? V46 - 1 : 0), 0);
      v = v + rd(v * (crit ? V47 - 1 : 0), 0);
      for (const m of [V48, V49, V50, V51, V52]) v = v + rd(v * (m - 1), 0);
      a = v; for (const h of H53) a += rd(v * h, 0); v = a;
      a = v; for (const h of H54) a += rd(v * h, 0); v = a;
      v = v + rd(v * (V55 - 1), 0);
      v = v + rd(v * (V56 - 1), 0);
      for (const m of M57) v = v + rd(v * (m - 1), 0);
      v = v + rd(v * (V58 - 1), 0);
      const CE = v;
      v = rd(v * V59, 0);   // 피격 대미지 감소
      v = rd(v * V60, 0);   // 배리어
      v = v + rd(v * (V61 - 1), 0);   // 단일 공격
      if (inp.FM && inp.FM !== 1) v = rd(v * inp.FM, 0);   // 최종 대미지 배율 (단일 공격 보정 뒤, 25억 경감 전)
      v = v + rd(v * (V62 - 1), 0);   // 브레이크
      v = pp ? AJ : v + rd(v * (V63 - 1), 0);   // 방패막이
      v = rd(v * V64, 0);   // 크리티컬 가드
      for (const m of M65) v = v + (pp ? rd(v * (m - 1), 0) : 0);
      v = v <= W66 ? 0 : v;
      let CP = v;
      if (!(F67 === 'OFF' || v < 2.5e9)) {
        if (v < 3.5e9) CP = 1.75e9 + rd(v * 0.3, 0); else if (v < 5e9) CP = 2.45e9 + rd(v * 0.1, 0);
        else if (v < 1e10) CP = 2.8e9 + rd(v * 0.03, 0); else if (v < 7e11) CP = 3e9 + rd(v * 0.01, 0); else CP = 9999999999;
      }
      return Math.max(0, (pp && crit) ? 0 : (G5 === '회복' ? CE : (G5 === '치유' ? AJ : CP)));
    }
    const seedsN = X8 === '물리' ? range(16, 47) : X8 === '마법' ? range(32, 94) : range(56, 71);
    const seedsC = X8 === '물리' ? range(16, 47) : range(32, 94);
    const normal = seedsN.map(s => pipeline(false, s));
    const critL = (X8 === '회복' || X8 === '치유') ? seedsC.map(() => 0) : seedsC.map(s => pipeline(true, s));
    const st = a => ({ min: Math.min(...a), avg: a.reduce((s, v) => s + v, 0) / a.length, max: Math.max(...a) });
    return { kind: X8, normal, crit: critL, n: st(normal), c: st(critL), X10, X11, X12, V26, V30, V52 };
  }
  function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
  root.AECalc = { calc, rd, decay };
  if (typeof module !== 'undefined') module.exports = { calc, rd, decay };
})(typeof window !== 'undefined' ? window : globalThis);
