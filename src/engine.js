/* ===== 편성 계산 엔진 (브라우저/Node 공용) ===== */
(function (root) {
'use strict';

const ELEMS = ['fire','water','earth','wind','thunder','shade','crystal','none'];
const WTYPES = ['slash','pierce','blunt','magic'];
const WEAPON_TYPE = {sword:'slash',katana:'slash',ax:'slash',lance:'pierce',bow:'pierce',fist:'blunt',hammer:'blunt',staff:'magic'};
const OPP = {fire:'water',water:'fire',earth:'wind',wind:'earth',thunder:'shade',shade:'thunder'};
const ELEM_KR = {fire:'불',water:'물',earth:'땅',wind:'바람',thunder:'번개',shade:'그림자',crystal:'결정',none:'무'};
const WT_KR = {slash:'참',pierce:'돌',blunt:'타',magic:'마'};
const WEAPON_KR = {staff:'지팡이',sword:'검',katana:'도',ax:'도끼',lance:'창',bow:'활',fist:'권갑',hammer:'망치'};
const ZONE_KR = {all_weapon:'섬격진', moonlight:'월광진', thunder_shade_crystal:'월광진', '星海陣':'성해진', fire:'열화진',water:'수천진',earth:'지열진',wind:'풍왕진',thunder:'초뢰진',shade:'각음진',crystal:'휘정진',
  slash:'황참진',pierce:'순돌진',blunt:'굉타진',magic:'환마진',slash_pierce:'쌍격진·참돌',slash_magic:'쌍격진·참마',
  starsea:'성해진',stellar_sea:'성해진',moonlight:'월광진'};

/* 스킬 크기 기본 배율 (어나더 에덴 위키 Damage Formula 표) */
const SIZE_IDX = {s:0,m:1,l:2,xl:3,xxl:4};
const SIZE_TABLE = {
  st_phys_el:[140,160,180,200,250], st_phys_no:[150,170,190,210,260],
  st_mag_el:[130,150,170,190,240],  st_mag_no:[140,160,180,200,250],
  aoe_phys_el:[100,120,140,160,210], aoe_phys_no:[110,130,150,170,220],
  aoe_mag_el:[90,110,130,150,200],   aoe_mag_no:[100,120,140,160,210]
};
/* 다단강화: N타째 배율 */
const MULTIHIT = [1,1.25,1.5,2,3,3];
function multihitAvg(h){ h=Math.max(1,Math.round(h)); let s=0; for(let i=0;i<h;i++) s+=MULTIHIT[Math.min(i,5)]; return s/h; }

const DEFAULT_SETTINGS = {
  grastaDefault: {mode:'auto', e:3, pa:0, po:0, ore:false}, // 공격 글래스터 기본 배치
  capOn: true,         // 1타 상한 (타수 중요도) 반영
  capAbs: 9999999999,  // 1타 대미지 상한 (100억-1)
  statK: 22000,        // 스탯 환산 계수: 상대값 1 = 실제 대미지 약 statK (완력·무기 공격 기준 기본 대미지)
  zoneElem: [1.5, 2.0, 2.0],   // 속성 존: 일반 / 극(어나더 존) / 절(극과 같음)
  zoneWeap: [1.3, 1.6, 1.6],   // 공격종 존
  zoneOppElem: 0.5, zoneOffWeap: 0.7,
  enemyCount: 1,
  diverse: true,
  afActions: 5,      // afAuto를 끄면 쓰는 고정 행동 수
  afAuto: true,      // AF 행동 수를 게이지·속도로 계산 (위키 기준)
  afAnim: 2,         // AF 중 스킬 연출 시간(초) 가정
  sbFillBonus: true, // 성도 게이지 충전 보너스(강화): 성도 각성 캐릭터 행동마다 5%(조건 충족 가정)
  dummyMule: true,   // 최고점(허수아비)은 후열 연성 P글래 셔틀을 가정(보유 표시가 있으면 그것만)
  afRepAnim: 0.5,    // AF 중 재공격(한 행동 안에서 이어 치기) 1회의 연출 시간 = 기본 연출 × 이 값
  auraGl: true,      // 후열 셔틀이 아군 전체 글래(공명의 힘 <천/명> 51행, 격진의 힘 <존> 50행)를 단다고 가정 (빌더 코어 기준)
  lvMode: 'auto',    // 레벨: 'auto' = 성도각성 캐릭터는 천명치 15·30·50·80마다 최대 레벨 +5(Lv100까지, 6스탯 +1/레벨), '80' = 전원 Lv80·성도각성 없음(뉴비)
  glLocked: false,   // 글래스터 미개방(뉴비): 공격·전용 글래스터·셔틀 P글래·아군 전체 글래 모두 없음
  comboCap: 0,       // AF 콤보 배율 상한(배). 0이면 없음 — 위키 Another Force/Combo에 상한 없음
  afFastDefault: false, // 빌드 코드가 없는 캐릭터를 속도 249 이상으로 볼지
  useStats: true,    // 캐릭터 기본 스탯(위키 Stats Index)으로 주 스탯 대미지·운 크리율·속도 반영
  gearSpd: null,     // 빌드 코드가 없는 캐릭터의 장비 속도. null이면 무기종별 자동값(GEAR_SPD_AUTO)
  pglAssumeAll: false, // 연성 P글래 보유를 하나도 표시하지 않았을 때 전부 있다고 볼지 (기본: 없다고 봄 → 셔틀 공유 없음)
  afStart: 50,       // 전투 시작 AF 게이지 % (이월 최대 50%). 캐릭터·버디 조건(af_start.json)이면 100%
  burstTurns: 3,     // 최고점 = 개전부터 N턴 동안 넣는 총 대미지 (AF·SB 발동 시점은 게이지로 계산)
  sbPerAct: 2.5,     // SB 게이지: 아군 행동 1회당 % (AF 중 행동 포함 — 사용자 확인)
  enemyHits: 2,      // 요격: 적 1체가 평상 턴에 아군에게 넣는 타수 (다단은 타마다 요격 1번)
  enemyAoE: 0.4,     // 요격: 그중 전체 공격 비율 (전체 공격은 전열 모두가 1타씩 맞음)
  simOn: true,       // 일반 턴을 MP·버프 지속 턴 시뮬레이션으로 계산
  simTurns: 6,       // 시뮬레이션 턴 수 (보스 한 구간)
  mpBase: 450,       // 기본 MP 최대치 (천명치로 최대 +120)
  mpCostMul: 1,      // 스킬 소비 MP 배율 (MP 소비 감소 글래스터 등이면 0.85·0.75)
  muleOn: true,      // 후열 글래스터 셔틀: 잠재 광석 단 퍼스널리티 글래스터(P글래)를 후열이 들고 전열에 공유
  muleAuto: true,    // 후열 고정이 없으면 주딜과 같은 무기 퍼스널리티 셔틀 2명을 가정
  afCycle: true,      // 지속 딜에 AF 주기(턴당 게이지 충전으로 계산)를 넣기
  muleFront: true,   // 자동 가정일 때 같은 퍼스널리티의 전열 서포터(딜러 아님)도 P글래 셔틀로
  muleSlots: 4,      // 셔틀 1명이 공유하는 칸 수: 셔틀은 천명치 200을 찍어 글래 4칸이라고 가정(사용자 확인 — 3이면 천명치 200 미만)
  mulePct: 0.3       // 공유 1칸당 대미지 (속성 글래스터와 같은 가산 그룹)
};
const WEAPON_PERS = {sword:'剣', katana:'刀', ax:'斧', lance:'槍', bow:'弓', fist:'拳', hammer:'槌', staff:'杖'};
const SPECIAL_GRASTA = {none:1, sh:1.02, vc:1.03, shin:1.07, goku:1.12}; // sh = 수호성의 증표(6스탯 +5, 빌더 기본 특수칸 대신)
/* 성도각성 레벨: 스텔라 보드 'Max Level +5' 4칸(천명 15·30·50·80에서 SP) → Lv80→100. 6스탯은 레벨당 +1, MP는 약 +1.9%/레벨(위키·game-info 5명 대조) */
const LV_STEPS = [15, 30, 50, 80];
const lvBonusOf = (t, awake) => awake ? 5*LV_STEPS.filter(x=>(+t||0)>=x).length : 0;
const MANIFEST = [1, 1.08, 1.15];
/* 정신통일(마법)·심기일체(물리): 딩 계산기 30행 = 최대 MP × 계수(마법 0.23, 물리 0.16)%, 최대 250%.
   호시탐탐(31행)·하극상(32행, 대상 레벨²÷계수, 최대 100%)은 값 그대로. 셋은 한 묶음 감쇠(최대 +350%) */
const FOCUS_K = {mag:0.0023, phys:0.0016}, OVERTHROW_VAL = 1.0, EAGLE_VAL = 0.6;
const focusOf = (kind, mp) => Math.min(2.5, Math.max(0, mp||0)*(kind==='mag'?FOCUS_K.mag:FOCUS_K.phys));
/* ---------- 딩 계산기 v4.016 기본 대미지 (시전자 아군, 위력 100%) ----------
   공격 = (공격력 − 방어/2) × (1 + 기준스탯/32) × 1.75 × 속성 보정 + 공격력 × 난수/25.6 (크리는 방어/4, ×3.25)
   속성 보정 = 1 + (√(마력×10+16) − 4)/64, 약점 = 물리 1.85 + (X7 + √(2·X7))/512 · 마법 2.
   스탯 버프는 공격력(속도 기반은 기준 스탯도)에, 방어 디버프는 방어에 들어간다. 엑셀과 무작위 600건 대조 오차 0.65% 이내 */
const DING = {J3:140, J4:174, J5:174};
const G5_OF = (kind, stat) => kind==='mag' ? (stat==='pwr'?'힘기반 마법':stat==='spd'?'속도기반 마법':'마법공격') : (stat==='int'?'지능기반 물리':stat==='spd'?'속도기반 물리':'물리공격');
function dingHit(D, g5, el, b, d, fs){ // fs: 스탯 고정값 버프 {p:완력(14행), i:지성(15행), s:속도(16행)} — 공격력·마력에 더한 뒤 % 버프 (숫자면 완력)
  const phys = g5==='물리공격'||g5==='지능기반 물리'||g5==='속도기반 물리';
  let X3,X5,X6,X7;
  const F = typeof fs==='object' && fs ? fs : {p:+fs||0}, fp=+F.p||0, fi=+F.i||0, fsp=+F.s||0;
  if(g5==='물리공격'){ X3=D.str; X5=(D.atk+fp)*(1+b); X6=D.mag; X7=D.mag; }
  else if(g5==='지능기반 물리'){ X3=D.int; X5=(D.mag+fi)*(1+b); X6=D.int; X7=(D.int+fi)*(1+b); }
  else if(g5==='속도기반 물리'){ X3=(D.spd+fsp)*(1+b); X5=(D.atk-D.str+D.spd+fsp)*(1+b); X6=D.mag; X7=(D.spd+fsp)*(1+b)+D.mag-D.int; }
  else if(g5==='마법공격'){ X3=D.int; X5=(D.mag+fi)*(1+b); X6=D.int; }
  else if(g5==='힘기반 마법'){ X3=D.str; X5=(D.atk+fp)*(1+b); X6=D.int; }
  else { X3=(D.spd+fsp)*(1+b); X5=(D.atk-D.str+D.spd+fsp)*(1+b); X6=D.int; }
  const def=(phys?DING.J4:DING.J5)*(1-Math.min(1,Math.max(0,d))), k3=1+X3/32, sd=phys?31.5:63;
  const X12 = el ? 1+(Math.sqrt(X6*10+16)-4)/64 : 1;
  const n = Math.max(1,(X5-def/2)*k3*1.75*X12) + X5*sd/25.6;
  const c = Math.max(1,(X5-def/4)*k3*3.25*X12) + X5*sd/25.6;
  return {n, c, wk: phys ? 1.85 + (X7+Math.sqrt(2*Math.max(0,X7)))/512 : 2};
}
/* 1타 25억 초과 경감 + 최종 상한 9,999,999,999 (딩 계산기 67행) */
function dingCap(v){
  if(!(v>=2.5e9)) return v;
  if(v<3.5e9) return 1.75e9 + v*0.3; if(v<5e9) return 2.45e9 + v*0.1;
  if(v<1e10) return 2.8e9 + v*0.03; if(v<7e11) return 3e9 + v*0.01; return 9999999999;
}
/* 무기종별 표준 장비: 딩 빌더 장비 시트로 대미지 최적 빌드를 찾았을 때 장비가 더하는 값(천명 80·255 측정).
   주 스탯 가산은 천명 80→255 사이 보간, fx는 글래스터를 뺀 장비 효과(무기·방어구·배지)의 대미지 배율(AF 기준 최적 빌드) */
const GEAR_STD = {
  staff:{atk:28, mag:227, ms:[50,120], str:20, int:0, spd:20, lck:50, mp:0},
  sword:{atk:227, mag:28, ms:[50,108], str:0, int:45, spd:30, lck:30, mp:0},
  katana:{atk:237, mag:39, ms:[50,108], str:0, int:45, spd:30, lck:30, mp:50},
  ax:{atk:245, mag:11, ms:[60,118], str:0, int:25, spd:40, lck:10, mp:0},
  lance:{atk:227, mag:28, ms:[50,108], str:0, int:45, spd:30, lck:30, mp:0},
  bow:{atk:204, mag:58, ms:[50,108], str:0, int:45, spd:30, lck:30, mp:50},
  fist:{atk:222, mag:37, ms:[60,118], str:0, int:25, spd:40, lck:10, mp:0},
  hammer:{atk:204, mag:149, ms:[50,108], str:0, int:45, spd:30, lck:30, mp:0}
};
const GEAR_FX = [1.85, 2.04];
const MPATK_GEAR = 0.15; // 표준 장비에 든 MP 소비 공격(배지 +15%, 43행): 파티 MP消費攻撃이 더 크면 그것으로 바뀜
const lerpT = (a, t) => a[0] + (a[1]-a[0])*Math.min(1, Math.max(0, ((+t||0)-80)/175));

const _dbuf = new Float64Array(128);
function dimin(vals, cap){ // 체감 중첩: 1 + A + A·B + A·B·C … (A가 최대값)
  let n=0;
  for(let i=0;i<vals.length;i++){ const v=vals[i]; if(v>0){ let k=n++; while(k>0 && _dbuf[k-1]<v){ _dbuf[k]=_dbuf[k-1]; k--; } _dbuf[k]=v; } }
  if(!n) return 0;
  let tot=0, prod=1;
  for(let i=0;i<n;i++){ prod*=_dbuf[i]; tot+=prod; if(prod<1e-4) break; }
  return cap!=null ? Math.min(tot,cap) : tot;
}
const pct = v => (typeof v==='number' ? v : 0)/100;
const isCharge = cond => /축적|누적|소비|스택|蓄積|消費/.test(cond||'');

const ZKEYS = ['fire','water','earth','wind','thunder','shade','crystal','slash','pierce','blunt','magic','slash_pierce','slash_magic','starsea','stellar_sea','星海陣','all_weapon','moonlight','thunder_shade_crystal'];
/* ---------- 존 종류 정규화 ---------- */
const ZT_ALIAS = {starsea:'all', stellar_sea:'all', '星海陣':'all', all_weapon:'all', moonlight:'moon', thunder_shade_crystal:'moon'};
function zoneOpt(t){
  if(ELEMS.includes(t) && t!=='none') return {kind:'elem', types:[t], key:t};
  if(WTYPES.includes(t)) return {kind:'weap', types:[t], key:t};
  if(t==='slash_pierce') return {kind:'weap', types:['slash','pierce'], key:t};
  if(t==='slash_magic') return {kind:'weap', types:['slash','magic'], key:t};
  if(ZT_ALIAS[t]==='all') return {kind:'all', types:[], key:t};
  if(ZT_ALIAS[t]==='moon') return {kind:'elem', types:['thunder','shade','crystal'], key:'moonlight'};
  return null;
}
function normZoneType(t){
  if(!t) return null;
  const parts = String(t).split('/').map(x=>x.trim()).filter(Boolean);
  const opts = parts.map(zoneOpt).filter(Boolean);
  return opts.length ? {opts} : null;
}

/* ---------- 존 전개 조건 해석 ---------- */
const EL_WORDS = [['fire',/^(불|화|火)/],['water',/^(물|수|水)/],['earth',/^(땅|지|地)/],['wind',/^(바람|풍|風)/],['thunder',/^(번개|뢰|雷)/],['shade',/^(그림자|음|陰)/],['crystal',/^(결정|정|晶)/]];
const WP_WORDS = [['staff',/지팡이|杖/],['sword',/(^|[^가-힣])검|剣/],['katana',/(^|[·\/\s])도($|[·\/\s])|刀/],['ax',/도끼|斧/],['lance',/창|槍/],['bow',/활|弓/],['fist',/권갑|拳/],['hammer',/망치|槌|추/]];
const PERS_WORDS = [[/아르카디아|アルカディア/,'アルカディア'],[/IDA/,'IDAスクール'],[/아웃로|アウトロー/,'アウトロー'],[/KMS/,'KMS社'],
  [/輪舞|윤무/,'時の傷痕の輪舞'],[/로스트\s?랩|ロストラボ/,'ロストラボ'],[/미그란스|ミグランス/,'ミグランス王宮'],[/巳の国|사의 나라/,'巳の国'],
  [/마수|魔獣/,'魔獣'],[/성직자|聖職者/,'聖職者'],[/엘프|エルフ/,'エルフ'],[/주인공|主人公/,'主人公'],[/FFIX|FF9/,'FFIX'],[/고양이 애호|ねこ好き/,'ねこ好き'],
  [/普賢一刀流|보현일도류/,'普賢一刀流'],[/コープ/,'コープ'],[/인조인간|合成人間/,'合成人間'],[/동방|東方/,'東方'],[/왕족|王族/,'王族']];
function parseReq(cl){
  // 반환: null(조건 없음) | {kind, vals, n, others}
  const others = /타 아군|다른 아군|그 외/.test(cl);
  if(/KOF/.test(cl)){ const m=cl.match(/(\d)\s*명/); return {kind:'kof', vals:[], n:m?+m[1]:4, others}; }
  if(/ビビ|비비/.test(cl)) return {kind:'name', vals:['ビビ'], n:1, others:true};
  let m = cl.match(/([가-힣A-Za-z぀-ヿ一-鿿·\/\s]+?)\s*중\s*(\d)\s*종/);
  if(m){ const vals=EL_WORDS.filter(([k])=>new RegExp({fire:'불|화',water:'물|수',earth:'땅|지',wind:'바람|풍',thunder:'뇌|번개',shade:'음|그림자',crystal:'정|결정'}[k]).test(m[1])).map(([k])=>k);
    return {kind:'distinct', vals, n:+m[2], others:true}; }
  if(/명\(冥\)|冥\)? ?\d|冥 아군|명 아군/.test(cl) && !/전방 ?명 ?\d/.test(cl)){ const m2=cl.match(/(\d)\s*명/); return {kind:'align', vals:['shadow'], n:m2?+m2[1]:3, others}; }
  if(/천\(天\)|天 아군|천 아군/.test(cl)){ const m2=cl.match(/(\d)\s*명/); return {kind:'align', vals:['light'], n:m2?+m2[1]:3, others}; }
  if(/에 따라|최다 속성/.test(cl)) return null;
  const pv = PERS_WORDS.filter(([re])=>re.test(cl)).map(([,v])=>v);
  if(pv.length){ const m2=cl.match(/(\d)\s*(명|인|人)/); return {kind:'pers', vals:pv, n:m2?+m2[1]:1, others}; }
  if(/퍼스널리티|アルカナ|輪舞/.test(cl)) return {kind:'unknown', vals:[], n:1, others};
  const only = cl.match(/(?:전방|전위|전열)(?:이|에)?\s*([^\s]{1,6})\s*(?:속성)?\s*(?:캐릭|캐릭터|아군)?\s*(?:만일|만 있|뿐)/);
  if(only){ const t=only[1]; const w=WP_WORDS.filter(([k,re])=>re.test(t)).map(([k])=>k); if(w.length) return {kind:'weap',vals:w,n:4,others:false};
    for(const [k,re] of EL_WORDS) if(re.test(t)) return {kind:'elem',vals:[k],n:4,others:false}; }
  // "전방/전위/전열 ... X N명" 또는 "X 아군 있으면"
  m = cl.match(/(?:전방|전위|전열|전후위)\s*(?:에\s*)?(?:타\s*)?(?:아군이\s*)?([^\d]{0,22}?)\s*(?:속성|장비자|아군)?\s*(\d)\s*(?:명|인|人)/);
  if(!m) m = cl.match(/(?:전방|전위|전열)\s*(?:에\s*)?(?:타|다른)?\s*([^\d]{1,14}?)\s*(?:장비자|아군|캐릭터)?\s*(?:이|가)?\s*있으면()/);
  let subj=null, n=null;
  if(m){ subj=m[1]; n=m[2]?+m[2]:1; }
  else { const m3 = cl.match(/(?:전방|전위|전열)\s*(?:에\s*)?([^\s]{1,10})\s*(?:장비자|아군)?\s*(?:이|가)?\s*있으면/); if(m3){ subj=m3[1]; n=1; } }
  if(!subj){ const m4 = cl.match(/([^\s\d]{1,10})\s*(\d)\s*명/); if(m4 && /이면|이상|시/.test(cl)){ subj=m4[1]; n=+m4[2]; } }
  if(!subj) return null;
  subj = subj.replace(/[()（）]/g,' ').trim();
  const wps = WP_WORDS.filter(([k,re])=>re.test(subj)).map(([k])=>k);
  if(wps.length) return {kind:'weap', vals:wps, n, others};
  const tok = subj.split(/[·\/\s,]+/).filter(Boolean);
  const els = [];
  for(const t of tok){ for(const [k,re] of EL_WORDS) if(re.test(t)){ els.push(k); break; } }
  if(els.length) return {kind:'elem', vals:[...new Set(els)], n, others};
  return {kind:'unknown', vals:[], n:n||1, others};
}
const KZONE = /(열화|수천|지열|지렬|풍왕|초뢰|각음|휘정|황참|순돌|굉타|환마|쌍격|월광|성해|섬격)진/;
function parseZoneCond(cond, awakened){
  let raw = cond.split(/[.。;]|,\s|\s→\s/).map(x=>x.trim()).filter(Boolean);
  // "전방 정 2명이면 輝晶陣, 4명이면 極・輝晶陣" → 두 번째 절에 앞 절의 주어를 이어 붙임
  const clauses=[];
  for(const cl of raw){
    const prev = clauses[clauses.length-1];
    if(prev && /^\d\s*(명|인)/.test(cl)){ const mm = prev.match(/^(.*?)(\d)\s*(명|인)/); if(mm){ clauses.push(mm[1]+cl); continue; } }
    clauses.push(cl);
  }
  const spec = {base:false, baseSB:false, baseReq:null, starts:[], skillGoku:[], sbGoku:false, zetsu:/絶|절[·・]/.test(cond), raw:cond};
  const START = /전투\s*시작|전투\s*개시|개전|턴\s*시작|턴\s*개시|開幕/;
  for(const cl of clauses){
    const bare = cl.replace(/\([^)]*\)/g,'');
    const sb = /SB/.test(bare);
    const goku = /極|극[·・]|ZONE\s*각성|존\s*각성|각성|AZ|어나더\s*존|ANOTHER/.test(cl) && !/미대응|불가/.test(cl);
    const deploy = /전개|VC|선제/.test(bare) || /陣/.test(bare) || KZONE.test(bare);
    const req = parseReq(bare) || (/이면|있으면|이상/.test(bare)?null:null);
    const setup = /누적|축적|소비|합계/.test(bare);
    if(START.test(bare) && !setup){
      if(goku && awakened) spec.starts.push({req, zetsu:/絶/.test(cl)});
      else if(deploy){ if(req) spec.baseReq = spec.baseReq||req; else spec.base=true; }
      continue;
    }
    if(sb){ if(goku && awakened) spec.sbGoku=true; else if(deploy) spec.baseSB=true; continue; }
    if(goku && awakened) spec.skillGoku.push({req});
    if(deploy && !/불가|미대응/.test(bare)){ if(req && !goku) spec.baseReq = spec.baseReq||req; else spec.base=true; }
  }
  if(!spec.base && !spec.baseReq && !spec.baseSB && !spec.starts.length && !spec.sbGoku && !spec.skillGoku.length) spec.base=true;
  return spec;
}
function reqMet(req, team, self){
  if(!req) return true;
  const n = reqCount(req, team, self);
  return n >= (req.n||1);
}
function reqCount(req, team, self){
  const pool = req.others ? team.filter(m=>m!==self) : team;
  let n=0;
  if(req.kind==='elem') n = pool.filter(m=>m.elems.some(e=>req.vals.includes(e))).length;
  else if(req.kind==='weap') n = pool.filter(m=>req.vals.includes(m.weapon)).length;
  else if(req.kind==='align') n = pool.filter(m=>req.vals.includes(m.align)).length;
  else if(req.kind==='kof') n = pool.filter(m=>KOF_JP.includes(m.raw.name_jp)||m.pers.has('KOF')).length;
  else if(req.kind==='pers') n = pool.filter(m=>req.vals.some(v=>m.pers&&m.pers.has(v))).length;
  else if(req.kind==='name') n = pool.filter(m=>req.vals.includes(m.raw.name_jp)).length;
  else if(req.kind==='distinct') n = new Set(pool.flatMap(m=>m.elems.filter(e=>req.vals.includes(e)))).size;
  else return 0;
  return n;
}
/* 'ZONE 중 ○ 공격 수만큼 전체 강화'(15/30/45/60% 등, 2026-10-16 K2): 그 턴 아군의 ○ 공격 수(전열 4명 → 최대 4)로 턴 종료에 강화(같은 계열 'ZONE 중 ○ 공격 수만큼 전체 회복'이 턴 종료 효과)
   → 1턴째(허수아비 AF·실전 1턴째 AF)엔 없고, 평상 턴은 2턴째부터, 실전 2턴째 이후 AF는 앞 턴 공격 수. q: {wt:[…]} | {el:[…]} | {kind:'mag'|'phys'} | req 형식({kind:'elem', vals}), n: 최대가 되는 공격 수(기본 4) */
function frontCount(q, team){
  if(q.vals) return reqCount(q, team, null);
  return team.slice(0,4).filter(m=>{ const sk = m.main||{}, el = sk.element||m.elem, wt = sk.weapon_type||m.wt, kind = sk.kind||'phys';
    if(q.wt) return [].concat(q.wt).includes(wt); if(q.el) return [].concat(q.el).includes(el); if(q.kind) return kind===q.kind; return true; }).length;
}
function cntFill(q, team, sit, A){
  const n = Math.max(1, +q.n||4), f = Math.min(n, frontCount(q, team))/n;
  if(sit==='normal'){ const H = Math.max(1, (A.tm && A.tm.H) || 6); return f*(H-1)/H; }
  return A.realT>1 ? f : 0;
}
const KOF_JP = ['テリー・ボガード','草薙京','クーラ・ダイアモンド','不知火舞'];
const PERS_KR = {'アルカディア':'아르카디아','IDAスクール':'IDA 스쿨','アウトロー':'아웃로','KMS社':'KMS사','時の傷痕の輪舞':'시간의 흉터 윤무','ロストラボ':'로스트 랩',
  'ミグランス王宮':'미그란스 왕궁','巳の国':'사의 나라','魔獣':'마수','聖職者':'성직자','エルフ':'엘프','主人公':'주인공','ねこ好き':'고양이 애호','普賢一刀流':'보현일도류',
  'コープ':'코프','合成人間':'인조인간','東方':'동방','王族':'왕족','KOF':'KOF','FFIX':'FFIX','剣':'검','刀':'도','斧':'도끼','槍':'창','弓':'활','拳':'권갑','槌':'망치','杖':'지팡이',
  '火':'불','水':'물','地':'땅','風':'바람','雷':'번개','陰':'그림자','晶':'결정',
  '仮面':'가면','科学者':'과학자','記憶喪失':'기억 상실','人見知り':'낮가림','甘党':'단것 애호가','大食い':'대식가','読書家':'독서가','ドラゴンキラー':'드래곤 킬러','心の怪盗団':'마음의 괴도단',
  '未来革命家':'미래 혁명가','復讐者':'복수','辛党':'부천수 애호가','西方':'서방','メガネ':'안경','煉獄界':'연옥계','妖し':'요괴','料理':'요리','竜':'용','吟遊詩人':'음유 시인','ニックネーマー':'작명가','銃':'총','COA':'COA'};
function reqText(req){
  if(!req) return '';
  const nm = req.kind==='elem' ? req.vals.map(v=>ELEM_KR[v]).join('·')+' 속성'
    : req.kind==='weap' ? req.vals.map(v=>WEAPON_KR[v]).join('·')
    : req.kind==='align' ? (req.vals[0]==='light'?'천':'명')+' 캐릭터'
    : req.kind==='kof' ? 'KOF 콜라보' : req.kind==='name' ? req.vals.join('·') : req.kind==='pers' ? req.vals.map(v=>PERS_KR[v]||v).join('·')+' 퍼스널리티'
    : req.kind==='distinct' ? req.vals.map(v=>ELEM_KR[v]).join('/')+' 서로 다른' : '특정 퍼스널리티';
  return `전방 ${nm} ${req.n||1}${req.kind==='distinct'?'종':'명'}${req.others?'(본인 제외)':''}`;
}

/* 팀 구성에 따라 속성이 바뀌는 캐릭터 (존 종류와 주력 속성) */
const ELEM_SWITCH = {
  jilfany_as: {need:{kind:'elem', vals:['crystal'], n:3, others:false}, yes:'crystal', no:'water', zone:['crystal']} // 공격 속성은 輝晶陣이 깔려 있으면(누가 폈든) 결정, 자기 존 종류는 전방 결정 3명이면 輝晶陣
};
/* ---------- 파티 버프 조건 규칙 (data/buff_rules.json → party_rules) ---------- */
const FG = {
  stat:['pwr','int','spd'], pwr:['pwr'], int:['int'], spd:['spd'],
  elem:['all_elem_atk','elem_atk'], allel:['all_elem_atk'], elat:['elem_atk'],
  weap:['weapon_atk'], crit:['crit_rate'], critd:['crit_dmg'],
  sf:['singular_focus'], mf:['mental_focus'], focus:['singular_focus','mental_focus'],
  ot:['overthrow'], eagle:['eagle_eyes'], oc:['over_crit'], mh:['multihit'], xhit:['extra_hit'],
  pierce:['barrier_pierce'], weak:['weak_dmg'], link:['link'],
  kou:['crit_rate','pwr_flat'], // 리나리아 巧撃: 크리율·완력 고정값을 같은 조건으로(오버크리는 オーソリゼーション에서 조건 없이)
  shinan:['shinan'], // 루나틱<심안>: 대미지 ×1.5, 약점 배율 +1 (딩 계산기 44·26행)
  kesshi:['kesshi'], // 루나틱<捨身>(결사): 대미지 ×1.7, 크리티컬 확정 (딩 계산기 44행)
  teishin:['teishin'], // 루나틱<挺身>(솔선) 아군 부여: 처음 내구→완력, 정신→지성 고정값(絶 존·가창 등 조건은 규칙으로)
  dmg:['dmg_up'],    // 주는 대미지 UP(기도·가창 등): 출처 종류마다 최댓값 하나, 종류끼리 곱
  mp:['mp_up'],      // 최대 MP %UP (딩 계산기 19행) → 정신통일·심기일체
  mpatk:['mp_atk'],  // MP消費攻撃(주는 대미지 %UP): 장비의 MP 소비 공격과 같은 종류라 하나만(최댓값, 사용자 확인)
  flat:['pwr_flat','int_flat','spd_flat'], // 스탯 고정값 UP (딩 계산기 14~16행)
  combo:['combo_up'], // AF 콤보 배율 증가량 +%p(타수당, 2026-10-16)
  charge:['charge'] // 帯電(루나틱): 자기 공격 1타마다 雷 추격(小) 1회 (2026-10-16)
};
const ALLF = [...new Set(Object.values(FG).flat())];
/* 디버프 규칙 그룹 (적에게 거는 것이라 받는 사람 조건 to는 쓰지 않음, '*'에 들어가지 않음) */
const DG = { allres:['d_all_elem_res'], elres:['d_elem_res'], res:['d_all_elem_res','d_elem_res'], pres:['d_phys_res','d_mag_res'], wres:['d_weapon_res'], def:['d_end','d_spr'] };
const DEBF = [...new Set(Object.values(DG).flat())];
function compileRules(c){
  const p = c.party_buff||{};
  let rules = Array.isArray(c.party_rules) ? c.party_rules.slice() : [];
  if(!rules.length && p.scope==='adjacent') rules=[{f:['*'],to:{pos:'adj'}}];
  if(!rules.length && (p.scope==='left'||p.scope==='right')) rules=[{f:['*'],to:{pos:'one',side:p.scope==='left'?'l':'r'}}];
  const drules = Array.isArray(c.debuff_rules) ? c.debuff_rules.map(r=>Object.assign({}, r, {deb:true})) : [];
  rules = rules.concat(drules);
  if(!rules.length) return null;
  const list=[]; let zel=false, zdep=false, sdep=false; const debSt=new Set();
  for(const r of rules){
    if(r.zel){ zel=true; zdep=true; continue; }
    const fs=new Set();
    for(const g of (r.f||['*'])){
      if(r.deb){ (DG[g]||[]).forEach(k=>fs.add(k)); continue; }
      if(g==='*') ALLF.forEach(k=>fs.add(k));
      else if(g.indexOf('elat:')===0) fs.add('elem_atk:'+g.slice(5));
      else (FG[g]||[]).forEach(k=>fs.add(k));
    }
    if(!fs.size) continue;
    if(r.deb && r.st) fs.forEach(k=>debSt.add(k));
    const w=r.when||{}, to=r.deb ? {} : (r.to||{});
    if(w.zone||w.zlv) zdep=true;
    if(w.sb||w.af||w.t!=null||w.stack||w.cnt) sdep=true;
    list.push({fs:[...fs], to, w, x:r.x!=null?r.x:1, e:r.e!=null?r.e:0, en:r.en!=null?r.en:null, me:!!r.me, pos:to.pos||null, side:to.side||null, deb:!!r.deb});
  }
  return {list, zel, zdep, sdep, hasPos:list.some(r=>r.pos), debSt};
}
function zoneMatch(spec, z){
  if(!z || z.kind==='none' || !z.level) return false;
  if(spec==='any') return true;
  if(spec==='elem') return z.kind==='elem';
  if(spec==='weap') return z.kind==='weap';
  const k=z.key;
  return [].concat(spec).some(s=> s===k || s==='any' || (s==='elem' && z.kind==='elem') || (s==='weap' && z.kind==='weap') || (s==='all' && (k==='starsea'||k==='stellar_sea'||k==='星海陣'))); // 배열 안 any·elem·weap도(skill_cond 17곳)
}
function ruleAct(r, j, team, progs, sit, z, A){
  const w=r.w; let a=1;
  if(w.zone && !zoneMatch(w.zone, z)) return 0;
  if(w.zlv && !(z && z.kind!=='none' && z.level>=w.zlv)) return 0;
  if(w.sb && !((sit==='sb' || (sit==='af' && A.postSB)) && progs[j] && progs[j].sbOK)){ if(sit==='normal' && !w.sb1 && A.sbUpN && A.sbUpN[j]>0) a*=A.sbUpN[j]; else return 0; } // SB로 건 효과는 그 AF의 남은 행동에도, 평상 턴은 SB 뒤 남는 비율
  if(w.af && sit!=='af') return 0;
  if(w.noaf && sit!=='normal') return 0; // AF·SB 땐 못 거는 효과: 허수아비·시뮬의 AF(와 그 안의 SB)는 세팅 턴 없이(축적 0) 시작하므로, 긴 축적이 필요한 스킬(예: 니나 理の再縫 = 코디네이트 40)
  if(w.req && !reqMet(w.req, team, team[j])) return 0;
  if(w.reqAny && !w.reqAny.some(q=>reqMet(q, team, team[j]))) return 0;
  if(w.pain){ const f=A.infNow; if(f ? !(f.poison>0 || f.pain>0) : !A.painAny) return 0; } // 허수아비는 그 순간 걸려 있는지
  if(w.up!=null) a*=w.up;
  if(w.t!=null && sit==='normal') a*=w.t;
  if(w.stack) a*=ruleStackFill(w.stack, team, sit, A, team[j]);
  if(w.cnt) a*=cntFill(w.cnt, team, sit, A);
  return a;
}
/* ---------- 행동 횟수 기준 축적 ----------
   A.tm = {S0: AF 전 세팅 턴(허수아비: AF 게이지가 100%가 되는 턴 수), H: 평상 턴 평균 구간}. AF 중 1인 행동은 약 AF_N_EST회.
   평상 턴 t의 공격 때 자기 행동 t회, AF k번째 행동 때 S0+k회, AF 끝 SB 때 S0+AF 행동 수만큼 쌓였다고 본다 */
const AF_N_EST = 4.5;
/* 성도 게이지 충전 보너스: 天冥 어빌리티(행동할 때 쌓이는 天/冥의 힘 증가, 강화 후 '중')는 스텔라 보드 조건(전열 구성)이 맞을 때만. 자료가 없거나 판정 불가면 충족으로 봄 */
function sbFillOK(team, i, progs, S){
  const c = team[i]; if(S.sbFillBonus===false || !c.stellar || !(progs[i] && (progs[i].sbOK || progs[i].sbAw))) return false;
  const b = c.stBoard; if(!b || !b.fill) return true;
  return reqMet(b.fill, team, c);
}
function stackFill(need, sit, A, consume, start, grow){
  need = Math.max(1, need); const tm = A.tm || {S0:2, H:6};
  const s0 = Math.max(0, Math.min(1, +start||0)), g = grow===false ? 0 : 1; // start: 개전 축적(가득 대비 비율), grow=false: AF 중엔 안 늘어남(턴 종료·체인·피격·MP 소비 등으로 쌓임)
  if(sit==='normal'){
    if(consume) return Math.max(Math.min(1, s0), Math.min(1, 2/Math.max(2,need))); // 다 쓰고 다시 모으는 한 방: 평상 턴엔 주기마다
    let v=0; const H=Math.max(1,tm.H||6); for(let t=1;t<=H;t++) v+=Math.min(1,s0+t/need); return v/H;
  }
  const S0 = tm.S0||0, n = AF_N_EST;
  if(sit==='af'){
    if(consume){ const f0=Math.min(1, s0+(S0+g)/need); return (f0 + (n-1)*Math.min(1,g/need))/n; } // 첫 사용에 다 쓰고 행동마다 다시
    return Math.min(1, s0 + (S0+g*(n+1)/2)/need);
  }
  return Math.min(1, s0 + (S0+g*n)/need); // SB: AF 끝(세팅 턴 + AF 행동)까지 쌓인 양
}
/* 규칙의 축적 버프(when.stack = {use: 버퍼 행동 1회당, turn: 턴 종료마다, turnReq: 턴 종료 축적 조건(편성), start: 개전 축적 수, max}) 채움 비율 */
function ruleStackFill(st, team, sit, A, self){
  // fill: 상황별 채움 비율을 직접 지정(ZONE 어빌리티 錬魔·鋭魔·脆禍 — 개전 축적·AF 중 소모가 있어 행동 수 근사가 안 맞는 경우, 2026-10-16)
  // {n: 평상 턴, af: 허수아비(1턴째) AF, real: 실전 3턴째 AF, sb: 1턴째 SB, sbr: 3턴째 SB}, req를 못 채우면 no(같은 형식)
  if(st.fill){ const f = st.req && !reqMet(st.req, team, self) ? (st.no || {}) : st.fill, cl = x => Math.max(0, Math.min(1, +x||0)), w = A.realT>1 ? Math.min(1, (A.realT-1)/2) : 0;
    if(sit==='normal') return cl(f.n);
    const a = sit==='sb' ? cl(f.sb!=null ? f.sb : f.af) : cl(f.af), r = sit==='sb' ? cl(f.sbr!=null ? f.sbr : (f.real!=null ? f.real : f.sb)) : cl(f.real!=null ? f.real : f.af);
    return a + (r-a)*w; }
  const tm = A.tm || {S0:2, H:6}, use = +st.use||0, max = Math.max(1, +st.max||1), st0 = +st.start||0;
  const tg = (+st.turn||0) * (st.turnReq ? (reqMet(st.turnReq, team, null) ? 1 : 0) : 1) * (st.turnPer ? frontCount(st.turnPer, team) : 1); // turnPer: 턴마다 전열의 그 조건 인원수만큼(멜로디(AS) デザイア)
  const at = (turnsDone, acts) => Math.min(1, (st0 + turnsDone*tg + acts*use)/max);
  if(sit==='normal'){ let v=0; const H=Math.max(1,tm.H||6); for(let t=1;t<=H;t++) v+=at(t-1, t); return v/H; }
  const S0 = tm.S0||0, n = AF_N_EST;
  if(sit==='af') return at(S0, S0+(n+1)/2);
  return at(S0, S0+n);
}
/* 연계 받는 사람: all / weap[] / self / one(연계 준 사람 말고 가장 센 1명) / adj(가장 센 2명) */
function linkTo(to, team, j, i){
  if(!to || to.all) return true;
  if(to.self && i===j) return true;
  if(to.weap) return to.weap.includes(team[i].weapon);
  if(to.one || to.adj){ if(i===j) return false;
    const others = team.map((m,k)=>k).filter(k=>k!==j).sort((a,b)=>(team[b].pow||0)-(team[a].pow||0) || (team[a].id<team[b].id?-1:team[a].id>team[b].id?1:0));
    return others.slice(0, to.adj ? 2 : 1).includes(i); }
  return false;
}
function toFilterOK(to, m){
  if(to.elem && !m.elems.some(e=>to.elem.includes(e))) return false;
  if(to.weap && !to.weap.includes(m.weapon)) return false;
  if(to.wt && !to.wt.includes(m.atkWt)) return false;
  if(to.align && ![].concat(to.align).includes(m.align)) return false;
  if(to.kind && m.atkKind!==to.kind) return false;
  if(to.kof && !(KOF_JP.includes((m.raw||{}).name_jp) || m.pers.has('KOF'))) return false;
  if(to.pers && !to.pers.some(v=>m.pers.has(v))) return false;
  return true;
}
/* 위치 지정 버프(양옆·오른쪽 1명 등)의 대상: 조건에 맞는 아군 중 화력 잠재력 순. 한 캐릭터 옆자리는 둘뿐이라 위치 버퍼는 2명까지 */
function computePos(team, w){ // w: 받는 사람 우선순위(이 조합에서의 AF 공격 대미지, 없으면 pow) — 2026-10-16: pow가 같으면 넣은 순서로 정해지던 문제
  // 2026-10-16(넣은 순서 의존 제거): 받는 사람마다 왼쪽·오른쪽 이웃 칸이 하나씩 — 오른쪽 1명 버퍼는 받는 사람의 왼쪽 칸, 왼쪽 1명 버퍼는 오른쪽 칸, 방향 없는 위치 버퍼(1명·양옆)는 빈 칸 아무거나.
  // 위치 버퍼는 위치 규칙 항목이 많은 순(같으면 id)으로 먼저 자리를 잡음 — 예전엔 넣은 순서대로 2명까지라 같은 조합이 3.5배까지 달라짐
  const n=team.length, side=team.map(()=>({L:-1, R:-1})), out=new Array(n).fill(null);
  const wv = i => w ? w[i] : (team[i].pow||0);
  const strength = j => { const R=team[j].rules; return R.list.reduce((v,r)=>v + (r.pos && r.pos!=='others' && r.pos!=='self' ? r.fs.length : 0), 0); };
  const order = []; for(let j=0;j<n;j++){ const R=team[j].rules; if(R && R.hasPos) order.push(j); }
  order.sort((a,b)=>strength(b)-strength(a) || (team[a].id<team[b].id?-1:team[a].id>team[b].id?1:0));
  const link = (i, j, sd) => { const o = sd==='L' ? 'R' : 'L'; // j가 i의 sd쪽 이웃 = i가 j의 반대쪽 이웃
    if(side[i][sd]===j) return true; if(side[i][sd]>=0 || side[j][o]>=0) return false; side[i][sd]=j; side[j][o]=i; return true; };
  const take = (i, j, sd) => sd ? link(i, j, sd) : (side[i].L===j || side[i].R===j || link(i, j, 'L') || link(i, j, 'R')); // sd: 'L'(버퍼가 받는 사람 왼쪽) | 'R' | null(아무 쪽)
  for(const j of order){
    const R=team[j].rules;
    out[j]=R.list.map(r=>{
      if(!r.pos) return null;
      const self = r.pos==='self'||r.pos==='selfone'||r.pos==='selfadj';
      const k = r.pos==='one'||r.pos==='selfone' ? 1 : r.pos==='adj'||r.pos==='selfadj' ? 2 : r.pos==='others' ? 9 : 0;
      const set=new Set(); if(self) set.add(j);
      const cand=[]; for(let i=0;i<n;i++) if(i!==j && toFilterOK(r.to, team[i])) cand.push(i);
      cand.sort((a,b)=>wv(b)-wv(a) || (team[a].id<team[b].id?-1:team[a].id>team[b].id?1:0));
      const sd = k===1 ? (r.side==='r' ? 'L' : r.side==='l' ? 'R' : null) : null;
      let got=0;
      for(const i of cand){
        if(got>=k) break;
        if(k<9 && !take(i, j, sd)) continue;
        set.add(i); got++;
      }
      return set;
    });
  }
  return out;
}
function buildBF(team, progs, sit, z, A, posSets, upt, debToo){
  const n=team.length; let any=false; const FX=new Array(n).fill(null);
  for(let j=0;j<n;j++){ const f = bfOne(team, progs, sit, z, A, posSets, upt ? upt[j] : 1, debToo, j); if(f){ FX[j]=f; any=true; } }
  return any?FX:null;
}
/* 버프 주는 사람 j 한 명의 받는 사람별 배율 행(조건 규칙 × 지금 켜진 정도 u0: 숫자 또는 {m: 켜진 항목}) */
const BF_C = new WeakMap(), BF_U = new Map();
function bfOne(team, progs, sit, z, A, posSets, u0in, debToo, j){
  const n=team.length; let any=false; const FX=[null];
  {
    const R=team[j].rules, u0 = u0in, um = u0 && typeof u0==='object' ? (u0.m||null) : null, mf = u0 && typeof u0==='object' ? (u0.mf||null) : null, u = (um||mf) ? 1 : u0; // um: 지금 켜진 항목(버프 행동별, buff_acts.json), mf: 평상 턴 항목별 유지율
    const mk = k => um ? (um.has(k) ? 1 : 0) : mf ? (mf[k]!=null ? mf[k] : 1) : 1;
    if(!R){
      // 규칙 없는 캐릭터: 받는 사람과 무관하게 같은 행이라 한 행을 같이 쓰고, 같은 마스크·유지율이면 다시 씀(2026-10-16 계산량, 행은 읽기만 함)
      if(um||mf){ const mo = um||mf, ck = n+(debToo?'d':''); let mc = BF_C.get(mo); if(!mc){ mc = new Map(); BF_C.set(mo, mc); } const h = mc.get(ck); if(h) return h;
        const row={weak_x:mk('weak'), brk_x:mk('brk')}; for(const k of ALLF) row[k]=mk(k); if(debToo) for(const k of DEBF) row[k]=mk(k);
        const r = {rows: new Array(n).fill(row), zel:false, sm:um, smf:mf}; mc.set(ck, r); return r; }
      else if(u<1){ const ck = u+'|'+n+(debToo?'d':''), h = BF_U.get(ck); if(h) return h;
        const row={weak_x:u, brk_x:u}; for(const k of ALLF) row[k]=u; if(debToo) for(const k of DEBF) row[k]=u;
        const r = {rows: new Array(n).fill(row), zel:false, su:u}; if(BF_U.size>2000) BF_U.clear(); BF_U.set(ck, r); return r; }
      return FX[0];
    }
    any=true;
    const rows=[]; for(let i=0;i<n;i++) rows.push({});
    const L=R.list;
    for(let ri=0;ri<L.length;ri++){
      const r=L[ri];
      const a = ruleAct(r,j,team,progs,sit,z,A);
      const ps = posSets&&posSets[j] ? posSets[j][ri] : null;
      for(let i=0;i<n;i++){
        let v;
        if(r.me && i===j) v=r.x;
        else {
          let t=0;
          if(a>0){ t = r.pos ? (ps&&ps.has(i)?1:0) : 1; if(t && !r.pos && !toFilterOK(r.to, team[i])) t=0; if(t && r.to.p!=null) t*=r.to.p; }
          const e0 = (sit==='normal' && r.en!=null) ? r.en : r.e; // en: 평상 턴에만 쓰는 미충족 배율 (지속 턴이 짧은 경우)
          v = e0 + a*t*(r.x-e0);
        }
        if(v===1) continue;
        const row=rows[i]; for(const k of r.fs) row[k]=(row[k]==null?1:row[k])*v;
      }
    }
    if(um||mf) for(const row of rows){ row.weak_x = mk('weak'); row.brk_x = mk('brk'); for(const k of ALLF) row[k]=(row[k]==null?1:row[k])*mk(k); if(debToo) for(const k of DEBF) row[k]=(row[k]==null?1:row[k])*mk(k); for(const k in row) if(k.indexOf(':')>0) row[k]*=mk(k.split(':')[0]); }
    else if(u<1) for(const row of rows){ row.weak_x = u; row.brk_x = u; for(const k of ALLF) row[k]=(row[k]==null?1:row[k])*u; if(debToo) for(const k of DEBF) row[k]=(row[k]==null?1:row[k])*u; for(const k in row) if(k.indexOf(':')>0) row[k]*=u; }
    FX[0]={rows, zel:R.zel}; if(um) FX[0].sm = um; else if(mf) FX[0].smf = mf; else if(u<1) FX[0].su = u;
  }
  return FX[0];
}

/* ---------- 캐릭터 전처리 ---------- */
const SRC_R = {auto:0, main:1, step:2, sb:3, vc:4};
const VC_RE = /ヴァリアブルチャント|^VC/, VC_UP = 1/6; // VC(교대 시 발동, 1턴): 평상 턴 6턴 중 1턴, AF·SB·허수아비엔 없음(2026-10-16 점검: 약 140명이 '개전 자동'으로 늘 켜져 있었음)
function skillPow(sk){
  if(!sk) return 0;
  const tgt = sk.target==='st'?'st':'aoe', kind = sk.kind==='mag'?'mag':'phys', el=(sk.element||'none')==='none'?'no':'el';
  const sv = (SIZE_TABLE[tgt+'_'+kind+'_'+el]||SIZE_TABLE.aoe_phys_el)[SIZE_IDX[sk.size]??3]/100;
  let m = Math.max(sk.mult||1,1);
  if(sk.mcond){ const b=Math.max(0.1, sk.mcond.base!=null?+sk.mcond.base:1); m = b + (m-b)*0.6; }
  else if(isCharge(sk.condition) && m>=30){ m*=0.4; if(m>25) m=25+(m-25)*0.2; }
  return sv*m*(1+(sk.repeat||0)*0.7); // 크기×배율 = 스킬 전체 위력(타수 합)
}
function prepChar(c){
  // 요격 세팅 스킬이 주력기로 잡힌 경우: 반격 화력은 요격으로 따로 세므로 주력기 자체 배율은 1로
  if(c.counter && c.main && /요격|迎撃/.test((c.main.skill||'')+(c.main.condition||''))) c = Object.assign({}, c, {main: Object.assign({}, c.main, {mult:1, mcond:null})});
  const p = c.party_buff||{}, s=c.self_buff||{}, d=c.debuff||{}, sp=c.support||{};
  const wt = WEAPON_TYPE[c.weapon]||'slash';
  const zone = c.zone && c.zone.type ? c.zone : null;
  const zoneTypes = zone ? normZoneType(zone.type) : null;
  const zspec = zone ? parseZoneCond(zone.condition||'', !!zone.awakened) : null;
  const cx = complexity(c);
  const m0 = c.main||{};
  const atkKind = m0.kind==='mag'?'mag':'phys';
  const pow = Math.max(skillPow(c.main), 0.6*skillPow(c.sb)) * ((c.roles||[]).includes('dps')?1:0.5);
  const ex = c.ex || {}, mpx = ex.mp || {}, tx = ex.turns || {};
  const partyHas = ['pwr','int','spd','all_elem_atk','crit_rate','crit_dmg'].some(k=>(p[k]||0)>0) || Object.values(p.elem_atk||{}).some(v=>v>0) || Object.values(p.weapon_atk||{}).some(v=>v>0)
    || p.singular_focus || p.mental_focus || p.overthrow || p.multihit || p.extra_hit || p.over_crit
    || (p.dmg_up||0)>0 || (p.mp_up||0)>0 || p.kesshi || p.shinan || (p.pwr_flat||0)>0 || (p.int_flat||0)>0;
  // 파티 버프를 걸려면 따로 행동해야 하는지 (주력기와 같은 스킬로 보이면 행동 소모 없음)
  // 딜러는 버프가 공격기에 붙어 있거나 틈틈이 거는 경우가 많아 행동을 따로 빼지 않는다
  // buff_act: true면 딜러라도 버프 스킬에 행동을 따로 씀 (히스메나(ES) エストレヤ・フガス 등)
  const buffAct = ex.buff_act===true ? !!partyHas : ex.buff_act===false ? false : (ex.buff_how==='skill' && !!partyHas && !(c.roles||[]).includes('dps') && mpx.buff!==0 && tx.buff!==99 && !(mpx.buff!=null && mpx.main!=null && mpx.buff===mpx.main));
  return {
    pers: new Set((ex.personality||[]).concat(c.element||[]).map(x=>({fire:'火',water:'水',earth:'地',wind:'風',thunder:'雷',shade:'陰',crystal:'晶'}[x]||x))),
    // 속성 퍼스널리티(서약 '속성 ○의 아군' 판정용). 데이터에 없으면 공격 속성으로
    persEl: (()=>{ const K={'火':'fire','水':'water','地':'earth','風':'wind','雷':'thunder','陰':'shade','晶':'crystal'}; const L=(ex.personality||[]).map(x=>K[x]).filter(Boolean); return L.length?L:(c.element||[]); })(),
    mpMain: mpx.main!=null ? mpx.main : null, mpBuff: mpx.buff!=null ? mpx.buff : null, mpSB: mpx.sb!=null ? mpx.sb : null,
    buffAct, buffTurns: tx.buff==null ? 3 : tx.buff, debTurns: tx.debuff==null ? 3 : tx.debuff, manifestMax: ex.manifest!=null ? ex.manifest : null,
    buffHow: ex.buff_how || (partyHas ? 'skill' : 'none'),
    naR: Math.min(1, 1.6/Math.max(1.6, skillPow(c.main))),
    cx: cx.v, cxWhy: cx.why, rules: compileRules(c), pow, atkKind, atkWt: m0.weapon_type || (atkKind==='mag'?'magic':wt),
    id:c.id, raw:c, name:c.name_kr, elem:(c.element&&c.element[0])||'none', elems:c.element||[], weapon:c.weapon, wt,
    align:c.align, stellar:!!c.stellar, tier:c.tier||'', score:c.score||0, roles:c.roles||[],
    main:c.main, sb:c.sb, afSk: c.af_skill || null, sbN: c.stellar && c.sb_normal && c.sb_normal.attack!==false && c.sb_normal.mult>0 ? c.sb_normal : null, // 비SB 성도 스킬(AF 행동 후보)
    zoneSet: !!((c.af_skill && c.af_skill.zone_set) || (!c.af_skill && c.main && c.main.zone_set)), // AF 행동 스킬이 자기 존을 전개(존은 하나뿐이라 기존 존을 덮어씀)
    // 횟수 제한 주력(main.uses, 예: 세스타(AS) 狼志 4): 다 쓰면 main.alt 로 (허수아비 AF 행동 단위에서만)
    mainAlt: c.main && c.main.uses && c.main.alt ? Object.assign({}, c.main, c.main.alt, {alt:null, uses:null}) : null,
    self:s, party:p, deb:d, tags:c.tags||[], teishin: !!c.teishin,
    // AF 버프·디버프 행동(buff_acts.json): auto·main·sb 항목 묶음 + buff/attack 행동 목록(순서대로). 데이터에 있는데 행동에 없는 항목은 main
    bact: (()=>{ const L = Array.isArray(c.bact) ? c.bact : null; if(!L) return null;
      const key = g => g.indexOf('party.')===0 ? g.slice(6) : g.indexOf('self.')===0 ? 's.'+g.slice(5) : g==='debuff.break' ? 'brk' : g==='debuff.weak_expose' ? 'weak' : g.indexOf('debuff.')===0 ? 'd_'+g.slice(7) : null;
      const auto=new Set(), main=new Set(), sb=new Set(), vc=new Set(), sb1=new Set(), steps=[], seen=new Set(), selfSrc={}; let zActs = null, mainActs = 0, mainActK = null;
      for(const a of L){ const g=(a.g||[]).map(key).filter(Boolean);
        if(c.echange && c.echange.skill && a.s===c.echange.skill) g.push('echg'); // 속성 변환(変幻自在 등)도 그 스킬의 항목(2026-10-16: 실전·지속 계산에서 칸·행동 없이 늘 켜져 있던 문제)
        if(c.counter && c.counter.skill && a.s===c.counter.skill) g.push('ctr'); // 요격을 거는 스킬(알마(AS) リフレクトバレット 3턴): 장착·사용해야 요격(2026-10-16)
        if(!g.length && !a.z) continue; g.forEach(x=>seen.add(x));
        const isVC = a.k==='auto' && VC_RE.test(String(a.s||''));
        for(const x of g) if(x.indexOf('s.')===0){ const q = x.slice(2), kk = isVC ? 'vc' : a.k==='buff'||a.k==='attack' ? 'step' : a.k; if(!selfSrc[q] || SRC_R[kk] < SRC_R[selfSrc[q]]) selfSrc[q] = kk; }
        if(isVC){ g.forEach(x=>vc.add(x)); continue; }
        if(a.k==='sb' && +a.dur>0 && +a.dur<=1) g.forEach(x=>sb1.add(x)); // SB 그 턴만(ターン終了まで): 평상 턴에 안 남음 // 자기 버프 출처(여럿이면 auto > main > 행동 > sb 순으로 먼저 켜지는 쪽)
        if(a.k==='auto') g.forEach(x=>auto.add(x)); else if(a.k==='main'){ g.forEach(x=>main.add(x)); if(+a.acts>0){ mainActs = Math.max(mainActs, +a.acts); mainActK = (mainActK||[]).concat(g.filter(x=>x.indexOf('s.')===0).map(x=>x.slice(2))); } } else if(a.k==='sb') g.forEach(x=>sb.add(x));
        else if(a.k==='buff'||a.k==='attack') steps.push({k:a.k, g:new Set(g), h:+a.h||0, s:a.s||'', mp:+a.mp||0, mp0: a.mp===0, na:!!a.na, once:!!a.once, dur:+a.dur||0, z:a.z||null, zk:a.zk||null, zlv:+a.lv||0, zreq:a.req||null,
          pw: a.k==='attack' && a.size ? {el:a.el||null, wt:a.wt||null, size:a.size, mult:a.mult!=null?+a.mult:1, hits:+a.hits||+a.h||1, afx:+a.afx||1} : null}); // pw: 공격 버프기 위력(2026-10-15 전수 대조), z: 존 전개/각성 행동
        if(a.z && (a.k==='main' || a.k==='auto' || a.k==='sb')) (zActs = zActs || []).push({k:a.k, z:a.z, s:a.s||'', zk:a.zk||null, zlv:+a.lv||0, zreq:a.req||null}); }
      const nzv = v => typeof v==='number' ? v>0 : v && typeof v==='object' ? Object.values(v).some(nzv) : !!v;
      for(const k in p) if(k!=='scope' && k!=='restrict' && nzv(p[k]) && !seen.has(k)) main.add(k);
      for(const k in d) if(nzv(d[k])){ const kk = k==='break' ? 'brk' : k==='weak_expose' ? 'weak' : 'd_'+k; if(!seen.has(kk)) main.add(kk); }
      // 행동 점수(2026-10-16, 같은 이득일 때의 순서·존 전개가 쓸모없을 때의 순서): 존 전개·각성 > 대미지 버프·내성 디버프 > 독·페인 > 생존용(적 완력·지성·속도 DOWN)
      const MAJ = new Set(['echg','all_elem_atk','elem_atk','weapon_atk','pwr','int','crit_rate','crit_dmg','singular_focus','mental_focus','multihit','extra_hit','link','dmg_up','over_crit','overthrow','kesshi','shinan','teishin','mp_atk','weak_dmg','barrier_pierce','charge','d_all_elem_res','d_elem_res','d_phys_res','d_mag_res','d_weapon_res','d_end','d_spr','weak','brk']);
      const SURV = new Set(['d_pwr','d_int','d_spd']), isDps = (c.roles||[]).includes('dps');
      const score = st => { if(st.z) return 1000; let v = 0; for(const x0 of st.g){ const self = x0.indexOf('s.')===0, x = self ? x0.slice(2) : x0;
          v += SURV.has(x) ? 0.5 : x==='d_pain_poison' ? 4 : MAJ.has(x) ? (self ? (isDps ? 10 : 4) : 10) : (self ? 2 : 4); }
        if(st.k==='attack' && st.pw && st.pw.mult>=5) v += 3; return v; };
      steps.forEach((st,q)=>{ st.sc = score(st); st.sc2 = st.z ? score(Object.assign({}, st, {z:null})) : st.sc; st.q = q; }); // sc2: 존 전개가 쓸모없는 편성에서의 순위
      // 기본 순서는 존 전개 먼저, 그다음 데이터 순서(무작위 60조합 비교: 항목 수 점수 순서보다 나음). 정밀 계산은 stepValues(실제 이득 순)
      steps.sort((x,y)=>(y.z?1:0)-(x.z?1:0) || x.q-y.q);
      const sbOnly = new Set([...sb].filter(x=>!main.has(x) && !auto.has(x) && !steps.some(st=>st.g.has(x)))); // SB로만 거는 항목
      const vcOnly = new Set([...vc].filter(x=>!main.has(x) && !auto.has(x) && !sb.has(x) && !steps.some(st=>st.g.has(x)))); // VC로만 거는 항목
      for(const x of vcOnly) main.delete(x);
      return {auto, main, sb, sbOnly, vcOnly, sb1: new Set([...sb1].filter(x=>sbOnly.has(x))), steps, selfSrc, selfKeys: Object.keys(selfSrc), zActs, mainActs, mainActK: mainActK ? new Set(mainActK) : null}; })(),
    // 부활·전투불능 방지 등급(data/revive.json g, 0~3). 조사 밖이면 예전 true/false → 1/0
    sup: Object.assign({}, sp, {revive: c.revive && c.revive.g!=null ? +c.revive.g : (sp.revive ? 1 : 0), reviveFx: (c.revive && c.revive.fx) || null}),
    supTo: c.support_to || null, supSrc: c.support_src || null, play: c.play_kr || '',
    selfStk: c.self_stk || null, turnEnd: Array.isArray(c.turn_end) && c.turn_end.length ? c.turn_end : null,
    states: Array.isArray(c.states) && c.states.length ? c.states : null, alts: Array.isArray(c.alts) && c.alts.length ? c.alts : null,
    once: Array.isArray(c.once) ? (c.once.filter(e=>e && e.atk && !e.buddy).length ? c.once.filter(e=>e && e.atk && !e.buddy) : null) : null, // 전투 중 1회·첫 사용 강공격(once.json)
    styleB: Array.isArray(c.style_bonus) && c.style_bonus.length ? c.style_bonus : null,
    zoneVC: !!(c.zone && c.zone.vc_only), zoneBreaks: c.zone && c.zone.breaks ? c.zone.breaks : null, zoneAwAny: c.zone && c.zone.awaken_any ? c.zone.awaken_any : null,
    zone, zoneTypes, zspec, zoneAwak: !!(zone&&zone.awakened),
    breakT: (d.break||'').toLowerCase(),
    weakExpose: (d.weak_expose||'').split(/[(\s]/)[0],
    pain: !!d.pain_poison,
    // 독·페인 부여: 평상 턴 가동률(주력기·패시브로 매번 걸면 1, 따로 걸면 지속 턴에 따라)
    inflict: (()=>{ const x=c.inflict; if(!x){ return d.pain_poison ? {poison:0.6, pain:0.6, st:false} : null; }
      const u = x.on_main ? 1 : (x.turns>=99 ? 0.95 : x.turns>=3 ? 0.85 : x.turns>=1 ? 0.6 : 0.75);
      return {poison: x.poison?u:0, pain: x.pain?u:0, st: x.target==='st', when: x.dummy || (x.on_main ? 'main' : 'skill')}; })(), // when: 허수아비 1턴에서 걸리는 시점(inflict.json dummy)
    selfDamage: (c.tags||[]).includes('self_damage'),
    chain: Array.isArray(c.chain) && c.chain.some(e=>e&&e.atk) ? c.chain.filter(e=>e&&e.atk) : null,
    echange: c.echange || null,
    counter: c.counter || null,
    afAnim: +c.af_anim > 0 ? +c.af_anim : null, // AF 중 스킬 연출 시간(초), 데이터 없으면 설정값
    afStartR: c.af_start || null, afRefillR: c.af_refill || null,
    base: c.base || ('jp:'+String(c.name_jp||c.id).replace(/\((AS|ES)\)$/,'')), // 같은 캐릭터의 스타일 묶음 (한 파티에 하나만)
    // 선제: 버프·디버프를 거는 스킬이 속도와 무관하게 먼저 나감
    preempt: /선제|先制/.test(((c.main||{}).condition||'')+' '+((c.main||{}).skill||'')) || (c.tags||[]).some(t=>t==='preemptive'||t==='preemptive_party'),
    cover: c.cover || null,
    links: Array.isArray(c.links) && c.links.length ? c.links : null, // 연계 부여(data/link.json) // 아군 대신 맞기: 'aoe'(수세·전체공격 대신 받기) | 'sb'(SB 턴만)
    fateTbl: Array.isArray(c.fate_tbl) && c.fate_tbl.length ? c.fate_tbl : null,
    afT: c.af_t || null, // 허수아비·AF 타이밍 보정(af_timing.json): party/self/deb 항목별 AF·SB 때 배율 또는 'sb'(SB 뒤만), zone
    stBoard: c.stellar_board || null, // 스텔라 보드: stats(합계), fill(天冥 어빌리티 조건 → SB 게이지 충전 증가)
    stats: Array.isArray(c.stats) && c.stats.length===8 ? c.stats : null,
    mainStat: (m0.stat==='int'||m0.stat==='spd') ? m0.stat : 'pwr',
    mzone: (()=>{ const L=[]; for(const sk of [c.main, c.sb, c.af_skill, c.sb_normal]) if(sk && sk.mcond) for(const cd of [].concat(sk.mcond.need||[], ...((sk.mcond.steps||[]).map(s=>s[1]||[])))) if(cd && cd.zone) L.push(cd); return L.length?L:null; })()
  };
}

/* ---------- 운용 난이도 (캐릭터별 조작 부담) ---------- */
function complexity(c){
  const T = new Set(c.tags||[]); const why=[]; let v=0;
  const has = (...k)=>k.some(x=>T.has(x));
  const txt = [(c.main||{}).condition, (c.sb||{}).condition, c.req].join(' ');
  if(has('lunatic','lunatic_plus','mode_switch','stance','copy','stealth','lunatic_charged') || /루나틱|モード|모드 ?체인지|상태 변화|状態変化|상태 시|상태 중|상태로|상태에서|상태 해제/.test(txt)){ v+=1; why.push('상태·모드 전환 타이밍'); }
  if(has('stack','stack_consume','resonance','zone_stack','power_level') || /축적|누적|소비|스택|蓄積/.test(txt) || /[가-힣\u3040-\u30ff\u4e00-\u9fff]\s?\d+\s?이상/.test(txt)){ v+=1; why.push('축적 관리'); }
  if(has('self_damage','hp_max_condition') || /자상|HP ?소모|HP ?최대/.test(txt)){ v+=0.8; why.push('HP 관리(자상·최대HP 조건)'); }
  if(has('counter','cover') || /요격|迎撃|피격/.test(txt)){ v+=0.5; why.push('피격·요격 유도'); }
  if(has('prayer','song') || /祈祷|기도|가창|歌唱/.test(txt)){ v+=0.5; why.push('기도·노래 유지'); }
  if(has('zone_awaken','another_zone','zone_break','self_zone','another_zone_extend') || /ZONE 각성|존 각성/.test(txt)){ v+=0.4; why.push('존 각성 타이밍'); }
  if(has('af_combo','af_gauge') || ((c.main||{}).af_combo_x||1)>1 || /AF 중|AF 콤보/.test(txt)){ v+=0.4; why.push('AF 운용'); }
  if(/SB 시|SB시|SB 중/.test(((c.main||{}).condition)||'')){ v+=0.3; why.push('SB 의존'); }
  if(has('self_sufficient','chain_ability','auto_attack')){ v-=0.3; }
  return {v:Math.max(0,Math.min(4,v)), why};
}
const DIFF_LV = [{lv:1,kr:'쉬움'},{lv:2,kr:'보통'},{lv:3,kr:'중간'},{lv:4,kr:'고인물용'}];
function teamDifficulty(team){
  let v = 0; for(const c of team) v += c.cx||0;
  const noHeal = !team.some(c=>(c.sup.heal||0)>=1);
  if(noHeal) v += 0.6;
  const lv = v<4.9?1 : v<6.6?2 : v<8.2?3 : 4;
  return {v, lv, kr:DIFF_LV[lv-1].kr, noHeal};
}

/* ---------- 캐릭터 스탯 ----------
   stats: 레벨 최대·천명치 0·장비 없음 [hp,mp,pwr,int,spd,end,spr,lck] (위키 Stats Index)
   천명치 t: 단계 보너스(fate_tbl) 합 + 255에서 힘·지성·속도·내구·정신·운 +10 */
const STAT_ORDER = ['hp','mp','pwr','int','spd','end','spr','lck'];
const STAT_FATE_KEY = {lck:'luck'};
function statsAt(stats, tbl, t, board, lvB, sty){
  if(!Array.isArray(stats) || stats.length!==8) return null;
  const o = {}, bs = board && board.stats || null, l100 = board && board.lv100 || null;
  STAT_ORDER.forEach((k,i)=>{ let v = stats[i];
    if(tbl) for(const [lv,d] of tbl) if(t>=lv) v += (d[STAT_FATE_KEY[k]||k]||0); // 천명 단계(255 공통 +10은 표 안에 — 2026-10-16 위키 정리본)
    if(bs) v += (bs[k]||0) + (i>=2 ? (bs.all||0) : 0); // 성도각성 스텔라 보드 스탯(예전 자료의 all = HP·MP 외 전 스탯)
    if(lvB>0){ if(l100 && l100[k]!=null) v += Math.round(l100[k]*Math.min(1, lvB/20)); // Lv80 → 100 성장분(위키, 사용자 시트)
      else if(i>=2) v += lvB; else if(i===1) v = Math.round(v*(1+0.019*lvB)); else v = Math.round(v*(1+0.015*lvB)); } // 자료 없으면 근사
    if(sty && sty[k]) v += sty[k]; // 다른 스타일 보드 완성 보너스(style_bonus.json)
    o[k] = v; });
  return o;
}
/* 다른 스타일 보드 완성 보너스: 그 스타일을 보유하면 보드를 완성했다고 봄(설정 styleBonus=false면 끔) */
const OWN_SET = new WeakMap();
function styleAddOf(pc, S){
  if(!pc || !pc.styleB || !S || S.styleBonus===false || !Array.isArray(S.ownedIds) || !S.ownedIds.length) return null;
  let set = OWN_SET.get(S.ownedIds); if(!set){ set = new Set(S.ownedIds); OWN_SET.set(S.ownedIds, set); }
  let o = null; for(const e of pc.styleB) if(set.has(e.from)) for(const k in (e.add||{})){ o = o || {}; o[k] = (o[k]||0) + e.add[k]; }
  return o;
}
/* 주 스탯 → 대미지: 빌더 계산식(최적 장비)에서 주 스탯 +50 ≈ 물리 ×1.23 · 마법 ×1.27 → (스탯/기준)^지수
   기준은 같은 공격 종류 캐릭터의 기본값 중앙값(물리 힘 221, 마법 지성 232) */
const STAT_REF = {phys:221, mag:232}, STAT_EXP = {phys:1.0, mag:1.1}, LUCK_REF = 156;
// 빌더 기본값(사용자가 스탯을 안 넣은 빌드 코드)은 실제 스탯이 아니므로 무시
const isBuilderDefault = st => !st || (st.spd===249 && st.luck===150 && st.mp===512 && ((st.str===237&&st.int===162)||(st.str===162&&st.int===237)));
/* 장비 속도 자동값: 딩 빌더 장비 시트로 대미지 최적 빌드를 찾았을 때 장비가 주는 속도(무기·장신구, 천명 80·255 · 속성 4종 측정 중앙값) */
const GEAR_SPD_AUTO = {staff:20, sword:30, katana:30, ax:40, lance:30, bow:30, fist:40, hammer:30};
const gearSpdOf = (pc, S) => (S && S.gearSpd!=null && S.gearSpd!=='') ? (+S.gearSpd||0) : (GEAR_SPD_AUTO[pc.weapon]||30);
function charStats(pc, own, S){
  const t = own ? (+own.t||0) : 0;
  const b = own && own.build, bst = b && !isBuilderDefault(b.st) ? b.st : null;
  const aw = !!(pc.stellar && own && own.s && !(S && S.lvMode==='80'));
  const wiki = S && S.useStats===false ? null : statsAt(pc.stats, pc.fateTbl, t, aw ? pc.stBoard : null, lvBonusOf(t, aw), styleAddOf(pc, S));
  if(!wiki && !bst) return null;
  const nk = bst ? {pwr:+bst.str, int:+bst.int, spd:+bst.spd, lck:+bst.luck, mp:+bst.mp} : wiki;
  const spdB = b && b.spdTot ? +b.spdTot : (nk.spd + gearSpdOf(pc, S));
  return {naked:nk, wiki, src: bst ? 'build' : 'wiki', spd: spdB, spdSrc: b && b.spdTot ? 'build' : (bst ? 'build-st' : 'wiki')};
}

/* ---------- 계정 상태(보유/육성) 반영 ---------- */
function charProg(pc, own, S){
  // own: {t:천명치, s:성도각성, m:현현 0/1/2, g:'none'|'sh'|'vc'|'shin'|'goku', gl:공격 글래스터 배치|null}
  if(own && S && S.lvMode==='80' && own.s) own = Object.assign({}, own, {s:false}); // 뉴비: 전원 Lv80 = 성도각성 없음
  if(own && S && S.glLocked) own = Object.assign({}, own, {g:'none', gl:{mode:'none'}}); // 뉴비: 글래스터 미개방
  const t = own ? (+own.t||0) : 0;
  let f = 1, sbOK = false, sbMul = 1;
  const slots = t>=200 ? 4 : 3;
  const gl = Object.assign({}, (S&&S.grastaDefault)||DEFAULT_SETTINGS.grastaDefault, (own&&own.gl)||{});
  if(pc.stellar && own && own.s){
    if(t>=15){ sbOK=true; sbMul = t>=30?1:0.8; }
    if(!pc.stBoard){ if(t>=80) f*=1.15; else if(t>=50) f*=1.08; else if(t>=30) f*=1.04; } // 스텔라 보드 스탯 자료가 없을 때만 근사
  }
  // 주 스탯(천명치 보너스 포함): 기본 스탯이 있으면 실제 값, 없으면 기준값 + 천명 표의 주 스탯 보너스
  const kind = pc.atkKind==='mag' ? 'mag' : 'phys', ms = pc.mainStat || 'pwr';
  const cs = charStats(pc, own, S);
  let msV = null, lck = null;
  if(cs){ msV = cs.naked[ms]; lck = cs.naked.lck; }
  else if(pc.fateTbl){ let add = 0; for(const [lv,d] of pc.fateTbl) if(t>=lv) add += (d[ms]||0); msV = STAT_REF[kind] + add; } // 255 공통 +10은 천명 표 안에
  // 딩 계산기 입력: 캐릭터 스탯(천명 반영) + 무기종 표준 장비. 스탯 자료가 없으면 같은 공격 종류 기준값
  const nk = cs ? cs.naked : {pwr: kind==='phys'&&ms==='pwr' ? msV : 200, int: kind==='mag'||ms==='int' ? (msV||232) : 180, spd: 220, lck: 156, mp: 450};
  if(!cs && ms==='spd') nk.spd = msV||220;
  const G = GEAR_STD[pc.weapon] || GEAR_STD.sword, mAdd = lerpT(G.ms, t);
  const D = {str: nk.pwr + G.str + (ms==='pwr'?mAdd:0), int: nk.int + G.int + (ms==='int'?mAdd:0), spd: (cs ? cs.spd : nk.spd + gearSpdOf(pc, S)) + (ms==='spd'?mAdd:0),
    lck: (nk.lck||156) + G.lck, mp: (nk.mp||450) + G.mp};
  D.atk = D.str + G.atk; D.mag = D.int + G.mag;
  f *= lerpT(GEAR_FX, t);
  f *= MANIFEST[own?(+own.m||0):0]||1;
  const g = own&&own.g ? own.g : 'none';
  f *= SPECIAL_GRASTA[g]||1;
  // 빌드 코드(장비 빌더): 같은 조건의 최적 장비 대비 실제 장비 화력 비율. 글래스터는 최적 배치를 기준으로 두고 비율을 곱한다
  let gear = null, glx = gl;
  const b = own && own.build;
  // q: 장비 완성도 (이 빌드에 맞는 파티 상황에서 최적 장비 대비 화력 비율)
  if(b && b.q>0){ gear = {q:Math.max(0.2, Math.min(1.1, +b.q)), ps:Array.isArray(b.ps)?b.ps:[]}; glx = S && S.glLocked ? {mode:'none'} : {mode:'auto'}; }
  // 속도: 빌드 코드의 장비 포함 속도 > 빌드에 넣은 캐릭터 스탯 > 위키 기본 스탯(+장비 속도 설정)
  return {f, sbOK, sbMul, goku: g==='goku', t, slots, gl:glx, gear, D, sty: styleAddOf(pc, S), lvB: lvBonusOf(t, !!(pc.stellar && own && own.s)),
    spd: cs ? cs.spd : 0, spdSrc: cs ? cs.spdSrc : null, lck, msV, ms};
}

/* ---------- 적 프로필 ---------- */
function enemyRel(enemy, type){ // 'weak' | 'resist' | 'null' | 'absorb' | null
  if(!enemy) return null;
  return enemy[type]||null;
}

/* 다른 아군이 개전 자동으로 펴는 존이 이 캐릭터의 존 이상이면(극은 못 덮어씀) 이 캐릭터의 존 전개·각성 행동은 쓸모없음(2026-10-16) */
function zoneStepUseless(team, progs, i, zc){
  zc = zc || zoneCandidates(team, progs, 'normal'); const id = team[i].id;
  const own = zc.filter(q=>q.by===id && q.level>0).reduce((m,q)=>Math.max(m, q.level), 0);
  return zc.some(q=>q.by && q.by!==id && q.how==='개전 자동' && q.level>0 && (q.level>=2 || q.level>=own) && !zc.some(r=>r.how==='타인 각성' && r.awBy===id));
}
/* 개전 자동 존이 있으면 '존 없음'이나 그 존을 덮어쓰지 못하는 존은 고를 수 없음(존은 하나, 극은 존 파괴 없이 못 바꿈 — 2026-10-16:
   帯電으로 타수가 늘면 존 없는 쪽이 AF 게이지(타당 충전)로 유리해 보여 '존 없음'을 고르던 문제) */
function zoneForce(zs, pick){ // pick: 개전 자동 존이 둘 이상이면 고른 전개자 id(evalTeam이 둘 다 계산해 나은 쪽, 2026-10-16: 넣은 순서에 따라 결과가 6배까지 달라지던 문제)
  const aus = (zs||[]).filter(q=>q && q.level>0 && q.how==='개전 자동').sort((a,b)=>b.level-a.level);
  const au = (pick && aus.find(q=>q.by===pick && q.level===aus[0].level)) || aus[0];
  if(!au) return zs; return zs.filter(q=>q===au || (q && q.level>0 && ((au.level<2 && q.level>=2) || q.brk)));
}
/* ---------- 존 후보 계산 ---------- */
function zoneCandidates(team, progs, situation){
  const cands = [{kind:'none', types:[], level:0, by:null, label:'존 없음'}];
  for(let i=0;i<team.length;i++){
    const c = team[i]; if(!c.zoneTypes || !c.zspec) continue;
    const sp = c.zspec;
    // 존 종류 후보(선택형이면 팀에 가장 맞는 것)
    let best=null, bn=-1;
    let optsList = c.zoneTypes.opts;
    const sw = ELEM_SWITCH[c.id];
    if(sw){ const t = reqMet(sw.need, team, c) ? sw.yes : sw.no; optsList = [zoneOpt(t)]; }
    for(const o of optsList){
      const n = o.kind==='elem' ? team.filter(m=>m.elems.some(e=>o.types.includes(e))).length
        : o.kind==='weap' ? team.filter(m=>o.types.includes(m.wt)).length : 2;
      if(n>bn){ bn=n; best=o; }
    }
    if(!best) continue;
    if(best.kind==='all' && situation!=='t1') continue; // 閃撃陣은 전투 첫 턴만 (1턴 계산에서만)
    // 일반 존 가능 여부
    let base = sp.base || (sp.baseReq && reqMet(sp.baseReq, team, c)) || (situation==='sb' && sp.baseSB);
    // 극존 경로
    let level = 0, how = '', zetsu=false; const unmet=[];
    for(const st of sp.starts){
      if(reqMet(st.req, team, c)){ level=2; how='개전 자동'; zetsu = zetsu||st.zetsu; break; }
      else unmet.push('개전 극존 조건 미충족: '+reqText(st.req));
    }
    if(level<2) for(const sk of sp.skillGoku){
      if(reqMet(sk.req, team, c)){ level=2; how='스킬 각성'; break; }
      else unmet.push('존 각성 조건 미충족: '+reqText(sk.req));
    }
    if(level<2 && situation==='sb' && sp.sbGoku){ level=2; how='SB 시'; }
    if(level<2 && progs[i].goku && (base||sp.starts.length)){ level=2; how='극 글래스터'; }
    if(level<2 && base) level=1;
    if(level===0){ cands.push({kind:'none', types:[], level:0, by:c.id, byName:c.name, label:'존 없음', unmet}); continue; }
    if(best.kind==='all' && level>1) level=1;
    if(level>=2 && sp.zetsu && how!=='SB 시') zetsu = true;
    const lvl = level>=2 && zetsu ? 3 : level;
    const zname = ZONE_KR[best.key] || ZONE_KR[c.zone.type] || '존';
    const pre = lvl===3?'절·':lvl===2?'극·':'';
    cands.push({kind:best.kind, types:best.types, key:best.key, level:lvl, by:c.id, byName:c.name, how, unmet, brk: !!c.zoneBreaks && c.zoneBreaks!=='sb',
      label: pre + zname});
    if(lvl===1 && best.kind!=='all'){ // 남이 편 일반 존을 극으로 올리는 아군(zone.awaken_any, 2026-10-16)
      const aw = team.filter((m,k)=>k!==i && m.zoneAwAny && [].concat(m.zoneAwAny.kinds||[]).some(t=>t==='any' || t===best.kind)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)[0]; // 각성해 줄 아군이 둘이면 id 순(넣은 순서 무관, 2026-10-16)
      if(aw) cands.push({kind:best.kind, types:best.types, key:best.key, level:2, by:c.id, byName:c.name, how:'타인 각성', awBy:aw.id, awSkill:aw.zoneAwAny.skill||null, unmet:[], brk:false, label:'극·'+zname}); }
  }
  return cands;
}
/* 존 배율 (영문 위키 Zone 표)
   화·수·지·풍(烈火陣 등): 그 속성 +50%(극 +100%), 상극 −50%
   黒陰陣(음): 음 +50%(극 +100%), 다른 속성 +30%
   輝晶陣(정): 정 +30%(극 +60%), 다른 속성 −30%
   招雷陣(뇌): 뇌 +30%(극 +60%), 음 −30%
   月光陣: 뇌·정·음 +30%(극 +60%), 화·수·지·풍 −30%
   무기(타입) 존: 그 타입 +30%(극 +60%), 다른 타입 −30% · 閃撃陣: 전 타입 +30%, 전투 첫 턴만 */
const ELEM4 = ['fire','water','earth','wind'];
/* 존 전개 중 AF 게이지(영문 위키 Zone 표): 존이 깔려 있으면 타격당이 아니라 행동(실행)당 충전으로 바뀐다.
   맞는 속성·타입 7.5%, 상극·다른 타입 0%, 그 밖의 공격(무속성·고정 대미지·자상 포함) 1.5%.
   각음진: 그림자 7.5 · 다른 속성 2.5 / 휘정진: 속성 공격 전부 7.5 / 초뢰진: 번개 AF 중 10(평상 5) · 그림자 0 /
   월광진: 뇌·정·음 7.5 · 화수지풍 0 / 섬격진 10 / 성해진 7.5. 존이 없으면 null(타당 계산) */
/* 가장 높은 존 하나 고르기: 같은 등급이면 존 이름·까는 사람 id 순(넣은 순서와 무관하게, 2026-10-16 질퍼니(AS)·네코코(ES) 순서에 따라 버프 행동 순서가 바뀌던 문제) */
const zBetter = (q, z) => q.level>z.level || (q.level===z.level && (String(q.key)<String(z.key) || (q.key===z.key && String(q.by||'')<String(z.by||''))));
function zoneAF(z, co, inAF){
  if(!z || !z.level || z.kind==='none') return null;
  const el=co.el, wt=co.wt, none = !el || el==='none';
  if(z.kind==='all'){ const k=z.key||''; return (k==='starsea'||k==='stellar_sea'||k==='星海陣') ? 7.5 : 10; }
  if(z.kind==='weap') return z.types.includes(wt) ? 7.5 : 0;
  const key = z.key || z.types[0];
  if(key==='crystal') return none ? 1.5 : 7.5;
  if(key==='shade') return el==='shade' ? 7.5 : none ? 1.5 : 2.5;
  if(key==='thunder') return el==='thunder' ? (inAF===false ? 5 : 10) : el==='shade' ? 0 : 1.5;
  if(key==='moonlight') return z.types.includes(el) ? 7.5 : ELEM4.includes(el) ? 0 : 1.5;
  if(z.types.includes(el)) return 7.5;
  if(z.types.some(t=>OPP[t]===el)) return 0;
  return 1.5;
}
function zoneFactor(z, el, wt, S, rel){
  // 빌더 코어(ae-core zoneEffect, 계산기 56행) 기준. 괄호는 극(ZONE 각성, 절 포함)
  if(!z || z.kind==='none' || z.level===0) return 1;
  const L = Math.min(1, z.level-1), K = L>=1; // 극·절
  const up = S.zoneWeap[L], up0 = S.zoneWeap[0], dn = S.zoneOffWeap, dnK = 1-2*(1-S.zoneOffWeap); // +30(+60) / −30(−60)
  if(z.kind==='elem'){
    const key = z.key || z.types[0];
    if(key==='moonlight') return z.types.includes(el) ? up0 : ELEM4.includes(el) ? dn : 1;          // 월광진: 극이어도 +30
    if(key==='crystal'){ if(el==='none') return 1; const wk = rel==='weak';                          // 휘정진: 약점이면 결정 +110(+220), 그 외 +50(+130)
      if(el==='crystal') return wk ? (K?3.2:2.1) : up; return wk ? (K?2.3:1.5) : dn; }
    if(key==='thunder') return el==='thunder' ? up : el==='shade' ? dn : 1;                            // 초뢰진
    if(key==='shade'){ if(el==='none') return 1; const rs = rel==='resist';                            // 각음진: 저항이면 그림자 +100(+200), 그 외 +60(+90)
      if(el==='shade') return rs ? (K?3.0:2.0) : S.zoneElem[L]; return rs ? (K?1.9:1.6) : up0; }
    if(z.types.includes(el)) return S.zoneElem[L];                                                       // 열화·수천·지열·풍왕 +50(+100), 상극 −50
    if(z.types.some(t=>OPP[t]===el)) return S.zoneOppElem;
    return 1;
  }
  if(z.kind==='weap'){
    const key = z.key || z.types.join('_'), hit = z.types.includes(wt);
    if(key==='slash_magic') return hit ? up0 : dn;           // 쌍격진 참마: 극이어도 +30, 그 외 −30
    if(key==='slash_pierce') return hit ? up : dn;           // 쌍격진 참돌: +30(+60), 그 외 −30
    return hit ? up : (K ? dnK : dn);                        // 황참·순돌·굉타·환마: +30(+60), 그 외 −30(−60)
  }
  if(z.kind==='all'){
    const key = z.key||'';
    if(key==='starsea'||key==='stellar_sea'||key==='星海陣') return 1; // 성해진: AF 게이지 100%일 때 AF 밖에서만 +100% → AF 중엔 효과 없음
    return up0;                                              // 섬격진 +30
  }
  return 1;
}
function zoneFactorEff(z, el, wt, S, rel){
  const f = zoneFactor(z, el, wt, S, rel);
  if(z && z.level>=2 && z.how==='스킬 각성'){ // 각성 준비 턴이 필요한 극존은 85%만 인정
    const f1 = zoneFactor(Object.assign({}, z, {level:1}), el, wt, S, rel);
    return f1 + 0.85*(f-f1);
  }
  return f;
}

/* ---------- 팀 단위 공통 집계 ---------- */
function teamAgg(team){
  // 적에게 거는 것(독·페인, 브레이크, 약점 부여)만 팀 공통. 아군 버프는 attackerCore에서 받는 사람별로 조건을 따진다.
  const A = {painAny:false, breaks:[], weakAdd:[], weakInfo:[]};
  team.forEach((c,j)=>{
    if(c.pain) A.painAny=true;
    if(c.breakT){ A.breaks.push(c.breakT); (A.breakJ||(A.breakJ=[])).push(j); }
    if(c.weakExpose){ A.weakAdd.push(c.weakExpose); // 약점 부여(弱点看破): SB 한정 표기면 SB 때(그 AF 남은 행동)만, 개전 자동이면 처음부터, 그 밖엔 부여한 사람이 행동한 뒤부터
      const raw = String((c.raw && c.raw.debuff && c.raw.debuff.weak_expose) || '');
      A.weakInfo.push({t:c.weakExpose, j, sb:/SB/.test(raw), start: !!(c.raw && c.raw.debuff && c.raw.debuff.weak_expose_start), noaf: !!(c.raw && c.raw.debuff && c.raw.debuff.weak_expose_noaf) || (c.afT && c.afT.deb && typeof c.afT.deb.weak_expose==='number' && c.afT.deb.weak_expose<0.5), sbOnly: !!(c.afT && c.afT.deb && (c.afT.deb.weak_expose==='sb' || c.afT.deb.weak_expose==='sb1')), sb1: !!(c.afT && c.afT.deb && c.afT.deb.weak_expose==='sb1') || !!(c.bact && c.bact.sb1.has('weak')), up: (c.raw && c.raw.debuff && c.raw.debuff.weak_expose_up) || null, real: c.afT && c.afT.real && c.afT.real.deb ? c.afT.real.deb.weak_expose : undefined}); } // up {n,af,real}: 약점 간파가 켜진 비율(개전 1턴만·스킬 쓴 턴만 등), sb1: SB 그 턴만 // real: 실전 3턴째 AF 값(af_timing real)
  });
  return A;
}

/* ---------- 공격자 1명의 대미지 (상대값, 존 배율 제외) ---------- */
/* AF 타이밍 보정(af_timing.json): 1턴 AF 허수아비에서 다 받지 못하는 효과(체인·요격·턴 종료·긴 축적·SB 뒤에만 붙는 효과)
   v: 숫자 = AF·SB 계산 때 그 비율(평상 턴은 그대로), 'sb' = SB를 쓴 뒤(SB 턴·그 AF의 남은 행동)에만, 평상 턴엔 없음 */
// rv: 실전 N턴의 AF(2026-10-16, 세팅 2턴 뒤인 3턴째 AF) 값 — af_timing real. A.realT(그 AF가 몇 턴째인지)가 있으면 1턴째 값에서 real 쪽으로(3턴째에 다 감)
// sbu: 평상 턴에 SB 뒤 효과가 남아 있는 비율(2026-10-16, 사용자 확인: SB 효과는 그 뒤 행동에도 — 체인 어빌리티만 빼고)
function afTV(v, situation, A, sbOK, rv, sbu){
  if(v==null) return 1;
  const cl = x => Math.max(0, Math.min(1, +x||0));
  let x = v==='sb' || v==='sb1' ? (sbOK && (situation==='sb' || (situation==='af' && A.postSB)) ? 1 : sbOK && situation==='normal' && v==='sb' ? cl(sbu) : 0) : situation==='normal' ? 1 : cl(v); // sb1: SB 그 턴만(ターン終了まで) — 평상 턴에 안 남음
  if(situation!=='normal' && rv!=null && A && A.realT>1){ const y = rv==='sb' || rv==='sb1' ? (sbOK && (situation==='sb' || A.postSB) ? 1 : 0) : cl(rv), w = Math.min(1, (A.realT-1)/2); x = x + (y-x)*w; }
  return x;
}
function afAdj(o, t, situation, A, sbOK, rt, sbu){
  if(!o || !t) return o;
  let r=null;
  for(const k in t){
    const f = afTV(t[k], situation, A, sbOK, rt ? rt[k] : null, sbu); if(f===1) continue;
    const x = o[k]; if(x==null || x===false || x===0 || x==='') continue;
    if(!r) r = Object.assign({}, o);
    if(typeof x==='number') r[k] = x*f;
    else if(typeof x==='object' && !Array.isArray(x)){
      if('sb' in x || 'req' in x || 'zone' in x || 'zlv' in x){ if(f<0.5) r[k]=false; }
      else { const y={}; for(const q in x) y[q] = typeof x[q]==='number' ? x[q]*f : x[q]; r[k]=y; }
    } else if(f<0.5) r[k] = typeof x==='string' ? '' : false;
  }
  return r || o;
}
/* AF 행동: 성도 스킬은 SB가 아니어도 일반 스킬로 쓸 수 있고 AF 중엔 MP가 안 들어 매 행동 쓸 수 있다(사용자 확인).
   비SB 성도 스킬(sb_normal)이 있으면 주력(또는 AF 전용 스킬)과 한 행동 대미지를 비교해 큰 쪽을 쓴다 */
/* 스킬 칸(사용자 확인 2026-10-16): 천명치 80 이상 4칸, 미만 3칸. 주력(통상 공격 변화면 칸 안 씀)·AF 전용 공격·비SB 성도 스킬이 먼저 차지하고 남는 칸에 버프·디버프 행동 */
const NA_RE = /通常攻撃|통상\s?공격/;
/* 스킬 칸에 넣을 행동(우선순위 순서 ord에서 칸 수 L만큼). 같은 스킬 이름의 행동(존 전개·각성, 같은 스킬의 다른 효과 줄)은 칸 하나 — 2026-10-16:
   질퍼니(AS) インテンド가 존 2줄 + 자기 버프 1줄로 칸 3개를 차지해 자기 버프가 빠지던 문제 */
const skN = x => String(x||'').split(/[（(]/)[0].trim();
const freeSk = (c, prog) => new Set([c.main, c.afSk, c.sbN && prog && prog.sbOK ? c.sbN : null, c.stellar && c.sb && prog && prog.sbOK ? c.sb : null].filter(Boolean).map(k=>skN(k.skill_jp||k.skill))); // 이미 칸을 차지한 주력·AF·성도 스킬과 같은 이름이면 칸을 더 안 씀
function slotPick(steps, ord, L, free){ const names = new Set(), out = []; for(const q of ord){ const nm = skN(steps[q].s) || ('#'+q); if(names.has(nm) || (free && free.has(nm))){ out.push(q); continue; } if(names.size>=L) continue; names.add(nm); out.push(q); } return out; }
function skillSlots(c, prog){
  const total = (prog && (prog.t||0) >= 80) ? 4 : 3;
  // 성도 스킬은 SB를 쓰려면 장착해야 해서 칸 1개(비SB 사용과 같은 칸, 사용자 확인 2026-10-16). 주력이 성도 스킬(엑코코)이면 그 칸이 곧 주력.
  // 성도 스킬을 일부러 안 다는 운용(유인·엑코코 등)은 evalTeam이 prog.sbOK=false(sbAw는 유지)로 따로 계산해 고름
  const mainSt = c.main && /星導|성도/.test(String(c.main.skill_jp||c.main.skill||'')), stl = !!(c.stellar && prog && prog.sbOK);
  let used = c.main && !NA_RE.test(String(c.main.skill||'')) && !mainSt ? 1 : 0;
  if(c.afSk && c.afSk.skill!==(c.main||{}).skill && !NA_RE.test(String(c.afSk.skill||'')) && !(stl && c.sb && skN(c.afSk.skill_jp||c.afSk.skill)===skN(c.sb.skill_jp||c.sb.skill))) used++; // AF 공격이 성도 스킬과 같은 스킬이면 성도 칸 하나(시구레(ES) 爽籟剣舞)
  if(stl && (c.sb || c.sbN || mainSt)) used++; // 성도 스킬이 공격이 아니면(밀디 シンフォニーソウル) 그 버프 행동이 칸을 씀
  return Math.max(0, total - used);
}
/* 상태 가동률(state.json, 2026-10-16): 루나틱 3턴·개전 N턴·모드처럼 켜지는 시간이 정해진 상태 — 데이터 값 = 켜진(ON) 상태.
   평상 턴(실전 N턴) = (개전 턴 + 횟수×지속)/N턴 또는 주기, 허수아비 AF·SB = af(0~1, 'sb'면 SB 뒤). ON·OFF를 따로 계산해 가동률로 섞음 */
function stateUp(s, situation, A, c, idx){
  const cl = v => Math.max(0, Math.min(1, +v||0));
  if(s.res && c){ // 자원 소비형 상태(테오도로스 全盛期: 闘魂 50, 주력 실행·재공격마다 3 소비 — 사용자 확인 2026-10-16): 켜진 행동 수 = (시작 − 행동 소비) ÷ 행동당 소비
    const m = c.main || {}, ex = (1 + (+m.repeat||0)) * Math.max(1, +m.execs||1), cpa = Math.max(0.1, (+s.res.exec||3)*ex), on = Math.max(0, (+s.res.start||0) - (+s.res.step||0))/cpa;
    if(situation==='normal'){ const H = (A.tm && A.tm.H) || 6; return cl(on/H); }
    const n = A.afN && idx!=null && A.afN[idx] ? A.afN[idx] : AF_N_EST; return cl(on/Math.max(1, n)); }
  if(situation==='normal'){ if(s.up!=null) return cl(s.up); const H = (A.tm && A.tm.H) || 6, st = +s.start||0, d = +s.dur||0, u = +s.uses||0;
    if(s.cycle){ const cd = +s.cd||0, per = d>0 ? d/(d+cd) : 1; return cl((Math.min(H,st) + Math.max(0,H-st)*per)/H); }
    return cl((st + u*d)/H); }
  if(A.realT>1 && s.real!=null) return s.real==='sb' ? ((situation==='sb' || A.postSB) ? 1 : 0) : cl(s.real); // 실전 3턴째 AF·SB 값을 직접 지정
  if(s.af==='sb') return (situation==='sb' || A.postSB) ? 1 : 0;
  let a = s.af==null ? 1 : cl(s.af);
  if(A.realT>1){ const t = A.realT, st = +s.start||0, d = +s.dur||0, u = +s.uses||0; // 실전 N턴의 AF: 개전·사용 구간에 그 턴이 들어가면 켜짐(가장 좋은 때 쓴다고 봄), 구간 정보가 없으면 평상 턴 가동률
    const on = (d>0 || st>0) && s.up==null ? (t<=st || (u>0 && d>0 && t<=st+u*d) ? 1 : s.cycle && d>0 ? d/(d+(+s.cd||0)) : 0) : stateUp(s, 'normal', A);
    a = Math.max(a, on); }
  return situation==='sb' ? Math.max(a, stateUp(s, 'normal', A)) : a; // SB 턴(실전 포함)은 평상 가동률보다 낮지 않게
}
const ST_V = new WeakMap(), ST_NF = new WeakMap(), ST_C = new WeakMap();
function stateVariant(c, sts, onMask){ // 상태 목록(sts)·켜짐·대리 여부별로, 실제로 바뀌는 칸(자기 버프·스킬)만 캐시해 덮어씀(턴별 계산·체인 등은 매번 새 객체라)
  const px = !!c._proxy, ck = onMask.map(x=>x?1:0).join('')+(px?'p':'');
  let mc = ST_C.get(c); if(mc){ const r0 = mc.get(ck); if(r0) return r0; } else { mc = new Map(); ST_C.set(c, mc); } // 같은 캐릭터 객체면 그대로(대부분)
  const r1 = stateVariantB(c, sts, onMask, px, ck); mc.set(ck, r1); return r1;
}
function stateVariantB(c, sts, onMask, px, ck){
  let nf = ST_NF.get(sts); if(!nf){ const sk = sts.some(s=>s.main_off||s.sb_off||(s.pow&&+s.pow!==1)), pt = sts.some(s=>s.party_off&&s.party_off.length);
    nf = {a:['self','teishin'].concat(pt?['party']:[]), b:['self','teishin'].concat(pt?['party']:[], sk?['main','sb','afSk','sbN']:[])}; ST_NF.set(sts, nf); }
  const F = px ? nf.a : nf.b; // 대리 스킬은 스킬 칸을 안 바꾸니 비교도 안 함
  let m1 = ST_V.get(sts); if(!m1){ m1 = new Map(); ST_V.set(sts, m1); }
  let L = m1.get(ck); if(!L){ L = []; m1.set(ck, L); }
  let e = L.find(x=>F.every(f=>x.b[f]===c[f]));
  if(!e){ const v = stateVariant0(c, sts, onMask), b0 = {}, o = {}; for(const f of F){ b0[f] = c[f]; o[f] = v[f]; } e = {b:b0, o}; if(L.length>=16) L.shift(); L.push(e); }
  const r = Object.assign({}, c, e.o); r._stv = true; return r;
}
function stateVariant0(c, sts, onMask){
  const px = !!c._proxy; // 체인·요격·1회 공격 같은 대리 스킬엔 자기 버프 쪽만
  let self = c.self, main = c.main, sb = c.sb, afSk = c.afSk, sbN = c.sbN, teishin = c.teishin, party = c.party;
  const cp = (o, f) => o ? Object.assign({}, o, f) : o;
  sts.forEach((s, k) => { const on = onMask[k];
    if(on){
      if(s.on_self){ self = Object.assign({}, self); for(const q in s.on_self){ const v = s.on_self[q]; self[q] = typeof v==='number' ? (+self[q]||0) + v : v; } }
      if(!px && s.pow && +s.pow!==1){ const to = s.pow_to || ['main','sb','af_skill','sb_normal'], mul = sk => sk ? Object.assign({}, sk, {mult:(sk.mult||1)*s.pow, _stPow:(+sk._stPow||1)*s.pow}) : sk;
        if(to.includes('main')) main = mul(main); if(to.includes('sb')) sb = mul(sb); if(to.includes('af_skill')) afSk = mul(afSk); if(to.includes('sb_normal')) sbN = mul(sbN); }
    } else {
      if(s.self_off && s.self_off.length){ self = Object.assign({}, self); for(const q of s.self_off){ if(q==='teishin'){ teishin = false; continue; } self[q] = typeof self[q]==='number' ? 0 : false; } }
      if(s.teishin_off) teishin = false;
      if(!px && s.main_off){ const mo = Object.assign({}, s.main_off), hasM = 'mcond' in mo; const mc = mo.mcond; delete mo.mcond; main = cp(main, mo); if(main && hasM){ if(mc) main.mcond = JSON.parse(JSON.stringify(mc)); else delete main.mcond; } }
      if(!px && s.sb_off){ const so = Object.assign({}, s.sb_off), hasM = 'mcond' in so; const mc = so.mcond; delete so.mcond; sb = cp(sb, so); if(sb && hasM){ if(mc) sb.mcond = JSON.parse(JSON.stringify(mc)); else delete sb.mcond; } }
      if(s.party_off && s.party_off.length && party){ party = Object.assign({}, party); for(const q of s.party_off) party[q] = typeof party[q]==='number' ? 0 : false; }
    } });
  return Object.assign({}, c, {self, main, sb, afSk, sbN, teishin, party, _stv:true});
}
/* 여러 코어를 비율로 섞음: 한 코어를 본으로 대상 수(nT)만 맞춰 applyZoneCap 결과가 가중 평균이 되게(1타 경감은 본 코어 기준 근사) */
function mixCores(list, zone, S){
  const L = list.filter(x=>x.co && x.w>0); if(!L.length) return list.length ? list[0].co : null; if(L.length===1) return L[0].co;
  const D = L.map(x=>applyZoneCap(x.co, zone, S, null, 1)), tgt = L.reduce((v,x,k)=>v + x.w*D[k], 0);
  let b = 0; L.forEach((x,k)=>{ if(D[k]>0 && (x.w>L[b].w || !(D[b]>0))) b = k; });
  if(!(D[b]>0)) return L[b].co;
  return Object.assign({}, L[b].co, {mixL: L.map(x=>({w:x.w, co:x.co})), mix: L.map((x,k)=>({w:x.w, d:D[k], skill:x.co.skill}))}); // applyZoneCap이 그 순간 콤보·존으로 하위 코어를 가중 합
}
const ALT_CACHE = new WeakMap();
/* 속성 변환 가동률(2026-10-16, 사용자 지적: 엑코코 変幻自在가 칸·행동 없이 늘 켜져 과대평가): 변환 스킬이 버프 행동에 있으면
   평상 턴 = 그 행동의 유지율(simTeam kup.echg, 장착 못 하면 0), AF·SB = 장착했으면 켜짐(실전 1턴째 AF는 AF 안에서 걸어야 해 0.85), 허수아비는 dummySim이 행동 순서대로 */
const ecLinked = (team, e) => { const b = team[e.i] && team[e.i].bact; return !!(b && b.steps.some(st=>st.g.has('echg'))); };
function ecUp(team, A, e, sit){ if(!ecLinked(team, e)) return 1; const u = A.ecU ? A.ecU[e.i] : 1; if(sit==='normal') return u; if(!(u>0)) return 0; return A.realT===1 ? 0.85 : 1; }
function ecGate(team, idx, progs, A, enemy, S, situation, ctx, FX, zone){
  const L = A.echg, on = []; let part = null, w = 1;
  for(const e of L){ const u = ecUp(team, A, e, situation); if(u>=0.999) on.push(e); else if(u>0.001){ (part = part||[]).push(e); w = Math.min(w, u); } }
  if(!part && on.length===L.length) return undefined;
  const mk = list => Object.assign({}, A, {echg: list.length ? list : null, _ecFix:true});
  if(!part) return attackerCore(team, idx, progs, mk(on), enemy, S, situation, ctx, FX, zone);
  const Aon = mk(on.concat(part)), Aoff = mk(on), c = team[idx], base = (c.main && c.main.element) || c.elem;
  if(echgElem(Aon.echg, team, idx, base, situation, zone, enemy) === (Aoff.echg ? echgElem(Aoff.echg, team, idx, base, situation, zone, enemy) : base)) return attackerCore(team, idx, progs, Aon, enemy, S, situation, ctx, FX, zone);
  return mixCores([{w, co: attackerCore(team, idx, progs, Aon, enemy, S, situation, ctx, FX, zone)}, {w: 1-w, co: attackerCore(team, idx, progs, Aoff, enemy, S, situation, ctx, FX, zone)}], zone, S);
}
function attackerCore(team, idx, progs, A, enemy, S, situation, ctx, FX, zone){
  if(A.echg && A.ecU && !A._ecFix){ const r = ecGate(team, idx, progs, A, enemy, S, situation, ctx, FX, zone); if(r!==undefined) return r; }
  const c = team[idx];
  if(c && c.states && !c._stv){
    const sts = c.states.slice(0, 3), ups = sts.map(s=>stateUp(s, situation, A, c, idx)), fr = ctx && ctx.stFast ? [] : ups.map((u,k)=>u>0.001 && u<0.999 ? k : -1).filter(k=>k>=0).slice(0, 2); // stFast(탐색 1단계): 가동률 0.5 이상이면 켜진 쪽 하나만
    const base = ups.map(u=>u>=0.5), out = [];
    for(let m=0; m<(1<<fr.length); m++){ const on = base.slice(); let w = 1;
      fr.forEach((k,b)=>{ on[k] = !!(m & (1<<b)); w *= on[k] ? ups[k] : 1-ups[k]; });
      const t2 = team.slice(); t2[idx] = stateVariant(c, sts, on);
      out.push({w, co: attackerCore(t2, idx, progs, A, enemy, S, situation, ctx, FX, zone)}); }
    return mixCores(out, zone, S);
  }
  if(c && c.alts && !c._alt){ // 주력 후보(alts.json): 상황마다 가장 센 것, cycle이면 주력과 반반
    const sit = situation, cand = [], cyc = [];
    for(const a of c.alts){ if(sit==='sb') break; if(sit==='normal' && a.normal===false) continue; if(sit==='af' && a.af===false) continue;
      if(a.when && Object.keys(a.when).length && ruleAct({w:a.when}, idx, team, progs, sit==='af'?'normal':sit, zone, A)<=0) continue;
      (a.cycle ? cyc : cand).push(a); }
    const t0 = team.slice(); let c0 = ALT_CACHE.get(c); if(!c0){ c0 = Object.assign({}, c, {_alt:true}); ALT_CACHE.set(c, c0); } t0[idx] = c0;
    let best = attackerCore(t0, idx, progs, A, enemy, S, situation, ctx, FX, zone), bd = best ? applyZoneCap(best, zone, S, null, 1) : 0;
    const coOf = a => { if(a.attack===false || !(+a.mult>0)) return null; const sk = Object.assign({}, a); delete sk.when; delete sk.normal; delete sk.af; delete sk.cycle; delete sk.note; delete sk.mp;
      const t2 = team.slice(); t2[idx] = Object.assign({}, c, sit==='af' ? {afSk:sk, sbN:null, _alt:true} : {main:sk, _alt:true}); return attackerCore(t2, idx, progs, A, enemy, S, situation, ctx, FX, zone); };
    for(const a of cand){ const co = coOf(a); const d = co ? applyZoneCap(co, zone, S, null, 1) : 0; if(d > bd){ best = Object.assign(co, {viaAlt: a.skill}); bd = d; } }
    if(cyc.length && best){ const a = cyc[0], co = coOf(a); best = mixCores([{w:0.5, co:best}, {w:0.5, co: co || Object.assign({}, best, {nT:0})}], zone, S); }
    return best;
  }
  // 주력이 거는 'N회 행동' 자기 버프(buff_acts main acts, 이즈나 雷神滅閃 마법 크리 100% 3회 행동)인데 AF 공격은 성도 스킬인 경우:
  // 주력만 / 성도 스킬만(버프 없음) / 주력 1번 + 성도 스킬 N번 순환(버프 받음) 중 센 것(2026-10-16)
  const mk = situation==='af' && c && c.bact && c.bact.mainActs>0 && c.bact.mainActK && !c._mkOn ? c.bact.mainActK : null;
  const withK = (c0, v) => { const m = new Map(); for(const k of mk) m.set(k, v); return Object.assign({}, c0, {_mkOn: m}); };
  const t1 = mk ? team.slice() : team; if(mk) t1[idx] = withK(c, 1);
  const co1 = attackerCore0(t1, idx, progs, A, enemy, S, situation, ctx, FX, zone);
  if(situation!=='af' || !c || !c.sbN || c._sbN || !(progs[idx] && progs[idx].sbOK)) return co1; // 성도 각성했을 때만
  const t2 = team.slice(); t2[idx] = Object.assign({}, mk ? withK(c, 0) : c, {afSk: c.sbN, _sbN: true});
  const co2 = attackerCore0(t2, idx, progs, A, enemy, S, situation, ctx, FX, zone);
  if(!co2) return co1; if(!co1) return co2;
  const d1 = applyZoneCap(co1, zone, S, null, 1), d2 = applyZoneCap(co2, zone, S, null, 1);
  if(mk){ const N = c.bact.mainActs, t3 = team.slice(), t4 = team.slice(); t3[idx] = Object.assign({}, withK(c, 1), {afSk: c.sbN, _sbN: true}); t4[idx] = withK(c, 0);
    const c3 = attackerCore0(t3, idx, progs, A, enemy, S, situation, ctx, FX, zone), c4 = attackerCore0(t4, idx, progs, A, enemy, S, situation, ctx, FX, zone);
    if(c3 && c4){ const mx = mixCores([{w:1/(N+1), co:c4}, {w:N/(N+1), co:c3}], zone, S), d3 = applyZoneCap(mx, zone, S, null, 1);
      if(d3 > d1 && d3 > d2) return Object.assign(mx, {viaSbN: true, cycMain: N}); } }
  return d2 > d1 ? Object.assign(co2, {viaSbN: true}) : co1;
}
function attackerCore0(team, idx, progs, A, enemy, S, situation, ctx, FX, zone){
  const c = team[idx], pr = progs[idx];
  const sit = situation==='af' ? 'normal' : situation; // AF는 스킬 선택이 평상과 같음
  // SB로 거는 항목(buff_acts sb): 행동 단위 마스크가 없는 AF(실전 N턴의 AF)에선 SB 뒤(postSB)만 — af_timing 'sb'와 같은 규칙(2026-10-16)
  const sbG = situation==='af' && !A.postSB ? (j,k)=> team[j].bact && team[j].bact.sbOnly.has(k) && !(FX && FX[j] && FX[j].sm) ? 0 : 1 : ()=>1;
  const sbU = j => situation==='normal' && A.sbUpN && !(team[idx] && team[idx]._chain) ? (A.sbUpN[j]||0) : 0; // 평상 턴: SB 뒤 남는 효과 비율(체인 어빌리티 공격은 0)
  const chX = c && c._chain && situation==='normal' && A.sbUpN ? (j,k)=> team[j].bact && team[j].bact.sbOnly.has(k) ? 0 : 1 : ()=>1; // 체인 어빌리티 공격은 SB 뒤 효과를 안 받음
  let row=null; const F = (j,k)=>{ const t=team[j].afT, k0 = k.split(':')[0], a = (t && t.party ? afTV(t.party[k0], situation, A, progs[j]&&progs[j].sbOK, t.real && t.real.party ? t.real.party[k0] : null, sbU(j)) : 1)*sbG(j, k0)*chX(j, k0); if(!row) return a; const v=row[k]; return (v==null?1:v)*a; };
  let sk = c.main, usingSB=false;
  if(sit==='sb' && c.sb && pr.sbOK && c.sb.mult>0){ sk=c.sb; usingSB=true; }
  if(situation==='af' && c.afSk) sk = c.afSk; // AF 중에만 쓰는 공격(플람라피스(ES) ドゥーイル・スラマ 등)
  if(!sk) return null;
  let el = sk.element||c.elem; const kind = sk.kind==='mag'?'mag':'phys';
  const swc = ELEM_SWITCH[c.id];
  if(swc && (el===swc.yes || el===swc.no)) el = (swc.zone ? zoneMatch(swc.zone, zone) : reqMet(swc.need, team, c)) ? swc.yes : swc.no;
  const elNat = el; // 속성 변환 전 원래 공격 속성
  if(A.echg) el = echgElem(A.echg, team, idx, el, situation, zone, enemy);
  const conv = el!==elNat && elNat!=='none'; // 남이 바꿔 준 속성(変幻自在 등): 자기 속성 공격 버프(self elem_atk, 보통 '자신의 ○속성 공격')는 원래 속성 몫이라 안 받음
  const wt = sk.weapon_type || (kind==='mag'?'magic':c.wt);
  const tgt = sk.target==='st'?'st':'aoe';
  const key = tgt+'_'+kind+'_'+(el==='none'?'no':'el');
  const sizeV = (SIZE_TABLE[key]||SIZE_TABLE.aoe_phys_el)[SIZE_IDX[sk.size]??3]/100;
  let mult = Math.max(sk.mult||1, 1);
  if(sk.mcond) mult = condMult(sk, sk.mcond, situation, team, c, progs, idx, A, zone, enemy, el);
  else if(situation!=='sb' && isCharge(sk.condition)){ const sp = +sk._stPow||1, b = mult/sp; // 축적형 큰 한 방은 평상시 평균으로 낮춤 — 상태 배율(state pow, 알마(AS) 複写 2배)은 빼고 데이터 배율로 판정(2026-10-16)
    if(b>=30){ let m2 = b*0.4; if(m2>25) m2 = 25 + (m2-25)*0.2; mult = m2*sp; } }
  if(usingSB) mult*=pr.sbMul;
  if(situation!=='normal' && sk.af_x!=null) mult *= Math.max(0, +sk.af_x); // 1턴 AF 허수아비에서 나가는 몫(턴 종료 공격·요격형·축적 부족 등, af_timing 대조)
  // 위력: 크기×배율은 스킬 한 번의 전체 위력(타수 합)이고 1타는 그 값 ÷ 타수(사용자 확인 2026-10-15: '5대에 9600배'는 5타를 다 맞혀서 9600%) · 단일 공격 ×1.1.
  // 기본 대미지(스탯·속성 보정)는 아래 딩 계산식. 25억 경감·99.99억 상한은 1타 기준이라 타수가 많을수록 덜 깎인다
  let dmg = sizeV*mult*(tgt==='st'?1.1:1);

  // 스탯 버프 (완력/지성/속도)
  const stat = sk.stat==='int'?'int':sk.stat==='spd'?'spd':'pwr';
  const sbOKi = !!(progs[idx] && progs[idx].sbOK);
  let me = c.afT ? afAdj(c.self, Object.assign({}, c.afT.party||{}, c.afT.self||{}), situation, A, sbOKi, c.afT.real ? Object.assign({}, c.afT.real.party||{}, c.afT.real.self||{}) : null, sbU(idx)) : c.self; // 자기 파티 버프 보정은 자기 몫에도
  if(c.selfStk){ me = Object.assign({}, me); for(const k in c.selfStk){ if(me[k]==null) continue; const f = condP(Object.assign({}, c.selfStk[k]), situation, team, c, A, zone, enemy, el, progs); // 축적 수에 비례하는 자기 버프(闘魂 완력 등)
    if(typeof me[k]==='number') me[k] *= f; else if(typeof me[k]==='boolean' || typeof me[k]==='object') me[k] = f>=0.5 ? me[k] : false; } }
  // 자기 버프 출처 행동(buff_acts의 self.X, 2026-10-16): 허수아비 AF는 그 행동을 쓴 뒤부터(마스크), 평상 턴은 버프 행동 유지율, SB 전용은 SB 때·뒤만
  if(c.bact && c.bact.selfKeys.length){ const f0 = FX && FX[idx], src = c.bact.selfSrc; let me2 = null;
    for(const k of c.bact.selfKeys){ if(me[k]==null) continue; let on = 1;
      if(c._mkOn && c._mkOn.has(k)) on = c._mkOn.get(k); // 주력이 거는 N회 행동 버프(AF 주력 순환, 아래 attackerCore)
      else if(f0 && f0.sm) on = f0.sm.has('s.'+k) || (situation==='sb' && src[k]==='sb') ? 1 : 0;
      else if(situation!=='normal' && f0 && f0.smf && f0.smf['s.'+k]===0) on = 0; // 장착 못 한 버프 행동의 자기 버프(실전·지속의 AF·SB)
      else if(situation==='af' && src[k]==='sb' && !A.postSB) on = 0; // SB로만 거는 자기 버프: 실전 AF에선 SB 뒤만
      else if(situation==='normal'){ if(src[k]==='sb') on = c.bact.sb1.has('s.'+k) ? 0 : sbU(idx); else if(f0 && f0.smf && f0.smf['s.'+k]!=null) on = f0.smf['s.'+k]; else if(src[k]==='step' && f0 && f0.su!=null) on = f0.su; }
      if(on>=1) continue; me2 = me2 || Object.assign({}, me);
      if(typeof me2[k]==='number') me2[k] *= on; else me2[k] = on>=0.5 ? me2[k] : false; }
    if(me2) me = me2; }
  // 자기 버프(self_buff)는 '자신이 받는 최대치'라 자기 파티 버프를 이미 포함한다 → 같은 항목은 자기 파티 버프를 또 더하지 않음(판정은 보정 전 값으로)
  const has = k => { const v=c.self[k], w=me[k]; return (typeof v==='number' ? v>0 : !!v) && (typeof w==='number' ? w>0 : !!w); }; // 출처 행동 전이라 꺼진 자기 버프면 자기 파티 버프를 받음
  const sv=[pct(me[stat])], ev=[conv ? 0 : pct(me.elem_atk)], wv=[pct(me.weapon_atk)], spv=[], mpv=[pct(me.mp_up)];
  // 자기 상태 효과 조건: true 또는 {sb: SB 때(그 AF의 남은 행동 포함), req: 편성 조건, zone/zlv: 존}
  const selfOn = q => q===true || (!!q && typeof q==='object' && (!q.sb || situation==='sb' || (situation==='af' && A.postSB))
    && (!q.req || reqMet(q.req, team, c)) && (!q.zone || zoneMatch(q.zone, zone)) && (!q.zlv || (zone && zone.level>=q.zlv)));
  let critA=0, critD = pct(me.crit_dmg), shinW = selfOn(me.shinan)?1:0;
  const FK = stat==='int'?'int_flat':stat==='spd'?'spd_flat':'pwr_flat';
  let flatP = +me[FK]||0;
  // 루나틱<솔선(挺身)>: 처음 내구만큼 힘, 처음 정신만큼 지성(상태 효과 고정값, 딩 계산기 14·15행). 표준 장비엔 내구·정신이 없어 캐릭터 기본값(천명·스텔라 보드 포함)만
  const teBase = () => { const p0 = progs[idx]; const s0 = statsAt(c.stats, c.fateTbl, p0 ? (p0.t||0) : 120, c.stellar && p0 && (p0.sbOK || p0.sbAw) ? c.stBoard : null, p0 ? p0.lvB||0 : 0, p0 ? p0.sty : null); return s0 ? (stat==='int' ? s0.spr : s0.end) : 0; };
  let teW = c.teishin ? 1 : 0, cupA = 0;
  if(c.teishin && stat!=='spd') flatP += teBase();
  let ocW = me.over_crit?1:0, mhW = me.multihit?1:0, xW = me.extra_hit?1:0, pierceW = (sk.barrier_pierce||me.barrier_pierce)?1:0;
  let chW = typeof me.charge==='number' ? Math.max(0, Math.min(1, me.charge)) : me.charge ? 1 : 0; // 帯電 가동률(버프 행동 유지율·상태 가동률)
  const fKey = kind==='phys' ? 'singular_focus' : 'mental_focus';
  let focW = me[fKey]?1:0, otW = me.overthrow?1:0, eaW = me.eagle_eyes?1:0;
  let kessW = selfOn(me.kesshi) ? 1 : 0;
  const dmgS = {}; // 주는 대미지 UP: 출처 종류(prayer 기도·song 가창·other·self)마다 최댓값
  if(me.dmg_up && selfOn(me.dmg_on==null ? true : me.dmg_on)) dmgS[me.dmg_src||'self'] = pct(me.dmg_up);
  const weakD = [pct(me.weak_dmg)];
  const zElem = zone && zone.kind==='elem' && zone.level>0 ? zone.types : null;
  for(let j=0;j<team.length;j++){
    const p = team[j].party; if(!p || p.scope==='none') continue;
    row = FX&&FX[j] ? FX[j].rows[idx] : null;
    const own = j===idx;
    if(!(own && has(stat))) sv.push(pct(p[stat])*F(j,stat));
    if(!(own && has('elem_atk') && !conv)){ // 바뀐 속성이면 자기 파티 버프 중 전속성·그 속성 몫만
      if(el!=='none'){
        ev.push(pct(p.all_elem_atk)*F(j,'all_elem_atk'));
        if(p.elem_atk){
          let ea;
          if(FX&&FX[j]&&FX[j].zel&&zElem) ea = zElem.includes(el) ? Math.max(0,...Object.values(p.elem_atk).map(pct)) : 0; // 존 속성을 따라가는 속성 버프
          else ea = pct(p.elem_atk[el]);
          if(ea) ev.push(ea*F(j,'elem_atk')*F(j,'elem_atk:'+el));
        }
      }
      else ev.push(pct(p.all_elem_atk)*0.5*F(j,'all_elem_atk'));
    }
    if(p.weapon_atk && !(own && has('weapon_atk'))){ const fw=F(j,'weapon_atk'); wv.push(pct(p.weapon_atk.all)*fw, pct(p.weapon_atk[c.weapon])*fw, pct(p.weapon_atk[wt])*fw); }
    if(!(own && has('crit_rate'))) critA += pct(p.crit_rate)*F(j,'crit_rate');
    if(p[FK]) flatP += (+p[FK]||0)*F(j,FK);
    if(p.shinan) shinW = Math.max(shinW, F(j,'shinan'));
    if(p.kesshi) kessW = Math.max(kessW, F(j,'kesshi'));
    if(p.combo_up) cupA += pct(p.combo_up)*F(j,'combo_up');
    if(p.teishin && stat!=='spd' && teW<1){ const t = Math.min(1, F(j,'teishin')); if(t>teW){ flatP += (t-teW)*teBase(); teW = t; } } // 아군 挺身(이미 자기 挺身이면 겹치지 않음)
    if(p.dmg_up && !(p.dmg_el && ![].concat(p.dmg_el).includes(el))){ const v = pct(p.dmg_up)*F(j,'dmg_up'), s = p.dmg_src||'other'; if(v>(dmgS[s]||0)) dmgS[s]=v; } // dmg_el: 그 속성 공격만(○属性で与えるダメージ)
    if(p.mp_up && !(own && has('mp_up'))) mpv.push(pct(p.mp_up)*F(j,'mp_up'));
    if(!(own && has('crit_dmg'))) critD += pct(p.crit_dmg)*F(j,'crit_dmg');
    if(p.over_crit) ocW=Math.max(ocW, F(j,'over_crit'));
    if(p.multihit) mhW=Math.max(mhW, F(j,'multihit'));
    if(p.charge) chW=Math.max(chW, Math.min(1, F(j,'charge')));
    if(p.extra_hit) xW=Math.max(xW, F(j,'extra_hit'));
    if(p.barrier_pierce) pierceW=Math.max(pierceW, F(j,'barrier_pierce'));
    if(p.weak_dmg && !(own && has('weak_dmg'))) weakD.push(pct(p.weak_dmg)*F(j,'weak_dmg'));
    // 정신통일·심기일체·하극상·호시탐탐은 상태 하나라 여러 명이 걸어도 겹치지 않음(가장 잘 깔린 것 하나)
    if(!own){
      if(p[fKey]) focW = Math.max(focW, F(j,fKey));
      if(p.overthrow) otW = Math.max(otW, F(j,'overthrow'));
      if(p.eagle_eyes) eaW = Math.max(eaW, F(j,'eagle_eyes'));
    }
  }
  const mpB = dimin(mpv, 1); // 최대 MP %: 19행 감쇠 합, 최대 +100%
  const mpBase = (pr.D ? pr.D.mp : 450) + (+me.mp_flat||0);
  const mpF = focusOf(kind, mpBase*(1+mpB));
  if(focW>0) spv.push(mpF*Math.min(1,focW));
  if(otW>0) spv.push(OVERTHROW_VAL*Math.min(1,otW));
  if(eaW>0) spv.push(EAGLE_VAL*Math.min(1,eaW));
  let dmgUp = 1; for(const s in dmgS) dmgUp *= 1+dmgS[s];
  // MP消費攻撃: 아군·자신 버프 중 최댓값 하나. 표준 장비(딩 빌더 최적 빌드)의 배지 MP 소비 공격 +15%(43행, 중복 불가)를 대신한다(AF 중에도 대미지는 증가, 사용자 확인)
  let mpAtkSk = 0; // 스킬로 받는 MP消費攻撃(장비 추천: 장비의 MP 소비 공격과 중복 불가)
  { let ma = pct(me.mp_atk); for(let j=0;j<team.length;j++){ const p=team[j].party; if(!p || p.scope==='none' || !p.mp_atk) continue; row = FX&&FX[j] ? FX[j].rows[idx] : null; ma = Math.max(ma, pct(p.mp_atk)*F(j,'mp_atk')); }
    mpAtkSk = ma; if(ma > MPATK_GEAR) dmgUp *= (1+ma)/(1+MPATK_GEAR); }
  let budDmg = 0;
  const BUD = A.bud ? A.bud.parts.filter(b=>!(b.sbOnly && situation!=='sb') && !(b.zone && !(zone && zone.level>0 && zoneMatch(b.zone, zone))) && !(b.st && sk.target!=='st')) : null;
  if(BUD) for(const b of BUD){ const p=b.party; if(!p) continue; const f=b.p;
    if(p[stat]) sv.push(pct(p[stat])*f);
    if(p.all_elem_atk && el!=='none') ev.push(pct(p.all_elem_atk)*f);
    if(p.weapon_atk && p.weapon_atk[c.weapon]) wv.push(pct(p.weapon_atk[c.weapon])*f);
    if(p.wt_dmg && p.wt_dmg[wt]) wv.push(pct(p.wt_dmg[wt])*f);
    critA += pct(p.crit_rate)*f; critD += pct(p.crit_dmg)*f; budDmg += pct(p.dmg)*f; }
  // 물리 기본 크리율 20%(운·장비 포함 평균) + 운 차이 ÷16 % (빌더 계산식: 크리율 += 운/16)
  let critR = (kind==='phys' ? 0.2 + (pr.lck ? (pr.lck-LUCK_REF)/1600 : 0) : 0) + pct(me.crit_rate) + critA;
  const statB = dimin(sv,1), elB = dimin(ev,1), wB = dimin(wv,1);
  let specB = dimin(spv, 3.5);
  dmg *= (1+elB)*(1+wB)*(1+specB); // 스탯 버프는 기본 대미지(딩 계산식) 안에서

  // 적 디버프 (내성 그룹). 디버프 규칙(지속·조건) 배율, 단일 대상 디버프는 전체 공격일 때 맞는 적 비율만큼
  const tv=[], phv=[], mgv=[], dfv=[];
  const nTg = sk.target==='st' ? 1 : Math.max(1, S.enemyCount||1);
  for(let j=0;j<team.length;j++){
    const m=team[j], d = m.afT && m.afT.deb ? afAdj(m.deb, m.afT.deb, situation, A, !!(progs[j]&&progs[j].sbOK), m.afT.real && m.afT.real.deb, sbU(j)) : m.deb; if(!d) continue;
    const fr = FX&&FX[j] ? FX[j].rows[idx] : null, st = m.rules && m.rules.debSt && nTg>1 ? m.rules.debSt : null;
    const sbD = situation==='af' && !A.postSB && m.bact && m.bact.sbOnly.size && !(FX && FX[j] && FX[j].sm);
    const off = A.eqOff && A.eqOff[j] && !(FX && FX[j] && FX[j].sm) ? A.eqOff[j] : null; // 장착 못 한 버프 행동만 거는 디버프는 끔(허수아비는 자기 마스크)
    if(!fr && !st && !sbD && !off){
      tv.push(pct(d.all_elem_res)); if(d.elem_res && el!=='none') tv.push(pct(d.elem_res[el]));
      if(kind==='phys'){ phv.push(pct(d.phys_res)); if(d.weapon_res) phv.push(pct(d.weapon_res[wt])); } else mgv.push(pct(d.mag_res));
      const dv = kind==='phys' ? d.end : d.spr; if(dv) dfv.push(pct(dv));
      continue;
    }
    const D = k=>{ let v = fr&&fr[k]!=null ? fr[k] : 1; if(st && st.has(k)) v/=nTg; if(off && off[k]===0) v = situation==='normal' && m.bact && m.bact.vcOnly && m.bact.vcOnly.has(k) ? v*VC_UP : 0; return v*sbG(j,k); };
    tv.push(pct(d.all_elem_res)*D('d_all_elem_res')); if(d.elem_res && el!=='none') tv.push(pct(d.elem_res[el])*D('d_elem_res'));
    if(kind==='phys'){ phv.push(pct(d.phys_res)*D('d_phys_res')); if(d.weapon_res) phv.push(pct(d.weapon_res[wt])*D('d_weapon_res')); }
    else mgv.push(pct(d.mag_res)*D('d_mag_res'));
    const dv = kind==='phys' ? d.end : d.spr; if(dv) dfv.push(pct(dv)*D(kind==='phys'?'d_end':'d_spr'));
  }
  if(BUD) for(const b of BUD){ const d=b.deb; if(!d) continue; const f=b.p;
    if(d.all_elem_res) tv.push(pct(d.all_elem_res)*f); if(d.elem_res && el!=='none' && d.elem_res[el]) tv.push(pct(d.elem_res[el])*f);
    if(kind==='phys'){ if(d.phys_res) phv.push(pct(d.phys_res)*f); if(d.weapon_res && d.weapon_res[wt]) phv.push(pct(d.weapon_res[wt])*f); }
    else if(d.mag_res) mgv.push(pct(d.mag_res)*f); }
  const typeR = (el!=='none'||kind==='mag') ? dimin(tv,1) : 0;
  const physR = kind==='phys' ? dimin(phv,1) : dimin(mgv,1);
  const defR = dfv.length ? dimin(dfv,1) : 0; // 내구·정신 DOWN: 기본 대미지의 방어에
  // 딩 계산기 기본 대미지: 스탯·장비 공격력·속성 보정·스탯 버프·방어(방어 무시면 0). 크리는 따로(일반타/크리타 나눠 25억 경감)
  const D = pr.D || {str:230, int:230, spd:220, lck:156, mp:450, atk:457, mag:457};
  const fsObj = stat==='int' ? {i:flatP} : stat==='spd' ? {s:flatP} : {p:flatP};
  const bh = dingHit(D, G5_OF(kind, stat), el!=='none', statB, sk.def_ignore ? 1 : defR, fsObj);
  const lunaF = (1+0.7*Math.min(1,kessW)) * (1+0.5*Math.min(1,shinW)); // 루나틱 44행: 결사 ×1.7 → 심안 ×1.5
  dmg *= bh.n * (1+typeR+physR) * (1+budDmg) * lunaF * dmgUp;

  // 크리티컬
  if(sk.crit_sure || kessW>=0.5) critR = Math.max(critR,1); // 결사: 크리티컬 확정
  if(kind==='mag' && critR<=0) critR=0;
  const p = Math.min(Math.max(critR,0),1);
  const cR = bh.c/bh.n*(1+critD); // 크리타 ÷ 일반타 (방어/4 · ×3.25 · 크리 위력)
  // 오버크리티컬: 크리율 100% 초과분 ÷ 10 이 발생 확률 (1100%면 확정), 발생 시 대미지 2배
  const ocP = ocW>0 ? Math.min(Math.max((critR-1)/10,0),1)*Math.min(1,ocW) : 0;

  // 브레이크
  let brk = 1;
  for(let bi=0; bi<A.breaks.length; bi++){ const b=A.breaks[bi], bj = A.breakJ ? A.breakJ[bi] : -1, bt = bj>=0 && team[bj] && team[bj].afT && team[bj].afT.deb;
    if(bt && afTV(bt.break, situation, A, !!(progs[bj]&&progs[bj].sbOK), team[bj].afT.real && team[bj].afT.real.deb ? team[bj].afT.real.deb.break : null, sbU(bj)) < 0.5) continue; // 체인·턴 종료 등으로만 거는 브레이크는 AF 땐 없음
    if(bj>=0 && FX && FX[bj] && FX[bj].rows[idx] && FX[bj].rows[idx].brk_x!=null && FX[bj].rows[idx].brk_x<0.5) continue; // 허수아비: 건 사람이 그 스킬을 쓰기 전
    if(b===el || b===wt || (b.indexOf('_')>0 && b.split('_').includes(wt))) { brk=Math.max(brk,1.5); } // 웨폰브레이크(斬突·斬魔 등 두 종류)
    else if(['all','any','generic','break','weapon'].includes(b)) brk=Math.max(brk,1.3);
  }
  dmg *= brk;

  // 약점/내성
  let rel = null;
  const wR = w => A.realT>1 && w.real!=null && w.real!=='sb' && +w.real>=0.5; // 실전 2턴째 이후 AF: 약점 부여 조건(축적 등)이 채워짐
  // 약점 부여가 켜진 비율(2026-10-16): 예전엔 켜짐/꺼짐(0.5 문턱)뿐이라 개전 1턴만·스킬 쓴 턴만·SB 그 턴만인 약점 간파가 평상 턴 내내 켜지던 문제 → 비율로 섞음
  const c01 = v => Math.max(0, Math.min(1, +v||0));
  const wkF = t => { let best = 0; for(const w of (A.weakInfo||[])){ if(w.t!==t) continue; let f = 1;
      if(w.noaf && situation!=='normal' && !wR(w)) f = 0;
      if(f>0 && (w.sb || (w.sbOnly && !wR(w)))) f = situation==='sb' || (situation==='af' && A.postSB) ? 1 : situation==='normal' && !w.sb1 ? c01(sbU(w.j)) : 0;
      if(f>0 && !w.start){ const r = FX && FX[w.j] && FX[w.j].rows[idx]; if(r && r.weak_x!=null) f *= c01(r.weak_x); }
      if(f>0 && w.up){ const u = situation==='normal' ? w.up.n : (A.realT>1 && w.up.real!=null ? w.up.real : w.up.af); if(u!=null) f *= c01(u); }
      if(f>best) best = f; } return best; };
  const wf = Math.max(wkF(el), wkF(wt)), added = wf>=0.5;
  const relOf = ad => { if(!enemy) return ad ? 'weak' : null; const rs=[enemyRel(enemy, el), enemyRel(enemy, wt)];
    if(rs.includes('weak') || (ad && !rs.includes('null') && !rs.includes('absorb'))) return 'weak'; if(rs.includes('resist')) return 'resist'; if(rs.includes('null')) return 'null'; if(rs.includes('absorb')) return 'absorb'; return null; };
  const relFOf = r => r==='weak' ? bh.wk + weakD.reduce((a,b)=>a+b,0) + Math.min(1,shinW) : r==='resist' ? 0.25 : r==='null'||r==='absorb' ? 0 : 1; // 약점: 물리 1.85+마력 비례 · 마법 2 (딩 계산기 26행), 심안이면 +1
  const relW = relOf(true), relN = relOf(false);
  rel = added ? relW : relN; // 허수아비 등 상성 중립 적에게도 약점 부여는 통함
  let relF = relW===relN ? relFOf(relN) : wf*relFOf(relW) + (1-wf)*relFOf(relN);
  dmg *= relF;

  // 다단강화
  const xh = xW>=0.5 && kind==='phys';
  const hits = Math.max(1, sk.hits||1) + (xh ? 1 : 0);
  // 다단강화는 스킬 한 번 안의 n번째 타격 기준: 여러 스킬을 이어 치는 행동(execs, 예: 세스타(AS) 二刀神狼・改 5실행 10타)은 실행당 타수로
  if(mhW>0) dmg *= 1 + (multihitAvg(Math.max(1, Math.round(hits/Math.max(1, +sk.execs||1))))-1)*Math.min(1,mhW);
  if(xh) dmg *= hits/Math.max(1,hits-1);

  // 장비: 공격 글래스터 (속성/HP계 가산 +30%, 페인·독 곱연산 ×1.3)
  const inf = A.infPick || A.inf || (A.painAny ? {poison:1, pain:1} : {poison:0, pain:0}), infN = A.infNow || null; // 허수아비: 장착은 기대 가동률, 효과는 지금 걸렸는지
  const zOn = !!(zone && zone.level>=2); // 각성의 힘: ZONE 각성(극·절) 중
  const hpLow = !!c.selfDamage, noEl = el==='none';
  const gk = '_gq'+Math.round(inf.poison*20)+'_'+Math.round(inf.pain*20)+(infN?'N'+Math.round(infN.poison*20)+'_'+Math.round(infN.pain*20):'')+(zOn?'z':'')+(hpLow?'h':'')+(noEl?'n':'');
  let gq = pr[gk] || (pr[gk] = grastaFactor(pr, inf, zOn, hpLow, noEl, infN));
  const share = A.mule ? A.mule.k[idx] : 0, sd = A.mule && A.mule.kd ? A.mule.kd[idx] : null;
  const plan = A.mule && A.mule.plan ? pglPlan(team, progs, A, S, zone) : null;
  if(plan){ const p = plan.per[idx];
    if(p && (p.e>0 || p.z>0)){ const base = 1 + (gq.add!=null ? gq.add : 0.3*(gq.e||0)), z0 = gq.z||0;
      const f = (base + p.e/100)/base * (1+GL_Z*z0+p.z/100)/(1+GL_Z*z0);
      gq = Object.assign({}, gq, {f: gq.f*f, share: p.names.length, alloc:{e:p.e, z:p.z, t:0, pct:true, f, names:p.names}}); } }
  else if(share>0 || sd){ // 셔틀이 공유하는 P글래: 속성·HP는 자기 속성 글래와 같은 합연산 묶음, 각성의 힘은 자기 것과 같은 49행(합) 후 곱
    const base = 1 + (gq.add!=null ? gq.add : 0.3*(gq.e||0)), z0 = gq.z||0;
    let f, al;
    const cs = A.mule.cs ? A.mule.cs[idx] : [];
    if(sd){ // 빌드 코드 셔틀은 실제 P글래 %, 나머지 셔틀은 가정 배분과 합산
      const a2 = cs.length ? shareAlloc(cs, base + sd.e/100, S.mulePct||0.3, zOn, el==='none', pglInv(A.mule.inv, c.weapon, el), z0 + (zOn ? sd.z/100/GL_Z : 0)) : null;
      const eP = sd.e + (a2 ? a2.ev : 0), zP = (zOn ? sd.z : 0) + (a2 ? 25*a2.z : 0);
      f = (base + eP/100)/base * (1+GL_Z*z0+zP/100)/(1+GL_Z*z0) * (zOn ? 1+sd.t/100 : 1);
      al = {e:eP, z:zP, t:zOn?sd.t:0, pct:true, f}; }
    else { al = shareAlloc(cs, base, S.mulePct||0.3, zOn, el==='none', pglInv(A.mule.inv, c.weapon, el), z0); f = al.f; }
    gq = Object.assign({}, gq, {f: gq.f*f, share, alloc:al});
  }
  dmg *= gq.f * pr.f;
  // 아군 전체 글래(빌더 코어 '아군 전체' 효과): 후열 셔틀 1명당 남는 칸(일반 존 2칸, 극존 1칸 — 극존이면 각성의 힘 P에 1칸 더 씀)에
  // 공명의 힘 <많은 쪽 천/명>(51행, 전후방 그 성향 1명당 +5%) → 격진의 힘 <펼친 존>(50행, +15%) 순서로. 같은 행은 합, 행끼리 곱
  let auraF = 1, auraR = null;
  if(plan){ if(plan.r51>0 || plan.r50>0){ auraF = (1+plan.r50)*(1+plan.r51); auraR = {r50:plan.r50, r51:plan.r51, nb:plan.nb}; dmg *= auraF; } }
  else if(A.aura && A.aura.nb>0){ const au=A.aura, zk = zone && zone.level>0 ? (zone.key||'') : ''; // 셔틀 배분이 없을 때: 종류마다 1개(사용자 확인) — 공명의 힘 <많은 쪽> → 격진의 힘 <존> 또는 공명의 힘 <적은 쪽>
    let r51 = auraCap(au, 'r51_'+au.maj)>0 ? 0.05*au.nMaj : 0, r50 = 0; const mn = au.maj==='light' ? 'shadow' : 'light';
    if(zk && AURA_Z.has(zk) && auraCap(au, 'r50_'+auraZK(zk))>0) r50 = 0.15; else if(au.nMin>0 && auraCap(au, 'r51_'+mn)>0) r51 += 0.05*au.nMin;
    auraF = (1+r50)*(1+r51); auraR = {r50, r51, nb:au.nb}; dmg *= auraF; }
  if(pr.gear) dmg *= pr.gear.q; // 빌드 코드: 장비 완성도

  // 방어 무시/배리어
  const pierce = pierceW>=0.5;
  if(ctx.needPierce) dmg *= 0.25 + 0.75*Math.min(1,pierceW);

  // 반복/재공격
  let rep = sk.repeat||0;
  if(situation!=='normal' && sk.repeat_af!=null) rep = +sk.repeat_af||0; // AF 중 재공격 횟수가 다른 스킬(이즈나 등 '非AF 시 재공격')
  else if(rep>0 && sk.rep_p!=null){ const rp = typeof sk.rep_p==='object' ? (situation==='normal' ? sk.rep_p.n : (sk.rep_p.af!=null ? sk.rep_p.af : sk.rep_p.n)) : sk.rep_p; rep *= Math.max(0, Math.min(1, +rp||0)); } // 재공격 조건 충족 확률(전수 대조: 개전 축적 등으로 늘 맞으면 1)
  else if(situation!=='sb' && rep>0 && (sk.condition||'').length>0) rep*=0.7;
  const totHits = hits*(1+rep);
  // 대상 수
  const nT = tgt==='aoe' ? Math.max(1,S.enemyCount) : 1;
  // 천/명 흐름 보너스 (SB 강화 어빌리티)
  if(usingSB && ctx.flux && (ctx.flux===c.align || ctx.flux==='both')) dmg*=1.1;

  const total = dmg*(1+rep), pN = total/totHits, critX = (1-p) + p*cR*(1+ocP);
  // 연계: 연계를 준 아군(행동해서 버프가 깔린 경우 F=1)의 추가공격이 공격 행동마다 1타씩(재행동 포함)
  let links = null, linkHits = 0;
  for(let j=0;j<team.length;j++){
    const m=team[j]; if(!m.links) continue;
    row = FX&&FX[j] ? FX[j].rows[idx] : null; const fL = F(j,'link'); if(!(fL>0)) continue;
    for(const L of m.links){
      if(!linkTo(L.to, team, j, idx)) continue;
      if(L.zone && !zoneMatch(L.zone, zone)) continue;
      const lk = 'st_'+kind+'_'+(L.el==='none'?'no':'el'), lsz = (SIZE_TABLE[lk]||SIZE_TABLE.st_phys_el)[SIZE_IDX[L.size]??3]/100;
      let lm = +L.mult||1; if(L.stack) lm = 1 + (lm-1)*stackFill(+L.stack, situation, A, false);
      let rho = lsz*lm*1.1/Math.max(1e-9, sizeV*mult*(tgt==='st'?1.1:1)/Math.max(1, sk.hits||1)); // 연계 1타 ÷ 스킬 1타
      if(L.el==='none' && el!=='none') rho /= 1.8; else if(L.el!=='none' && el==='none') rho *= 1.8; // 속성 보정(약 ×1.8) 차이
      const n = Math.max(1, +sk.execs||1)*(1+rep)*Math.min(1,fL); // 연계는 연속 실행마다 터짐(사용자 확인 2026-10-15)
      (links=links||[]).push({rho, el:L.el==='none'?'none':L.el, n}); linkHits += n;
    }
  }
  // 帯電(루나틱<帯電>, 알테마 ウツハラ 「自身の攻撃1Hitにつき雷属性の追撃(小)」): 타격마다 雷 小 1배 추격 1회 — 다른 캐릭터 문구엔 위력이 없어 같은 값으로.
  // 추격은 그 타격의 대상 1체라 연계처럼 단일 크기, 공격 종류(물리·마법)는 그 공격을 따름(미기재). 추격도 AF 콤보·게이지 타수에 들어감
  if(chW>0){ const lsz = (SIZE_TABLE['st_'+kind+'_el']||SIZE_TABLE.st_phys_el)[SIZE_IDX.s]/100;
    let rho = lsz*1.1/Math.max(1e-9, sizeV*mult*(tgt==='st'?1.1:1)/Math.max(1, sk.hits||1)); if(el==='none') rho *= 1.8;
    const n = totHits*chW; (links=links||[]).push({rho, el:'thunder', n, charge:true}); linkHits += n; }
  const csOK = sk.combo_scale && (!sk.combo_scale.when || !Object.keys(sk.combo_scale.when).length || ruleAct({w:sk.combo_scale.when}, idx, team, progs, situation==='af'?'normal':situation, zone, A)>0);
  return {cs: csOK ? sk.combo_scale : null, ca: +sk.combo_add||0, cup: cupA, perHit: pN*critX, pN, cR, p, oc:ocP, totHits, links, linkHits, nT, el, wt, kind, tgt, usingSB, skill:sk.skill, rel, critR, ocP, statB, elB, wB, specB, typeR, physR, brk,
    afx: (ax => totHits+linkHits>0 ? (totHits*ax + linkHits)/(totHits+linkHits) : ax)(sk.afx_zone && !zoneMatch(sk.afx_zone, zone) ? 1 : sk.af_combo_x||1) /* afx_zone: 그 존일 때만 AF 콤보 증가량 배율(질퍼니(AS) 輝晶陣). 스킬의 AF 콤보 증가량 배율은 그 스킬 타격에만 — 연계·帯電 추격 타수는 1배(2026-10-16, 빅트 과대평가) */, hitsPerAct: totHits + linkHits, rep, execs: Math.max(1, +sk.execs||1)*(1+rep) /* 실행 수(연속 실행·재공격 포함): AF 게이지는 실행마다 */, gq, pierce:!!pierce, sizeV, mult, stat, critD, baseHits: Math.max(1, sk.hits||1),
    bh, defR, flatP, lunaF, auraF, auraR, chW, kess: kessW>=0.5, shin: shinW>=0.5, dmgUp, dmgS, mpB, mpAtkSk, weakSk: weakD.reduce((a,b)=>a+b,0), mpF: focW>0 ? mpF : 0, mpTot: mpBase*(1+mpB), relF, gearF: pr.f*(pr.gear?pr.gear.q:1), budDmg, mhW, xh, st1: tgt==='st'};
}

/* 스킬 위력 조건(skill_cond.json): 조건이 맞을 확률로 base~mult 사이 기대 배율 */
function condP(cd, sit, team, c, A, zone, enemy, el, progs){
  const nrm = sit==='normal';
  // per: 축적 속도가 전열 조건 인원수에 비례(턴마다 그 수만큼, full개에서 가득 — 프레메아(AS) サジタ·멜로디(AS) デザイア) → 가득 차는 턴 = full ÷ 인원수
  const tnE = cd.per ? (k => k>0 ? Math.max(1, (+cd.per.full||+cd.turns||1)/k) : 99)(frontCount(cd.per, team)) : null;
  // 스탯 비례 위력: {stat:'spr', full:500, buff:0.5, sum:'front'} — 기본 스탯(천명치 반영)·버프로 최대치 대비 비율
  if(cd.af_p!=null && sit!=='normal'){ let x = Math.max(0, Math.min(1, +cd.af_p)); // AF·SB(허수아비 1턴) 때 충족 비율을 직접 지정(축적이 AF 중 안 늘거나 개전 축적량이 정해진 경우)
    if(cd.af_r!=null && A.realT>1){ const r = Math.max(0, Math.min(1, +cd.af_r, tnE ? 2/tnE : 1)); x += (r - x)*Math.min(1, (A.realT-1)/2); } // af_r: 실전 3턴째 AF·SB의 충족 비율(per면 2턴 동안 쌓인 만큼까지)
    return x; }
  if(cd.cnt){ let x = cntFill(cd.cnt, team, sit, A); if(cd.zone && !(zoneMatch(cd.zone, zone) && (!cd.zlv || (zone && zone.level>=cd.zlv)))) x = 0; return x; } // 'ZONE 중 ○ 공격 수만큼' 자기 몫(self_stk)
  if(cd.noaf) return sit==='normal' ? 1 : 0;
  if(cd.stat){ const k=cd.stat, val = m=>{ const j=team.indexOf(m), pr=progs&&progs[j]; const st=statsAt(m.stats, m.fateTbl, pr?(pr.t||0):120, m.stellar && pr && (pr.sbOK || pr.sbAw) ? m.stBoard : null, pr ? pr.lvB||0 : 0, pr ? pr.sty : null); return st ? st[k] : (+cd.dflt||170); };
    const v = cd.sum==='front' ? team.reduce((a,m)=>a+val(m),0) : val(c);
    return Math.min(1, v*(1+(+cd.buff||0))/Math.max(1,+cd.full||500)); }
  if(cd.zone){ const ok = zoneMatch(cd.zone, zone) && (!cd.zlv || (zone && zone.level>=cd.zlv)); return ok?1:0; }
  if(cd.req) return reqMet(cd.req, team, c) ? 1 : 0;
  if(cd.stack!=null){ const tn = tnE!=null ? tnE : +cd.turns||0, consume=/소비형/.test(String(cd.stack));
    if(tn<=0) return 1;
    if(cd.sb_fill && (sit==='sb' || (sit==='af' && A.postSB))) return 1; // SB가 가득 채움
    return stackFill(tn, sit, A, consume, cd.start, cd.af_grows); } // turns = 가득 차는 데 드는 자기 행동 수, start = 개전 축적 비율, af_grows=false면 AF 중 안 늘어남
  if(cd.hp){ const sd = c && c.selfDamage; // 스킬마다 HP를 깎는 캐릭터는 HP 저하 조건이 늘 맞고 HP 최대 조건은 거의 안 맞음
    return cd.hp==='self' ? 1 : cd.hp==='max' ? (sd ? 0.2 : 0.8) : (sd ? 1 : 0.5); }
  if(cd.mp) return 0.8;
  if(cd.af!=null) return (sit!=='normal') === !!cd.af ? 1 : 0; // SB도 AF 안에서 쓰는 것으로 본다(허수아비·시뮬의 SB는 AF 도중)
  if(cd.enemy){ const e=cd.enemy;
    if(e==='poison'||e==='pain'){ const f=A.infNow||A.inf; if(!f) return A.painAny?1:0; return e==='poison' ? f.poison : Math.max(f.pain, f.poison); } // 'pain'은 '독/페인 중 하나'로 쓰인 경우가 있음
    if(e==='weak') return A.weakAdd.includes(el) || (enemy && enemyRel(enemy, el)==='weak') ? 1 : enemy ? 0 : 0.4;
    if(e==='break') return A.breaks.length ? 1 : 0.3;
    return 0.8; }
  if(cd.turn){ if(nrm) return 0.3; const T = A.realT>1 ? A.realT : 1, m=String(cd.turn).match(/>=\s*(\d+)/), m2=String(cd.turn).match(/<=\s*(\d+)/); return m ? (+m[1]<=T ? 1 : 0) : m2 ? (T<=+m2[1] ? 1 : 0) : 0.5; } // AF·SB = 허수아비 1턴(실전 N턴은 그 AF의 턴)
  if(cd.other) return 0.6;
  return 1;
}
function condMult(sk, mc, sit, team, c, progs, idx, A, zone, enemy, el){
  const top = Math.max(mc.top!=null ? +mc.top : (sk.mult||1), 1), base = Math.max(0.1, mc.base!=null ? +mc.base : 1);
  const P = conds => { let p=1; if(conds) for(let i=0;i<conds.length && p>0;i++) p*=condP(conds[i], sit, team, c, A, zone, enemy, el, progs); return p; };
  let e=base, prev=base;
  const st = mc._st || (mc._st = (Array.isArray(mc.steps)?mc.steps:[]).filter(s=>Array.isArray(s)&&s.length>=2&&+s[0]>base&&+s[0]<top).sort((a,b)=>a[0]-b[0]));
  for(let i=0;i<st.length;i++){ const v=+st[i][0]; e += (v-prev)*P(st[i][1]); prev=v; }
  e += (top-prev)*P(mc.need);
  return Math.max(0.1, e);
}
/* 공격 글래스터 (딩 계산기 행 구분 기준)
   - 속성계 +30%와 HP 최대 시 강화 +30%: 같은 합연산 묶음(35·36행) → 1 + 0.3×개수
   - 독·페인계 ×1.3: 대상이 그 상태일 때, 칸마다 곱(39·40행)
   - 각성의 힘 ×1.25: ZONE 각성 중(49행, 다른 묶음과 곱). 같은 글래스터는 한 캐릭터에 하나라 자기 몫은 최대 1개
   inf: 이 조합의 독·페인 가동률 {poison, pain} (true/false도 받음). 잠재 광석을 달면 본인이 직접 부여(가동률 0.9)
   zOn: ZONE 각성(극·절) 중이면 각성의 힘 후보 */
const GL_Z = 0.25;
/* 격진의 힘 <존>이 있는 존(빌더 코어 글래스터 목록): 쌍격진 참돌·월광진·섬격진은 없음 */
const AURA_Z = new Set(['fire','water','earth','wind','thunder','shade','crystal','slash','pierce','blunt','magic','slash_magic','starsea','stellar_sea','星海陣']);
/* HP가 낮은 캐릭터(스킬마다 자해): 반역의 힘(그 속성 +15%·HP 80% 이하 +30%, 속성마다 하나), HP 저하 시 강화(+40%, 무기종마다 하나)가
   같은 합연산 묶음에 들어가 속성 글래스터(+30%)보다 크다 → 합연산 칸 값 [0.45, 0.40, 0.30…] (무속성이면 반역은 HP 몫 0.30만) */
const GL_ADD = {norm:[0.3,0.3,0.3,0.3], low:[0.45,0.4,0.3,0.3], lowNoEl:[0.4,0.3,0.3,0.3]};
function grastaFactor(pr, inf, zOn, hpLow, noEl, infNow){
  const AV = hpLow ? (noEl ? GL_ADD.lowNoEl : GL_ADD.low) : GL_ADD.norm, addOf = e => { let v=0; for(let k=0;k<e;k++) v+=AV[Math.min(k,AV.length-1)]; return v; };
  const gl = pr.gl||DEFAULT_SETTINGS.grastaDefault, n = pr.slots||3;
  if(inf===true) inf={poison:1, pain:1}; else if(!inf) inf={poison:0, pain:0};
  let upo = +inf.poison||0, upa = +inf.pain||0;
  if(gl.ore && !infNow){ upo=Math.max(upo,0.9); upa=Math.max(upa,0.9); } // 허수아비(infNow)는 광석 부여 시점까지 이미 넣어서 옴
  const painOK = upo>0 || upa>0;
  const mPo = 1+0.3*upo, mPa = 1+0.3*upa;
  if(gl.mode==='none') return {f:1,e:0,pa:0,po:0,z:0,add:0,painOK,n,upo,upa};
  // 허수아비 1턴: 장착은 AF 전체 기대 가동률(inf)로 고르고, 그 행동의 대미지는 지금 걸려 있는지(infNow)로
  const nowF = r => { if(!infNow) return r; const p2=1+0.3*(+infNow.pain||0), o2=1+0.3*(+infNow.poison||0);
    return Object.assign(r, {f:(1+addOf(r.e))*Math.pow(p2,r.pa)*Math.pow(o2,r.po)*(1+GL_Z*r.z), painNow: (+infNow.pain||0)>0 || (+infNow.poison||0)>0}); };
  if(gl.mode==='auto'){
    let best={f:0};
    for(let z=0;z<=(zOn&&n>0?1:0);z++) for(let pa=0;pa+z<=n;pa++) for(let po=0;po+pa+z<=n;po++){
      const e=n-pa-po-z, f=(1+addOf(e))*Math.pow(mPa,pa)*Math.pow(mPo,po)*(1+GL_Z*z);
      if(f>best.f+1e-9) best={f,e,pa,po,z,add:addOf(e),rebel:!!hpLow};
    }
    return nowF(Object.assign(best,{painOK,n,auto:true,upo,upa}));
  }
  let e=Math.max(0,+gl.e||0), pa=Math.max(0,+gl.pa||0), po=Math.max(0,+gl.po||0), z=zOn?Math.min(1,Math.max(0,+gl.z||0)):0;
  let over = e+pa+po+z-n;
  while(over>0){ if(po>0) po--; else if(pa>0) pa--; else if(z>0) z--; else e--; over--; }
  const f=(1+addOf(e))*Math.pow(mPa,pa)*Math.pow(mPo,po)*(1+GL_Z*z);
  return nowF({f,e,pa,po,z,add:addOf(e),rebel:!!hpLow,painOK,n,upo,upa});
}

/* 1타 대미지 = 일반타·크리타(·오버크리)를 나눠 각각 25억 초과 경감(딩 계산기)을 건 기대값.
   AF 콤보는 경감 뒤에 곱하고 마지막에 1타 상한 9,999,999,999 (사용자 확인: AF 초반 25~35억이 찍히다 콤보가 오르며 점점 커짐) */
const HIT_MAX = 9999999999;
/* AF 콤보 연동(2026-10-16): combo_scale = 콤보 0.75에서 lo배 ~ full 이상 hi배(선형), combo_add = 위력 배율에 k×콤보를 더함(AF 밖은 0) */
function comboF(core, combo){
  let f = 1; const af = combo!=null && combo>0;
  if(core.cs){ const cs = core.cs, lo = +cs.lo||1, hi = +cs.hi||lo, full = Math.max(0.76, +cs.full||1); f *= af ? lo + (hi-lo)*Math.max(0, Math.min(1, (combo-0.75)/(full-0.75))) : lo; }
  if(core.ca && af) f *= 1 + core.ca*combo/Math.max(0.1, core.mult||1);
  return f;
}
function applyZoneCap(core, z, S, cap, combo){
  if(!core) return 0;
  if(core.mixL){ let v=0; for(const x of core.mixL) v += x.w*applyZoneCap(x.co, z, S, cap, combo); return v; }
  const zf = zoneFactorEff(z, core.el, core.wt, S, core.rel), c = combo||1, p = core.p, oc = core.oc||0;
  const H = v => Math.min(HIT_MAX, v*c);
  const E1 = x => S.capOn ? (1-p)*H(dingCap(x)) + p*((1-oc)*H(dingCap(x*core.cR)) + oc*H(dingCap(2*x*core.cR)))
                          : x*c*((1-p) + p*core.cR*(1+oc));
  const cF = (core.cs || core.ca) ? comboF(core, combo) : 1;
  let tot = E1(core.pN*zf*cF)*core.totHits;
  if(core.links) for(const L of core.links){ tot += E1(core.pN*L.rho*zoneFactorEff(z, L.el, core.wt, S))*L.n; } // 연계 추가타
  return tot*core.nT;
}

/* ---------- 생존 점수 ---------- */
// 회복·배리어·피해 경감·상태이상 회복/무효·디버프 해제·날리기 무효·대신 맞기·도발·MP 회복(가중치는 생존 점수 기여)
const SURV_CATS = ['heal','barrier','dmg_cut','cleanse','status_immune','debuff_guard','knockback_immune','guard','taunt','mp_recover'];
const SURV_W = {heal:6, barrier:5, dmg_cut:3, cleanse:3, status_immune:3, debuff_guard:1.5, knockback_immune:2.5, guard:4, taunt:2, mp_recover:1.5};
function survival(team, progs, bud){
  // 생존 등급(2026-10-15 알테마 323명 전수 재조사, 0~3): 대상 제한(support_to: 퍼스널리티·속성·명/천·위치)은 전열 중 받는 사람 비율만큼
  const cats = SURV_CATS, W = SURV_W;
  let s=0; const det={};
  const bs = bud && bud.sup || {};
  const n = Math.max(1, Math.min(4, team.length));
  const cover = (c, k) => { const to = c.supTo && c.supTo[k]; if(!to) return 1;
    if(to.pos){ const m = {self:1, one:1, selfone:2, adj:2, selfadj:3, others:Math.max(1,n-1)}[to.pos]; return Math.min(1, (m||1)/n); }
    return Math.min(1, team.filter(m=>toFilterOK(to, m)).length / n); };
  for(const k of cats){
    const v = team.map(c=>+(c.sup[k]||0)*cover(c,k)).concat(bs[k]?[+bs[k]]:[]).sort((a,b)=>b-a);
    const val = (v[0]||0) + 0.35*(v[1]||0);
    det[k]=Math.round((v[0]||0)*100)/100; s += W[k]*val;
  }
  // 부활·전투불능 방지: 등급(0~3) 최고 + 둘째 0.35. 예전엔 있으면 +6 하나뿐이라 애니(血の誓約)·가넷(레이즈) 같은 상시형과 SB 때만 부활이 같았음
  const rv = team.map(c=>+(c.sup.revive===true?1:c.sup.revive||0)).concat(bs.revive?[bs.revive===true?1:+bs.revive||0]:[]).sort((a,b)=>b-a);
  det.revive = rv[0]||0; s += 5*((rv[0]||0) + 0.35*(rv[1]||0));
  const bd0 = bud ? bud.enemyDown||0 : 0;
  const pd = dimin(team.map(c=>pct(c.deb.pwr)).concat([bd0]),1), id = dimin(team.map(c=>pct(c.deb.int)).concat([bd0]),1);
  det.enemyDown = Math.max(pd,id); s += 12*(pd+id)/2;
  const selfD = team.filter(c=>c.selfDamage).length;
  if(det.heal<2) s -= 3*selfD;
  for(let i=0;i<team.length;i++) if(progs[i].t>=80 && team[i].stellar) s+=0.6;
  return {score:Math.max(s,0), det};
}

/* ---------- 일반 턴 시뮬레이션: MP와 버프 지속 턴 ----------
   각자 H턴 동안: 버프가 끊겼고 따로 걸어야 하면 버프 → MP가 되면 주력기 → 아니면 통상 공격.
   전열은 자연 MP 회복이 없고(후열만 턴당 10%), 파티의 MP 회복 지원 등급만큼 매 턴 회복한다고 본다. */
const MP_REGEN = [0, 8, 16, 28];
const ALT_R = 0.3, ALT_MP = 40; // MP가 모자랄 때 쓰는 값싼 보조 스킬: 주력기 위력의 30%, MP 40
/* 버프 행동 순서(2026-10-16): 그 캐릭터의 행동을 하나씩 더해 가며 AF 1회 팀 대미지가 가장 많이 느는 것부터(탐욕 순서, 가장 높은 존·다른 아군 버프는 다 깔린 상태).
   스킬 칸 장착·AF 사용 순서를 '항목 수 점수' 대신 이 순서로 — 같은 디버프를 주는 행동이 둘이면 하나만 세고, 자기 버프 항목이 많아도 실제 이득이 작으면 뒤로.
   반환: 캐릭터마다 행동별 순위 값(클수록 먼저) */
function stepValues(team, progs, A, enemy, S, cx, cap, posSets){
  const idx = team.map((c,j)=>c.bact && c.bact.steps.length>=2 ? j : -1).filter(j=>j>=0); if(!idx.length) return null;
  const zs = zoneCandidates(team, progs, 'af'); let z = null; for(const q of zs) if(q && q.level>0 && (!z || zBetter(q, z))) z = q;
  const out = team.map(()=>null);
  for(const j of idx){ const b = team[j].bact, L = b.steps.slice(0, 7), cur = new Set(b.auto); for(const x of b.main) cur.add(x);
    const noInf = team[j].inflict ? (()=>{ const t2 = team.map((c,k)=>k===j ? Object.assign({}, c, {inflict:null}) : c), Ax = Object.assign({}, A, {inf: inflictOf(t2, progs, S)}); Ax.painAny = Ax.inf.poison>0 || Ax.inf.pain>0; return Ax; })() : null;
    const ecJ = !!(A.echg && A.echg.some(e=>e.i===j) && b.steps.some(st=>st.g.has('echg')));
    const D = (m, inf) => { const FX = team.map(()=>null); FX[j] = bfOne(team, progs, 'af', z, A, posSets, {m}, true, j); const Ax0 = inf || !noInf ? A : noInf;
      const Ax = ecJ ? Object.assign({}, Ax0, {echg: (L=>L.length?L:null)(A.echg.filter(e=>e.i!==j || m.has('echg'))), _ecFix:true}) : Ax0;
      return team.reduce((v,c,i)=>{ const co = attackerCore(team, i, progs, Ax, enemy, S, 'af', cx, FX, z); return v + (co ? applyZoneCap(co, z, S, cap, 1) : 0); }, 0); };
    let inf = false, dCur = D(cur, inf); const rank = new Map(), left = L.slice(); let r = L.length;
    while(left.length){ let bi = -1, bg = -Infinity, bm = null, bInf = inf, bd = dCur;
      for(let q=0;q<left.length;q++){ const st = left[q], m = new Set(cur); for(const x of st.g) m.add(x); const i2 = inf || st.g.has('d_pain_poison'); const d = D(m, i2), g = d - dCur;
        if(g > bg + 1e-9*Math.max(1,dCur) || (Math.abs(g-bg) <= 1e-9*Math.max(1,dCur) && (st.sc||0) > (left[bi].sc||0))){ bg = g; bi = q; bm = m; bInf = i2; bd = d; } }
      const st = left.splice(bi, 1)[0]; rank.set(st, r--); for(const x of bm) cur.add(x); inf = bInf; dCur = bd; }
    out[j] = b.steps.map(st=>rank.has(st) ? rank.get(st) : 0); }
  return out;
}
function simTeam(team, progs, S, stepV){
  const H = Math.max(1, Math.round(S.simTurns||6)), mul = S.mpCostMul||1, n=team.length;
  const mpTo = (j, i) => { const to = team[j].supTo && team[j].supTo.mp_recover; if(!to) return true; if(to.pos) return to.pos==='self' ? i===j : true; return toFilterOK(to, team[i]); };
  const regenOf = i => MP_REGEN[Math.min(3, Math.max(0, ...team.map((c,j)=>mpTo(j,i) ? +((c.sup||{}).mp_recover||0) : 0)))]||0; // MP 회복은 받는 사람 조건(본인만·속성 등)대로
  const regen = Math.max(0, ...team.map((c,i)=>regenOf(i)));
  const R = {H, regen, upt:[], kup:[], eqOff:[], kupAny:false, act:[], alt:[], altW:[], na:[], out:[], mainN:[], buffN:[], mpMax:[], costMain:[], any:false};
  const zcN = team.some(c=>c.bact && c.bact.steps.some(st=>st.z)) ? zoneCandidates(team, progs, 'normal') : null;
  const autoGoku = !!(zcN && zcN.some(q=>q && q.how==='개전 자동' && q.level>=2)); // 개전부터 극 존이면 각성 행동은 쓸모없음(엘레노아 セイクリッドベール, 2026-10-16)
  const cMP = team.some(c=>c.counter && c.counter.heal) ? Math.min(100, counterMP(team, S)) : 0; R.ctrMP = cMP; // 요격 회복 MP(알마(AS) 요격 1번에 아군 전체 MP 10%, アルケミーハイ 2배): 보스가 때린 만큼
  for(let i=0;i<n;i++){
    const c=team[i];
    const mpMax = (S.mpBase||450) + Math.min(120, (progs[i].t||0)*0.47), regI = regenOf(i) + cMP/100*mpMax;
    // MP消費攻撃(질퍼니(AS) クルオルエンシス 등): 대미지 +100% 대신 공격 스킬 소비 MP +100% — AF(MP 소비 없음)엔 공짜지만 평상 턴엔 MP가 두 배로 듦
    const mpAtkX = (+((c.self||{}).mp_atk)||0)>0 || team.some(m=>m.party && m.party.scope!=='none' && (+m.party.mp_atk||0)>0) ? 2 : 1;
    const costMain = Math.round((c.mpMain!=null?c.mpMain:55)*mul*mpAtkX), costBuff = Math.round((c.mpBuff!=null?c.mpBuff:50)*mul);
    const bt = c.buffTurns>=99 ? H+1 : Math.max(1, c.buffTurns||3), dt = c.debTurns>=99 ? H+1 : Math.max(1, c.debTurns||3);
    const costAlt = Math.min(costMain, Math.round(ALT_MP*mul*mpAtkX));
    // 버프 스킬(buff_acts): 하나씩 따로 써야 해서 끊긴 것이 있으면 그 턴은 그 스킬(공격 버프기는 주력의 30%쯤으로 셈). 데이터가 없으면 예전대로 버퍼만 1개
    const steps0 = c.bact ? c.bact.steps : (c.buffAct ? [{k:'buff'}] : []);
    // 지속 턴: 디버프만 주는 스킬은 디버프 턴(낫잡이(AS) トルメンタハルパー 3턴), 독·페인만이면 inflict 턴
    const inflT = c.raw && c.raw.inflict ? (+c.raw.inflict.turns>=99 ? H+1 : (+c.raw.inflict.turns||3)) : 3;
    const durOf = st => !st.g || !st.g.size ? bt : [...st.g].every(x=>x==='d_pain_poison') ? Math.max(dt, inflT) : [...st.g].every(x=>x.indexOf('d_')===0||x==='brk') ? dt : bt;
    // 평상 턴에 다시 거는 행동(2026-10-16): 존 전개·각성(z)은 처음 한 번이라 빼고, 적 완력·지성·속도 DOWN뿐인 행동(생존용)도 빼고,
    // 자기 버프만 주는 1턴짜리와 딜러의 1턴짜리 행동은 매 턴 주력을 버리게 되니 안 씀(그 효과는 평상 턴에 없음)
    const SURV_D = new Set(['d_pwr','d_int','d_spd']), dps = (c.roles||[]).includes('dps');
    const useStep = st => { if(!st.g) return true; if(st.z && zUse) return true; const g = [...st.g]; if(!g.length) return false;
      if(g.every(x=>SURV_D.has(x))) return false; const d = st.dur>0 ? st.dur : durOf(st);
      if(d<2 && (dps || g.every(x=>x.indexOf('s.')===0))) return false; return true; };
    // 스킬 칸: 존 전개·속성 변환 같은 앞쪽 행동부터 남는 칸만큼(장착 못 한 스킬의 효과는 평상 턴에 없음)
    // 통상 공격 칸 행동(na: 루나틱 등)은 스킬 칸을 안 씀
    // 다른 아군의 개전 자동 존이 있으면 이 캐릭터의 존 전개 행동은 효과 없는 버프 행동(g 없으면 뺌)
    const zUse = !(c.bact && steps0.some(st=>st.z) && zoneStepUseless(team, progs, i, zcN));
    const sv = stepV && stepV[i], vq = q => sv ? sv[q] : 0;
    const nSlot = skillSlots(c, progs[i]), zp = q => zUse && steps0[q].z && !(autoGoku && steps0[q].z==='awaken') ? 1 : 0, ep = q => steps0[q].g && steps0[q].g.has('echg') ? 1 : 0, ord0 = steps0.map((st,q)=>q).filter(q=>!steps0[q].na && ((zUse && !(autoGoku && steps0[q].z==='awaken')) || !steps0[q].z || (steps0[q].g && steps0[q].g.size))).sort((a,b)=>zp(b)-zp(a) || (sv ? vq(b)-vq(a) : ep(b)-ep(a)) || a-b), eq = new Set(slotPick(steps0, ord0, nSlot, freeSk(c, progs[i])).concat(steps0.map((st,q)=>st.na?q:-1).filter(q=>q>=0)));
    const steps = steps0.filter((st,q)=>eq.has(q) && useStep(st)), K = steps.length;
    const rem = steps.map(()=>0), act = steps.map(()=>0);
    const dur = steps.map(st=>st.dur>0 ? st.dur : durOf(st));
    let mp=mpMax, mainN=0, altN=0, naN=0, buffN=0, out=0, altWs=0;
    // 공격 버프기 1번의 위력 ÷ 주력 1번(위력 자료가 없으면 예전처럼 주력의 30%)
    const mP = skillPow(c.main)||1, aW = Math.max(ALT_R, c.naR||0);
    const stW = steps.map(st=>st.k!=='attack' ? 0 : st.pw ? Math.max(0.05, Math.min(1, skillPow({target:(c.main||{}).target, kind:st.pw.wt==='magic'?'mag':'phys', element:st.pw.el||(c.main||{}).element||c.elem||'none', size:st.pw.size, mult:st.pw.mult})/mP)) : aW); // 주력보다 센 버프기는 데이터상 주력 선택 문제라 1로 자름
    const zOnce = steps.map(st=>(zUse && !!st.z) || !!st.once), zDone = steps.map(()=>false); // 존 전개·각성·전투 중 1회(루나틱 등)는 한 번만(존은 깔린 채로 감)
    for(let t=1;t<=H;t++){
      const k = rem.findIndex((r,q)=>r<=0 && !(zOnce[q] && zDone[q])), cB = k>=0 ? (steps[k].mp0 ? 0 : Math.round((+steps[k].mp||c.mpBuff||50)*mul)) : 0;
      if(k>=0 && mp>=cB){ mp-=cB; rem[k]=dur[k]; buffN++; if(zOnce[k]) zDone[k]=true; if(steps[k].k==='attack'){ altN++; altWs+=stW[k]; } }
      else if(mp>=costMain){ mp-=costMain; mainN++; }
      else { if(!out) out=t; if(mp>=costAlt){ mp-=costAlt; altN++; altWs+=aW; } else naN++; }
      for(let q=0;q<K;q++) if(rem[q]>0){ act[q]++; rem[q]--; }
      mp=Math.min(mpMax, mp+regI);
    }
    const upt = K ? act.reduce((x,y)=>x+y,0)/(K*H) : 1;
    // 항목별 유지율(버프 행동이 있는 캐릭터): 쓴 행동의 켜진 턴 비율, 안 쓰는 행동만 주는 항목은 0, 자동·주력은 1, SB 전용은 0
    let kup = null;
    if(c.bact){ kup = {}; const b = c.bact;
      for(const st of steps0) if(st.g) for(const x of st.g) kup[x] = 0;
      for(const x of b.sb) kup[x] = 0;
      steps.forEach((st,q)=>{ if(st.g) for(const x of st.g) kup[x] = Math.max(kup[x]||0, act[q]/H); });
      for(const x of b.main) kup[x] = 1; for(const x of b.auto) kup[x] = 1;
      for(const x of (b.vcOnly||[])) kup[x] = Math.max(kup[x]||0, VC_UP); // VC로만 거는 항목: 평상 턴 1/6
      if(Object.values(kup).some(v=>v<1)) R.kupAny = true; else kup = null; }
    R.kup.push(kup);
    { // 장착 못 한 버프 행동만 주는 항목(2026-10-16): 실전·지속 계산의 AF·SB에서도 끔(예전엔 평상 턴에서만 뺐음 — 엑코코 神鏡·騎猫之勢가 칸이 없어도 AF에 들어가던 문제)
      let off = null; if(c.bact){ const b = c.bact, has = new Set([...b.auto, ...b.main, ...b.sb]); steps.forEach(st=>{ if(st.g) for(const x of st.g) has.add(x); });
        for(const st of steps0) if(st.g) for(const x of st.g) if(!has.has(x)) (off = off || {})[x] = 0;
        for(const x of (b.vcOnly||[])) (off = off || {})[x] = 0; } // VC 항목은 AF·SB엔 없음(평상 턴은 kup 1/6, 디버프는 attackerCore0에서)
      R.eqOff.push(off); }
    R.upt.push(upt); R.act.push(mainN/H); R.alt.push(altN/H); R.altW.push(altN ? altWs/altN : aW); R.na.push(naN/H); R.out.push(out); R.mainN.push(mainN); R.buffN.push(buffN); R.mpMax.push(Math.round(mpMax)); R.costMain.push(costMain);
    if(upt<1 || mainN<H || R.kupAny) R.any=true;
  }
  return R;
}

/* ---------- 팀 평가 ---------- */
/* 후열 글래스터 셔틀: 공유 P글래 칸 수 (전열 캐릭터별) */
/* 후열(·전열 서포터) 글래스터 셔틀이 공유하는 P글래.
   P글래 종류별로 계산기 그룹이 다르다: 속성·HP 계(공격 글래스터 속성 그룹과 가산), ZONE 전개 중(별도 곱), 특정 ZONE(별도 곱).
   자동 가정: 주딜 무기 퍼스널리티의 후열 셔틀(인원 서약 반영) + 같은 퍼스널리티의 전열 서포터(딜러 아님)의 글래스터 칸.
   칸 배분은 받는 캐릭터마다 가장 이득인 조합(존이 깔려 있으면 존 계 P글래를 섞는 쪽이 보통 이득). */
/* 보유 표시 중 무기·퍼스널리티 P글래 부분(아군 전체 표 _a만 표시했으면 없음으로 — 그 경우 무기·퍼스널리티는 표시 없음과 같게) */
function pglWP(ctx){ const g = ctx && ctx.pgl; if(!g) return null;
  const any = Object.keys(g).some(k=>k!=='_p' && k!=='_a' && Object.values(g[k]||{}).some(v=>+v>0)) || Object.values(g._p||{}).some(o=>Object.values(o||{}).some(v=>+v>0));
  return any ? g : null; }
function muleShare(team, S, ctx, progs){
  if(S.muleOn===false || S.glLocked) return null;
  let mules = ctx && ctx.mules && ctx.mules.length ? ctx.mules : null, auto=false, wp=null, front=[];
  if(!mules){
    if(S.muleAuto===false) return null;
    if(!pglWP(ctx) && !S.pglAssumeAll) return null; // 연성 P글래를 표시하지 않았으면 셔틀 공유를 가정하지 않음
    let best=null; for(const c of team) if(!best || (c.pow||0)>(best.pow||0) || ((c.pow||0)===(best.pow||0) && c.id<best.id)) best=c;
    wp = best && WEAPON_PERS[best.weapon]; if(!wp) return null;
    const sl = S.muleSlots||4, nb = ctx && ctx.maxBack!=null ? ctx.maxBack : 2;
    mules=[{pers:new Set([wp]), slots:sl},{pers:new Set([wp]), slots:sl}].slice(0,Math.max(0,nb)); auto=true;
    if(S.muleFront!==false) team.forEach((c,j)=>{ if(!(c.roles||[]).includes('dps') && c.pers && c.pers.has(wp)) front.push(j); });
    if(!mules.length && !front.length) return null;
  }
  const per = (S.mulePct||0.3)*100;
  const fsl = j => (progs && progs[j] && progs[j].slots) || 3;
  const kd = team.map(()=>null), cs = team.map(()=>[]);
  const k = team.map((c,i)=>{
    const w=WEAPON_PERS[c.weapon];
    let n=0;
    for(const m of mules){
      if(m.shares){ const d=shareSlots(m.shares, c); kd[i]=kd[i]||{e:0,z:0,t:0}; kd[i].e+=d.e; kd[i].z+=d.z; kd[i].t+=d.t; n += d.e/per; }
      else if(m.pers.has(w)){ n += m.slots; cs[i].push(m.slots); }
    }
    if(auto && c.pers && c.pers.has(wp)) for(const j of front) if(j!==i){ n += fsl(j); cs[i].push(fsl(j)); }
    return n;
  });
  // 파티 단위 배분(pglPlan): 빌드 코드로 실제 P글래를 넘긴 셔틀이 없으면. 셔틀 칸 = 후열 셔틀마다 칸 수(자동 가정은 퍼스널리티 제한 없음)
  const plan = !mules.some(m=>m.shares), carriers = mules.map(m=>({slots:m.slots, pers: auto ? null : m.pers}));
  return {k, kd, cs, inv: pglWP(ctx), auto, wp, front: plan ? [] : front, plan, carriers, mules:mules.map(m=>({id:m.id||null, name:m.name||null, slots:m.slots, fromBuild:!!m.shares, pers:[...m.pers].filter(p=>Object.values(WEAPON_PERS).includes(p))}))};
}
/* 빌드 코드의 P글래 공유 효과 → 받는 캐릭터 기준 % (e: 속성·HP 그룹, z: ZONE 전개 중, t: 특정 ZONE) */
const ELEM_B = {fire:'불',water:'물',earth:'땅',wind:'바람',thunder:'번개',shade:'그림자',crystal:'결정'};
function shareSlots(shares, c){
  const wk = WEAPON_KR[c.weapon], el = (c.main&&c.main.element)||c.elem||'none';
  const o={e:0,z:0,t:0};
  for(const p of shares){
    if(p.wt && p.wt!==wk) continue;
    if(p.k==='elem'){ const ok = p.e==='all' ? el!=='none' : p.e==='none' ? el==='none' : p.e===ELEM_B[el]; if(ok) o.e += +p.v||0; }
    else if(p.k==='hp') o.e += +p.v||0; // HP 최대·저하 조건: 대부분 충족, 속성 그룹과 가산
    else if(p.k==='zone') o.z += +p.v||0;
    else if(p.k==='zonet') o.t += +p.v||0;
  }
  return o;
}
/* 셔틀 P글래 배분 (딩 빌더 글래스터 목록 기준)
   무기 퍼스널리티마다 공유되는 대미지 P글래는 사실상 셋뿐: ○○의 힘(그 속성 +30%, 무속성은 허공의 힘 +40%),
   HP 최대 시 강화(+30%, 속성과 같은 가산 그룹), 각성의 힘(ZONE 전개 중 +25%, 별도 그룹). 특정 ZONE P글래는 없음.
   셔틀 1명은 같은 글래스터를 두 개 못 다니 위 셋 중에서 칸 수만큼, 여러 셔틀의 같은 이름 P글래는 중첩 */
const SHARE_Z = 0.25;
/* 연성 P글래 보유(무기 퍼스널리티별 개수) → 받는 캐릭터 기준 {e: 그 속성의 힘(무속성은 허공), h: HP 최대, z: 각성의 힘}. 없으면 null(전부 있다고 가정) */
function pglInv(inv, weapon, el){
  if(!inv) return null;
  const r = inv[WEAPON_KR[weapon]] || {};
  return {e: +r[el||'none']||0, h: +r.hp||0, z: +r.zone||0};
}
const _SA = new Map();
function shareAlloc(cs, base, pct, zoneOn, noEl, inv, z0){
  z0 = +z0||0;
  const key = (cs||[]).join(',')+'|'+base.toFixed(3)+'|'+pct+'|'+(zoneOn?1:0)+(noEl?1:0)+'|'+(inv?inv.e+','+inv.h+','+inv.z:'-')+'|'+z0.toFixed(2);
  let r = _SA.get(key); if(r) return r;
  r = shareAlloc0(cs||[], base, pct, zoneOn, noEl, inv, z0); if(_SA.size<5000) _SA.set(key, r); return r;
}
/* z0: 받는 캐릭터가 이미 받는 각성의 힘 개수(자기 글래스터 등). 49행은 줄 안에서 합이라 셔틀 몫과 더한 뒤 곱한다 */
function shareAlloc0(cs, base, pct, zoneOn, noEl, inv, z0){
  const pe = noEl ? pct+0.1 : pct; // 허공의 힘 +40%
  let rE = inv ? inv.e : 99, rH = inv ? inv.h : 99, rZ = inv ? inv.z : 99;
  let nE=0, nH=0, nZ=0;
  // 셔틀마다 같은 글래스터는 하나: 칸 수만큼 이득이 큰 것부터 (속성·HP 최대는 가산, 각성의 힘은 곱)
  for(const s of cs){
    const used = {E:false, H:false, Z:false};
    for(let k=0;k<s;k++){
      const eNow = base + pe*nE + pct*nH, opts=[];
      if(!used.E && rE>0) opts.push(['E', (eNow+pe)/eNow]);
      if(!used.H && rH>0) opts.push(['H', (eNow+pct)/eNow]);
      if(zoneOn && !used.Z && rZ>0) opts.push(['Z', (1+SHARE_Z*(z0+nZ+1))/(1+SHARE_Z*(z0+nZ))]);
      if(!opts.length) break;
      opts.sort((a,b)=>b[1]-a[1]); const t=opts[0][0]; used[t]=true;
      if(t==='E'){ nE++; rE--; } else if(t==='H'){ nH++; rH--; } else { nZ++; rZ--; }
    }
  }
  const ev = pe*nE + pct*nH;
  const f = (base+ev)/base * (1+SHARE_Z*(z0+nZ))/(1+SHARE_Z*z0);
  return {f, e:nE+nH, el:nE, hp:nH, z:nZ, t:0, ev:Math.round(ev*100), inv:!!inv};
}
/* 퍼스널리티 P글래(딩 빌더 글래스터 데이터 + 알테마 대조 2026-10-15). 사용자 확인: 같은 이름 P글래는 셔틀끼리 겹치고, 한 캐릭터가 여러 개 달 수 있으며,
   종류(이름+조건)마다 대부분 1개만 얻는다 → 파티 전체에서 종류마다 1개(보유 표시가 2개 이상이면 그만큼)를 셔틀 칸에 나눠 단다.
   【P】 효과는 그 글래스터의 장착 조건(무기종·퍼스널리티·속성)을 가진 파티원 전원에게 간다(후열 장착 가능, 셔틀도 그 퍼스널리티가 있어야 장착). */
const PGL_ALL = ['仮面','科学者','記憶喪失','人見知り','甘党','大食い','読書家','東方','ドラゴンキラー','ロストラボ','魔獣','心の怪盗団','アウトロー','ミグランス王宮','未来革命家','普賢一刀流',
  '復讐者','辛党','西方','聖職者','アルカディア','メガネ','ねこ好き','エルフ','煉獄界','王族','妖し','料理','竜','吟遊詩人','ニックネーマー','銃','合成人間','COA','IDAスクール','KMS社']; // 全能の力 <X>: 모든 속성 공격 +25%
const PGL_HPMAX = ['東方','西方','魔獣','聖職者','ロストラボ'];   // HP最大時強化 <X>: +30%
const PGL_ZONE5 = ['IDAスクール','ロストラボ'];                 // 覚醒の力 <X>: ZONE 각성 중 +5%
const PGL_HPLOW = ['未来革命家'];                               // HP低下時強化 <X>: HP 80% 이하 +40%
const PGL_ELEMP = {fire:'火',water:'水',earth:'地',wind:'風',thunder:'雷',shade:'陰',crystal:'晶'}; // HP最大時強化 <속성>: 같은 속성 파티원 +10%(잠재)
const PGL_ELKR = {fire:'폭염의 힘',water:'격류의 힘',earth:'격진의 힘',wind:'열풍의 힘',thunder:'분뇌의 힘',shade:'검은 그림자의 힘',crystal:'결정의 힘',none:'허공의 힘'};
const AURA49 = {thunder:{el:'thunder',v:30}, shade:{el:'shade',v:30}, crystal:{el:'crystal',v:30}, blunt:{el:'all',v:20}}; // 극 격진의 힘 <존>: 49행 +15% + 아군 전체 속성 공격
/* 아군 전체 P글래 보유(보유 탭 표 _a): 한 칸이라도 표시했으면 표시한 것만(개수), 표시가 없으면 종류마다 1개 가정(사용자 확인: 공명의 힘 천/명을 안 가진 사람도 있음) */
/* 무기 P글래 획득 수(딩 빌더 목록의 획득 방법 수, 사용자 확인: 방법마다 딱 1개). 표에 없는 종류는 1개 */
const PGL_N = {'지팡이':{hp:2}, '검':{hp:2}, '도':{hp:2}, '도끼':{hp:2}, '창':{hp:3}, '활':{hp:2}, '권갑':{earth:2, hp:3, low:2}, '망치':{hp:2}};
const auraZK = z => z==='stellar_sea'||z==='星海陣' ? 'starsea' : z;
function auraCap(au, k){ const a = au && au.inv && au.inv._a; if(!a || !Object.values(a).some(v=>+v>0)) return 1; return Math.min(2, +a[k]||0); }
/* 셔틀 칸 배분(파티 단위 탐욕): 종류마다 보유 수만큼, 장착 조건이 맞는 셔틀 칸에, 받는 사람들의 대미지 비중(pow)으로 가중한 이득이 큰 것부터.
   속성·HP 계는 공격 글래스터 속성 묶음과 합(35~37행), 각성의 힘은 49행 합, 공명의 힘 51행·격진의 힘 50행은 아군 전체(행끼리 곱) */
/* 셔틀 배분 가중치: P글래 없이 잰 각자 AF 공격 1회 대미지 비중(가장 높은 존·25억 경감 포함). 공격이 없으면 0 */
function muleDmgW(team, progs, A, enemy, S, cx, cap){
  // 무작위 강한 조합 60개 비교(2026-10-16): 대미지 비중만 쓰는 쪽이 pow(평균 최선 대비 0.90)·25억 경감 탄력 보정(0.96)보다 나음(0.97)
  const A0 = Object.assign({}, A, {mule:null});
  const zs = zoneCandidates(team, progs, 'af'); let z = null; for(const q of zs) if(q && q.level>0 && (!z || zBetter(q, z))) z = q; // 이 조합이 깔 가장 높은 존
  const v = team.map((c,i)=>{ const co = attackerCore(team, i, progs, A0, enemy, S, 'af', cx, null, z); return co ? applyZoneCap(co, z, S, cap, 1) : 0; });
  const t = v.reduce((a,b)=>a+b,0); return t>0 ? v.map(x=>x/t) : null;
}
function pglPlan(team, progs, A, S, zone){
  const mu = A.mule; if(!mu || !mu.plan) return null;
  const zk = zone && zone.level>0 ? (zone.key||zone.kind)+':'+zone.level : '-';
  const memo = mu._pm || (mu._pm = new Map()); if(memo.has(zk)) return memo.get(zk);
  const zOn = !!(zone && zone.level>=2), inv = mu.inv;
  const inf = A.inf || (A.painAny ? {poison:1, pain:1} : {poison:0, pain:0});
  const R = team.map((c,i)=>{ const el = (c.main && c.main.element) || c.elem || 'none', hpLow = !!c.selfDamage;
    const g = grastaFactor(progs[i]||{}, inf, zOn, hpLow, el==='none');
    return {el, hpLow, wp: WEAPON_PERS[c.weapon], pers: c.pers || new Set(), w: mu.wd ? Math.max(0.01, mu.wd[i]) : Math.max(0.02, +c.pow||1), base: 1 + (g.add!=null ? g.add : 0.3*(g.e||0)), z0: +g.z||0, add:0, zp:0, names:[]}; });
  const wsum = R.reduce((a,r)=>a+r.w,0) || 1; R.forEach(r=>r.w/=wsum);
  const wKR = wp => WEAPON_KR[Object.keys(WEAPON_PERS).find(x=>WEAPON_PERS[x]===wp)];
  const capW = (wp,k)=> inv ? (+(((inv[wKR(wp)]||{})[k]))||0) : ((PGL_N[wKR(wp)]||{})[k] || 1); // 표시가 없으면 획득 방법 수(방법마다 1개)
  const capP = (x,k)=> inv ? (+(((inv._p||{})[x]||{})[k])||0) : 1;
  const T = []; const add = t => { if(t.cap>0 && t.recv.length) T.push(t); };
  const idxs = f => R.map((r,i)=>f(r)?i:-1).filter(i=>i>=0);
  for(const wp of new Set(R.map(r=>r.wp).filter(Boolean))){
    const wk = PERS_KR[wp]||wp;
    for(const el of new Set(R.filter(r=>r.wp===wp).map(r=>r.el))) add({id:'E:'+wp+':'+el, label:`${PGL_ELKR[el]||'속성의 힘'}<${wk}>`, kind:'add', v: el==='none'?40:30, carrier:wp, cap:capW(wp, el), recv: idxs(r=>r.wp===wp && r.el===el)});
    add({id:'H:'+wp, label:`HP 최대 시 강화<${wk}>`, kind:'add', v:30, carrier:wp, cap:capW(wp,'hp'), recv: idxs(r=>r.wp===wp && !r.hpLow)});
    add({id:'L:'+wp, label:`HP 저하 시 강화<${wk}>`, kind:'add', v:40, carrier:wp, cap:capW(wp,'low'), recv: idxs(r=>r.wp===wp && r.hpLow)});
    if(zOn) add({id:'Z:'+wp, label:`각성의 힘<${wk}>`, kind:'zone', v:25, carrier:wp, cap:capW(wp,'zone'), recv: idxs(r=>r.wp===wp)});
  }
  const allP = new Set(); R.forEach(r=>r.pers.forEach(x=>allP.add(x)));
  for(const x of allP){ const xk = PERS_KR[x]||x;
    if(PGL_ALL.includes(x)) add({id:'A:'+x, label:`전능의 힘<${xk}>`, kind:'add', v:25, carrier:x, cap:capP(x,'all'), recv: idxs(r=>r.pers.has(x) && r.el!=='none')});
    if(PGL_HPMAX.includes(x)) add({id:'HP:'+x, label:`HP 최대 시 강화<${xk}>`, kind:'add', v:30, carrier:x, cap:capP(x,'hp'), recv: idxs(r=>r.pers.has(x) && !r.hpLow)});
    if(PGL_HPLOW.includes(x)) add({id:'LP:'+x, label:`HP 저하 시 강화<${xk}>`, kind:'add', v:40, carrier:x, cap:capP(x,'low'), recv: idxs(r=>r.pers.has(x) && r.hpLow)});
    if(zOn && PGL_ZONE5.includes(x)) add({id:'Z5:'+x, label:`각성의 힘<${xk}>`, kind:'zone', v:5, carrier:x, cap:capP(x,'zone'), recv: idxs(r=>r.pers.has(x))});
  }
  for(const el in PGL_ELEMP){ const x = PGL_ELEMP[el]; if(allP.has(x)) add({id:'HE:'+x, label:`HP 최대 시 강화<${PERS_KR[x]||x}>`, kind:'add', v:10, carrier:x, cap:capP(x,'hp'), recv: idxs(r=>r.pers.has(x) && !r.hpLow)}); }
  let r51=0, r50=0; const au = A.aura;
  if(au){ const all = R.map((r,i)=>i), zkey = zone && zone.level>0 ? (zone.key||'') : '';
    const mn = au.maj==='light' ? 'shadow' : 'light', AK = {light:'천', shadow:'명'};
    add({id:'R51:'+au.maj, label:`공명의 힘<${AK[au.maj]}>`, kind:'r51', v:0.05*au.nMaj, carrier:null, cap:auraCap(au, 'r51_'+au.maj), recv:all});
    if(au.nMin>0) add({id:'R51:'+mn, label:`공명의 힘<${AK[mn]}>`, kind:'r51', v:0.05*au.nMin, carrier:null, cap:auraCap(au, 'r51_'+mn), recv:all});
    if(zkey && AURA_Z.has(zkey)) add({id:'R50:'+zkey, label:`격진의 힘<${ZONE_KR[zkey]||zkey}>`, kind:'r50', v:0.15, carrier:null, cap:auraCap(au, 'r50_'+auraZK(zkey)), recv:all});
    if(zOn && AURA49[zkey]){ const a=AURA49[zkey]; add({id:'R49:'+zkey, label:`극 격진의 힘<${ZONE_KR[zkey]||zkey}>`, kind:'r49', v:15, ev:a.v, carrier:null, cap:auraCap(au, 'r49_'+zkey), recv:all, erecv: idxs(r=> a.el==='all' ? r.el!=='none' : r.el===a.el)}); }
  }
  // 셔틀 칸: 고정 셔틀이면 그 캐릭터 퍼스널리티. 자동 가정이면 후열 셔틀마다 무기 퍼스널리티 하나(예: 도 셔틀 + 도끼 셔틀, 사용자 확인: 이런 조합의 정배),
  // 무기 P글래는 그 무기 셔틀만, 그 밖의 퍼스널리티 P글래·아군 전체 글래는 어느 셔틀이든 단다고 본다. 셔틀 무기 조합은 이득이 가장 큰 쪽으로 고른다
  const WPS = Object.values(WEAPON_PERS);
  const run = carriers => {
    const Rc = R.map(r=>Object.assign({}, r, {add:0, zp:0, names:[]})), Tc = T.map(t=>Object.assign({}, t));
    let q51=0, q50=0, score=0; const used=[];
    const gainOf = t => { let g=0;
      if(t.kind==='add') for(const i of t.recv){ const r=Rc[i]; g += r.w*Math.log((r.base+(r.add+t.v)/100)/(r.base+r.add/100)); }
      else if(t.kind==='zone' || t.kind==='r49'){ for(const i of t.recv){ const r=Rc[i], d=1+GL_Z*r.z0+r.zp/100; g += r.w*Math.log((d+t.v/100)/d); }
        if(t.kind==='r49') for(const i of t.erecv){ const r=Rc[i]; g += r.w*Math.log((r.base+(r.add+t.ev)/100)/(r.base+r.add/100)); } }
      else if(t.kind==='r51') g = Math.log((1+q51+t.v)/(1+q51));
      else if(t.kind==='r50') g = Math.log((1+q50+t.v)/(1+q50));
      return g; };
    const ok = (c,t) => { if(c.left<=0) return false; if(!t.carrier) return true;
      if(c.pers) return c.pers.has(t.carrier);
      if(c.weap && WPS.includes(t.carrier)) return c.weap===t.carrier;
      return true; };
    const fit = t => { let best=null; for(const c of carriers) if(ok(c,t) && (!best || (c.pers||c.weap) && !(best.pers||best.weap))) best=c; return best; };
    for(let guard=0; guard<64; guard++){
      let bt=null, bg=1e-6, bc=null;
      for(const t of Tc){ if(t.cap<=0) continue; const c=fit(t); if(!c) continue; const g=gainOf(t); if(g>bg){ bg=g; bt=t; bc=c; } }
      if(!bt) break;
      bc.left--; bt.cap--; used.push(bt.label); score += bg;
      if(bt.kind==='add') for(const i of bt.recv){ Rc[i].add+=bt.v; Rc[i].names.push(bt.label); }
      else if(bt.kind==='zone' || bt.kind==='r49'){ for(const i of bt.recv){ Rc[i].zp+=bt.v; if(bt.kind==='zone') Rc[i].names.push(bt.label); } if(bt.kind==='r49') for(const i of bt.erecv) Rc[i].add+=bt.ev; }
      else if(bt.kind==='r51') q51+=bt.v; else if(bt.kind==='r50') q50+=bt.v;
    }
    return {score, Rc, used, q51, q50};
  };
  let best=null, wsel=null;
  if(mu.auto){
    const ws = [...new Set(R.map(r=>r.wp).filter(Boolean))], nb = mu.carriers.length, sl = mu.carriers.length ? mu.carriers[0].slots : 3;
    const combos = []; const rec = (k, from, acc) => { if(k===nb){ combos.push(acc.slice()); return; } for(let a=from;a<ws.length;a++){ acc.push(ws[a]); rec(k+1, a, acc); acc.pop(); } };
    if(ws.length && nb>0) rec(0, 0, []); else combos.push([]);
    for(const cb of combos){ const r = run(cb.length ? cb.map(w=>({left:sl, weap:w})) : mu.carriers.map(m=>({left:m.slots}))); if(!best || r.score>best.score+1e-12){ best=r; wsel=cb; } }
  } else best = run(mu.carriers.map(m=>({left:m.slots, pers:m.pers||null})));
  const out = {per: best.Rc.map(r=>({e:r.add, z:r.zp, names:r.names})), r51:best.q51, r50:best.q50, used:best.used, slots: mu.carriers.reduce((a,m)=>a+m.slots,0), nb: mu.carriers.length,
    shuttleWeap: wsel ? wsel.map(w=>PERS_KR[w]||w) : null};
  memo.set(zk, out); return out;
}
/* 보스가 행동불능 상태이상(기절·수면·마비·석화·빙결·혼란·매료·공포)을 거는지 — 걸리면 요격이 안 나감 */
const CC_RE = /기절|스턴|수면|마비|석화|빙결|혼란|매료|공포|행동 ?불능|睡眠|麻痺|気絶|石化|凍結|混乱|魅了|恐怖|スタン/;
function enemyCCOf(boss){ if(!boss) return null; return !!((boss.needs&&boss.needs.status_immune) || (boss.mechanics||[]).some(m=>CC_RE.test(m)) || CC_RE.test(boss.strategy_kr||'')); }
/* 계산 상황: 배리어 관통 필요 여부, 속성·타입 지정, 후열 고정 셔틀 */
function buildCtx(input, ownedAll){
  const boss=input.boss;
  const maxBack = input.pledge && input.pledge.size ? Math.max(0, Math.min(2, input.pledge.size-4)) : 2;
  const mules = (input.backLocked||[]).slice(0,maxBack).map(id=>(ownedAll||[]).find(o=>o.pc.id===id)).filter(Boolean)
    .map(o=>({id:o.pc.id, name:o.pc.name, pers:o.pc.pers, slots:(o.prog&&o.prog.slots)||3, shares:(o.prog&&o.prog.gear)?o.prog.gear.ps:null}));
  return {needPierce: !!(boss&&boss.needs&&boss.needs.barrier_pierce), focus: input.focus||null, mules, maxBack, buddy: input.buddy||null, enemyCC: enemyCCOf(boss), pgl: input.pgl||null,
    burstN: input.pledge && input.pledge.turns>0 ? Math.min(10, input.pledge.turns) : null};
}
/* ---------- AF 행동 수 (위키 기준) ----------
   AF는 실시간: 게이지 100%에서 초당 10%씩 줄고, AF 중 타격으로 다시 찬다(타당 1.5%, 약점 3.5%, 맞는 ZONE은 행동당 7.5%).
   캐릭터마다 행동 → 연출(기본 2초, 캐릭터별 값이 있으면 그 값, 재행동은 실행 횟수만큼) → 대기. 대기는 행동할수록 늘어남: 속도 249 이상 1·2·3…초, 미만 2·3·4…초.
   게이지가 0이 될 때까지 각자 몇 번 행동하는지 센다. 속도는 빌드 코드(장비 포함) → 기본 스탯(+장비 속도 설정) 순. */
function afActionsOf(team, progs, cores, z, enemy, S, g0, prio, plan){ // plan[i]: 처음 행동들이 버프('buff', 게이지 0)·주력 아닌 공격('attack')인지
  const n = team.length; g0 = g0==null ? 100 : g0;
  if(S.afAuto===false){ const k=Math.max(1,Math.round((+S.afActions||5)*g0/100)), ord = prio || team.map((_,i)=>i), seq=[]; // 행동 수 고정: 우선순위 순으로 한 바퀴씩
    for(let r=0;r<k;r++) for(const i of ord) seq.push({i, t:r}); return {n:team.map(()=>k), dur:null, fast:team.map(()=>null), auto:false, seq}; }
  const anim = Math.max(0.5, +S.afAnim||2);
  // 속도: 빌드 코드(장비 포함) 그대로, 아니면 기본 스탯(+장비 속도 설정). '빌드 없는 캐릭터도 249 이상'을 켜면 빌드 없는 캐릭터는 빠른 쪽
  const spdOf = i=>{ const p=progs[i]; return p && p.spd ? p.spd : 0; };
  const fromBuild = i=>{ const p=progs[i]; return !!(p && (p.spdSrc==='build'||p.spdSrc==='build-st')); };
  const fast = team.map((c,i)=> !fromBuild(i) && S.afFastDefault ? true : (spdOf(i) ? spdOf(i)>=249 : false));
  const known = team.map((c,i)=> progs[i] && progs[i].spdSrc ? progs[i].spdSrc : null);
  const refill = team.map((c,i)=>{ const co=cores[i]; if(!co) return 0;
    const weak = enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak');
    const byHit = Math.min(30, co.totHits + (co.linkHits||0))*(weak?3.5:1.5);
    // 재공격은 실행마다 행동 한 번처럼 AF 게이지가 찬다(사용자 확인 — 루나틱 복사는 예외): 맞는 존은 실행당 7.5%, 그 밖은 타수 기준(재공격 타수 포함)
    const ex = co.execs || (1 + Math.max(0, co.rep||0)), za = zoneAF(z, co, true); if(za!=null) return za*ex; // 존이 있으면 행동(실행)당 충전으로 바뀜(위키), 상극·안 맞는 타입은 0
    return byHit; });
  // 연출 시간: 캐릭터별 값(af_anim)이 있으면 그 값. 재공격은 한 행동 안에서 이어 치므로 쿨타임은 행동당 한 번만 늘고(사용자 확인),
  // 이어 치는 연출은 실행당 S.afRepAnim배(기본 0.5)로 셈
  const repA = S.afRepAnim!=null ? +S.afRepAnim : 0.5;
  const animOf = team.map((c,i)=>{ const co=cores[i]; const ex = co ? (co.execs || 1+Math.max(0,co.rep||0)) : 1; return (c.afAnim||anim) * (1 + repA*Math.max(0, ex-1)); });
  const next = team.map(()=>0), cnt = team.map(()=>0), seq = [];
  const ord = prio && prio.length===n ? prio : team.map((_,k)=>k); // 같은 시각이면 왼쪽(우선순위)부터 — AF 자동 선택
  let g = g0, t = 0;
  for(let step=0; step<200; step++){
    let i=-1, tn=Infinity; for(const k of ord) if(cores[k] && next[k]<tn){ tn=next[k]; i=k; }
    if(i<0) break;
    const gAt = g - 10*(tn - t); if(gAt <= 0){ t += g/10; g = 0; break; }
    const pk = plan ? (plan[i] && cnt[i] < plan[i].length ? plan[i][cnt[i]] : null) : (prio && cnt[i]===0 && team[i].buffAct ? 'buff' : null); // 버프만 거는 행동은 게이지 0 (위키·사용자 확인)
    g = Math.min(100, gAt + (pk==='buff' ? 0 : refill[i])); t = tn;
    seq.push({i, t:tn, k:cnt[i], pk});
    cnt[i]++; next[i] = tn + (pk ? (team[i].afAnim||anim) : animOf[i]) + (fast[i] ? cnt[i] : cnt[i]+1);
  }
  if(g>0) t += g/10;
  return {n:cnt, dur:t, fast, known, spd:team.map((c,i)=>spdOf(i)), auto:true, seq};
}
/* ---------- 체인 어빌리티: 다른 아군의 행동에 반응하는 추격 ----------
   턴당 발동 수 = min(최대, 조건에 맞는 아군 행동 수). 평상 턴은 시뮬레이션의 행동 비율, SB 턴은 전원 1회, AF는 최대치 */
function chainActP(m, i, on, cores, sit, sim){
  const co = cores[i];
  const atkP = sit==='normal' && sim ? (sim.act[i]+sim.alt[i]) : 1;
  const act = on.act||'attack';
  if(act==='any') return 1;
  if(act==='skill') return sit==='normal' && sim ? 1-sim.na[i] : 1;
  if(act==='attack'){
    if(!co) return 0;
    if(on.elem && !on.elem.includes(co.el)) return 0;
    if(on.wt && !on.wt.includes(co.wt)) return 0;
    if(on.kind && co.kind!==on.kind) return 0;
    if(on.tgt && co.tgt!==on.tgt) return 0;
    return atkP;
  }
  const p=m.party||{}, d=m.deb||{};
  if(act==='buff'){ const has = ['pwr','int','spd','all_elem_atk','crit_rate','crit_dmg'].some(k=>(p[k]||0)>0) || Object.values(p.elem_atk||{}).some(v=>v>0); if(!has) return 0; return m.buffAct ? (sit==='normal'&&sim ? Math.max(0.2,1-sim.act[i]-sim.alt[i]-sim.na[i]) : 1) : 0.5*atkP; }
  if(act==='debuff'){ const has = ['pwr','int','spd','all_elem_res','phys_res','mag_res','end','spr'].some(k=>(d[k]||0)>0) || Object.values(d.elem_res||{}).some(v=>v>0); return has ? 0.7*atkP : 0; }
  if(act==='heal') return ((m.sup||{}).heal||0)>=2 ? 0.35 : 0;
  return 0;
}
function chainCalc(team, progs, A, enemy, S, sit, cx, FX, z, cores, sim, cap, combo, fw, ctr){
  const per = team.map(()=>0), trig = team.map(()=>0);
  let any=false, stk=null;
  for(let h=0;h<team.length;h++){
    const c=team[h]; if(!c.chain) continue;
    for(const e of c.chain){
      if(e.af===false && sit==='af') continue;
      if(e.when && Object.keys(e.when).length && ruleAct({w:e.when}, h, team, progs, sit==='af'?'normal':sit, z, A)<=0) continue;
      const on = e.on||{};
      const opts = Array.isArray(on.rand) && on.rand.length ? on.rand.map(o=>Object.assign({}, o, {by:on.by})) : [on];
      let n=0;
      for(const o of opts){
        let s=0;
        for(let i=0;i<team.length;i++){ if(i===h && (o.by||'other')!=='any') continue; if(sit==='sb' && cores[i] && cores[i].usingSB) continue; // SB 공격은 체인 어빌리티를 발동시키지 않음(사용자 확인 2026-10-16)
          s += chainActP(team[i], i, o, cores, sit==='af'?'sb':sit, sim);
          // 요격도 공격(사용자 확인: 네코코(ES) 変幻自在로 알마(AS) 요격을 번개로 → 벨벳(AS) イレクトリ가 턴 최대 10번): 평상 턴 요격 횟수만큼
          if(ctr && sit==='normal' && ctr.trig[i]>0 && (o.act||'attack')==='attack' && (!o.elem || o.elem.includes(ctr.els[i])) && (!o.wt || o.wt.includes(ctr.wts[i])) && (!o.kind || ctr.kinds[i]===o.kind) && (!o.tgt || ctr.tgts[i]===o.tgt)) s += ctr.trig[i]; }
        n += sit==='af' ? (s>0 ? (e.max||1) : 0) : Math.min(e.max||1, s);
      }
      n /= opts.length;
      if(e.every>1) n = Math.floor(n/e.every+1e-9) + (sit==='normal' ? (n%e.every)/e.every*0.5 : 0);
      if(n<=0) continue;
      const a=e.atk; let mult=+a.mult||1;
      if(a.mult_max){ const fh=team.filter((m,k)=>k!==h && (m.weapon==='fist'||m.weapon==='hammer')).length; mult=Math.min(a.mult_max, mult+0.5*fh); }
      let multSum = mult*n;
      if(Array.isArray(a.mult_seq) && a.mult_seq.length){ multSum=0; let r=n; for(let k=0;k<a.mult_seq.length && r>0;k++){ const f=Math.min(1,r); multSum+=a.mult_seq[k]*f; r-=f; } }
      const sk = {skill:e.name||'체인', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||'none',
        weapon_type:a.weapon_type||null, size:a.size||'xl', mult:1, hits:Math.max(1,a.hits||1), repeat:0, crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x:1, condition:''};
      const proxy = Object.assign({}, c, {main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true, _chain:true}); // _chain: SB 뒤 남는 효과를 안 받음(사용자 확인)
      const t2 = team.slice(); t2[h]=proxy;
      const co = attackerCore(t2, h, progs, A, enemy, S, 'normal', cx, FX, z);
      if(!co) continue;
      const d1 = applyZoneCap(co, z, S, cap, combo)*fw(co);
      // 축적에 따라 타수가 느는 체인(벨벳(AS) イレクトリ: 특대 3타, デドメナ 1개당 +1타·최대 6타, 2026-10-16): 평상 턴은 그 사이 평균(hits_avg, 없으면 (hits+hits_max)/2)
      if(a.hits_max && sit!=='af'){ const h0 = Math.max(1,a.hits||1), hA = a.hits_avg!=null ? +a.hits_avg : (h0 + +a.hits_max)/2; multSum *= hA/h0; }
      // 맞은 적에 턴 종료까지 쌓이는 내성 DOWN(stk: イレクトリ レヴマ 1개당 물리·마법 내성 10% DOWN, 발동 1번에 1~6개 — デドメナ 수): k번째 발동은 앞선 k−1번만큼 더 깎인 상태로
      if(e.stk && sit!=='af'){ const nE = Math.max(1, S.enemyCount||1), inc = pct(+e.stk.res||0)*(+e.stk.avg||1)/(sk.target==='st' ? nE : 1), b0 = 1+co.typeR+co.physR;
        // brk: 맞힐 때 거는 브레이크(イレクトリ 「ブレイク付与」 雷) — 두 번째 발동부터 ×1.5(이미 걸려 있으면 그대로)
        const bF = e.stk.brk ? Math.max(1, ((e.stk.brk===co.el || e.stk.brk===co.wt) ? 1.5 : 1.3)/Math.max(1, co.brk||1)) : 1;
        let sF=0; for(let k=0;k<Math.ceil(n-1e-9);k++) sF += Math.min(1, n-k)*(1+co.typeR+Math.min(1, co.physR+inc*k))/b0*(k>0 ? bF : 1);
        multSum *= sF/n; stk = stk || {inc:0, n:0, brk:null}; stk.inc = Math.max(stk.inc, inc); stk.n = Math.max(stk.n, n); if(e.stk.brk) stk.brk = e.stk.brk; }
      per[h] += d1*multSum; trig[h] += n; any=true;
    }
  }
  return any ? {per, trig, stk, total:per.reduce((x,y)=>x+y,0)} : null;
}
/* 체인이 쌓는 내성 DOWN(stk)을 같은 턴 요격에도: 요격 k번째(0부터)는 그 앞의 체인 발동 min(k, 체인 수)번만큼 깎인 상태 */
function counterStk(ctr, ch){
  if(!ctr || !ch || !ch.stk || !(ch.stk.inc>0 || ch.stk.brk)) return;
  const {inc, n:nc, brk:bk} = ch.stk; let tot=0;
  ctr.per = ctr.per.map((v,i)=>{ const r=ctr.res[i], n=ctr.trig[i]; if(!(v>0) || !r || !(n>0)) return v; const b0 = 1+r.ty+r.ph;
    const bF = bk ? Math.max(1, ((bk===ctr.els[i] || bk===ctr.wts[i]) ? 1.5 : 1.3)/Math.max(1, r.brk||1)) : 1; // 체인이 건 브레이크(요격 속성이 같으면 ×1.5)
    let sF=0; for(let k=0;k<Math.ceil(n-1e-9);k++) sF += Math.min(1, n-k)*(1+r.ty+Math.min(1, r.ph+inc*Math.min(k, nc)))/b0*(k>0 && nc>0 ? bF : 1);
    const w = v*sF/n; tot += w; return w; });
  ctr.total = tot;
}
/* ---------- 턴 종료 자동 공격·고정 대미지 (data/turn_end.json) ----------
   행동을 쓰지 않고 턴 끝에 나가는 공격(가창 턴 종료 공격·축적 소비 고정 대미지 등). 평상 턴 1턴당 = 위력 × up(발동 비율).
   허수아비 1턴 AF엔 없음(턴 종료는 AF 뒤). 고정 대미지는 버프·내성 무관, 1타 상한만 */
function turnEndCalc(team, progs, A, enemy, S, cx, FX, z, cap, fw){
  const per = team.map(()=>0); let any=false;
  for(let h=0;h<team.length;h++){
    const c=team[h]; if(!c.turnEnd) continue;
    for(const e of c.turnEnd){
      if(e.sb_only) continue;
      if(e.when && Object.keys(e.when).length && ruleAct({w:e.when}, h, team, progs, 'normal', z, A)<=0) continue;
      const up = e.up!=null ? Math.max(0, Math.min(1, +e.up)) : 1; if(!(up>0)) continue;
      if(e.fixed && +e.fixed.v>0){ const a=e.atk||{}; const nT = (e.fixed.target||a.target)==='st' ? 1 : Math.max(1, S.enemyCount||1);
        per[h] += Math.min(HIT_MAX, +e.fixed.v)*Math.max(1, +e.fixed.n||1)*nT*up; any=true; continue; }
      const a=e.atk; if(!a) continue;
      const sk = {skill:e.name||'턴 종료', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||'none',
        weapon_type:a.weapon_type||null, size:a.size||'xl', mult:Math.max(0.1, +a.mult||1), hits:Math.max(1,a.hits||1), repeat:0, crit_sure:!!a.crit_sure, def_ignore:!!a.def_ignore, barrier_pierce:!!a.barrier_pierce, af_combo_x:1, condition:''};
      const t2 = team.slice(); t2[h] = Object.assign({}, c, {main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true});
      const co = attackerCore(t2, h, progs, A, enemy, S, 'normal', cx, FX, z); if(!co) continue;
      per[h] += applyZoneCap(co, z, S, cap, null)*fw(co)*up; any=true;
    }
  }
  return any ? {per, total:per.reduce((x,y)=>x+y,0)} : null;
}
/* 전투 중 1회·N턴마다 강공격(once.json): 평상 턴 1턴 평균에 (그 공격 − 주력 1회) × 횟수 / N턴 */
function onceCalc(team, progs, A, enemy, S, cx, FX, z, cap, fw, cores){
  const per = team.map(()=>0); let any=false; const H = (A.tm && A.tm.H) || 6;
  for(let h=0;h<team.length;h++){ const c=team[h]; if(!c.once) continue;
    const dm = cores && cores[h] ? applyZoneCap(cores[h], z, S, cap, null)*fw(cores[h]) : 0; let best = 0;
    for(const e of c.once){ const a=e.atk; const f1 = Math.max(1, +e.first||1); if(f1 > H) continue; const m = String(e.per||'battle').match(/every:(\d+)/), times = m ? (H-f1+1)/Math.max(1,+m[1]) : 1;
      const sk = {skill:e.name||'1회', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||c.elem||'none', weapon_type:a.weapon_type||null, size:a.size||'xl', mult:Math.max(0.1,+a.mult||1), hits:Math.max(1,+a.hits||1), repeat:+a.repeat||0, crit_sure:!!a.crit_sure, def_ignore:!!a.def_ignore, barrier_pierce:!!a.barrier_pierce, af_combo_x:1, condition:''};
      const t2 = team.slice(); t2[h] = Object.assign({}, c, {main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true});
      const co = attackerCore(t2, h, progs, A, enemy, S, 'normal', cx, FX, z); if(!co) continue;
      const g = (applyZoneCap(co, z, S, cap, null)*fw(co) - dm)*times/H; if(g > best) best = g; }
    if(best>0){ per[h] += best; any=true; } }
  return any ? {per, total:per.reduce((x,y)=>x+y,0)} : null;
}
/* ---------- 턴별 화력 (개전 1턴 · 2턴) ----------
   일반 턴은 속도 순으로 행동하므로, 스킬로 거는 버프·디버프는 버퍼가 딜러보다 빨라야 1턴 딜에 들어간다.
   1턴 보장: 패시브·개전 자동 버프와 개전 자동 존만. 1턴 속도 맞춤: 스킬 버프·디버프·존까지.
   버프를 따로 거는 캐릭터는 1턴에 공격하지 않는다. 2턴: 버프가 다 깔린 상태에서 전원 공격.
   속도: 빌드 코드의 속도가 있으면 버퍼가 딜러보다 빠른지로, 모르면 반반. */
function turnTimeline(team, progs, enemy, S, cap, ctx, ev){
  const A = ev.A, fw = focusW(ctx&&ctx.focus);
  const zs = ev.normal.zones || [{kind:'none',types:[],level:0,label:'존 없음'}];
  const z1 = zoneCandidates(team, progs, 't1').filter(z=>z.kind==='all'); // 閃撃陣: 첫 턴만
  const autoZ = zs.filter(z=>!z.level || z.how==='개전 자동').concat(z1);
  const anyR = team.some(c=>c.rules), posSets = ev.posSets || null;
  const cx = Object.assign({}, ctx, {flux:ev.flux});
  const actT1 = team.map(c=>!c.buffAct); // 1턴에 공격하는 캐릭터
  const sumCores = (cores, z, mask)=>cores.reduce((v,co,i)=>v + (mask&&!mask[i] ? 0 : applyZoneCap(co, z, S, cap, null)*fw(co)), 0);
  // 보장: 스킬 버프·디버프 제거
  const strip = team.map(c=> c.buffHow==='passive'||c.buffHow==='auto' ? Object.assign({}, c, {deb:{}}) : Object.assign({}, c, {party:{scope:'none'}, deb:{}, rules:null}));
  let g=0, gz=null;
  for(const z of autoZ){ const FX = strip.some(c=>c.rules) ? buildBF(strip,progs,'normal',z,A,posSets,null) : null;
    const cores = strip.map((c,i)=>attackerCore(strip,i,progs,A,enemy,S,'normal',cx,FX,z)); const v=sumCores(cores, z, actT1); if(v>g){ g=v; gz=z; } }
  // 속도 맞춤: 평상 턴 버프 전부, 존은 평상 턴 존
  const nz = ev.normal.zone;
  const FXn = anyR ? buildBF(team,progs,'normal',nz,A,posSets,null) : null;
  const coresN = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,'normal',cx,FXn,nz));
  let u = sumCores(coresN, nz, actT1);
  for(const z of z1){ const FXz = anyR ? buildBF(team,progs,'normal',z,A,posSets,null) : null;
    const cz = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,'normal',cx,FXz,z)); u = Math.max(u, sumCores(cz, z, actT1)); }
  const t2 = sumCores(coresN, nz, null);
  // 속도 순서 확률: (버프를 주는 캐릭터 → 공격하는 캐릭터) 쌍 중 버퍼가 빠른 비율
  const spd = progs.map(p=>p&&p.spd ? p.spd : 0); // 장비 포함 속도(빌드 코드) 또는 기본 스탯
  const givers = team.map((c,i)=>i).filter(i=>!(team[i].buffHow==='passive'||team[i].buffHow==='auto') && (team[i].party&&team[i].party.scope!=='none' || Object.keys(team[i].deb||{}).length));
  let pairs=0, fast=0, known=0;
  // 선제 스킬 버퍼는 선제가 아닌 딜러보다 먼저, 둘 다 선제거나 둘 다 아니면 속도 순
  for(const j of givers) for(let i=0;i<team.length;i++){ if(i===j || !actT1[i]) continue; pairs++;
    const pj=!!team[j].preempt, pi=!!team[i].preempt;
    if(pj && !pi){ known++; fast++; continue; }
    if(pi && !pj){ known++; continue; }
    if(spd[j] && spd[i]){ known++; if(spd[j]>spd[i]) fast++; else if(spd[j]===spd[i]) fast+=0.5; } else fast+=0.5; }
  const p = pairs ? fast/pairs : 1;
  const t1 = g + Math.max(0, u-g)*p;
  return {t1, t1g:g, t1u:Math.max(g,u), t2, p, known:known===pairs && pairs>0, givers, z1:gz, actT1};
}
/* 버디: 메인은 오토 스킬+오라(+폭딜 턴 차지 스킬), 서브는 오라만. 약점 조건 오라는 상대 정보가 없으면 반반 */
function budAgg(bd, team, enemy, A){
  if(!bd || (!bd.main && !bd.sub)) return null;
  const weakP = enemy ? (team.some(c=>c.elems.some(e=>enemyRel(enemy,e)==='weak') || enemyRel(enemy,c.wt)==='weak') || A.weakAdd.length ? 1 : 0) : 0.5;
  const parts=[], sup={}; let enemyDown=0;
  const add = (x, extra)=>{ if(!x) return; const p = x.when==='weak' ? weakP : 1; parts.push(Object.assign({party:x.party||null, deb:x.deb||null, p, zone:x.when==='zone'?x.zone:null, st:!!x.st}, extra||{}));
    if(x.deb) enemyDown = Math.max(enemyDown, pct(Math.max(x.deb.pwr||0, x.deb.int||0))*p); };
  if(bd.main){ add(bd.main.main); add(bd.main.aura); add(bd.main.sb, {sbOnly:true}); for(const k in (bd.main.sup||{})) sup[k]=bd.main.sup[k]; }
  if(bd.sub && bd.sub!==bd.main){ add(bd.sub.aura); }
  return {parts, sup, enemyDown};
}
/* 속성 변환(변환자재): 아군 전체를 존 속성·특정 속성으로 바꾸는 서포터, 자기 속성을 존·약점·옆 아군에 맞추는 캐릭터 */
function echgOf(team, progs){
  const L=[]; team.forEach((c,i)=>{ const e=c.echange; if(!e) return; if(e.req && !reqMet(e.req, team, c)) return; L.push(Object.assign({i}, e)); });
  L.sort((x,y)=>team[x.i].id < team[y.i].id ? -1 : team[x.i].id > team[y.i].id ? 1 : 0); // 변환이 둘이면 넣은 순서와 무관하게(2026-10-16)
  return L.length ? L : null;
}
function echgElem(L, team, idx, el, sit, zone, enemy){
  const zEl = zone && zone.kind==='elem' && zone.level>0 ? zone.types[0] : null;
  const pick = (e, self)=>{
    if(e.sb && sit!=='sb') return null;
    if(e.zone && !(zEl===e.zone)) return null;
    if(e.el==='zone') return zEl || e.dflt || null; // 속성 ZONE이 없으면 기본 속성(네코코(ES) 変幻自在는 풍)
    if(e.el==='weak'){ if(!enemy) return null; const w=ELEMS.find(x=>enemy[x]==='weak'); return w||null; }
    if(e.el==='ally'){ if(!self) return null; const nb=team[idx+1]||team[idx-1]; return nb ? ((nb.persEl&&nb.persEl[0])||nb.elem) : null; }
    return e.el;
  };
  for(const e of L){
    if(e.to==='self'){ if(e.i!==idx) continue; const v=pick(e,true); if(v) return v; continue; }
    if(e.to==='shadow' && team[idx].align!=='shadow') continue;
    const v=pick(e,false); if(v) return v;
  }
  return el;
}
/* 이 조합의 독·페인 가동률: 부여 캐릭터 + 잠재 광석을 단 캐릭터(공격으로 직접 부여) */
function inflictOf(team, progs, S){
  const n = Math.max(1, S.enemyCount||1);
  let po=0, pa=0; const by={poison:[], pain:[]};
  team.forEach((c,i)=>{ const f=c.inflict; if(f){ const k = f.st && n>1 ? 0.6 : 1;
      if(f.poison){ po=Math.max(po, f.poison*k); by.poison.push(i); } if(f.pain){ pa=Math.max(pa, f.pain*k); by.pain.push(i); } }
    const gl = progs[i] && progs[i].gl; if(gl && gl.ore){ po=Math.max(po,0.9); pa=Math.max(pa,0.9); by.poison.push(i); by.pain.push(i); } });
  return {poison:po, pain:pa, by};
}
/* 요격: 맞은 타수마다 1번 반격(루나틱<복사>면 2번). 적 1체가 턴당 enemyHits 타를 넣고 그중 enemyAoE 비율이 전체 공격.
   전체 공격은 전열 모두가 1타씩, 수세·守護(아군 대신 맞기)면 전열 수만큼 이 캐릭터가 맞음. 단일 공격은 도발이면 90%, 守護면 전부, 다른 도발·수세 아군이 있으면 10%, 아니면 1/전열 수.
   행동불능 상태이상에 걸리면 요격이 안 나가므로, 보스가 그런 상태이상을 쓰고 상태이상 무효가 없으면 ×0.6.
   (2026-10-16, 사용자 지적 '보스가 때린다고 봐야 안정성·유지력이 나온다')
   - copy: true(늘) 또는 가동률 0~1 — 복사 중엔 요격 2번(note.com '4人×3回×複写2倍の24回の迎撃')
   - modes: [{p, mult, cover:'aoe', heal_x}] 상태별 요격(알마(AS) アルケミーハイ 2턴: 위력 15배·守護로 전열 전체 대신 맞음), 나머지 1−Σp는 기본
   - heal {hp, mp}: 요격 1번마다 아군 전체 회복(%) — 평상 턴 MP(simTeam)·생존에
   - 요격도 공격이라 AF 게이지가 참(복사 2번째는 안 참: 「複写…AFゲージ蓄積なし」) → afg */
function counterVariants(team, i, S, cx){
  const c=team[i], ct=c.counter; if(!ct || !ct.atk) return null;
  const nE = Math.min(4, Math.max(1, S.enemyCount||1)), front = Math.max(1, Math.min(4, team.length));
  const H = Math.max(0.5, +S.enemyHits||2), pA = Math.min(1, Math.max(0, S.enemyAoE!=null ? +S.enemyAoE : 0.4));
  const coverAoE = team.map(m=>m.cover==='aoe');
  const immuneAll = team.some(m=>m.sup && m.sup.status_immune>=2);
  const selfT = ct.taunt || (c.sup&&c.sup.taunt>=2), otherT = team.some((m,j)=>j!==i && ((m.sup && m.sup.taunt>=2) || coverAoE[j]));
  const cp = ct.copy===true ? 1 : Math.max(0, Math.min(1, +ct.copy||0));
  const nOf = cov => { const aoeHits = cov ? front : team.some((m,j)=>j!==i && coverAoE[j]) ? 0 : 1;
    const stShare = cov ? 1 : selfT ? 0.9 : otherT ? 0.1 : 1/front;
    let n = nE * H * (pA*aoeHits + (1-pA)*stShare);
    if(ct.trig==='phys') n*=0.7; else if(ct.trig==='fire') n*=0.3;
    if(cx && cx.enemyCC && !immuneAll && !(c.sup && c.sup.status_immune>=1)) n*=0.6;
    return n; };
  const out = []; let rest = 1;
  for(const m of (ct.modes||[])){ const p = Math.max(0, Math.min(rest, +m.p||0)); if(!(p>0)) continue; rest -= p;
    const nb = nOf(coverAoE[i] || m.cover==='aoe'); out.push({p, nb, n:nb*(1+cp), mult:m.mult!=null ? +m.mult : (+ct.atk.mult||1), hx:+m.heal_x||1}); }
  if(rest>1e-9){ const nb = nOf(coverAoE[i]); out.unshift({p:rest, nb, n:nb*(1+cp), mult:+ct.atk.mult||1, hx:1}); }
  return out;
}
function counterMP(team, S){ // 평상 턴 1턴에 요격 회복으로 받는 MP(최대 MP 대비 %, 아군 전체)
  let v=0; team.forEach((c,i)=>{ const h=c.counter && c.counter.heal; if(!h || !(+h.mp>0)) return; if(c.counter.zone) return;
    for(const q of (counterVariants(team, i, S, null)||[])) v += q.p*q.n*(+h.mp)*q.hx; });
  return v;
}
function counterCalc(team, progs, A, enemy, S, cx, FX, z, cap, fw){
  const per=team.map(()=>0), trig=team.map(()=>0), els=team.map(()=>null), wts=team.map(()=>null), kinds=team.map(()=>null), tgts=team.map(()=>null), res=team.map(()=>null); let any=false, afg=0;
  for(let i=0;i<team.length;i++){
    const c=team[i], ct=c.counter; if(!ct || !ct.atk) continue;
    if(ct.zone && !zoneMatch(ct.zone, z)) continue; // 그 존일 때만 요격(질퍼니(AS) 水天陣 クレッセンティア, 2026-10-16)
    const vs = counterVariants(team, i, S, cx); if(!vs) continue;
    const ug = (A.eqOff && A.eqOff[i] && A.eqOff[i].ctr===0) ? 0 : A.ctrU ? A.ctrU[i] : 1; if(!(ug>0)) continue; // 요격 스킬을 못 달았거나 안 쓰면 없음
    if(ug<1) for(const q of vs){ q.n*=ug; q.nb*=ug; }
    const a=ct.atk;
    for(const q of vs){ if(q.n<=0.01) continue;
      const sk={skill:'요격', target:a.target, kind:a.kind, stat:a.stat, element:a.element||'none', weapon_type:a.weapon_type, size:a.size||'xl', mult:q.mult, hits:Math.max(1,a.hits||1), repeat:0, crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x:1, condition:''};
      const t2=team.slice(); t2[i]=Object.assign({}, c, {main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true});
      const co=attackerCore(t2, i, progs, A, enemy, S, 'normal', cx, FX, z); if(!co) continue;
      per[i]+=applyZoneCap(co, z, S, cap, null)*fw(co)*q.n*q.p; trig[i]+=q.n*q.p; els[i]=co.el; wts[i]=co.wt; kinds[i]=co.kind; tgts[i]=co.tgt; res[i]={ty:co.typeR, ph:co.physR, brk:co.brk}; any=true;
      const za = zoneAF(z, co, false); afg += q.p*q.nb*(za!=null ? za : (enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak') ? 3.5 : 1.5)*Math.max(1, co.totHits||1)); }
  }
  return any ? {per, trig, els, wts, kinds, tgts, res, afg, total:per.reduce((x,y)=>x+y,0)} : null;
}
/* ---------- N턴 전투 시뮬레이션 (최고점 = 개전부터 N턴 총 대미지) ----------
   턴마다: AF(게이지 50% 이상이면 쓸지 말지 둘 다 따짐, 100%면 오래감) → AF 안에서 SB 게이지가 차면 그 시점 콤보로 SB
   → 평상 턴(1턴은 속도·선제 순서). AF 밖에서 SB가 차 있으면 그 턴에 SB. AF·SB는 턴을 쓰지 않음.
   게이지: AF 시작 50%(캐릭터·버디 조건이면 100%), 평상 턴 충전은 afGain. SB 시작 = 성향이 같은 전열 1명당 12.5%(최대 50%),
   아군 행동 1회당 2.5%(AF 중 행동 포함). 상태(턴, AF%, SB%)마다 남은 턴의 최댓값을 기억하는 동적 계획으로 가장 좋은 순서를 찾는다 */
function afStartOf(team, ctx, S){
  let g = +S.afStart; if(!(g>=0)) g = 50;
  const bud = ctx && ctx.buddy ? [ctx.buddy.main&&ctx.buddy.main.id, ctx.buddy.sub&&ctx.buddy.sub.id].filter(Boolean) : [];
  const why = [];
  for(const c of team){ const r=c.afStartR; if(!r) continue;
    if(r.need && team.filter(m=>(m.elems||[]).includes(r.need.elem)).length < r.need.n) continue;
    if(r.buddy && !r.buddy.some(b=>bud.includes(b))) continue;
    if((+r.start||0) > g){ g = +r.start; why.push(c.name); } }
  return {g: Math.min(100, g), why};
}
function battleSim(N, o){
  // 극존(ZONE 각성)은 2턴 지속: 개전 자동이면 1·2턴, SB로 각성하면 그 턴과 다음 턴. awConst면(스킬·극 글래스터로 다시 각성) 계속
  const memo = new Map(), R = o.refill;
  const f = (t, g, s, e, aw)=>{
    if(t>N) return {v:0, plan:[]};
    const key = t+'|'+Math.round(g*10)+'|'+Math.round(s*10)+'|'+e+'|'+aw;
    const hit = memo.get(key); if(hit) return hit;
    let best = null;
    const opts = [];
    if(g>=50) opts.push('af');
    opts.push('none');
    if(R && R.cost && !e && g>=R.cost) opts.push('stack');
    for(const op of opts){
      let d=0, g1=g, s1=s, e1=e, aw1=aw; const rec={t, af:null, sb:null, combo:null, stack:false};
      const L = ()=> (aw1>0 || o.awConst) ? 2 : 1;
      const useSB = (inAF, fin)=>{ if(o.sbAw) aw1 = Math.max(aw1, 2); const lv = (o.sbAw||aw1>0||o.awConst) ? 2 : 1, sv = o.sbT ? o.sbT(t) : {b:o.sbBurst, b1:o.sbBurst1, ch:o.sbChain||0};
        d += (lv>=2 ? sv.b - (sv.ch||0) : sv.b1)*(inAF?fin:1); /* SB 대미지만(그 턴 체인은 평상 턴 nd에 이미 있음 — SB는 체인을 발동시키지 않음) */ s1=0; rec.sb = inAF?'af':'turn'; if(inAF) rec.combo=fin; if(R && (e1 || !R.cost)){ g1=Math.max(g1, R.to); e1=0; rec.refill=true; } };
      if(op==='af'){ const r=o.afRun(g1, L(), t); d+=r.dmg; s1+=o.sbAct*r.acts; g1=0; rec.af=r.g0; rec.afD=r.dmg; rec.afL=L();
        if(o.hasSB && s1>=100) useSB(true, r.fin); }
      if(op==='stack'){ g1-=R.cost; e1=1; rec.stack=true; }
      if(o.hasSB && !rec.sb && s1>=100) useSB(false);
      const nd = t===1 ? o.t1 : (L()>=2 ? o.normal : o.normal1); d += nd; rec.nd = nd; rec.L = L();
      s1 = Math.min(100, s1 + o.sbAct*o.front); g1 = Math.min(100, g1 + o.afGain); aw1 = Math.max(0, aw1-1);
      rec.d = d; rec.g = g; rec.s = s;
      const nx = f(t+1, g1, s1, e1, aw1), v = d + nx.v;
      if(!best || v>best.v) best = {v, plan:[rec].concat(nx.plan)};
    }
    memo.set(key, best); return best;
  };
  const r = f(1, o.g0, o.s0, 0, o.aw0||0);
  return {total:r.v, turns:r.plan, N};
}
/* 개전 자동 존이 같은 등급으로 둘 이상이면(극·초뢰진 + 극·열화진 등) 하나만 깔리므로 각각 계산해 그 성향 기준이 큰 쪽 */
function autoZoneBy(team, progs){
  const au = zoneCandidates(team, progs, 'normal').filter(q=>q && q.level>0 && q.how==='개전 자동'); if(au.length<2) return null;
  const mx = Math.max(...au.map(q=>q.level)), by = [...new Set(au.filter(q=>q.level===mx).map(q=>q.by))]; return by.length>1 ? by : null;
}
/* 성도 스킬을 일부러 안 다는 운용(사용자 확인 2026-10-16: 유인·엑코코 등): 성도 스킬도 칸 1개라, 버프·공격 행동이 칸보다 많은 캐릭터는
   성도 스킬을 빼고(그 캐릭터 SB·비SB 성도 스킬 없음, 스텔라 보드 스탯은 그대로) 그 칸에 행동을 하나 더 다는 쪽도 계산 */
function sbDropCands(team, progs){
  const out = [];
  team.forEach((c,i)=>{ const p = progs[i]; if(!c.stellar || !p || !p.sbOK || !c.bact) return;
    const free = freeSk(c, p), names = new Set(); for(const st of c.bact.steps){ if(st.na) continue; const n = skN(st.s); if(n && !free.has(n)) names.add(n); }
    if(names.size > skillSlots(c, p)) out.push(i); });
  return out;
}
function evalKey(ctx){ const m = ctx && ctx.mode; return m==='burst' ? (ev=>+ev.dummyT||0) : m==='sustain'||m==='stability' ? (ev=>+ev.sustain||0) : m==='opener' ? (ev=>+ev.opener||0) : (ev=>0.4*(+ev.burst||0)/Math.max(1, (ev.bsim&&ev.bsim.N)||3) + 0.3*(+ev.sustain||0)); }
function evalTeam(team, progs, enemy, S, cap, ctx){
  if(ctx && ctx._azPick!==undefined) return evalTeam0(team, progs, enemy, S, cap, ctx);
  const by = autoZoneBy(team, progs) || [null], cand = S && S.sbDrop===false ? [] : sbDropCands(team, progs);
  if(by.length<2 && !cand.length) return evalTeam0(team, progs, enemy, S, cap, Object.assign({}, ctx||{}, {_azPick:null}));
  const drops = [[]];
  if(cand.length){ const sup = cand.filter(i=>!(team[i].roles||[]).includes('dps'));
    if(ctx && ctx.stFast){ if(sup.length) drops.push(sup); } // 탐색 1단계(계산량): 딜러가 아닌 캐릭터만 빼 보는 한 가지
    else { for(const i of cand) drops.push([i]); if(cand.length>1) drops.push(cand); if(sup.length>1 && sup.length<cand.length) drops.push(sup); } }
  const val = evalKey(ctx); let best = null, bv = -Infinity;
  for(const b of by) for(const d of drops){
    const pr = d.length ? progs.map((p,i)=>d.includes(i) ? Object.assign({}, p, {sbOK:false, sbAw:true, sbOff:true}) : p) : progs;
    const ev = evalTeam0(team, pr, enemy, S, cap, Object.assign({}, ctx||{}, {_azPick:b}));
    const v = val(ev); if(v > bv*(1+1e-9)){ bv = v; best = ev; best.sbOff = team.map((c,i)=>d.includes(i)); }
  }
  if(by.length>1) best.azAlt = by.length; return best;
}
function evalTeam0(team, progs, enemy, S, cap, ctx){
  const A = teamAgg(team); A.azPick = ctx && ctx._azPick || null;
  A.inf = inflictOf(team, progs, S);
  A.echg = echgOf(team, progs);
  A.bud = ctx && ctx.buddy ? budAgg(ctx.buddy, team, enemy, A) : null;
  A.painAny = A.inf.poison>0 || A.inf.pain>0;
  A.mule = muleShare(team, S, ctx, progs);
  { const nb = ctx && ctx.maxBack!=null ? ctx.maxBack : 2, lt = team.filter(c=>c.align==='light').length, sh = team.length-lt;
    A.aura = S.auraGl===false || S.glLocked ? null : {nb, nMaj: Math.max(lt, sh) + nb, nMin: Math.min(lt, sh), maj: lt>=sh ? 'light' : 'shadow', inv: ctx && ctx.pgl || null}; } // 후열은 많은 쪽 성향으로 가정
  const light = team.filter(c=>c.align==='light').length, shadow = team.length-light;
  const flux = light>shadow?'light':shadow>light?'shadow':'both';
  const hasSB = team.some((c,i)=>c.stellar && progs[i].sbOK);
  const cx = Object.assign({}, ctx, {flux});
  // 셔틀 P글래 배분 가중치(2026-10-16): 고정 위력 추정(pow) 대신 이 조합에서 각자 AF 1회 공격 대미지 비중 — 버프가 SB 배율로 커 보이는 서포터에게 셔틀 칸이 몰리던 문제
  if(A.mule && A.mule.plan) A.mule.wd = muleDmgW(team, progs, A, enemy, S, cx, cap);
  const anyR = team.some(c=>c.rules), ez = !!(A.echg && A.echg.some(e=>e.el==='zone'||e.zone)), mz = ez || team.some(c=>c.mzone), zdep = mz || (anyR && team.some(c=>c.rules&&c.rules.zdep)), sdep = anyR && team.some(c=>c.rules&&c.rules.sdep);
  const posW = () => { const zs = zoneCandidates(team, progs, 'af'); let z = null; for(const q of zs) if(q && q.level>0 && (!z || zBetter(q, z))) z = q; // 같은 등급이면 존 이름순(넣은 순서 무관)
    return team.map((c,i)=>{ const co = attackerCore(team, i, progs, A, enemy, S, 'af', cx, null, z); return co ? applyZoneCap(co, z, S, cap, 1) : 0; }); }; // 위치 버프 받는 사람: 이 조합에서 센 순서
  const posSets = anyR && team.some(c=>c.rules&&c.rules.hasPos) ? computePos(team, posW()) : null;
  // 같은 상황에서 규칙 발동 상태가 같으면 계산을 재사용 (존 후보가 버프 조건을 바꾸지 않는 경우가 대부분)
  const memo = new Map();
  const stepV = ctx && ctx.stFast ? null : stepValues(team, progs, A, enemy, S, cx, cap, posSets); // 탐색 1단계는 점수 순서(계산량)
  A.stepV = stepV;
  const sim = S.simOn!==false ? simTeam(team, progs, S, stepV) : null, simUse = !!(sim && sim.any);
  const uptLow = simUse && (sim.upt.some(u=>u<1) || sim.kupAny);
  let uptArr = simUse ? sim.upt.map((u,j)=> sim.kup[j] ? {mf: sim.kup[j]} : u) : null;
  A.eqOff = sim && sim.eqOff.some(Boolean) ? sim.eqOff : null;
  const eqArr = sim ? sim.eqOff.map(o=>o ? {mf:o} : 1) : null, eqAny = !!(eqArr && eqArr.some(x=>x!==1)); // AF·SB에서 장착 못 한 버프 끄기
  A.ctrU = team.some(c=>c.counter && c.counter.skill) ? team.map((c,j)=>{ const k = sim && sim.kup && sim.kup[j]; return k && k.ctr!=null ? k.ctr : 1; }) : null; // 요격 스킬 유지율(평상 턴)
  if(A.echg) A.ecU = team.map((c,j)=>{ const k = sim && sim.kup && sim.kup[j]; return k && k.echg!=null ? k.echg : 1; }); // 속성 변환 유지율(ecGate) // 버프 행동이 있으면 항목별 유지율
  const coresFor = (sit, z, useSim)=>{
    const upt = useSim && uptLow ? uptArr : sit!=='normal' && eqAny ? eqArr : null;
    if(!zdep){ const FX = (anyR||upt) ? buildBF(team,progs,sit,z,A,posSets,upt) : null; const cs = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,sit,cx,FX,z)); cs.FX = FX; cs.upt = upt; return cs; }
    let key = (sit==='sb'?7:sit==='af'?13:3) + (upt?100:0) + (A.realT||0)*1000;
    if(mz){ let b=1; for(const c of team) if(c.mzone) for(const cd of c.mzone){ b = b*2 + (zoneMatch(cd.zone, z) && (!cd.zlv || (z&&z.level>=cd.zlv)) ? 1 : 0); }
      if(ez) b = b*17 + (z && z.kind==='elem' && z.level>0 ? ELEMS.indexOf(z.types[0])+2 : 1);
      key = (key*131 + b) % 2147483629; } // 스킬 위력이 존에 따라 바뀌는 캐릭터
    for(let j=0;j<team.length;j++){ const R=team[j].rules; if(!R) continue;
      if(R.zel) key = (key*131 + (z&&z.kind==='elem'&&z.level>0 ? ELEMS.indexOf(z.types[0])+1+(z.types.length>1?40:0) : 0)) % 2147483629;
      for(const r of R.list) key = (key*1009 + Math.round(ruleAct(r,j,team,progs,sit,z,A)*1000)) % 2147483629; }
    const hit = memo.get(key); if(hit) return hit;
    const FX = (anyR||upt) ? buildBF(team,progs,sit,z,A,posSets,upt) : null;
    const cores = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,sit,cx,FX,z)); cores.FX = FX; cores.upt = upt;
    memo.set(key, cores); return cores;
  };
  const fw = focusW(ctx&&ctx.focus);
  const hasChain = team.some(c=>c.chain), hasCtr = team.some(c=>c.counter), hasTE = team.some(c=>c.turnEnd), hasOnce = team.some(c=>c.once);
  // 일반 턴 행동 비중: 주력기 턴 + 통상 공격 턴(주력기 대비 약한 위력)
  const wN = simUse ? team.map((c,i)=>sim.act[i] + sim.alt[i]*(sim.altW ? sim.altW[i] : Math.max(ALT_R, c.naR)) + sim.na[i]*c.naR) : null;
  const sumZ = (cores,z,combo,w)=>{ let v=0; const per=cores.map((co,i)=>{ const d=applyZoneCap(co,z,S,cap,combo)*fw(co)*(w?w[i]:1); v+=d; return d; }); return {v,per}; };
  const res = {};
  A.tm = {S0:2, H:Math.max(1, Math.round(S.simTurns||6))};
  const runSit = (sit, zOnly) => { // zOnly: 이 존만(실전 3턴째 SB — 1턴째에 고른 존으로, 계산량)
    const s2 = (sit==='sb'&&!hasSB)?'normal':sit;
    const useSim = sit==='normal' && simUse, w = sit==='normal' ? wN : null;
    const zs = zOnly ? [zOnly] : zoneForce(zoneCandidates(team, progs, sit), A.azPick);
    const shared = zdep ? null : coresFor(s2, null, useSim);
    // 요격·체인: 존마다 속성이 바뀔 수 있어(変幻自在 등) 존을 고를 때 같이 센다. 체인은 요격으로도 발동(요격 횟수를 공격으로 셈)
    const extra = (z, cores) => { let ctr = null, ch = null, te = null;
      // 요격·체인·턴 종료·1회 공격은 주력과 같은 버프 상태(평상 턴 유지율)로 — 존마다 한 번만 만듦
      const uo = useSim && uptLow ? uptArr : null; let FXn; const fxN = () => FXn!==undefined ? FXn : (FXn = (s2==='normal' && cores && cores.FX!==undefined && cores.upt===uo && zdep) ? cores.FX : (anyR||uo) ? buildBF(team,progs,'normal',z,A,posSets,uo) : null);
      if(hasCtr && sit==='normal') ctr = counterCalc(team, progs, A, enemy, S, cx, fxN(), z, cap, fw);
      if(hasChain){ const FXc = s2==='normal' ? fxN() : (anyR||eqAny ? buildBF(team,progs,s2,z,A,posSets,eqAny?eqArr:null) : null); ch = chainCalc(team, progs, A, enemy, S, s2, cx, FXc, z, cores, useSim?sim:null, cap, null, fw, ctr); }
      if(ctr && ch) counterStk(ctr, ch);
      if(hasTE && sit==='normal') te = turnEndCalc(team, progs, A, enemy, S, cx, fxN(), z, cap, fw);
      if(z && z._once && hasOnce && sit==='normal'){ const on1 = onceCalc(team, progs, A, enemy, S, cx, fxN(), z, cap, fw, cores); if(on1) te = te ? {per: te.per.map((v,i)=>v+on1.per[i]), total: te.total+on1.total} : on1; }
      return {ctr, ch, te, v:(ctr?ctr.total:0)+(ch?ch.total:0)+(te?te.total:0)}; };
    const withX = (hasCtr && sit==='normal') || hasChain || (hasTE && sit==='normal');
    let best=null, bestV=-1, bestPer=null, bestCores=shared, bestX=null;
    for(const z of zs){
      const cores = zdep ? coresFor(s2, z, useSim) : shared;
      const r = sumZ(cores, z, null, w), x = withX ? extra(z, cores) : null, v = r.v + (x ? x.v : 0);
      if(v>bestV){ bestV=v; best=z; bestPer=r.per; bestCores=cores; bestX=x; }
    }
    if(hasOnce && sit==='normal' && best){ // 1회 공격: 고른 존에서 한 번
      const x2 = extra(Object.assign({}, best, {_once:true}), bestCores); bestV += (x2.v - (bestX ? bestX.v : 0)); bestX = x2; }
    res[sit] = {total:bestV, zone:best, per:bestPer, cores:bestCores, zones:zs, sit:s2};
    if(bestX && bestX.ctr){ const ct=bestX.ctr; res[sit].counter=ct; res[sit].per=res[sit].per.map((v,i)=>v+ct.per[i]); }
    if(bestX && bestX.ch){ const ch=bestX.ch; res[sit].chain=ch; res[sit].per=res[sit].per.map((v,i)=>v+ch.per[i]); }
    if(bestX && bestX.te){ const te=bestX.te; res[sit].turnEnd=te; res[sit].per=res[sit].per.map((v,i)=>v+te.per[i]); }
  };
  runSit('normal');
  // 지속: 일반 존은 상시, 어나더 존은 2/5 턴 가동 (어나더 존 한정 버프도 그 동안만)
  const nz = res.normal.zone;
  const susOf = () => { const z0 = res.normal.zone; if(!(z0 && z0.level>=2)) return res.normal.total;
    const z1 = Object.assign({}, z0, {level:1});
    const cores1 = zdep ? coresFor('normal', z1, simUse) : res.normal.cores;
    const xN = (res.normal.chain?res.normal.chain.total:0) + (res.normal.counter?res.normal.counter.total:0) + (res.normal.turnEnd?res.normal.turnEnd.total:0); // 일반 존 턴에도 체인·요격·턴 종료(근사: 극 존 때 값)
    return (sumZ(cores1, z1, null, wN).v + xN)*0.6 + res.normal.total*0.4; };
  let sustain = susOf();
  // AF 게이지 충전(평상 턴): ZONE 없으면 타당 1.5%(약점 3.5%, 전체 공격도 1타겟), ZONE이 있으면 행동(실행)당(맞으면 7.5%, 그 밖 1.5%, 상극 0).
  // 서포트 등급(AF 게이지)·버디로 추가. AF 주기 K = 100 / 턴당 충전
  let afGain = 0;
  { const z=nz, cs=res.normal.cores;
    team.forEach((c,i)=>{ const co=cs[i]; if(!co) return; const pAct = simUse ? (sim.act[i]+sim.alt[i]) : 1;
      const za = zoneAF(z, co, false);
      const weak = enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak');
      const byHit = Math.min(30, co.totHits) * (weak?3.5:1.5), ex = co.execs || (1 + Math.max(0, co.rep||0));
      afGain += pAct * (za!=null ? za*ex : byHit); // 존이 있으면 행동(실행)당
      afGain += [0,2,4,7][Math.min(3,(c.sup&&c.sup.af_gauge)||0)];
    });
    if(A.bud && ctx && ctx.buddy && ctx.buddy.main && ['moke','korobo','gansu_as'].includes(ctx.buddy.main.id)) afGain += 5;
    // 요격도 공격이라 AF 게이지가 참(note.com '守護迎撃で…AFゲージを大量に稼ぐ', 2026-10-16) — 존이 있으면 요격 1번 = 행동 1번, 복사 2번째는 안 참
    if(res.normal.counter && res.normal.counter.afg>0) afGain += res.normal.counter.afg;
  }
  const afTurns = Math.max(2, Math.min(20, 100/Math.max(1, afGain)));
  // 허수아비는 1턴만, AF 100%로 시작(사용자 확인) → 세팅 턴 없음: 축적은 AF 중 행동 횟수만큼
  A.tm.S0 = 0;
  runSit('sb');
  const afCores = coresFor('af', nz, false); // AF 상황(AF 전용 스킬·AF 조건)으로, 버프는 다 깔린 상태
  const afA = afActionsOf(team, progs, afCores, nz, enemy, S);
  let gain=0;
  afCores.forEach((co,i)=>{ if(co) gain += afA.n[i]*co.hitsPerAct*(0.025+(co.cup||0))*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); });
  const avgCombo = Math.min(0.75 + 0.5*gain, S.comboCap>0 ? S.comboCap : Infinity);
  const afS = sumZ(afCores, nz, avgCombo, afA.n);
  // 실전 N턴의 AF·SB(2026-10-16): 1턴째는 허수아비와 같은 상태(af_timing·축적 0), 3턴째부터는 세팅 2턴 뒤 —
  // af_timing real·skill_cond af_r·상태 구간(개전·사용)·축적(stackFill S0 2). 2턴째는 둘의 중간. 지속 딜의 AF는 3턴째 이후 값
  const R3 = (()=>{ const sv = res.sb; A.realT = 3; A.tm.S0 = 2;
    const cs = coresFor('af', nz, false); runSit('sb', sv.zone || null); const sb3 = Object.assign({}, res.sb, {zones: sv.zones}); res.sb = sv; A.realT = 0; A.tm.S0 = 0;
    const a3 = afActionsOf(team, progs, cs, nz, enemy, S); let g3 = 0; cs.forEach((co,i)=>{ if(co) g3 += a3.n[i]*co.hitsPerAct*(0.025+(co.cup||0))*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); });
    const avg3 = Math.min(0.75 + 0.5*g3, S.comboCap>0 ? S.comboCap : Infinity);
    return {cores:cs, afA:a3, avg:avg3, afS:sumZ(cs, nz, avg3, a3.n), sb:sb3}; })();
  let af = R3.afS.v;
  let afChain = null;
  // 체인 어빌리티는 AF 밖(평상·SB 턴)에서만 발동 (사용자 확인)
  const sbTurn = res.sb.total;
  const surv = survival(team, progs, A.bud);
  const sustainAF = sustain + (S.afCycle!==false ? af/afTurns : 0); // 지속 딜: 평상 턴 + AF를 주기마다 한 번
  const out = {sbTurn, af, af1: afS.v, afPer: R3.afS.per, afChain, afA: R3.afA, afA1: afA, sustain: sustainAF, sustainNoAF: sustain, afGain, afTurns, burst: sbTurn + 0.5*af, surv: surv.score, survDet: surv.det,
    flux, light, shadow, hasSB, avgCombo: R3.avg, avgCombo1: avgCombo, normal:res.normal, sb:res.sb, sb3:R3.sb, A, posSets, sim, mule:A.mule};
  if(ctx && ctx.timeline){ const tl = turnTimeline(team, progs, enemy, S, cap, ctx, out); out.tl = tl; }
  // AF를 게이지 g0%에서 시작했을 때 (행동 수·콤보·화력). 100%는 위에서 계산한 값
  // 극존이 풀린(일반 존) 상태의 값: 개전 극존은 2턴, SB 극존은 그 턴·다음 턴만
  const nzL1 = nz && nz.level>=2 ? Object.assign({}, nz, {level:1}) : nz;
  // 같은 존을 여러 명이 펼 수 있으면(예: 리나리아 개전 자동 + 히스메나(ES) SB 각성) 각성 경로를 모두 센다 — 편성 순서와 무관하게
  const sameZ = (zs, z) => z && z.level>=2 ? (zs||[]).filter(q=>q.key===z.key && q.level>=2) : [];
  const nzs = sameZ(res.normal.zones, nz);
  const awConst = nzs.some(q=>q.how!=='개전 자동' && q.how!=='SB 시'), awStart = !awConst && nzs.some(q=>q.how==='개전 자동');
  const sbz = res.sb.zone, sbAw = sameZ(res.sb.zones, sbz).some(q=>q.how==='SB 시');
  const afMemo = {};
  const afRun = (g0, lv, t)=>{ g0 = Math.max(50, Math.min(100, Math.round(g0/10)*10)); const lv2 = !(nz && nz.level>=2) || lv>=2, tc = t>=3 ? 3 : t===2 ? 2 : 1; const k=g0+(lv2?'a':'b')+tc; if(afMemo[k]) return afMemo[k];
    if(tc===2){ const p = afRun(g0, lv, 1), q = afRun(g0, lv, 3), m = (x,y)=>(x+y)/2; // 2턴째 AF: 1턴째·3턴째의 중간
      return (afMemo[k] = {g0, dmg:m(p.dmg,q.dmg), per:p.per.map((v,i)=>m(v,q.per[i])), acts:m(p.acts,q.acts), fin:m(p.fin,q.fin), avg:m(p.avg,q.avg), n:p.n}); }
    const cs = tc===3 ? R3.cores : afCores, a0 = tc===3 ? R3.afA : afA;
    const a = g0>=100 ? a0 : afActionsOf(team, progs, cs, lv2?nz:nzL1, enemy, S, g0);
    let gn=0; cs.forEach((co,i)=>{ if(co) gn += a.n[i]*co.hitsPerAct*(0.025+(co.cup||0))*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); });
    const avg = Math.min(0.75+0.5*gn, S.comboCap>0 ? S.comboCap : Infinity), zz = (g0>=100 && lv2) ? (tc===3 ? R3.afS : afS) : sumZ(cs, lv2?nz:nzL1, avg, a.n);
    return (afMemo[k] = {g0, dmg:zz.v, per:zz.per, acts:a.n.reduce((x,y)=>x+y,0), fin:Math.min(0.75+gn, S.comboCap>0 ? S.comboCap : Infinity), avg, n:a.n}); };
  const sbIdx = team.map((c,i)=>i).filter(i=>team[i].stellar && progs[i].sbOK);
  const st = afStartOf(team, ctx, S);
  const extra = (res.normal.chain?res.normal.chain.total:0) + (res.normal.counter?res.normal.counter.total:0) + (res.normal.turnEnd?res.normal.turnEnd.total:0);
  const normal2 = res.normal.total, normal1 = nz && nz.level>=2 ? sumZ(zdep ? coresFor('normal', nzL1, simUse) : res.normal.cores, nzL1, null, wN).v + extra : normal2;
  const sbz1 = sbz && sbz.level>=2 ? Object.assign({}, sbz, {level:1}) : sbz, sbPer1 = sbz && sbz.level>=2 ? sumZ(res.sb.cores, sbz1, null, null).per : res.sb.per;
  const sb3 = R3.sb, sbz3 = sb3.zone, sbz31 = sbz3 && sbz3.level>=2 ? Object.assign({}, sbz3, {level:1}) : sbz3, sbPer31 = sbz3 && sbz3.level>=2 ? sumZ(sb3.cores, sbz31, null, null).per : sb3.per;
  const sbSum = (per) => sbIdx.reduce((v,i)=>v+(per[i]||0),0), sbCh = r => r.chain ? sbIdx.reduce((v,i)=>v+(r.chain.per[i]||0),0) : 0;
  const simIn = {t1: out.tl ? out.tl.t1 : normal2, normal: normal2, normal1, sbBurst: sbSum(res.sb.per), sbBurst1: sbSum(sbPer1),
    sbChain: sbCh(res.sb), // 체인 추격은 평상 턴 SB에만(AF 안 SB엔 없음)
    sbT: t => { const w = Math.min(1, Math.max(0, (t-1)/2)), L = (x,y)=>x+(y-x)*w; return {b: L(sbSum(res.sb.per), sbSum(sb3.per)), b1: L(sbSum(sbPer1), sbSum(sbPer31)), ch: L(sbCh(res.sb), sbCh(sb3))}; }, // 실전 N턴의 SB: 턴이 지날수록 3턴째 값으로
    aw0: awStart ? 2 : 0, awConst, sbAw, hasSB: sbIdx.length>0,
    afGain, g0: st.g, s0: Math.min(50, 12.5*Math.max(light, shadow)), sbAct: S.sbPerAct!=null ? +S.sbPerAct : 2.5, front: team.length, afRun,
    refill: (()=>{ const rc = sbIdx.length ? team.find(c=>c.afRefillR && c.afRefillR.on==='sb') : null; return rc ? {to:+rc.afRefillR.to||100, cost:+rc.afRefillR.cost||0} : null; })()};
  // 지속 딜에 SB(2026-10-16, 사용자 확인: SB는 턴을 쓰지 않아 쓴 뒤에도 그 턴 행동을 그대로 함): SB 게이지가 차는 주기마다 한 번 더함.
  // 게이지 = 평상 턴 행동마다 + AF 행동마다(실전 시뮬과 같은 sbAct), 차는 몫이 AF 쪽이면 AF 끝 콤보로(실전 시뮬처럼 AF 안 SB)
  if(S.sbCycle!==false && sbIdx.length){ const sa = simIn.sbAct, afActs = R3.afA.n.reduce((x,y)=>x+y,0), gN = sa*team.length, gA = S.afCycle!==false ? sa*afActs/afTurns : 0, gT = gN + gA;
    const sbTurns = Math.max(1, 100/Math.max(1, gT)), fr = gT>0 ? gA/gT : 0, fin = afRun(100, 2, 3).fin, k = fr*fin + (1-fr);
    const sp = team.map((c,i)=> sbIdx.includes(i) ? Math.max(0, (sb3.per[i]||0) - (sb3.chain ? sb3.chain.per[i]||0 : 0))*k/sbTurns : 0), sv = sp.reduce((x,y)=>x+y,0);
    out.sustain += sv; out.sustainSB = sv; out.sbPerSus = sp; out.sbTurns = sbTurns;
    // SB 뒤 효과(SB로만 거는 버프·디버프, af_timing 'sb')는 평상 턴에도 남음(사용자 확인 2026-10-16, 체인 어빌리티 공격만 빼고):
    // 남는 비율 = 지속 턴(turns.buff) ÷ SB 주기. 평상 턴을 그 비율로 다시 계산하고 지속 딜·실전 시뮬의 평상 턴 값을 바꿈
    const u = team.map((c,j)=> sbIdx.includes(j) ? Math.min(1, Math.max(1, c.buffTurns>=99 ? sbTurns : (c.buffTurns||3))/sbTurns) : 0);
    const has = team.some((c,j)=> u[j]>0 && ((c.afT && ['party','self','deb'].some(q=>c.afT[q] && Object.values(c.afT[q]).includes('sb'))) || (c.bact && c.bact.sbOnly.size) || (c.rules && c.rules.list.some(r=>r.w && r.w.sb))));
    if(has){ A.sbUpN = u;
      if(simUse){ sim.kup = sim.kup.map((kp,j)=> kp && team[j].bact && u[j]>0 ? Object.assign({}, kp, Object.fromEntries([...team[j].bact.sbOnly].filter(x=>!team[j].bact.sb1.has(x)).map(x=>[x, Math.max(kp[x]||0, u[j])]))) : kp); sim.kupAny = sim.kupAny || sim.kup.some(Boolean);
        uptArr = sim.upt.map((v,j)=> sim.kup[j] ? {mf: sim.kup[j]} : v); }
      memo.clear(); A.tm.S0 = 2; runSit('normal'); A.tm.S0 = 0;
      const sus2 = susOf(), ex2 = (res.normal.chain?res.normal.chain.total:0) + (res.normal.counter?res.normal.counter.total:0) + (res.normal.turnEnd?res.normal.turnEnd.total:0);
      const nz2 = res.normal.zone, nz2L1 = nz2 && nz2.level>=2 ? Object.assign({}, nz2, {level:1}) : nz2;
      simIn.normal = res.normal.total; simIn.normal1 = nz2 && nz2.level>=2 ? sumZ(zdep ? coresFor('normal', nz2L1, simUse) : res.normal.cores, nz2L1, null, wN).v + ex2 : simIn.normal;
      out.sustain += sus2 - out.sustainNoAF; out.sustainNoAF = sus2; out.normal = res.normal; out.sbUpN = u; } }
  const NB = Math.max(1, Math.min(10, (ctx && ctx.burstN) || +S.burstTurns || 3));
  // 조합 탐색 중에는 그 모드 점수에 쓰는 것만 계산(최고점 = 허수아비, 나머지 = N턴 시뮬). 화면용 재계산(ctx.mode 없음)은 둘 다
  const md = ctx && ctx.mode, needBsim = md!=='burst', needDummy = !md || md==='burst';
  if(needBsim){
    out.bsim = battleSim(NB, simIn); out.bsim.afStart = st; out.bsim.s0 = simIn.s0;
    { // 실전 N턴 딜 비중(2026-10-16, 사용자 지적: 화면이 SB 턴 비중만 보여 주력 딜러 몫이 작게 보임): 고른 계획의 AF·SB·평상 턴을 캐릭터별로 다시 더함
      const per = team.map(()=>0), nT = res.normal.per.reduce((a,b)=>a+b,0)||1, add = (arr, k) => arr.forEach((v,i)=>{ per[i] += (v||0)*k; });
      for(const rc of out.bsim.turns){
        if(rc.af){ const r = afRun(rc.af, rc.afL, rc.t); add(r.per, 1); }
        if(rc.sb){ const w = Math.min(1, Math.max(0, (rc.t-1)/2)), lv2 = rc.L>=2, ch1 = lv2 && res.sb.chain ? res.sb.chain.per : null, ch3 = lv2 && sb3.chain ? sb3.chain.per : null, k = rc.sb==='af' ? (rc.combo||1) : 1;
          const p1 = lv2 ? res.sb.per : sbPer1, p3 = lv2 ? sb3.per : sbPer31;
          sbIdx.forEach(i=>{ const a1 = (p1[i]||0) - (ch1 ? ch1[i]||0 : 0), a3 = (p3[i]||0) - (ch3 ? ch3[i]||0 : 0); per[i] += Math.max(0, a1 + (a3-a1)*w)*k; }); }
        add(res.normal.per, (rc.nd||0)/nT); }
      out.bsim.per = per; }
    out.burstOld = out.burst; out.burst = out.bsim.total;
    out.opener = NB===1 ? out.bsim.total : battleSim(1, simIn).total;
  } else { out.bsim = {total:0, turns:[], N:NB, afStart:st, s0:simIn.s0}; }
  if(needDummy && ctx && ctx.dummyFast){ // 탐색 1단계: 허수아비를 빠르게 어림(버프 다 깔린 AF + AF 끝 콤보 SB), 상위 후보만 2단계에서 정밀 계산
    const totA = Math.max(1, afA.n.reduce((x,y)=>x+y,0)), sb0 = Math.min(50, 12.5*Math.max(light, shadow)), sa = S.sbPerAct!=null ? +S.sbPerAct : 2.5;
    const rateAvg = team.reduce((x,c,i)=>x + afA.n[i]*sa*(sbFillOK(team, i, progs, S) ? 2 : 1), 0)/totA;
    const needA = (100 - sb0)/Math.max(0.1, rateAvg), sbOK = sbIdx.length>0 && needA <= totA + 1e-9;
    const cAt = Math.min(0.75 + gain*Math.min(1, needA/totA), S.comboCap>0?S.comboCap:Infinity);
    // 버프 행동(buff_acts): 버프 스킬을 다 쓰면 AF 행동·시간이 그만큼 빠짐 — 어림에도 반영(정밀 계산은 2단계)
    let afD = afS.v*0.85; // 허수아비는 1턴째 상태
    if(team.some(c=>c.bact && c.bact.steps.length)){
      const plan = team.map(c=> c.bact ? c.bact.steps.map(st=>st.k) : (c.buffAct ? ['buff'] : []));
      const a2 = afActionsOf(team, progs, afCores, nz, enemy, S, 100, dummyPrio(team, progs), plan);
      const nA = a2.n.map((v,i)=>Math.max(0, v - plan[i].length)); afD = sumZ(afCores, nz, avgCombo, nA).v*0.85; }
    out.dummyT = afD + (sbOK ? (simIn.sbBurst - simIn.sbChain)*cAt : 0); out.dummy = {total:out.dummyT, fast:true, per:team.map(()=>0), order:team.map((_,i)=>i), n:afA.n}; return out; }
  if(!needDummy){ out.dummy = {total:0, af:0, sb:0, per:team.map(()=>0), afPer:team.map(()=>0), n:team.map(()=>0), order:team.map((_,i)=>i), fin:0.75, avg:0.75, acts:0, sbAt:null}; out.dummyT = 0; return out; }
  // 허수아비 기록은 후열 연성 P글래 셔틀·풀장비로 잰다(사용자 확인): 보유 표시가 없으면 셔틀 2명을 가정(설정 dummyMule로 끔)
  let Ad = A;
  if(S.dummyMule!==false && !A.mule){ const m2 = muleShare(team, Object.assign({}, S, {pglAssumeAll:true}), ctx, progs); if(m2){ if(m2.plan) m2.wd = muleDmgW(team, progs, A, enemy, S, cx, cap); Ad = Object.assign({}, A, {mule:m2}); } }
  // 허수아비는 AF에서 펼칠 존을 고를 수 있다: 평상 턴 최적 존 + 다른 존 후보(존 없음 포함)를 다 돌려 가장 높은 것
  // af_timing의 zone: 'none' = AF에선 그 사람이 존을 못 폄(AF 밖 스킬·턴 종료로만 전개), 'base' = AF에선 각성(극) 없이 일반 존만
  const zAF = q => { if(!q || !q.by) return q; const m = team.find(c=>c.id===q.by);
    if(m && m.zoneVC && q.how!=='개전 자동' && q.how!=='SB 시') return {kind:'none', types:[], level:0, by:null, label:'존 없음'}; // VC(교대)로만 펴는 존은 1턴 AF에서 못 폄
    const zt = m && m.afT && m.afT.zone; if(!zt) return q;
    if(zt==='none') return {kind:'none', types:[], level:0, by:null, label:'존 없음'};
    if(zt==='base' && q.level>=2) return Object.assign({}, q, {level:1, how:'', label:String(q.label||'').replace(/^(극|절)·/,'')});
    return q; };
  let zc = [zAF(nz)]; for(const q0 of (res.normal.zones||[])){ const q=zAF(q0); if(q && !zc.some(r=>r && r.kind===q.kind && r.key===q.key && r.level===q.level)) zc.push(q); }
  zc = zoneForce(zc, A.azPick); if(!zc.length) zc = [zAF(nz)];
  // 존 후보마다 버프 행동을 다 쓰는 계획으로 먼저 재고, 가장 높은 존에서만 버프 행동 개수를 바꿔 봄(계산량)
  let bestD = null, bestO = null;
  for(const zq of zc.slice(0, 4)){
    const zs2 = sameZ(res.normal.zones, zq), awC = zs2.some(q=>q.how!=='개전 자동' && q.how!=='SB 시'), awS = !awC && zs2.some(q=>q.how==='개전 자동');
    const o = {team, progs, A:Ad, enemy, S, cx, posSets, cap, fw, nz:zq, awStart:awS, awConst:awC, sbz, sbAw, sbIdx, sbCores:res.sb.cores, light, shadow, zcs:(res.normal.zones||[]).map(zAF), quick:true};
    const dd = dummySim(o);
    if(!bestD || dd.total > bestD.total*1.0005){ bestD = dd; bestO = o; }
  }
  if(bestO){ bestO.quick = false; const dd = dummySim(bestO); if(dd.total >= bestD.total) bestD = dd; } // 같은 존이라 기억해 둔 계산을 이어 씀
  out.dummy = bestD;
  out.dummy.mule = Ad.mule || null;
  out.dummy.S0 = A.tm.S0;
  out.dummyT = out.dummy.total;
  return out;
}
/* ---------- 최고점 딜 = 허수아비(대두타) 기준 어포딜 ----------
   허수아비는 1턴만 칠 수 있고 AF 100%로 시작한다(사용자 확인). 그래서 AF 한 번을 행동 단위로 따라간다:
   - AF 첫 바퀴는 왼쪽부터(버퍼·디버퍼·ZONE 담당 먼저), 이후 속도별 쿨타임 순서. 게이지는 초당 10% 감소, 타격으로 충전
   - 버프·디버프는 그 효과가 붙은 스킬을 쓴 뒤부터(buff_acts.json: auto 처음부터, main 주력 공격 뒤, buff/attack 스킬 하나에 행동 1번 — buff는 게이지 0). 캐릭터마다 버프 행동 수를 바꿔 보며 가장 높은 쪽
   - ZONE: 개전 자동이면 처음부터, 아니면 펼치는 캐릭터가 행동한 뒤부터
   - 콤보: 75%에서 시작해 행동마다 그 행동의 타수만큼 오르고, 각 행동은 그 순간의 콤보로 계산
   - 축적은 AF 중 행동 횟수만큼(stackFill)
   - SB(위키 Stellar Awakening): 게이지 시작 = 성향이 같은 전열 1명당 12.5%, 아군 행동마다 2.5%(성도 게이지 충전 보너스 강화가 켜진
     캐릭터는 5%, 다단·복사는 추가 없음). AF 도중 100%가 되는 순간 SB — AF는 멈춰 시간을 안 쓰고, 그 순간 콤보로 계산, SB는 콤보를 안 올림.
     AF가 끝나면 SB를 못 쓴다(사용자 확인). SB로 존이 각성하면 남은 AF 행동은 그 존으로
   요격(맞아야 발동)·체인(AF 밖)·EX 필살기(1턴 안에 EX 게이지가 안 참)는 없음 */
function dummyPrio(team, progs){
  const giver = c => !(c.buffHow==='passive'||c.buffHow==='auto') && ((c.party&&c.party.scope!=='none'&&Object.keys(c.party).some(k=>{ const v=c.party[k]; return k!=='scope'&&k!=='restrict'&&(typeof v==='number'?v>0:v&&typeof v==='object'?Object.values(v).some(x=>x>0):v===true); })) || Object.values(c.deb||{}).some(v=>typeof v==='number'?v>0:v&&typeof v==='object'?Object.values(v).some(x=>x>0):false));
  const w = team.map((c,i)=> (c.buffAct ? 3 : 0) + (giver(c) ? 2 : 0) + (c.zoneTypes ? 1 : 0) - ((c.roles||[]).includes('dps') ? 0.5 : 0));
  return team.map((_,i)=>i).sort((a,b)=>w[b]-w[a] || (team[a].id<team[b].id?-1:team[a].id>team[b].id?1:0)); // 같으면 id 순(편성 순서와 무관)
}
function dummySim(o){
  const {team, progs, A, enemy, S, cx, posSets, cap, fw, nz, awStart, awConst, sbz, sbAw, sbIdx, sbCores} = o, zcs = o.zcs || [];
  const n = team.length, prio = dummyPrio(team, progs);
  const passive = team.map(c=>c.buffHow==='passive'||c.buffHow==='auto');
  // ZONE: 개전 자동·상시 재각성은 처음부터, 그 밖엔 펼치는 사람이 행동한 뒤부터
  const zBy = nz && nz.level>0 ? team.findIndex(c=>c.id===nz.by) : -1;
  const zFrom0 = !!(nz && nz.level>0 && (awStart || nz.how==='개전 자동'));
  // 존은 하나(사용자 확인): 비어 있으면 펴고, 일반 존이 깔려 있으면 극(각성) 존만 덮어씀, 극 존은 존 파괴 없이는 못 바꿈
  const zoneOK = (cur, q) => !!(q && q.level>0) && (!cur || !cur.level || (cur.level<2 && q.level>=2) || (q.brk && !(cur.key===q.key && cur.level>=q.level))); // brk: 존 파괴 후 전개(zone.breaks)
  // 독·페인(글래스터 39·40행·'독 시 ○배' 스킬): 허수아비 1턴에선 실제로 건 뒤부터. inflict.json dummy —
  // start=개전 자동, main=주력 공격 뒤, skill=주력이 아닌 스킬이라 AF 행동 한 번을 그 스킬에 써야 함, 잠재 광석=그 캐릭터가 공격한 뒤
  const nE = Math.max(1, S.enemyCount||1);
  const infT = team.map((c,j)=>{ const f=c.inflict, ore=!!(progs[j] && progs[j].gl && progs[j].gl.ore);
    if(!f && !ore) return null; const k = f && f.st && nE>1 ? 0.6 : 1;
    let w = f ? (f.when||'skill') : null; if(w==='start_sb') w = progs[j] && progs[j].sbOK ? 'start' : 'skill';
    return {w, po: f && f.poison>0 ? k : 0, pa: f && f.pain>0 ? k : 0, ore}; });
  const infAt = (atk, ia) => { let po=0, pa=0;
    infT.forEach((t,j)=>{ if(!t) return; const on = t.w==='start' || (t.w==='main' && atk[j]) || (t.w==='skill' && ia[j]);
      if(on){ po=Math.max(po,t.po); pa=Math.max(pa,t.pa); } if(t.ore && (atk[j]||ia[j])){ po=Math.max(po,0.9); pa=Math.max(pa,0.9); } });
    return {poison:po, pain:pa}; };
  const infK = q => '|i'+Math.round(q.poison*10)+Math.round(q.pain*10)+(q.eg?'|e'+q.eg:'');
  // 속성 변환(elem_change): 건 사람이 행동한 뒤부터. act:2 = 파티 버프와 다른 스킬이라 버프 행동 다음 행동에(네코코(ES) 猫又巫女神楽)
  const egAll = A.echg ? A.echg.map(()=>'1').join('') : '';
  const all = team.map(()=>true);
  const full0 = team.map((c,i)=>attackerCore(team, i, progs, A, enemy, S, 'af', cx, buildBF(team, progs, 'af', nz, A, posSets, team.map(()=>1), true), nz));
  const cmax = S.comboCap>0 ? S.comboCap : Infinity;
  const sbAct = S.sbPerAct!=null ? +S.sbPerAct : 2.5;
  // 성도 게이지 충전 보너스(강화): 성도 각성한 캐릭터는 조건을 채운다고 보고 2배(설정으로 끔)
  const sbRate = team.map((c,i)=> sbAct * (sbFillOK(team, i, progs, S) ? 2 : 1));
  // 버프·디버프 행동(buff_acts.json, 사용자 확인): 버프 스킬 하나에 AF 행동 1번(게이지 0), 여러 개면 차례로 — 쓴 뒤부터 그 효과만 켜짐.
  // auto = 처음부터, main = 주력 공격 뒤, sb = SB 뒤. 속성 변환 스킬(elem_change.skill)은 그 캐릭터 버프 행동 맨 앞으로
  // 존 전개(사용자 확인): 개전 자동이 아니면 존 전개가 붙은 스킬을 써야 깔림 — 그 스킬이 버프 행동이면 그 행동 뒤, 주력이면 첫 공격 뒤
  const zTxt = zBy>=0 ? String((team[zBy].zone||{}).condition||'') : '';
  const sName = x => String(x||'').split(/[（(]/)[0].trim();
  // 존 전개(→ 각성) 행동과 속성 변환 행동은 그 캐릭터 버프 행동 맨 앞으로(같은 이름 두 줄 = 전개·각성 재사용형이라 위치로 옮김)
  const zkOK0 = st => !st.zk || !nz || st.zk===nz.key;
  const awJ = nz && nz.awBy ? team.findIndex(m=>m.id===nz.awBy) : -1;
  const B = team.map((c,j)=>{ let b=c.bact; if(!b) return null; const fr = [];
    if(A.stepV && A.stepV[j]){ const v = new Map(b.steps.map((st,q)=>[st, A.stepV[j][q]])); // 행동 가치 순(존 전개는 앞)
      b = Object.assign({}, b, {steps: b.steps.slice().sort((x,y)=>(y.z?1:0)-(x.z?1:0) || v.get(y)-v.get(x) || (y.sc||0)-(x.sc||0))}); }
    if((j!==zBy || zFrom0) && j!==awJ && b.steps.some(st=>st.z)){ // 이 존 후보를 펴는 사람이 아니거나 존이 처음부터 깔려 있으면 존 전개·각성 행동은 효과 없음: 다른 효과(g)가 있으면 보통 행동으로, 없으면 뺌
      const st2 = b.steps.filter(st=>!st.z || st.g.size).map(st=>st.z ? Object.assign({}, st, {z:null, sc:st.sc2}) : st); // 순서는 그대로(존 전개였던 행동은 아래 가치 순서에서 제자리로)
      if(A.stepV && A.stepV[j]){ const v = new Map(c.bact.steps.map((st,q)=>[st.s+'|'+st.q, A.stepV[j][q]])); st2.sort((x,y)=>(v.get(y.s+'|'+y.q)||0)-(v.get(x.s+'|'+x.q)||0)); }
      else st2.sort((x,y)=>x.q-y.q);
      b = Object.assign({}, b, {steps: st2}); }
    if(j===zBy && !zFrom0){
      const d = b.steps.findIndex(st=>st.z==='deploy' && zkOK0(st));
      if(d>=0){ fr.push(d); if(nz && nz.level>=2 && nz.how!=='타인 각성'){ const a = b.steps.findIndex((st,q)=>q!==d && st.z==='awaken' && zkOK0(st)); if(a>=0) fr.push(a); } }
      else { const k = b.steps.findIndex(st=>sName(st.s) && zTxt.includes(sName(st.s))); if(k>=0) fr.push(k); } }
    if(j===awJ){ const a = b.steps.findIndex(st=>st.z==='awaken' || (nz.awSkill && sName(st.s)===sName(nz.awSkill))); if(a>=0) fr.push(a); }
    const e = A.echg && A.echg.find(x=>x.i===j && x.skill); if(e){ const k = b.steps.findIndex(st=>st.s===e.skill); if(k>=0 && !fr.includes(k)) fr.push(k); }
    if(!fr.length) return b;
    const steps = fr.map(k=>b.steps[k]).concat(b.steps.filter((st,k)=>!fr.includes(k)));
    return Object.assign({}, b, {steps, nFront: fr.length}); });
  // 존 전개·각성 행동(buff_acts z, 2026-10-16): 전개 행동이 있으면 그 행동 뒤(일반 존), 각성 행동이 따로 있으면 그 뒤 극. 같은 행동이 lv 2면 바로 극
  const zkOK = st => !st.zk || !nz || st.zk===nz.key;
  const zDep = zBy>=0 && !zFrom0 && B[zBy] ? B[zBy].steps.findIndex(st=>st.z==='deploy' && zkOK(st)) : -1;
  const zAwk = zBy>=0 && !zFrom0 && B[zBy] && nz && nz.level>=2 && nz.how!=='타인 각성' ? B[zBy].steps.findIndex(st=>st.z==='awaken' && zkOK(st)) : -1;
  const zMainZ = zBy>=0 && B[zBy] && B[zBy].zActs ? B[zBy].zActs : [];
  const zStep = zDep>=0 ? zDep : zBy>=0 && !zFrom0 && B[zBy] ? B[zBy].steps.findIndex(st=>sName(st.s) && zTxt.includes(sName(st.s))) : -1;
  const zMain = zBy>=0 && !zFrom0 && zStep<0 && (zMainZ.some(a=>a.k==='main' && a.z==='deploy') || !!(team[zBy].main && sName(team[zBy].main.skill) && zTxt.includes(sName(team[zBy].main.skill))));
  const zLv2Now = zStep>=0 && B[zBy].steps[zStep].zlv>=2; // 전개 행동 하나로 극
  const zStaged = !!nz && nz.level>=2 && !zFrom0 && !zLv2Now && (zAwk>=0 || nz.how==='타인 각성' || zMainZ.some(a=>a.z==='awaken')); // 일반 → 극 두 단계
  const awI = nz && nz.awBy ? team.findIndex(m=>m.id===nz.awBy) : -1, awStep = awI>=0 && B[awI] ? B[awI].steps.findIndex(st=>st.z==='awaken' || (nz.awSkill && sName(st.s)===sName(nz.awSkill))) : -1;
  const nz1 = zStaged ? Object.assign({}, nz, {level:1, label:String(nz.label||'').replace(/^(극|절)·/,'')}) : nz;
  const maskOf = (j, stepDone, atk, postSB) => { const b=B[j], m=new Set(b.auto); if(atk[j]) for(const x of b.main) m.add(x);
    for(let k=0;k<stepDone[j];k++) for(const x of b.steps[k].g) m.add(x); if(postSB && sbIdx.includes(j)) for(const x of b.sb) m.add(x); return m; };
  const mm = o.memo || (o.memo = {fx:new Map(), co:new Map(), bf:new Map()}), fxMemo = mm.fx, coMemo = mm.co, bfMemo = mm.bf; // 여러 행동 계획(run)·같은 존의 다시 계산이 같이 씀
  const stKey = (acted, stepDone, atk) => team.map((c,j)=> B[j] ? stepDone[j]+(atk[j]?'a':'') : (acted[j]||passive[j]?'1':'0')).join(',');
  const run = (kAct, castN) => { // kAct: 주력이 아닌 독·페인 스킬에 첫 공격 행동을 쓰는 캐릭터(없으면 null), castN: 캐릭터마다 쓰는 버프 행동 수(앞에서부터)
    const plan = team.map((c,j)=> B[j] ? B[j].steps.slice(0, castN[j]).map(st=>st.k) : (c.buffAct ? ['buff'] : []));
    const afA = afActionsOf(team, progs, full0, nz, enemy, S, 100, prio, plan);
    const isStepOf = (i, c2) => c2[i] < plan[i].length;
    // 글래스터 장착은 AF 전체에서 걸려 있는 비율(뒤 행동일수록 콤보가 커서 가중)로 고름
    { const c2=team.map(()=>0), at=team.map(()=>false), ia=team.map(()=>false); let w=0, sp=0, sa=0; const L=afA.seq.length;
      afA.seq.forEach((a,q)=>{ const i=a.i, bo = isStepOf(i, c2), isInf = i===kAct && !ia[i] && !bo;
        if(!bo && !isInf){ const st=infAt(at, ia), wq = 1 + q/Math.max(1,L); w+=wq; sp+=wq*st.poison; sa+=wq*st.pain; }
        c2[i]++; if(isInf) ia[i]=true; else if(!bo) at[i]=true; });
      var Av = Object.assign({}, A, {_ecFix:true, eqOff:null, infPick:{poison: w>0?sp/w:0, pain: w>0?sa/w:0}, postSB:false, afN: afA.n.map((v,j)=>Math.max(1, v - (plan[j]||[]).length))}); } // afN: 공격 행동 수(자원 소비형 상태)
    const pk = '|p'+Math.round(Av.infPick.poison*20)+'_'+Math.round(Av.infPick.pain*20); // 글래 배치가 같으면 행동 계획이 달라도 같은 상태의 계산은 재사용
    const coreAt = (st, z, sit, i, inow) => { // 그 순간 깔린 버프·독페인으로 i의 공격 1회 (필요한 것만 계산). st = {acted, stepDone, atk}
      sit = sit || 'af';
      const key = sit+'|'+stKey(st.acted, st.stepDone, st.atk)+'|'+(z?z.key+':'+z.level:'-')+(Av.postSB?'|P':'')+infK(inow)+pk;
      const ck = key+'|'+i; if(coMemo.has(ck)) return coMemo.get(ck);
      Av.infNow = inow; Av.echg = A.echg ? A.echg.filter((e,k)=>(inow.eg||'')[k]==='1') : null; if(Av.echg && !Av.echg.length) Av.echg = null; // 속성 변환(変幻自在 등)도 건 뒤부터
      let FX = fxMemo.get(key);
      if(FX===undefined){ // 주는 사람마다 따로 기억(그 사람 상태·상황·존이 같으면 재사용)
        const base = '|'+sit+'|'+(z?z.key+':'+z.level:'-')+(Av.postSB?'|P':'')+infK(inow)+pk; let any=false;
        FX = team.map((c,j)=>{ const kj = j+'|'+(B[j] ? st.stepDone[j]+(st.atk[j]?'a':'') : (st.acted[j]||passive[j] ? '1' : '0'))+base;
          let f = bfMemo.get(kj); if(f===undefined){ const u = B[j] ? {m: maskOf(j, st.stepDone, st.atk, Av.postSB)} : (st.acted[j]||passive[j] ? 1 : 0); f = bfOne(team, progs, sit, z, Av, posSets, u, true, j); bfMemo.set(kj, f); }
          if(f) any=true; return f; });
        if(!any) FX = null; fxMemo.set(key, FX); }
      const co = attackerCore(team, i, progs, Av, enemy, S, sit, cx, FX, z); coMemo.set(ck, co); return co;
    };
    const altCoreAt = (st, z, i, inow) => { // 횟수를 다 쓴 뒤의 주력(같은 버프 상태)
      const k0 = 'af|'+stKey(st.acted, st.stepDone, st.atk)+'|'+(z?z.key+':'+z.level:'-')+(Av.postSB?'|P':'')+infK(inow)+pk, key = 'alt|'+k0+'|'+i; if(coMemo.has(key)) return coMemo.get(key);
      coreAt(st, z, 'af', i, inow); const FX = fxMemo.get(k0); Av.infNow = inow; Av.echg = A.echg ? A.echg.filter((e,k)=>(inow.eg||'')[k]==='1') : null; if(Av.echg && !Av.echg.length) Av.echg = null;
      const tAlt = team.map((m,k)=> k===i ? Object.assign({}, m, {main:m.mainAlt, alts:null, _alt:true, _proxy:true}) : m);
      const co = attackerCore(tAlt, i, progs, Av, enemy, S, 'af', cx, FX, z); coMemo.set(key, co); return co; };
    const stepCoreAt = (st, z, i, inow, s0) => { const k0 = 'af|'+stKey(st.acted, st.stepDone, st.atk)+'|'+(z?z.key+':'+z.level:'-')+(Av.postSB?'|P':'')+infK(inow)+pk, key = 'stp|'+k0+'|'+i+'|'+s0.s; if(coMemo.has(key)) return coMemo.get(key);
      coreAt(st, z, 'af', i, inow); const FX = fxMemo.get(k0); const m = team[i].main || {};
      const pw = s0.pw, pk2 = pw && pw.wt ? (pw.wt==='magic' ? 'mag' : 'phys') : (m.kind==='mag'?'mag':'phys');
      const sk = {skill:s0.s, target:m.target==='st'?'st':'aoe', kind:pk2, stat: pk2===(m.kind==='mag'?'mag':'phys') && m.stat ? m.stat : (pk2==='mag'?'int':'pwr'),
        element: pw && pw.el ? pw.el : (m.element||team[i].elem||'none'), weapon_type: pw && pw.wt ? pw.wt : (m.weapon_type||null),
        size: pw ? pw.size : 'xl', mult: pw ? Math.max(0.1, pw.mult) : 1, hits: Math.max(1, pw ? pw.hits : (s0.h||1)), repeat:0, crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x: pw && pw.afx ? pw.afx : 1, condition:''}; // 위력 자료가 없으면 특대 1배
      const t2 = team.map((q,k)=> k===i ? Object.assign({}, q, {main:sk, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}) : q);
      const co = attackerCore(t2, i, progs, Av, enemy, S, 'af', cx, FX, z); coMemo.set(key, co); return co; };
    const onceCoreAt = (st, z, i, inow, e) => { const k0 = 'af|'+stKey(st.acted, st.stepDone, st.atk)+'|'+(z?z.key+':'+z.level:'-')+(Av.postSB?'|P':'')+infK(inow)+pk, key = 'once|'+k0+'|'+i+'|'+e.name; if(coMemo.has(key)) return coMemo.get(key);
      coreAt(st, z, 'af', i, inow); const FX = fxMemo.get(k0); const a = e.atk;
      const sk = {skill:e.name||'1회', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||team[i].elem||'none', weapon_type:a.weapon_type||null, size:a.size||'xl', mult:Math.max(0.1,+a.mult||1), hits:Math.max(1,+a.hits||1), repeat:+a.repeat||0, crit_sure:!!a.crit_sure, def_ignore:!!a.def_ignore, barrier_pierce:!!a.barrier_pierce, af_combo_x:1, condition:''};
      const t2 = team.map((q,k)=> k===i ? Object.assign({}, q, {main:sk, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}) : q);
      const co = attackerCore(t2, i, progs, Av, enemy, S, 'af', cx, FX, z); coMemo.set(key, co); return co; };
    const acted = team.map(()=>false), per = team.map(()=>0), cnt = team.map(()=>0), mu = team.map(()=>0), atk = team.map(()=>false), ia = team.map(()=>false), stepDone = team.map(()=>0); // mu: 주력 사용 횟수(횟수 제한 스킬용)
    const st = {acted, stepDone, atk};
    // 속성 변환은 건 사람이 그 스킬을 쓴 뒤부터(elem_change.skill이 버프 행동에 있으면 그 행동 뒤, 없으면 act 수만큼 행동한 뒤)
    let mainAtk = team.map(()=>0);
    const egOf = () => A.echg ? A.echg.map(e=>{ if(e.to==='self' || passive[e.i]) return '1';
      const b=B[e.i]; if(b && e.skill){ const k=b.steps.findIndex(x=>x.s===e.skill); if(k>=0) return stepDone[e.i] > k ? '1' : '0'; }
      return cnt[e.i] >= ((+e.act||1) > 1 && team[e.i].buffAct ? 2 : 1) ? '1' : '0'; }).join('') : '';
    let combo = 0.75, af = 0, cw = 0, sbG = Math.min(50, 12.5*Math.max(o.light, o.shadow));
    let sbAt = null, sb = 0, zCur = zFrom0 ? nz : null; const sbPer = [], sbCo = {}, used = team.map(()=>[]);
    for(const a of afA.seq){
      const i = a.i, c = team[i];
      const buffOnly = isStepOf(i, cnt), isInf = i===kAct && !ia[i] && !buffOnly;
      const zNow = zCur, inow = Object.assign(infAt(atk, ia), {eg: egOf()});
      if(!buffOnly && !isInf){
        const useAlt = c.mainAlt && mu[i] >= c.main.uses && !c.afSk; if(!useAlt) mu[i]++;
        let co = useAlt ? altCoreAt(st, zNow, i, inow) : coreAt(st, zNow, 'af', i, inow);
        if(!atk[i] && c.once){ const cN = Math.min(combo, cmax); let bd = co ? applyZoneCap(co, zNow, S, cap, cN)*fw(co) : 0; // 전투 중 1회·첫 사용 강공격은 첫 공격 행동에(더 셀 때)
          for(const e of c.once){ if(e.af===false) continue; const c2 = onceCoreAt(st, zNow, i, inow, e); const d2 = c2 ? applyZoneCap(c2, zNow, S, cap, cN)*fw(c2) : 0; if(d2 > bd){ bd = d2; co = c2; } } }
        if(co){ const d = applyZoneCap(co, zNow, S, cap, Math.min(combo, cmax))*fw(co); af += d; per[i] += d; cw += d*Math.min(combo,cmax);
          combo += co.hitsPerAct*(0.025+(co.cup||0))*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); }
      } else if(buffOnly && B[i]){ const s0 = B[i].steps[stepDone[i]]; used[i].push(s0.s);
        if(s0.k==='attack'){ const co = stepCoreAt(st, zNow, i, inow, s0); // 주력 아닌 공격 버프기: buff_acts 위력(pw), 없으면 특대 1배·데이터 타수(주력과 같은 속성·종류)
          if(co){ const d = applyZoneCap(co, zNow, S, cap, Math.min(combo, cmax))*fw(co); af += d; per[i] += d; cw += d*Math.min(combo,cmax); combo += co.hitsPerAct*(0.025+(co.cup||0))*(co.afx||1)*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); } } }
      acted[i] = true; if(buffOnly && B[i]) stepDone[i]++; cnt[i]++; sbG += sbRate[i]; if(isInf) ia[i] = true; else if(!buffOnly){ atk[i] = true; mainAtk[i]++; }
      if(i===zBy && nz && (zStep>=0 ? stepDone[i] > zStep : zMain ? atk[i] : true)){ const zt = zStaged ? nz1 : nz; // 존 전개 스킬을 쓴 뒤
        if(zoneOK(zCur, zt) && !(zCur && zCur.key===zt.key && zCur.level>=zt.level)) zCur = zt; }
      if(zStaged && zCur && zCur.key===nz.key && zCur.level<nz.level){ // 각성: 자기 각성 행동 뒤 / 주력 각성이면 두 번째 공격 뒤 / 남이 각성하면 그 사람의 각성 행동 뒤
        const awDone = nz.how==='타인 각성' ? (awI>=0 && (awStep>=0 ? stepDone[awI] > awStep : acted[awI])) : zAwk>=0 ? stepDone[zBy] > zAwk : mainAtk[zBy] >= (zMain ? 2 : 1);
        if(awDone) zCur = nz; }
      if(!buffOnly && !isInf && c.zoneSet){ const zc = zcs.find(q=>q && q.by===c.id && q.level>0); if(zoneOK(zCur, zc)) zCur = zc; }
      if(sbAt==null && sbIdx.length && sbG >= 100 - 1e-9){ // AF 도중 SB: 지금 콤보, 지금까지 깔린 버프
        sbAt = afA.seq.indexOf(a)+1;
        const sbZOK = !!(sbAw && sbz) && (zoneOK(zCur, sbz) || (zCur && zCur.key===sbz.key)); // 극 존은 다른 존으로 못 바꿈
        const zSB = sbZOK ? sbz : zCur, inow2 = Object.assign(infAt(atk, ia), {eg: egOf()});
        for(const j of sbIdx){ const co = coreAt(st, zSB, 'sb', j, inow2); if(!co) continue; const d = applyZoneCap(co, zSB, S, cap, Math.min(combo, cmax))*fw(co); sb += d; per[j] += d; sbPer.push([j, d]); sbCo[j] = {co, z:zSB, combo:Math.min(combo, cmax)}; }
        if(sbZOK) zCur = sbz; // SB로 각성한 존은 남은 AF 동안
        Av.postSB = true; // SB로 건 버프(연격수+1·심안·크리 대미지 등)는 남은 AF 행동에도
      }
    }
    Av.postSB = false;
    const stAll = {acted: all, stepDone: team.map((c,j)=> B[j] ? castN[j] : 0), atk: all};
    const full = team.map((c,i)=>coreAt(stAll, nz, 'af', i, Object.assign(infAt(all, team.map((_,j)=>j===kAct)), {eg: egAll})));
    const fin = Math.min(combo, cmax);
    return {total: af + sb, af, sb, afPer: per.map((v,i)=>v - sbPer.filter(x=>x[0]===i).reduce((q,x)=>q+x[1],0)), per, n: cnt, avg: af>0 ? cw/af : 0.75, fin,
      sbCombo: null, sbAt, lv: nz && nz.level>=2 && zFrom0 ? 2 : (nz ? nz.level : 0), sbWhen: sbAt!=null ? 'af' : null,
      sbGauge: Math.min(100, sbG), sbNeed: sbIdx.length>0 && sbAt==null, acts: afA.seq.length, order: prio, ex: 0, dur: afA.dur,
      full, zFull: nz, sbCo, inf: {pick: Av.infPick, act: kAct}, buffUsed: used, castN: castN.slice()}; // 계산 근거 화면용: 버프가 다 깔린 AF 중 1회 공격(평상 존), SB 공격
  };
  // 버프 행동 고르기: 전부 쓰는 것에서 시작해 캐릭터마다 앞에서 몇 개만 쓰는 쪽(0개 포함)이 더 높으면 바꿈(한 바퀴)
  // 버프·디버프에 쓸 수 있는 스킬 칸 → 앞에서부터 쓸 수 있는 행동 수(통상 공격 칸 행동 na는 칸을 안 씀)
  const slotF = team.map((c,j)=>{ const L = skillSlots(c, progs[j]); if(!B[j]) return L; let k=0; const nm = new Set(), fr = freeSk(c, progs[j]); for(const st of B[j].steps){ if(!st.na){ const n = skN(st.s) || ('#'+k); if(!nm.has(n) && !fr.has(n)){ if(nm.size>=L) break; nm.add(n); } } k++; } return k; }); // 같은 이름 행동은 칸 하나
  let castN = team.map((c,j)=> B[j] ? Math.min(B[j].steps.length, slotF[j]) : 0);
  let best = run(null, castN);
  if(!o.quick) for(const j of prio){ const L = B[j] ? B[j].steps.length : 0; if(!L) continue;
    const dps = (team[j].roles||[]).includes('dps'); // 딜러: 안 쓰기(셋 이상이면 하나만도), 서포터: 하나만(둘 이상일 때) — 중간 개수는 차이가 작고 계산이 길어짐
    const opts = dps ? (L>=3 ? [0, 1, 2] : [0]) : (L>=3 ? [1, 2] : L>=2 ? [1] : []); // 2개까지(2026-10-16: 뇌 파티처럼 버프 행동이 많은 조합은 2개 쓰는 쪽이 가장 높은 경우가 많음)
    if(B[j] && B[j].nFront && B[j].nFront < L){ if(!opts.includes(B[j].nFront)) opts.push(B[j].nFront); if(B[j].nFront+1 < L && !dps) opts.push(B[j].nFront+1); } // 존 전개·각성(속성 변환) 행동까지만 쓰는 계획
    for(const k of opts){ if(k===castN[j] || k>slotF[j]) continue; const cn = castN.slice(); cn[j] = k; const r = run(null, cn); if(r.total > best.total*1.0005){ best = r; castN = cn; } } }
  // 주력이 아닌 스킬로 독·페인을 거는 캐릭터: 첫 공격 행동을 그 스킬에 쓰는 쪽과 안 쓰는 쪽 중 높은 것
  const base = infAt(all, team.map(()=>false));
  const cands = infT.map((t,j)=>t && t.w==='skill' && ((t.po>0 && base.poison<t.po) || (t.pa>0 && base.pain<t.pa)) ? j : -1).filter(j=>j>=0)
    .sort((x,y)=>(infT[y].po+infT[y].pa)-(infT[x].po+infT[x].pa) || prio.indexOf(x)-prio.indexOf(y)).slice(0,2);
  if(!o.quick) for(const k of cands){ const r = run(k, castN); if(r.total > best.total*1.0005) best = r; }
  return best;
}
/* 계산 근거: 공격 1회의 1타 (존 배율 → 일반·크리·오버크리 → 25억 경감 → AF 콤보 → 99.99억 상한) */
function hitInfo(co, z, S, combo){
  if(!co) return null;
  const zf = zoneFactorEff(z, co.el, co.wt, S, co.rel), c = combo||1, p = co.p, oc = co.oc||0;
  const n = co.pN*zf, cr = n*co.cR, o2 = 2*cr, on = S.capOn!==false;
  const K = v => on ? dingCap(v) : v, H = v => Math.min(HIT_MAX, K(v)*c);
  return {zf, combo:c, p, oc, pre:{n, c:cr, oc:o2}, cap:{n:K(n), c:K(cr), oc:K(o2)}, fin:{n:H(n), c:H(cr), oc:H(o2)},
    avg:(1-p)*H(n) + p*((1-oc)*H(cr) + oc*H(o2)), hits:co.totHits, linkHits:co.linkHits||0, act:applyZoneCap(co, z, S, null, c)};
}
/* 속성·공격 타입 지정: 지정과 맞는 공격만 화력으로 센다 */
function focusMatch(co, f){
  if(!co) return false;
  if(f.kind==='elem') return co.el===f.v;
  if(f.v==='magic') return co.kind==='mag' || co.wt==='magic';
  return co.kind!=='mag' && co.wt===f.v;
}
function focusW(f){ return f ? (co=>focusMatch(co,f)?1:0) : (()=>1); }
function charFocusMatch(c, f){
  if(!f) return true;
  const sks=[c.main,c.sb].filter(Boolean);
  return sks.some(sk=>{
    const kind=sk.kind==='mag'?'mag':'phys';
    let el=sk.element||c.elem; const sw=ELEM_SWITCH[c.id]; if(sw && (el===sw.yes||el===sw.no) && f.kind==='elem' && (f.v===sw.yes||f.v===sw.no)) el=f.v;
    return focusMatch({el, kind, wt: sk.weapon_type||(kind==='mag'?'magic':c.wt)}, f);
  });
}

/* 아군 전체 속성 변환(네코코(ES) 変幻自在: 속성 ZONE의 속성, 에니: 음 등)으로 지정 속성 공격이 되는 조합(2026-10-16, 사용자: 알마(AS)·엑코코·어베레토·은빛 번개술사(AS) 뇌덱).
   cvTo: 이 캐릭터가 아군 전체를 F 속성으로 바꿀 수 있나(존 연동이면 그 속성 ZONE이 조합에 있어야 — teamZ로 확인) */
const teamZoneEl = (team, el) => team.some(c=>c.zoneTypes && c.zoneTypes.opts.some(op=>op.kind==='elem' && op.types.includes(el)));
function cvTo(c, F){ const e = c && c.echange; return !!(F && F.kind==='elem' && e && e.to==='all' && !e.sb && (e.el===F.v || e.el==='zone') && (!e.zone || e.zone===F.v)); }
function focusN(team, F){
  if(F && F.kind==='elem' && team.some(c=>cvTo(c, F) && (!c.echange.req || reqMet(c.echange.req, team, c))) && teamZoneEl(team, F.v)) return team.length;
  return team.filter(c=>charFocusMatch(c,F)).length;
}

/* ---------- 결과 설명: 조건부 버프 적용 상태 + 추천 배치 ---------- */
function explainTeam(team, progs, ev, S, ctx){
  const A = ev.A || teamAgg(team);
  const posSets = ev.posSets || (team.some(c=>c.rules&&c.rules.hasPos) ? computePos(team) : null);
  const sbz = ev.sb.zone, sit = ev.sb.sit || 'sb';
  const FX = buildBF(team, progs, sit, sbz, A, posSets);
  const per = ev.sb.per, tot = per.reduce((a,b)=>a+b,0)||1;
  const dealers = per.map((v,i)=>[v/tot,i]).filter(x=>x[0]>=0.2).map(x=>x[1]);
  const notes = [];
  team.forEach((c,j)=>{
    const R=c.rules; if(!R || !R.list.length) return;
    const p=c.party||{};
    const hasVal = r=>[...r.fs].some(k=>{ const kk=k.split(':')[0]; const v = kk.indexOf('d_')===0 ? (c.deb||{})[kk.slice(2)] : p[kk]; return typeof v==='number'?v>0 : v&&typeof v==='object' ? Object.values(v).some(x=>x>0) : !!v; });
    const dv=new Map(dealers.map(i=>[i,1])); const tgt=new Set();
    R.list.forEach((r,ri)=>{
      if(!hasVal(r) || r.x===0) return;
      const a = ruleAct(r,j,team,progs,sit,sbz,A);
      const ps = posSets&&posSets[j] ? posSets[j][ri] : null;
      if(ps) ps.forEach(i=>{ if(i!==j) tgt.add(i); });
      const rs = dealers.filter(i=>i!==j || r.me);
      for(const i of rs){
        let v;
        if(r.me && i===j) v=r.x;
        else { let t=0; if(a>0){ t = r.pos ? (ps&&ps.has(i)?1:0) : 1; if(t && !r.pos && !toFilterOK(r.to, team[i])) t=0; if(t && r.to.p!=null) t*=r.to.p; } v=r.e+a*t*(r.x-r.e); }
        dv.set(i, Math.min(dv.get(i), v/Math.max(r.x,1e-9)));
      }
    });
    const vals=[...dv.values()];
    const lo=vals.length?Math.min(...vals):1, hi=vals.length?Math.max(...vals):1;
    const txt = (c.raw.party_buff||{}).restrict || (p.scope==='adjacent'?'양옆 아군만':'');
    notes.push({j, name:c.name, text:txt, lvl: lo>=0.95?'ok':hi<0.3?'off':'part', to:[...tgt].map(i=>team[i].name), toIdx:[...tgt]});
  });
  // 추천 배치: 위치 지정 버프가 가장 많이 성립하는 좌→우 순서. 같으면 버퍼·서포터를 왼쪽, 딜 비중 큰 딜러를 오른쪽
  // (AF는 쿨타임이 끝난 캐릭터를 왼쪽부터 자동 선택해서, 왼쪽 버퍼가 먼저 버프·디버프·ZONE을 깔고 오른쪽 딜러가 받는다)
  const dper = (ev.dummy && ev.dummy.per && ev.dummy.per.length===team.length) ? ev.dummy.per : per;
  const dtot = dper.reduce((a,b)=>a+b,0)||1;
  const giveW = team.map((c,i)=>{ const p=c.party||{}, d=c.deb||{}; let g = 1 - (dper[i]||0)/dtot;
    if(c.zoneTypes) g += 0.3; if(Object.values(p).some(v=>typeof v==='number'?v>0:v&&typeof v==='object'?Object.values(v).some(x=>x>0):!!v)) g += 0.2;
    if(Object.values(d).some(v=>typeof v==='number'?v>0:!!v)) g += 0.1; return g; });
  if(ev.dummy && Array.isArray(ev.dummy.order) && ev.dummy.order.length===team.length) ev.dummy.order.forEach((i,r)=>{ giveW[i] = team.length - r; }); // 허수아비 AF 시뮬레이션의 행동 순서와 같게
  const leftScore = pm => pm.reduce((a,m,slot)=>a + giveW[m]*(pm.length-slot), 0);
  const rel=[];
  if(posSets) team.forEach((c,j)=>{ if(!posSets[j]) return; c.rules.list.forEach((r,ri)=>{ const ps=posSets[j][ri]; if(!ps) return; ps.forEach(i=>{ if(i!==j) rel.push({j,i,side:r.side}); }); }); });
  let order=[0,1,2,3].slice(0,team.length), okN=-1;
  if(rel.length){
    const perms=[]; const permute=(a,l)=>{ if(l===a.length){ perms.push(a.slice()); return; } for(let k=l;k<a.length;k++){ [a[l],a[k]]=[a[k],a[l]]; permute(a,l+1); [a[l],a[k]]=[a[k],a[l]]; } };
    permute(team.map((_,i)=>i),0);
    const uniq=new Map(); rel.forEach(x=>uniq.set(x.j+'-'+x.i+'-'+(x.side||''),x));
    const R2=[...uniq.values()];
    let bestL=-1;
    for(const pm of perms){
      const pos=[]; pm.forEach((m,slot)=>pos[m]=slot);
      let ok=0; for(const x of R2){ const d=pos[x.i]-pos[x.j]; if(x.side==='r'?d===1 : x.side==='l'?d===-1 : Math.abs(d)===1) ok++; }
      const L=leftScore(pm);
      if(ok>okN || (ok===okN && L>bestL+1e-9)){ okN=ok; order=pm; bestL=L; }
    }
    return {notes, order, posOk:okN, posTotal:R2.length, rel:R2, giveW};
  }
  order = team.map((_,i)=>i).sort((a,b)=>giveW[b]-giveW[a]);
  return {notes, order, posOk:0, posTotal:0, rel:[], giveW};
}

/* ---------- 1타 상한 (상대값 단위) ---------- */
function computeCap(allPrepped, S){
  return S.capAbs||9999999999; // 대미지가 실제 값(딩 계산식)이라 상한도 실제 값
}

/* ---------- 개인 잠재력 (후보 풀 선별용) ---------- */
function soloPotential(c, prog, enemy, S, cap, ctx){
  const supp = {id:'_s', party:{scope:'all',pwr:70,int:70,all_elem_atk:50,weapon_atk:{all:50}},
    deb:{all_elem_res:50,phys_res:50,mag_res:50}, self:{}, sup:{}, tags:[], elems:[], elem:'none', wt:'none', zoneTypes:null, align:'x'};
  const team=[c,supp];
  const progs=[prog,{f:1,sbOK:false,sbMul:1,t:0,slots:3,gl:{mode:'none'}}];
  const A=teamAgg(team);
  const z = c.zoneTypes ? zoneCandidates([c],[prog],'sb').slice(-1)[0] : null;
  const co1=attackerCore(team,0,progs,A,enemy,S,'sb',ctx), co2=attackerCore(team,0,progs,A,enemy,S,'normal',ctx);
  // 최고점(허수아비 어포딜)은 AF 행동(약 5회·평균 콤보 2배) + AF 끝 SB(콤보 약 3배)
  const dps = ctx && ctx.mode==='burst' ? applyZoneCap(attackerCore(team,0,progs,A,enemy,S,'af',ctx),z,S,cap,2)*5 + applyZoneCap(co1,z,S,cap,3)
    : applyZoneCap(co1,z,S,cap) + applyZoneCap(co2,z,S,cap)*1.5;
  const p=c.party||{}, d=c.deb||{};
  const sup = pct(p.pwr)+pct(p.int)+pct(p.all_elem_atk)+0.5*Math.max(0,...Object.values(p.elem_atk||{0:0}).map(pct))
    + 0.6*Math.max(0,...Object.values(p.weapon_atk||{0:0}).map(pct)) + pct(p.crit_rate)*0.4 + pct(p.crit_dmg)
    + (p.singular_focus||p.mental_focus?1:0)+(p.overthrow?0.6:0)+(p.multihit?0.8:0)+(p.barrier_pierce?0.5:0)+(p.extra_hit?1:0)+(p.over_crit?0.5:0)
    + pct(d.all_elem_res)*1.2 + pct(d.phys_res)+pct(d.mag_res)*0.6 + (c.zoneTypes?(c.zoneAwak?1.2:0.6):0) + (c.breakT?0.5:0) + (c.weakExpose?0.8:0);
  const sv = survival([c],[prog]).score;
  return {dps, sup, surv:sv};
}

/* ---------- 조합 탐색 ---------- */
/* 같은 캐릭터(스타일 NS·AS·ES)가 두 번 들어간 파티인지 */
function dupBase(team){ const s=new Set(); for(const c of team){ const b=c.base||c.id; if(s.has(b)) return true; s.add(b); } return false; }
function* combos(n, k, start=0, pre=[]){
  if(pre.length===k){ yield pre.slice(); return; }
  for(let i=start;i<=n-(k-pre.length);i++){ pre.push(i); yield* combos(n,k,i+1,pre); pre.pop(); }
}

function buildPool(owned, locked, opts){
  // owned: [{pc, prog}], locked: [ids]
  const {enemy,S,cap,ctx,mode} = opts;
  const scored = owned.map(o=>Object.assign({},o,{pot:soloPotential(o.pc,o.prog,enemy,S,cap,ctx)}));
  const lockedSet = new Set(locked);
  const pick = new Map();
  scored.filter(o=>lockedSet.has(o.pc.id)).forEach(o=>pick.set(o.pc.id,o));
  const free = scored.filter(o=>!lockedSet.has(o.pc.id));
  const add = (key,n,src)=>{ (src||free).slice().sort((a,b)=>b.pot[key]-a.pot[key]).slice(0,n).forEach(o=>pick.set(o.pc.id,o)); };
  const F = ctx&&ctx.focus;
  if(F){
    // 지정 속성·타입 공격자 + 그 속성·타입 존 담당 + 버퍼·생존 보강
    const fm = free.filter(o=>charFocusMatch(o.pc,F));
    add('dps', 20, fm);
    const cv = free.filter(o=>cvTo(o.pc, F)); // 아군 전체 속성 변환 담당 — 있으면 다른 속성 딜러·탱커도 지정 속성으로 침
    if(cv.length){ add('sup', 3, cv); add('surv', 3, free.filter(o=>!charFocusMatch(o.pc,F) && o.pc.counter)); }
    const zm = free.filter(o=>o.pc.zoneTypes && o.pc.zoneTypes.opts.some(op=>F.kind==='elem' ? op.kind==='elem'&&op.types.includes(F.v) : op.kind==='weap'&&op.types.includes(F.v)));
    add('sup', 8, zm);
    add('sup', mode==='stability'?12:14); add('surv', mode==='stability'?10:mode==='all'?8:5);
  } else {
    const quota = mode==='stability' ? {dps:12,sup:12,surv:12} : mode==='all' ? {dps:14,sup:13,surv:10} : {dps:15,sup:14,surv:6};
    add('dps',quota.dps); add('sup',quota.sup); add('surv',quota.surv);
  }
  // 존 제공자 중 상위 딜러 속성과 맞는 캐릭터 보강
  const topEl = new Set(free.slice().sort((a,b)=>b.pot.dps-a.pot.dps).slice(0,8).map(o=>o.pc.elem));
  free.filter(o=>o.pc.zoneTypes && o.pc.zoneTypes.opts.some(op=>op.types.some(t=>topEl.has(t)))).sort((a,b)=>b.pot.sup-a.pot.sup).slice(0,4).forEach(o=>pick.set(o.pc.id,o));
  let arr=[...pick.values()];
  const MAXP = opts.maxPool || 44;
  if(arr.length>MAXP){
    const lk = arr.filter(o=>lockedSet.has(o.pc.id));
    const fb = o=> F && (charFocusMatch(o.pc,F) || cvTo(o.pc,F)) ? 1.5 : 1;
    const rest = arr.filter(o=>!lockedSet.has(o.pc.id)).sort((a,b)=>(b.pot.dps*fb(b)/ (opts.maxD||1) + b.pot.sup*0.3)-(a.pot.dps*fb(a)/(opts.maxD||1)+a.pot.sup*0.3));
    arr = lk.concat(rest.slice(0,MAXP-lk.length));
  }
  return arr;
}

function modeWeights(mode, boss, cw, pl){
  if(mode==='custom' && cw){ const b=Math.max(0,+cw.b||0), s=Math.max(0,+cw.s||0), t=Math.max(0,+cw.t||0), z=b+s+t||1; return {b:b/z, s:s/z, t:t/z}; }
  if(pl){ const w=modeWeights(mode, boss); if(pl.nokill) w.t+=0.25; if(pl.turns>0 && pl.turns<=10) w.b+=0.3; else if(pl.turns>0 && pl.turns<=15) w.b+=0.12; return w; }
  if(mode==='burst' || mode==='opener') return {b:1,s:0,t:0};
  if(mode==='sustain') return {b:0,s:1,t:0};
  if(mode==='stability') return {b:0,s:0.4,t:0.6};
  if(mode==='all') return {b:0.4,s:0.3,t:0.3}; // 종합(팔방미인, 기본): 실전 N턴 총딜 + 지속 딜(MP·버프 유지 포함) + 생존
  if(mode==='weak') return {b:0.5,s:0.5,t:0};
  if(mode==='boss'){
    const n = (boss&&boss.needs)||{};
    let w={b:0.4,s:0.35,t:0.25};
    if(n.burst) w.b+=0.15;
    if(n.sustain){ w.s+=0.1; w.t+=0.1; }
    return w;
  }
  return {b:0.5,s:0.5,t:0};
}

function needPenalty(ev, boss){
  if(!boss||!boss.needs) return {f:1, miss:[]};
  const n=boss.needs, d=ev.survDet; let f=1; const miss=[];
  if(n.guard && !(d.guard>=2 || d.taunt>=2 || d.barrier>=3)){ f*=0.88; miss.push('수호·도발 부족'); }
  if(n.cleanse && !(d.cleanse>=1 || d.status_immune>=2 || d.debuff_guard>=1)){ f*=0.9; miss.push('상태이상/디버프 해제 없음'); }
  if(n.status_immune && !(d.status_immune>=1 || d.cleanse>=2)){ f*=0.92; miss.push('상태이상 무효 없음'); }
  if(n.sustain && d.heal<2){ f*=0.9; miss.push('회복량 부족(장기전)'); }
  return {f, miss};
}

/* 메인 진입점. 진행 콜백을 받는 비동기 함수 */
async function optimize(input, onProgress){
  const {owned, locked=[], excluded=[], backLocked=[], mode, enemy, boss, settings, recommendedIds=[]} = input;
  const S = Object.assign({}, DEFAULT_SETTINGS, settings||{});
  const ctx = buildCtx(input, owned);
  ctx.mode = mode;
  if(mode==='opener' || mode==='weak' || mode==='boss' || mode==='kesshitsu' || mode==='custom' || mode==='all') ctx.timeline = true; // 실전(N턴 총딜)의 1턴은 속도·선제 순서
  const BR = ev => mode==='opener' ? ev.opener : mode==='burst' ? ev.dummyT : ev.burst; // 최고점 = 허수아비 어포딜, 실전(약점·보스 등) = N턴 시뮬
  if(mode==='burst') ctx.dummyFast = true; // 1단계 어림 → 상위 후보만 행동 단위 시뮬레이션
  ctx.stFast = true; // 상태 가동률(state.json)은 탐색 중엔 우세한 쪽 하나로 어림 → 마지막에 상위 80개를 ON·OFF 섞어 다시 계산
  const cap = input.cap;
  const ex = new Set(excluded.concat(backLocked));
  const own = owned.filter(o=>!ex.has(o.pc.id));
  if(own.length<4) return {error:'보유 캐릭터가 4명 이상 필요합니다. (제외 목록 포함 확인)'};
  if(ctx.focus && !own.some(o=>charFocusMatch(o.pc,ctx.focus))) return {error:'지정한 속성·타입으로 공격하는 보유 캐릭터가 없습니다.', results:[], evaluated:0, poolSize:0};
  const pl = input.pledge || null; // 결현현 서약
  if(pl && pl.required && !own.some(o=>o.pc.id===pl.required)) return {error:'이 보스의 필수 캐릭터를 보유하지 않았습니다(또는 제외 목록에 있음).', results:[], evaluated:0, poolSize:0};
  const lockIds = (pl && pl.required ? [pl.required] : []).concat(locked.filter(id=>!(pl&&pl.required===id))).filter(id=>own.some(o=>o.pc.id===id)).slice(0,4);
  const nRes = pl && pl.size ? Math.max(0, Math.min(2, pl.size-4)) : 2;
  const compM = pl && pl.comp && pl.comp.n>0 ? (m=>(pl.comp.elem||[]).some(e=>(m.persEl||m.elems).includes(e)) || (pl.comp.weap||[]).includes(m.weapon)) : null;
  const compOK = compM ? (team=>{ const ids=new Set(team.map(m=>m.id)); const f=team.filter(compM).length; if(f>=pl.comp.n) return true; const extra=own.filter(o=>!ids.has(o.pc.id)&&compM(o.pc)).length; return f+Math.min(nRes,extra)>=pl.comp.n; }) : null;
  const pool = buildPool(own, lockIds, {enemy,S,cap,ctx,mode,maxPool:input.maxPool||22}); // 후보 22명(2026-10-16: 44 → 22, 9개 시나리오에서 1위 같고 상위 5개 점수 98~103% — 풀 밖 시너지는 한 명씩 바꾸기가 찾음)
  const lockIdx = lockIds.map(id=>pool.findIndex(o=>o.pc.id===id));
  const free = pool.map((_,i)=>i).filter(i=>!lockIdx.includes(i));
  const need = 4-lockIdx.length;
  // 여러 워커로 나눠 계산(2026-10-16): 조합 값은 조합(+계산 단계 플래그)마다 정해지므로 다른 워커가 낸 값(pre)을 그대로 쓴다.
  // shard {stage:'scan'|'dprec'|'climb'|'prec', k, n}: 앞 단계는 pre로 채우고, 그 단계에선 자기 몫(k번째/n)만 계산해 새 값만 돌려준다.
  // 워커 수와 관계없이 결과가 같다(오르기 탐색은 시작점마다 따로, 이미 계산한 조합도 이동 후보로 봄).
  const shard = input.shard || null, STG = {scan:1, dprec:2, climb:3, prec:4};
  const preI = new Map(), preV = input.pre && input.pre.vals;
  if(input.pre && input.pre.keys){ const K = input.pre.keys; for(let i=0;i<K.length;i++) preI.set(K[i], i); }
  const newK = [], newV = [];
  const flg = () => (ctx.dummyFast?'d':'')+(ctx.stFast?'f':'');
  const evalRaw = (idxs, key) => {
    const ck = key+'|'+flg(), pi = preI.get(ck);
    if(pi!=null) return [preV[3*pi], preV[3*pi+1], preV[3*pi+2]];
    const tm = idxs.map(i=>pool[i]), ev = evalTeam(tm.map(o=>o.pc), tm.map(o=>o.prog), enemy, S, cap, ctx);
    const r = [BR(ev), ev.sustain, ev.surv];
    if(shard){ newK.push(ck); newV.push(r[0], r[1], r[2]); }
    return r;
  };
  const mine = (stage, c) => !shard || STG[shard.stage]!==stage || c % shard.n === shard.k;
  const shardOut = () => ({shard:true, stage:shard.stage, keys:newK, vals:Float64Array.from(newV), evaluated:newK.length, poolSize:pool.length});
  const teams=[], raws=[], tfl=[], tkey=[];
  const addT = (idxs, key, r) => { teams.push(idxs); raws.push(r[0], r[1], r[2]); tfl.push(flg()); tkey.push(key); seen.set(key, teams.length-1); return teams.length-1; };
  let total = 1; for(let i=0;i<need;i++) total = total*(free.length-i)/(i+1);
  total = Math.round(total)||1;
  let done=0, lastYield=Date.now();
  const recSet = new Set(recommendedIds);
  const it = need>0 ? combos(free.length, need) : [[]][Symbol.iterator]();
  const seen = new Map(); // 조합 키 → teams 인덱스 (다른 워커 몫이면 -1)
  let ci = 0;
  for(const cmb of it){
    const idxs = lockIdx.concat(cmb.map(k=>free[k]));
    const team = idxs.map(i=>pool[i].pc);
    if(dupBase(team)){ done++; continue; }
    const key = team.map(c=>c.id).sort().join();
    if(!mine(1, ci++)){ seen.set(key, -1); done++; continue; }
    addT(idxs, key, evalRaw(idxs, key));
    done++;
    if(Date.now()-lastYield>40){ lastYield=Date.now(); if(onProgress) onProgress(Math.min(0.85, done/total*0.85)); await new Promise(r=>setTimeout(r,0)); }
  }
  // 속성덱·타입덱 후보: 속성·타입마다 작은 후보 풀로 조합을 더 만들어 같은 기준(지정 없음)으로 평가
  // (조합 시너지로 강해지는 캐릭터가 전체 후보 풀에서 빠지는 것을 막는다)
  const posOf = new Map(pool.map((o,i)=>[o.pc.id,i]));
  const deckIdx = []; // 속성덱·타입덱 후보 (전방 3명 이상이 그 속성·타입으로 공격)
  if(!ctx.focus && input.deckSeeds!==false){
    const FOC = ELEMS.map(v=>({kind:'elem',v})).concat(['slash','blunt','pierce','magic'].map(v=>({kind:'wt',v})));
    let di = 0;
    for(let fi=0; fi<FOC.length; fi++){
      const F=FOC[fi];
      if(!own.some(o=>charFocusMatch(o.pc,F))) continue;
      const fp = buildPool(own, lockIds, {enemy,S,cap,ctx:Object.assign({},ctx,{focus:F}),mode,maxPool:input.deckPool||10});
      for(const o of fp) if(!posOf.has(o.pc.id)){ posOf.set(o.pc.id,pool.length); pool.push(o); }
      const lk = lockIds.map(id=>fp.findIndex(o=>o.pc.id===id)).filter(i=>i>=0);
      const fr = fp.map((_,i)=>i).filter(i=>!lk.includes(i));
      const nd = 4-lk.length;
      const it2 = nd>0 ? combos(fr.length, nd) : [[]][Symbol.iterator]();
      for(const cmb of it2){
        const mem = lk.concat(cmb.map(k=>fr[k])).map(i=>fp[i]);
        const nMatch = focusN(mem.map(o=>o.pc), F); if(!nMatch) continue; // 변환으로 지정 속성이 되는 조합도 덱으로
        const key = mem.map(o=>o.pc.id).sort().join();
        if(seen.has(key)){ if(nMatch>=3){ const ti=seen.get(key); if(ti>=0) (deckIdx[fi]=deckIdx[fi]||[]).push(ti); } continue; }
        const team=mem.map(o=>o.pc);
        if(dupBase(team)){ seen.set(key, -1); continue; }
        if(!mine(1, ci++)){ seen.set(key, -1); continue; }
        const idxs = mem.map(o=>posOf.get(o.pc.id)), ti = addT(idxs, key, evalRaw(idxs, key));
        if(nMatch>=3) (deckIdx[fi]=deckIdx[fi]||[]).push(ti);
        if(Date.now()-lastYield>40){ lastYield=Date.now(); if(onProgress) onProgress(0.85+0.15*fi/FOC.length); await new Promise(r=>setTimeout(r,0)); }
      }
    }
  }
  // 커뮤니티 보편 추천 덱(meta_decks.json → input.seeds, 2026-10-16): 4명을 다 가졌으면 그 조합도 평가 — 후보 풀(혼자 화력 순)에 안 드는 서포터·탱커로 짜인 덱
  // (예: 알마(AS)·네코코(ES)·벨벳(AS)·은빛 번개술사(AS) 요격 뇌덱)이 빠지지 않게. 점수 보정은 없음(같은 기준으로 계산만)
  if(Array.isArray(input.seeds) && input.seeds.length){
    const FOS = ELEMS.map(v=>({kind:'elem',v})).concat(['slash','blunt','pierce','magic'].map(v=>({kind:'wt',v})));
    for(const ids of input.seeds){
      if(!Array.isArray(ids) || ids.length!==4) continue;
      const os = ids.map(id=>own.find(o=>o.pc.id===id)); if(os.some(o=>!o) || lockIds.some(id=>!ids.includes(id))) continue;
      const team = os.map(o=>o.pc); if(dupBase(team) || (ctx.focus && focusN(team, ctx.focus)<3)) continue; // 속성·타입 지정이면 그 덱만
      const key = team.map(c=>c.id).sort().join();
      for(const o of os) if(!posOf.has(o.pc.id)){ posOf.set(o.pc.id,pool.length); pool.push(o); }
      let ti = seen.get(key);
      if(ti==null){ if(!mine(1, ci++)){ seen.set(key, -1); continue; } ti = addT(os.map(o=>posOf.get(o.pc.id)), key, evalRaw(os.map(o=>posOf.get(o.pc.id)), key)); }
      if(ti>=0 && !ctx.focus && input.deckSeeds!==false) FOS.forEach((F,fi)=>{ if(own.some(o=>charFocusMatch(o.pc,F)) && focusN(team, F)>=3 && !(deckIdx[fi]||[]).includes(ti)) (deckIdx[fi]=deckIdx[fi]||[]).push(ti); });
    }
  }
  if(shard && shard.stage==='scan') return shardOut();
  if(ctx.dummyFast){ // 2단계: 어림 상위 250개만 허수아비 1턴 AF를 행동 단위로 다시 계산
    ctx.dummyFast = false;
    const top = teams.map((_,i)=>i).sort((a,b)=>raws[3*b]-raws[3*a]);
    for(let r=0; r<top.length; r++){
      const i = top[r];
      if(r<250){ if(mine(2, r)){ raws[3*i]=evalRaw(teams[i], tkey[i])[0]; tfl[i]=flg(); } }
      else raws[3*i] *= 0.5; // 정밀 계산 안 한 조합은 뒤로
      if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r2=>setTimeout(r2,0)); }
    }
    if(shard && shard.stage==='dprec') return shardOut();
  }
  let mb=1e-9, ms=1e-9, mt=1e-9;
  for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[3*i]); ms=Math.max(ms,raws[3*i+1]); mt=Math.max(mt,raws[3*i+2]); }
  const w = modeWeights(mode, boss, input.weights, pl);
  // 상위 조합에서 한 명씩 바꿔 보기 (후보 풀 밖의 시너지 캐릭터 찾기)
  if(input.refine!==false && teams.length){
    const scoreOf = (b,s,tt)=>{ let sc = w.b*b/mb + w.s*s/ms + w.t*tt/mt; if((mode==='sustain'||mode==='weak'||mode==='all') && tt/mt<0.25) sc*=0.85; return sc; };
    const scI = i=>scoreOf(raws[3*i],raws[3*i+1],raws[3*i+2]);
    const order = teams.map((_,i)=>i).sort((a,b)=>scI(b)-scI(a));
    const starts=[]; for(const i of order){ if(starts.length>=8) break; const ids=new Set(teams[i]); if(starts.some(s=>s.filter(x=>ids.has(x)).length>=3)) continue; starts.push(teams[i].slice()); }
    const cand = own.map(o=>Object.assign({},o,{pot:soloPotential(o.pc,o.prog,enemy,S,cap,ctx)})).sort((a,b)=>(b.pot.dps+b.pot.sup*0.5)-(a.pot.dps+a.pot.sup*0.5)).slice(0,90);
    for(const o of cand) if(!posOf.has(o.pc.id)){ posOf.set(o.pc.id,pool.length); pool.push(o); }
    const lockSet=new Set(lockIds);
    // 조합 nt의 teams 인덱스 (없으면 계산해 추가). 다른 단계 값(어림·×0.5)으로만 있으면 그 값 그대로(예전처럼 이동 후보로 거의 안 뽑힘)
    const valT = nt => { const key=nt.map(i=>pool[i].pc.id).sort().join(), ti=seen.get(key); if(ti!=null && ti>=0) return ti; return addT(nt, key, evalRaw(nt, key)); };
    for(let si=0; si<starts.length; si++){
      if(!mine(3, si)) continue;
      let cur=starts[si], curSc=scI(valT(cur));
      for(let pass=0;pass<4;pass++){ // 한 명씩 바꾸기를 더 나아지지 않을 때까지(최대 4번)
        let best=null;
        for(let k=0;k<4;k++){
          if(lockSet.has(pool[cur[k]].pc.id)) continue;
          for(const o of cand){
            const pi=posOf.get(o.pc.id); if(cur.includes(pi)) continue;
            const nt=cur.slice(); nt[k]=pi;
            if(dupBase(nt.map(i=>pool[i].pc))) continue;
            const sc=scI(valT(nt)); if(sc>curSc+1e-9 && (!best||sc>best.sc)) best={nt,sc};
            if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r=>setTimeout(r,0)); }
          }
        }
        if(!best) break; cur=best.nt; curSc=best.sc;
      }
    }
    if(shard && shard.stage==='climb') return shardOut();
    // 마무리: 지금까지의 상위 5개 조합에서 다시 한 명씩 바꿔 보기 (상위가 더 나아지지 않을 때까지, 최대 3번)
    const tried = new Set();
    for(let round=0; round<3; round++){
      const top5 = teams.map((_,i)=>i).sort((a,b)=>scI(b)-scI(a)).slice(0,5);
      let improved=false;
      for(const ti of top5){
        if(tried.has(tkey[ti])) continue; tried.add(tkey[ti]);
        const cur=teams[ti], curSc=scI(ti);
        for(let k=0;k<4;k++){
          if(lockSet.has(pool[cur[k]].pc.id)) continue;
          for(const o of cand){
            const pi=posOf.get(o.pc.id); if(cur.includes(pi)) continue;
            const nt=cur.slice(); nt[k]=pi;
            if(dupBase(nt.map(i=>pool[i].pc))) continue;
            if(scI(valT(nt))>curSc+1e-9) improved=true;
            if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r=>setTimeout(r,0)); }
          }
        }
      }
      if(!improved) break;
    }
    for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[3*i]); ms=Math.max(ms,raws[3*i+1]); mt=Math.max(mt,raws[3*i+2]); }
  }
  if(onProgress) onProgress(1);
  if(ctx.stFast){ ctx.stFast = false; const w0 = modeWeights(mode, boss, input.weights, pl);
    const sc0 = i => { let v = w0.b*raws[3*i]/mb + w0.s*raws[3*i+1]/ms + w0.t*raws[3*i+2]/mt; if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all') && raws[3*i+2]/mt<0.25) v*=0.85; return v; };
    const top = teams.map((_,i)=>i).sort((a,b)=>sc0(b)-sc0(a)).slice(0, 80);
    for(let r=0; r<top.length; r++){ if(!mine(4, r)) continue; const i=top[r], v=evalRaw(teams[i], tkey[i]); raws[3*i]=v[0]; raws[3*i+1]=v[1]; raws[3*i+2]=v[2]; tfl[i]=flg();
      if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r2=>setTimeout(r2,0)); } }
    if(shard && shard.stage==='prec') return shardOut();
    mb=1e-9; ms=1e-9; mt=1e-9; for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[3*i]); ms=Math.max(ms,raws[3*i+1]); mt=Math.max(mt,raws[3*i+2]); } }
  const scored = [];
  const maxLv = input.maxDiff||4;
  for(let i=0;i<teams.length;i++){
    if(maxLv<4){ const d=teamDifficulty(teams[i].map(k=>pool[k].pc)); if(d.lv>maxLv) continue; }
    if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue;
    const b=raws[3*i]/mb, s=raws[3*i+1]/ms, t=raws[3*i+2]/mt;
    let sc = w.b*b + w.s*s + w.t*t;
    if(mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all') sc *= (t<0.25?0.85:1);
    scored.push([sc,i]);
  }
  scored.sort((a,b)=>b[0]-a[0]);
  const chosen=[];
  const minDiff = S.diverse ? 2 : 1;
  const nTop = input.topN || 5;
  for(const [sc,i] of scored){
    if(chosen.length>=nTop) break;
    const ids = teams[i];
    if(chosen.some(c=>{ const set=new Set(c.ids); return 4-ids.filter(x=>set.has(x)).length < minDiff; })) continue;
    // 보스 패널티/추천 보너스는 최종 후보 재평가에 반영
    chosen.push({ids, sc, i});
    if(chosen.length>=nTop && mode!=='boss') break;
  }
  // 보스 모드: 상위 60개 재정렬
  let finalList = chosen;
  if(mode==='boss'){
    const cand=[];
    for(const [sc,i] of scored.slice(0,400)){
      const team=teams[i].map(k=>pool[k].pc), progs=teams[i].map(k=>pool[k].prog);
      const ev=evalTeam(team,progs,enemy,S,cap,ctx);
      const np=needPenalty(ev,boss);
      const rec = team.filter(c=>recSet.has(c.id)).length;
      cand.push({ids:teams[i], sc: sc*np.f*(1+0.06*rec), i});
    }
    cand.sort((a,b)=>b.sc-a.sc);
    finalList=[];
    for(const c of cand){
      if(finalList.length>=nTop) break;
      if(finalList.some(f=>{const set=new Set(f.ids); return 4-c.ids.filter(x=>set.has(x)).length<minDiff;})) continue;
      finalList.push(c);
    }
  }
  const topScore = finalList.length? finalList[0].sc : 1;
  function pickReserves(team, progs, ev){
    const inTeam=new Set(team.map(t=>t.id)), baseIn=new Set(team.map(t=>t.base||t.id));
    const fixedBack = nRes>0 ? backLocked.map(id=>owned.find(o=>o.pc.id===id)).filter(Boolean).slice(0,nRes).map(o=>o.pc) : [];
    fixedBack.forEach(c=>baseIn.add(c.base||c.id));
    const mw = ev.mule && ev.mule.auto ? ev.mule.wp : null; // 셔틀 가정이면 그 무기 퍼스널리티 캐릭터를 후열 우선
    const needComp = compM ? Math.max(0, pl.comp.n - team.filter(compM).length) : 0;
    const reserves = fixedBack.concat(own.filter(o=>!inTeam.has(o.pc.id) && !baseIn.has(o.pc.base||o.pc.id)).map(o=>({o, v:survival(team.concat([o.pc]),progs.concat([o.prog]),ev.A&&ev.A.bud).score - ev.surv + (+o.pc.sup.revive||0) + (mw && o.pc.pers.has(mw) ? 8 + ((o.prog&&o.prog.slots)||3) : 0) + (needComp && compM(o.pc) ? 100 : 0)}))
      .sort((a,b)=>b.v-a.v).filter(x=>{ const b=x.o.pc.base||x.o.pc.id; if(baseIn.has(b)) return false; baseIn.add(b); return true; }).slice(0,Math.max(0,nRes-fixedBack.length)).map(x=>x.o.pc));
    return {reserves, fixedBack};
  }
  const results = finalList.map((c,rank)=>{
    const team=c.ids.map(k=>pool[k].pc), progs=c.ids.map(k=>pool[k].prog);
    const ev=evalTeam(team,progs,enemy,S,cap,ctx);
    const np=needPenalty(ev,boss);
    // 후방 2명: 남은 보유 캐릭터 중 생존 기여 상위
    const {reserves, fixedBack} = pickReserves(team, progs, ev);
    return {rank:rank+1, team, progs, ev, reserves, score:c.sc, rel:c.sc/topScore,
      norm:{b:BR(ev)/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:np.miss,
      recCount: team.filter(t=>recSet.has(t.id)).length, diff: teamDifficulty(team), fixedBack: new Set(fixedBack.map(c=>c.id))};
  });
  // 속성덱·타입덱: 각 속성·타입에서 점수가 가장 높은 조합
  const FOCL = ELEMS.map(v=>({kind:'elem',v})).concat(['slash','blunt','pierce','magic'].map(v=>({kind:'wt',v})));
  const decks = [];
  deckIdx.forEach((L,fi)=>{ if(!L||!L.length) return; let bi=-1, bs=-1;
    for(const i of L){ if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue; const b=raws[3*i]/mb, s=raws[3*i+1]/ms, tt=raws[3*i+2]/mt; let sc=w.b*b+w.s*s+w.t*tt; if((mode==='sustain'||mode==='weak'||mode==='all') && tt<0.25) sc*=0.85; if(maxLv<4 && teamDifficulty(teams[i].map(k=>pool[k].pc)).lv>maxLv) continue; if(sc>bs){ bs=sc; bi=i; } }
    if(bi>=0){ const team=teams[bi].map(k=>pool[k].pc), progs=teams[bi].map(k=>pool[k].prog); const ev=evalTeam(team,progs,enemy,S,cap,ctx); const rv=pickReserves(team,progs,ev);
      decks.push({focus:FOCL[fi], team, progs, ev, reserves:rv.reserves, fixedBack:new Set(rv.fixedBack.map(c=>c.id)), score:bs, rel:bs/topScore, norm:{b:BR(ev)/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:needPenalty(ev,boss).miss, recCount:team.filter(t=>recSet.has(t.id)).length, diff:teamDifficulty(team)}); } });
  decks.sort((a,b)=>b.score-a.score);
  return {results, decks, evaluated:teams.length, poolSize:pool.length, pool:pool.map(o=>o.pc.id), weights:w, focus:ctx.focus, nmax:{b:mb, s:ms, t:mt}};
}

/* ---------- 캐릭터별 최적 조합 ---------- */
async function perCharBest(input, onProgress){
  const {owned, excluded=[], backLocked=[], mode, enemy, boss, settings, recommendedIds=[]} = input;
  const S = Object.assign({}, DEFAULT_SETTINGS, settings||{});
  const ctx = buildCtx(input, owned);
  ctx.mode = mode;
  if(mode==='opener' || mode==='weak' || mode==='boss' || mode==='kesshitsu' || mode==='custom' || mode==='all') ctx.timeline = true; // 실전(N턴 총딜)의 1턴은 속도·선제 순서
  const cap = input.cap, maxLv = input.maxDiff||4;
  if(mode==='burst') ctx.dummyFast = true; // 1단계 어림 → 캐릭터마다 상위 후보만 행동 단위 시뮬레이션
  ctx.stFast = true; // 상태 가동률은 탐색 중 어림, 캐릭터마다 상위 후보만 다시 계산
  const ex = new Set(excluded.concat(backLocked));
  const own = owned.filter(o=>!ex.has(o.pc.id));
  if(own.length<4) return {error:'보유 캐릭터가 4명 이상 필요합니다.'};
  let pool = buildPool(own, [], {enemy,S,cap,ctx,mode});
  const maxD = Math.max(1e-9, ...pool.map(o=>o.pot.dps));
  pool = pool.sort((a,b)=>(b.pot.dps/maxD + b.pot.sup*0.3 + (mode==='stability'?b.pot.surv*0.02:mode==='all'?b.pot.surv*0.01:0))-(a.pot.dps/maxD + a.pot.sup*0.3 + (mode==='stability'?a.pot.surv*0.02:mode==='all'?a.pot.surv*0.01:0))).slice(0, input.pcPool||36);
  const w = modeWeights(mode, boss, input.weights), recSet = new Set(recommendedIds);
  const idxOf = new Map(own.map((o,i)=>[o.pc.id,i]));
  const T=[], R=[]; // T: 멤버 인덱스(own 기준) 4개씩, R: burst,sustain,surv,penalty,diffLv
  // 여러 워커로 나눠 계산(2026-10-16, optimize와 같은 방식): shard {stage:'scan'|'dprec'|'prec', k, n}, pre = 앞 단계 값(조합키|플래그 → 4개)
  const shard = input.shard || null, STG = {scan:1, dprec:2, prec:3};
  const preI = new Map(), preV = input.pre && input.pre.vals;
  if(input.pre && input.pre.keys){ const K = input.pre.keys; for(let i=0;i<K.length;i++) preI.set(K[i], i); }
  const newK = [], newV = [];
  const flg = () => (ctx.dummyFast?'d':'')+(ctx.stFast?'f':'');
  const BRv = ev => mode==='opener'?ev.opener:mode==='burst'?ev.dummyT:ev.burst;
  const evalRaw = mem => {
    const key = mem.map(o=>o.pc.id).sort().join()+'|'+flg(), pi = preI.get(key);
    if(pi!=null) return [preV[4*pi], preV[4*pi+1], preV[4*pi+2], preV[4*pi+3]];
    const team = mem.map(o=>o.pc), ev = evalTeam(team, mem.map(o=>o.prog), enemy, S, cap, ctx);
    const pen = mode==='boss' ? needPenalty(ev,boss).f * (1+0.06*team.filter(c=>recSet.has(c.id)).length) : 1;
    const r = [BRv(ev), ev.sustain, ev.surv, pen];
    if(shard){ newK.push(key); newV.push(r[0], r[1], r[2], r[3]); }
    return r;
  };
  const mine = (stage, c) => !shard || STG[shard.stage]!==stage || c % shard.n === shard.k;
  const shardOut = () => ({shard:true, stage:shard.stage, keys:newK, vals:Float64Array.from(newV), evaluated:newK.length});
  let ci = 0;
  const record = (mem)=>{
    const team=mem.map(o=>o.pc);
    if(dupBase(team)) return;
    if(!mine(1, ci++)) return;
    const r = evalRaw(mem);
    T.push(...mem.map(o=>idxOf.get(o.pc.id)));
    R.push(r[0], r[1], r[2], r[3], teamDifficulty(team).lv);
  };
  const n=pool.length; let total = n*(n-1)*(n-2)*(n-3)/24;
  const outsiders = own.filter(o=>!pool.some(p=>p.pc.id===o.pc.id));
  const partners = pool.slice(0,14);
  // 풀 밖 캐릭터는 상위 10명 + 그 캐릭터 속성·무기에 맞는 존·버프 담당 6명과 짝지음(예: 음속성 딜러는 각음진·음속성 버퍼가 있어야 제 값)
  const potOf = new Map(pool.map(p=>[p.pc.id, p.pot]));
  const potGet = q => { if(!potOf.has(q.pc.id)) potOf.set(q.pc.id, soloPotential(q.pc, q.prog, enemy, S, cap, ctx)); return potOf.get(q.pc.id); };
  const top10 = new Set(partners.slice(0,10).map(p=>p.pc.id));
  const synOf = o => { const el = o.pc.elem, wt = o.pc.wt, wp = o.pc.weapon;
    return own.filter(q=>q.pc.id!==o.pc.id && !top10.has(q.pc.id) && (q.pc.base||q.pc.id)!==(o.pc.base||o.pc.id)).filter(q=>{ const c=q.pc, p=c.party||{};
      const z = c.zoneTypes && c.zoneTypes.opts.some(op=> op.kind==='elem' ? op.types.includes(el) : (op.types.includes(wt) || op.types.includes('all')));
      const b = (p.elem_atk && +p.elem_atk[el]>0) || (p.weapon_atk && (+p.weapon_atk[wp]>0 || +p.weapon_atk[wt]>0));
      return z || b; }).sort((x,y)=>potGet(y).sup-potGet(x).sup).slice(0,6); };
  const psOf = new Map(outsiders.map(o=>[o.pc.id, partners.slice(0,10).concat(synOf(o)).filter(p=>p.pc.id!==o.pc.id)]));
  for(const o of outsiders){ const m=psOf.get(o.pc.id).length; total += m*(m-1)*(m-2)/6; }
  let done=0, last=Date.now();
  const tick = async()=>{ done++; if(Date.now()-last>40){ last=Date.now(); if(onProgress) onProgress(done/total); await new Promise(r=>setTimeout(r,0)); } };
  for(const cmb of combos(n,4)){ record(cmb.map(k=>pool[k])); await tick(); }
  for(const o of outsiders){
    const ps = psOf.get(o.pc.id);
    for(const cmb of combos(ps.length,3)){ record([o].concat(cmb.map(k=>ps[k]))); await tick(); }
  }
  if(shard && shard.stage==='scan') return shardOut();
  const N = R.length/5;
  if(ctx.dummyFast){ // 2단계: 캐릭터마다 어림 상위 6개 조합만 허수아비 1턴 AF를 다시 계산
    ctx.dummyFast = false;
    const K=10, cand=own.map(()=>[]);
    for(let i=0;i<N;i++){ if(R[5*i+4]>maxLv) continue; const v=R[5*i];
      for(let j=0;j<4;j++){ const L=cand[T[4*i+j]]; if(L.length<K || v>L[L.length-1][0]){ if(L.length>=K) L.pop(); L.push([v,i]); L.sort((a,b)=>b[0]-a[0]); } } }
    const redo=new Set(); cand.forEach(L=>L.forEach(x=>redo.add(x[1])));
    let c2 = 0;
    for(const i of redo){ if(!mine(2, c2++)) continue; const mem=[0,1,2,3].map(j=>own[T[4*i+j]]); R[5*i]=evalRaw(mem)[0]; await tick(); }
    if(shard && shard.stage==='dprec') return shardOut();
    for(let i=0;i<N;i++) if(!redo.has(i)) R[5*i]*=0.5;
  }
  let mb=1e-9, ms=1e-9, mt=1e-9;
  for(let i=0;i<N;i++){ mb=Math.max(mb,R[5*i]); ms=Math.max(ms,R[5*i+1]); mt=Math.max(mt,R[5*i+2]); }
  if(ctx.stFast){ ctx.stFast = false; // 캐릭터마다 어림 상위 4개 조합을 상태 ON·OFF 섞어 다시 계산
    const scI = i => { const t=R[5*i+2]/mt; let v = (w.b*R[5*i]/mb + w.s*R[5*i+1]/ms + w.t*t)*R[5*i+3]; if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all') && t<0.25) v*=0.85; return v; };
    const K=4, cand=own.map(()=>[]);
    for(let i=0;i<N;i++){ if(R[5*i+4]>maxLv) continue; const v=scI(i);
      for(let j=0;j<4;j++){ const L=cand[T[4*i+j]]; if(L.length<K || v>L[L.length-1][0]){ if(L.length>=K) L.pop(); L.push([v,i]); L.sort((a,b)=>b[0]-a[0]); } } }
    const redo=new Set(); cand.forEach(L=>L.forEach(x=>redo.add(x[1])));
    let c3 = 0;
    for(const i of redo){ if(!mine(3, c3++)) continue; const mem=[0,1,2,3].map(j=>own[T[4*i+j]]); const r=evalRaw(mem);
      R[5*i] = r[0]; R[5*i+1]=r[1]; R[5*i+2]=r[2]; await tick(); }
    if(shard && shard.stage==='prec') return shardOut();
    mb=1e-9; ms=1e-9; mt=1e-9; for(let i=0;i<N;i++){ mb=Math.max(mb,R[5*i]); ms=Math.max(ms,R[5*i+1]); mt=Math.max(mt,R[5*i+2]); } }
  const bestSc = new Float64Array(own.length).fill(-1), bestI = new Int32Array(own.length).fill(-1);
  for(let i=0;i<N;i++){
    if(R[5*i+4]>maxLv) continue;
    const b=R[5*i]/mb, sv=R[5*i+1]/ms, t=R[5*i+2]/mt;
    let sc = w.b*b + w.s*sv + w.t*t;
    if(mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all') sc *= (t<0.25?0.85:1);
    sc *= R[5*i+3];
    for(let j=0;j<4;j++){ const k=T[4*i+j]; if(sc>bestSc[k]){ bestSc[k]=sc; bestI[k]=i; } }
  }
  let top=1e-9; for(const v of bestSc) top=Math.max(top,v);
  const evM = new Map(); // 같은 조합은 한 번만(워커에선 ev를 버리므로 input.noEv면 계산 안 함)
  const list = own.map((o,k)=>{
    if(bestI[k]<0) return {pc:o.pc, none:true};
    const i=bestI[k]; const mem=[0,1,2,3].map(j=>own[T[4*i+j]]);
    const team=mem.map(m=>m.pc), progs=mem.map(m=>m.prog), tk=team.map(c=>c.id).sort().join();
    if(!input.noEv && !evM.has(tk)) evM.set(tk, evalTeam(team,progs,enemy,S,cap,ctx));
    return {pc:o.pc, score:bestSc[k], rel:bestSc[k]/top, team, progs, ev:evM.get(tk)||null, diff:teamDifficulty(team), norm:{b:R[5*i]/mb, s:R[5*i+1]/ms, t:R[5*i+2]/mt}};
  }).sort((a,b)=>(b.score||0)-(a.score||0));
  return {list, evaluated:N, poolSize:pool.length, nmax:{b:mb, s:ms, t:mt}};
}

const API = {hitInfo, dingHit, dingCap, G5_OF, GEAR_STD, GEAR_FX, ELEMS,WTYPES,WEAPON_TYPE,ELEM_KR,WT_KR,WEAPON_KR,ZONE_KR,DEFAULT_SETTINGS,SPECIAL_GRASTA,MANIFEST,
  SURV_CATS, SURV_W, prepChar, charProg, grastaFactor, parseZoneCond, reqText, teamDifficulty, DIFF_LV, evalTeam, computeCap, optimize, perCharBest, survival, zoneCandidates, multihitAvg, dimin,
  explainTeam, charFocusMatch, compileRules, simTeam, PERS_KR, buildCtx, WEAPON_PERS, SIZE_TABLE, SIZE_IDX, turnTimeline, inflictOf,
  statsAt, charStats, STAT_ORDER, isBuilderDefault, gearSpdOf, GEAR_SPD_AUTO, dupBase, PGL_ALL, PGL_HPMAX, PGL_ZONE5, PGL_HPLOW, PGL_ELEMP, pglPlan};
if(typeof module!=='undefined' && module.exports) module.exports = API; else root.AEOpt = API;
})(typeof window!=='undefined'?window:globalThis);
