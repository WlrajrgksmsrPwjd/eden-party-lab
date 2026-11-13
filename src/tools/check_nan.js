/* 엔진 전수 점검: 캐릭터마다 (그 캐릭터 + 채우기 3명) 조합을 종합·최고점 두 성향으로 evalTeam 해서
   숫자가 NaN·무한·음수이거나 오류가 나는 조합을 찾는다. 'bad 0'이면 통과. 약 5분.
   먼저 python3 -I src/build.py 로 dist/index.html 을 만들어 둘 것.   사용: node src/tools/check_nan.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'src', 'engine.js'));
const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const chars = JSON.parse(html.match(/<script type="application\/json" id="db-chars">([\s\S]*?)<\/script>/)[1]);
const prepped = chars.map(E.prepChar), byId = new Map(prepped.map(p => [p.id, p]));
const S = Object.assign({}, E.DEFAULT_SETTINGS), cap = E.computeCap(prepped, S);
const P = id => E.charProg(byId.get(id), {t: 80, s: true, m: 0, g: 'none', gl: null}, S);
const owned = chars.filter(c => c.tier === 'SS' || c.tier === 'S').map(c => ({pc: byId.get(c.id), prog: P(c.id)}));
const fillers = [['eleanor', 'havoc', 'nekoko_es'], ['shigure_es', 'hismena_es', 'matsurika'], ['velette_as', 'victor', 'pizzica']];
let bad = 0, n = 0; const t0 = Date.now();
for (const mode of ['all', 'burst']) {
  const ctx = E.buildCtx({mode}, owned); ctx.mode = mode; ctx.timeline = true; ctx.dummyFast = false;
  for (const c of chars) {
    if (c.id.startsWith('_')) continue;
    const fl = fillers[n % 3].filter(x => x !== c.id && !E.dupBase([byId.get(x), byId.get(c.id)])).slice(0, 3);
    if (fl.length < 3) fl.push('jilfany_as');
    const ids = [c.id].concat(fl).slice(0, 4); n++;
    try {
      const e = E.evalTeam(ids.map(i => byId.get(i)), ids.map(P), null, S, cap, ctx);
      const vals = {burst: e.burst, sustain: e.sustain, surv: e.surv, dummy: e.dummyT || 0, af: e.af, normal: e.normal && e.normal.total};
      const nf = Object.entries(vals).filter(([k, v]) => !(typeof v === 'number' && isFinite(v) && v >= 0));
      const per = (e.bsim && e.bsim.per || []).concat(e.dummy && e.dummy.per || []).some(v => !isFinite(v) || v < 0);
      if (nf.length || per) { bad++; console.log('BAD', mode, ids.join('/'), JSON.stringify(nf), per ? 'per' : ''); }
    } catch (err) { bad++; console.log('ERR', mode, ids.join('/'), String(err && err.stack || err).split('\n').slice(0, 3).join(' | ')); }
  }
}
console.log('evaluated', n, 'bad', bad, Math.round((Date.now() - t0) / 1000) + 's');
process.exit(bad ? 1 : 0);
