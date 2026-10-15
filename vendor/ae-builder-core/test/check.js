// 코어 검사: 앱에서 계산해 둔 정답표(golden.json)와 같은 값이 나오는지 (Node만 있으면 됨)
// 사용: node test/check.js   (--quick 또는 OPT=0 이면 최적 빌드 검사는 건너뜀 — 한 개에 10초쯤)
const path = require('path');
const C = require(path.join(__dirname, '../ae-core.js'));
const G = require('./golden.json');
const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
(async () => {
  let bad = 0;
  G.eval.forEach((g, i) => {
    const r = C.evaluate(g.state);
    const ok = near(r.exp, g.exp) && near(r.n, g.n) && near(r.c, g.c) && near(r.max, g.max) && r.crit === g.crit && r.per.length === g.per.length && r.per.every((x, j) => near(x.exp, g.per[j][0]) && near(x.raw, g.per[j][1]));
    if (!ok) { bad++; if (bad <= 10) console.log(`대미지 #${i}: 코어 ${r.exp} ≠ 앱 ${g.exp}`); }
  });
  console.log(`대미지: ${G.eval.length}개 중 불일치 ${bad}`);
  let badO = 0;
  if (process.env.OPT !== '0' && !process.argv.includes('--quick')) for (const [i, g] of G.opt.entries()) {
    const t = Date.now(), r = await C.optimize(g.state, g.opt);
    const same = near(r.best.value, g.value) && Object.keys(g.equip).every(k => (r.best.equip[k] || null) === (g.equip[k] || null)) && Object.keys(g.ore).every(k => (r.best.ore[k] || '') === (g.ore[k] || ''));
    if (!same) badO++;
    console.log(`최적 빌드 #${i} (${g.opt.metric}${g.opt.pins ? ', 고정 1' : ''}): ${same ? '같음' : `다름 — 코어 ${r.best.value} / 앱 ${g.value}`} · 계산 ${r.evals}회 · ${((Date.now() - t) / 1000).toFixed(1)}초`);
  }
  process.exit(bad || badO ? 1 : 0);
})();
