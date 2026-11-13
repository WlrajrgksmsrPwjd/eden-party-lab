/* 화면 점검: dist/index.html 을 휴대폰(390px)·데스크톱(1280px) 크기로 열어 탭을 전부 눌러 보고
   페이지 오류·콘솔 오류·가로 넘침을 출력한다. 'errors []' 세 줄이면 통과. 첫 계산 때문에 몇 분 걸림.
   playwright 필요(npm i -g playwright && npx playwright install chromium).
   사용: NODE_PATH=$(npm root -g) node src/tools/smoke.js   (브라우저 경로를 정하려면 CHROMIUM=/경로) */
const {chromium} = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const srv = http.createServer((q, s) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '')); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end(); return; } s.writeHead(200, {'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'}); fs.createReadStream(f).pipe(s); });
srv.listen(0, '127.0.0.1', async () => {
  const port = srv.address().port; let fail = 0;
  const b = await chromium.launch(process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {});
  for (const vp of [{w: 390, h: 844}, {w: 1280, h: 900}]) {
    const p = await b.newPage({viewport: {width: vp.w, height: vp.h}});
    const errs = []; p.on('pageerror', e => errs.push('PAGE ' + String(e).slice(0, 200))); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('CON ' + m.text().slice(0, 200)); });
    await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await p.addInitScript(() => { try { localStorage.setItem('aeopt_guide', '1'); } catch (e) {} });
    await p.goto(`http://127.0.0.1:${port}/dist/index.html`); await p.waitForSelector('#results .card', {timeout: 600000});
    for (const t of ['roster', 'boss', 'goal', 'perchar', 'focus', 'db', 'method', 'plan']) {
      await p.evaluate(tab => { const el = document.querySelector(`.tab[data-tab="${tab}"]`); if (el) el.click(); }, t); await p.waitForTimeout(t === 'perchar' || t === 'focus' ? 1500 : 700);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ov > 2) errs.push('OVERFLOW ' + t + ' ' + ov);
    }
    /* 보스 탭에서 보스 하나, DB 탭에서 캐릭터 하나, 결과 카드 자세히 열기 */
    await p.evaluate(() => { document.querySelector('.tab[data-tab="boss"]').click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => { const it = document.querySelector('#bossList .bossitem, #bossList button'); if (it) it.click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => { document.querySelector('.tab[data-tab="db"]').click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => { const it = document.querySelector('.dbi'); if (it) it.click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => { document.querySelector('.tab[data-tab="plan"]').click(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { document.querySelectorAll('#results .card details').forEach(d => d.open = true); const m = document.querySelector('#results .mem'); if (m) m.click(); }); await p.waitForTimeout(1500);
    console.log(vp.w, 'errors', JSON.stringify(errs.slice(0, 10))); fail += errs.length;
    await p.close();
  }
  const p2 = await b.newPage({viewport: {width: 390, height: 844}}); const e2 = []; p2.on('pageerror', e => e2.push(String(e).slice(0, 200)));
  await p2.goto(`http://127.0.0.1:${port}/dist/builder.html`); await p2.waitForTimeout(3000); console.log('builder errors', JSON.stringify(e2.slice(0, 5))); fail += e2.length;
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
