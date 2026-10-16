/* 처음 방문(예시 보유) 편성 결과를 미리 계산해 src/data/sample_cache.json에 저장한다 → 다시 빌드하면 첫 화면이 바로 뜬다.
   쓰는 법: python3 -I src/build.py && node src/tools/sample_cache.js && python3 -I src/build.py
   (playwright 필요. 엔진·데이터가 바뀌어 계산 버전이 다르면 앱은 이 파일을 무시하고 직접 계산한다) */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const TYPES = {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.json':'application/json', '.css':'text/css'};
const srv = http.createServer((q, s)=>{
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); s.end(); return; }
  s.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(s);
});
srv.listen(0, '127.0.0.1', async ()=>{
  const port = srv.address().port;
  let chromium; try{ ({chromium} = require('playwright')); }catch(e){ console.error('playwright가 없습니다 (npm i -g playwright).'); process.exit(1); }
  const opts = fs.existsSync('/opt/pw-browsers/chromium') ? {executablePath:'/opt/pw-browsers/chromium'} : {};
  const b = await chromium.launch(opts), p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)/, r=>r.abort());
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${port}/index.html`);
  await p.waitForSelector('#results .card', {timeout: 30*60*1000});
  const got = await p.evaluate(()=>{ const ver = (document.querySelector('meta[name="eden-calc"]')||{}).content;
    const L = JSON.parse(localStorage.getItem('aeopt_rc1')||'[]'); const e = L.find(x=>x.b===ver); return e ? {b:e.b, k:e.k, lr:e.lr} : null; });
  await b.close(); srv.close();
  if(!got){ console.error('저장된 결과를 찾지 못했습니다(이미 같은 버전의 sample_cache가 들어 있으면 새로 계산하지 않음).'); process.exit(1); }
  fs.writeFileSync(path.join(ROOT, 'src', 'data', 'sample_cache.json'), JSON.stringify(got));
  console.log('sample_cache.json', got.b, Math.round((Date.now()-t0)/1000)+'초', '→ 다시 빌드하세요');
});
