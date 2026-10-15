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
  muleSlots: 3,      // 셔틀 1명이 공유하는 칸 수 (천명치 200 이상 셔틀은 4칸)
  mulePct: 0.3       // 공유 1칸당 대미지 (속성 글래스터와 같은 가산 그룹)
};
const WEAPON_PERS = {sword:'剣', katana:'刀', ax:'斧', lance:'槍', bow:'弓', fist:'拳', hammer:'槌', staff:'杖'};
const SPECIAL_GRASTA = {none:1, vc:1.03, shin:1.07, goku:1.12};
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
  if(m){ const vals=EL_WORDS.filter(([k])=>new RegExp({fire:'뇌|불|화',water:'물|수',earth:'땅|지',wind:'바람|풍',thunder:'뇌|번개',shade:'음|그림자',crystal:'정|결정'}[k]).test(m[1])).map(([k])=>k);
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
  const pool = req.others ? team.filter(m=>m!==self) : team;
  let n=0;
  if(req.kind==='elem') n = pool.filter(m=>m.elems.some(e=>req.vals.includes(e))).length;
  else if(req.kind==='weap') n = pool.filter(m=>req.vals.includes(m.weapon)).length;
  else if(req.kind==='align') n = pool.filter(m=>req.vals.includes(m.align)).length;
  else if(req.kind==='kof') n = pool.filter(m=>KOF_JP.includes(m.raw.name_jp)||m.pers.has('KOF')).length;
  else if(req.kind==='pers') n = pool.filter(m=>req.vals.some(v=>m.pers&&m.pers.has(v))).length;
  else if(req.kind==='name') n = pool.filter(m=>req.vals.includes(m.raw.name_jp)).length;
  else if(req.kind==='distinct') n = new Set(pool.flatMap(m=>m.elems.filter(e=>req.vals.includes(e)))).size;
  else return false;
  return n >= (req.n||1);
}
const KOF_JP = ['テリー・ボガード','草薙京','クーラ・ダイアモンド','不知火舞'];
const PERS_KR = {'アルカディア':'아르카디아','IDAスクール':'IDA 스쿨','アウトロー':'아웃로','KMS社':'KMS사','時の傷痕の輪舞':'시간의 흉터 윤무','ロストラボ':'로스트 랩',
  'ミグランス王宮':'미그란스 왕궁','巳の国':'사의 나라','魔獣':'마수','聖職者':'성직자','エルフ':'엘프','主人公':'주인공','ねこ好き':'고양이 애호','普賢一刀流':'보현일도류',
  'コープ':'코프','合成人間':'인조인간','東方':'동방','王族':'왕족','KOF':'KOF','FFIX':'FFIX','剣':'검','刀':'도','斧':'도끼','槍':'창','弓':'활','拳':'권갑','槌':'망치','杖':'지팡이',
  '火':'불','水':'물','地':'땅','風':'바람','雷':'번개','陰':'그림자','晶':'결정'};
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
  kou:['crit_rate','over_crit','pwr_flat'], // 리나리아 巧撃: 크리율·오버크리·완력 고정값을 같은 조건으로
  shinan:['shinan'], // 루나틱<심안>: 대미지 ×1.5, 약점 배율 +1 (딩 계산기 44·26행)
  kesshi:['kesshi'], // 루나틱<捨身>(결사): 대미지 ×1.7, 크리티컬 확정 (딩 계산기 44행)
  dmg:['dmg_up'],    // 주는 대미지 UP(기도·가창 등): 출처 종류마다 최댓값 하나, 종류끼리 곱
  mp:['mp_up'],      // 최대 MP %UP (딩 계산기 19행) → 정신통일·심기일체
  flat:['pwr_flat','int_flat','spd_flat'] // 스탯 고정값 UP (딩 계산기 14~16행)
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
    if(w.sb||w.af||w.t!=null||w.stack) sdep=true;
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
  return [].concat(spec).some(s=> s===k || (s==='all' && (k==='starsea'||k==='stellar_sea'||k==='星海陣')));
}
function ruleAct(r, j, team, progs, sit, z, A){
  const w=r.w; let a=1;
  if(w.zone && !zoneMatch(w.zone, z)) return 0;
  if(w.zlv && !(z && z.kind!=='none' && z.level>=w.zlv)) return 0;
  if(w.sb && !((sit==='sb' || (sit==='af' && A.postSB)) && progs[j] && progs[j].sbOK)) return 0; // SB로 건 효과는 그 AF의 남은 행동에도
  if(w.af && sit!=='af') return 0;
  if(w.noaf && sit!=='normal') return 0; // AF·SB 땐 못 거는 효과: 허수아비·시뮬의 AF(와 그 안의 SB)는 세팅 턴 없이(축적 0) 시작하므로, 긴 축적이 필요한 스킬(예: 니나 理の再縫 = 코디네이트 40)
  if(w.req && !reqMet(w.req, team, team[j])) return 0;
  if(w.reqAny && !w.reqAny.some(q=>reqMet(q, team, team[j]))) return 0;
  if(w.pain && !A.painAny) return 0;
  if(w.up!=null) a*=w.up;
  if(w.t!=null && sit==='normal') a*=w.t;
  if(w.stack) a*=ruleStackFill(w.stack, team, sit, A);
  return a;
}
/* ---------- 행동 횟수 기준 축적 ----------
   A.tm = {S0: AF 전 세팅 턴(허수아비: AF 게이지가 100%가 되는 턴 수), H: 평상 턴 평균 구간}. AF 중 1인 행동은 약 AF_N_EST회.
   평상 턴 t의 공격 때 자기 행동 t회, AF k번째 행동 때 S0+k회, AF 끝 SB 때 S0+AF 행동 수만큼 쌓였다고 본다 */
const AF_N_EST = 4.5;
/* 성도 게이지 충전 보너스: 天冥 어빌리티(행동할 때 쌓이는 天/冥의 힘 증가, 강화 후 '중')는 스텔라 보드 조건(전열 구성)이 맞을 때만. 자료가 없거나 판정 불가면 충족으로 봄 */
function sbFillOK(team, i, progs, S){
  const c = team[i]; if(S.sbFillBonus===false || !c.stellar || !(progs[i] && progs[i].sbOK)) return false;
  const b = c.stBoard; if(!b || !b.fill) return true;
  return reqMet(b.fill, team, c);
}
function stackFill(need, sit, A, consume){
  need = Math.max(1, need); const tm = A.tm || {S0:2, H:6};
  if(sit==='normal'){
    if(consume) return Math.min(1, 2/Math.max(2,need)); // 다 쓰고 다시 모으는 한 방: 평상 턴엔 주기마다
    let v=0; const H=Math.max(1,tm.H||6); for(let t=1;t<=H;t++) v+=Math.min(1,t/need); return v/H;
  }
  const S0 = tm.S0||0, n = AF_N_EST;
  if(sit==='af'){
    if(consume){ const f0=Math.min(1,(S0+1)/need); return (f0 + (n-1)*Math.min(1,1/need))/n; } // 첫 사용에 다 쓰고 행동마다 다시
    return Math.min(1, (S0+(n+1)/2)/need);
  }
  return Math.min(1, (S0+n)/need); // SB: AF 끝(세팅 턴 + AF 행동)까지 쌓인 양
}
/* 규칙의 축적 버프(when.stack = {use: 버퍼 행동 1회당, turn: 턴 종료마다, turnReq: 턴 종료 축적 조건(편성), max}) 채움 비율 */
function ruleStackFill(st, team, sit, A){
  const tm = A.tm || {S0:2, H:6}, use = +st.use||0, max = Math.max(1, +st.max||1);
  const tg = (+st.turn||0) * (st.turnReq ? (reqMet(st.turnReq, team, null) ? 1 : 0) : 1);
  const at = (turnsDone, acts) => Math.min(1, (turnsDone*tg + acts*use)/max);
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
    const others = team.map((m,k)=>k).filter(k=>k!==j).sort((a,b)=>(team[b].pow||0)-(team[a].pow||0));
    return others.slice(0, to.adj ? 2 : 1).includes(i); }
  return false;
}
function toFilterOK(to, m){
  if(to.elem && !m.elems.some(e=>to.elem.includes(e))) return false;
  if(to.weap && !to.weap.includes(m.weapon)) return false;
  if(to.wt && !to.wt.includes(m.atkWt)) return false;
  if(to.align && m.align!==to.align) return false;
  if(to.kind && m.atkKind!==to.kind) return false;
  if(to.kof && !(KOF_JP.includes((m.raw||{}).name_jp) || m.pers.has('KOF'))) return false;
  if(to.pers && !to.pers.some(v=>m.pers.has(v))) return false;
  return true;
}
/* 위치 지정 버프(양옆·오른쪽 1명 등)의 대상: 조건에 맞는 아군 중 화력 잠재력 순. 한 캐릭터 옆자리는 둘뿐이라 위치 버퍼는 2명까지 */
function computePos(team){
  const n=team.length, load=team.map(()=>new Set()), out=new Array(n).fill(null);
  for(let j=0;j<n;j++){
    const R=team[j].rules; if(!R||!R.hasPos) continue;
    out[j]=R.list.map(r=>{
      if(!r.pos) return null;
      const self = r.pos==='self'||r.pos==='selfone'||r.pos==='selfadj';
      const k = r.pos==='one'||r.pos==='selfone' ? 1 : r.pos==='adj'||r.pos==='selfadj' ? 2 : r.pos==='others' ? 9 : 0;
      const set=new Set(); if(self) set.add(j);
      const cand=[]; for(let i=0;i<n;i++) if(i!==j && toFilterOK(r.to, team[i])) cand.push(i);
      cand.sort((a,b)=>(team[b].pow||0)-(team[a].pow||0));
      let got=0;
      for(const i of cand){
        if(got>=k) break;
        if(k<9 && !load[i].has(j) && load[i].size>=2) continue;
        set.add(i); got++; if(k<9) load[i].add(j);
      }
      return set;
    });
  }
  return out;
}
function buildBF(team, progs, sit, z, A, posSets, upt, debToo){
  const n=team.length; let any=false; const FX=new Array(n).fill(null);
  for(let j=0;j<n;j++){
    const R=team[j].rules, u = upt ? upt[j] : 1;
    if(!R){
      if(u<1){ any=true; const rows=[]; for(let i=0;i<n;i++){ const row={weak_x:u}; for(const k of ALLF) row[k]=u; if(debToo) for(const k of DEBF) row[k]=u; rows.push(row); } FX[j]={rows, zel:false}; }
      continue;
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
    if(u<1) for(const row of rows){ row.weak_x = u; for(const k of ALLF) row[k]=(row[k]==null?1:row[k])*u; if(debToo) for(const k of DEBF) row[k]=(row[k]==null?1:row[k])*u; for(const k in row) if(k.indexOf(':')>0) row[k]*=u; }
    FX[j]={rows, zel:R.zel};
  }
  return any?FX:null;
}

/* ---------- 캐릭터 전처리 ---------- */
function skillPow(sk){
  if(!sk) return 0;
  const tgt = sk.target==='st'?'st':'aoe', kind = sk.kind==='mag'?'mag':'phys', el=(sk.element||'none')==='none'?'no':'el';
  const sv = (SIZE_TABLE[tgt+'_'+kind+'_'+el]||SIZE_TABLE.aoe_phys_el)[SIZE_IDX[sk.size]??3]/100;
  let m = Math.max(sk.mult||1,1);
  if(sk.mcond){ const b=Math.max(0.1, sk.mcond.base!=null?+sk.mcond.base:1); m = b + (m-b)*0.6; }
  else if(isCharge(sk.condition) && m>=30){ m*=0.4; if(m>25) m=25+(m-25)*0.2; }
  return sv*m*Math.max(1, sk.hits||1)*(1+(sk.repeat||0)*0.7); // 배율은 1타당 → 타수만큼
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
    buffAct, buffTurns: tx.buff==null ? 3 : tx.buff, manifestMax: ex.manifest!=null ? ex.manifest : null,
    buffHow: ex.buff_how || (partyHas ? 'skill' : 'none'),
    naR: Math.min(1, 1.6/Math.max(1.6, skillPow(c.main))),
    cx: cx.v, cxWhy: cx.why, rules: compileRules(c), pow, atkKind, atkWt: m0.weapon_type || (atkKind==='mag'?'magic':wt),
    id:c.id, raw:c, name:c.name_kr, elem:(c.element&&c.element[0])||'none', elems:c.element||[], weapon:c.weapon, wt,
    align:c.align, stellar:!!c.stellar, tier:c.tier||'', score:c.score||0, roles:c.roles||[],
    main:c.main, sb:c.sb, afSk: c.af_skill || null,
    // 횟수 제한 주력(main.uses, 예: 세스타(AS) 狼志 4): 다 쓰면 main.alt 로 (허수아비 AF 행동 단위에서만)
    mainAlt: c.main && c.main.uses && c.main.alt ? Object.assign({}, c.main, c.main.alt, {alt:null, uses:null}) : null,
    self:s, party:p, deb:d, sup:sp, tags:c.tags||[],
    zone, zoneTypes, zspec, zoneAwak: !!(zone&&zone.awakened),
    breakT: (d.break||'').toLowerCase(),
    weakExpose: (d.weak_expose||'').split(/[(\s]/)[0],
    pain: !!d.pain_poison,
    // 독·페인 부여: 평상 턴 가동률(주력기·패시브로 매번 걸면 1, 따로 걸면 지속 턴에 따라)
    inflict: (()=>{ const x=c.inflict; if(!x){ return d.pain_poison ? {poison:0.6, pain:0.6, st:false} : null; }
      const u = x.on_main ? 1 : (x.turns>=99 ? 0.95 : x.turns>=3 ? 0.85 : x.turns>=1 ? 0.6 : 0.75);
      return {poison: x.poison?u:0, pain: x.pain?u:0, st: x.target==='st'}; })(),
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
    stBoard: c.stellar_board || null, // 스텔라 보드: stats(합계), fill(天冥 어빌리티 조건 → SB 게이지 충전 증가)
    stats: Array.isArray(c.stats) && c.stats.length===8 ? c.stats : null,
    mainStat: (m0.stat==='int'||m0.stat==='spd') ? m0.stat : 'pwr',
    mzone: (()=>{ const L=[]; for(const sk of [c.main, c.sb]) if(sk && sk.mcond) for(const cd of [].concat(sk.mcond.need||[], ...((sk.mcond.steps||[]).map(s=>s[1]||[])))) if(cd && cd.zone) L.push(cd); return L.length?L:null; })()
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
function statsAt(stats, tbl, t, board){
  if(!Array.isArray(stats) || stats.length!==8) return null;
  const o = {}, bs = board && board.stats || null;
  STAT_ORDER.forEach((k,i)=>{ let v = stats[i];
    if(tbl) for(const [lv,d] of tbl) if(t>=lv) v += (d[STAT_FATE_KEY[k]||k]||0);
    if(t>=255 && i>=2) v += 10;
    if(bs) v += (bs[k]||0) + (i>=2 ? (bs.all||0) : 0); // 성도각성 스텔라 보드 스탯(全能力 = HP·MP 외)
    o[k] = v; });
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
  const wiki = S && S.useStats===false ? null : statsAt(pc.stats, pc.fateTbl, t, pc.stellar && own && own.s ? pc.stBoard : null);
  if(!wiki && !bst) return null;
  const nk = bst ? {pwr:+bst.str, int:+bst.int, spd:+bst.spd, lck:+bst.luck, mp:+bst.mp} : wiki;
  const spdB = b && b.spdTot ? +b.spdTot : (nk.spd + gearSpdOf(pc, S));
  return {naked:nk, wiki, src: bst ? 'build' : 'wiki', spd: spdB, spdSrc: b && b.spdTot ? 'build' : (bst ? 'build-st' : 'wiki')};
}

/* ---------- 계정 상태(보유/육성) 반영 ---------- */
function charProg(pc, own, S){
  // own: {t:천명치, s:성도각성, m:현현 0/1/2, g:'none'|'vc'|'shin'|'goku', gl:공격 글래스터 배치|null}
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
  else if(pc.fateTbl){ let add = t>=255 ? 10 : 0; for(const [lv,d] of pc.fateTbl) if(t>=lv) add += (d[ms]||0); msV = STAT_REF[kind] + add; }
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
  if(b && b.q>0){ gear = {q:Math.max(0.2, Math.min(1.1, +b.q)), ps:Array.isArray(b.ps)?b.ps:[]}; glx = {mode:'auto'}; }
  // 속도: 빌드 코드의 장비 포함 속도 > 빌드에 넣은 캐릭터 스탯 > 위키 기본 스탯(+장비 속도 설정)
  return {f, sbOK, sbMul, goku: g==='goku', t, slots, gl:glx, gear, D,
    spd: cs ? cs.spd : 0, spdSrc: cs ? cs.spdSrc : null, lck, msV, ms};
}

/* ---------- 적 프로필 ---------- */
function enemyRel(enemy, type){ // 'weak' | 'resist' | 'null' | 'absorb' | null
  if(!enemy) return null;
  return enemy[type]||null;
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
    cands.push({kind:best.kind, types:best.types, key:best.key, level:lvl, by:c.id, byName:c.name, how, unmet,
      label: pre + zname});
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
/* 존 전개 중 AF 게이지(행동당 %). 존이 없거나 상관없는 공격이면 null(타당 계산) */
function zoneAF(z, co){
  if(!z || !z.level || z.kind==='none') return null;
  const el=co.el, wt=co.wt;
  if(z.kind==='all') return 10;
  if(z.kind==='weap') return z.types.includes(wt) ? 7.5 : 0;
  const key = z.key || z.types[0];
  if(key==='crystal') return 7.5;
  if(key==='shade') return el==='shade' ? 7.5 : 2.5;
  if(key==='thunder') return el==='thunder' ? 5 : el==='shade' ? 0 : null;
  if(key==='moonlight') return z.types.includes(el) ? 7.5 : ELEM4.includes(el) ? 0 : null;
  if(z.types.includes(el)) return 7.5;
  if(z.types.some(t=>OPP[t]===el)) return 0;
  return null;
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
    if(c.breakT) A.breaks.push(c.breakT);
    if(c.weakExpose){ A.weakAdd.push(c.weakExpose); // 약점 부여(弱点看破): SB 한정 표기면 SB 때(그 AF 남은 행동)만, 개전 자동이면 처음부터, 그 밖엔 부여한 사람이 행동한 뒤부터
      const raw = String((c.raw && c.raw.debuff && c.raw.debuff.weak_expose) || '');
      A.weakInfo.push({t:c.weakExpose, j, sb:/SB/.test(raw), start: !!(c.raw && c.raw.debuff && c.raw.debuff.weak_expose_start), noaf: !!(c.raw && c.raw.debuff && c.raw.debuff.weak_expose_noaf)}); }
  });
  return A;
}

/* ---------- 공격자 1명의 대미지 (상대값, 존 배율 제외) ---------- */
function attackerCore(team, idx, progs, A, enemy, S, situation, ctx, FX, zone){
  const c = team[idx], pr = progs[idx];
  const sit = situation==='af' ? 'normal' : situation; // AF는 스킬 선택이 평상과 같음
  let row=null; const F = (j,k)=>{ if(!row) return 1; const v=row[k]; return v==null?1:v; };
  let sk = c.main, usingSB=false;
  if(sit==='sb' && c.sb && pr.sbOK && c.sb.mult>0){ sk=c.sb; usingSB=true; }
  if(situation==='af' && c.afSk) sk = c.afSk; // AF 중에만 쓰는 공격(플람라피스(ES) ドゥーイル・スラマ 등)
  if(!sk) return null;
  let el = sk.element||c.elem; const kind = sk.kind==='mag'?'mag':'phys';
  const swc = ELEM_SWITCH[c.id];
  if(swc && (el===swc.yes || el===swc.no)) el = (swc.zone ? zoneMatch(swc.zone, zone) : reqMet(swc.need, team, c)) ? swc.yes : swc.no;
  if(A.echg) el = echgElem(A.echg, team, idx, el, situation, zone, enemy);
  const wt = sk.weapon_type || (kind==='mag'?'magic':c.wt);
  const tgt = sk.target==='st'?'st':'aoe';
  const key = tgt+'_'+kind+'_'+(el==='none'?'no':'el');
  const sizeV = (SIZE_TABLE[key]||SIZE_TABLE.aoe_phys_el)[SIZE_IDX[sk.size]??3]/100;
  let mult = Math.max(sk.mult||1, 1);
  if(sk.mcond) mult = condMult(sk, sk.mcond, situation, team, c, progs, idx, A, zone, enemy, el);
  else if(situation!=='sb' && isCharge(sk.condition) && mult>=30){ mult*=0.4; if(mult>25) mult = 25 + (mult-25)*0.2; } // 축적형 큰 한 방은 평상시 평균으로 낮춤
  if(usingSB) mult*=pr.sbMul;
  // 위력: 크기×배율은 1타당(알테마 표기·데이터 기준), 타수만큼 들어간다 · 단일 공격 ×1.1. 기본 대미지(스탯·속성 보정)는 아래 딩 계산식
  let dmg = sizeV*mult*(tgt==='st'?1.1:1)*Math.max(1, sk.hits||1);

  // 스탯 버프 (완력/지성/속도)
  const stat = sk.stat==='int'?'int':sk.stat==='spd'?'spd':'pwr';
  const me = c.self;
  // 자기 버프(self_buff)는 '자신이 받는 최대치'라 자기 파티 버프를 이미 포함한다 → 같은 항목은 자기 파티 버프를 또 더하지 않음
  const has = k => { const v=me[k]; return typeof v==='number' ? v>0 : !!v; };
  const sv=[pct(me[stat])], ev=[pct(me.elem_atk)], wv=[pct(me.weapon_atk)], spv=[], mpv=[pct(me.mp_up)];
  // 자기 상태 효과 조건: true 또는 {sb: SB 때(그 AF의 남은 행동 포함), req: 편성 조건, zone/zlv: 존}
  const selfOn = q => q===true || (!!q && typeof q==='object' && (!q.sb || situation==='sb' || (situation==='af' && A.postSB))
    && (!q.req || reqMet(q.req, team, c)) && (!q.zone || zoneMatch(q.zone, zone)) && (!q.zlv || (zone && zone.level>=q.zlv)));
  let critA=0, critD = pct(me.crit_dmg), shinW = selfOn(me.shinan)?1:0;
  const FK = stat==='int'?'int_flat':stat==='spd'?'spd_flat':'pwr_flat';
  let flatP = +me[FK]||0;
  let ocW = me.over_crit?1:0, mhW = me.multihit?1:0, xW = me.extra_hit?1:0, pierceW = (sk.barrier_pierce||me.barrier_pierce)?1:0;
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
    if(!(own && has('elem_atk'))){
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
    if(p.dmg_up && !(p.dmg_el && p.dmg_el!==el)){ const v = pct(p.dmg_up)*F(j,'dmg_up'), s = p.dmg_src||'other'; if(v>(dmgS[s]||0)) dmgS[s]=v; } // dmg_el: 그 속성 공격만(○属性で与えるダメージ)
    if(p.mp_up && !(own && has('mp_up'))) mpv.push(pct(p.mp_up)*F(j,'mp_up'));
    if(!(own && has('crit_dmg'))) critD += pct(p.crit_dmg)*F(j,'crit_dmg');
    if(p.over_crit) ocW=Math.max(ocW, F(j,'over_crit'));
    if(p.multihit) mhW=Math.max(mhW, F(j,'multihit'));
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
  let budDmg = 0;
  const BUD = A.bud ? A.bud.parts.filter(b=>!(b.sbOnly && situation!=='sb') && !(b.zone && !(zone && zone.level>0 && zoneMatch(b.zone, zone))) && !(b.st && sk.target!=='st')) : null;
  if(BUD) for(const b of BUD){ const p=b.party; if(!p) continue; const f=b.p;
    if(p[stat]) sv.push(pct(p[stat])*f);
    if(p.all_elem_atk && el!=='none') ev.push(pct(p.all_elem_atk)*f);
    if(p.weapon_atk && p.weapon_atk[c.weapon]) wv.push(pct(p.weapon_atk[c.weapon])*f);
    if(p.wt_dmg && p.wt_dmg[wt]) wv.push(pct(p.wt_dmg[wt])*f);
    critA += pct(p.crit_rate)*f; critD += pct(p.crit_dmg)*f; budDmg += pct(p.dmg)*f; }
  // 물리 기본 크리율 20%(운·장비 포함 평균) + 운 차이 ÷16 % (빌더 계산식: 크리율 += 운/16)
  let critR = (kind==='phys' ? 0.2 + (pr.lck ? (pr.lck-LUCK_REF)/1600 : 0) : 0) + pct(c.self.crit_rate) + critA;
  const statB = dimin(sv,1), elB = dimin(ev,1), wB = dimin(wv,1);
  let specB = dimin(spv, 3.5);
  dmg *= (1+elB)*(1+wB)*(1+specB); // 스탯 버프는 기본 대미지(딩 계산식) 안에서

  // 적 디버프 (내성 그룹). 디버프 규칙(지속·조건) 배율, 단일 대상 디버프는 전체 공격일 때 맞는 적 비율만큼
  const tv=[], phv=[], mgv=[], dfv=[];
  const nTg = sk.target==='st' ? 1 : Math.max(1, S.enemyCount||1);
  for(let j=0;j<team.length;j++){
    const m=team[j], d=m.deb; if(!d) continue;
    const fr = FX&&FX[j] ? FX[j].rows[idx] : null, st = m.rules && m.rules.debSt && nTg>1 ? m.rules.debSt : null;
    if(!fr && !st){
      tv.push(pct(d.all_elem_res)); if(d.elem_res && el!=='none') tv.push(pct(d.elem_res[el]));
      if(kind==='phys'){ phv.push(pct(d.phys_res)); if(d.weapon_res) phv.push(pct(d.weapon_res[wt])); } else mgv.push(pct(d.mag_res));
      const dv = kind==='phys' ? d.end : d.spr; if(dv) dfv.push(pct(dv));
      continue;
    }
    const D = k=>{ let v = fr&&fr[k]!=null ? fr[k] : 1; if(st && st.has(k)) v/=nTg; return v; };
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
  for(const b of A.breaks){
    if(b===el || b===wt || (b.indexOf('_')>0 && b.split('_').includes(wt))) { brk=Math.max(brk,1.5); } // 웨폰브레이크(斬突·斬魔 등 두 종류)
    else if(['all','any','generic','break','weapon'].includes(b)) brk=Math.max(brk,1.3);
  }
  dmg *= brk;

  // 약점/내성
  let rel = null;
  const wkOn = t => (A.weakInfo||[]).some(w => w.t===t && !(w.noaf && situation!=='normal') && (!w.sb || situation==='sb' || (situation==='af' && A.postSB))
    && (w.start || !(FX && FX[w.j] && FX[w.j].rows[idx] && FX[w.j].rows[idx].weak_x!=null && FX[w.j].rows[idx].weak_x<0.5)));
  const added = wkOn(el) || wkOn(wt);
  if(!enemy && added) rel = 'weak'; // 허수아비 등 상성 중립 적에게도 약점 부여는 통함
  if(enemy){
    const r1 = enemyRel(enemy, el), r2 = enemyRel(enemy, wt);
    const rs=[r1,r2];
    if(rs.includes('weak') || (added && !rs.includes('null') && !rs.includes('absorb'))) rel='weak';
    else if(rs.includes('resist')) rel='resist';
    else if(rs.includes('null')) rel='null';
    else if(rs.includes('absorb')) rel='absorb';
  }
  let relF = 1;
  if(rel==='weak') relF = bh.wk + weakD.reduce((a,b)=>a+b,0) + Math.min(1,shinW); // 약점: 물리 1.85+마력 비례 · 마법 2 (딩 계산기 26행), 심안이면 +1
  else if(rel==='resist') relF = 0.25;
  else if(rel==='null'||rel==='absorb') relF = 0;
  dmg *= relF;

  // 다단강화
  const xh = xW>=0.5 && kind==='phys';
  const hits = Math.max(1, sk.hits||1) + (xh ? 1 : 0);
  if(mhW>0) dmg *= 1 + (multihitAvg(hits)-1)*Math.min(1,mhW);
  if(xh) dmg *= hits/Math.max(1,hits-1);

  // 장비: 공격 글래스터 (속성/HP계 가산 +30%, 페인·독 곱연산 ×1.3)
  const inf = A.inf || (A.painAny ? {poison:1, pain:1} : {poison:0, pain:0});
  const zOn = !!(zone && zone.level>=2); // 각성의 힘: ZONE 각성(극·절) 중
  const hpLow = !!c.selfDamage, noEl = el==='none';
  const gk = '_gq'+Math.round(inf.poison*20)+'_'+Math.round(inf.pain*20)+(zOn?'z':'')+(hpLow?'h':'')+(noEl?'n':'');
  let gq = pr[gk] || (pr[gk] = grastaFactor(pr, inf, zOn, hpLow, noEl));
  const share = A.mule ? A.mule.k[idx] : 0, sd = A.mule && A.mule.kd ? A.mule.kd[idx] : null;
  if(share>0 || sd){ // 셔틀이 공유하는 P글래: 속성·HP는 자기 속성 글래와 같은 합연산 묶음, 각성의 힘은 자기 것과 같은 49행(합) 후 곱
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
  if(A.aura && A.aura.nb>0){ const au=A.aura, zk = zone && zone.level>0 ? (zone.key||'') : '', k = zone && zone.level>=2 ? 1 : 2;
    let r51 = au.nb*0.05*au.nMaj, r50 = 0;
    if(k>=2){ if(zk && AURA_Z.has(zk)) r50 = au.nb*0.15; else if(au.nMin>0) r51 += au.nb*0.05*au.nMin; }
    auraF = (1+r50)*(1+r51); auraR = {r50, r51, nb:au.nb}; dmg *= auraF; }
  if(pr.gear) dmg *= pr.gear.q; // 빌드 코드: 장비 완성도

  // 방어 무시/배리어
  const pierce = pierceW>=0.5;
  if(ctx.needPierce) dmg *= 0.25 + 0.75*Math.min(1,pierceW);

  // 반복/재공격
  let rep = sk.repeat||0;
  if(situation==='af' && sk.repeat_af!=null) rep = +sk.repeat_af||0; // AF 중 재공격 횟수가 다른 스킬(이즈나 등 '非AF 시 재공격')
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
      let rho = lsz*lm*1.1/Math.max(1e-9, sizeV*mult*(tgt==='st'?1.1:1));
      if(L.el==='none' && el!=='none') rho /= 1.8; else if(L.el!=='none' && el==='none') rho *= 1.8; // 속성 보정(약 ×1.8) 차이
      const n = (1+rep)*Math.min(1,fL);
      (links=links||[]).push({rho, el:L.el==='none'?'none':L.el, n}); linkHits += n;
    }
  }
  return {perHit: pN*critX, pN, cR, p, oc:ocP, totHits, links, linkHits, nT, el, wt, kind, tgt, usingSB, skill:sk.skill, rel, critR, ocP, statB, elB, wB, specB, typeR, physR, brk,
    afx: sk.af_combo_x||1, hitsPerAct: totHits + linkHits, rep, execs: Math.max(1, +sk.execs||1)*(1+rep) /* 실행 수(연속 실행·재공격 포함): AF 게이지는 실행마다 */, gq, pierce:!!pierce, sizeV, mult, stat, critD, baseHits: Math.max(1, sk.hits||1),
    bh, defR, flatP, lunaF, auraF, auraR, kess: kessW>=0.5, shin: shinW>=0.5, dmgUp, dmgS, mpB, mpF: focW>0 ? mpF : 0, mpTot: mpBase*(1+mpB), relF, gearF: pr.f*(pr.gear?pr.gear.q:1), budDmg, mhW, xh, st1: tgt==='st'};
}

/* 스킬 위력 조건(skill_cond.json): 조건이 맞을 확률로 base~mult 사이 기대 배율 */
function condP(cd, sit, team, c, A, zone, enemy, el, progs){
  const nrm = sit==='normal';
  // 스탯 비례 위력: {stat:'spr', full:500, buff:0.5, sum:'front'} — 기본 스탯(천명치 반영)·버프로 최대치 대비 비율
  if(cd.stat){ const k=cd.stat, val = m=>{ const j=team.indexOf(m), pr=progs&&progs[j]; const st=statsAt(m.stats, m.fateTbl, pr?(pr.t||0):120, m.stellar && pr && pr.sbOK ? m.stBoard : null); return st ? st[k] : (+cd.dflt||170); };
    const v = cd.sum==='front' ? team.reduce((a,m)=>a+val(m),0) : val(c);
    return Math.min(1, v*(1+(+cd.buff||0))/Math.max(1,+cd.full||500)); }
  if(cd.zone){ const ok = zoneMatch(cd.zone, zone) && (!cd.zlv || (zone && zone.level>=cd.zlv)); return ok?1:0; }
  if(cd.req) return reqMet(cd.req, team, c) ? 1 : 0;
  if(cd.stack!=null){ const tn=+cd.turns||0, consume=/소비형/.test(String(cd.stack));
    if(tn<=0) return 1;
    return stackFill(tn, sit, A, consume); } // turns = 가득 차는 데 드는 자기 행동 수
  if(cd.hp){ const sd = c && c.selfDamage; // 스킬마다 HP를 깎는 캐릭터는 HP 저하 조건이 늘 맞고 HP 최대 조건은 거의 안 맞음
    return cd.hp==='self' ? 1 : cd.hp==='max' ? (sd ? 0.2 : 0.8) : (sd ? 1 : 0.5); }
  if(cd.mp) return 0.8;
  if(cd.af!=null) return (sit==='af') === !!cd.af ? 1 : 0;
  if(cd.enemy){ const e=cd.enemy;
    if(e==='poison'||e==='pain'){ const f=A.inf; if(!f) return A.painAny?1:0; return e==='poison' ? f.poison : Math.max(f.pain, f.poison); } // 'pain'은 '독/페인 중 하나'로 쓰인 경우가 있음
    if(e==='weak') return A.weakAdd.includes(el) || (enemy && enemyRel(enemy, el)==='weak') ? 1 : enemy ? 0 : 0.4;
    if(e==='break') return A.breaks.length ? 1 : 0.3;
    return 0.8; }
  if(cd.turn) return nrm ? 0.3 : 0.5;
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
function grastaFactor(pr, inf, zOn, hpLow, noEl){
  const AV = hpLow ? (noEl ? GL_ADD.lowNoEl : GL_ADD.low) : GL_ADD.norm, addOf = e => { let v=0; for(let k=0;k<e;k++) v+=AV[Math.min(k,AV.length-1)]; return v; };
  const gl = pr.gl||DEFAULT_SETTINGS.grastaDefault, n = pr.slots||3;
  if(inf===true) inf={poison:1, pain:1}; else if(!inf) inf={poison:0, pain:0};
  let upo = +inf.poison||0, upa = +inf.pain||0;
  if(gl.ore){ upo=Math.max(upo,0.9); upa=Math.max(upa,0.9); }
  const painOK = upo>0 || upa>0;
  const mPo = 1+0.3*upo, mPa = 1+0.3*upa;
  if(gl.mode==='none') return {f:1,e:0,pa:0,po:0,z:0,add:0,painOK,n,upo,upa};
  if(gl.mode==='auto'){
    let best={f:0};
    for(let z=0;z<=(zOn&&n>0?1:0);z++) for(let pa=0;pa+z<=n;pa++) for(let po=0;po+pa+z<=n;po++){
      const e=n-pa-po-z, f=(1+addOf(e))*Math.pow(mPa,pa)*Math.pow(mPo,po)*(1+GL_Z*z);
      if(f>best.f+1e-9) best={f,e,pa,po,z,add:addOf(e),rebel:!!hpLow};
    }
    return Object.assign(best,{painOK,n,auto:true,upo,upa});
  }
  let e=Math.max(0,+gl.e||0), pa=Math.max(0,+gl.pa||0), po=Math.max(0,+gl.po||0), z=zOn?Math.min(1,Math.max(0,+gl.z||0)):0;
  let over = e+pa+po+z-n;
  while(over>0){ if(po>0) po--; else if(pa>0) pa--; else if(z>0) z--; else e--; over--; }
  const f=(1+addOf(e))*Math.pow(mPa,pa)*Math.pow(mPo,po)*(1+GL_Z*z);
  return {f,e,pa,po,z,add:addOf(e),rebel:!!hpLow,painOK,n,upo,upa};
}

/* 1타 대미지 = 일반타·크리타(·오버크리)를 나눠 각각 25억 초과 경감(딩 계산기)을 건 기대값.
   AF 콤보는 경감 뒤에 곱하고 마지막에 1타 상한 9,999,999,999 (사용자 확인: AF 초반 25~35억이 찍히다 콤보가 오르며 점점 커짐) */
const HIT_MAX = 9999999999;
function applyZoneCap(core, z, S, cap, combo){
  if(!core) return 0;
  const zf = zoneFactorEff(z, core.el, core.wt, S, core.rel), c = combo||1, p = core.p, oc = core.oc||0;
  const H = v => Math.min(HIT_MAX, v*c);
  const E1 = x => S.capOn ? (1-p)*H(dingCap(x)) + p*((1-oc)*H(dingCap(x*core.cR)) + oc*H(dingCap(2*x*core.cR)))
                          : x*c*((1-p) + p*core.cR*(1+oc));
  let tot = E1(core.pN*zf)*core.totHits;
  if(core.links) for(const L of core.links){ tot += E1(core.pN*L.rho*zoneFactorEff(z, L.el, core.wt, S))*L.n; } // 연계 추가타
  return tot*core.nT;
}

/* ---------- 생존 점수 ---------- */
function survival(team, progs, bud){
  const cats = ['heal','barrier','cleanse','guard','taunt','status_immune','mp_recover'];
  const W = {heal:6,barrier:5,cleanse:4,guard:5,taunt:2,status_immune:3,mp_recover:1.5};
  let s=0; const det={};
  const bs = bud && bud.sup || {};
  for(const k of cats){
    const v = team.map(c=>+(c.sup[k]||0)).concat(bs[k]?[+bs[k]]:[]).sort((a,b)=>b-a);
    const val = (v[0]||0) + 0.35*(v[1]||0);
    det[k]=v[0]||0; s += W[k]*val;
  }
  const rev = team.some(c=>c.sup.revive) || !!bs.revive; det.revive=rev; if(rev) s+=6;
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
function simTeam(team, progs, S){
  const H = Math.max(1, Math.round(S.simTurns||6)), mul = S.mpCostMul||1, n=team.length;
  const g = Math.max(0, ...team.map(c=>+((c.sup||{}).mp_recover||0)));
  const regen = MP_REGEN[Math.min(3,g)]||0;
  const R = {H, regen, upt:[], act:[], alt:[], na:[], out:[], mainN:[], buffN:[], mpMax:[], costMain:[], any:false};
  for(let i=0;i<n;i++){
    const c=team[i];
    const mpMax = (S.mpBase||450) + Math.min(120, (progs[i].t||0)*0.47);
    const costMain = Math.round((c.mpMain!=null?c.mpMain:55)*mul), costBuff = Math.round((c.mpBuff!=null?c.mpBuff:50)*mul);
    const bt = c.buffTurns>=99 ? H+1 : Math.max(1, c.buffTurns||3);
    const costAlt = Math.min(costMain, Math.round(ALT_MP*mul));
    let mp=mpMax, rem=0, active=0, mainN=0, altN=0, naN=0, buffN=0, out=0;
    for(let t=1;t<=H;t++){
      if(c.buffAct && rem<=0 && mp>=costBuff){ mp-=costBuff; rem=bt; buffN++; }
      else if(mp>=costMain){ mp-=costMain; mainN++; }
      else { if(!out) out=t; if(mp>=costAlt){ mp-=costAlt; altN++; } else naN++; }
      if(rem>0){ active++; rem--; }
      mp=Math.min(mpMax, mp+regen);
    }
    const upt = c.buffAct ? active/H : 1;
    R.upt.push(upt); R.act.push(mainN/H); R.alt.push(altN/H); R.na.push(naN/H); R.out.push(out); R.mainN.push(mainN); R.buffN.push(buffN); R.mpMax.push(Math.round(mpMax)); R.costMain.push(costMain);
    if(upt<1 || mainN<H) R.any=true;
  }
  return R;
}

/* ---------- 팀 평가 ---------- */
/* 후열 글래스터 셔틀: 공유 P글래 칸 수 (전열 캐릭터별) */
/* 후열(·전열 서포터) 글래스터 셔틀이 공유하는 P글래.
   P글래 종류별로 계산기 그룹이 다르다: 속성·HP 계(공격 글래스터 속성 그룹과 가산), ZONE 전개 중(별도 곱), 특정 ZONE(별도 곱).
   자동 가정: 주딜 무기 퍼스널리티의 후열 셔틀(인원 서약 반영) + 같은 퍼스널리티의 전열 서포터(딜러 아님)의 글래스터 칸.
   칸 배분은 받는 캐릭터마다 가장 이득인 조합(존이 깔려 있으면 존 계 P글래를 섞는 쪽이 보통 이득). */
function muleShare(team, S, ctx, progs){
  if(S.muleOn===false) return null;
  let mules = ctx && ctx.mules && ctx.mules.length ? ctx.mules : null, auto=false, wp=null, front=[];
  if(!mules){
    if(S.muleAuto===false) return null;
    if(!(ctx && ctx.pgl) && !S.pglAssumeAll) return null; // 연성 P글래를 표시하지 않았으면 셔틀 공유를 가정하지 않음
    let best=null; for(const c of team) if(!best || (c.pow||0)>(best.pow||0)) best=c;
    wp = best && WEAPON_PERS[best.weapon]; if(!wp) return null;
    const sl = S.muleSlots||3, nb = ctx && ctx.maxBack!=null ? ctx.maxBack : 2;
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
  return {k, kd, cs, inv: (ctx && ctx.pgl) || null, auto, wp, front, mules:mules.map(m=>({id:m.id||null, name:m.name||null, slots:m.slots, fromBuild:!!m.shares, pers:[...m.pers].filter(p=>Object.values(WEAPON_PERS).includes(p))}))};
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
function afActionsOf(team, progs, cores, z, enemy, S, g0, prio){
  const n = team.length; g0 = g0==null ? 100 : g0;
  if(S.afAuto===false){ const k=Math.max(1,Math.round((+S.afActions||5)*g0/100)); return {n:team.map(()=>k), dur:null, fast:team.map(()=>null), auto:false}; }
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
    const ex = co.execs || (1 + Math.max(0, co.rep||0)), za = zoneAF(z, co); if(za!=null) return za>0 ? Math.max(za*ex, byHit) : za; // 상극·안 맞는 존은 0
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
    const buffOnly = prio && cnt[i]===0 && team[i].buffAct; // 버프만 거는 첫 행동은 게이지 0 (위키)
    g = Math.min(100, gAt + (buffOnly ? 0 : refill[i])); t = tn;
    seq.push({i, t:tn, k:cnt[i]});
    cnt[i]++; next[i] = tn + animOf[i] + (fast[i] ? cnt[i] : cnt[i]+1);
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
function chainCalc(team, progs, A, enemy, S, sit, cx, FX, z, cores, sim, cap, combo, fw){
  const per = team.map(()=>0), trig = team.map(()=>0);
  let any=false;
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
        for(let i=0;i<team.length;i++){ if(i===h && (o.by||'other')!=='any') continue; s += chainActP(team[i], i, o, cores, sit==='af'?'sb':sit, sim); }
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
      const proxy = Object.assign({}, c, {main:sk, sb:null});
      const t2 = team.slice(); t2[h]=proxy;
      const co = attackerCore(t2, h, progs, A, enemy, S, 'normal', cx, FX, z);
      if(!co) continue;
      const d1 = applyZoneCap(co, z, S, cap, combo)*fw(co);
      per[h] += d1*multSum; trig[h] += n; any=true;
    }
  }
  return any ? {per, trig, total:per.reduce((x,y)=>x+y,0)} : null;
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
  return L.length ? L : null;
}
function echgElem(L, team, idx, el, sit, zone, enemy){
  const zEl = zone && zone.kind==='elem' && zone.level>0 ? zone.types[0] : null;
  const pick = (e, self)=>{
    if(e.sb && sit!=='sb') return null;
    if(e.zone && !(zEl===e.zone)) return null;
    if(e.el==='zone') return zEl;
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
/* 요격: 피격 시 반격. 적 공격 수(적 1체당 턴 1.5회) 중 이 캐릭터가 맞는 비율 — 스스로 도발 0.9, 다른 아군이 도발 0.1, 아니면 0.3 */
/* 요격: 맞은 타수마다 1번 반격(루나틱<복사>면 2번). 적 1체가 턴당 enemyHits 타를 넣고 그중 enemyAoE 비율이 전체 공격.
   전체 공격은 전열 모두가 1타씩, 수세(아군 전체공격 대신 받기)면 전열 수만큼 이 캐릭터가 맞음. 단일 공격은 도발이면 90%, 다른 도발·수세 아군이 있으면 10%, 아니면 1/전열 수.
   행동불능 상태이상에 걸리면 요격이 안 나가므로, 보스가 그런 상태이상을 쓰고 상태이상 무효가 없으면 ×0.6 */
function counterCalc(team, progs, A, enemy, S, cx, FX, z, cap, fw){
  const per=team.map(()=>0), trig=team.map(()=>0); let any=false;
  const nE = Math.min(4, Math.max(1, S.enemyCount||1)), front = Math.max(1, Math.min(4, team.length));
  const H = Math.max(0.5, +S.enemyHits||2), pA = Math.min(1, Math.max(0, S.enemyAoE!=null ? +S.enemyAoE : 0.4));
  const coverAoE = team.map(m=>m.cover==='aoe');
  const immuneAll = team.some(m=>m.sup && m.sup.status_immune>=2);
  for(let i=0;i<team.length;i++){
    const c=team[i], ct=c.counter; if(!ct || !ct.atk) continue;
    const selfT = ct.taunt || (c.sup&&c.sup.taunt>=2), otherT = team.some((m,j)=>j!==i && ((m.sup && m.sup.taunt>=2) || coverAoE[j]));
    const aoeHits = coverAoE[i] ? front : team.some((m,j)=>j!==i && coverAoE[j]) ? 0 : 1;
    const stShare = coverAoE[i] || selfT ? 0.9 : otherT ? 0.1 : 1/front;
    let n = nE * H * (pA*aoeHits + (1-pA)*stShare);
    if(ct.trig==='phys') n*=0.7; else if(ct.trig==='fire') n*=0.3;
    if(ct.copy) n*=2;
    if(cx && cx.enemyCC && !immuneAll && !(c.sup && c.sup.status_immune>=1)) n*=0.6;
    if(n<=0.01) continue;
    const a=ct.atk, sk={skill:'요격', target:a.target, kind:a.kind, stat:a.stat, element:a.element||'none', weapon_type:a.weapon_type, size:a.size||'xl', mult:+a.mult||1, hits:Math.max(1,a.hits||1), repeat:0, crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x:1, condition:''};
    const t2=team.slice(); t2[i]=Object.assign({}, c, {main:sk, sb:null});
    const co=attackerCore(t2, i, progs, A, enemy, S, 'normal', cx, FX, z); if(!co) continue;
    per[i]+=applyZoneCap(co, z, S, cap, null)*fw(co)*n; trig[i]+=n; any=true;
  }
  return any ? {per, trig, total:per.reduce((x,y)=>x+y,0)} : null;
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
      const useSB = (inAF, fin)=>{ if(o.sbAw) aw1 = Math.max(aw1, 2); const lv = (o.sbAw||aw1>0||o.awConst) ? 2 : 1;
        d += (lv>=2 ? o.sbBurst : o.sbBurst1)*(inAF?fin:1); s1=0; rec.sb = inAF?'af':'turn'; if(inAF) rec.combo=fin; if(R && (e1 || !R.cost)){ g1=Math.max(g1, R.to); e1=0; rec.refill=true; } };
      if(op==='af'){ const r=o.afRun(g1, L()); d+=r.dmg; s1+=o.sbAct*r.acts; g1=0; rec.af=r.g0; rec.afD=r.dmg; rec.afL=L();
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
function evalTeam(team, progs, enemy, S, cap, ctx){
  const A = teamAgg(team);
  A.inf = inflictOf(team, progs, S);
  A.echg = echgOf(team, progs);
  A.bud = ctx && ctx.buddy ? budAgg(ctx.buddy, team, enemy, A) : null;
  A.painAny = A.inf.poison>0 || A.inf.pain>0;
  A.mule = muleShare(team, S, ctx, progs);
  { const nb = ctx && ctx.maxBack!=null ? ctx.maxBack : 2, lt = team.filter(c=>c.align==='light').length, sh = team.length-lt;
    A.aura = S.auraGl===false ? null : {nb, nMaj: Math.max(lt, sh) + nb, nMin: Math.min(lt, sh)}; } // 후열은 많은 쪽 성향으로 가정
  const light = team.filter(c=>c.align==='light').length, shadow = team.length-light;
  const flux = light>shadow?'light':shadow>light?'shadow':'both';
  const hasSB = team.some((c,i)=>c.stellar && progs[i].sbOK);
  const cx = Object.assign({}, ctx, {flux});
  const anyR = team.some(c=>c.rules), ez = !!(A.echg && A.echg.some(e=>e.el==='zone'||e.zone)), mz = ez || team.some(c=>c.mzone), zdep = mz || (anyR && team.some(c=>c.rules&&c.rules.zdep)), sdep = anyR && team.some(c=>c.rules&&c.rules.sdep);
  const posSets = anyR && team.some(c=>c.rules&&c.rules.hasPos) ? computePos(team) : null;
  // 같은 상황에서 규칙 발동 상태가 같으면 계산을 재사용 (존 후보가 버프 조건을 바꾸지 않는 경우가 대부분)
  const memo = new Map();
  const sim = S.simOn!==false ? simTeam(team, progs, S) : null, simUse = !!(sim && sim.any);
  const uptLow = simUse && sim.upt.some(u=>u<1);
  const coresFor = (sit, z, useSim)=>{
    const upt = useSim && uptLow ? sim.upt : null;
    if(!zdep){ const FX = (anyR||upt) ? buildBF(team,progs,sit,z,A,posSets,upt) : null; return team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,sit,cx,FX,z)); }
    let key = (sit==='sb'?7:sit==='af'?13:3) + (upt?100:0);
    if(mz){ let b=1; for(const c of team) if(c.mzone) for(const cd of c.mzone){ b = b*2 + (zoneMatch(cd.zone, z) && (!cd.zlv || (z&&z.level>=cd.zlv)) ? 1 : 0); }
      if(ez) b = b*17 + (z && z.kind==='elem' && z.level>0 ? ELEMS.indexOf(z.types[0])+2 : 1);
      key = (key*131 + b) % 2147483629; } // 스킬 위력이 존에 따라 바뀌는 캐릭터
    for(let j=0;j<team.length;j++){ const R=team[j].rules; if(!R) continue;
      if(R.zel) key = (key*131 + (z&&z.kind==='elem'&&z.level>0 ? ELEMS.indexOf(z.types[0])+1+(z.types.length>1?40:0) : 0)) % 2147483629;
      for(const r of R.list) key = (key*1009 + Math.round(ruleAct(r,j,team,progs,sit,z,A)*1000)) % 2147483629; }
    const hit = memo.get(key); if(hit) return hit;
    const FX = (anyR||upt) ? buildBF(team,progs,sit,z,A,posSets,upt) : null;
    const cores = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,sit,cx,FX,z));
    memo.set(key, cores); return cores;
  };
  const fw = focusW(ctx&&ctx.focus);
  const hasChain = team.some(c=>c.chain), hasCtr = team.some(c=>c.counter);
  // 일반 턴 행동 비중: 주력기 턴 + 통상 공격 턴(주력기 대비 약한 위력)
  const wN = simUse ? team.map((c,i)=>sim.act[i] + sim.alt[i]*Math.max(ALT_R, c.naR) + sim.na[i]*c.naR) : null;
  const sumZ = (cores,z,combo,w)=>{ let v=0; const per=cores.map((co,i)=>{ const d=applyZoneCap(co,z,S,cap,combo)*fw(co)*(w?w[i]:1); v+=d; return d; }); return {v,per}; };
  const res = {};
  A.tm = {S0:2, H:Math.max(1, Math.round(S.simTurns||6))};
  const runSit = sit => {
    const s2 = (sit==='sb'&&!hasSB)?'normal':sit;
    const useSim = sit==='normal' && simUse, w = sit==='normal' ? wN : null;
    const zs = zoneCandidates(team, progs, sit);
    const shared = zdep ? null : coresFor(s2, null, useSim);
    let best=null, bestV=-1, bestPer=null, bestCores=shared;
    for(const z of zs){
      const cores = zdep ? coresFor(s2, z, useSim) : shared;
      const r = sumZ(cores, z, null, w);
      if(r.v>bestV){ bestV=r.v; best=z; bestPer=r.per; bestCores=cores; }
    }
    res[sit] = {total:bestV, zone:best, per:bestPer, cores:bestCores, zones:zs, sit:s2};
    if(hasChain){
      const FXc = anyR ? buildBF(team,progs,s2,best,A,posSets,null) : null;
      const ch = chainCalc(team, progs, A, enemy, S, s2, cx, FXc, best, bestCores, useSim?sim:null, cap, null, fw);
      if(ch){ res[sit].chain=ch; res[sit].total+=ch.total; res[sit].per=res[sit].per.map((v,i)=>v+ch.per[i]); }
    }
    if(hasCtr && sit==='normal'){
      const FXc = anyR ? buildBF(team,progs,'normal',best,A,posSets,null) : null;
      const ct = counterCalc(team, progs, A, enemy, S, cx, FXc, best, cap, fw);
      if(ct){ res[sit].counter=ct; res[sit].total+=ct.total; res[sit].per=res[sit].per.map((v,i)=>v+ct.per[i]); }
    }
  };
  runSit('normal');
  // 지속: 일반 존은 상시, 어나더 존은 2/5 턴 가동 (어나더 존 한정 버프도 그 동안만)
  const nz = res.normal.zone;
  let sustain = res.normal.total;
  if(nz && nz.level>=2){
    const z1 = Object.assign({}, nz, {level:1});
    const cores1 = zdep ? coresFor('normal', z1, simUse) : res.normal.cores;
    sustain = sumZ(cores1, z1, null, wN).v*0.6 + res.normal.total*0.4;
  }
  // AF 게이지 충전(평상 턴): ZONE 없으면 타당 1.5%(약점 3.5%, 전체 공격도 1타겟), 맞는 ZONE이면 행동당 7.5%.
  // 서포트 등급(AF 게이지)·버디로 추가. AF 주기 K = 100 / 턴당 충전
  let afGain = 0;
  { const z=nz, cs=res.normal.cores;
    team.forEach((c,i)=>{ const co=cs[i]; if(!co) return; const pAct = simUse ? (sim.act[i]+sim.alt[i]) : 1;
      const za = zoneAF(z, co);
      const weak = enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak');
      const byHit = Math.min(30, co.totHits) * (weak?3.5:1.5), ex = co.execs || (1 + Math.max(0, co.rep||0));
      afGain += pAct * (za!=null ? (za>0 ? Math.max(za*ex, byHit) : za) : byHit);
      afGain += [0,2,4,7][Math.min(3,(c.sup&&c.sup.af_gauge)||0)];
    });
    if(A.bud && ctx && ctx.buddy && ctx.buddy.main && ['moke','korobo','gansu_as'].includes(ctx.buddy.main.id)) afGain += 5;
  }
  const afTurns = Math.max(2, Math.min(20, 100/Math.max(1, afGain)));
  // 허수아비는 1턴만, AF 100%로 시작(사용자 확인) → 세팅 턴 없음: 축적은 AF 중 행동 횟수만큼
  A.tm.S0 = 0;
  runSit('sb');
  const afCores = coresFor('af', nz, false); // AF 상황(AF 전용 스킬·AF 조건)으로, 버프는 다 깔린 상태
  const afA = afActionsOf(team, progs, afCores, nz, enemy, S);
  let gain=0;
  afCores.forEach((co,i)=>{ if(co) gain += afA.n[i]*co.hitsPerAct*0.025*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); });
  const avgCombo = Math.min(0.75 + 0.5*gain, S.comboCap>0 ? S.comboCap : Infinity);
  const afS = sumZ(afCores, nz, avgCombo, afA.n);
  let af = afS.v;
  let afChain = null;
  // 체인 어빌리티는 AF 밖(평상·SB 턴)에서만 발동 (사용자 확인)
  const sbTurn = res.sb.total;
  const surv = survival(team, progs, A.bud);
  const sustainAF = sustain + (S.afCycle!==false ? af/afTurns : 0); // 지속 딜: 평상 턴 + AF를 주기마다 한 번
  const out = {sbTurn, af, afChain, afA, sustain: sustainAF, sustainNoAF: sustain, afGain, afTurns, burst: sbTurn + 0.5*af, surv: surv.score, survDet: surv.det,
    flux, light, shadow, hasSB, avgCombo, normal:res.normal, sb:res.sb, A, posSets, sim, mule:A.mule};
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
  const afRun = (g0, lv)=>{ g0 = Math.max(50, Math.min(100, Math.round(g0/10)*10)); const lv2 = !(nz && nz.level>=2) || lv>=2; const k=g0+(lv2?'a':'b'); if(afMemo[k]) return afMemo[k];
    const a = g0>=100 ? afA : afActionsOf(team, progs, afCores, lv2?nz:nzL1, enemy, S, g0);
    let gn=0; afCores.forEach((co,i)=>{ if(co) gn += a.n[i]*co.hitsPerAct*0.025*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); });
    const avg = Math.min(0.75+0.5*gn, S.comboCap>0 ? S.comboCap : Infinity), zz = (g0>=100 && lv2) ? afS : sumZ(afCores, lv2?nz:nzL1, avg, a.n);
    return (afMemo[k] = {g0, dmg:zz.v, per:zz.per, acts:a.n.reduce((x,y)=>x+y,0), fin:Math.min(0.75+gn, S.comboCap>0 ? S.comboCap : Infinity), avg, n:a.n}); };
  const sbIdx = team.map((c,i)=>i).filter(i=>team[i].stellar && progs[i].sbOK);
  const st = afStartOf(team, ctx, S);
  const extra = (res.normal.chain?res.normal.chain.total:0) + (res.normal.counter?res.normal.counter.total:0);
  const normal2 = res.normal.total, normal1 = nz && nz.level>=2 ? sumZ(zdep ? coresFor('normal', nzL1, simUse) : res.normal.cores, nzL1, null, wN).v + extra : normal2;
  const sbz1 = sbz && sbz.level>=2 ? Object.assign({}, sbz, {level:1}) : sbz, sbPer1 = sbz && sbz.level>=2 ? sumZ(res.sb.cores, sbz1, null, null).per : res.sb.per;
  const simIn = {t1: out.tl ? out.tl.t1 : normal2, normal: normal2, normal1, sbBurst: sbIdx.reduce((v,i)=>v+(res.sb.per[i]||0),0), sbBurst1: sbIdx.reduce((v,i)=>v+(sbPer1[i]||0),0),
    aw0: awStart ? 2 : 0, awConst, sbAw, hasSB: sbIdx.length>0,
    afGain, g0: st.g, s0: Math.min(50, 12.5*Math.max(light, shadow)), sbAct: S.sbPerAct!=null ? +S.sbPerAct : 2.5, front: team.length, afRun,
    refill: (()=>{ const rc = sbIdx.length ? team.find(c=>c.afRefillR && c.afRefillR.on==='sb') : null; return rc ? {to:+rc.afRefillR.to||100, cost:+rc.afRefillR.cost||0} : null; })()};
  const NB = Math.max(1, Math.min(10, (ctx && ctx.burstN) || +S.burstTurns || 3));
  // 조합 탐색 중에는 그 모드 점수에 쓰는 것만 계산(최고점 = 허수아비, 나머지 = N턴 시뮬). 화면용 재계산(ctx.mode 없음)은 둘 다
  const md = ctx && ctx.mode, needBsim = md!=='burst', needDummy = !md || md==='burst';
  if(needBsim){
    out.bsim = battleSim(NB, simIn); out.bsim.afStart = st; out.bsim.s0 = simIn.s0;
    out.burstOld = out.burst; out.burst = out.bsim.total;
    out.opener = NB===1 ? out.bsim.total : battleSim(1, simIn).total;
  } else { out.bsim = {total:0, turns:[], N:NB, afStart:st, s0:simIn.s0}; }
  if(needDummy && ctx && ctx.dummyFast){ // 탐색 1단계: 허수아비를 빠르게 어림(버프 다 깔린 AF + AF 끝 콤보 SB), 상위 후보만 2단계에서 정밀 계산
    const totA = Math.max(1, afA.n.reduce((x,y)=>x+y,0)), sb0 = Math.min(50, 12.5*Math.max(light, shadow)), sa = S.sbPerAct!=null ? +S.sbPerAct : 2.5;
    const rateAvg = team.reduce((x,c,i)=>x + afA.n[i]*sa*(sbFillOK(team, i, progs, S) ? 2 : 1), 0)/totA;
    const needA = (100 - sb0)/Math.max(0.1, rateAvg), sbOK = sbIdx.length>0 && needA <= totA + 1e-9;
    const cAt = Math.min(0.75 + gain*Math.min(1, needA/totA), S.comboCap>0?S.comboCap:Infinity);
    out.dummyT = af*0.85 + (sbOK ? simIn.sbBurst*cAt : 0); out.dummy = {total:out.dummyT, fast:true, per:team.map(()=>0), order:team.map((_,i)=>i), n:afA.n}; return out; }
  if(!needDummy){ out.dummy = {total:0, af:0, sb:0, per:team.map(()=>0), afPer:team.map(()=>0), n:team.map(()=>0), order:team.map((_,i)=>i), fin:0.75, avg:0.75, acts:0, sbAt:null}; out.dummyT = 0; return out; }
  // 허수아비 기록은 후열 연성 P글래 셔틀·풀장비로 잰다(사용자 확인): 보유 표시가 없으면 셔틀 2명을 가정(설정 dummyMule로 끔)
  let Ad = A;
  if(S.dummyMule!==false && !A.mule){ const m2 = muleShare(team, Object.assign({}, S, {pglAssumeAll:true}), ctx, progs); if(m2) Ad = Object.assign({}, A, {mule:m2}); }
  // 허수아비는 AF에서 펼칠 존을 고를 수 있다: 평상 턴 최적 존 + 다른 존 후보(존 없음 포함)를 다 돌려 가장 높은 것
  const zc = [nz]; for(const q of (res.normal.zones||[])) if(q && !zc.some(r=>r && r.kind===q.kind && r.key===q.key && r.level===q.level)) zc.push(q);
  let bestD = null;
  for(const zq of zc.slice(0, 4)){
    const zs2 = sameZ(res.normal.zones, zq), awC = zs2.some(q=>q.how!=='개전 자동' && q.how!=='SB 시'), awS = !awC && zs2.some(q=>q.how==='개전 자동');
    const dd = dummySim({team, progs, A:Ad, enemy, S, cx, posSets, cap, fw, nz:zq, awStart:awS, awConst:awC, sbz, sbAw, sbIdx, sbCores:res.sb.cores, light, shadow});
    if(!bestD || dd.total > bestD.total*1.0005) bestD = dd;
  }
  out.dummy = bestD;
  out.dummy.mule = Ad.mule || null;
  out.dummy.S0 = A.tm.S0;
  out.dummyT = out.dummy.total;
  return out;
}
/* ---------- 최고점 딜 = 허수아비(대두타) 기준 어포딜 ----------
   허수아비는 1턴만 칠 수 있고 AF 100%로 시작한다(사용자 확인). 그래서 AF 한 번을 행동 단위로 따라간다:
   - AF 첫 바퀴는 왼쪽부터(버퍼·디버퍼·ZONE 담당 먼저), 이후 속도별 쿨타임 순서. 게이지는 초당 10% 감소, 타격으로 충전
   - 버프·디버프는 그 캐릭터가 AF에서 한 번 행동한 뒤부터(패시브·자동은 처음부터). 버프 전용 캐릭터의 첫 행동은 버프만
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
  const {team, progs, A, enemy, S, cx, posSets, cap, fw, nz, awStart, awConst, sbz, sbAw, sbIdx, sbCores} = o;
  const n = team.length, prio = dummyPrio(team, progs);
  const passive = team.map(c=>c.buffHow==='passive'||c.buffHow==='auto');
  // ZONE: 개전 자동·상시 재각성은 처음부터, 그 밖엔 펼치는 사람이 행동한 뒤부터
  const zBy = nz && nz.level>0 ? team.findIndex(c=>c.id===nz.by) : -1;
  const zFrom0 = !!(nz && nz.level>0 && (awStart || nz.how==='개전 자동'));
  const zoneAt = acted => !nz || !nz.level ? nz : (zFrom0 || (zBy>=0 && acted[zBy])) ? nz : null;
  const fxMemo = new Map(), coMemo = new Map();
  const coreAt = (acted, z, sit, i) => { // 그 순간 깔린 버프로 i의 공격 1회 (필요한 것만 계산)
    sit = sit || 'af';
    const key = sit+'|'+acted.map((v,j)=>v||passive[j]?1:0).join('')+'|'+(z?z.key+':'+z.level:'-')+(A.postSB?'|P':'');
    const ck = key+'|'+i; if(coMemo.has(ck)) return coMemo.get(ck);
    let FX = fxMemo.get(key);
    if(FX===undefined){ const upt = team.map((c,j)=> acted[j]||passive[j] ? 1 : 0); FX = buildBF(team, progs, sit, z, A, posSets, upt, true); fxMemo.set(key, FX); }
    const co = attackerCore(team, i, progs, A, enemy, S, sit, cx, FX, z); coMemo.set(ck, co); return co;
  };
  const altCoreAt = (acted, z, i) => { // 횟수를 다 쓴 뒤의 주력(같은 버프 상태)
    const key = 'alt|'+acted.map((v,j)=>v||passive[j]?1:0).join('')+'|'+(z?z.key+':'+z.level:'-')+(A.postSB?'|P':'')+'|'+i; if(coMemo.has(key)) return coMemo.get(key);
    coreAt(acted, z, 'af', i); const FX = fxMemo.get('af|'+acted.map((v,j)=>v||passive[j]?1:0).join('')+'|'+(z?z.key+':'+z.level:'-')+(A.postSB?'|P':''));
    const tAlt = team.map((m,k)=> k===i ? Object.assign({}, m, {main:m.mainAlt}) : m);
    const co = attackerCore(tAlt, i, progs, A, enemy, S, 'af', cx, FX, z); coMemo.set(key, co); return co; };
  const all = team.map(()=>true);
  const full = team.map((c,i)=>coreAt(all, nz, 'af', i));
  const afA = afActionsOf(team, progs, full, nz, enemy, S, 100, prio);
  const acted = team.map(()=>false), per = team.map(()=>0), cnt = team.map(()=>0);
  const cmax = S.comboCap>0 ? S.comboCap : Infinity;
  let combo = 0.75, af = 0, cw = 0, sbG = Math.min(50, 12.5*Math.max(o.light, o.shadow));
  const sbAct = S.sbPerAct!=null ? +S.sbPerAct : 2.5;
  // 성도 게이지 충전 보너스(강화): 성도 각성한 캐릭터는 조건을 채운다고 보고 2배(설정으로 끔)
  const sbRate = team.map((c,i)=> sbAct * (sbFillOK(team, i, progs, S) ? 2 : 1));
  let sbAt = null, sb = 0, zOver = null; const sbPer = [], sbCo = {};
  for(const a of afA.seq){
    const i = a.i, c = team[i];
    const buffOnly = cnt[i]===0 && c.buffAct;
    const zNow = zOver || zoneAt(acted);
    if(!buffOnly){
      const useAlt = c.mainAlt && cnt[i] >= c.main.uses && !c.afSk;
      const co = useAlt ? altCoreAt(acted, zNow, i) : coreAt(acted, zNow, 'af', i);
      if(co){ const d = applyZoneCap(co, zNow, S, cap, Math.min(combo, cmax))*fw(co); af += d; per[i] += d; cw += d*Math.min(combo,cmax);
        combo += co.hitsPerAct*0.025*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); }
    }
    acted[i] = true; cnt[i]++; sbG += sbRate[i];
    if(sbAt==null && sbIdx.length && sbG >= 100 - 1e-9){ // AF 도중 SB: 지금 콤보, 지금까지 깔린 버프
      sbAt = afA.seq.indexOf(a)+1;
      const zSB = sbAw && sbz ? sbz : zNow;
      for(const j of sbIdx){ const co = coreAt(acted, zSB, 'sb', j); if(!co) continue; const d = applyZoneCap(co, zSB, S, cap, Math.min(combo, cmax))*fw(co); sb += d; per[j] += d; sbPer.push([j, d]); sbCo[j] = {co, z:zSB, combo:Math.min(combo, cmax)}; }
      if(sbAw && sbz) zOver = sbz; // SB로 각성한 존은 남은 AF 동안
      A.postSB = true; // SB로 건 버프(연격수+1·심안·크리 대미지 등)는 남은 AF 행동에도
    }
  }
  A.postSB = false;
  const fin = Math.min(combo, cmax);
  return {total: af + sb, af, sb, afPer: per.map((v,i)=>v - sbPer.filter(x=>x[0]===i).reduce((q,x)=>q+x[1],0)), per, n: cnt, avg: af>0 ? cw/af : 0.75, fin,
    sbCombo: sbAt!=null ? null : null, sbAt, lv: nz && nz.level>=2 && zFrom0 ? 2 : (nz ? nz.level : 0), sbWhen: sbAt!=null ? 'af' : null,
    sbGauge: Math.min(100, sbG), sbNeed: sbIdx.length>0 && sbAt==null, acts: afA.seq.length, order: prio, ex: 0,
    full, zFull: nz, sbCo}; // 계산 근거 화면용: 버프가 다 깔린 AF 중 1회 공격(평상 존), SB 공격
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
    const zm = free.filter(o=>o.pc.zoneTypes && o.pc.zoneTypes.opts.some(op=>F.kind==='elem' ? op.kind==='elem'&&op.types.includes(F.v) : op.kind==='weap'&&op.types.includes(F.v)));
    add('sup', 8, zm);
    add('sup', mode==='stability'?12:14); add('surv', mode==='stability'?10:5);
  } else {
    const quota = mode==='stability' ? {dps:12,sup:12,surv:12} : {dps:15,sup:14,surv:6};
    add('dps',quota.dps); add('sup',quota.sup); add('surv',quota.surv);
  }
  // 존 제공자 중 상위 딜러 속성과 맞는 캐릭터 보강
  const topEl = new Set(free.slice().sort((a,b)=>b.pot.dps-a.pot.dps).slice(0,8).map(o=>o.pc.elem));
  free.filter(o=>o.pc.zoneTypes && o.pc.zoneTypes.opts.some(op=>op.types.some(t=>topEl.has(t)))).sort((a,b)=>b.pot.sup-a.pot.sup).slice(0,4).forEach(o=>pick.set(o.pc.id,o));
  let arr=[...pick.values()];
  const MAXP = opts.maxPool || 44;
  if(arr.length>MAXP){
    const lk = arr.filter(o=>lockedSet.has(o.pc.id));
    const fb = o=> F && charFocusMatch(o.pc,F) ? 1.5 : 1;
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
  if(n.cleanse && !(d.cleanse>=1 || d.status_immune>=2)){ f*=0.9; miss.push('상태이상/디버프 해제 없음'); }
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
  if(mode==='opener' || mode==='weak' || mode==='boss' || mode==='kesshitsu' || mode==='custom') ctx.timeline = true; // 실전(N턴 총딜)의 1턴은 속도·선제 순서
  const BR = ev => mode==='opener' ? ev.opener : mode==='burst' ? ev.dummyT : ev.burst; // 최고점 = 허수아비 어포딜, 실전(약점·보스 등) = N턴 시뮬
  if(mode==='burst') ctx.dummyFast = true; // 1단계 어림 → 상위 후보만 행동 단위 시뮬레이션
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
  const pool = buildPool(own, lockIds, {enemy,S,cap,ctx,mode,maxPool:input.maxPool});
  const lockIdx = lockIds.map(id=>pool.findIndex(o=>o.pc.id===id));
  const free = pool.map((_,i)=>i).filter(i=>!lockIdx.includes(i));
  const need = 4-lockIdx.length;
  const teams=[], raws=[];
  let total = 1; for(let i=0;i<need;i++) total = total*(free.length-i)/(i+1);
  total = Math.round(total)||1;
  let done=0, lastYield=Date.now();
  const recSet = new Set(recommendedIds);
  const it = need>0 ? combos(free.length, need) : [[]][Symbol.iterator]();
  const seen = new Map(); // 조합 키 → teams 인덱스
  for(const cmb of it){
    const idxs = lockIdx.concat(cmb.map(k=>free[k]));
    const team = idxs.map(i=>pool[i].pc), progs = idxs.map(i=>pool[i].prog);
    if(dupBase(team)){ done++; continue; }
    const ev = evalTeam(team, progs, enemy, S, cap, ctx);
    teams.push(idxs); raws.push(BR(ev), ev.sustain, ev.surv);
    seen.set(idxs.map(i=>pool[i].pc.id).sort().join(), teams.length-1);
    done++;
    if(Date.now()-lastYield>40){ lastYield=Date.now(); if(onProgress) onProgress(Math.min(0.85, done/total*0.85)); await new Promise(r=>setTimeout(r,0)); }
  }
  // 속성덱·타입덱 후보: 속성·타입마다 작은 후보 풀로 조합을 더 만들어 같은 기준(지정 없음)으로 평가
  // (조합 시너지로 강해지는 캐릭터가 전체 후보 풀에서 빠지는 것을 막는다)
  const posOf = new Map(pool.map((o,i)=>[o.pc.id,i]));
  const deckIdx = []; // 속성덱·타입덱 후보 (전방 3명 이상이 그 속성·타입으로 공격)
  if(!ctx.focus && input.deckSeeds!==false){
    const FOC = ELEMS.map(v=>({kind:'elem',v})).concat(['slash','blunt','pierce','magic'].map(v=>({kind:'wt',v})));
    for(let fi=0; fi<FOC.length; fi++){
      const F=FOC[fi];
      if(!own.some(o=>charFocusMatch(o.pc,F))) continue;
      const fp = buildPool(own, lockIds, {enemy,S,cap,ctx:Object.assign({},ctx,{focus:F}),mode,maxPool:14});
      for(const o of fp) if(!posOf.has(o.pc.id)){ posOf.set(o.pc.id,pool.length); pool.push(o); }
      const lk = lockIds.map(id=>fp.findIndex(o=>o.pc.id===id)).filter(i=>i>=0);
      const fr = fp.map((_,i)=>i).filter(i=>!lk.includes(i));
      const nd = 4-lk.length;
      const it2 = nd>0 ? combos(fr.length, nd) : [[]][Symbol.iterator]();
      for(const cmb of it2){
        const mem = lk.concat(cmb.map(k=>fr[k])).map(i=>fp[i]);
        const nMatch = mem.filter(o=>charFocusMatch(o.pc,F)).length; if(!nMatch) continue;
        const key = mem.map(o=>o.pc.id).sort().join();
        if(seen.has(key)){ if(nMatch>=3){ const ti=seen.get(key); if(ti>=0) (deckIdx[fi]=deckIdx[fi]||[]).push(ti); } continue; }
        seen.set(key, teams.length);
        const team=mem.map(o=>o.pc), progs=mem.map(o=>o.prog);
        if(dupBase(team)) continue;
        const ev = evalTeam(team, progs, enemy, S, cap, ctx);
        teams.push(mem.map(o=>posOf.get(o.pc.id))); raws.push(BR(ev), ev.sustain, ev.surv);
        if(nMatch>=3) (deckIdx[fi]=deckIdx[fi]||[]).push(teams.length-1);
        if(Date.now()-lastYield>40){ lastYield=Date.now(); if(onProgress) onProgress(0.85+0.15*fi/FOC.length); await new Promise(r=>setTimeout(r,0)); }
      }
    }
  }
  if(ctx.dummyFast){ // 2단계: 어림 상위 400개만 허수아비 1턴 AF를 행동 단위로 다시 계산
    ctx.dummyFast = false;
    const top = teams.map((_,i)=>i).sort((a,b)=>raws[3*b]-raws[3*a]);
    for(let r=0; r<top.length; r++){
      const i = top[r];
      if(r<400){ const tm=teams[i].map(k=>pool[k]); const ev=evalTeam(tm.map(o=>o.pc), tm.map(o=>o.prog), enemy, S, cap, ctx); raws[3*i]=BR(ev); }
      else raws[3*i] *= 0.5; // 정밀 계산 안 한 조합은 뒤로
      if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r2=>setTimeout(r2,0)); }
    }
  }
  let mb=1e-9, ms=1e-9, mt=1e-9;
  for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[3*i]); ms=Math.max(ms,raws[3*i+1]); mt=Math.max(mt,raws[3*i+2]); }
  const w = modeWeights(mode, boss, input.weights, pl);
  // 상위 조합에서 한 명씩 바꿔 보기 (후보 풀 밖의 시너지 캐릭터 찾기)
  if(input.refine!==false && teams.length){
    const scoreOf = (b,s,tt)=>{ let sc = w.b*b/mb + w.s*s/ms + w.t*tt/mt; if((mode==='sustain'||mode==='weak') && tt/mt<0.25) sc*=0.85; return sc; };
    const order = teams.map((_,i)=>i).sort((a,b)=>scoreOf(raws[3*b],raws[3*b+1],raws[3*b+2])-scoreOf(raws[3*a],raws[3*a+1],raws[3*a+2]));
    const starts=[]; for(const i of order){ if(starts.length>=8) break; const ids=new Set(teams[i]); if(starts.some(s=>s.filter(x=>ids.has(x)).length>=3)) continue; starts.push(teams[i].slice()); }
    const cand = own.map(o=>Object.assign({},o,{pot:soloPotential(o.pc,o.prog,enemy,S,cap,ctx)})).sort((a,b)=>(b.pot.dps+b.pot.sup*0.5)-(a.pot.dps+a.pot.sup*0.5)).slice(0,90);
    for(const o of cand) if(!posOf.has(o.pc.id)){ posOf.set(o.pc.id,pool.length); pool.push(o); }
    const lockSet=new Set(lockIds);
    for(const st of starts){
      let cur=st, curEv=null;
      { const tm=cur.map(i=>pool[i]); curEv=evalTeam(tm.map(o=>o.pc),tm.map(o=>o.prog),enemy,S,cap,ctx); }
      let curSc=scoreOf(BR(curEv),curEv.sustain,curEv.surv);
      for(let pass=0;pass<4;pass++){ // 한 명씩 바꾸기를 더 나아지지 않을 때까지(최대 4번)
        let best=null;
        for(let k=0;k<4;k++){
          if(lockSet.has(pool[cur[k]].pc.id)) continue;
          for(const o of cand){
            const pi=posOf.get(o.pc.id); if(cur.includes(pi)) continue;
            const nt=cur.slice(); nt[k]=pi;
            const key=nt.map(i=>pool[i].pc.id).sort().join(); if(seen.has(key)) continue; seen.set(key, teams.length);
            const tm=nt.map(i=>pool[i]); if(dupBase(tm.map(x=>x.pc))) continue;
            const ev=evalTeam(tm.map(x=>x.pc),tm.map(x=>x.prog),enemy,S,cap,ctx);
            teams.push(nt); raws.push(BR(ev), ev.sustain, ev.surv);
            const sc=scoreOf(BR(ev),ev.sustain,ev.surv); if(sc>curSc+1e-9 && (!best||sc>best.sc)) best={nt,sc};
            if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r=>setTimeout(r,0)); }
          }
        }
        if(!best) break; cur=best.nt; curSc=best.sc;
      }
    }
    // 마무리: 지금까지의 상위 5개 조합에서 다시 한 명씩 바꿔 보기 (상위가 더 나아지지 않을 때까지, 최대 3번)
    const scI = i=>scoreOf(raws[3*i],raws[3*i+1],raws[3*i+2]);
    for(let round=0; round<3; round++){
      const top5 = teams.map((_,i)=>i).sort((a,b)=>scI(b)-scI(a)).slice(0,5);
      let improved=false;
      for(const ti of top5){
        const cur=teams[ti], curSc=scI(ti);
        for(let k=0;k<4;k++){
          if(lockSet.has(pool[cur[k]].pc.id)) continue;
          for(const o of cand){
            const pi=posOf.get(o.pc.id); if(cur.includes(pi)) continue;
            const nt=cur.slice(); nt[k]=pi;
            const key=nt.map(i=>pool[i].pc.id).sort().join(); if(seen.has(key)) continue; seen.set(key, teams.length);
            const tm=nt.map(i=>pool[i]); if(dupBase(tm.map(x=>x.pc))) continue;
            const ev=evalTeam(tm.map(x=>x.pc),tm.map(x=>x.prog),enemy,S,cap,ctx);
            teams.push(nt); raws.push(BR(ev), ev.sustain, ev.surv);
            if(scoreOf(BR(ev),ev.sustain,ev.surv)>curSc+1e-9) improved=true;
            if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r=>setTimeout(r,0)); }
          }
        }
      }
      if(!improved) break;
    }
    for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[3*i]); ms=Math.max(ms,raws[3*i+1]); mt=Math.max(mt,raws[3*i+2]); }
  }
  if(onProgress) onProgress(1);
  const scored = [];
  const maxLv = input.maxDiff||4;
  for(let i=0;i<teams.length;i++){
    if(maxLv<4){ const d=teamDifficulty(teams[i].map(k=>pool[k].pc)); if(d.lv>maxLv) continue; }
    if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue;
    const b=raws[3*i]/mb, s=raws[3*i+1]/ms, t=raws[3*i+2]/mt;
    let sc = w.b*b + w.s*s + w.t*t;
    if(mode==='sustain'||mode==='weak'||mode==='opener') sc *= (t<0.25?0.85:1);
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
    const reserves = fixedBack.concat(own.filter(o=>!inTeam.has(o.pc.id) && !baseIn.has(o.pc.base||o.pc.id)).map(o=>({o, v:survival(team.concat([o.pc]),progs.concat([o.prog]),ev.A&&ev.A.bud).score - ev.surv + (o.pc.sup.revive?3:0) + (mw && o.pc.pers.has(mw) ? 8 + ((o.prog&&o.prog.slots)||3) : 0) + (needComp && compM(o.pc) ? 100 : 0)}))
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
    for(const i of L){ if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue; const b=raws[3*i]/mb, s=raws[3*i+1]/ms, tt=raws[3*i+2]/mt; let sc=w.b*b+w.s*s+w.t*tt; if((mode==='sustain'||mode==='weak') && tt<0.25) sc*=0.85; if(maxLv<4 && teamDifficulty(teams[i].map(k=>pool[k].pc)).lv>maxLv) continue; if(sc>bs){ bs=sc; bi=i; } }
    if(bi>=0){ const team=teams[bi].map(k=>pool[k].pc), progs=teams[bi].map(k=>pool[k].prog); const ev=evalTeam(team,progs,enemy,S,cap,ctx); const rv=pickReserves(team,progs,ev);
      decks.push({focus:FOCL[fi], team, progs, ev, reserves:rv.reserves, fixedBack:new Set(rv.fixedBack.map(c=>c.id)), score:bs, rel:bs/topScore, norm:{b:BR(ev)/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:needPenalty(ev,boss).miss, recCount:team.filter(t=>recSet.has(t.id)).length, diff:teamDifficulty(team)}); } });
  decks.sort((a,b)=>b.score-a.score);
  return {results, decks, evaluated:teams.length, poolSize:pool.length, pool:pool.map(o=>o.pc.id), weights:w, focus:ctx.focus};
}

/* ---------- 캐릭터별 최적 조합 ---------- */
async function perCharBest(input, onProgress){
  const {owned, excluded=[], backLocked=[], mode, enemy, boss, settings, recommendedIds=[]} = input;
  const S = Object.assign({}, DEFAULT_SETTINGS, settings||{});
  const ctx = buildCtx(input, owned);
  ctx.mode = mode;
  if(mode==='opener' || mode==='weak' || mode==='boss' || mode==='kesshitsu' || mode==='custom') ctx.timeline = true; // 실전(N턴 총딜)의 1턴은 속도·선제 순서
  const cap = input.cap, maxLv = input.maxDiff||4;
  if(mode==='burst') ctx.dummyFast = true; // 1단계 어림 → 캐릭터마다 상위 후보만 행동 단위 시뮬레이션
  const ex = new Set(excluded.concat(backLocked));
  const own = owned.filter(o=>!ex.has(o.pc.id));
  if(own.length<4) return {error:'보유 캐릭터가 4명 이상 필요합니다.'};
  let pool = buildPool(own, [], {enemy,S,cap,ctx,mode});
  const maxD = Math.max(1e-9, ...pool.map(o=>o.pot.dps));
  pool = pool.sort((a,b)=>(b.pot.dps/maxD + b.pot.sup*0.3 + (mode==='stability'?b.pot.surv*0.02:0))-(a.pot.dps/maxD + a.pot.sup*0.3 + (mode==='stability'?a.pot.surv*0.02:0))).slice(0,36);
  const w = modeWeights(mode, boss, input.weights), recSet = new Set(recommendedIds);
  const idxOf = new Map(own.map((o,i)=>[o.pc.id,i]));
  const T=[], R=[]; // T: 멤버 인덱스(own 기준) 4개씩, R: burst,sustain,surv,penalty,diffLv
  const record = (mem)=>{
    const team=mem.map(o=>o.pc), progs=mem.map(o=>o.prog);
    if(dupBase(team)) return null;
    const ev=evalTeam(team,progs,enemy,S,cap,ctx);
    let pen=1;
    if(mode==='boss') pen = needPenalty(ev,boss).f * (1+0.06*team.filter(c=>recSet.has(c.id)).length);
    T.push(...mem.map(o=>idxOf.get(o.pc.id)));
    R.push(mode==='opener'?ev.opener:mode==='burst'?ev.dummyT:ev.burst, ev.sustain, ev.surv, pen, teamDifficulty(team).lv);
    return ev;
  };
  const n=pool.length; let total = n*(n-1)*(n-2)*(n-3)/24;
  const outsiders = own.filter(o=>!pool.some(p=>p.pc.id===o.pc.id));
  const partners = pool.slice(0,14);
  total += outsiders.length * (partners.length*(partners.length-1)*(partners.length-2)/6);
  let done=0, last=Date.now();
  const tick = async()=>{ done++; if(Date.now()-last>40){ last=Date.now(); if(onProgress) onProgress(done/total); await new Promise(r=>setTimeout(r,0)); } };
  for(const cmb of combos(n,4)){ record(cmb.map(k=>pool[k])); await tick(); }
  for(const o of outsiders){
    const ps = partners.filter(p=>p.pc.id!==o.pc.id);
    for(const cmb of combos(ps.length,3)){ record([o].concat(cmb.map(k=>ps[k]))); await tick(); }
  }
  const N = R.length/5;
  if(ctx.dummyFast){ // 2단계: 캐릭터마다 어림 상위 6개 조합만 허수아비 1턴 AF를 다시 계산
    ctx.dummyFast = false;
    const K=10, cand=own.map(()=>[]);
    for(let i=0;i<N;i++){ if(R[5*i+4]>maxLv) continue; const v=R[5*i];
      for(let j=0;j<4;j++){ const L=cand[T[4*i+j]]; if(L.length<K || v>L[L.length-1][0]){ if(L.length>=K) L.pop(); L.push([v,i]); L.sort((a,b)=>b[0]-a[0]); } } }
    const redo=new Set(); cand.forEach(L=>L.forEach(x=>redo.add(x[1])));
    for(const i of redo){ const mem=[0,1,2,3].map(j=>own[T[4*i+j]]); const ev=evalTeam(mem.map(m=>m.pc), mem.map(m=>m.prog), enemy, S, cap, ctx); R[5*i]=ev.dummyT; await tick(); }
    for(let i=0;i<N;i++) if(!redo.has(i)) R[5*i]*=0.5;
  }
  let mb=1e-9, ms=1e-9, mt=1e-9;
  for(let i=0;i<N;i++){ mb=Math.max(mb,R[5*i]); ms=Math.max(ms,R[5*i+1]); mt=Math.max(mt,R[5*i+2]); }
  const bestSc = new Float64Array(own.length).fill(-1), bestI = new Int32Array(own.length).fill(-1);
  for(let i=0;i<N;i++){
    if(R[5*i+4]>maxLv) continue;
    const b=R[5*i]/mb, sv=R[5*i+1]/ms, t=R[5*i+2]/mt;
    let sc = w.b*b + w.s*sv + w.t*t;
    if(mode==='sustain'||mode==='weak'||mode==='opener') sc *= (t<0.25?0.85:1);
    sc *= R[5*i+3];
    for(let j=0;j<4;j++){ const k=T[4*i+j]; if(sc>bestSc[k]){ bestSc[k]=sc; bestI[k]=i; } }
  }
  let top=1e-9; for(const v of bestSc) top=Math.max(top,v);
  const list = own.map((o,k)=>{
    if(bestI[k]<0) return {pc:o.pc, none:true};
    const i=bestI[k]; const mem=[0,1,2,3].map(j=>own[T[4*i+j]]);
    const team=mem.map(m=>m.pc), progs=mem.map(m=>m.prog);
    return {pc:o.pc, score:bestSc[k], rel:bestSc[k]/top, team, progs, ev:evalTeam(team,progs,enemy,S,cap,ctx), diff:teamDifficulty(team)};
  }).sort((a,b)=>(b.score||0)-(a.score||0));
  return {list, evaluated:N, poolSize:pool.length};
}

const API = {hitInfo, dingHit, dingCap, G5_OF, GEAR_STD, GEAR_FX, ELEMS,WTYPES,WEAPON_TYPE,ELEM_KR,WT_KR,WEAPON_KR,ZONE_KR,DEFAULT_SETTINGS,SPECIAL_GRASTA,MANIFEST,
  prepChar, charProg, grastaFactor, parseZoneCond, reqText, teamDifficulty, DIFF_LV, evalTeam, computeCap, optimize, perCharBest, survival, zoneCandidates, multihitAvg, dimin,
  explainTeam, charFocusMatch, compileRules, simTeam, PERS_KR, buildCtx, WEAPON_PERS, SIZE_TABLE, SIZE_IDX, turnTimeline, inflictOf,
  statsAt, charStats, STAT_ORDER, isBuilderDefault, gearSpdOf, GEAR_SPD_AUTO, dupBase};
if(typeof module!=='undefined' && module.exports) module.exports = API; else root.AEOpt = API;
})(typeof window!=='undefined'?window:globalThis);
