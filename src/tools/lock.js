// 승인 코드 잠금(2026-10-17, 사용자 '내가 승인한 사람만 쓸 수 있게'):
// 빌드한 페이지(index.html·builder.html)를 통째로 압축·암호화(AES-256-GCM)하고, 승인 코드를 넣어야 브라우저 안에서 풀리는 잠금 화면을 만든다.
// 콘텐츠 키 K는 빌드마다 새로 만들고, 사람마다 코드로 만든 키(PBKDF2-SHA256)로 K를 감싸 넣는다 → 한 사람만 빼고 다시 빌드하면 그 코드는 더 이상 안 열림.
// 사용법: python3 -I src/build.py 가 dist/의 전체 페이지로 저장소 루트 index.html·builder.html(잠긴 것)을 만든다. 직접: node src/tools/lock.js
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..', '..');
const ACC = process.env.ACCESS || path.join(ROOT, 'access.json');
const SRC = path.join(ROOT, 'dist'), OUT = ROOT;
const ITER = 250000;
const norm = c => String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

if (!fs.existsSync(ACC)) { console.error('access.json이 없습니다 → node src/tools/access.js add "이름"'); process.exit(1); }
const users = (JSON.parse(fs.readFileSync(ACC, 'utf8')).users || []).filter(u => u && u.code);
if (!users.length) { console.error('승인된 사람이 없습니다 → node src/tools/access.js add "이름"'); process.exit(1); }

const K = crypto.randomBytes(32), salt = crypto.randomBytes(16);
const gcm = (key, data) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv); const ct = Buffer.concat([c.update(data), c.final()]); return Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64'); };
const keys = users.map(u => { const k = crypto.pbkdf2Sync(norm(u.code), salt, ITER, 32, 'sha256');
  return {id: crypto.createHash('sha256').update(k).digest('hex').slice(0, 12), w: gcm(k, K)}; })
  .sort((a, b) => a.id < b.id ? -1 : 1); // 넣은 순서로 누구인지 짐작하지 못하게

const page = (title, src) => {
  const html = fs.readFileSync(path.join(SRC, src), 'utf8');
  const payload = gcm(K, zlib.deflateRawSync(Buffer.from(html, 'utf8'), {level: 9}));
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#111936">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>${title}</title>
<style>
:root{--night:#111936;--night2:#1d2b5e;--gold:#c9a24a;--title:#f2e1af;--ink:#e9edf8}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(900px 420px at 50% -80px,#2a3a78,transparent 70%),linear-gradient(180deg,var(--night2),var(--night));color:var(--ink);font:15px/1.6 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;padding:16px}
.box{width:min(380px,100%);border:1px solid var(--gold);border-radius:12px;padding:26px 22px 22px;background:rgba(10,16,40,.55);box-shadow:inset 0 0 0 3px rgba(10,16,40,.55),inset 0 0 0 4px rgba(201,162,74,.35)}
h1{margin:0 0 6px;font-size:21px;color:var(--title);letter-spacing:.01em}
p{margin:0 0 16px;color:rgba(233,237,248,.78);font-size:13.5px}
label.c{display:block;font-weight:700;font-size:13px;margin-bottom:6px}
input[type=text]{width:100%;padding:11px 12px;border-radius:8px;border:1px solid rgba(201,162,74,.6);background:rgba(255,255,255,.06);color:#fff;font:600 16px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase}
input[type=text]:focus{outline:2px solid #e6c97a;outline-offset:1px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap}
.rem{display:flex;gap:6px;align-items:center;font-size:13px;color:rgba(233,237,248,.8)}
button{padding:10px 20px;border-radius:8px;border:1px solid var(--gold);background:linear-gradient(180deg,#2d4ea2,#1b2e6a);color:#fff;font:700 15px/1 inherit;cursor:pointer}
button:disabled{opacity:.6;cursor:default}
button:focus-visible{outline:2px solid #e6c97a;outline-offset:2px}
.msg{min-height:1.4em;margin-top:12px;font-size:13px;color:#f3c77a}
.foot{margin-top:18px;font-size:11.5px;color:rgba(233,237,248,.5)}
</style></head><body>
<form class="box" id="f" autocomplete="off">
  <h1>에덴 편성 연구실</h1>
  <p>승인된 사람만 쓸 수 있어요. 받은 승인 코드를 넣어 주세요.</p>
  <label class="c" for="k">승인 코드</label>
  <input type="text" id="k" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" required>
  <div class="row"><label class="rem"><input type="checkbox" id="r" checked> 이 기기에서 기억</label><button type="submit" id="b">열기</button></div>
  <div class="msg" id="m" role="status"></div>
  <div class="foot">코드가 없으면 운영자에게 요청하세요. 무단 복제·재배포 금지.</div>
</form>
<script>
(function(){
var S=${JSON.stringify(salt.toString('base64'))}, N=${ITER}, KEYS=${JSON.stringify(keys)}, P=${JSON.stringify(payload)}, LS='aeopt_ac';
var $=function(i){return document.getElementById(i)}, te=new TextEncoder();
function b64(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function norm(c){return String(c||'').toUpperCase().replace(/[^0-9A-Z]/g,'')}
function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(x){return(x<16?'0':'')+x.toString(16)}).join('')}
async function dec(keyBytes,blob){var u=b64(blob),k=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['decrypt']);return crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(0,12)},k,u.slice(12))}
async function open(code){
  var base=await crypto.subtle.importKey('raw',te.encode(norm(code)),'PBKDF2',false,['deriveBits']);
  var kb=await crypto.subtle.deriveBits({name:'PBKDF2',salt:b64(S),iterations:N,hash:'SHA-256'},base,256);
  var id=hex(await crypto.subtle.digest('SHA-256',kb)).slice(0,12), e=null;
  for(var i=0;i<KEYS.length;i++) if(KEYS[i].id===id){e=KEYS[i];break}
  if(!e) return null;
  var K=await dec(kb,e.w), raw=await dec(K,P);
  if(!window.DecompressionStream) throw new Error('old');
  return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
}
async function go(code,auto){
  var b=$('b'),m=$('m'),rem=auto||$('r').checked; b.disabled=true; m.textContent='여는 중…';
  try{ var html=await open(code);
    if(html){ try{ if(rem) localStorage.setItem(LS,norm(code)); else localStorage.removeItem(LS); }catch(e){} // 새 문서를 쓰기 전에 저장(쓰고 나면 이 화면의 칸이 없어짐)
      document.open();document.write(html);document.close(); return; }
    try{ localStorage.removeItem(LS); }catch(e){}
    m.textContent=auto?'저장된 코드가 바뀌었거나 취소됐어요. 새 코드를 넣어 주세요.':'코드가 맞지 않아요. 다시 확인해 주세요.';
  }catch(err){ m.textContent=err&&err.message==='old'?'브라우저가 오래돼서 열 수 없어요. 최신 버전으로 업데이트해 주세요.':'열지 못했어요. 코드를 다시 확인해 주세요.'; }
  b.disabled=false;
}
$('f').addEventListener('submit',function(ev){ev.preventDefault(); var c=$('k').value; if(norm(c)) go(c,false);});
var saved=null; try{ saved=localStorage.getItem(LS); }catch(e){}
if(!window.crypto||!crypto.subtle){ $('m').textContent='이 주소는 https로 열어야 해요.'; $('b').disabled=true; }
else if(saved) go(saved,true); else $('k').focus();
})();
</script>
</body></html>
`;
};
const files = [['에덴 편성 연구실', 'index.html', 'index.html'], ['장비 빌더 · 에덴 편성 연구실', 'builder.html', 'builder.html']];
for (const [t, src, dst] of files) { if (!fs.existsSync(path.join(SRC, src))) continue; const h = page(t, src); fs.writeFileSync(path.join(OUT, dst), h); console.log(dst + ' (잠김)', Math.round(Buffer.byteLength(h) / 1024) + ' KB'); }
console.log('승인된 사람', users.length + '명');
