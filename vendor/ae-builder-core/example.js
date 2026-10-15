// 사용 예시: node core/example.js
const AECore = require('./ae-core.js');

// 1) 장비 찾기 (이름 일부)
console.log(AECore.find('성천의 지팡이', { slot: 'weapon' }).slice(0, 3));

// 2) 상태 만들기 — settings 키는 FIELDS.md, 장비는 id 또는 정확한 이름
const state = {
  settings: { str: 237, int: 420, spd: 300, luck: 150, mp: 512, power: 250, hits: 3, elem: '불', aff: '약점', tlv: 140, tdef: 174, tmdef: 174 },
  weaponType: '지팡이',
  equip: { weapon: AECore.find('', { slot: 'weapon', type: '지팡이' })[0].id },
  lunatic: [{ t: '심안' }],
};

// 3) 대미지
const r = AECore.evaluate(state);
console.log('기대 대미지', Math.round(r.exp), '| 타수별', r.per.map(x => Math.round(x.exp)), '| 크리율', r.crit, '| 종류', r.kind);

// 4) 최적 빌드 (기대값 기준, 지팡이) — 진행 상황은 onTick, 멈추기는 AbortController (ctl.abort() → 그때까지 찾은 것 중 최선)
(async () => {
  const ctl = new AbortController(), t = Date.now(); let evals = 0;
  const p = AECore.optimize(state, { weaponType: '지팡이', metric: 'exp', signal: ctl.signal, onTick: n => { evals = n; } });
  try { AECore.evaluate(state); } catch (e) { console.log('(찾는 중 다른 호출은 막힘:', e.message + ')'); }
  const o = await p;
  console.log(`최적: ${Math.round(o.best.value)} (지금 ${Math.round(o.current)}) · 계산 ${o.evals}회 · ${((Date.now() - t) / 1000).toFixed(1)}초`);
  console.log(o.best.names);
  // 5) 찾은 빌드의 능력치·적용 효과
  const d = AECore.detail(o.best, state);
  console.log('공격', d.atk, '마력', d.mag, '지능', d.int, '| 적용 행:', d.rows.map(x => x.join(' ')).join(' / '));
})();
