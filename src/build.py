# 사용법: python3 -I src/build.py  (저장소 루트에서 실행) → index.html 생성
import json,glob,os
here=os.path.dirname(os.path.abspath(__file__))
P=lambda *a: os.path.join(here,*a)
chars=[]
for f in sorted(glob.glob(P('data','chars_*.json'))): chars+=json.load(open(f,encoding='utf-8'))
# 보강 데이터(MP·지속 턴·퍼스널리티·현현·공식 한국어 스킬명) 합치기
EX={}
for f in sorted(glob.glob(P('data','extra','*.json'))): EX.update(json.load(open(f,encoding='utf-8')))
for c in chars:
    x=EX.get(c['id'])
    if not x: continue
    c['ex']={k:x[k] for k in ('personality','mp','turns','buff_how','manifest') if x.get(k) is not None}
    ko_names=x.get('ko') or {}
    for k in ('main','sb'):
        if c.get(k) and ko_names.get(k): c[k]['skill_ko']=ko_names[k]
import sys; sys.path.insert(0, here)
from ko import ko, has_jp
# 화면 표시용 한국어: 계산용 조건 원문은 두고 *_ko 필드를 덧붙인다
for c in chars:
    for k in ('main','sb'):
        sk=c.get(k)
        if not sk: continue
        if sk.get('skill_ko'): sk['skill_jp']=sk['skill']; sk['skill']=sk.pop('skill_ko'); sk['skill_official']=True
        elif has_jp(sk.get('skill')): sk['skill_jp']=sk['skill']; sk['skill']=ko(sk['skill'])
        if has_jp(sk.get('condition')): sk['cond_ko']=ko(sk['condition'])
    if has_jp(c.get('req')): c['req_ko']=ko(c['req'])
    if c.get('zone') and has_jp(c['zone'].get('condition')): c['zone']['cond_ko']=ko(c['zone']['condition'])
    pb=c.get('party_buff') or {}
    if has_jp(pb.get('restrict')): pb['restrict']=ko(pb['restrict'])
    if c.get('ex') and c['ex'].get('personality'): c['ex']['pers_ko']=[ko(x) for x in c['ex']['personality']]
    for k in ('note_kr','name_kr'):
        if has_jp(c.get(k)): c[k]=ko(c[k])
rules=json.load(open(P('data','buff_rules.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in rules: c['party_rules']=rules[c['id']]
bosses=json.load(open(P('data','bosses.json'),encoding='utf-8'))+json.load(open(P('data','bosses_more.json'),encoding='utf-8'))
for b in bosses:
    for k in ('name_kr','phases','strategy_kr'):
        if has_jp(b.get(k)): b[k]=ko(b[k])
    b['mechanics']=[ko(m) for m in b.get('mechanics') or []]
def js(o): return json.dumps(o,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
mp=P('data','meta.json')
meta=json.load(open(mp,encoding='utf-8')) if os.path.exists(mp) else {}
rd=lambda n: open(P(n),encoding='utf-8').read()
head='''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>에덴 편성 연구실</title>
<meta name="description" content="어나더 에덴 보유 캐릭터·천명치·글래스터 기준 파티 편성 계산기">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&family=IBM+Plex+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}
'''
out=head+rd('app.css')+'\n</style></head><body>\n'+rd('body.html')
out+='<script type="application/json" id="db-chars">'+js(chars)+'</script>\n'
out+='<script type="application/json" id="db-bosses">'+js(bosses)+'</script>\n'
out+='<script type="application/json" id="db-meta">'+js(meta)+'</script>\n'
# 엔진 코드는 app.js가 textContent를 읽어 Web Worker로도 띄운다
out+='<script id="engine-js">\n'+rd('engine.js')+'\n</script>\n<script>\n'+rd('app.js')+'\n</script>\n</body></html>\n'
open(os.path.join(here,'..','index.html'),'w',encoding='utf-8').write(out)
print('index.html',len(out.encode())//1024,'KB · 캐릭터',len(chars),'· 보스',len(bosses),'· 데이터 기준',meta.get('updated','-'))

# 장비 빌더 (어나더에덴 빌더, 계산 공식·장비 데이터 출처: 딩) → builder.html
VB=os.path.join(here,'..','vendor','ae-builder','어나더에덴_빌더.html')
if os.path.exists(VB):
    b=open(VB,encoding='utf-8').read()
    pre='<!doctype html>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    hook='''<script>
/* 에덴 편성 연구실에서 builder.html#who=캐릭터&wt=무기종 으로 열면 캐릭터 이름과 무기 종류를 채운다 */
(function(){ try{
  const h=new URLSearchParams(location.hash.slice(1)), who=h.get('who'), wt=h.get('wt');
  if(!who && !wt) return;
  const el=document.getElementById('who');
  if(who && el){ el.value=who; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  if(wt && typeof TYPES!=='undefined' && TYPES.includes(wt) && typeof equip!=='undefined' && !equip.weapon){ curType=wt; cat='weapon'; }
  if(typeof render==='function') render();
}catch(e){} })();
</script>
'''
    i=b.rfind('</script>')
    b=pre+b[:i+9]+'\n'+hook+b[i+9:]
    open(os.path.join(here,'..','builder.html'),'w',encoding='utf-8').write(b)
    print('builder.html',len(b.encode())//1024,'KB')
