# 사용법: python3 -I src/build.py  (저장소 루트에서 실행) → dist/index.html·dist/builder.html(전체) + access.json이 있으면 루트 index.html·builder.html(잠긴 공개용)
import re, json,glob,os
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
    c['ex']={k:x[k] for k in ('personality','mp','turns','buff_how','buff_act','manifest') if x.get(k) is not None}
    ko_names=x.get('ko') or {}
    for k in ('main','sb'):
        if c.get(k) and ko_names.get(k): c[k]['skill_ko']=ko_names[k]
import sys; sys.path.insert(0, here)
from ko import ko, has_jp
# 공식 한국어 스킬 이름(딩 DB, data/skill_ko.json): 표시용 글자에서 일본어 스킬 이름을 먼저 바꾸고 나머지는 ko(2026-10-18 사용자 '일본어·알아볼 수 없는 스킬명 가다듬기')
SKO=json.load(open(P('data','skill_ko.json'),encoding='utf-8')); SKO.pop('_doc',None)
SKO_L={cid:sorted(m.items(), key=lambda kv:-len(kv[0])) for cid,m in SKO.items()}
def kos(t, cid):
    if not isinstance(t,str) or not has_jp(t): return t
    for jp,kr in SKO_L.get(cid,()):
        if jp in t: t=t.replace(jp, kr)
    return ko(t)
# 화면 표시용 한국어: 계산용 조건 원문은 두고 *_ko 필드를 덧붙인다
for c in chars:
    for k in ('main','sb'):
        sk=c.get(k)
        if not sk: continue
        if sk.get('skill_ko'): sk['skill_jp']=sk['skill']; sk['skill']=sk.pop('skill_ko'); sk['skill_official']=True
        elif has_jp(sk.get('skill')): sk['skill_jp']=sk['skill']; sk['skill']=kos(sk['skill'], c['id'])
        if has_jp(sk.get('condition')): sk['cond_ko']=kos(sk['condition'], c['id'])
    if has_jp(c.get('req')): c['req_ko']=kos(c['req'], c['id'])
    if c.get('zone') and has_jp(c['zone'].get('condition')): c['zone']['cond_ko']=kos(c['zone']['condition'], c['id'])
    pb=c.get('party_buff') or {}
    if has_jp(pb.get('restrict')): pb['restrict']=ko(pb['restrict'])
    if c.get('ex') and c['ex'].get('personality'): c['ex']['pers_ko']=[ko(x) for x in c['ex']['personality']]
    for k in ('note_kr','name_kr','play_kr'):
        if has_jp(c.get(k)): c[k]=kos(c[k], c['id'])
    if c.get('support_src'): c['support_src']={k:(kos(v, c['id']) if has_jp(v) else v) for k,v in c['support_src'].items() if isinstance(v,str)}
rules=json.load(open(P('data','buff_rules.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in rules:
        c['party_rules']=rules[c['id']]
        for _r in c['party_rules']: # 규칙 메모는 카드 경고 '버프 조건 미충족 — …'에 보임 → 한국어 표시(2026-10-18)
            if isinstance(_r,dict) and has_jp(_r.get('note')): _r['note_ko']=ko(_r['note'])
# 디버프 조건 규칙(지속·단일 대상 등), 체인 어빌리티
drules=json.load(open(P('data','debuff_rules.json'),encoding='utf-8'))
chain=json.load(open(P('data','chain.json'),encoding='utf-8'))
fate=json.load(open(P('data','fate.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in fate and c['id']!='_doc': c['fate_tbl']=fate[c['id']]
# 기본 스탯(레벨 최대·천명치 0·장비 없음, 위키 Stats Index): [hp,mp,pwr,int,spd,end,spr,lck]
stats=json.load(open(P('data','stats.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in stats and not c['id'].startswith('_'): c['stats']=stats[c['id']]
# 같은 캐릭터 스타일 묶음 (한 파티에 하나만)
cbase=json.load(open(P('data','char_base.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in cbase and not c['id'].startswith('_'): c['base']=cbase[c['id']]
# 전투 시작 AF 게이지·전투 중 AF 게이지 회복
afst=json.load(open(P('data','af_start.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in afst and not c['id'].startswith('_'): c['af_start']=afst[c['id']]
    rf=(afst.get('_refill') or {}).get(c['id'])
    if rf: c['af_refill']=rf
    tu=(afst.get('_turn') or {}).get(c['id'])
    if tu: c['af_turn']=tu
# AF 중 스킬 연출 시간(초) 캐릭터별 값
afan=json.load(open(P('data','af_anim.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in afan and not c['id'].startswith('_'): c['af_anim']=afan[c['id']]
# 성도각성 스텔라 보드: 스탯 합계·天冥 어빌리티(SB 게이지 충전 증가) 조건
stb=json.load(open(P('data','stellar.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in stb and not c['id'].startswith('_'): c['stellar_board']=stb[c['id']]
aft=json.load(open(P('data','af_timing.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in aft and not c['id'].startswith('_'): c['af_t']={k:v for k,v in aft[c['id']].items() if k in ('party','self','deb','zone','real')}
# AF 버프·디버프 행동(알테마 대조 299명): 버프 스킬 하나에 AF 행동 1번
bac=json.load(open(P('data','buff_acts.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in bac and not c['id'].startswith('_'): c['bact']=[{k:v for k,v in a.items() if k in ('s','k','g','h','mp','el','wt','size','mult','hits','afx','z','zk','lv','req','na','once','dur','acts','aw')} for a in bac[c['id']]['acts']]
for c in chars: # 추천 스킬 칸 표시용 한국어 이름(계산은 원문 s)
    for a in c.get('bact') or []:
        nm=re.split(r'[（(]', a.get('s') or '')[0].strip()
        if has_jp(nm): a['sko']=kos(nm, c['id'])
# 루나틱<솔선(挺身)>: 내구→힘·정신→지성 고정값(딩 14·15행)
lun=json.load(open(P('data','lunatic.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in lun.get('teishin',{}): c['teishin']=True
# 부활·전투불능 방지 등급(알테마 대조): 생존 점수와 덱 설명에 씀
asw=json.load(open(P('data','aff_swap.json'),encoding='utf-8')) # 적 내성↔약점 교환(墨染の軍師·셴화(AS))
for c in chars:
    if c['id'] in asw and not c['id'].startswith('_'): c['aff_swap']={k:v for k,v in asw[c['id']].items() if k in ('t','from','skill')}
sng=json.load(open(P('data','song.json'),encoding='utf-8')) # 가창 스킬(가창 중 행동 불가, 2026-10-18 사용자 확인)
for c in chars:
    if c['id'] in sng and not c['id'].startswith('_'): c['song']=sng[c['id']]
exd=json.load(open(P('data','ex.json'),encoding='utf-8')) # EX必殺技 레벨 오르는 조건·효과 지속(2026-10-20, game-info AF まとめ·알테마)
for c in chars:
    if c['id'] in exd and not c['id'].startswith('_'): c['exsp']={k:v for k,v in exd[c['id']].items() if k in ('lv','lv_sa','turn','af','sb','zone','ctr','dur','max','off','win','win_add','wt')} # ex(보강 데이터)와 다른 칸
rvv=json.load(open(P('data','revive.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in rvv and not c['id'].startswith('_'): c['revive']={'g':rvv[c['id']]['g'],'fx':[{k:v for k,v in e.items() if k in ('k','t','w','s')} for e in rvv[c['id']]['fx']]}
lnk=json.load(open(P('data','link.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in lnk and not c['id'].startswith('_'): c['links']=lnk[c['id']]
ctr=json.load(open(P('data','counter.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in ctr and not c['id'].startswith('_'): c['counter']={k:v for k,v in ctr[c['id']].items() if k not in ('note','src')}
    cv=(ctr.get('_cover') or {}).get(c['id'])
    if cv: c['cover']=cv
echg=json.load(open(P('data','elem_change.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in echg and c['id']!='_doc': c['echange']={k:v for k,v in echg[c['id']].items() if k!='note'}
inflict=json.load(open(P('data','inflict.json'),encoding='utf-8'))
for c in chars:
    x=inflict.get(c['id'])
    if x: c['inflict']={k:x[k] for k in ('poison','pain','target','turns','on_main','dummy','p','up','af','req','zone','zlv','split') if k in x} # dummy(허수아비 시점)는 2026-10-16까지 빠져 있었음
def LJ(n): return json.load(open(P('data',n),encoding='utf-8')) if os.path.exists(P('data',n)) else {}
stt=LJ('state.json'); alt=LJ('alts.json'); onc=LJ('once.json'); sbn=LJ('style_bonus.json')
for c in chars:
    if stt.get(c['id']) and not c['id'].startswith('_'): c['states']=[{k:v for k,v in e.items() if k!='note'} for e in stt[c['id']]]
    if alt.get(c['id']) and not c['id'].startswith('_'): c['alts']=[{k:v for k,v in e.items() if k!='note'} for e in alt[c['id']]]
    if onc.get(c['id']) and not c['id'].startswith('_'): c['once']=[{k:v for k,v in e.items() if k!='note'} for e in onc[c['id']]]
    if sbn.get(c['id']) and not c['id'].startswith('_'): c['style_bonus']=[{k:v for k,v in e.items() if k in ('from','add')} for e in sbn[c['id']] if e.get('add')]
tend=json.load(open(P('data','turn_end.json'),encoding='utf-8')) if os.path.exists(P('data','turn_end.json')) else {}
sstk=json.load(open(P('data','self_stk.json'),encoding='utf-8')) if os.path.exists(P('data','self_stk.json')) else {}
for c in chars:
    if tend.get(c['id']) and not c['id'].startswith('_'): c['turn_end']=[{k:e[k] for k in ('name','atk','fixed','when','up','sb_only','act','acts') if k in e} for e in tend[c['id']]]
    if sstk.get(c['id']) and not c['id'].startswith('_'): c['self_stk']={k:{x:v[x] for x in ('stack','turns','start','af_grows','af_p','af_r','sb_fill','req','cnt','zone','zlv','per','e','hp','mp','af','enemy','turn','other','noaf','stat','full','buff','sum') if x in v} for k,v in sstk[c['id']].items()}
stks=json.load(open(P('data','stacks.json'),encoding='utf-8')) if os.path.exists(P('data','stacks.json')) else {}
for c in chars:  # 누적 효과 예열(2026-10-18): 평상 턴 t에 몇 번 쌓였는지(how·per·rate·k0·gate·share), 계산용 칸만
    L=[{x:e[x] for x in ('g','n','k0','how','per','rate','gate','share','lin','t0','also') if x in e and e[x] is not None} for e in (stks.get(c['id']) or []) if isinstance(e,dict) and not e.get('covered')]
    if L and not c['id'].startswith('_'): c['stacks']=L
scond=json.load(open(P('data','skill_cond.json'),encoding='utf-8'))
for c in chars:
    for k,v in (scond.get(c['id']) or {}).items():
        kk='af_skill' if k=='af' else k
        if c.get(kk): c[kk]['mcond']={x:v[x] for x in ('base','top','need','steps','self') if x in v}
for c in chars:
    if c['id'] in drules: c['debuff_rules']=drules[c['id']]
    if chain.get(c['id']): c['chain']=[{k:e[k] for k in ('on','max','atk','when','af','every','name','effect','stk') if k in e} for e in chain[c['id']]]
bosses=json.load(open(P('data','bosses.json'),encoding='utf-8'))+json.load(open(P('data','bosses_more.json'),encoding='utf-8'))
# 결실 현현(결현현): 필수 캐릭터·서약
for b in json.load(open(P('data','bosses_kesshitsu.json'),encoding='utf-8')):
    b=dict(b); b['kesshitsu']=True; b.pop('enemies',None) if False else None
    bosses.append(b)
for b in bosses:
    for k in ('name_kr','phases','strategy_kr'):
        if has_jp(b.get(k)): b[k]=ko(b[k])
    b['mechanics']=[ko(m) for m in b.get('mechanics') or []]
def js(o): return json.dumps(o,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
mp=P('data','meta.json')
meta=json.load(open(mp,encoding='utf-8')) if os.path.exists(mp) else {}
rd=lambda n: open(P(n),encoding='utf-8').read()
head='''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#111936">
<title>에덴 편성 연구실</title>
<meta name="description" content="어나더 에덴 보유 캐릭터·천명치·글래스터 기준 파티 편성 계산기">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&family=IBM+Plex+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}
'''
# 캐릭터 DB 표시용 한국어(2026-10-17): 체인·요격·턴 종료 등은 위에서 합친 뒤라 여기서
for c in chars:
    for k in ('sb_normal','af_skill'): # 캐릭터 DB 표시용(2026-10-17): 이름·조건 한국어는 덧붙이는 필드에만
        sk=c.get(k)
        if not sk: continue
        if has_jp(sk.get('skill')): sk['skill_disp']=kos(sk['skill'], c['id'])
        if has_jp(sk.get('condition')): sk['cond_ko']=kos(sk['condition'], c['id'])
    for k in ('chain','turn_end'):
        for e in (c.get(k) or []):
            if isinstance(e,dict) and has_jp(e.get('name')): e['name_disp']=kos(e['name'], c['id'])
    for k in ('counter','echange'):
        e=c.get(k)
        if isinstance(e,dict) and has_jp(e.get('skill')): e['skill_disp']=kos(e['skill'], c['id'])
    if isinstance(c.get('main'),dict) and isinstance(c['main'].get('alt'),dict) and has_jp(c['main']['alt'].get('skill')): c['main']['alt']['skill_disp']=kos(c['main']['alt']['skill'], c['id'])
    for a in (c.get('alts') or []): # 주력 후보(계산은 skill 원문) — 표시용 이름
        if isinstance(a,dict) and has_jp(a.get('skill')): a['skill_disp']=kos(a['skill'], c['id'])
# 계산 버전: 엔진·데이터가 같으면 같은 결과 → 앱이 저장해 둔 편성 결과를 다시 쓸지 정하는 기준(2026-10-16)
import hashlib
_bfx=json.load(open(P('data','buddy_fx.json'),encoding='utf-8')); _bfx.pop('_doc',None)
# 화면 표시용 필드(한국어 이름·설명)는 계산에 안 쓰므로 계산 버전에서 뺀다(2026-10-17 점검: 글자만 고쳐도 저장된 결과·예시 결과가 버려지던 문제)
_DISP={'note_ko','sko','skill_disp','name_disp','cond_ko','req_ko','note_kr','play_kr','name_kr','alias_kr','skill_official','pers_ko','restrict','support_src'} # 표시용(restrict·support_src도 화면 글자뿐 — 2026-10-18 한자 보강 때 계산 버전이 바뀌던 문제)
def _calc_view(o):
    if isinstance(o,dict):
        d={k:_calc_view(v) for k,v in o.items() if k not in _DISP}
        if 'skill_jp' in d: d.pop('skill',None) # 한국어로 바꾼 스킬 이름(계산은 skill_jp)
        return d
    if isinstance(o,list): return [_calc_view(x) for x in o]
    return o
# 보스 흉성 trigger(연전 편성에서 앞 전투가 붙이는 흉성 판정, 앱 전용 — 엔진 계산과 무관)는 계산 버전에서 뺌(2026-10-18)
def _boss_view(o):
    if isinstance(o,dict): return {k:_boss_view(v) for k,v in o.items() if k!='trigger'}
    if isinstance(o,list): return [_boss_view(x) for x in o]
    return o
calc_ver=hashlib.sha1((js(_calc_view(chars))+js(_boss_view(bosses))+js(_bfx)+rd('engine.js')+rd(os.path.join('data','meta_decks.json'))).encode('utf-8')).hexdigest()[:12] # 추천 덱도 탐색 시작점(seeds)이라 포함
head=head.replace('<title>','<meta name="eden-calc" content="'+calc_ver+'">\n<title>',1)
out=head+rd('app.css')+'\n</style></head><body>\n'+rd('body.html')
out+='<script type="application/json" id="db-chars">'+js(chars)+'</script>\n'
out+='<script type="application/json" id="db-bosses">'+js(bosses)+'</script>\n'
out+='<script type="application/json" id="db-meta">'+js(meta)+'</script>\n'
# 이름이 가려진 캐릭터(이시층 등)의 진명 → 캐릭터 id별 {t 한국어 진명, j 일본어 진명, k 이시층 1/0}. 계산과 무관해 계산 버전(calc_ver)에 넣지 않음(2026-10-17)
_ish=json.load(open(P('data','ishisou.json'),encoding='utf-8'))['list']; _tn={}
for c in chars:
    _b=re.sub(r'\((AS|ES|AC)\)$','',c['name_jp'])
    if _b in _ish: e=_ish[_b]; _tn[c['id']]={'t':e['kr'],'j':e['jp'],'k':1 if e.get('ishi') else 0}
_miss=[k for k in _ish if not any(re.sub(r'\((AS|ES|AC)\)$','',c['name_jp'])==k for c in chars)]
if _miss: raise SystemExit('ishisou.json: 데이터에 없는 이름 %s'%_miss)
out+='<script type="application/json" id="db-ishi">'+js(_tn)+'</script>\n'
out+='<script type="application/json" id="db-aecheck">'+js(json.load(open(P('data','aecheck_map.json'),encoding='utf-8')))+'</script>\n' # aecheck 저장 데이터 불러오기 대응표(계산과 무관)
# 보편 추천 덱(커뮤니티): 없는 캐릭터 id가 있으면 빌드를 멈춘다
mdk=json.load(open(P('data','meta_decks.json'),encoding='utf-8'))['decks']
_ids={c['id'] for c in chars}
for dk in mdk:
    _bad=[i for i in dk['members']+dk.get('back',[])+[a for v in (dk.get('alts') or {}).values() for a in v] if i not in _ids]
    if _bad: raise SystemExit('meta_decks.json: 없는 캐릭터 id %s (%s)'%(_bad, dk['name']))
out+='<script type="application/json" id="db-decks">'+js(mdk)+'</script>\n'
bfx=json.load(open(P('data','buddy_fx.json'),encoding='utf-8')); bfx.pop('_doc',None)
out+='<script type="application/json" id="db-buddies">'+js(bfx)+'</script>\n'
_bg=json.load(open(P('data','buddy_gear.json'),encoding='utf-8')); _bg={'items':[{k:v for k,v in it.items() if k in ('id','kr','jp','slot','stats','fx','effect')} for it in _bg['items']],'recommend':_bg['recommend']}
out+='<script type="application/json" id="db-bgear">'+js(_bg)+'</script>\n' # 버디 장비(2026-10-17): 계산에 쓰는 값은 편성 입력(버디 객체)에 들어가 결과 캐시 키에 반영
# 처음 방문(예시 보유) 결과: src/tools/sample_cache.js가 만든 것. 계산 버전이 다르면 앱이 무시한다
_sc=P('data','sample_cache.json')
if os.path.exists(_sc):
    _scd=json.load(open(_sc,encoding='utf-8'))
    out+='<script type="application/json" id="db-samplecache">'+js(_scd)+'</script>\n'
    if _scd.get('b')!=calc_ver: print('※ sample_cache.json이 지난 계산 버전입니다 → node src/tools/sample_cache.js 후 다시 빌드')
# 엔진 코드는 app.js가 textContent를 읽어 Web Worker로도 띄운다
# 장비 추천: 빌더의 계산기(AECalc)와 장비 탐색(eqopt) — 장비 데이터(ae-data.json)는 쓸 때 받아 온다
out+='<script id="aecalc-js">\n'+open(os.path.join(here,'..','vendor','ae-builder','ae-engine.js'),encoding='utf-8').read()+'\n</script>\n'
out+='<script id="eqopt-js">\n'+rd('eqopt.js')+'\n</script>\n'
out+='<script id="engine-js">\n'+rd('engine.js')+'\n</script>\n<script>\n'+rd('app.js')+'\n</script>\n</body></html>\n'
# 잠금(2026-10-17): 잠기지 않은 전체 페이지는 dist/에만(.gitignore), 공개되는 저장소 루트 index.html·builder.html은 src/tools/lock.js가 암호화해 만든다
DIST=os.path.join(here,'..','dist'); os.makedirs(DIST, exist_ok=True)
open(os.path.join(DIST,'index.html'),'w',encoding='utf-8').write(out)
print('dist/index.html',len(out.encode())//1024,'KB · 캐릭터',len(chars),'· 보스',len(bosses),'· 데이터 기준',meta.get('updated','-'))

# 장비 빌더 (어나더에덴 빌더, 계산 공식·장비 데이터 출처: 딩) → builder.html
VB=os.path.join(here,'..','vendor','ae-builder','어나더에덴_빌더.html')
if os.path.exists(VB):
    b=open(VB,encoding='utf-8').read()
    # 약점 대미지 강화(포박의 공격 등)는 약점 배율(26행)이 아니라 대미지에 바로 곱한다 (사용자 확인값, eqopt.js와 같게)
    _wk='if (uniq.weak) R[26] = one(uniq.weak.v);'
    if b.count(_wk)==1: b=b.replace(_wk, 'if (uniq.weak) R[43] = (R[43] || []).concat([uniq.weak.v]);')
    pre='<!doctype html>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    hook='''<script>
/* 에덴 편성 연구실 연결 (builder.html#who=캐릭터&wt=무기종&id=캐릭터id&s=조건JSON&code=AEB1.…)
   - s: 계산 조건(속성·위력·타수·ZONE·크리율 보정·P글래 등)을 칸 id 그대로 채운다
   - code: 빌드 코드를 빌더의 '빌드 비교 → 장착'과 같은 방식으로 장착한다
   - '편성 연구실로 보내기': 지금 장착한 빌드 코드를 같은 사이트의 편성 연구실로 넘긴다 */
(function(){ try{
  const h=new URLSearchParams(location.hash.slice(1)), who=h.get('who'), wt=h.get('wt'), cid=h.get('id')||'';
  const $id=k=>document.getElementById(k);
  const bar=document.querySelector('.opt-bar');
  if(bar && typeof buildCode==='function'){
    const bt=document.createElement('button'); bt.className='btn'; bt.type='button'; bt.textContent='편성 연구실로 보내기';
    bt.title='지금 장착한 장비를 에덴 편성 연구실의 보유 캐릭터 빌드로 넘깁니다';
    const msg=document.createElement('span'); msg.className='hint'; msg.setAttribute('role','status');
    bt.addEventListener('click',()=>{ try{
      const code=buildCode(curBuild(), curType);
      localStorage.setItem('eden-lab-inbox', JSON.stringify({id:cid, who:myWho(), wt:curType, code, at:Date.now()}));
      msg.innerHTML='보냈습니다. <a href="index.html">편성 연구실</a>에서 저장할 캐릭터를 고르세요.';
    }catch(e){ msg.textContent='보내지 못했습니다: '+e.message; } });
    bar.insertBefore(bt, bar.querySelector('.hint')); bar.appendChild(msg);
  }
  if(!who && !wt && !h.get('code') && !h.get('s')) return;
  const el=$id('who');
  if(who && el){ el.value=who; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  if(wt && typeof TYPES!=='undefined' && TYPES.includes(wt) && typeof equip!=='undefined' && !equip.weapon){ curType=wt; cat='weapon'; }
  const sj=h.get('s');
  if(sj){ try{ const o=JSON.parse(sj); for(const k in o){ const e2=$id(k); if(!e2) continue; if(e2.type==='checkbox') e2.checked=!!o[k]; else e2.value=o[k]; } }catch(e){} }
  const code=h.get('code');
  if(code && typeof parseBuild==='function'){
    const R=parseBuild(code);
    if(R && !R.err){
      if(R.st) for(const k in R.st){ const e2=$id(k); if(e2 && R.st[k]!=null) e2.value=R.st[k]; }
      if(R.who && el) el.value=R.who;
      if(typeof shareEquip==='function'){ shareImp=R; shareEquip(); }
      else { const fate=+($id('fate')||{}).value||0; for(const k of OPT_ALL){ if(lockOf(k,fate)) continue; equip[k]=R.equip[k]||null; if(GS.includes(k)) ore[k]=R.ore[k]||''; } curType = equip.weapon ? ITEMS[equip.weapon].t : (R.wt||curType); }
      if(R.p && R.p.f) for(const k of ['pMode','pDmg','pElem','pAddDmg','pAddElem']){ const e2=$id(k); if(e2 && R.p.f[k]!=null) e2.value=R.p.f[k]; }
    }
  }
  if(typeof render==='function') render();
}catch(e){ console.warn('[편성 연구실 연결]', e); } })();
</script>
'''
    # 빌더 테마·보강(2026-10-17): 편성 연구실과 같은 디자인, 캐릭터 불러오기(스탯·주력 스킬·무기 한 번에), 조건 접기, 모바일 대미지 고정
    import subprocess as _sp
    _bc=_sp.run(['node', os.path.join(here,'tools','bchars.js')], capture_output=True, text=True)
    if _bc.returncode: raise SystemExit('빌더 캐릭터 목록 실패: '+_bc.stderr[-400:])
    _si=b.find('</style>')
    if _si>=0: b=b[:_si]+'\n'+rd('builder_theme.css')+'\n'+b[_si:]
    plus='<script type="application/json" id="db-bchars">'+_bc.stdout+'</script>\n<script>\n'+rd('builder_plus.js')+'\n</script>\n'
    b=b.replace('<title>어나더에덴 빌더</title>','<title>장비 빌더 · 에덴 편성 연구실</title>',1)
    pre=pre.replace('<meta name="viewport" content="width=device-width,initial-scale=1">','<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111936">')
    i=b.rfind('</script>')
    b=pre+b[:i+9]+'\n'+plus+hook+b[i+9:]
    open(os.path.join(DIST,'builder.html'),'w',encoding='utf-8').write(b)
    print('dist/builder.html',len(b.encode())//1024,'KB')

# 공개용 잠긴 페이지: access.json(승인 코드, git에 안 올림)이 있을 때만 만든다. 없으면 루트 파일은 건드리지 않음(잠기지 않은 페이지가 공개되지 않게)
import subprocess
_acc=os.path.join(here,'..','access.json')
if os.path.exists(_acc):
    r=subprocess.run(['node', os.path.join(here,'tools','lock.js')], capture_output=True, text=True)
    print((r.stdout or '').strip())
    if r.returncode: raise SystemExit('잠금 실패: '+(r.stderr or '').strip())
else:
    print('※ access.json이 없어 공개용 잠긴 페이지(index.html·builder.html)를 다시 만들지 않았습니다 → node src/tools/access.js set "이름" 코드')
