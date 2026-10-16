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
    c['ex']={k:x[k] for k in ('personality','mp','turns','buff_how','buff_act','manifest') if x.get(k) is not None}
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
    for k in ('note_kr','name_kr','play_kr'):
        if has_jp(c.get(k)): c[k]=ko(c[k])
    if c.get('support_src'): c['support_src']={k:(ko(v) if has_jp(v) else v) for k,v in c['support_src'].items() if isinstance(v,str)}
rules=json.load(open(P('data','buff_rules.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in rules: c['party_rules']=rules[c['id']]
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
    if c['id'] in bac and not c['id'].startswith('_'): c['bact']=[{k:v for k,v in a.items() if k in ('s','k','g','h','mp','el','wt','size','mult','hits','afx','z','zk','lv','req','na','once','dur','acts')} for a in bac[c['id']]['acts']]
# 루나틱<솔선(挺身)>: 내구→힘·정신→지성 고정값(딩 14·15행)
lun=json.load(open(P('data','lunatic.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in lun.get('teishin',{}): c['teishin']=True
# 부활·전투불능 방지 등급(알테마 대조): 생존 점수와 덱 설명에 씀
rvv=json.load(open(P('data','revive.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in rvv and not c['id'].startswith('_'): c['revive']={'g':rvv[c['id']]['g'],'fx':[{k:v for k,v in e.items() if k in ('k','t','w','s')} for e in rvv[c['id']]['fx']]}
lnk=json.load(open(P('data','link.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in lnk and not c['id'].startswith('_'): c['links']=lnk[c['id']]
ctr=json.load(open(P('data','counter.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in ctr and not c['id'].startswith('_'): c['counter']=ctr[c['id']]
    cv=(ctr.get('_cover') or {}).get(c['id'])
    if cv: c['cover']=cv
echg=json.load(open(P('data','elem_change.json'),encoding='utf-8'))
for c in chars:
    if c['id'] in echg and c['id']!='_doc': c['echange']={k:v for k,v in echg[c['id']].items() if k!='note'}
inflict=json.load(open(P('data','inflict.json'),encoding='utf-8'))
for c in chars:
    x=inflict.get(c['id'])
    if x: c['inflict']={k:x[k] for k in ('poison','pain','target','turns','on_main') if k in x}
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
    if tend.get(c['id']) and not c['id'].startswith('_'): c['turn_end']=[{k:e[k] for k in ('name','atk','fixed','when','up','sb_only') if k in e} for e in tend[c['id']]]
    if sstk.get(c['id']) and not c['id'].startswith('_'): c['self_stk']={k:{x:v[x] for x in ('stack','turns','start','af_grows','af_p','af_r','sb_fill','req') if x in v} for k,v in sstk[c['id']].items()}
scond=json.load(open(P('data','skill_cond.json'),encoding='utf-8'))
for c in chars:
    for k,v in (scond.get(c['id']) or {}).items():
        kk='af_skill' if k=='af' else k
        if c.get(kk): c[kk]['mcond']={x:v[x] for x in ('base','top','need','steps') if x in v}
for c in chars:
    if c['id'] in drules: c['debuff_rules']=drules[c['id']]
    if chain.get(c['id']): c['chain']=[{k:e[k] for k in ('on','max','atk','when','af','every','name','effect') if k in e} for e in chain[c['id']]]
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
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>에덴 편성 연구실</title>
<meta name="description" content="어나더 에덴 보유 캐릭터·천명치·글래스터 기준 파티 편성 계산기">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&family=IBM+Plex+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}
'''
# 계산 버전: 엔진·데이터가 같으면 같은 결과 → 앱이 저장해 둔 편성 결과를 다시 쓸지 정하는 기준(2026-10-16)
import hashlib
_bfx=json.load(open(P('data','buddy_fx.json'),encoding='utf-8')); _bfx.pop('_doc',None)
calc_ver=hashlib.sha1((js(chars)+js(bosses)+js(_bfx)+rd('engine.js')).encode('utf-8')).hexdigest()[:12]
head=head.replace('<title>','<meta name="eden-calc" content="'+calc_ver+'">\n<title>',1)
out=head+rd('app.css')+'\n</style></head><body>\n'+rd('body.html')
out+='<script type="application/json" id="db-chars">'+js(chars)+'</script>\n'
out+='<script type="application/json" id="db-bosses">'+js(bosses)+'</script>\n'
out+='<script type="application/json" id="db-meta">'+js(meta)+'</script>\n'
# 보편 추천 덱(커뮤니티): 없는 캐릭터 id가 있으면 빌드를 멈춘다
mdk=json.load(open(P('data','meta_decks.json'),encoding='utf-8'))['decks']
_ids={c['id'] for c in chars}
for dk in mdk:
    _bad=[i for i in dk['members']+dk.get('back',[])+[a for v in (dk.get('alts') or {}).values() for a in v] if i not in _ids]
    if _bad: raise SystemExit('meta_decks.json: 없는 캐릭터 id %s (%s)'%(_bad, dk['name']))
out+='<script type="application/json" id="db-decks">'+js(mdk)+'</script>\n'
bfx=json.load(open(P('data','buddy_fx.json'),encoding='utf-8')); bfx.pop('_doc',None)
out+='<script type="application/json" id="db-buddies">'+js(bfx)+'</script>\n'
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
open(os.path.join(here,'..','index.html'),'w',encoding='utf-8').write(out)
print('index.html',len(out.encode())//1024,'KB · 캐릭터',len(chars),'· 보스',len(bosses),'· 데이터 기준',meta.get('updated','-'))

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
    i=b.rfind('</script>')
    b=pre+b[:i+9]+'\n'+hook+b[i+9:]
    open(os.path.join(here,'..','builder.html'),'w',encoding='utf-8').write(b)
    print('builder.html',len(b.encode())//1024,'KB')
