# 사용법: python3 -I src/build.py  (저장소 루트에서 실행) → index.html 생성
import json,glob,os
here=os.path.dirname(os.path.abspath(__file__))
P=lambda *a: os.path.join(here,*a)
chars=[]
for f in sorted(glob.glob(P('data','chars_*.json'))): chars+=json.load(open(f,encoding='utf-8'))
rules=json.load(open(P('data','buff_rules.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in rules: c['party_rules']=rules[c['id']]
bosses=json.load(open(P('data','bosses.json'),encoding='utf-8'))+json.load(open(P('data','bosses_more.json'),encoding='utf-8'))
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
