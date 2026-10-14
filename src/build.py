# 사용법: python3 -I src/build.py  (저장소 루트에서 실행) → index.html 생성
import json,glob,os
here=os.path.dirname(os.path.abspath(__file__))
P=lambda *a: os.path.join(here,*a)
chars=[]
for f in sorted(glob.glob(P('data','chars_*.json'))): chars+=json.load(open(f,encoding='utf-8'))
import sys; sys.path.insert(0, here)
from ko import ko, has_jp
# 화면 표시용 한국어: 계산용 조건 원문은 두고 *_ko 필드를 덧붙인다
for c in chars:
    for k in ('main','sb'):
        sk=c.get(k)
        if not sk: continue
        if has_jp(sk.get('skill')): sk['skill_jp']=sk['skill']; sk['skill']=ko(sk['skill'])
        if has_jp(sk.get('condition')): sk['cond_ko']=ko(sk['condition'])
    if has_jp(c.get('req')): c['req_ko']=ko(c['req'])
    if c.get('zone') and has_jp(c['zone'].get('condition')): c['zone']['cond_ko']=ko(c['zone']['condition'])
    pb=c.get('party_buff') or {}
    if has_jp(pb.get('restrict')): pb['restrict']=ko(pb['restrict'])
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
out+='<script>\n'+rd('engine.js')+'\n</script>\n<script>\n'+rd('app.js')+'\n</script>\n</body></html>\n'
open(os.path.join(here,'..','index.html'),'w',encoding='utf-8').write(out)
print('index.html',len(out.encode())//1024,'KB · 캐릭터',len(chars),'· 보스',len(bosses))
