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
const ZONE_KR = {all_weapon:'섬격진', guard:'견수진', chaos:'혼돈진', moonlight:'월광진', thunder_shade_crystal:'월광진', '星海陣':'성해진', fire:'열화진',water:'수천진',earth:'지열진',wind:'풍왕진',thunder:'초뢰진',shade:'각음진',crystal:'휘정진',
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
  afTotalCap: 999999999999, // 실전 AF 한 번(AF 안 SB 포함) 총 피해 상한 9999억 9999만(사용자 확인 2026-10-20: 실전 AF는 9999억으로 표시·피통 9999억 넘는 보스 없음, 허수아비는 조 단위라 상한 없음) — 0이면 없음
  lifeCarryN: true,    // 평상 턴 피해는 목숨을 넘어 다음 목숨으로, AF는 목숨 하나(AF 뒤 요격·체인·턴 종료 공격은 다음 목숨에) — 사용자 확인 2026-10-19
  capAfterCombo: false, // true면 AF 콤보를 곱한 뒤 25억 경감(game-info 위키 순서). 2026-10-19 사용자 확인: AF 중 99.99억이 자주 나와 지금 순서(경감 → ×콤보 → 99.99억)가 맞음
  capAbs: 9999999999,  // 1타 대미지 상한 (100억-1)
  statK: 22000,        // 스탯 환산 계수: 상대값 1 = 실제 대미지 약 statK (완력·무기 공격 기준 기본 대미지)
  zoneElem: [1.5, 2.0, 2.0],   // 속성 존: 일반 / 극(어나더 존) / 절(극과 같음)
  zoneWeap: [1.3, 1.6, 1.6],   // 공격종 존
  zoneOppElem: 0.5, zoneOffWeap: 0.7, zoneOffGoku2: true, // zoneOffGoku2: 극 무기 존의 다른 타입 −60(딩 코어) — false면 −30(game-info·알테마: 극은 맞는 쪽만 +60)
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
  gearQ: 1,          // 장비 세팅(2026-10-20 사용자 '천명 200 이상에 세팅 좋으면 맥뎀 — 아니면 AF딜 위주'): 빌드 코드가 없는 캐릭터의 대미지 = 무기종 최적 빌드(GEAR_STD·GEAR_FX) × 이 값(보유 탭 육성 수준 '장비 세팅')
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

const ZKEYS = ['fire','water','earth','wind','thunder','shade','crystal','slash','pierce','blunt','magic','slash_pierce','slash_magic','starsea','stellar_sea','星海陣','all_weapon','moonlight','thunder_shade_crystal','guard','chaos'];
/* ---------- 존 종류 정규화 ---------- */
/* 星海陣(2026-10-19 game-info 'ZONE・応援効果まとめ' 1-2-16·'ダメージ計算の仕様' 2-26): AF 게이지 100%일 때 모든 공격 ×2, 100% 미만이면 AF를 못 켬, 행동당 AF 게이지 7.5%
   (S.starseaZone=false면 끔), 100%에서 켠 AF의 공격도 내내 ×2(위키 — 딩 코어는 'AF 게이지 100%일 때만'이라 AF 진행 중은 다루지 않음, 예전 'AF 중 없음'은 우리가 붙인 해석). S.starseaAF=false면 AF ×1 */
const isSS = z => !!(z && z.kind==='all' && (z.key==='starsea' || z.key==='stellar_sea' || z.key==='星海陣') && z.level>0);
const ZT_ALIAS = {starsea:'all', stellar_sea:'all', '星海陣':'all', all_weapon:'all', moonlight:'moon', thunder_shade_crystal:'moon', guard:'all', '堅守陣':'all', chaos:'all', '混沌陣':'all'};
/* 堅守陣(애쉬티어·아나벨(ES) 冥): 모든 공격 ×0.5·행동당 AF 게이지 7.5%, 混沌陣(보스 전용 기믹 — 星詠みの書架 혼돈): 화·수·지·풍 ×1.75·AF 게이지 전부 1.5%(game-info ZONE・応援効果まとめ 1-2-17·18, 2026-10-19) */
const ZK_ALL = {'堅守陣':'guard', '混沌陣':'chaos'};
function zoneOpt(t){
  if(ELEMS.includes(t) && t!=='none') return {kind:'elem', types:[t], key:t};
  if(WTYPES.includes(t)) return {kind:'weap', types:[t], key:t};
  if(t==='slash_pierce') return {kind:'weap', types:['slash','pierce'], key:t};
  if(t==='slash_magic') return {kind:'weap', types:['slash','magic'], key:t};
  if(ZT_ALIAS[t]==='all') return {kind:'all', types:[], key:ZK_ALL[t]||t};
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
/* 유니즌(2026-10-16 사용자 확인: 미스트레아는 전열에 다른 歌唱 캐릭터가 歌唱 중일 때 エルの唄가 エルの唄・ユニゾン으로 바뀌고, 재공격·AF 콤보 2배는 ユニゾン 중만):
   self_buff.unison {req: 전열 다른 가창 캐릭터(tag singer)} 충족 + 그 변형에서 끄지 않음(progs uniOff = 다른 가창보다 먼저 혼자 歌唱하는 운용, evalTeam이 둘 다 계산) */
/* 가창 중(행동 불가)인지: 가창 데이터가 있고, 주력이 가창 턴 종료 공격이 아니고(그쪽은 평상 턴 그대로), 가창을 안 쓰는 변형(songOff)이 아니고, 유니즌(가창 아님)이 아닐 때 */
function songOn(c, team, pr){ return !!(c && c.song && !c.song.main && !(pr && pr.songOff) && !(c.song.uni && uniOn(c, team, pr))); }
function uniOn(c, team, pr){ const q = c && c.self && c.self.unison; return !!(q && typeof q==='object' && reqMet(q.req, team, c) && !(pr && pr.uniOff)); }
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
  else if(req.kind==='tag') n = pool.filter(m=>req.vals.some(v=>(m.tags||[]).includes(v))).length; // 캐릭터 태그(singer = 歌唱 상태가 되는 캐릭터, 2026-10-16)
  else if(req.kind==='nodup'){ const L = pool.flatMap(m=>m.persEl||m.elems||[]); n = new Set(L).size===L.length ? pool.length : 0; } // 전열 속성 퍼스널리티가 서로 안 겹침(뮤르스(ES) ラビットストライク, 2026-10-16) — 겹치면 0
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
  if(sit==='normal'){ if(A.stkT>0) return A.stkT>1 ? f : 0; const H = Math.max(1, (A.tm && A.tm.H) || 6); return f*(H-1)/H; } // 누적 예열(A.stkT): 그 턴 값 — 1턴째는 아직 없음
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
  if(req.kind==='nodup') return '전방 속성 퍼스널리티 중복 없음';
  const nm = req.kind==='elem' ? req.vals.map(v=>ELEM_KR[v]).join('·')+' 속성'
    : req.kind==='weap' ? req.vals.map(v=>WEAPON_KR[v]).join('·')
    : req.kind==='align' ? (req.vals[0]==='light'?'천':'명')+' 캐릭터'
    : req.kind==='kof' ? 'KOF 콜라보' : req.kind==='name' ? req.vals.join('·') : req.kind==='pers' ? req.vals.map(v=>PERS_KR[v]||v).join('·')+' 퍼스널리티'
    : req.kind==='distinct' ? req.vals.map(v=>ELEM_KR[v]).join('/')+' 서로 다른' : req.kind==='tag' ? req.vals.map(v=>({singer:'가창'}[v]||v)).join('·')+' 캐릭터' : '특정 퍼스널리티';
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
const KB0 = new Map(), kBase = k => { let b = KB0.get(k); if(b===undefined){ const i = k.indexOf(':'); b = i>0 ? k.slice(0, i) : k; KB0.set(k, b); } return b; }; // 'elem_atk:fire' → 'elem_atk' (split 반복 할당 없이, 2026-10-17 계산 속도)
/* 디버프 규칙 그룹 (적에게 거는 것이라 받는 사람 조건 to는 쓰지 않음, '*'에 들어가지 않음) */
const DG = { allres:['d_all_elem_res'], elres:['d_elem_res'], res:['d_all_elem_res','d_elem_res'], pres:['d_phys_res','d_mag_res'], wres:['d_weapon_res'], def:['d_end','d_spr'] };
const DEBF = [...new Set(Object.values(DG).flat())];
function compileRules(c){
  const p = c.party_buff||{};
  let rules = Array.isArray(c.party_rules) ? c.party_rules.slice() : [];
  if(!rules.length && p.scope==='adjacent') rules=[{f:['*'],to:{pos:'adj'}}];
  if(!rules.length && (p.scope==='left'||p.scope==='right')) rules=[{f:['*'],to:{pos:'one',side:p.scope==='left'?'l':'r'}}];
  const drules = Array.isArray(c.debuff_rules) ? c.debuff_rules.map(r=>({...r, ...{deb:true}})) : [];
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
    list.push({fs:[...fs], to, w, x:r.x!=null?r.x:1, e:r.e!=null?r.e:0, en:r.en!=null?r.en:null, me:!!r.me, pos:to.pos||null, side:to.side||null, deb:!!r.deb, sbAll:!!r.sb_all, note:(r.note_ko||r.note) ? String(r.note_ko||r.note).split(' — ')[0] : ''});
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
  if(w.uni!=null && uniOn(team[j], team, progs[j])!==!!w.uni) return 0; // 유니즌 중(미스트레아 エルの唄・ユニゾン) 여부
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
    if(consume){ const avg = Math.max(Math.min(1, s0), Math.min(1, 2/Math.max(2,need))); // 다 쓰고 다시 모으는 한 방: 평상 턴엔 주기마다
      if(A.stkT>0 && A.stkT-0.5 < (1-s0)*Math.max(2,need)/2) return Math.min(1, s0); // 누적 예열: 평균 2/turns = 한 방 주기 turns/2턴 → 처음 가득 차기 전 턴엔 개전 축적만큼(첫 한 방이 늦음)
      return avg; }
    if(A.stkT>0) return Math.min(1, s0 + Math.max(0, A.stkT-0.5)/need); // 누적 예열: 그 턴 공격 때 쌓인 만큼(턴 중간)
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
    if(sit==='normal'){ const n = cl(f.n); if(A.stkT>0 && n<0.99 && !f.flat){ const H = Math.max(1, (A.tm && A.tm.H) || 6), s0 = cl(f.s0); return cl(s0 + 2*(n-s0)*A.stkT/(H+1)); } return n; } // 누적 예열: 평균 n이 되도록 개전 s0에서 직선(n<s0면 줄어듦, flat이면 늘 n)
    const a = sit==='sb' ? cl(f.sb!=null ? f.sb : f.af) : cl(f.af), r = sit==='sb' ? cl(f.sbr!=null ? f.sbr : (f.real!=null ? f.real : f.sb)) : cl(f.real!=null ? f.real : f.af);
    return a + (r-a)*w; }
  const tm = A.tm || {S0:2, H:6}, use = +st.use||0, max = Math.max(1, +st.max||1), st0 = +st.start||0;
  const tg = (+st.turn||0) * (st.turnReq ? (reqMet(st.turnReq, team, null) ? 1 : 0) : 1) * (st.turnPer ? frontCount(st.turnPer, team) : 1); // turnPer: 턴마다 전열의 그 조건 인원수만큼(멜로디(AS) デザイア)
  const at = (turnsDone, acts) => Math.min(1, (st0 + turnsDone*tg + acts*use)/max);
  if(sit==='normal'){ if(A.stkT>0) return at(A.stkT-1, A.stkT-0.5); let v=0; const H=Math.max(1,tm.H||6); for(let t=1;t<=H;t++) v+=at(t-1, t); return v/H; } // 누적 예열: 그 턴 값
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
  if(to.any && !to.any.some(q=>toFilterOK(q, m))) return false; // OR 조건(2026-10-16 로키드 夜叉鬼神拳: 天 또는 魔獣 퍼스널리티)
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
// 규칙 있는 캐릭터의 행 캐시(2026-10-17 계산 속도): 같은 평가 안에서 존·상황만 다르고 규칙 발동값·마스크가 같으면 같은 행 — 키 = 조합·주는 사람·상황·SB 뒤·마스크·위치 집합·규칙별 발동값
const BF_R = new Map(), OID = new WeakMap(); let oidN = 0;
// FX 행 값 읽기(2026-10-17 계산 속도): 버프 행동 마스크·유지율은 행마다 굽지 않고 f.mkA(항목별)·f.mkB(':' 항목은 앞부분 키)로 따로 둠. 없는 칸은 undefined(= 1로 읽음)
function rowV(f, idx, k){ const v = f.rows[idx][k], m = f.mkA; if(!m) return v;
  const mv = m[k]; if(mv!==undefined) return (k==='weak_x' || k==='brk_x') ? mv : (v==null?1:v)*mv;
  return v!=null && k.indexOf(':')>0 ? v*f.mkB(kBase(k)) : v; }
const oidOf = o => { if(o==null || typeof o!=='object') return String(o); let v = OID.get(o); if(!v){ v = ++oidN; OID.set(o, v); } return '#'+v; };
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
    const L=R.list, acts = new Array(L.length);
    let ck = ''; for(const c of team) ck += c.id+',';
    ck += j+'|'+sit+'|'+(A.postSB?1:0)+'|'+(um ? oidOf(um) : mf ? oidOf(mf) : u)+'|'+(debToo?1:0)+'|'+oidOf(posSets && posSets[j]);
    for(let ri=0;ri<L.length;ri++){ acts[ri] = ruleAct(L[ri],j,team,progs,sit,z,A); ck += '|'+acts[ri]; }
    const hit = BF_R.get(ck); if(hit) return hit;
    const rows=[]; for(let i=0;i<n;i++) rows.push({});
    for(let ri=0;ri<L.length;ri++){
      const r=L[ri];
      const a = acts[ri];
      const ps = posSets&&posSets[j] ? posSets[j][ri] : null;
      for(let i=0;i<n;i++){
        let v;
        if(r.me && i===j) v=r.x;
        else {
          let t=0;
          if(a>0){ t = r.pos ? ((ps&&ps.has(i)) || (r.sbAll && (sit==='sb' || (sit==='af' && A.postSB))) ? 1 : 0) : 1; if(t && !r.pos && !toFilterOK(r.to, team[i])) t=0; if(t && r.to.p!=null) t*=r.to.p; } // sb_all: 위치 규칙(1명)이 SB 때(그 AF의 남은 행동 포함)는 전원(알마(AS) カレイドスコープ)
          const e0 = (sit==='normal' && r.en!=null) ? r.en : r.e; // en: 평상 턴에만 쓰는 미충족 배율 (지속 턴이 짧은 경우)
          v = e0 + a*t*(r.x-e0);
        }
        if(v===1) continue;
        const row=rows[i]; for(const k of r.fs) row[k]=(row[k]==null?1:row[k])*v;
      }
    }
    FX[0]={rows, zel:R.zel}; if(um) FX[0].sm = um; else if(mf) FX[0].smf = mf; else if(u<1) FX[0].su = u;
    if(um||mf||u<1){ const g = (um||mf) ? mk : ()=>u, mA = Object.create(null); mA.weak_x = g('weak'); mA.brk_x = g('brk'); for(const k of ALLF) mA[k] = g(k); if(debToo) for(const k of DEBF) mA[k] = g(k); FX[0].mkA = mA; FX[0].mkB = g; } // 읽을 때 rowV가 곱함
    if(BF_R.size>6000) BF_R.clear(); BF_R.set(ck, FX[0]);
  }
  return FX[0];
}

/* ---------- 캐릭터 전처리 ---------- */
const SRC_R = {auto:0, main:1, step:2, sb:3, vc:4};
const VC_RE = /ヴァリアブルチャント|^VC/, VC_UP = 1/6, vcUp = (b, x) => Math.min(1, VC_UP*Math.max(1, (b && b.vcDur && b.vcDur[x]) || 1)); // VC(교대 시 발동, 1턴): 평상 턴 6턴 중 1턴, AF·SB·허수아비엔 없음(2026-10-16 점검: 약 140명이 '개전 자동'으로 늘 켜져 있었음)
function skillPow(sk){
  if(!sk) return 0;
  const tgt = sk.target==='st'?'st':'aoe', kind = sk.kind==='mag'?'mag':'phys', el=(sk.element||'none')==='none'?'no':'el';
  const sv = (SIZE_TABLE[tgt+'_'+kind+'_'+el]||SIZE_TABLE.aoe_phys_el)[SIZE_IDX[sk.size]??3]/100;
  let m = Math.max(sk.mult||1,1);
  if(sk.mcond){ const b=Math.max(0.1, sk.mcond.base!=null?+sk.mcond.base:1); m = b + (m-b)*0.6; }
  else if(isCharge(sk.condition) && m>=30){ m*=0.4; if(m>25) m=25+(m-25)*0.2; }
  const rp = sk.repeat || (sk.self_on && sk.self_on.on ? (+sk.self_on.on.repeat||0)*0.5 : 0); // 상태 중에만 재공격(self_on)은 절반으로 어림
  return sv*m*(1+rp*0.7); // 크기×배율 = 스킬 전체 위력(타수 합)
}
function prepChar(c){
  // 요격 세팅 스킬이 주력기로 잡힌 경우: 반격 화력은 요격으로 따로 세므로 주력기 자체 배율은 1로
  if(c.counter && c.main && /요격|迎撃/.test((c.main.skill||'')+(c.main.condition||''))) c = ({...c, ...{main: ({...c.main, ...{mult:1, mcond:null}})}});
  const p = c.party_buff||{}, s=c.self_buff||{}, d=c.debuff||{}, sp=c.support||{};
  const wt = WEAPON_TYPE[c.weapon]||'slash';
  const zone = c.zone && c.zone.type && !c.zone.late ? c.zone : null; // late: 전투 몇 턴 뒤에야 펼 수 있는 존(펠미나(ES) 氷爆符 50) — 실전 3턴·지속 계산에선 없음
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
    mainAlt: c.main && c.main.uses && c.main.alt ? ({...c.main, ...c.main.alt, ...{alt:null, uses:null}}) : null,
    self:s, party:p, deb:d, tags:c.tags||[], teishin: !!c.teishin,
    affSwap: c.aff_swap ? {t: +c.aff_swap.t||99, from: +c.aff_swap.from||2} : null, // 적 내성↔약점 교환(data/aff_swap.json)
    song: c.song ? {t: Math.max(1, +c.song.t||3), main: !!c.song.main, uni: !!c.song.uni} : null, // 가창(2026-10-18 사용자 확인: 가창 중엔 평상 턴·AF 행동 불가, SB는 가능)
    selfPowK: (L=>L.length?L:null)(Object.keys(s).filter(k=>s[k] && typeof s[k]==='object' && +s[k].pow>0)), // 상태 중 모든 스킬 위력 배율(ユニゾン)
    // AF 버프·디버프 행동(buff_acts.json): auto·main·sb 항목 묶음 + buff/attack 행동 목록(순서대로). 데이터에 있는데 행동에 없는 항목은 main
    bact: (()=>{ const L0 = Array.isArray(c.bact) ? c.bact : null; if(!L0) return null; const mkB = L => {
      const key = g => g.indexOf('party.')===0 ? g.slice(6) : g.indexOf('self.')===0 ? 's.'+g.slice(5) : g==='debuff.break' ? 'brk' : g==='debuff.weak_expose' ? 'weak' : g.indexOf('debuff.')===0 ? 'd_'+g.slice(7) : null;
      const auto=new Set(), main=new Set(), sb=new Set(), vc=new Set(), sb1=new Set(), steps=[], seen=new Set(), selfSrc={}, vcDur={}; let zActs = null, mainActs = 0, mainActK = null;
      for(const a of L){ const g=(a.g||[]).map(key).filter(Boolean);
        if(c.echange && c.echange.skill && a.s===c.echange.skill) g.push('echg'); // 속성 변환(変幻自在 등)도 그 스킬의 항목(2026-10-16: 실전·지속 계산에서 칸·행동 없이 늘 켜져 있던 문제)
        if(c.counter && c.counter.skill && a.s===c.counter.skill) g.push('ctr'); // 요격을 거는 스킬(알마(AS) リフレクトバレット 3턴): 장착·사용해야 요격(2026-10-16)
        if(Array.isArray(c.turn_end)) c.turn_end.forEach((te,q)=>{ if(te && te.act && skN(a.s)===skN(te.act)) g.push('te'+q); }); // 턴 종료 공격을 거는 스킬(쿠치나와 滅呪之印 등): 장착·사용해야(2026-10-16 점검3)
        if(!g.length && !a.z) continue; g.forEach(x=>seen.add(x));
        const isVC = a.k==='auto' && VC_RE.test(String(a.s||''));
        for(const x of g) if(x.indexOf('s.')===0){ const q = x.slice(2), kk = isVC ? 'vc' : a.k==='buff'||a.k==='attack' ? 'step' : a.k; if(!selfSrc[q] || SRC_R[kk] < SRC_R[selfSrc[q]]) selfSrc[q] = kk; }
        if(isVC){ g.forEach(x=>{ vc.add(x); if(+a.dur>1) vcDur[x] = Math.max(vcDur[x]||1, +a.dur); }); continue; } // VC 지속 턴(dur, 알마 자신 완력 3턴): 평상 턴 VC_UP×dur
        if(a.k==='sb' && +a.dur>0 && +a.dur<=1) g.forEach(x=>sb1.add(x)); // SB 그 턴만(ターン終了まで): 평상 턴에 안 남음 // 자기 버프 출처(여럿이면 auto > main > 행동 > sb 순으로 먼저 켜지는 쪽)
        if(a.k==='auto') g.forEach(x=>auto.add(x)); else if(a.k==='main'){ g.forEach(x=>main.add(x)); if(+a.acts>0){ mainActs = Math.max(mainActs, +a.acts); mainActK = (mainActK||[]).concat(g.filter(x=>x.indexOf('s.')===0).map(x=>x.slice(2))); } } else if(a.k==='sb') g.forEach(x=>sb.add(x));
        else if(a.k==='buff'||a.k==='attack') steps.push({k:a.k, g:new Set(g), h:+a.h||0, s:a.s||'', sko:a.sko||null, song: c.song && !c.song.main && (c.song.s||[]).some(n=>n && String(a.s||'').includes(n)) ? Math.max(1, +c.song.t||3) : 0, /* 가창 행동(data/song.json): 쓰면 t턴 동안 가창자는 행동 불가 */ mp:+a.mp||0, mp0: a.mp===0, na:!!a.na, once:!!a.once, dur:+a.dur||0, z:a.z||null, zk:a.zk||null, zlv:+a.lv||0, zreq:a.req ? (typeof a.req==='string' ? parseReq(a.req) : a.req) : null,
          pw: a.k==='attack' && a.size ? {el:a.el||null, wt:a.wt||null, size:a.size, mult:a.mult!=null?+a.mult:1, hits:+a.hits||+a.h||1, afx:+a.afx||1} : null}); // pw: 공격 버프기 위력(2026-10-15 전수 대조), z: 존 전개/각성 행동
        if(a.z && (a.k==='main' || a.k==='auto' || a.k==='sb')) (zActs = zActs || []).push({k:a.k, z:a.z, s:a.s||'', zk:a.zk||null, zlv:+a.lv||0, zreq:a.req ? (typeof a.req==='string' ? parseReq(a.req) : a.req) : null}); }
      const nzv = v => typeof v==='number' ? v>0 : v && typeof v==='object' ? Object.values(v).some(nzv) : !!v;
      for(const k in p) if(k!=='scope' && k!=='restrict' && nzv(p[k]) && !seen.has(k)) main.add(k);
      for(const k in d) if(nzv(d[k])){ const kk = k==='break' ? 'brk' : k==='weak_expose' ? 'weak' : 'd_'+k; if(!seen.has(kk)) main.add(kk); }
      // 행동 점수(2026-10-16, 같은 이득일 때의 순서·존 전개가 쓸모없을 때의 순서): 존 전개·각성 > 대미지 버프·내성 디버프 > 독·페인 > 생존용(적 완력·지성·속도 DOWN)
      const MAJ = new Set(['echg','all_elem_atk','elem_atk','weapon_atk','pwr','int','crit_rate','crit_dmg','singular_focus','mental_focus','multihit','extra_hit','link','dmg_up','over_crit','overthrow','kesshi','shinan','teishin','mp_atk','weak_dmg','barrier_pierce','charge','d_all_elem_res','d_elem_res','d_phys_res','d_mag_res','d_weapon_res','d_end','d_spr','weak','brk']);
      const SURV = new Set(['d_pwr','d_int','d_spd']), isDps = (c.roles||[]).includes('dps');
      const score = st => { if(st.z) return 1000; let v = 0; for(const x0 of st.g){ const self = x0.indexOf('s.')===0, x = self ? x0.slice(2) : x0;
          v += SURV.has(x) ? 0.5 : x==='d_pain_poison' ? 4 : MAJ.has(x) ? (self ? (isDps ? 10 : 4) : 10) : (self ? 2 : 4); }
        if(st.k==='attack' && st.pw && st.pw.mult>=5) v += 3; return v; };
      steps.forEach((st,q)=>{ st.sc = score(st); st.sc2 = st.z ? score(({...st, ...{z:null}})) : st.sc; st.q = q; }); // sc2: 존 전개가 쓸모없는 편성에서의 순위
      // 기본 순서는 존 전개 먼저, 그다음 데이터 순서(무작위 60조합 비교: 항목 수 점수 순서보다 나음). 정밀 계산은 stepValues(실제 이득 순)
      steps.sort((x,y)=>(y.z?1:0)-(x.z?1:0) || x.q-y.q);
      const sbOnly = new Set([...sb].filter(x=>!main.has(x) && !auto.has(x) && !steps.some(st=>st.g.has(x)))); // SB로만 거는 항목
      const vcOnly = new Set([...vc].filter(x=>!main.has(x) && !auto.has(x) && !sb.has(x) && !steps.some(st=>st.g.has(x)))); // VC로만 거는 항목
      for(const x of vcOnly) main.delete(x);
      return {auto, main, sb, sbOnly, vcOnly, sb1: new Set([...sb1].filter(x=>sbOnly.has(x))), steps, selfSrc, selfKeys: Object.keys(selfSrc), vcDur, zActs, mainActs, mainActK: mainActK ? new Set(mainActK) : null}; };
      // aw:'auto'(2026-10-18 빙무의 가희 機略): 성도각성(스텔라 보드 어빌리티 획득)이면 개전 자동, 아니면 그 버프 행동 — 성도각성 안 한 쪽은 noAw로(evalTeam0이 바꿔 끼움)
      const B = mkB(L0.map(a=>a && a.aw==='auto' ? ({...a, k:'auto'}) : a)); if(L0.some(a=>a && a.aw==='auto')) B.noAw = mkB(L0); return B; })(),
    // 부활·전투불능 방지 등급(data/revive.json g, 0~3). 조사 밖이면 예전 true/false → 1/0
    sup: ({...sp, ...{revive: c.revive && c.revive.g!=null ? +c.revive.g : (sp.revive ? 1 : 0), reviveFx: (c.revive && c.revive.fx) || null}}),
    supTo: c.support_to || null, supSrc: c.support_src || null, play: c.play_kr || '',
    selfStk: c.self_stk || null, stk: prepStk(c.stacks, c.af_t), poSt: Array.isArray(c.states) && c.states.some(q=>q && Array.isArray(q.party_off) && q.party_off.length) ? c.states.slice(0,3).filter(q=>q && Array.isArray(q.party_off) && q.party_off.length) : null,
    stkAny: /"(stack|cnt)"/.test(JSON.stringify([c.self_stk||null, c.main&&c.main.mcond||null, c.sb&&c.sb.mcond||null, c.af_skill&&c.af_skill.mcond||null, c.sb_normal&&c.sb_normal.mcond||null, c.party_rules||null, c.debuff_rules||null]))
      || (Array.isArray(c.states) && c.states.some(q=>q && (+q.from>1 || (q.up==null && (+q.start>0 || +q.dur>0))))), // 기존 축적 조건(평상 턴 H턴 평균)·구간 상태 — 누적 예열에서 턴마다 다시
    stkRule: /"(stack|cnt)"/.test(JSON.stringify([c.party_rules||null, c.debuff_rules||null])), turnEnd: Array.isArray(c.turn_end) && c.turn_end.length ? c.turn_end : null,
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
      let u = x.on_main ? 1 : (x.turns>=99 ? 0.95 : x.turns>=3 ? 0.85 : x.turns>=1 ? 0.6 : 0.75); if(x.up!=null) u = +x.up; // up: 평상 턴 가동률 직접(개전 1회 3턴 = 0.5 등)
      const p = x.p!=null ? Math.max(0, Math.min(1, +x.p)) : 1, sp = x.split || {}, uOf = t => (sp[t] && sp[t].up!=null ? +sp[t].up : u) * p; // p: 걸릴 확률(카드 색 등), split: 독·페인을 다른 스킬로 거는 경우 종류별 {dummy, up}
      return {poison: x.poison?uOf('poison'):0, pain: x.pain?uOf('pain'):0, st: x.target==='st', when: x.dummy || (x.on_main ? 'main' : 'skill'),
        whenPo: sp.poison && sp.poison.dummy || null, whenPa: sp.pain && sp.pain.dummy || null, p, af: x.af!=null ? Math.max(0, Math.min(1, +x.af)) : 1, req: x.req || null, zone: x.zone || null, zlv: +x.zlv||0}; })(), // when: 허수아비 1턴에서 걸리는 시점(inflict.json dummy), af: 허수아비 AF에서 걸 수 있는 비율(AF 게이지 100%일 때만이면 0)
    selfDamage: (c.tags||[]).includes('self_damage'),
    chain: Array.isArray(c.chain) && c.chain.some(e=>e&&e.atk) ? c.chain.filter(e=>e&&e.atk) : null,
    echange: c.echange || null,
    counter: c.counter || null,
    afAnim: +c.af_anim > 0 ? +c.af_anim : null, // AF 중 스킬 연출 시간(초), 데이터 없으면 설정값
    afStartR: c.af_start || null, afRefillR: c.af_refill || null, afTurnR: c.af_turn || null, // afTurnR: 행동 밖 AF 게이지(턴 시작·종료 패시브, af_start.json _turn)
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
    _stv:false, _alt:false, _proxy:false, _chain:false, _sbN:false, _mkOn:null, // 계산 중 복사본에 붙는 표시 — 처음부터 두어 복사본도 같은 모양(V8 hidden class)으로(2026-10-17 계산 속도)
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
  if(own && S && S.lvMode==='80' && own.s) own = ({...own, ...{s:false}}); // 뉴비: 전원 Lv80 = 성도각성 없음
  if(own && S && S.glLocked) own = ({...own, ...{g:'none', gl:{mode:'none'}}}); // 뉴비: 글래스터 미개방
  const t = own ? (+own.t||0) : 0;
  let f = 1, sbOK = false, sbMul = 1;
  const slots = t>=200 ? 4 : 3;
  const gl = ({...(S&&S.grastaDefault)||DEFAULT_SETTINGS.grastaDefault, ...(own&&own.gl)||{}});
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
  if(!au) return zs; return zs.filter(q=>q===au || (q && q.level>0 && ((au.level<2 && q.level>=2) || q.brk || (q.level===3 && au.level===2 && q.key===au.key)))); // 같은 존의 絶 각성(ZONE覚醒強化 — 紫装の槍使い(AS) リチュアルクォーツ '地裂陣/極・地裂陣' 때)은 極 위에도(2026-10-19 알테마)
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
    const sw = ELEM_SWITCH[c.id] || (c.raw && c.raw.zone && c.raw.zone.switch); // zone.switch {need, yes, no}: 편성 조건으로 존 종류가 바뀜(테오도로스 プロボカティオ: 전열 拳·槌 퍼스널리티 3명이면 地裂陣 대신 轟打陣, 2026-10-16)
    if(sw){ const t = reqMet(sw.need, team, c) ? sw.yes : sw.no; optsList = [zoneOpt(t)]; }
    for(const o of optsList){
      const n = o.kind==='elem' ? team.filter(m=>m.elems.some(e=>o.types.includes(e))).length
        : o.kind==='weap' ? team.filter(m=>o.types.includes(m.wt)).length : 2;
      if(n>bn){ bn=n; best=o; }
    }
    if(!best) continue;
    if(best.kind==='all' && best.key==='all_weapon' && situation!=='t1') continue; // 閃撃陣은 전투 첫 턴만 (1턴 계산에서만) — 星海陣은 계속(2026-10-19: 예전엔 같은 kind 'all'이라 星海陣도 후보에서 빠졌음)
    // 일반 존 가능 여부
    const noVC = !!(c.zoneVC && progs && progs.noBack); // 후열이 없으면 VC(교대)로만 펴는 존은 못 폄(2026-10-16)
    let base = !noVC && (sp.base || (sp.baseReq && reqMet(sp.baseReq, team, c))) || (situation==='sb' && sp.baseSB && !(progs[i] && progs[i].sbOK===false));
    // 극존 경로
    let level = 0, how = '', zetsu=false; const unmet=[];
    for(const st of sp.starts){
      if(reqMet(st.req, team, c)){ level=2; how='개전 자동'; zetsu = zetsu||st.zetsu; break; }
      else unmet.push('개전 극존 조건 미충족: '+reqText(st.req));
    }
    if(level<2 && !noVC) for(const sk of sp.skillGoku){
      if(reqMet(sk.req, team, c)){ level=2; how = c.zone && c.zone.awaken_once ? '1회 각성' : '스킬 각성'; break; } // awaken_once: 전투 중 1회(루나틱 등) — 실전은 1·2턴째만 극(개전 자동처럼), 다시 각성 못 함(2026-10-16 점검3)
      else unmet.push('존 각성 조건 미충족: '+reqText(sk.req));
    }
    if(level<2 && situation==='sb' && sp.sbGoku && !(progs[i] && progs[i].sbOK===false)){ level=2; how='SB 시'; } // 성도 스킬을 안 달면(sbOff) SB 각성도 없음
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
      const aw = team.filter((m,k)=>k!==i && m.zoneAwAny && [].concat(m.zoneAwAny.kinds||[]).some(t=>t==='any' || t===best.kind || t===best.key)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)[0]; // 각성해 줄 아군이 둘이면 id 순(넣은 순서 무관, 2026-10-16) · kinds에 존 키(water 등)도(월화의 영애(AS) 水天陣만)
      if(aw) cands.push({kind:best.kind, types:best.types, key:best.key, level:2, by:c.id, byName:c.name, how:'타인 각성', once: !!(aw.raw && aw.raw.zone && aw.raw.zone.awaken_once), awBy:aw.id, awSkill:aw.zoneAwAny.skill||null, unmet:[], brk:false, label:'극·'+zname}); } // 전투 중 1회 각성기(루나틱)면 1회 각성
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
const zSort = L => L.slice().sort((a,b)=>((b&&b.level)||0)-((a&&a.level)||0) || String((a&&a.key)||'').localeCompare(String((b&&b.key)||'')) || String((a&&a.by)||'').localeCompare(String((b&&b.by)||'')));
const zBetter = (q, z) => q.level>z.level || (q.level===z.level && (String(q.key)<String(z.key) || (q.key===z.key && String(q.by||'')<String(z.by||''))));
function zoneAF(z, co, inAF){
  if(!z || !z.level || z.kind==='none') return null;
  const el=co.el, wt=co.wt, none = !el || el==='none';
  if(z.kind==='all'){ const k=z.key||''; return (k==='starsea'||k==='stellar_sea'||k==='星海陣'||k==='guard') ? 7.5 : k==='chaos' ? 1.5 : 10; }
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
/* 한 행동의 존 AF 게이지(실행 수 × 실행당). 연속 실행 안의 버프 스킬(狼吠·明鏡 등)은 안 참 → 스킬 af_seq(공격 실행마다 속성, 'none' = 무속성)가 있으면 그 실행만
   (2026-10-16 세스타 二刀神狼: 5실행 37.5%로 보던 것을 発勁斬 무속성 1.5 + 崩撃·餓狼断 7.5 = 16.5%로) */
const atkEx = sk => { const ex = Math.max(1, +sk.execs||1); return Array.isArray(sk.af_seq) && sk.af_seq.length && sk.af_seq.length<=ex ? sk.af_seq.length : ex; }; // 연속 실행 중 공격 실행 수
function zoneAFAct(z, co, inAF){
  const za = zoneAF(z, co, inAF); if(za==null) return null;
  if(co.mixL && co.mixL.length){ const W = co.mixL.reduce((v,x)=>v+x.w, 0) || 1; return co.mixL.reduce((v,x)=>v + x.w/W*(zoneAFAct(z, x.co, inAF)||0), 0); } // 상태 ON·OFF 섞인 코어(세스타(AS) 狼志 등): 실행 수도 가동률로
  const rep = 1 + Math.max(0, co.rep||0), cp = co.cpy ? 0.5 : 1; // 루나틱<複写>: 2번째 실행은 AF 게이지가 안 참(사용자 확인 2026-10-16) — 실행 수의 절반만
  if(co.afSeq) return co.afSeq.reduce((a,e)=>a + (zoneAF(z, {el: e, wt: co.wt}, inAF)||0), 0) * rep * cp;
  return za * (co.execs || rep) * cp;
}
function zoneFactor(z, el, wt, S, rel){
  // 빌더 코어(ae-core zoneEffect, 계산기 56행) 기준. 괄호는 극(ZONE 각성, 절 포함)
  if(!z || z.kind==='none' || z.level===0) return 1;
  const L = Math.min(1, z.level-1), K = L>=1; // 극·절
  const up = S.zoneWeap[L], up0 = S.zoneWeap[0], dn = S.zoneOffWeap, dnK = S.zoneOffGoku2===false ? S.zoneOffWeap : 1-2*(1-S.zoneOffWeap); // +30(+60) / −30(−60)
  if(z.kind==='elem'){
    const key = z.key || z.types[0];
    if(key==='moonlight') return z.types.includes(el) ? up : ELEM4.includes(el) ? dn : 1;           // 월광진: +30(극 +60, 사용자 확인 2026-10-19·game-info — 딩 코어는 극이어도 +30), 그 외 −30
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
    if(key==='slash_magic') return hit ? up : dn;            // 쌍격진 참마: +30(극 +60, 사용자 확인 2026-10-19 — 딩 코어는 극이어도 +30), 그 외 −30
    if(key==='slash_pierce') return hit ? up : dn;           // 쌍격진 참돌: +30(+60), 그 외 −30
    return hit ? up : (K ? dnK : dn);                        // 황참·순돌·굉타·환마: +30(+60), 그 외 −30(−60)
  }
  if(z.kind==='all'){
    const key = z.key||'';
    if(key==='starsea'||key==='stellar_sea'||key==='星海陣') return 1; // 성해진: ×2는 battleSim·applyZoneCap이 게이지 100%일 때 따로 곱함
    if(key==='guard') return 0.5;                            // 견수진: 모든 공격 ×0.5
    if(key==='chaos') return ELEM4.includes(el) ? 1.75 : 1;  // 혼돈진(보스): 화·수·지·풍 ×1.75
    return up0;                                              // 섬격진 +30
  }
  return 1;
}
function zoneFactorEff(z, el, wt, S, rel){
  const f = zoneFactor(z, el, wt, S, rel);
  if(z && z.level>=2 && (z.how==='스킬 각성' || z.how==='1회 각성')){ // 각성 준비 턴이 필요한 극존은 85%만 인정
    const f1 = zoneFactor(({...z, ...{level:1}}), el, wt, S, rel);
    return f1 + 0.85*(f-f1);
  }
  return f;
}

/* 브레이크(2026-10-17 조사, 공식 X·anaden-style, 스크래치 brk/out.json): 일반 ブレイク = 다음 1타만 2배(소모, 23명 전부 이것 — 예전엔 모든 타격 ×1.3),
   엘리멘탈·웨폰 브레이크 = 쌓인 수(보통 3)만큼 그 속성·타입 타격 2배(1타에 1개 소모 — 예전엔 맞는 타격 전부 ×1.5).
   그래서 이득 = 2배가 되는 타수 ÷ 그 창의 타수: 평상 턴은 1번 걸고 전열 한 바퀴(멤버마다 주력 타수), AF는 주력으로 거는 사람이면 행동마다 다시(같은 비율),
   따로 거는 스킬·개전 1회·SB면 AF 한 번에 1번(행동 약 BRK_AF_R 바퀴로 나눔) */
const BRK_ONCE = new Set(['all','any','generic','break','weapon','once']), BRK_N = 3, BRK_AF_R = 5;
const brkHits = c => { const m = (c.raw && c.raw.main) || c.main || {}; return Math.max(1, +m.hits||1) * (1 + Math.max(0, +m.repeat||0)); }; // 원래 주력 타수 × (1 + 재공격)
function brkGain(A, team, bi, b, sit){
  const C = A.brkG || (A.brkG = Object.create(null)), key = bi + ':' + b + ':' + sit; if(C[key]!==undefined) return C[key];
  const j = A.breakJ ? A.breakJ[bi] : -1, br = j>=0 ? team[j] : null, once = b==='once';
  const hitsOf = brkHits; // 원래 주력 타수 — 상태 변형 복사본과 무관하게(캐시가 넣은 순서에 안 흔들리게)
  const H = team.reduce((t,c)=> t + (once || c.elem===b || c.wt===b || (b.indexOf('_')>0 && b.split('_').includes(c.wt)) ? hitsOf(c) : 0), 0) || 1;
  const ba = br && br.bact, perAct = !ba || ba.main.has('brk') || !(ba.auto.has('brk') || ba.sb.has('brk') || ba.steps.some(st=>st.g && st.g.has('brk')));
  const k = sit==='normal' || perAct ? 1 : 1/BRK_AF_R;
  return (C[key] = Math.min(1, (once ? 1 : BRK_N)*k/H));
}
/* ---------- 팀 단위 공통 집계 ---------- */
function teamAgg(team){
  // 적에게 거는 것(독·페인, 브레이크, 약점 부여)만 팀 공통. 아군 버프는 attackerCore에서 받는 사람별로 조건을 따진다.
  const A = {painAny:false, breaks:[], weakAdd:[], weakInfo:[]};
  team.forEach((c,j)=>{
    if(c.pain) A.painAny=true;
    if(c.party && +c.party.link_brk>0) (A.lnkBrk || (A.lnkBrk = [])).push(j); // 연계 웨폰 브레이크(짭코코)
    const dbr = (c.raw && c.raw.debuff) || {}; // 편성 조건이 붙은 브레이크·약점 부여(2026-10-16 점검3: break_req·weak_expose_req = 전열 구성)
    if(c.breakT && !(dbr.break_req && !reqMet(dbr.break_req, team, c))){ A.breaks.push(c.breakT); (A.breakJ||(A.breakJ=[])).push(j); }
    if(c.weakExpose && !(dbr.weak_expose_req && !reqMet(dbr.weak_expose_req, team, c))){ A.weakAdd.push(c.weakExpose); // 약점 부여(弱点看破): SB 한정 표기면 SB 때(그 AF 남은 행동)만, 개전 자동이면 처음부터, 그 밖엔 부여한 사람이 행동한 뒤부터
      const raw = String((c.raw && c.raw.debuff && c.raw.debuff.weak_expose) || '');
      A.weakInfo.push({t:c.weakExpose, dflt: (c.raw && c.raw.debuff && c.raw.debuff.weak_expose_dflt) || null, j, sb:/SB/.test(raw), start: !!(c.raw && c.raw.debuff && c.raw.debuff.weak_expose_start), noaf: !!(c.raw && c.raw.debuff && c.raw.debuff.weak_expose_noaf) || (c.afT && c.afT.deb && typeof c.afT.deb.weak_expose==='number' && c.afT.deb.weak_expose<0.5), sbOnly: !!(c.afT && c.afT.deb && (c.afT.deb.weak_expose==='sb' || c.afT.deb.weak_expose==='sb1')), sb1: !!(c.afT && c.afT.deb && c.afT.deb.weak_expose==='sb1') || !!(c.bact && c.bact.sb1.has('weak')), up: (c.raw && c.raw.debuff && c.raw.debuff.weak_expose_up) || null, real: c.afT && c.afT.real && c.afT.real.deb ? c.afT.real.deb.weak_expose : undefined}); } // up {n,af,real}: 약점 간파가 켜진 비율(개전 1턴만·스킬 쓴 턴만 등), sb1: SB 그 턴만 // real: 실전 3턴째 AF 값(af_timing real)
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
/* 누적 효과 예열(2026-10-18, 사용자 확인: '누적치면 그만큼 턴 소모를 하거나 예열 시간이 필요'): 데이터 값은 최대 누적(1회분 × (N+1)/2).
   평상 턴 t(A.stkT)에는 그때까지 쌓인 수 k로 (k+1)/(N+1)(k=0이면 0, 정수 사이는 직선). 쌓이는 방법(data/stacks.json how):
   main 주력 쓸 때마다 · attack/buff 그 행동(턴을 씀, 기본 턴당 0.5번) · turn_start/turn_end 턴 시작·끝 자동 · sb SB 때 · hit/chain/counter/ally/auto 사건(rate 턴당).
   gate 'sb' = SB를 한 번 쓴 뒤부터(첫 SB를 2턴째 끝으로 봄). share = 그 키 값 중 누적 몫. AF·SB는 af_timing이 따로(여기선 평상 턴만) */
const STK_RATE = {main:1, attack:0.7, buff:0.5, sb:0.3, turn_start:1, turn_end:1, hit:1, chain:1, counter:1, ally:1, auto:1}, STK_SB_T = 2;
const stkR = (e, mr) => e.rate!=null ? Math.max(0, +e.rate) : e.how==='main' && mr!=null ? mr : (STK_RATE[e.how]!=null ? STK_RATE[e.how] : 1); // mr: 평상 턴에 주력을 쓰는 비율(simTeam act)
function stkK(e, T, mr){ const per = e.per>0 ? +e.per : 1, r = stkR(e, mr);
  const off = e.how==='turn_start' ? 0 : e.how==='turn_end' ? 1 : 0.5, t = (e.gate==='sb' ? T - STK_SB_T : T) - (e.t0>1 ? e.t0-1 : 0); // t0: 그 턴부터 쌓임
  const ax = e.also && STK_RATE[e.also]!=null ? per*STK_RATE[e.also]*Math.max(0, T-(e.also==='turn_start' ? 0 : e.also==='turn_end' ? 1 : 0.5)) : 0; // also: 다른 방법으로도 쌓임(라디카: 2턴째부터 턴 시작 + 버프 행동)
  return (+e.k0||0) + per*r*Math.max(0, t-off) + ax; }
function stkFrac(n, k, lin){ n = Math.max(1, +n||1); if(k<=0) return 0; if(k>=n) return 1; if(lin) return k/n; /* lin: 누적 수에 비례(10×누적 등) */ if(k<1) return k*2/(n+1); const a = Math.floor(k), fa = (a+1)/(n+1), fb = Math.min(1, (a+2)/(n+1)); return fa + (fb-fa)*(k-a); }
function stkFac(L, T, mr){ if(!L) return 1; let x = 1; for(const e of L){ const sh = e.share!=null ? Math.max(0, Math.min(1, +e.share)) : 1; x -= sh*(1 - stkFrac(e.n, stkK(e, T, mr), e.lin)); } return Math.max(0, x); }
function stkSat(L, mr){ let m = 0; for(const e of L){ const per = e.per>0 ? +e.per : 1, r = stkR(e, mr) + (e.also && STK_RATE[e.also]!=null ? STK_RATE[e.also] : 0); if(!(r>0)) { m = Math.max(m, 99); continue; }
  const off = e.how==='turn_start' ? 0 : e.how==='turn_end' ? 1 : 0.5; m = Math.max(m, Math.max(0, ((+e.n||1) - (+e.k0||0))/(per*r)) + off + (e.gate==='sb' ? STK_SB_T : 0) + (e.t0>1 ? e.t0-1 : 0)); } return m; }
// 캐릭터 데이터 c.stacks → {party:{키:[항목]}, self, deb, all:[항목]} (covered = 다른 데이터가 진행을 계산 중이면 뺌, af_timing 'sb'인 SB 누적은 sbUpN이 이미 다룸)
function prepStk(L, at){ if(!Array.isArray(L) || !L.length) return null; const o = {party:{}, self:{}, deb:{}, all:[]};
  for(const e of L){ if(!e || e.covered || !Array.isArray(e.g) || !(+e.n>=2)) continue;
    if((+e.k0||0) >= (+e.n||1)) continue;
    for(const g of e.g){ const [s, k] = String(g).split('.'); const sec = s==='party' ? 'party' : s==='self' ? 'self' : s==='debuff' || s==='deb' ? 'deb' : null; if(!sec || !k) continue;
      const atv = at && at[sec==='deb' ? 'deb' : sec] ? at[sec==='deb' ? 'deb' : sec][k] : null; if(e.how==='sb' && (atv==='sb' || atv==='sb1')) continue;
      (o[sec][k] = o[sec][k] || []).push(e); if(!o.all.includes(e)) o.all.push(e); } }
  return o.all.length ? o : null; }
const stkScale = (o, ks, fOf) => { let r = null; for(const k of ks){ const x = o[k]; if(x==null || x===false || x===0) continue; const f = fOf(k); if(f>=1) continue; r = r || ({...o});
  if(typeof x==='number') r[k] = x*f; else if(typeof x==='object' && !Array.isArray(x)){ if('sb' in x || 'req' in x || 'zone' in x || 'zlv' in x) { if(f<0.5) r[k] = false; } else { const y = {}; for(const q in x) y[q] = typeof x[q]==='number' ? x[q]*f : x[q]; r[k] = y; } }
  else if(f<0.5) r[k] = typeof x==='string' ? '' : false; } return r || o; };
const AFT_M = new WeakMap(); // af_timing 자기 몫(파티+자기) 합친 표를 캐릭터마다 한 번만(2026-10-17 계산 속도)
function afTMerge(at){ let m = AFT_M.get(at); if(!m){ m = {t: {...at.party||{}, ...at.self||{}}, rt: at.real ? {...at.real.party||{}, ...at.real.self||{}} : null}; AFT_M.set(at, m); } return m; }
function afAdj(o, t, situation, A, sbOK, rt, sbu){
  if(!o || !t) return o;
  let r=null;
  for(const k in t){
    const f = afTV(t[k], situation, A, sbOK, rt ? rt[k] : null, sbu); if(f===1) continue;
    const x = o[k]; if(x==null || x===false || x===0 || x==='') continue;
    if(!r) r = ({...o});
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
  if(c.afSk && skN(c.afSk.skill_jp||c.afSk.skill)!==skN((c.main||{}).skill_jp||(c.main||{}).skill) && !NA_RE.test(String(c.afSk.skill||'')) && !(stl && c.sb && skN(c.afSk.skill_jp||c.afSk.skill)===skN(c.sb.skill_jp||c.sb.skill))) used++; // AF 공격이 성도 스킬과 같은 스킬이면 성도 칸 하나(시구레(ES) 爽籟剣舞)
  if(stl && (c.sb || c.sbN || mainSt)) used++; // 성도 스킬이 공격이 아니면(밀디 シンフォニーソウル) 그 버프 행동이 칸을 씀
  return Math.max(0, total - used);
}
/* 상태 가동률(state.json, 2026-10-16): 루나틱 3턴·개전 N턴·모드처럼 켜지는 시간이 정해진 상태 — 데이터 값 = 켜진(ON) 상태.
   평상 턴(실전 N턴) = (개전 턴 + 횟수×지속)/N턴 또는 주기, 허수아비 AF·SB = af(0~1, 'sb'면 SB 뒤). ON·OFF를 따로 계산해 가동률로 섞음 */
function stateUp(s, situation, A, c, idx){
  const cl = v => Math.max(0, Math.min(1, +v||0));
  if(A.stOn && s.name && A.stOn.has(s.name)) return 1; // 그 턴엔 켜져 있다고 정한 상태(SB 게이지 가득 sb_full 턴 — 유우체리카 星天の力)
  if(s.res && c){ // 자원 소비형 상태(테오도로스 全盛期: 闘魂 50, 주력 실행·재공격마다 3 소비 — 사용자 확인 2026-10-16): 켜진 행동 수 = (시작 − 행동 소비) ÷ 행동당 소비
    const m = c.main || {}, ex = (1 + (+m.repeat||0)) * Math.max(1, +m.execs||1), cpa = Math.max(0.1, (+s.res.exec||3)*ex), on = Math.max(0, (+s.res.start||0) - (+s.res.step||0))/cpa;
    if(situation==='normal'){ const H = (A.tm && A.tm.H) || 6; return cl(on/H); }
    const n = A.afN && idx!=null && A.afN[idx] ? A.afN[idx] : AF_N_EST; return cl(on/Math.max(1, n)); }
  if(situation==='normal' && A.stkT>0 && s.up==null && (+s.start>0 || +s.dur>0)){ const t = A.stkT, st = +s.start||0, d = +s.dur||0, u = +s.uses||0; // 누적 예열(턴별): 개전 구간·사용 구간에 그 턴이 들어가면 켜짐
    return t<=st || (u>0 && d>0 && t<=st+u*d) ? 1 : s.cycle && d>0 ? cl(d/(d+(+s.cd||0))) : 0; }
  if(situation==='normal' && A.stkT>0 && s.up!=null && +s.from>1){ const H = (A.tm && A.tm.H) || 6; return A.stkT < +s.from ? 0 : cl(+s.up*H/Math.max(1, H - +s.from + 1)); } // from: 그 턴부터 켜짐(평균은 up 그대로)
  if(situation==='normal'){ if(s.up!=null) return cl(s.up); const H = (A.tm && A.tm.H) || 6, st = +s.start||0, d = +s.dur||0, u = +s.uses||0;
    if(s.cycle){ const cd = +s.cd||0, per = d>0 ? d/(d+cd) : 1; return cl((Math.min(H,st) + Math.max(0,H-st)*per)/H); }
    return cl((st + u*d)/H); }
  if(A.realT>1 && s.real!=null) return s.real==='sb' ? ((situation==='sb' || A.postSB) ? 1 : 0) : cl(s.real); // 실전 3턴째 AF·SB 값을 직접 지정
  if(A.lateAF && s.up==null && !s.res && (+s.dur>0 || +s.start>0)){ const t = A.realT, st = +s.start||0, d = +s.dur||0, u = +s.uses||0; // 긴 전투 뒤쪽 AF(2026-10-18): 개전·사용 구간이 끝났으면 꺼짐(수동이라 AF ON인 歴戦 등도)
    return t<=st || (u>0 && d>0 && t<=st+u*d) ? 1 : s.cycle && d>0 ? cl(d/(d+(+s.cd||0))) : 0; }
  if(s.af==='sb') return (situation==='sb' || A.postSB) ? 1 : 0;
  let a = s.af==null ? 1 : cl(s.af);
  if(A.realT>1){ const t = A.realT, st = +s.start||0, d = +s.dur||0, u = +s.uses||0; // 실전 N턴의 AF: 개전·사용 구간에 그 턴이 들어가면 켜짐(가장 좋은 때 쓴다고 봄), 구간 정보가 없으면 평상 턴 가동률
    const on = (d>0 || st>0) && s.up==null ? (t<=st || (u>0 && d>0 && t<=st+u*d) ? 1 : s.cycle && d>0 ? d/(d+(+s.cd||0)) : 0) : stateUp(s, 'normal', A);
    a = Math.max(a, on); }
  return situation==='sb' ? Math.max(a, stateUp(s, 'normal', A)) : a; // SB 턴(실전 포함)은 평상 가동률보다 낮지 않게
}
/* 상태 자체의 편성·존 조건(2026-10-16): req(전열 구성)·zone/zlv(그 존·각성 중에만 유지) 못 채우면 가동률 × e(기본 0) — 캄라녜쥬 雷帝(극 招雷陣/月光陣), 코마치(AS) 戦姫(전열 地 3명), 가리유 炎帝(火 공격 3회 이상)
   full_req: 채우면 평상 턴도 늘 켜짐(헬레나 宵の明星: 전열 合成人間 2명 이상이면 7턴) */
function stUp(s, situation, A, c, idx, team, zone){
  if(s.full_req && team && reqMet(s.full_req, team, c)) return 1;
  let u = stateUp(s, situation, A, c, idx);
  if(s.gate==='normal' && situation!=='normal') return u; // 가리유 炎帝: SB로 들어간 그 턴(AF)은 조건과 무관, 턴 종료 판정이라 평상 턴만
  if((s.req && !(team && reqMet(s.req, team, c))) || (s.zone && !zoneMatch(s.zone, zone)) || (s.zlv && !(zone && zone.kind!=='none' && zone.level>=s.zlv))) u *= Math.max(0, Math.min(1, +s.e||0));
  return u;
}
const ST_V = new WeakMap(), ST_NF = new WeakMap(), ST_C = new WeakMap();
function stateVariant(c, sts, onMask){ // 상태 목록(sts)·켜짐·대리 여부별로, 실제로 바뀌는 칸(자기 버프·스킬)만 캐시해 덮어씀(턴별 계산·체인 등은 매번 새 객체라)
  const px = !!c._proxy, ck = onMask.map(x=>x?1:0).join('')+(px?'p':'');
  let mc = ST_C.get(c); if(mc){ const r0 = mc.get(ck); if(r0) return r0; } else { mc = new Map(); ST_C.set(c, mc); } // 같은 캐릭터 객체면 그대로(대부분)
  const r1 = stateVariantB(c, sts, onMask, px, ck); mc.set(ck, r1); return r1;
}
function stateVariantB(c, sts, onMask, px, ck){
  let nf = ST_NF.get(sts); if(!nf){ const sk = sts.some(s=>s.main_off||s.sb_off||s.copy||(s.pow&&+s.pow!==1)), pt = sts.some(s=>s.party_off&&s.party_off.length);
    nf = {a:['self','teishin'].concat(pt?['party']:[]), b:['self','teishin'].concat(pt?['party']:[], sk?['main','sb','afSk','sbN']:[])}; ST_NF.set(sts, nf); }
  const F = px ? nf.a : nf.b; // 대리 스킬은 스킬 칸을 안 바꾸니 비교도 안 함
  let m1 = ST_V.get(sts); if(!m1){ m1 = new Map(); ST_V.set(sts, m1); }
  let L = m1.get(ck); if(!L){ L = []; m1.set(ck, L); }
  let e = L.find(x=>F.every(f=>x.b[f]===c[f]));
  if(!e){ const v = stateVariant0(c, sts, onMask), b0 = {}, o = {}; for(const f of F){ b0[f] = c[f]; o[f] = v[f]; } e = {b:b0, o}; if(L.length>=16) L.shift(); L.push(e); }
  const r = ({...c, ...e.o}); r._stv = true; return r;
}
function stateVariant0(c, sts, onMask){
  const px = !!c._proxy; // 체인·요격·1회 공격 같은 대리 스킬엔 자기 버프 쪽만
  let self = c.self, main = c.main, sb = c.sb, afSk = c.afSk, sbN = c.sbN, teishin = c.teishin, party = c.party;
  const cp = (o, f) => o ? ({...o, ...f}) : o;
  sts.forEach((s, k) => { const on = onMask[k];
    if(on){
      if(s.on_self){ self = ({...self}); for(const q in s.on_self){ const v = s.on_self[q]; self[q] = typeof v==='number' ? (+self[q]||0) + v : v; } }
      if(!px && s.copy){ const to = s.copy_to || s.pow_to || ['main'], f = sk => { if(!sk) return sk; const o = ({...sk, ...{copy:true}}); // 루나틱<複写>: 같은 스킬 2번 연속 실행(2번째는 MP·AF 게이지 없음) — x2: 실행·타수 2배(위력은 pow), ex2: 실행만 2배(타수·위력은 데이터가 ON 값), rep: 재공격으로 표현됨
          if(s.copy==='x2'){ o.execs = Math.max(1, +sk.execs||1)*2; o.hits = Math.max(1, +sk.hits||1)*2; if(Array.isArray(sk.af_seq)) o.af_seq = sk.af_seq.concat(sk.af_seq); } else if(s.copy==='ex2'){ o.execs = Math.max(1, +sk.execs||1)*2; if(Array.isArray(sk.af_seq)) o.af_seq = sk.af_seq.concat(sk.af_seq); }
          o.hit_w = null; return o; };
        if(to.includes('main')) main = f(main); if(to.includes('sb_normal')) sbN = f(sbN); if(to.includes('af_skill')) afSk = f(afSk); }
      if(!px && s.pow && +s.pow!==1){ const to = s.pow_to || ['main','sb','af_skill','sb_normal'], mul = sk => sk ? ({...sk, ...{mult:(sk.mult||1)*s.pow, _stPow:(+sk._stPow||1)*s.pow}}) : sk;
        if(to.includes('main')) main = mul(main); if(to.includes('sb')) sb = mul(sb); if(to.includes('af_skill')) afSk = mul(afSk); if(to.includes('sb_normal')) sbN = mul(sbN); }
    } else {
      if(s.self_off && s.self_off.length){ self = ({...self}); for(const q of s.self_off){ if(q==='teishin'){ teishin = false; continue; } self[q] = typeof self[q]==='number' ? 0 : false; } }
      if(s.teishin_off) teishin = false;
      if(!px && s.main_off){ const mo = ({...s.main_off}), hasM = 'mcond' in mo; const mc = mo.mcond; delete mo.mcond; main = cp(main, mo); if(main && hasM){ if(mc) main.mcond = JSON.parse(JSON.stringify(mc)); else delete main.mcond; } }
      if(!px && s.sb_off){ const so = ({...s.sb_off}), hasM = 'mcond' in so; const mc = so.mcond; delete so.mcond; sb = cp(sb, so); if(sb && hasM){ if(mc) sb.mcond = JSON.parse(JSON.stringify(mc)); else delete sb.mcond; } }
      if(s.party_off && s.party_off.length && party){ party = ({...party}); for(const q of s.party_off) party[q] = typeof party[q]==='number' ? 0 : false; }
    } });
  return {self, main, sb, afSk, sbN, teishin, party}; // 바뀌는 칸만(stateVariantB가 캐릭터 객체에 덮어씀 — 큰 객체 복사 한 번 줄임)
}
/* 여러 코어를 비율로 섞음: 한 코어를 본으로 대상 수(nT)만 맞춰 applyZoneCap 결과가 가중 평균이 되게(1타 경감은 본 코어 기준 근사) */
function mixCores(list, zone, S){
  const L = list.filter(x=>x.co && x.w>0); if(!L.length) return list.length ? list[0].co : null; if(L.length===1) return L[0].co;
  const D = L.map(x=>applyZoneCap(x.co, zone, S, null, 1)), tgt = L.reduce((v,x,k)=>v + x.w*D[k], 0);
  let b = 0; L.forEach((x,k)=>{ if(D[k]>0 && (x.w>L[b].w || !(D[b]>0))) b = k; });
  if(!(D[b]>0)) return L[b].co;
  return ({...L[b].co, ...{mixL: L.map(x=>({w:x.w, co:x.co})), mix: L.map((x,k)=>({w:x.w, d:D[k], skill:x.co.skill}))}}); // applyZoneCap이 그 순간 콤보·존으로 하위 코어를 가중 합
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
  const mk = list => ({...A, ...{echg: list.length ? list : null, _ecFix:true}});
  if(!part) return attackerCore(team, idx, progs, mk(on), enemy, S, situation, ctx, FX, zone);
  const Aon = mk(on.concat(part)), Aoff = mk(on), c = team[idx], base = (c.main && c.main.element) || c.elem;
  if(echgElem(Aon.echg, team, idx, base, situation, zone, enemy, A) === (Aoff.echg ? echgElem(Aoff.echg, team, idx, base, situation, zone, enemy, A) : base)) return attackerCore(team, idx, progs, Aon, enemy, S, situation, ctx, FX, zone);
  return mixCores([{w, co: attackerCore(team, idx, progs, Aon, enemy, S, situation, ctx, FX, zone)}, {w: 1-w, co: attackerCore(team, idx, progs, Aoff, enemy, S, situation, ctx, FX, zone)}], zone, S);
}
function attackerCore(team, idx, progs, A, enemy, S, situation, ctx, FX, zone){
  if(A.echg && A.ecU && !A._ecFix){ const r = ecGate(team, idx, progs, A, enemy, S, situation, ctx, FX, zone); if(r!==undefined) return r; }
  // 상태가 꺼지면 같이 꺼지는 파티 버프(state party_off, 2026-10-18 점검: 예전엔 그 캐릭터 자기 공격에서만 꺼지고 다른 아군이 받는 몫은 늘 켜짐) → 다른 아군 계산에선 상태 가동률만큼
  if(team.some((m,j)=>j!==idx && m && m.poSt && !m._poX)){ const t2 = team.map((m,j)=>{ if(j===idx || !m || !m.poSt || m._poX) return m; let p = m.party;
      for(const st of m.poSt){ const u = stUp(st, situation, A, m, j, team, zone); if(u>=0.999) continue; p = ({...p}); for(const q of st.party_off){ if(typeof p[q]==='number') p[q] *= u; else if(p[q] && typeof p[q]==='object') p[q] = u>=0.5 ? p[q] : false; else if(p[q]) p[q] = u>=0.5; } }
      return ({...m, ...{party:p, _poX:true}}); });
    return attackerCore(t2, idx, progs, A, enemy, S, situation, ctx, FX, zone); }
  const c = team[idx];
  if(c && c.states && !c._stv){
    const sts = c.states.slice(0, 3), ups = sts.map(s=>stUp(s, situation, A, c, idx, team, zone)), fr = ctx && ctx.stFast ? [] : ups.map((u,k)=>u>0.001 && u<0.999 ? k : -1).filter(k=>k>=0).slice(0, 2); // stFast(탐색 1단계): 가동률 0.5 이상이면 켜진 쪽 하나만
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
    const t0 = team.slice(); let c0 = ALT_CACHE.get(c); if(!c0){ c0 = ({...c, ...{_alt:true}}); ALT_CACHE.set(c, c0); } t0[idx] = c0;
    let best = attackerCore(t0, idx, progs, A, enemy, S, situation, ctx, FX, zone), bd = best ? applyZoneCap(best, zone, S, null, 1) : 0;
    const coOf = a => { if(a.attack===false || !(+a.mult>0)) return null; const sk = ({...a}); delete sk.when; delete sk.normal; delete sk.af; delete sk.cycle; delete sk.note; delete sk.mp;
      const t2 = team.slice(); t2[idx] = ({...c, ...sit==='af' ? {afSk:sk, sbN:null, _alt:true} : {main:sk, _alt:true}}); return attackerCore(t2, idx, progs, A, enemy, S, situation, ctx, FX, zone); };
    for(const a of cand){ const co = coOf(a); const d = co ? applyZoneCap(co, zone, S, null, 1) : 0; if(d > bd){ best = Object.assign(co, {viaAlt: a.skill}); bd = d; } }
    if(cyc.length && best){ const a = cyc[0], co = coOf(a); best = mixCores([{w:0.5, co:best}, {w:0.5, co: co || ({...best, ...{nT:0}})}], zone, S); }
    return best;
  }
  // 주력이 거는 'N회 행동' 자기 버프(buff_acts main acts, 이즈나 雷神滅閃 마법 크리 100% 3회 행동)인데 AF 공격은 성도 스킬인 경우:
  // 주력만 / 성도 스킬만(버프 없음) / 주력 1번 + 성도 스킬 N번 순환(버프 받음) 중 센 것(2026-10-16)
  const mk = situation==='af' && c && c.bact && c.bact.mainActs>0 && c.bact.mainActK && !c._mkOn ? c.bact.mainActK : null;
  const withK = (c0, v) => { const m = new Map(); for(const k of mk) m.set(k, v); return ({...c0, ...{_mkOn: m}}); };
  const t1 = mk ? team.slice() : team; if(mk) t1[idx] = withK(c, 1);
  const co1 = attackerCore0(t1, idx, progs, A, enemy, S, situation, ctx, FX, zone);
  if(situation!=='af' || !c || !c.sbN || c._sbN || !(progs[idx] && progs[idx].sbOK)) return co1; // 성도 각성했을 때만
  const t2 = team.slice(); t2[idx] = ({...mk ? withK(c, 0) : c, ...{afSk: c.sbN, _sbN: true}});
  const co2 = attackerCore0(t2, idx, progs, A, enemy, S, situation, ctx, FX, zone);
  if(!co2) return co1; if(!co1) return co2;
  const d1 = applyZoneCap(co1, zone, S, null, 1), d2 = applyZoneCap(co2, zone, S, null, 1);
  if(mk){ const N = c.bact.mainActs, t3 = team.slice(), t4 = team.slice(); t3[idx] = ({...withK(c, 1), ...{afSk: c.sbN, _sbN: true}}); t4[idx] = withK(c, 0);
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
  const stkT = situation==='normal' && A.stkT>0 ? A.stkT : 0; // 누적 효과 예열: 평상 턴 t에 쌓인 만큼(prepStk)
  const stkMR = j => A.stkMR ? A.stkMR[j] : null;
  const stkP = stkT ? (j,k0)=>{ const s = team[j].stk, L = s && s.party[k0]; return L ? stkFac(L, stkT, stkMR(j)) : 1; } : ()=>1;
  let row=null; const F = (j,k)=>{ const t=team[j].afT, k0 = k.indexOf(':')<0 ? k : kBase(k), a = (t && t.party ? afTV(t.party[k0], situation, A, progs[j]&&progs[j].sbOK, t.real && t.real.party ? t.real.party[k0] : null, sbU(j)) : 1)*sbG(j, k0)*chX(j, k0)*stkP(j, k0); if(!row) return a; const v=rowV(row, idx, k); return (v==null?1:v)*a; };
  let sk = c.main, usingSB=false;
  // 그 존이어야 연속 실행되는 주력(zone_need, 2026-10-16: 세스타 二刀神狼은 極・風王陣 중 神狼이 쌓여야 — 다른 존 편성에선 餓狼断 단독인데 5실행으로 AF 게이지를 채우던 문제)
  if(sk && sk.zone_need && !(zoneMatch(sk.zone_need.zone, zone) && (!sk.zone_need.zlv || (zone && zone.level>=sk.zone_need.zlv))))
    sk = sk.zone_need.off ? ({...sk, ...sk.zone_need.off, ...{zone_need:null, hit_w:null}}) : (c.mainAlt ? ({...c.mainAlt, ...{zone_need:null, hit_w:null}}) : sk);
  if(sk && sk.no_aw && !(pr && (pr.sbOK || pr.sbAw))) sk = ({...sk, ...sk.no_aw, ...{no_aw:null, hit_w:null}}); // 성도각성 전 필드(2026-10-17: 紺色の夢魔 ドリームバイツ — 개전 悪夢 10이라 재공격 1, 성도각성이면 30·재공격 3)
  if(sit==='sb' && c.sb && pr.sbOK && c.sb.mult>0){ sk=c.sb; usingSB=true; }
  if(situation==='af' && c.afSk) sk = c.afSk; // AF 중에만 쓰는 공격(플람라피스(ES) ドゥーイル・スラマ 등)
  if(!sk) return null;
  if(situation==='normal' && sk.n_over && !usingSB) sk = ({...sk, ...sk.n_over, ...{n_over:null, hit_w:null}}); // 평상 턴만 바뀌는 필드(유인 ラーヴァインパクト: HP가 깎인 채라 1회 실행·4타, 2026-10-16)
  let el = sk.element||c.elem; const kind = sk.kind==='mag'?'mag':'phys';
  const swc = ELEM_SWITCH[c.id];
  if(swc && (el===swc.yes || el===swc.no)) el = (swc.zone ? zoneMatch(swc.zone, zone) : reqMet(swc.need, team, c)) ? swc.yes : swc.no;
  const elNat = el; // 속성 변환 전 원래 공격 속성
  // 속성 지정의 '원래 속성' 판정: 자기 스스로 바꾸는 속성(질퍼니(AS)·번쩍번쩍 화가 등)은 그 캐릭터 고유 공격으로 봄(남이 바꿔 준 것만 변환, 2026-10-17 점검)
  const elOwn = A.echg && A.echg.some(x=>x.i===idx && x.to==='self') ? echgElem(A.echg.filter(x=>x.i===idx && x.to==='self'), team, idx, el, situation, zone, enemy, A) : el;
  if(A.echg) el = echgElem(A.echg, team, idx, el, situation, zone, enemy, A);
  const conv = el!==elNat && elNat!=='none'; // 남이 바꿔 준 속성(変幻自在 등): 자기 속성 공격 버프(self elem_atk, 보통 '자신의 ○속성 공격')는 원래 속성 몫이라 안 받음
  const wt = adaptWt(sk, sk.weapon_type || (kind==='mag'?'magic':c.wt), kind, team, A, enemy, idx, zone);
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
  let me = c.afT ? (m0 => afAdj(c.self, m0.t, situation, A, sbOKi, m0.rt, sbU(idx)))(afTMerge(c.afT)) : c.self; // 자기 파티 버프 보정은 자기 몫에도
  if(c.selfStk){ me = ({...me}); for(const k in c.selfStk){ if(me[k]==null) continue; const e0 = Math.max(0, Math.min(1, +c.selfStk[k].e||0)), f = e0 + (1-e0)*condP(({...c.selfStk[k]}), situation, team, c, A, zone, enemy, el, progs); // 축적 수에 비례하는 자기 버프(闘魂 완력 등), e = 조건 밖에서 남는 비율(招雷陣·杖 2명이면 2배인 자기 버프는 e 0.5)
    if(typeof me[k]==='number') me[k] *= f; else if(typeof me[k]==='boolean' || typeof me[k]==='object') me[k] = f>=0.5 ? me[k] : false; } }
  if(stkT && c.stk){ const sS = c.stk.self, sP = c.stk.party, ks = [...new Set(Object.keys(sS).concat(Object.keys(sP)))]; // 자기 버프는 자기 파티 버프 몫을 포함
    if(ks.length) me = stkScale(me, ks, k => stkFac([...new Set((sS[k]||[]).concat(sP[k]||[]))], stkT, stkMR(idx))); }
  // 자기 버프 출처 행동(buff_acts의 self.X, 2026-10-16): 허수아비 AF는 그 행동을 쓴 뒤부터(마스크), 평상 턴은 버프 행동 유지율, SB 전용은 SB 때·뒤만
  let onK = null; // 자기 버프 키별 켜진 비율(상태 키 self_on·unison용)
  if(c.bact && c.bact.selfKeys.length){ const f0 = FX && FX[idx], src = c.bact.selfSrc; let me2 = null; onK = {};
    for(const k of c.bact.selfKeys){ if(me[k]==null) continue; let on = 1;
      if(c._mkOn && c._mkOn.has(k)) on = c._mkOn.get(k); // 주력이 거는 N회 행동 버프(AF 주력 순환, 아래 attackerCore)
      else if(f0 && f0.sm) on = f0.sm.has('s.'+k) || (situation==='sb' && src[k]==='sb') ? 1 : 0;
      else if(situation!=='normal' && f0 && f0.smf && f0.smf['s.'+k]===0) on = 0; // 장착 못 한 버프 행동의 자기 버프(실전·지속의 AF·SB)
      else if(situation==='af' && src[k]==='sb' && !A.postSB) on = 0; // SB로만 거는 자기 버프: 실전 AF에선 SB 뒤만
      else if(situation==='normal'){ if(src[k]==='sb') on = c.bact.sb1.has('s.'+k) ? 0 : sbU(idx); else if(f0 && f0.smf && f0.smf['s.'+k]!=null) on = f0.smf['s.'+k]; else if(src[k]==='step' && f0 && f0.su!=null) on = f0.su; }
      onK[k] = on; if(on>=1) continue; me2 = me2 || ({...me});
      if(typeof me2[k]==='number') me2[k] *= on; else me2[k] = on>=0.5 ? me2[k] : false; }
    if(me2) me = me2; }
  // 스킬 조건이 자기 버프 행동에 묶인 경우(skill_cond self: 그 키가 켜진 만큼, 2026-10-16 류제 牙龍驟滅 6배 = 破竜の構え 중 — 그 행동을 못 달거나 쓰기 전이면 기본 배율)
  if(sk.mcond && sk.mcond.self && c.self){ const k = sk.mcond.self, v0 = c.self[k], v1 = me[k];
    const f = typeof v0==='number' ? (v0>0 ? Math.max(0, Math.min(1, (+v1||0)/v0)) : 1) : (v0 ? (v1 ? 1 : 0) : 1);
    if(f<1){ const m1 = condMult(sk, sk.mcond, situation, team, c, progs, idx, A, zone, enemy, el); if(m1>0) dmg *= condMult(sk, sk.mcond, situation, team, c, progs, idx, A, zone, enemy, el, f)/m1; } }
  // 스탯 비례 조건의 버프 몫이 자기 버프 행동에 묶인 경우(skill_cond need stat + buff_k, 2026-10-16 엘레노아: 정신 ×1.5는 祈誓の導き(self.singular_focus 출처)를 쓴 만큼만)
  if(sk.mcond && sk.mcond.need && onK && sk.mcond.need.some(n=>n && n.buff_k)){ const nd = sk.mcond.need.map(n=>n && n.buff_k && !n.live && onK[n.buff_k]!=null && onK[n.buff_k]<1 ? ({...n, ...{buff:(+n.buff||0)*Math.max(0, +onK[n.buff_k]||0)}}) : n);
    if(nd.some((n,i)=>n!==sk.mcond.need[i])){ const m1 = condMult(sk, sk.mcond, situation, team, c, progs, idx, A, zone, enemy, el); if(m1>0) dmg *= condMult(sk, ({...sk.mcond, ...{need:nd}}), situation, team, c, progs, idx, A, zone, enemy, el)/m1; } }
  // 자기 버프(self_buff)는 '자신이 받는 최대치'라 자기 파티 버프를 이미 포함한다 → 같은 항목은 자기 파티 버프를 또 더하지 않음(판정은 보정 전 값으로)
  const has = k => { const v=c.self[k], w=me[k]; return (typeof v==='number' ? v>0 : !!v) && (typeof w==='number' ? w>0 : !!w); }; // 출처 행동 전이라 꺼진 자기 버프면 자기 파티 버프를 받음
  const sv=[pct(me[stat])], ev=[conv ? 0 : pct(me.elem_atk)], wv=[pct(me.weapon_atk)], spv=[], mpv=[pct(me.mp_up)], spdv=[pct(me.spd)]; // spdv: 속도 버프(AF 대기 시간용, 2026-10-19)
  // 자기 상태 효과 조건: true 또는 {sb: SB 때(그 AF의 남은 행동 포함), req: 편성 조건, zone/zlv: 존}
  const selfOn = q => q===true || (!!q && typeof q==='object' && (!q.sb || situation==='sb' || (situation==='af' && A.postSB))
    && (!q.req || reqMet(q.req, team, c)) && (!q.zone || zoneMatch(q.zone, zone)) && (!q.zlv || (zone && zone.level>=q.zlv)));
  // 자기 상태 키가 켜진 비율(2026-10-16, 미스트레아 ユニゾン: 전열에 다른 歌唱 캐릭터(req) + エルの唄・ユニゾン 행동을 달고 쓴 뒤) — 0~1
  const selfW = k => { const q = c.self && c.self[k]; if(!q || (k==='unison' && pr && pr.uniOff)) return 0;
    let base = selfOn(typeof q==='object' ? q : true) ? 1 : (typeof q==='object' && q.e!=null ? Math.max(0, Math.min(1, +q.e||0)) : 0); // e: 조건 밖 비율(국화의 검객 胆力: 전열 도 3명 미만이면 몇 턴에 한 번)
    if(typeof q==='object' && q.af1 && situation!=='normal' && !(A.realT>1)) base = 1; // af1: 1턴째(허수아비·실전 1턴째 AF)는 개전 축적으로 늘 충족
    if(!(base>0)) return 0; const o = onK && onK[k]!=null ? onK[k] : 1; return base*Math.max(0, Math.min(1, +o||0)); };
  // 상태 중에만 바뀌는 스킬 필드(skill self_on {k, on}: 미스트레아 オウル・ナカル 재공격·AF 콤보 증가량 2배는 ユニゾン 중만) — 켜진 비율만큼 섞음(재공격은 확률 rep_p)
  if(sk.self_on && sk.self_on.k){ const w = selfW(sk.self_on.k), on = sk.self_on.on||{}, s2 = ({...sk, ...{self_on:null}});
    for(const f in on){ const v1 = +on[f]||0, v0 = +sk[f]||(f==='af_combo_x'||f==='mult'?1:0);
      if(f==='repeat'){ if(v0>0) s2.repeat = v0 + w*(v1-v0); else { s2.repeat = v1; s2.rep_p = w*(sk.rep_p!=null && typeof sk.rep_p!=='object' ? +sk.rep_p : 1); } }
      else if(f==='mult'){ const m0 = Math.max(1, v0); dmg *= (m0 + w*(Math.max(1, v1)-m0))/m0; } // 배율은 위에서 이미 계산 → 대미지에 비율로(국화 검객 渾身一刀 10배 = 胆力 3)
      else s2[f] = v0 + w*(v1-v0); } // 불리언(crit_sure·barrier_pierce·def_ignore)은 켜진 비율(0~1)로
    sk = s2; }
  // 상태 중 그 캐릭터 모든 스킬 위력 배율(self_buff 키 {req, pow, pow0}: ユニゾン 1.1배, 스텔라 보드 강화 1.3배 — 성도각성이면 pow, 아니면 pow0)
  if(c.selfPowK) for(const k of c.selfPowK){ const q = c.self[k], w = selfW(k); if(!(w>0)) continue;
    const pr0 = progs[idx], pw = pr0 && (pr0.sbOK || pr0.sbAw) ? +q.pow : +(q.pow0||q.pow); dmg *= 1 + w*(pw-1); }
  let critA=0, critD = pct(me.crit_dmg), shinW = selfOn(me.shinan)?1:0;
  const FK = stat==='int'?'int_flat':stat==='spd'?'spd_flat':'pwr_flat';
  let flatP = +me[FK]||0;
  // 루나틱<솔선(挺身)>: 처음 내구만큼 힘, 처음 정신만큼 지성(상태 효과 고정값, 딩 계산기 14·15행). 표준 장비엔 내구·정신이 없어 캐릭터 기본값(천명·스텔라 보드 포함)만
  const teBase = () => { const p0 = progs[idx]; const s0 = statsAt(c.stats, c.fateTbl, p0 ? (p0.t||0) : 120, c.stellar && p0 && (p0.sbOK || p0.sbAw) ? c.stBoard : null, p0 ? p0.lvB||0 : 0, p0 ? p0.sty : null); return s0 ? (stat==='int' ? s0.spr : s0.end) : 0; };
  let teW = c.teishin ? 1 : 0, cupA = 0;
  if(c.teishin && stat!=='spd') flatP += teBase();
  const frac = v => v===true ? 1 : Math.max(0, Math.min(1, +v||0)); // 스킬 불리언 필드(self_on으로 비율이 될 수 있음)
  let ocW = me.over_crit?1:0, mhW = me.multihit?1:0, xW = me.extra_hit?1:0, pierceW = Math.max(frac(sk.barrier_pierce), me.barrier_pierce?1:0);
  let chW = typeof me.charge==='number' ? Math.max(0, Math.min(1, me.charge)) : me.charge ? 1 : 0; // 帯電 가동률(버프 행동 유지율·상태 가동률)
  const fKey = kind==='phys' ? 'singular_focus' : 'mental_focus';
  let focW = me[fKey]?1:0, otW = me.overthrow?1:0, eaW = me.eagle_eyes?1:0;
  let kessW = selfOn(me.kesshi) ? 1 : 0;
  const dmgS = {}; // 주는 대미지 UP: 출처 종류(prayer 기도·song 가창·other·self)마다 최댓값
  if(me.dmg_up && selfOn(me.dmg_on==null ? true : me.dmg_on)) dmgS[me.dmg_src||'self'] = pct(me.dmg_up);
  const weakD = [pct(me.weak_dmg)]; let elDn = 0;
  const zElem = zone && zone.kind==='elem' && zone.level>0 ? zone.types : null;
  for(let j=0;j<team.length;j++){
    const p = team[j].party; if(!p || p.scope==='none') continue;
    row = FX&&FX[j] ? FX[j] : null;
    const own = j===idx;
    if(!(own && has(stat))){ const v = pct(p[stat]); sv.push(v ? v*F(j,stat) : 0); }
    if(p.spd && !(own && has('spd'))){ const v = pct(p.spd); if(v) spdv.push(stat==='spd' ? sv[sv.length-1] : v*F(j,'spd')); }
    if(!(own && has('elem_atk') && !conv)){ // 바뀐 속성이면 자기 파티 버프 중 전속성·그 속성 몫만
      if(el!=='none'){
        { const v = pct(p.all_elem_atk); ev.push(v ? v*F(j,'all_elem_atk') : 0); }
        if(p.elem_atk){
          let ea;
          const fe = folEls(team, j, A);
          if(FX&&FX[j]&&FX[j].zel&&zElem) ea = zElem.includes(el) ? Math.max(0,...Object.values(p.elem_atk).map(pct)) : 0; // 존 속성을 따라가는 속성 버프
          else if(fe) ea = pct(folV(p.elem_atk, fe, el)); // 변환 대상 아군 속성을 따라가는 속성 버프(노나(AS))
          else ea = pct(p.elem_atk[el]);
          if(ea){ const rv = row ? row.rows[idx]['elem_atk:'+el] : null; ev.push(ea*F(j,'elem_atk')*(rv==null ? 1 : rv)); } // 속성별 규칙 행은 값만 — 예전엔 F를 두 번 불러 AF 타이밍·SB·누적 예열 배율이 제곱으로 들어감(2026-10-18 점검)
        }
        if(p.elem_down && p.elem_down[el]) elDn = Math.max(elDn, pct(p.elem_down[el])*F(j,'elem_atk')); // 같은 스킬이 거는 아군 속성 공격 DOWN(밀디 サイキックジェム: 火·水·風·地 40%, 2026-10-17) — 버프와 따로 곱, 가장 큰 것 하나
      }
      else { const v = pct(p.all_elem_atk); ev.push(v ? v*0.5*F(j,'all_elem_atk') : 0); }
    }
    if(p.weapon_atk && !(own && has('weapon_atk'))){ const fw=F(j,'weapon_atk'); wv.push(pct(p.weapon_atk.all)*fw, pct(p.weapon_atk[c.weapon])*fw, pct(p.weapon_atk[wt])*fw); }
    if(!(own && has('crit_rate'))){ const v = pct(p.crit_rate); if(v) critA += v*F(j,'crit_rate'); }
    if(p[FK]) flatP += (+p[FK]||0)*F(j,FK);
    if(p.shinan) shinW = Math.max(shinW, F(j,'shinan'));
    if(p.kesshi) kessW = Math.max(kessW, F(j,'kesshi'));
    if(p.combo_up) cupA += pct(p.combo_up)*F(j,'combo_up');
    if(p.teishin && stat!=='spd' && teW<1){ const t = Math.min(1, F(j,'teishin')); if(t>teW){ flatP += (t-teW)*teBase(); teW = t; } } // 아군 挺身(이미 자기 挺身이면 겹치지 않음)
    if(p.dmg_up && !(p.dmg_el && ![].concat(p.dmg_el).includes(el))){ const v = pct(p.dmg_up)*F(j,'dmg_up'), s = p.dmg_src||'other'; if(v>(dmgS[s]||0)) dmgS[s]=v; } // dmg_el: 그 속성 공격만(○属性で与えるダメージ)
    if(p.mp_up && !(own && has('mp_up'))) mpv.push(pct(p.mp_up)*F(j,'mp_up'));
    if(!(own && has('crit_dmg'))){ const v = pct(p.crit_dmg); if(v) critD += v*F(j,'crit_dmg'); }
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
  let BUD = null; if(A.bud){ BUD = []; for(const b of A.bud.parts){ if((b.zone && !(zone && zone.level>0 && zoneMatch(b.zone, zone))) || (b.st && sk.target!=='st')) continue; const f = b.p*budF(b, situation, A, zone, team); if(f>0) BUD.push(f===b.p ? b : ({...b, p:f})); } }
  // 버디의 고정값·최대 MP·상태(2026-10-18): 튜시아 星の瞬き(힘·지능·속도 고정값), 건스(AS) フォルティゾ(招雷陣 중 최대 MP +30%), 모케 차지 2(틸릴(ES) 짝: 아군 心眼), 건스 アクティーナ(雷 캐릭터 帯電)
  if(BUD) for(const b of BUD){ const p=b.party; if(!p) continue; const f=b.p;
    if(b.to && b.to.elem && !(c.elems||[c.elem]).includes(b.to.elem)) continue; // 대상 속성 캐릭터만
    if(p[FK]) flatP += (+p[FK]||0)*f;
    if(p.mp_up) mpv.push(pct(p.mp_up)*f);
    if(p.shinan) shinW = Math.max(shinW, Math.min(1, f));
    if(p.kesshi) kessW = Math.max(kessW, Math.min(1, f));
    if(p.charge) chW = Math.max(chW, Math.min(1, f)); }
  const mpB = dimin(mpv, 1); // 최대 MP %: 19행 감쇠 합, 최대 +100%
  const mpBase = (pr.D ? pr.D.mp : 450) + (+me.mp_flat||0);
  const mpF = focusOf(kind, mpBase*(1+mpB));
  if(focW>0) spv.push(mpF*Math.min(1,focW));
  if(otW>0) spv.push(OVERTHROW_VAL*Math.min(1,otW));
  if(eaW>0) spv.push(EAGLE_VAL*Math.min(1,eaW));
  let dmgUp = 1; for(const s in dmgS) dmgUp *= 1+dmgS[s];
  // MP消費攻撃: 아군·자신 버프 중 최댓값 하나. 표준 장비(딩 빌더 최적 빌드)의 배지 MP 소비 공격 +15%(43행, 중복 불가)를 대신한다(AF 중에도 대미지는 증가, 사용자 확인)
  let mpAtkSk = 0; // 스킬로 받는 MP消費攻撃(장비 추천: 장비의 MP 소비 공격과 중복 불가)
  { let ma = pct(me.mp_atk); for(let j=0;j<team.length;j++){ const p=team[j].party; if(!p || p.scope==='none' || !p.mp_atk) continue; row = FX&&FX[j] ? FX[j] : null; ma = Math.max(ma, pct(p.mp_atk)*F(j,'mp_atk')); }
    mpAtkSk = ma; if(ma > MPATK_GEAR) dmgUp *= (1+ma)/(1+MPATK_GEAR); }
  let budDmg = 0;
  if(BUD) for(const b of BUD){ const p=b.party; if(!p) continue; const f=b.p;
    if(b.to && b.to.elem && !(c.elems||[c.elem]).includes(b.to.elem)) continue;
    if(p[stat]) sv.push(pct(p[stat])*f);
    if(p.spd) spdv.push(pct(p.spd)*f);
    if(p.all_elem_atk && el!=='none') ev.push(pct(p.all_elem_atk)*f);
    if(p.weapon_atk && p.weapon_atk[c.weapon]) wv.push(pct(p.weapon_atk[c.weapon])*f);
    if(p.wt_dmg && p.wt_dmg[wt]) wv.push(pct(p.wt_dmg[wt])*f);
    critA += pct(p.crit_rate)*f; critD += pct(p.crit_dmg)*f; budDmg += pct(p.dmg)*f; }
  // 물리 기본 크리율 20%(운·장비 포함 평균) + 운 차이 ÷16 % (빌더 계산식: 크리율 += 운/16)
  let critR = (kind==='phys' ? 0.2 + (pr.lck ? (pr.lck-LUCK_REF)/1600 : 0) : 0) + pct(me.crit_rate) + critA;
  const statB = dimin(sv,1), elB = dimin(ev,1), wB = dimin(wv,1);
  let specB = dimin(spv, 3.5);
  dmg *= (1+elB)*(1+wB)*(1+specB)*(1-Math.min(0.9, elDn)); // 스탯 버프는 기본 대미지(딩 계산식) 안에서

  // 적 디버프 (내성 그룹). 디버프 규칙(지속·조건) 배율, 단일 대상 디버프는 전체 공격일 때 맞는 적 비율만큼
  const tv=[], phv=[], mgv=[], dfv=[]; let sideDn = 0, sideRes = 0;
  const nTg = sk.target==='st' ? 1 : Math.max(1, S.enemyCount||1);
  for(let j=0;j<team.length;j++){
    const m=team[j]; let d = m.afT && m.afT.deb ? afAdj(m.deb, m.afT.deb, situation, A, !!(progs[j]&&progs[j].sbOK), m.afT.real && m.afT.real.deb, sbU(j)) : m.deb; if(!d) continue;
    if(stkT && m.stk){ const sD = m.stk.deb, ks = Object.keys(sD); if(ks.length) d = stkScale(d, ks, k => stkFac(sD[k], stkT, stkMR(j))); }
    const fr = FX&&FX[j] ? FX[j] : null, st = m.rules && m.rules.debSt && nTg>1 ? m.rules.debSt : null, fe = d.elem_res ? folEls(team, j, A) : null;
    const erV = el==='none' || !d.elem_res ? 0 : fe ? folV(d.elem_res, fe, el) : d.elem_res[el]; // 내성 다운 속성이 변환 대상 아군을 따라감(이벨라(AS))
    const sbD = situation==='af' && !A.postSB && m.bact && m.bact.sbOnly.size && !(FX && FX[j] && FX[j].sm);
    const off = A.eqOff && A.eqOff[j] && !(FX && FX[j] && FX[j].sm) ? A.eqOff[j] : null; // 장착 못 한 버프 행동만 거는 디버프는 끔(허수아비는 자기 마스크)
    // 디버프 스킬의 부작용(debuff.side, 2026-10-17 딩 DB: 셴화 ブレイクダウン은 '적과 아군 전체'에 힘 50% DOWN·물리 저항 50% UP도) — 그 디버프가 켜진 만큼
    if(m.deb && m.deb.side) for(const sd of m.deb.side){ const k0 = sd.src, b0 = +m.deb[k0]||0; if(!(b0>0)) continue; const dk = 'd_'+k0;
      const on = Math.max(0, Math.min(1, (+d[k0]||0)/b0)) * (fr ? (x => x!=null ? x : 1)(rowV(fr, idx, dk)) : 1) * (off && off[dk]===0 ? 0 : 1) * sbG(j, dk); if(!(on>0)) continue;
      if(sd.ally && sd.ally[stat]) sideDn = Math.max(sideDn, pct(sd.ally[stat])*on);
      const er = sd.enemy ? (kind==='phys' ? sd.enemy.phys_res : sd.enemy.mag_res) : 0; if(er) sideRes = Math.max(sideRes, pct(er)*on); }
    if(!fr && !st && !sbD && !off){
      tv.push(pct(d.all_elem_res)); if(erV) tv.push(pct(erV));
      if(kind==='phys'){ phv.push(pct(d.phys_res)); if(d.weapon_res) phv.push(pct(d.weapon_res[wt])); } else mgv.push(pct(d.mag_res));
      const dv = kind==='phys' ? d.end : d.spr; if(dv) dfv.push(pct(dv));
      continue;
    }
    const D = k=>{ let v = 1; if(fr){ const x = rowV(fr, idx, k); if(x!=null) v = x; } if(st && st.has(k)) v/=nTg; if(off && off[k]===0) v = situation==='normal' && m.bact && m.bact.vcOnly && m.bact.vcOnly.has(k) && !A.noBack ? v*vcUp(m.bact, k) : 0; return v*sbG(j,k); };
    tv.push(pct(d.all_elem_res)*D('d_all_elem_res')); if(erV) tv.push(pct(erV)*D('d_elem_res'));
    if(kind==='phys'){ phv.push(pct(d.phys_res)*D('d_phys_res')); if(d.weapon_res) phv.push(pct(d.weapon_res[wt])*D('d_weapon_res')); }
    else mgv.push(pct(d.mag_res)*D('d_mag_res'));
    const dv = kind==='phys' ? d.end : d.spr; if(dv) dfv.push(pct(dv)*D(kind==='phys'?'d_end':'d_spr'));
  }
  if(BUD) for(const b of BUD){ const d=b.deb; if(!d) continue; const f=b.p;
    if(d.all_elem_res) tv.push(pct(d.all_elem_res)*f); if(d.elem_res && el!=='none' && d.elem_res[el]) tv.push(pct(d.elem_res[el])*f);
    if(kind==='phys'){ if(d.phys_res) phv.push(pct(d.phys_res)*f); if(d.weapon_res && d.weapon_res[wt]) phv.push(pct(d.weapon_res[wt])*f); }
    else if(d.mag_res) mgv.push(pct(d.mag_res)*f); }
  const typeR = (el!=='none'||kind==='mag') ? dimin(tv,1) : 0;
  const physR = (kind==='phys' ? dimin(phv,1) : dimin(mgv,1)) - sideRes; // 적 저항 UP 부작용은 빼기
  const defR = dfv.length ? dimin(dfv,1) : 0; // 내구·정신 DOWN: 기본 대미지의 방어에
  // 딩 계산기 기본 대미지: 스탯·장비 공격력·속성 보정·스탯 버프·방어(방어 무시면 0). 크리는 따로(일반타/크리타 나눠 25억 경감)
  const D = pr.D || {str:230, int:230, spd:220, lck:156, mp:450, atk:457, mag:457};
  const fsObj = stat==='int' ? {i:flatP} : stat==='spd' ? {s:flatP} : {p:flatP};
  const diW = frac(sk.def_ignore), bh = dingHit(D, G5_OF(kind, stat), el!=='none', Math.max(-0.9, statB - sideDn), diW>=1 ? 1 : diW>0 ? defR + (1-defR)*diW : defR, fsObj); // 아군 스탯 DOWN 부작용은 버프에서 빼기
  /* 버프 적용 스탯 비례 위력(skill_cond need stat + live, 2026-10-18): 그 순간 공격 스탯(기본·장비 + 고정값) × (1 + 스탯 버프)로 충족 비율 — 셴화 ホライゾン 640%+지성(상한 2000)·베네딕트 220%+3×힘(상한 999)·키쿄 속도(상한 600).
     예전엔 기본 스탯 × (1+buff) 어림과 AF 비율(af_p) 고정이라 허수아비 AF에선 버프가 다 걸려도 30%만 셈 */
  if(sk.mcond && sk.mcond.need && sk.mcond.need.some(n=>n && n.live && n.stat===stat)){
    const SK = stat==='int' ? 'int' : stat==='spd' ? 'spd' : 'str', liveV = ((+D[SK]||0) + flatP) * (1 + Math.max(-0.9, statB - sideDn));
    const nd = sk.mcond.need.map(n=>{ if(!(n && n.live && n.stat===stat)) return n; const x = Math.max(0, Math.min(1, liveV/Math.max(1, +n.full||500))); return {af_p:x, n_p:x}; });
    const m1 = condMult(sk, sk.mcond, situation, team, c, progs, idx, A, zone, enemy, el); if(m1>0) dmg *= condMult(sk, ({...sk.mcond, ...{need:nd}}), situation, team, c, progs, idx, A, zone, enemy, el)/m1; }
  const lunaF = (1+0.7*Math.min(1,kessW)) * (1+0.5*Math.min(1,shinW)); // 루나틱 44행: 결사 ×1.7 → 심안 ×1.5
  dmg *= bh.n * (1+typeR+physR) * (1+budDmg) * lunaF * dmgUp;

  // 크리티컬
  if(frac(sk.crit_sure)>=1 || kessW>=0.5) critR = Math.max(critR,1); // 결사: 크리티컬 확정
  else if(frac(sk.crit_sure)>0) critR = critR + (Math.max(critR,1)-critR)*frac(sk.crit_sure); // 상태 중에만 확정 크리(self_on)
  if(kind==='mag' && critR<=0) critR=0;
  const p = Math.min(Math.max(critR,0),1);
  const cR = bh.c/bh.n*(1+critD); // 크리타 ÷ 일반타 (방어/4 · ×3.25 · 크리 위력)
  // 오버크리티컬: 크리율 100% 초과분 ÷ 10 이 발생 확률 (1100%면 확정), 발생 시 대미지 2배
  const ocP = ocW>0 ? Math.min(Math.max((critR-1)/10,0),1)*Math.min(1,ocW) : 0;

  // 브레이크
  let brk = 1; const bkG = {};
  for(let bi=0; bi<A.breaks.length; bi++){ const b=A.breaks[bi], bj = A.breakJ ? A.breakJ[bi] : -1, bt = bj>=0 && team[bj] && team[bj].afT && team[bj].afT.deb;
    if(bt && afTV(bt.break, situation, A, !!(progs[bj]&&progs[bj].sbOK), team[bj].afT.real && team[bj].afT.real.deb ? team[bj].afT.real.deb.break : null, sbU(bj)) < 0.5) continue; // 체인·턴 종료 등으로만 거는 브레이크는 AF 땐 없음
    if(bj>=0 && FX && FX[bj] && (b => b!=null && b<0.5)(rowV(FX[bj], idx, 'brk_x'))) continue; // 허수아비: 건 사람이 그 스킬을 쓰기 전
    // 존 조건·켜진 비율(debuff.break_zone {zone, zlv}·break_up {n, af, real}, 2026-10-16 점검3: 오를레아 招雷陣 때만, 오보로 ライジンモード Lv2 뒤 등)
    const bd = bj>=0 && team[bj].raw && team[bj].raw.debuff || {}, bz = bd.break_zone;
    if(bz && !(zoneMatch(bz.zone, zone) && (!bz.zlv || (zone && zone.level>=bz.zlv)))) continue;
    const bu = bd.break_up, bf = (!bu ? 1 : Math.max(0, Math.min(1, +(situation==='normal' ? bu.n : (A.realT>1 && bu.real!=null ? bu.real : bu.af!=null ? bu.af : 1)) || 0)))
      * (bj===-2 ? (situation==='normal' ? 1 : A.realT>1 ? 1/BRK_AF_R : 0) : 1); // 버디 브레이크: 평상 턴은 매 턴, 앞 턴에 건 축적이 AF 앞부분에(1턴째 AF엔 없음)
    if(!(bf>0)) continue;
    if(b===el || b===wt || (b.indexOf('_')>0 && b.split('_').includes(wt))) bkG[b] = (bkG[b]||0) + brkGain(A, team, bi, b, situation)*bf; // 엘리멘탈·웨폰 브레이크(斬突·斬魔 등 두 종류)
    else if(BRK_ONCE.has(b)) bkG.once = (bkG.once||0) + brkGain(A, team, bi, 'once', situation)*bf;
  }
  // 연계 웨폰 브레이크(2026-10-18, 짭코코 猫染め御免ニャ 「攻撃対象にウェポンブレイクを3蓄積…攻撃種別は付与対象に応じて変化」): 연계를 받은 아군이 공격할 때마다
  // 그 공격 타입 웨폰 브레이크 3축적 → 그 타입 타격 3개가 2배. 받은 사람이 행동할 때마다(평상·AF) 다시 → 이득 = 3 ÷ 그 타입 한 바퀴 타수 × 연계 켜진 비율
  if(A.lnkBrk && FX) for(const j of A.lnkBrk){ const fr = FX[j]; if(!fr) continue; const nb = +team[j].party.link_brk||BRK_N;
    for(let r=0;r<team.length;r++){ const wr = team[r].wt; if(!wr || wr!==wt) continue; const lv = rowV(fr, r, 'link'); const lw = lv==null ? 0 : Math.max(0, Math.min(1, lv)); if(!(lw>0)) continue;
      const H = team.reduce((t,c)=> t + (c.wt===wr ? brkHits(c) : 0), 0) || 1; bkG[wr] = (bkG[wr]||0) + Math.min(1, nb/H)*lw; } }
  for(const t in bkG) brk = Math.max(brk, 1 + Math.min(1, bkG[t])); // 같은 종류는 건 사람끼리 더함(쌓임), 종류끼리는 큰 쪽
  dmg *= brk;

  // 약점/내성
  let rel = null;
  const wR = w => A.realT>1 && w.real!=null && w.real!=='sb' && +w.real>=0.5; // 실전 2턴째 이후 AF: 약점 부여 조건(축적 등)이 채워짐
  // 약점 부여가 켜진 비율(2026-10-16): 예전엔 켜짐/꺼짐(0.5 문턱)뿐이라 개전 1턴만·스킬 쓴 턴만·SB 그 턴만인 약점 간파가 평상 턴 내내 켜지던 문제 → 비율로 섞음
  const c01 = v => Math.max(0, Math.min(1, +v||0));
  const wkF = t => { let best = 0; for(const w of (A.weakInfo||[])){ if(!wkHit(w, t, zone)) continue; let f = 1;
      if(wkGone(w, A)) continue; // 개전 n턴 한정 약점 간파(베르단타 3턴): 긴 전투의 그 뒤 AF(A.lateAF·realT)엔 없음
      if(w.noaf && situation!=='normal' && !wR(w)) f = 0;
      if(f>0 && (w.sb || (w.sbOnly && !wR(w)))) f = situation==='sb' || (situation==='af' && A.postSB) ? 1 : situation==='normal' && !w.sb1 ? c01(sbU(w.j)) : 0;
      if(f>0 && !w.start){ const rf = FX && FX[w.j]; if(rf){ const wx = rowV(rf, idx, 'weak_x'); if(wx!=null) f *= c01(wx); } }
      if(f>0 && w.up){ const u = situation==='normal' ? w.up.n : (A.realT>1 && w.up.real!=null ? w.up.real : w.up.af); if(u!=null) f *= c01(u); }
      if(f>best) best = f; } return best; };
  const wf = Math.max(wkF(el), wkF(wt)), added = wf>=0.5;
  const relOf = ad => { if(!enemy) return ad ? 'weak' : null; const rs=[enemyRel(enemy, el), enemyRel(enemy, wt)];
    if(rs.includes('weak') || (ad && !rs.includes('null') && !rs.includes('absorb'))) return 'weak'; if(rs.includes('resist')) return 'resist'; if(rs.includes('null')) return 'null'; if(rs.includes('absorb')) return 'absorb'; return null; };
  // 약점 시 대미지 UP(2026-10-18 딩 DB 32건 전부 효과량 1 = +100%, 26행): 같은 상태라 여러 명이 걸어도 가장 큰 것 하나(예전엔 합 — 데이터가 1·30·50·100 섞여 있었음)
  const weakUp = Math.max(0, ...weakD);
  const relFOf = r => r==='weak' ? bh.wk + weakUp + Math.min(1,shinW) : r==='resist' ? 0.25 : r==='null'||r==='absorb' ? 0 : 1; // 약점: 물리 1.85+마력 비례 · 마법 2 (딩 계산기 26행), 심안이면 +1
  const relW = relOf(true), relN = relOf(false);
  rel = added ? relW : relN; // 허수아비 등 상성 중립 적에게도 약점 부여는 통함
  let relF = relW===relN ? relFOf(relN) : wf*relFOf(relW) + (1-wf)*relFOf(relN);
  dmg *= relF;

  // 다단강화
  const xh = xW>=0.5 && kind==='phys';
  const hits = Math.max(1, sk.hits||1) + (xh ? 1 : 0);
  // 다단강화는 스킬 한 번 안의 n번째 타격 기준: 여러 스킬을 이어 치는 행동(execs, 예: 세스타(AS) 二刀神狼・改 5실행 10타)은 실행당 타수로
  if(mhW>0) dmg *= 1 + (multihitAvg(Math.max(1, Math.round(hits/atkEx(sk))))-1)*Math.min(1,mhW);
  if(xh) dmg *= hits/Math.max(1,hits-1);

  // 장비: 공격 글래스터 (속성/HP계 가산 +30%, 페인·독 곱연산 ×1.3)
  const inf = A.infPick || (A.infNoBud && situation!=='normal' && !(A.realT>1) ? A.infNoBud : A.inf) || (A.painAny ? {poison:1, pain:1} : {poison:0, pain:0}), infN = A.infNow || null; // 허수아비: 장착은 기대 가동률, 효과는 지금 걸렸는지 / 버디 독·페인은 1턴째 AF엔 아직 없음
  const zOn = !!(zone && zone.level>=2); // 각성의 힘: ZONE 각성(극·절) 중
  const hpLow = !!c.selfDamage, noEl = el==='none';
  const gk = '_gq'+Math.round(inf.poison*20)+'_'+Math.round(inf.pain*20)+(infN?'N'+Math.round(infN.poison*20)+'_'+Math.round(infN.pain*20):'')+(zOn?'z':'')+(hpLow?'h':'')+(noEl?'n':'');
  let gq = pr[gk] || (pr[gk] = grastaFactor(pr, inf, zOn, hpLow, noEl, infN));
  const share = A.mule ? A.mule.k[idx] : 0, sd = A.mule && A.mule.kd ? A.mule.kd[idx] : null;
  const plan = A.mule && A.mule.plan ? pglPlan(team, progs, A, S, zone) : null;
  if(plan){ const p = plan.per[idx];
    if(p && (p.e>0 || p.z>0)){ const base = 1 + (gq.add!=null ? gq.add : 0.3*(gq.e||0)), z0 = gq.z||0;
      const f = (base + p.e/100)/base * (1+GL_Z*z0+p.z/100)/(1+GL_Z*z0);
      gq = ({...gq, ...{f: gq.f*f, share: p.names.length, alloc:{e:p.e, z:p.z, t:0, pct:true, f, names:p.names}}}); } }
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
    gq = ({...gq, ...{f: gq.f*f, share, alloc:al}});
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
  else if(+S.gearQ>0 && +S.gearQ<1) dmg *= +S.gearQ; // 장비 세팅(최적 빌드 대비, 상한 전 대미지에 — 상한에 닿는 덱은 덜 줄어듦)

  // 방어 무시/배리어
  const pierce = pierceW>=0.5;
  if(ctx.needPierce) dmg *= 0.25 + 0.75*Math.min(1,pierceW);

  // 반복/재공격
  let rep = sk.repeat||0;
  if(situation!=='normal' && sk.repeat_af!=null) rep = +sk.repeat_af||0; // AF 중 재공격 횟수가 다른 스킬(이즈나 등 '非AF 시 재공격')
  else if(rep>0 && sk.rep_p!=null){ const rp = typeof sk.rep_p==='object' ? (situation==='normal' ? sk.rep_p.n : (sk.rep_p.af!=null ? sk.rep_p.af : sk.rep_p.n)) : sk.rep_p; rep *= Math.max(0, Math.min(1, +rp||0)); } // 재공격 조건 충족 확률(전수 대조: 개전 축적 등으로 늘 맞으면 1)
  else if(situation!=='sb' && rep>0 && (sk.condition||'').length>0) rep *= (A.dummy && /HP\s*50%\s*이상/.test(sk.condition||'')) ? 1 : 0.7; // 조건부 재공격 평균 0.7 — 허수아비는 HP가 줄지 않아 'HP 50% 이상이면 재공격'은 늘 충족(2026-10-19)
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
    row = FX&&FX[j] ? FX[j] : null; const fL = F(j,'link'); if(!(fL>0)) continue;
    for(const L of m.links){
      if(!linkTo(L.to, team, j, idx)) continue;
      if(L.zone && !zoneMatch(L.zone, zone)) continue;
      if(L.st && tgt!=='st') continue; // 받는 아군이 단체 공격할 때만(마츠리카 魂の力 연계, 2026-10-16 점검3)
      const Lel = L.follow && el!=='none' ? el : L.el; // follow: 연계를 일으킨 공격의 속성(무속성이면 기본 속성, 뮬루스(ES) ミュルスインパクト, 2026-10-17 딩 DB)
      const lk = 'st_'+kind+'_'+(Lel==='none'?'no':'el'), lsz = (SIZE_TABLE[lk]||SIZE_TABLE.st_phys_el)[SIZE_IDX[L.size]??3]/100;
      let lm = +L.mult||1; if(L.stack) lm = 1 + (lm-1)*stackFill(+L.stack, situation, A, false);
      let rho = lsz*lm*1.1/Math.max(1e-9, sizeV*mult*(tgt==='st'?1.1:1)/Math.max(1, sk.hits||1)); // 연계 1타 ÷ 스킬 1타
      if(Lel==='none' && el!=='none') rho /= 1.8; else if(Lel!=='none' && el==='none') rho *= 1.8; // 속성 보정(약 ×1.8) 차이
      const n = atkEx(sk)*(1+rep)*Math.min(1,fL); // 연계는 연속 실행마다 터짐(사용자 확인 2026-10-15) — 버프 실행은 빼고(af_seq)
      (links=links||[]).push({rho, el:Lel==='none'?'none':Lel, n}); linkHits += n;
    }
  }
  if(links && links.length>1 && S.linkStack!==true){ const b = links.reduce((x,y)=> y.rho*y.n > x.rho*x.n ? y : x); links = [b]; linkHits = b.n; } // 연계는 하나만(뒤에 건 것이 덮어씀 — game-info 状態効果まとめ 5-24, 2026-10-19): 가장 센 것을 남긴다고 봄(예전엔 여러 연계를 다 더함)
  // 帯電(루나틱<帯電>, 알테마 ウツハラ 「自身の攻撃1Hitにつき雷属性の追撃(小)」): 타격마다 雷 小 1배 추격 1회 — 다른 캐릭터 문구엔 위력이 없어 같은 값으로.
  // 추격은 그 타격의 대상 1체라 연계처럼 단일 크기, 공격 종류(물리·마법)는 그 공격을 따름(미기재). 추격도 AF 콤보·게이지 타수에 들어감
  // 2026-10-19 game-info 状態効果まとめ 3: 帯電 = '攻撃1hitにつき、威力20%固定の雷属性攻撃' → 위력 20%(예전 단일 小 1배 = 140% 가정의 1/7), AF 콤보 +1%·게이지 0.5%(comboInc·refill)
  if(chW>0){ const lsz = S.chargePow!=null ? +S.chargePow : 0.2;
    let rho = lsz*1.1/Math.max(1e-9, sizeV*mult*(tgt==='st'?1.1:1)/Math.max(1, sk.hits||1)); if(el==='none') rho *= 1.8;
    const n = totHits*chW; (links=links||[]).push({rho, el:'thunder', n, charge:true}); linkHits += n; }
  const csOK = sk.combo_scale && (!sk.combo_scale.when || !Object.keys(sk.combo_scale.when).length || ruleAct({w:sk.combo_scale.when}, idx, team, progs, situation==='af'?'normal':situation, zone, A)>0);
  // 이어 치는 스킬의 타격별 위력 비중(hit_w: [[타수, 위력]…], 타수 합 = hits일 때만 — 상태로 스킬이 바뀌면 무시): 큰 타격이 25억 경감을 더 받게(2026-10-16, 세스타(AS) 凶狼薙 2타가 위력 67%)
  const hw = Array.isArray(sk.hit_w) && sk.hit_w.length ? (g => { const H = g.reduce((a,x)=>a+x[0],0), W = g.reduce((a,x)=>a+x[1],0); return H===Math.max(1, sk.hits||1) && W>0 ? {H, g: g.map(x=>[x[0], x[1]/W])} : null; })(sk.hit_w.map(x=>[+x[0]||0, +x[1]||0]).filter(x=>x[0]>0 && x[1]>0)) : null;
  return {cs: csOK ? sk.combo_scale : null, ca: +sk.combo_add||0, cup: cupA, perHit: pN*critX, pN, cR, p, oc:ocP, totHits, hw, links, linkHits, nT, el, elN: elOwn, wt, kind, tgt, usingSB, skill:sk.skill, rel, critR, ocP, statB, elB, wB, specB, typeR, physR, brk,
    afx: (ax => totHits+linkHits>0 ? (totHits*ax + linkHits)/(totHits+linkHits) : ax)(sk.afx_zone && !zoneMatch(sk.afx_zone, zone) ? 1 : sk.af_combo_x||1) /* afx_zone: 그 존일 때만 AF 콤보 증가량 배율(질퍼니(AS) 輝晶陣). 스킬의 AF 콤보 증가량 배율은 그 스킬 타격에만 — 연계·帯電 추격 타수는 1배(2026-10-16, 빅트 과대평가) */, hitsPerAct: totHits + linkHits, afxS: sk.afx_zone && !zoneMatch(sk.afx_zone, zone) ? 1 : (+sk.af_combo_x||1), rep, cpy: !!sk.copy, execs: Math.max(1, +sk.execs||1)*(1+rep) /* 실행 수(연속 실행·재공격 포함): AF 게이지는 실행마다 */, afSeq: Array.isArray(sk.af_seq) && sk.af_seq.length && sk.af_seq.length<=Math.max(1, +sk.execs||1) ? sk.af_seq : null /* 게이지가 차는 공격 실행(zoneAFAct) */, gq, pierce:!!pierce, pw: Math.min(1, pierceW), sizeV, mult, stat, critD, baseHits: Math.max(1, sk.hits||1),
    bh, defR, flatP, lunaF, auraF, auraR, chW, kess: kessW>=0.5, shin: shinW>=0.5, dmgUp, dmgS, mpB, mpAtkSk, weakSk: weakUp, mpF: focW>0 ? mpF : 0, mpTot: mpBase*(1+mpB), relF, gearF: pr.f*(pr.gear?pr.gear.q:1), budDmg, mhW, xh, st1: tgt==='st', spdBuf: dimin(spdv, 1), sit: situation, viaAlt:null, viaSbN:false, cycMain:0, mixL:null, mix:null}; // 뒤에 붙는 칸도 처음부터(같은 모양)
}

/* 스킬 위력 조건(skill_cond.json): 조건이 맞을 확률로 base~mult 사이 기대 배율 */
/* 약점 부여가 지금 켜진 비율(2026-10-16 점검 검증: skill_cond '약점 시'·버디 약점 오라가 SB 그 턴만·평상 턴 0인 약점 간파도 늘 켜진 것으로 보던 문제) */
/* 약점 부여 속성: 'zone'이면 깔린 속성 존의 속성(없으면 기본 dflt, 네코코(ES) 猫又巫女神楽 「属性ZONEに応じて弱点看破属性変化」, 2026-10-16) */
const wkEl = (w, zone) => w.t!=='zone' ? w.t : (zone && zone.kind==='elem' && zone.level>0 ? zone.types : [w.dflt||'wind']);
const wkHit = (w, t, zone) => { const e = wkEl(w, zone); return Array.isArray(e) ? e.includes(t) : e===t; };
/* 개전 n턴 한정 약점 간파(weak_expose_up.t, 2026-10-20 — 베르단타 ジェネラルブレイズ: 전열 개전 시 敵全体 弱点看破(水) 3턴, 다시 거는 수단 없음(알테마 1185)):
   그 턴이 지난 AF(긴 전투 지속 딜의 A.lateAF, 실전 N턴의 4턴째 이후 AF — realT)엔 없음. 평상 턴 평균 유지율은 up.n */
const wkGone = (w, A) => !!(w && w.up && +w.up.t>0 && (A.realT||0) > +w.up.t);
function weakFrac(A, el, sit, zone){ let best = 0;
  for(const w of (A.weakInfo||[])){ if(!(w.t===el || wkHit(w, el, zone))) continue; let f = 1; if(wkGone(w, A)) continue;
    if(w.up) f = sit==='normal' ? +w.up.n||0 : (A.realT>1 && w.up.real!=null ? +w.up.real||0 : (w.up.af!=null ? +w.up.af||0 : 1));
    if(w.noaf && sit!=='normal' && !(A.realT>1)) f = 0;
    if(w.sbOnly || w.sb) f *= sit==='normal' ? (w.sb1 ? 0 : 0.3) : (sit==='sb' || A.postSB) ? 1 : 0;
    best = Math.max(best, Math.max(0, Math.min(1, f))); }
  return best; }
/* 臨機応変(2026-10-16): 스킬 adapt 'weak' = 적 약점 타입(없으면 아군 약점 간파 타입)으로(니르야 必殺アビセ蹴り), 'front' = 전열에서 가장 많은 물리 공격 타입(월화의 영애 — 동수면 원래 타입) */
const PHYS_WT = ['slash','pierce','blunt'];
function adaptWt(sk, wt, kind, team, A, enemy, idx, zone){
  if(!sk || !sk.adapt || kind==='mag') return wt;
  if(sk.adapt==='weak'){ const e = enemy && PHYS_WT.find(t=>enemyRel(enemy, t)==='weak'); if(e) return e;
    const w = (A && A.weakInfo || []).map(x=>x.t).filter(t=>PHYS_WT.includes(t)).sort()[0]; return w || wt; }
  if(sk.adapt==='zone'){ const t = zone && zone.kind==='weap' && zone.level>0 ? (zone.types||[]).find(x=>PHYS_WT.includes(x)) : null; return t || wt; } // 유인(AS) 禁呪煉獄符: 전개 중인 공격 종별 존 타입으로(斬突처럼 둘이면 앞쪽)
  if(sk.adapt==='ally' && idx!=null){ const nb = allyNb(team, idx, A), k = nb && !(nb.main && nb.main.kind==='mag') ? ((nb.main && nb.main.weapon_type) || nb.wt) : null; return PHYS_WT.includes(k) ? k : wt; } // 이벨라(AS)·노나(AS): 변환 대상 이웃 아군의 무기 타입(속성 변환 ally와 같은 이웃)
  if(sk.adapt==='front'){ const n = {}; for(const m of team.slice(0,4)){ const k = (m.main && m.main.kind==='mag') ? 'magic' : ((m.main && m.main.weapon_type) || m.wt); if(PHYS_WT.includes(k)) n[k] = (n[k]||0)+1; }
    let b = wt, bn = n[wt]||0; for(const t of PHYS_WT) if((n[t]||0) > bn){ b = t; bn = n[t]; } return b; }
  return wt;
}
function condP(cd, sit, team, c, A, zone, enemy, el, progs){
  const nrm = sit==='normal';
  // per: 축적 속도가 전열 조건 인원수에 비례(턴마다 그 수만큼, full개에서 가득 — 프레메아(AS) サジタ·멜로디(AS) デザイア) → 가득 차는 턴 = full ÷ 인원수
  const tnE = cd.per ? (k => k>0 ? Math.max(1, (+cd.per.full||+cd.turns||1)/k) : 99)(frontCount(cd.per, team)) : null;
  // 스탯 비례 위력: {stat:'spr', full:500, buff:0.5, sum:'front'} — 기본 스탯(천명치 반영)·버프로 최대치 대비 비율
  if(cd.af_p!=null && sit!=='normal'){ let x = Math.max(0, Math.min(1, +cd.af_p)); // AF·SB(허수아비 1턴) 때 충족 비율을 직접 지정(축적이 AF 중 안 늘거나 개전 축적량이 정해진 경우)
    if(cd.af_r!=null && A.realT>1){ const r = Math.max(0, Math.min(1, +cd.af_r, tnE ? 2/tnE : 1)); x += (r - x)*Math.min(1, (A.realT-1)/2); } // af_r: 실전 3턴째 AF·SB의 충족 비율(per면 2턴 동안 쌓인 만큼까지)
    return x; }
  if(cd.n_p!=null && nrm) return Math.max(0, Math.min(1, +cd.n_p||0)); // 평상 턴 충족 비율을 직접 지정(아자미(AS) 葩昇の太刀 後攻: 다른 아군이 먼저 치면 미충족)
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
    if(e==='weak'){ // 약점 공격: 속성 또는 공격 타입 약점(2026-10-16 — 예전엔 속성만), 臨機応変(adapt)이면 적의 어느 물리 타입 약점이든
      const sk0 = (c && c.main) || {}, wt0 = c ? adaptWt(sk0, sk0.weapon_type || (sk0.kind==='mag' ? 'magic' : c.wt), sk0.kind==='mag'?'mag':'phys', team, A, enemy, team.indexOf(c), zone) : null, wts = wt0 ? [wt0] : [];
      if(enemy && (enemyRel(enemy, el)==='weak' || wts.some(t=>enemyRel(enemy, t)==='weak'))) return 1; const wf = Math.max(weakFrac(A, el, sit, zone), ...wts.map(t=>weakFrac(A, t, sit, zone))); return enemy ? wf : Math.max(wf, 0.4); }
    if(e==='break') return A.breaks.length ? 1 : 0.3;
    return 0.8; }
  if(cd.turn){ if(nrm) return 0.3; const T = A.realT>1 ? A.realT : 1, m=String(cd.turn).match(/>=\s*(\d+)/), m2=String(cd.turn).match(/<=\s*(\d+)/); return m ? (+m[1]<=T ? 1 : 0) : m2 ? (T<=+m2[1] ? 1 : 0) : 0.5; } // AF·SB = 허수아비 1턴(실전 N턴은 그 AF의 턴)
  if(cd.other) return 0.6;
  return 1;
}
function condMult(sk, mc, sit, team, c, progs, idx, A, zone, enemy, el, needF){
  const top = Math.max(mc.top!=null ? +mc.top : (sk.mult||1), 1), base = Math.max(0.1, mc.base!=null ? +mc.base : 1);
  const P = conds => { let p=1; if(conds) for(let i=0;i<conds.length && p>0;i++) p*=condP(conds[i], sit, team, c, A, zone, enemy, el, progs); return p; };
  let e=base, prev=base;
  const st = mc._st || (mc._st = (Array.isArray(mc.steps)?mc.steps:[]).filter(s=>Array.isArray(s)&&s.length>=2&&+s[0]>base&&+s[0]<top).sort((a,b)=>a[0]-b[0]));
  for(let i=0;i<st.length;i++){ const v=+st[i][0]; e += (v-prev)*P(st[i][1]); prev=v; }
  e += (top-prev)*P(mc.need)*(needF==null ? 1 : needF);
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
  const zf = zoneFactorEff(z, core.el, core.wt, S, core.rel)*(core.sit==='af' && S.starseaZone!==false && S.starseaAF!==false && isSS(z) ? 2 : 1), c = combo||1, p = core.p, oc = core.oc||0; // 성해진: AF는 100%에서만 켜지고 그 AF 공격은 내내 ×2
  const H = v => Math.min(HIT_MAX, v*c);
  const E1 = x => !S.capOn ? x*c*((1-p) + p*core.cR*(1+oc))
    : S.capAfterCombo ? (1-p)*dingCap(x*c) + p*((1-oc)*dingCap(x*core.cR*c) + oc*dingCap(2*x*core.cR*c)) // 시험: 위키·공식('계산상 대미지가 25억을 넘으면 감쇠') 순서 — AF 콤보를 곱한 뒤 25억 경감
    : (1-p)*H(dingCap(x)) + p*((1-oc)*H(dingCap(x*core.cR)) + oc*H(dingCap(2*x*core.cR)));
  const cF = (core.cs || core.ca) ? comboF(core, combo) : 1;
  let tot = 0;
  if(core.hw){ const k = core.totHits/core.hw.H; for(const g of core.hw.g) tot += E1(core.pN*zf*cF*g[1]*core.hw.H/g[0])*g[0]*k; } // 타격별 위력 비중
  else tot = E1(core.pN*zf*cF)*core.totHits;
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
function stepValues(team, progs, A, enemy, S, cx, cap, posSets, noRed){ // noRed: 겹치는 버프 빼기 안 함(evalTeamV가 둘 다 계산해 나은 쪽)
  const idx = team.map((c,j)=>c.bact && c.bact.steps.length>=2 ? j : -1).filter(j=>j>=0); if(!idx.length && (S.dropRedundantBuff===false || noRed || !team.some(c=>c.bact && c.bact.steps.length))) return null;
  const zs = zoneCandidates(team, progs, 'af'); let z = null; for(const q of zs) if(q && q.level>0 && (!z || zBetter(q, z))) z = q;
  const out = team.map(()=>null);
  for(const j of idx){ const b = team[j].bact, L = b.steps.slice(0, 7), cur = new Set(b.auto); for(const x of b.main) cur.add(x);
    const noInf = team[j].inflict ? (()=>{ const t2 = team.map((c,k)=>k===j ? ({...c, ...{inflict:null}}) : c), i0 = inflictOf(t2, progs, S), bi = A.bud && A.bud.inf, Ax = ({...A, ...{inf: bi ? budInf(i0, bi) : i0, infNoBud: bi ? i0 : null}}); Ax.painAny = Ax.inf.poison>0 || Ax.inf.pain>0; return Ax; })() : null;
    const ecJ = !!(A.echg && A.echg.some(e=>e.i===j) && b.steps.some(st=>st.g.has('echg')));
    const D = (m, inf) => { const FX = team.map(()=>null); FX[j] = bfOne(team, progs, 'af', z, A, posSets, {m}, true, j); const Ax0 = inf || !noInf ? A : noInf;
      const Ax = ecJ ? ({...Ax0, ...{echg: (L=>L.length?L:null)(A.echg.filter(e=>e.i!==j || m.has('echg'))), _ecFix:true}}) : Ax0;
      return team.reduce((v,c,i)=>{ const co = attackerCore(team, i, progs, Ax, enemy, S, 'af', cx, FX, z); return v + (co ? applyZoneCap(co, z, S, cap, 1) : 0); }, 0); };
    let inf = false, dCur = D(cur, inf); const rank = new Map(), left = L.slice(); let r = L.length;
    while(left.length){ let bi = -1, bg = -Infinity, bm = null, bInf = inf, bd = dCur;
      for(let q=0;q<left.length;q++){ const st = left[q], m = new Set(cur); for(const x of st.g) m.add(x); const i2 = inf || st.g.has('d_pain_poison'); const d = D(m, i2), g = d - dCur;
        if(g > bg + 1e-9*Math.max(1,dCur) || (Math.abs(g-bg) <= 1e-9*Math.max(1,dCur) && (st.sc||0) > (left[bi].sc||0))){ bg = g; bi = q; bm = m; bInf = i2; bd = d; } }
      const st = left.splice(bi, 1)[0]; rank.set(st, r--); for(const x of bm) cur.add(x); inf = bInf; dCur = bd; }
    out[j] = b.steps.map(st=>rank.has(st) ? rank.get(st) : 0); }
  /* 겹치는 버프 행동(2026-10-20, 사용자 '속도 버프 이미 100%면 더 걸 필요가 있나'): 다른 아군 버프로 이미 상한(능력치 +100% — dimin 상한 1)이거나 같은 상태(심기일체 등)라
     빼도 AF·평상 턴 대미지와 속도(AF 대기)가 그대로인 버프 행동은 순위 −1 → 평상 턴에 안 걸고 스킬 칸도 안 씀(예: 다르니스(AS) ギャラントリー 속도 100% 옆 번개술사(AS) オグメントパッチ).
     버프 스킬(k buff)만 보고 독·디버프·존·연계·속성 변환이 붙은 행동은 그대로(서로 미루다 둘 다 빠지는 것 방지), id 순으로 빼 가며 앞에서 뺀 효과는 뒤 캐릭터 계산에서 꺼짐. S.dropRedundantBuff=false면 끔 */
  const red = []; if(S.dropRedundantBuff!==false && !noRed){ const BADK = x => x.indexOf('d_')===0 || x==='brk' || x==='link' || x==='echg' || x.indexOf('weak')===0 || x==='ctr' || /^te\d+$/.test(x); // ctr(요격·도발 자세)·te(턴 종료 공격)는 대미지·속도 비교로 못 잼(2026-10-20 점검: 미나르카(AS) 둠·시온(AS) 臥龍の構え가 '겹침'으로 빠졌음)
    const idR = team.map((c,j)=>c.bact && c.bact.steps.length ? j : -1).filter(j=>j>=0).sort((a,b)=>team[a].id<team[b].id?-1:team[a].id>team[b].id?1:a-b);
    // 다른 아군은 스킬 칸에 달 행동만(평상 턴 시뮬과 같은 순서: 존 전개 → 순위, 2026-10-20 — 칸이 모자라 안 다는 아나벨(ES) 聖騎士の軌跡를 '이미 있음'으로 봐서 백자의 마인 기도 버프를 빼던 문제)
    const zcR = team.some(c=>c.bact && c.bact.steps.some(st=>st.z)) ? zoneCandidates(team, progs, 'normal') : null, agR = !!(zcR && zcR.some(q=>q && q.how==='개전 자동' && q.level>=2));
    const eqIdx = k => { const c = team[k], b = c.bact, rk = out[k], zU = !(b.steps.some(st=>st.z) && zoneStepUseless(team, progs, k, zcR)), zp = q => zU && b.steps[q].z && !(agR && b.steps[q].z==='awaken') ? 1 : 0; // simTeam ord0과 같은 칸 고르기(2026-10-20 점검)
      const ord = b.steps.map((st,q)=>q).filter(q=>!b.steps[q].na && !(rk && rk[q]<0) && ((zU && !(agR && b.steps[q].z==='awaken')) || !b.steps[q].z || (b.steps[q].g && b.steps[q].g.size))).sort((x,y)=>zp(y)-zp(x) || (rk ? rk[y]-rk[x] : 0) || x-y);
      return new Set(slotPick(b.steps, ord, skillSlots(c, progs[k]), freeSk(c, progs[k])).concat(b.steps.map((st,q)=>st.na?q:-1).filter(q=>q>=0))); };
    const fullM = k => { const b = team[k].bact, m = new Set(b.auto), E = eqIdx(k); for(const x of b.main) m.add(x); b.steps.forEach((st,q)=>{ if(E.has(q) && st.g) for(const x of st.g) m.add(x); }); return m; };
    // 존마다(평상 턴 존은 이 뒤에 고르므로 후보 전부 + 존 없음): 버프 규칙이 존 조건이라 어떤 존에선 겹쳐도 다른 존에선 필요(벨벳(AS) エクソシア는 招雷陣에서만 100% — 각음진이면 백자의 마인 버프가 필요)
    const ZL = [null]; for(const q of zoneCandidates(team, progs, 'normal').concat(zs)) if(q && q.level>0 && !ZL.some(y=>y && y.key===q.key && y.level===q.level)) ZL.push(q);
    const fx = (sit, zz, k, m) => bfOne(team, progs, sit, zz, A, posSets, m ? {m} : team[k].bact ? {m: fullM(k)} : 1, true, k); // 다른 아군 버프는 다 건 상태(받는 사람·조건 규칙 그대로)
    const FXo = ZL.map(zz=>team.map((c,k)=>fx('af', zz, k))), FXn = ZL.map(zz=>team.map((c,k)=>fx('normal', zz, k)));
    const D2 = (j, m) => ZL.map((zz, q)=>{ const Fa = FXo[q].slice(), Fn = FXn[q].slice(); Fa[j] = fx('af', zz, j, m); Fn[j] = fx('normal', zz, j, m); let v = 0, w = 0, sp = 0;
      team.forEach((c,i)=>{ const co = attackerCore(team, i, progs, A, enemy, S, 'af', cx, Fa, zz); if(co){ v += applyZoneCap(co, zz, S, cap, 1); sp += +co.spdBuf||0; }
        const cn = attackerCore(team, i, progs, A, enemy, S, 'normal', cx, Fn, zz); if(cn) w += applyZoneCap(cn, zz, S, cap, 1); }); return {v, w, s: sp}; });
    for(const j of idR){ const b = team[j].bact, cur = fullM(j), Ej = eqIdx(j);
      let base = null, drop = false;
      b.steps.forEach((st,q)=>{ if(q>=7 || !Ej.has(q) || st.k!=='buff' || !st.g || !st.g.size || st.z || st.na || st.song || st.once || [...st.g].some(BADK)) return; // 버프 스킬만(공격 버프기는 평상 턴 공격·AF 게이지·성도 스킬 칸 몫이 있음 — 테오도로스 残夢燃ゆ를 빼면 AF가 반토막)
        const own = new Set(b.auto); for(const x of b.main) own.add(x); b.steps.forEach((s2,q2)=>{ if(q2!==q && Ej.has(q2) && s2.g && !(out[j] && out[j][q2]<0)) for(const x of s2.g) own.add(x); });
        const uq = [...st.g].filter(x=>!own.has(x)); if(!uq.length) return; // 자기 다른 행동과 같은 효과뿐이면 그대로(어느 쪽을 쓸지는 순위가 정함)
        base = base || D2(j, cur); const m = new Set(cur); for(const x of uq) m.delete(x); const d = D2(j, m), e = 1e-6;
        if(d.every((r,k)=> r.v >= base[k].v*(1-e) && r.w >= base[k].w*(1-e) && r.s >= base[k].s - e)){ out[j] = out[j] || b.steps.map(()=>1); out[j][q] = -1; for(const x of uq) cur.delete(x); base = d; drop = true; red.push({i: j, s: st.sko || skN(st.s) || st.s}); } });
      if(drop) ZL.forEach((zz,q)=>{ FXo[q][j] = fx('af', zz, j, cur); FXn[q][j] = fx('normal', zz, j, cur); }); } }
  if(!out.some(v=>v)) return null; if(red.length) out.red = red; return out;
}
function simTeam(team, progs, S, stepV, opt){ // opt.afBuff = AF 주기(턴): 버프 스킬을 AF 안에서 걸고 평상 턴엔 안 거는 운용(2026-10-20)
  const H = Math.max(1, Math.round(S.simTurns||6)), mul = S.mpCostMul||1, n=team.length;
  const mpTo = (j, i) => { const to = team[j].supTo && team[j].supTo.mp_recover; if(!to) return true; if(to.pos) return to.pos==='self' ? i===j : true; return toFilterOK(to, team[i]); };
  const regenOf = i => MP_REGEN[Math.min(3, Math.max(0, ...team.map((c,j)=>mpTo(j,i) ? +((c.sup||{}).mp_recover||0) : 0)))]||0; // MP 회복은 받는 사람 조건(본인만·속성 등)대로
  const regen = Math.max(0, ...team.map((c,i)=>regenOf(i)));
  const R = {H, regen, upt:[], kup:[], kupPre:[], t1a:[], eqOff:[], eqSk:[], afSt:[], afCast:[], kupAny:false, act:[], alt:[], altW:[], na:[], out:[], mainN:[], buffN:[], mpMax:[], costMain:[], lock:[], songUp:[], any:false};
  const zcN = team.some(c=>c.bact && c.bact.steps.some(st=>st.z)) ? zoneCandidates(team, progs, 'normal') : null;
  const autoGoku = !!(zcN && zcN.some(q=>q && q.how==='개전 자동' && q.level>=2)); // 개전부터 극 존이면 각성 행동은 쓸모없음(엘레노아 セイクリッドベール, 2026-10-16)
  const cMP = team.some(c=>c.counter && c.counter.heal) ? Math.min(100, counterMP(team, S)) : 0; R.ctrMP = cMP; // 요격 회복 MP(알마(AS) 요격 1번에 아군 전체 MP 10%, アルケミーハイ 2배): 보스가 때린 만큼
  for(let i=0;i<n;i++){
    const c=team[i];
    const mpMax = (S.mpBase||450) + Math.min(120, (progs[i].t||0)*0.47), regI = regenOf(i) + cMP/100*mpMax;
    // MP消費攻撃(질퍼니(AS) クルオルエンシス 등): 대미지 +100% 대신 공격 스킬 소비 MP +100% — AF(MP 소비 없음)엔 공짜지만 평상 턴엔 MP가 두 배로 듦
    const mpAtkX = (+((c.self||{}).mp_atk)||0)>0 || team.some(m=>m.party && m.party.scope!=='none' && (+m.party.mp_atk||0)>0) ? 2 : 1;
    const costMain = Math.round((c.mpMain!=null?c.mpMain:55)*mul*mpAtkX), costBuff = Math.round((c.mpBuff!=null?c.mpBuff:50)*mul);
    let bt = c.buffTurns>=99 ? H+1 : Math.max(1, c.buffTurns||3), dt = c.debTurns>=99 ? H+1 : Math.max(1, c.debTurns||3);
    if(S.buffTurnCap>0){ bt = Math.min(bt, S.buffTurnCap); dt = Math.min(dt, S.buffTurnCap); } // 보스 흉성 등: 턴 종료에 버프·디버프 해제
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
    const nSlot = skillSlots(c, progs[i]), zp = q => zUse && steps0[q].z && !(autoGoku && steps0[q].z==='awaken') ? 1 : 0, ep = q => steps0[q].g && steps0[q].g.has('echg') ? 1 : 0, ord0 = steps0.map((st,q)=>q).filter(q=>!steps0[q].na && !(sv && sv[q] < 0) && ((zUse && !(autoGoku && steps0[q].z==='awaken')) || !steps0[q].z || (steps0[q].g && steps0[q].g.size))).sort((a,b)=>zp(b)-zp(a) || (sv ? vq(b)-vq(a) : ep(b)-ep(a)) || a-b), frS = freeSk(c, progs[i]), pk = slotPick(steps0, ord0, nSlot, frS), eq = new Set(pk.concat(steps0.map((st,q)=>st.na?q:-1).filter(q=>q>=0)));
    { // 추천 스킬 칸(2026-10-17, 사용자 '추천 스킬셋도'): 주력·성도 스킬 말고 칸을 쓰는 버프·공격 스킬(같은 이름은 한 칸, 존 전개 먼저 → 이득 순)
      const nm = new Set(), L = []; for(const q of pk){ const st = steps0[q], k = skN(st.s); if(!k || nm.has(k) || frS.has(k)) continue; nm.add(k); L.push({n: st.sko || k, k: st.k, z: st.z || null, use: useStep(st)}); }
      R.eqSk.push({L, n: nSlot, tot: (progs[i] && (progs[i].t||0) >= 80) ? 4 : 3}); }
    const sOn = songOn(c, team, progs[i]), sOff = !!(progs[i] && progs[i].songOff); // 가창: 쓰면 그 턴 수 동안 행동 불가(사용자 확인 2026-10-18), songOff = 가창을 안 쓰는 운용
    const stepsAll = steps0.filter((st,q)=>eq.has(q) && useStep(st) && !(st.song && sOff));
    /* AF 안에서 거는 버프 스킬(2026-10-20, 사용자 '버프도 AF 시전하면서 다 걸어야'): 순수 버프(k buff — 존·가창·통상 공격 칸·1회·속성 변환 제외).
       1턴째 AF는 버프가 아직 없어 늘 AF 행동으로 걸고, opt.afBuff면 평상 턴엔 안 걸고 AF마다(지속 턴이 다음 AF까지 남으면 그만큼 덜) 건다 */
    const afCand = stepsAll.filter(st=>st.k==='buff' && !(st.z && zUse) && !st.song && !st.na && !st.once && st.g && st.g.size && !st.g.has('echg'));
    R.afSt.push(afCand.map(st=>({d: st.dur>0 ? st.dur : durOf(st), g: st.g, s: st.sko || skN(st.s) || st.s})));
    const afMv = opt && opt.afBuff ? afCand : null;
    /* AF 안 버프 운용(2026-10-20 사용자 '개전 후 첫 턴에 AF 치면 당연히 AF 중 버프 걸고 시작'): AF를 쓸 때마다 그 버프를 AF 안에서 다시 걸어(지속 d턴 중 AF 턴 1턴을 써서 평상 턴 d−1턴 남음) 평상 턴엔 공격.
       opt.afRe(AF 주기가 지속보다 길 때): 다음 AF 전에 끊기면 그때만 평상 턴에 다시 검(AF는 평상 턴 (C−1)턴마다, 1턴째 AF로 시작). 아니면 끊긴 턴은 버프 없이(유지율 min(1, (d−1)/(C−1))) */
    const afRe = !!(afMv && opt.afRe), steps = afMv && !afRe ? stepsAll.filter(st=>!afMv.includes(st)) : stepsAll, K = steps.length;
    const afIdx = afRe ? steps.map((st,q)=>afMv.includes(st) ? q : -1).filter(q=>q>=0) : [], afGap = afMv ? Math.max(1, (+opt.afBuff||2.5) - 1) : 0; let afAcc = 0;
    /* AF 턴도 버프 지속을 씀(2026-10-20): AF 주기 C면 평상 턴 C−1턴마다 AF 턴 1턴 — 평상 행동·MP 소비는 없고 버프·가창 지속 1턴 감소·MP 회복. AF 안 버프 운용은 그 주기(afGap), 기본 운용은 opt.afTick(evalTeam0이 첫 계산의 주기로 다시) */
    const tkOn = S.afTurnTick!==false, tkGap = !tkOn ? 0 : afMv ? afGap : opt && +opt.afTick>1 ? Math.max(1, +opt.afTick - 1) : 0;
    const afTick = (skip) => { for(let q=0;q<K;q++) if(rem[q]>0 && !(skip && skip.includes(q))) rem[q]--; if(lock>0) lock--; mp = Math.min(mpMax, mp + regI); };
    const rem = steps.map(()=>0), act = steps.map(()=>0);
    const dur = steps.map(st=>st.song && sOn ? (st.song>=99 ? H+1 : st.song) : st.dur>0 ? st.dur : durOf(st));
    let mp=mpMax, mainN=0, altN=0, naN=0, buffN=0, out=0, altWs=0;
    // 공격 버프기 1번의 위력 ÷ 주력 1번(위력 자료가 없으면 예전처럼 주력의 30%)
    const mP = skillPow(c.main)||1, aW = Math.max(ALT_R, c.naR||0);
    const stW = steps.map(st=>st.k!=='attack' ? 0 : st.pw ? Math.max(0.05, Math.min(1, skillPow({target:(c.main||{}).target, kind:st.pw.wt==='magic'?'mag':'phys', element:st.pw.el||(c.main||{}).element||c.elem||'none', size:st.pw.size, mult:st.pw.mult})/mP)) : aW); // 주력보다 센 버프기는 데이터상 주력 선택 문제라 1로 자름
    const zOnce = steps.map(st=>(zUse && !!st.z) || !!st.once), zDone = steps.map(()=>false); // 존 전개·각성·전투 중 1회(루나틱 등)는 한 번만(존은 깔린 채로 감)
    let lock = 0, lockN = 0, afCn = 0; const afSet = new Set(afCand);
    const afRef = () => { for(const q of afIdx) rem[q] = Math.max(rem[q], dur[q] - 1); }; if(afRe) afRef(); // AF에서 건 버프(평상 턴 몫)
    let a1 = null; // 1턴째 행동(m 주력·a 공격 버프기·대체 공격·b 버프·l 가창 잠김·n 통상 공격) — turnTimeline 1턴 딜(AF 안 버프 운용)
    for(let t=1;t<=H;t++){
      const k = lock>0 ? -2 : rem.findIndex((r,q)=>r<=0 && !(zOnce[q] && zDone[q])), cB = k>=0 ? (steps[k].mp0 ? 0 : Math.round((+steps[k].mp||c.mpBuff||50)*mul)) : 0;
      if(k===-2){ lock--; lockN++; if(t===1) a1 = 'l'; } // 가창 중: 행동 없음(효과는 그대로)
      else if(k>=0 && mp>=cB){ mp-=cB; rem[k]=dur[k]; buffN++; if(afSet.has(steps[k])) afCn++; if(zOnce[k]) zDone[k]=true; if(steps[k].k==='attack'){ altN++; altWs+=stW[k]; } if(sOn && steps[k].song) lock = Math.min(H, steps[k].song) - 1; if(t===1) a1 = steps[k].k==='attack' ? 'a' : 'b'; }
      else if(mp>=costMain){ mp-=costMain; mainN++; if(t===1) a1 = 'm'; }
      else { if(!out) out=t; if(mp>=costAlt){ mp-=costAlt; altN++; altWs+=aW; if(t===1) a1 = 'a'; } else { naN++; if(t===1) a1 = 'n'; } }
      for(let q=0;q<K;q++) if(rem[q]>0){ act[q]++; rem[q]--; }
      mp=Math.min(mpMax, mp+regI);
      if(afRe){ afAcc += 1; if(afAcc >= afGap - 1e-9){ afAcc -= afGap; if(tkGap) afTick(afIdx); afRef(); } } // 평상 턴 (C−1)턴 뒤 AF: 버프를 AF 안에서 다시(AF에서 거는 버프는 afRef가 d−1로)
      else if(tkGap){ afAcc += 1; if(afAcc >= tkGap - 1e-9){ afAcc -= tkGap; afTick(null); } }
    }
    const upt = K ? act.reduce((x,y)=>x+y,0)/(K*H) : 1;
    // 항목별 유지율(버프 행동이 있는 캐릭터): 쓴 행동의 켜진 턴 비율, 안 쓰는 행동만 주는 항목은 0, 자동·주력은 1, SB 전용은 0
    let kup = null, kpP = null; // kpP: AF 안 버프 운용(순수)에서 첫 AF 전 평상 턴 — AF로 거는 버프가 아직 없음
    if(c.bact){ kup = {}; const b = c.bact;
      for(const st of steps0) if(st.g) for(const x of st.g) kup[x] = 0;
      for(const x of b.sb) kup[x] = 0;
      steps.forEach((st,q)=>{ if(st.g) for(const x of st.g) kup[x] = Math.max(kup[x]||0, act[q]/H); });
      if(afMv && !afRe && afMv.length) kpP = {...kup};
      if(afMv && !afRe){ const C = Math.max(1, +opt.afBuff||2.5); for(const st of afMv){ const d = st.dur>0 ? st.dur : durOf(st), U = C<=1 ? 1 : Math.min(1, Math.max(0, d-1)/(C-1)); for(const x of st.g) kup[x] = Math.max(kup[x]||0, U); } } // AF에서 건 버프가 다음 AF까지 평상 턴에 남는 비율
      for(const x of b.main) kup[x] = 1; for(const x of b.auto) kup[x] = 1;
      for(const x of (b.vcOnly||[])) kup[x] = Math.max(kup[x]||0, progs.noBack ? 0 : vcUp(b, x)); // VC로만 거는 항목: 평상 턴 1/6(후열이 없으면 교대가 없어 0)
      if(kpP){ for(const x of b.main) kpP[x] = 1; for(const x of b.auto) kpP[x] = 1; for(const x of (b.vcOnly||[])) kpP[x] = Math.max(kpP[x]||0, progs.noBack ? 0 : vcUp(b, x));
        if(!Object.keys(kup).some(x=>(kpP[x]||0) < (kup[x]||0) - 1e-9)) kpP = null; }
      if(Object.values(kup).some(v=>v<1)) R.kupAny = true; else kup = null; }
    R.kup.push(kup); R.kupPre.push(kpP); R.t1a.push(a1 || 'm');
    { // 장착 못 한 버프 행동만 주는 항목(2026-10-16): 실전·지속 계산의 AF·SB에서도 끔(예전엔 평상 턴에서만 뺐음 — 엑코코 神鏡·騎猫之勢가 칸이 없어도 AF에 들어가던 문제)
      let off = null; if(c.bact){ const b = c.bact, has = new Set([...b.auto, ...b.main, ...b.sb]); stepsAll.forEach(st=>{ if(st.g) for(const x of st.g) has.add(x); });
        for(const st of steps0) if(st.g) for(const x of st.g) if(!has.has(x)) (off = off || {})[x] = 0;
        for(const x of (b.vcOnly||[])) (off = off || {})[x] = 0; } // VC 항목은 AF·SB엔 없음(평상 턴은 kup 1/6, 디버프는 attackerCore0에서)
      R.eqOff.push(off); }
    R.afCast.push(afCn/H); R.lock.push(lockN/H); R.songUp.push(sOn ? steps.reduce((m,st,q)=> st.song ? Math.max(m, act[q]/H) : m, 0) : (c.song && c.song.main && !sOff ? 1 : 0)); // 가창 유지율(AF 행동 불가 판단)
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
  const pool = auto && ctx && Array.isArray(ctx.pool) && ctx.pool.length ? ctx.pool.filter(p=>!team.some(c=>c.id===p.id || (p.base && c.base===p.base))) : null; // 전열과 같은 캐릭터(다른 스타일 포함)는 셔틀 불가
  const mo = {k, kd, cs, inv: pglWP(ctx), auto, wp, front: plan ? [] : front, plan, carriers, mules:mules.map(m=>({id:m.id||null, name:m.name||null, slots:m.slots, fromBuild:!!m.shares, pers:[...m.pers].filter(p=>Object.values(WEAPON_PERS).includes(p))}))};
  Object.defineProperty(mo, 'pool', {value: pool, enumerable: false}); // 셔틀 후보는 계산용(결과로 넘기지 않음)
  return mo;
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
  const A0 = ({...A, ...{mule:null}});
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
  T.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0); // 같은 이득이면 이름순(넣은 순서 무관, 2026-10-16: 최고점 셔틀 배분이 편성 순서에 따라 달라지던 문제)
  const run = carriers => {
    const Rc = R.map(r=>({...r, ...{add:0, zp:0, names:[]}})), Tc = T.map(t=>({...t}));
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
      bc.left--; bt.cap--; used.push(bt.label); (bc.items = bc.items || []).push(bt.label); score += bg; // 셔틀마다 다는 글래(화면 표시용)
      if(bt.kind==='add') for(const i of bt.recv){ Rc[i].add+=bt.v; Rc[i].names.push(bt.label); }
      else if(bt.kind==='zone' || bt.kind==='r49'){ for(const i of bt.recv){ Rc[i].zp+=bt.v; if(bt.kind==='zone') Rc[i].names.push(bt.label); } if(bt.kind==='r49') for(const i of bt.erecv) Rc[i].add+=bt.ev; }
      else if(bt.kind==='r51') q51+=bt.v; else if(bt.kind==='r50') q50+=bt.v;
    }
    return {score, Rc, used, q51, q50, carriers};
  };
  let best=null, wsel=null, shut=null, shutA=null;
  const nbA = mu.carriers.length, slA = mu.carriers.length ? mu.carriers[0].slots : 3;
  if(mu.auto && mu.pool && nbA>0){
    // 실제 보유 캐릭터를 셔틀로(2026-10-17): 퍼스널리티 P글래(무기 P 포함)는 그 퍼스널리티가 있는 셔틀만 달 수 있다.
    // 셔틀 후보를 '이 조합에 쓸모 있는 퍼스널리티' 묶음으로 줄이고(같은 묶음은 하나), 한 명씩 점수 상위 8묶음에서 셔틀 수만큼 고른다
    const K = new Set(T.filter(t=>t.carrier).map(t=>t.carrier)), prof = new Map();
    for(const p of mu.pool){ const ps = p.pers.filter(x=>K.has(x)).sort(), key = ps.join(','); const o = prof.get(key); if(o){ o.n++; o.names.push(p.name); o.ids.push(p.id); o.bases.push(p.base||p.id); o.owns.push(!!p.own); if(p.own) o.own++; } else prof.set(key, {key, pers:new Set(ps), n:1, names:[p.name], ids:[p.id], bases:[p.base||p.id], owns:[!!p.own], own:p.own?1:0}); } // 후보 순서 = 보유 먼저
    const L = [...prof.values()].map(o=>Object.assign(o, {s: run([{left:slA, pers:o.pers}]).score})).sort((a,b)=>b.s-a.s || (a.key<b.key?-1:a.key>b.key?1:0)).slice(0, 8);
    const combos = []; const rec = (k, from, acc) => { if(k===nbA){ combos.push(acc.slice()); return; } for(let a=from;a<L.length;a++){ if(acc.filter(x=>x===L[a]).length >= L[a].n) continue; acc.push(L[a]); rec(k+1, a, acc); acc.pop(); } };
    rec(0, 0, []);
    // 셔틀마다 실제 캐릭터 배정: 같은 캐릭터(다른 스타일 포함)는 한 파티에 하나 — 묶음 안에서 아직 안 쓴 캐릭터를 보유 먼저(2026-10-17)
    const assign = cb => { const usedB = new Set(), pick = []; for(const o of cb){ const j = o.bases.findIndex(b=>!usedB.has(b)); if(j<0) return null; usedB.add(o.bases[j]); pick.push(j); } return {pick, usedB}; };
    for(const cb of combos){ const asg = assign(cb); if(!asg) continue; const r = run(cb.map(o=>({left:slA, pers:o.pers}))); if(!best || r.score>best.score+1e-12){ best=r; shut=cb; shutA=asg; } }
    if(shut) wsel = shut.map(o=>{ const w = [...o.pers].find(x=>WPS.includes(x)); return w || null; }).filter(Boolean);
  }
  if(!best && mu.auto){
    const ws = [...new Set(R.map(r=>r.wp).filter(Boolean))].sort(), nb = mu.carriers.length, sl = mu.carriers.length ? mu.carriers[0].slots : 3;
    const combos = []; const rec = (k, from, acc) => { if(k===nb){ combos.push(acc.slice()); return; } for(let a=from;a<ws.length;a++){ acc.push(ws[a]); rec(k+1, a, acc); acc.pop(); } };
    if(ws.length && nb>0) rec(0, 0, []); else combos.push([]);
    for(const cb of combos){ const r = run(cb.length ? cb.map(w=>({left:sl, pers:new Set([w])})) : mu.carriers.map(m=>({left:m.slots, pers:new Set()}))); if(!best || r.score>best.score+1e-12){ best=r; wsel=cb; } } // 셔틀 후보 목록이 없을 때: 무기 퍼스널리티 하나짜리 가상 셔틀(다른 퍼스널리티 P글래는 못 담)
  } else if(!best) best = run(mu.carriers.map(m=>({left:m.slots, pers:m.pers||null}))); // 고정 셔틀(보유 셔틀 계획이 이미 있으면 덮어쓰지 않음 — 2026-10-17 버그: 셔틀 후보 계획을 퍼스널리티 제한 없는 계획이 덮어씀)
  const out = {per: best.Rc.map(r=>({e:r.add, z:r.zp, names:r.names})), r51:best.q51, r50:best.q50, used:best.used, slots: mu.carriers.reduce((a,m)=>a+m.slots,0), nb: mu.carriers.length,
    shuttleWeap: wsel ? wsel.map(w=>PERS_KR[w]||w) : null, shuttles: shut ? shut.map((o,q)=>{ const j = shutA.pick[q]; // 배정된 캐릭터 먼저, 그다음 이 조합의 다른 셔틀과 겹치지 않는 같은 묶음 후보(보유 먼저)
      const alt = o.ids.map((_,a)=>a).filter(a=>a!==j && !shutA.usedB.has(o.bases[a])), L = [j].concat(alt);
      return {names:L.slice(0,3).map(a=>o.names[a]), ids:L.slice(0,6).map(a=>o.ids[a]), n:o.n, own:L.filter(a=>o.owns[a]).length, pers:[...o.pers].map(x=>PERS_KR[x]||x), items:((best.carriers[q]||{}).items||[]).slice()}; })
      : best && best.carriers ? best.carriers.map(c=>({names:[], ids:[], n:0, own:0, pers:c.pers ? [...c.pers].map(x=>PERS_KR[x]||x) : [], items:(c.items||[]).slice()})) : null};
  memo.set(zk, out); return out;
}
/* 보스가 행동불능 상태이상(기절·수면·마비·석화·빙결·혼란·매료·공포)을 거는지 — 걸리면 요격이 안 나감 */
const CC_RE = /기절|스턴|수면|마비|석화|빙결|혼란|매료|공포|행동 ?불능|睡眠|麻痺|気絶|石化|凍結|混乱|魅了|恐怖|スタン/;
function enemyCCOf(boss){ if(!boss) return null; return !!((boss.needs&&boss.needs.status_immune) || (boss.mechanics||[]).some(m=>CC_RE.test(m)) || CC_RE.test(boss.strategy_kr||'')); }
/* 셔틀 후보 목록(전체 캐릭터 → id·이름·퍼스널리티(무기 퍼스널리티 포함)·같은 캐릭터 묶음) */
function shuttlePoolOf(pcs){ return (pcs||[]).filter(Boolean).map(pc=>({id:pc.id, name:pc.name, base:pc.base||pc.id, ns:!(pc.raw && pc.raw.style && pc.raw.style!=='NS'), pers:[...new Set([...(pc.pers||[]), WEAPON_PERS[pc.weapon]].filter(Boolean))]})); }
/* 계산 상황: 배리어 관통 필요 여부, 속성·타입 지정, 후열 고정 셔틀 */
/* 후열 인원(0~2): 결현현은 서약 인원(6명이면 2), 그 밖엔 편성 탭 '후열 인원'(input.backN, 기본 2 — 사용자 요청 2026-10-16: 4명뿐인 콘텐츠면 후열 셔틀·아군 전체 글래·후열 추천 없음) */
function backOf(input){ if(input && input.pledge && input.pledge.size) return Math.max(0, Math.min(2, input.pledge.size-4)); const b = input && input.backN; return b!=null && b!=='' && isFinite(+b) ? Math.max(0, Math.min(2, Math.round(+b))) : 2; }
function buildCtx(input, ownedAll){
  const boss=input.boss;
  const maxBack = backOf(input);
  const mules = (input.backLocked||[]).slice(0,maxBack).map(id=>(ownedAll||[]).find(o=>o.pc.id===id)).filter(Boolean)
    .map(o=>({id:o.pc.id, name:o.pc.name, pers:new Set([...(o.pc.pers||[]), WEAPON_PERS[o.pc.weapon]].filter(Boolean)), slots:(o.prog&&o.prog.slots)||3, shares:(o.prog&&o.prog.gear)?o.prog.gear.ps:null}));
  // 셔틀 후보: 퍼스널리티 P글래는 그 퍼스널리티가 있는 캐릭터만 달 수 있음(사용자 확인 2026-10-17) — 무기 퍼스널리티는 무기로도 보장.
  // 셔틀은 보통 4성 태생처럼 천명치 200을 넘기기 쉬운 캐릭터라(사용자 확인) 보유 여부와 무관하게 전체 캐릭터(input.shuttlePool)에서 고르고, 이름·후열 추천은 보유 캐릭터를 먼저
  const ownIds = new Set((ownedAll||[]).filter(o=>o && o.pc).map(o=>o.pc.id)), exS = new Set(input.excluded||[]);
  const pool = (Array.isArray(input.shuttlePool) && input.shuttlePool.length ? input.shuttlePool : shuttlePoolOf((ownedAll||[]).filter(o=>o && o.pc).map(o=>o.pc)))
    .map(p=>({...p, ...{own: ownIds.has(p.id)}})).filter(p=>(p.own || p.ns!==false) && !exS.has(p.id)) // 보유하지 않은 캐릭터는 기본 스타일(NS)만 — AS·ES·AC는 셔틀로 따로 키우기 어려움. 제외 목록은 셔틀로도 안 씀
    .sort((a,b)=>(b.own-a.own) || (a.id<b.id?-1:a.id>b.id?1:0));
  return {pool, needPierce: !!(boss&&boss.needs&&boss.needs.barrier_pierce) && !barrierModeled(boss), focus: input.focus||null, noConv: !!input.noConv, mules, maxBack, buddy: input.buddy||null, enemyCC: enemyCCOf(boss), pgl: input.pgl||null,
    burstN: input.pledge && input.pledge.turns>0 ? Math.min(10, input.pledge.turns) : null};
}
/* AF 대기 시간(리캐스트, 초) = 속도 × 행동 횟수 표(game-info 'アナザーフォースまとめ' 2-2, アルティマニア·アナデンの館 실측 확장, 2026-10-19):
   행 = 속도 하한, 문자 = 1~15번째 행동 뒤 대기(문자 코드 − 48). 16번째부터 행동당 +0.6초. 속도는 버프 포함(위키: 리캐스트 계산에 속도 버프가 들어감) */
const AF_WAIT = [[1,"2334556677889:;"],[7,"2334456677889::"],[19,"23344566778899:"],[35,"23344556778899:"],[72,"23344556678899:"],[92,"22344556678899:"],[113,"22344556677899:"],[135,"22334556677899:"],[157,"22334556677889:"],[179,"22334456677889:"],[202,"223344566778899"],[226,"223344556778899"],[249,"123344556778899"],[273,"123344556678899"],[297,"122344556678899"],[321,"122344556677899"],[346,"122334556677899"],[371,"122334556677889"],[395,"122334456677889"],[446,"122334455677889"],[471,"112334455677889"],[497,"112334455667889"],[522,"112234455667889"],[549,"112234455667789"],[574,"112233455667789"],[599,"112233455667788"],[626,"112233445667788"],[678,"112233445567788"],[704,"111233445567788"],[730,"111233445566788"],[757,"111223445566788"],[783,"111223445566778"],[810,"111223345566778"],[863,"111223344566778"],[916,"111223344556778"],[943,"111123344556778"],[970,"111123344556678"],[997,"111122344556678"]];
/* AF 콤보 증가량(2026-10-19 game-info 'アナザーフォースまとめ' 3): 행동의 첫 타 = 처음 쓰는 스킬 5%·이미 쓴 스킬 4%(약점이면 +1%), 그 뒤 타격(연속 타·재공격·여러 대상)은 '직전에 맞힌 같은 스킬'이라 2% —
   예전엔 타당 2.5% 고정이라 1타 스킬을 낮게(4~5% → 2.5%), 10타 넘는 스킬을 높게 봤음. 스킬 AF 콤보 배율(af_combo_x)은 그 스킬 타격에만, 연계 추격은 타당 2%·帯電 추격은 1%, 장비 콤보 증가(cup)는 타당. S.comboWiki=false면 예전 방식 */
function comboInc(co, S, first, sh){ if(!co) return 0; const tg = co.tgt==='aoe' ? Math.max(1, +S.enemyCount||1) : 1; // sh: 感電(放電) 타당 추가 콤보
  if(sh>0) return comboInc(co, S, first) + sh*Math.max(1, +co.totHits||1)*tg; // 帯電 추격은 感電을 안 일으킴(위키 3-3)
  if(S.comboWiki===false) return co.hitsPerAct*(0.025+(co.cup||0))*co.afx*tg;
  const hp = Math.max(1, +co.totHits||1)*tg, lk = (+co.linkHits||0)*tg, lkC = co.links ? co.links.reduce((x,l)=>x + (l.charge ? +l.n||0 : 0), 0)*tg : 0, own = (first ? 0.05 : 0.04) + (co.rel==='weak' ? 0.01 : 0) + 0.02*(hp - 1);
  return own*(co.afxS!=null ? co.afxS : (co.afx||1)) + 0.02*Math.max(0, lk - lkC) + 0.01*lkC + (co.cup||0)*(hp + lk); } // 帯電 추격은 타당 1%(위키 3-3)
function afRow(spd){ let r = AF_WAIT[0][1]; for(const [lo, w] of AF_WAIT){ if(spd >= lo) r = w; else break; } return r; }
function afWaitR(r, k){ const kk = Math.max(1, Math.round(k)); return kk<=15 ? r.charCodeAt(kk-1) - 48 : (r.charCodeAt(14) - 48) + 0.6*(kk - 15); }
function afWait(spd, k){ return afWaitR(afRow(spd), k); }
/* ---------- AF 행동 수 (위키 기준) ----------
   AF는 실시간: 게이지 100%에서 초당 10%씩 줄고, AF 중 타격으로 다시 찬다(타당 1.5%, 약점 3.5%, 맞는 ZONE은 행동당 7.5%).
   캐릭터마다 행동 → 연출(기본 2초, 캐릭터별 값이 있으면 그 값, 재행동은 실행 횟수만큼) → 대기. 대기는 행동할수록 늘어남: 속도(버프 포함)·행동 횟수 표 AF_WAIT(2026-10-19 위키 — 예: 속도 300이면 1·2·2·3·4·4·5·5…초).
   게이지가 0이 될 때까지 각자 몇 번 행동하는지 센다. 속도는 빌드 코드(장비 포함) → 기본 스탯(+장비 속도 설정) 순. */
function afActionsOf(team, progs, cores, z, enemy, S, g0, prio, plan, lk){ // plan[i]: 처음 행동들이 버프('buff', 게이지 0)·주력 아닌 공격('attack')인지, lk[i]: 가창으로 그 뒤 행동 불가가 되는 행동 수(0 = 처음부터 가창 중)
  const n = team.length; g0 = g0==null ? 100 : g0;
  if(S.afAuto===false){ const k=Math.max(1,Math.round((+S.afActions||5)*g0/100)), ord = prio || team.map((_,i)=>i), seq=[]; // 행동 수 고정: 우선순위 순으로 한 바퀴씩
    for(let r=0;r<k;r++) for(const i of ord) seq.push({i, t:r}); return {n:team.map(()=>k), dur:null, fast:team.map(()=>null), auto:false, seq}; }
  const anim = Math.max(0.5, +S.afAnim||2);
  // 속도: 빌드 코드(장비 포함) 그대로, 아니면 기본 스탯(+장비 속도 설정). '빌드 없는 캐릭터도 249 이상'을 켜면 빌드 없는 캐릭터는 빠른 쪽
  const spdOf = i=>{ const p=progs[i]; return p && p.spd ? p.spd : 0; };
  const fromBuild = i=>{ const p=progs[i]; return !!(p && (p.spdSrc==='build'||p.spdSrc==='build-st')); };
  const wTbl = S.afWaitTbl!==false, spd0 = team.map((c,i)=> !fromBuild(i) && S.afFastDefault ? Math.max(260, spdOf(i)) : (spdOf(i) || 200)), spdE = team.map((c,i)=>{ const co = cores[i]; return spd0[i]*(1 + (co && co.spdBuf>0 ? co.spdBuf : 0)); }); // 버프 포함 속도(모르면 200) — 첫 행동의 대기는 버프 전 속도(리캐스트는 스킬을 쓰는 순간의 속도, 위키)
  const rw0 = wTbl ? spd0.map(afRow) : null, rwE = wTbl ? spdE.map(afRow) : null; // 대기 표 행은 호출마다 한 번(2026-10-19 속도: 행동마다 표를 훑던 것)
  const fast = team.map((c,i)=> wTbl ? spdE[i]>=249 : (!fromBuild(i) && S.afFastDefault ? true : (spdOf(i) ? spdOf(i)>=249 : false)));
  const known = team.map((c,i)=> progs[i] && progs[i].spdSrc ? progs[i].spdSrc : null);
  const refill = team.map((c,i)=>{ const co=cores[i]; if(!co) return 0;
    const weak = enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak');
    const lkG = 0.5*Math.min(30, co.linkHits||0); // 帯電·연계 추가 공격은 타당 +1/200 = 0.5%(존 있어도, 위키 2-1-1)
    const byHit = Math.min(30, co.totHits)*(weak?3.5:1.5)*(co.cpy ? 0.5 : 1) + lkG;
    // 재공격은 실행마다 행동 한 번처럼 AF 게이지가 찬다(사용자 확인 — 루나틱 복사는 예외): 맞는 존은 실행당 7.5%, 그 밖은 타수 기준(재공격 타수 포함)
    const za = zoneAFAct(z, co, true); if(za!=null) return za + lkG; // 존이 있으면 행동(실행)당 충전으로 바뀜(위키), 상극·안 맞는 타입은 0
    return byHit; });
  // 연출 시간: 캐릭터별 값(af_anim)이 있으면 그 값. 재공격은 한 행동 안에서 이어 치므로 쿨타임은 행동당 한 번만 늘고(사용자 확인),
  // 이어 치는 연출은 실행당 S.afRepAnim배(기본 0.5)로 셈
  const repA = S.afRepAnim!=null ? +S.afRepAnim : 0.5;
  const animOf = team.map((c,i)=>{ const co=cores[i]; const ex = co ? (co.execs || 1+Math.max(0,co.rep||0)) : 1; return (c.afAnim||anim) * (1 + repA*Math.max(0, ex-1)); });
  const next = team.map(()=>0), cnt = team.map(()=>0), seq = [];
  const ord = prio && prio.length===n ? prio : team.map((_,k)=>k); // 같은 시각이면 왼쪽(우선순위)부터 — AF 자동 선택
  // 가창 중인 아군이 있으면 刻唄の力(가창 캐릭터는 행동을 못 해 글래스터 칸을 이것에 씀 — 사용자 2026-10-18): AF 중 게이지 회복량 증가(小, 수치 미공개 → S.tokiuta 기본 0.1)
  const tok = lk && lk.some(v=>v!=null) ? 1 + (S.tokiuta!=null ? Math.max(0, +S.tokiuta) : 0.1) : 1;
  if(tok>1) for(let k=0;k<n;k++) refill[k] *= tok;
  const lkOf = k => lk && lk[k]!=null ? lk[k] : Infinity;
  let g = g0, t = 0;
  for(let step=0; step<200; step++){
    let i=-1, tn=Infinity; for(const k of ord) if(cores[k] && next[k]<tn && cnt[k] < lkOf(k)){ tn=next[k]; i=k; } // 가창을 건 뒤엔 행동 없음
    if(i<0) break;
    const gAt = g - 10*(tn - t); if(gAt <= 0){ t += g/10; g = 0; break; }
    const pk = plan ? (plan[i] && cnt[i] < plan[i].length ? plan[i][cnt[i]] : null) : lk && lk[i]!=null ? 'buff' : (prio && cnt[i]===0 && team[i].buffAct ? 'buff' : null); // 버프만 거는 행동은 게이지 0 (위키·사용자 확인), 가창 거는 행동도
    g = Math.min(100, gAt + (pk==='buff' ? 0 : refill[i])); t = tn;
    seq.push({i, t:tn, k:cnt[i], pk});
    cnt[i]++; next[i] = tn + (pk ? (team[i].afAnim||anim) : animOf[i]) + (wTbl ? afWaitR(cnt[i]>1 ? rwE[i] : rw0[i], cnt[i]) : (fast[i] ? cnt[i] : cnt[i]+1)); // 대기: 속도·행동 횟수 표(예전: 249 이상 1·2·3…, 미만 2·3·4…)
  }
  if(g>0) t += g/10;
  // 가창자의 공격 행동 수: 계획(plan) 없이 막힌 경우 가창을 거는 행동뿐이라 0(계획이 있으면 부르는 쪽이 계획 길이를 뺌)
  const nOut = lk && !plan ? cnt.map((v,k)=> lk[k]!=null ? 0 : v) : cnt;
  return {n:nOut, dur:t, fast, known, spd:team.map((c,i)=>spdOf(i)), spdE: spdE.map(v=>Math.round(v)), auto:true, seq, lk: lk||null, tok: tok>1 ? tok : null};
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
function chainCalc(team, progs, A, enemy, S, sit, cx, FX, z, cores, sim, cap, combo, fw, ctr, ctrOnly){ // ctrOnly: 요격으로만 발동(AF 턴: AF가 끝난 뒤 적 공격 → 요격 → 체인, 사용자 확인 2026-10-17)
  const per = team.map(()=>0), trig = team.map(()=>0), trigA = team.map(()=>0);
  let any=false, stk=null;
  for(let h=0;h<team.length;h++){
    const c=team[h]; if(!c.chain) continue;
    for(const e of c.chain){
      if(e.af===false && sit==='af') continue;
      if(e.when && Object.keys(e.when).length && ruleAct({w:e.when}, h, team, progs, sit==='af'?'normal':sit, z, A)<=0) continue;
      const on = e.on||{};
      const opts = Array.isArray(on.rand) && on.rand.length ? on.rand.map(o=>({...o, ...{by:on.by}})) : [on];
      let n=0, nA=0;
      for(const o of opts){
        let s=0, sA=0;
        for(let i=0;i<team.length;i++){ if(i===h && (o.by||'other')!=='any') continue; if(sit==='sb' && cores[i] && cores[i].usingSB) continue; // SB 공격은 체인 어빌리티를 발동시키지 않음(사용자 확인 2026-10-16)
          if(!ctrOnly){ const q = chainActP(team[i], i, o, cores, sit==='af'?'sb':sit, sim); s += q; sA += q; if(e.stk) trigA[i] += q/opts.length; }
          // 요격도 공격(사용자 확인: 네코코(ES) 変幻自在로 알마(AS) 요격을 번개로 → 벨벳(AS) イレクトリ가 턴 최대 10번): 평상 턴 요격 횟수만큼
          if(ctr && sit==='normal' && ctr.trig[i]>0 && (o.act||'attack')==='attack' && (!o.elem || o.elem.includes(ctr.els[i])) && (!o.wt || o.wt.includes(ctr.wts[i])) && (!o.kind || ctr.kinds[i]===o.kind) && (!o.tgt || ctr.tgts[i]===o.tgt)) s += ctr.trig[i]; }
        n += sit==='af' ? (s>0 ? (e.max||1) : 0) : Math.min(e.max||1, s); nA += Math.min(e.max||1, sA);
      }
      n /= opts.length; nA /= opts.length;
      if(e.every>1) n = Math.floor(n/e.every+1e-9) + (sit==='normal' ? (n%e.every)/e.every*0.5 : 0);
      if(n<=0) continue;
      const a=e.atk; let mult=+a.mult||1;
      if(a.mult_max){ const fh=team.filter((m,k)=>k!==h && (m.weapon==='fist'||m.weapon==='hammer')).length; mult=Math.min(a.mult_max, mult+0.5*fh); }
      let multSum = mult*n;
      if(Array.isArray(a.mult_seq) && a.mult_seq.length){ multSum=0; let r=n; for(let k=0;k<a.mult_seq.length && r>0;k++){ const f=Math.min(1,r); multSum+=a.mult_seq[k]*f; r-=f; } }
      const sk = {skill:e.name||'체인', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||'none',
        weapon_type:a.weapon_type||null, size:a.size||'xl', mult:1, hits:Math.max(1,a.hits||1), repeat:0, crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x:1, condition:''};
      const proxy = ({...c, ...{main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true, _chain:true}}); // _chain: SB 뒤 남는 효과를 안 받음(사용자 확인)
      const t2 = team.slice(); t2[h]=proxy;
      const co = attackerCore(t2, h, progs, A, enemy, S, 'normal', cx, FX, z);
      if(!co) continue;
      const d1 = applyZoneCap(co, z, S, cap, combo)*fw(co);
      // 축적에 따라 타수가 느는 체인(벨벳(AS) イレクトリ: 특대 3타, デドメナ 1개당 +1타·최대 6타, 2026-10-16): 평상 턴은 그 사이 평균(hits_avg, 없으면 (hits+hits_max)/2)
      const ifV = q => q && Array.isArray(q.ids) && team.some(m=>m && q.ids.includes(m.id)) ? +q.v : null; // hits_avg_if·avg_if: 그 캐릭터가 전열에 있으면(번개술사(AS)가 데도메나를 앞당김)
      if(a.hits_max && sit!=='af'){ const h0 = Math.max(1,a.hits||1), hA = ifV(a.hits_avg_if) || (a.hits_avg!=null ? +a.hits_avg : (h0 + +a.hits_max)/2); multSum *= hA/h0; }
      // 맞은 적에 턴 종료까지 쌓이는 내성 DOWN(stk: イレクトリ レヴマ 1개당 물리·마법 내성 10% DOWN, 발동 1번에 1~6개 — デドメナ 수): k번째 발동은 앞선 k−1번만큼 더 깎인 상태로
      if(e.stk && sit!=='af'){ const nE = Math.max(1, S.enemyCount||1), inc = pct(+e.stk.res||0)*(ifV(e.stk.avg_if) || +e.stk.avg||1)/(sk.target==='st' ? nE : 1), b0 = 1+co.typeR+co.physR;
        // brk: 맞힐 때 거는 브레이크(イレクトリ 「ブレイク付与」 雷) — 두 번째 발동부터 ×1.5(이미 걸려 있으면 그대로)
        const bF = e.stk.brk ? Math.max(1, ((e.stk.brk===co.el || e.stk.brk===co.wt) ? 1.5 : 1.3)/Math.max(1, co.brk||1)) : 1;
        /* brk_each(2026-10-19, 딩 DB 「일렉트리」: 타격마다 브레이크(자연 해제 = 다음 1타 2배)): 그 턴 체인 타격은 첫 타 말고 전부 2배 — 이미 받는 브레이크 이득(co.brk)은 빼고 */
        const Ht = n*Math.max(1, multSum/Math.max(1e-9, mult*n)), bE = e.stk.brk_each ? Math.max(1, ((2*Ht - 1)/Math.max(1, Ht))/Math.max(1, co.brk||1)) : 0;
        let sF=0; for(let k=0;k<Math.ceil(n-1e-9);k++) sF += Math.min(1, n-k)*(1+co.typeR+rvAdd(S, co.physR, inc*k))/b0*(bE ? bE : (k>0 ? bF : 1));
        multSum *= sF/n; stk = stk || {inc:0, n:0, nA:0, brk:null, h, unc: S.revmaUncap===true}; stk.inc = Math.max(stk.inc, inc); stk.n = Math.max(stk.n, n); stk.nA = Math.max(stk.nA, Math.min(n, nA)); if(e.stk.brk) stk.brk = e.stk.brk; }
      per[h] += d1*multSum; trig[h] += n; any=true;
    }
  }
  return any ? {per, trig, trigA, stk, total:per.reduce((x,y)=>x+y,0)} : null;
}
/* 체인이 쌓는 내성 DOWN(stk)을 같은 턴 요격에도: 요격 k번째(0부터)는 그 앞의 체인 발동 min(k, 체인 수)번만큼 깎인 상태 */
/* 턴 동안 쌓이는 내성 DOWN 스택(イレクトリ レヴマ: 1개당 물리·마법 내성 10% DOWN, 최대 99 — 2026-10-19): 다른 내성 DOWN과 합쳐 100% 상한
   (아카라이브 메타 정리 '물리·마법 저항 디버프는 CA 1회당 최대 60, 실질적으로 100% 상시 유지'). 위키 댓글 '99蓄積 990%DOWN'처럼 상한 없이 보려면 S.revmaUncap=true(최대 9.9 따로) */
const RV_MAX = 9.9;
const rvAdd = (S, p, x) => S.revmaUncap===true ? p + Math.min(RV_MAX, x) : Math.min(1, p + x);
const scaleCore = (co, f) => !co ? co : co.mixL ? ({...co, mixL: co.mixL.map(x=>({...x, co: scaleCore(x.co, f)}))}) : ({...co, pN: co.pN*f});
/* 아군 공격도 같은 턴에 쌓인 레브마를 받음(2026-10-19): 체인 주인 말고 그 턴에 체인을 일으키는 아군 공격(stk.nA번) 사이 순서는 모르니 평균 —
   발동시키는 아군 i는 다른 아군 발동의 절반((nA − 자기 몫)/2), 그 밖 공격(체인 주인 자신 등)은 nA/2만큼 쌓인 상태로. 25억 경감 전 대미지에 곱해 다시 계산 */
function rvAllyBoost(team, cores, z, S, cap, fw, w, ch){
  const st = ch && ch.stk; if(!st || !(st.inc>0) || !(st.nA>0) || !cores) return null;
  const per = team.map(()=>0); let tot = 0;
  cores.forEach((co,i)=>{ if(!co) return; const own = i===st.h ? 0 : Math.min(st.nA, (+ch.trigA && ch.trigA[i]) || 0), k = i===st.h ? st.nA/2 : (st.nA - own)/2;
    if(!(k>0)) return; const ty = +co.typeR||0, ph = +co.physR||0, b0 = 1+ty+ph, f = (1+ty+rvAdd(S, ph, st.inc*k))/b0; if(!(f>1.0001)) return;
    const d = (applyZoneCap(scaleCore(co, f), z, S, cap, null) - applyZoneCap(co, z, S, cap, null))*fw(co)*(w ? w[i] : 1); per[i] += d; tot += d; });
  return tot>0 ? {per, total: tot} : null;
}
function counterStk(ctr, ch){
  if(!ctr || !ch || !ch.stk || !(ch.stk.inc>0 || ch.stk.brk)) return;
  const {inc, n:nc, brk:bk} = ch.stk, nA0 = +ch.stk.nA||0, add = (p, x) => ch.stk.unc ? p + Math.min(RV_MAX, x) : Math.min(1, p + x); let tot=0; // 요격은 아군 행동 뒤(적 턴) — 아군 공격으로 쌓인 레브마(nA0)부터(2026-10-19)
  ctr.per = ctr.per.map((v,i)=>{ const r=ctr.res[i], n=ctr.trig[i]; if(!(v>0) || !r || !(n>0)) return v; const b0 = 1+r.ty+r.ph;
    /* 체인이 건 브레이크(2026-10-20, 2026-10-17 브레이크 재정리와 같게 — 예전 맞는 속성 ×1.5·그 밖 ×1.3): 일반 브레이크는 다음 1타만 2배, 엘리멘탈·웨폰(イレクトリ 雷)은 쌓인 수(BRK_N)만큼 그 속성·타입 타격 2배 — 요격 1번 h타 중 그만큼, 이미 받는 브레이크 이득(r.brk)은 빼고 */
    const hC = Math.max(1, +r.h||1), bF = !bk ? 1 : Math.max(1, (BRK_ONCE.has(bk) ? (hC+1)/hC : (bk===ctr.els[i] || bk===ctr.wts[i]) ? (hC + Math.min(hC, BRK_N))/hC : 1)/Math.max(1, r.brk||1));
    let sF=0; for(let k=0;k<Math.ceil(n-1e-9);k++) sF += Math.min(1, n-k)*(1+r.ty+add(r.ph, inc*Math.min(nA0 + k, nc)))/b0*((k>0 || nA0>0) && nc>0 ? bF : 1);
    const w = v*sF/n; tot += w; return w; });
  ctr.total = tot;
}
/* ---------- 턴 종료 자동 공격·고정 대미지 (data/turn_end.json) ----------
   행동을 쓰지 않고 턴 끝에 나가는 공격(가창 턴 종료 공격·축적 소비 고정 대미지 등). 평상 턴 1턴당 = 위력 × up(발동 비율).
   허수아비 1턴 AF엔 없음(턴 종료는 AF 뒤). 고정 대미지는 버프·내성 무관, 1타 상한만 */
function turnEndCalc(team, progs, A, enemy, S, cx, FX, z, cap, fw, mode){ // mode 'af': AF를 쓴 턴의 종료 공격만(when.af — 빅트(AS) オスクロ・カーパ, 2026-10-16), 실전 N턴의 AF 턴에 더함
  const per = team.map(()=>0); let any=false, afg=0; const afM = mode==='af';
  for(let h=0;h<team.length;h++){
    const c=team[h]; if(!c.turnEnd) continue;
    for(const e of c.turnEnd){
      if(!!e.sb_only !== (mode==='sb')) continue; // sb_only: SB를 쓴 턴의 종료 공격(mode 'sb'로 따로 — 2026-10-18 피네(AS) 残響, 예전엔 어디서도 안 더함)
      if(afM && !(e.when && e.when.af)) continue;
      if(mode==='sb' && !(team[h].stellar && progs[h] && progs[h].sbOK)) continue;
      if(e.when && Object.keys(e.when).length && ruleAct({w:e.when}, h, team, progs, afM ? 'af' : 'normal', z, A)<=0) continue;
      const q = c.turnEnd.indexOf(e), tk = 'te'+q, tg = (A.eqOff && A.eqOff[h] && A.eqOff[h][tk]===0) ? 0 : (afM || mode==='sb') ? 1 : (A.teU && A.teU[h] && A.teU[h][tk]!=null ? A.teU[h][tk] : 1); // 거는 스킬 장착·유지율(AF 턴은 AF 행동 1번으로 씀)
      const up = (e.up!=null ? Math.max(0, Math.min(1, +e.up)) : 1)*tg; if(!(up>0)) continue;
      if(e.fixed && +e.fixed.v>0){ const a=e.atk||{}; const nT = (e.fixed.target||a.target)==='st' ? 1 : Math.max(1, S.enemyCount||1);
        per[h] += Math.min(HIT_MAX, +e.fixed.v)*Math.max(1, +e.fixed.n||1)*nT*up; any=true;
        afg += up*(z && z.level>0 && z.kind!=='none' ? 1.5*Math.max(1, +e.acts||1) : Math.min(30, Math.max(1, +e.fixed.n||1))*1.5); continue; } // 고정 대미지도 AF 게이지(존이면 '그 밖의 공격' 행동당 1.5%, 위키)
      const a=e.atk; if(!a) continue;
      const sk = {skill:e.name||'턴 종료', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||'none',
        weapon_type:a.weapon_type||null, size:a.size||'xl', mult:Math.max(0.1, +a.mult||1), hits:Math.max(1,a.hits||1), repeat:0, crit_sure:!!a.crit_sure, def_ignore:!!a.def_ignore, barrier_pierce:!!a.barrier_pierce, af_combo_x:1, condition:''};
      const t2 = team.slice(); t2[h] = ({...c, ...{main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}});
      const co = attackerCore(t2, h, progs, A, enemy, S, 'normal', cx, FX, z); if(!co) continue;
      per[h] += applyZoneCap(co, z, S, cap, null)*fw(co)*up; any=true;
      /* 턴 종료 추격도 공격 행동이라 AF 게이지가 참(2026-10-19 TK '無限AF' 레시피: 輝晶陣에서 ウツハラ 턴 종료 추격 +15×3) — 존이 있으면 행동당, 없으면 타당. acts = 추격 행동 수 */
      { const nA = Math.max(1, +e.acts||1), za = zoneAF(z, co, false), wk = enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak'); afg += up*(za!=null ? za*nA : Math.min(30, Math.max(1, +a.hits||1))*(wk?3.5:1.5)); }
    }
  }
  return any ? {per, total:per.reduce((x,y)=>x+y,0), afg} : null;
}
/* once.json 항목 → 스킬 객체 */
function onceSkOf(e, c){ const a = e.atk || {};
  return {skill:e.name||'1회', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||c.elem||'none', weapon_type:a.weapon_type||null, size:a.size||'xl', mult:Math.max(0.1,+a.mult||1), hits:Math.max(1,+a.hits||1), repeat:+a.repeat||0, crit_sure:!!a.crit_sure, def_ignore:!!a.def_ignore, barrier_pierce:!!a.barrier_pierce, af_combo_x:+a.af_combo_x||1, condition:''}; }
/* 전투 중 1회·N턴마다 강공격(once.json): 평상 턴 1턴 평균에 (그 공격 − 주력 1회) × 횟수 / N턴 */
// once 항목 조건(2026-10-18): when(규칙 조건 — 편성·존 등)·sb(그 캐릭터가 SB를 쓸 수 있어야 — 가리유 炎帝 タイラントブレイズ는 SB로 들어가는 상태의 통상 공격 변화)
const onceOK = (e, h, team, progs, z, A) => !(e.sb && !(progs[h] && progs[h].sbOK)) && !(e.when && Object.keys(e.when).length && ruleAct({w:e.when}, h, team, progs, 'normal', z, A)<=0);
function onceCalc(team, progs, A, enemy, S, cx, FX, z, cap, fw, cores){
  const per = team.map(()=>0); let any=false; const H = (A.tm && A.tm.H) || 6;
  for(let h=0;h<team.length;h++){ const c=team[h]; if(!c.once) continue;
    const dm = cores && cores[h] ? applyZoneCap(cores[h], z, S, cap, null)*fw(cores[h]) : 0; let best = 0;
    for(const e of c.once){ if(e.combo) continue; /* combo: AF 콤보 조건 공격은 AF에서만 */ if(!onceOK(e, h, team, progs, z, A)) continue; const a=e.atk; const f1 = Math.max(1, +e.first||1); if(f1 > H) continue; const m = String(e.per||'battle').match(/every:(\d+)/), times = m ? (H-f1+1)/Math.max(1,+m[1]) : 1;
      const sk = {skill:e.name||'1회', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||c.elem||'none', weapon_type:a.weapon_type||null, size:a.size||'xl', mult:Math.max(0.1,+a.mult||1), hits:Math.max(1,+a.hits||1), repeat:+a.repeat||0, crit_sure:!!a.crit_sure, def_ignore:!!a.def_ignore, barrier_pierce:!!a.barrier_pierce, af_combo_x:1, condition:''};
      const t2 = team.slice(); t2[h] = ({...c, ...{main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}});
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
  const cx = ({...ctx, ...{flux:ev.flux}});
  /* AF 안 버프 운용(순수, ctx._afBuff > 0 — 2026-10-20 점검): 그 버프는 AF에서만 걸어 1턴째(첫 AF 전)엔 없고 버퍼도 공격 → 공격하는 사람은 평상 턴 시뮬의 1턴째 행동, 버프 켜진 몫(u)에선 AF로 거는 버프를 끔(kupPre) */
  const sim = ev.sim, pre = ctx && +ctx._afBuff > 0 && sim && sim.kupPre && sim.kupPre.some(Boolean) ? team.map((c,j)=> sim.kupPre[j] ? {mf: sim.kupPre[j]} : 1) : null;
  const actT1 = pre && sim.t1a ? team.map((c,j)=> sim.t1a[j]==='m' || sim.t1a[j]==='a') : team.map(c=>!c.buffAct); // 1턴에 공격하는 캐릭터
  const stk0 = A.stkT, stkOn = S.stkRamp!==false && !(ctx && ctx.stFast) && team.some(c=>c.stk || c.stkAny); if(stkOn) A.stkT = 1; // 누적 효과 예열: 1턴째는 1턴만큼 쌓인 값, 2턴은 2턴만큼
  const sumCores = (cores, z, mask)=>cores.reduce((v,co,i)=>v + (mask&&!mask[i] ? 0 : applyZoneCap(co, z, S, cap, null)*fw(co)), 0);
  // 보장: 스킬 버프·디버프 제거
  const strip = team.map(c=> c.buffHow==='passive'||c.buffHow==='auto' ? ({...c, ...{deb:{}}}) : ({...c, ...{party:{scope:'none'}, deb:{}, rules:null}}));
  let g=0, gz=null;
  for(const z of autoZ){ const FX = strip.some(c=>c.rules) ? buildBF(strip,progs,'normal',z,A,posSets,null) : null;
    const cores = strip.map((c,i)=>attackerCore(strip,i,progs,A,enemy,S,'normal',cx,FX,z)); const v=sumCores(cores, z, actT1); if(v>g){ g=v; gz=z; } }
  // 속도 맞춤: 평상 턴 버프 전부, 존은 평상 턴 존
  const nz = ev.normal.zone;
  const FXn = anyR || pre ? buildBF(team,progs,'normal',nz,A,posSets,pre) : null;
  const coresN = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,'normal',cx,FXn,nz));
  let u = sumCores(coresN, nz, actT1);
  for(const z of z1){ const FXz = anyR || pre ? buildBF(team,progs,'normal',z,A,posSets,pre) : null;
    const cz = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,'normal',cx,FXz,z)); u = Math.max(u, sumCores(cz, z, actT1)); }
  let t2 = sumCores(coresN, nz, null);
  if(stkOn){ A.stkT = 2; const FX2 = anyR && team.some(c=>c.stkRule) ? buildBF(team,progs,'normal',nz,A,posSets,pre) : FXn; t2 = sumCores(team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,'normal',cx,FX2,nz)), nz, null); }
  A.stkT = stk0;
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
/* 버디: 메인은 오토 스킬+오라(+폭딜 턴 차지 스킬), 서브는 오라 발동 안 함(계산 없음). 약점 조건 오라는 상대 정보가 없으면 반반 */
/* 버디(2026-10-17 조사 반영, 스크래치 buddy/): 메인 버디만(서브는 오라 발동 안 함, 사용자 확인 2026-10-16).
   - 오토 스킬(main·main2): 데이터 값 = 최대 누적. 버디가 행동한 횟수 k로 (k+1)/(stk+1), k=0이면 0 → 허수아비 1턴·1턴째 AF엔 없음(버디는 아군 뒤에 행동),
     실전 t턴째 AF·SB는 k = t−1, 평상 턴은 k = 2(실전 N턴·지속 딜 중간)로 봄. 장비(gear.x)는 오토 스킬 수치를 키움(스탯 보정), 장비 자체 효과는 그대로
   - 오라: 늘(when 조건). post_af(첫 AF 뒤)는 AF·SB에 없음, 평상 턴 절반
   - 차지 스킬(sb·sb2): 차지 턴당 1 + chg_plus 조건 1 + 장비(판도라 가끔 +1)가 cost만큼 모인 턴부터 → 그 턴 확률(budChgP). at:'af'면 AF 턴 시작에 써서 그 AF에도 */
const binomP = (n, k, q) => { let c = 1; for(let i=0;i<k;i++) c = c*(n-i)/(i+1); return c * q**k * (1-q)**(n-k); };
function budChgPlus(pl, zone, team){ if(!pl) return 0; const zOn = zone && zone.level>0;
  if(pl==='zone_any') return zOn ? 1 : 0;
  if(pl.startsWith('zone:')){ if(!zOn) return 0; const ks = pl.slice(5).split('|'); return ks.includes(zone.key) || (zone.types||[]).some(t=>ks.includes(t)) ? 1 : 0; }
  if(pl.startsWith('weap3:')){ const w = pl.slice(6); return team.filter(c=>c.wt===w).length>=3 ? 1 : 0; }
  if(pl.startsWith('partner:')){ const id = pl.slice(8); return team.some(c=>c.id===id) ? 1 : 0; }
  if(pl==='hp80') return 0.5; return 0; }
function budChgP(ch, t, zone, team){ // t턴째 시작에 차지 스킬을 쓸 수 있는 확률(1턴째 = 전투 시작 차지만)
  if(!ch || !(ch.cost>0)) return 0;
  const r = 1 + budChgPlus(ch.plus, zone, team), n = Math.max(0, t-1), need = ch.cost - (ch.c0||0) - r*n;
  let P = 0; if(need<=0) P = 1; else if(ch.rnd>0) for(let x=Math.ceil(need-1e-9); x<=n; x++) P += binomP(n, x, ch.rnd);
  if(t>=3){ const st = Math.min(1, (r + (ch.rnd||0))*3/ch.cost); P = Math.max(P, 0.5*P + 0.5*st); } // 3턴째 AF는 지속 딜에도 쓰는 값 → 긴 전투의 사용 비율(AF 주기 약 3턴)과 반반
  return Math.min(1, P); }
function budF(b, sit, A, zone, team){
  const T = sit==='normal' ? 0 : (A && A.realT>1 ? A.realT : 1);
  if(b.kind==='chg'){ if(sit==='normal' || (sit==='af' && b.at!=='af')) return 0; let f = budChgP(b.ch, T, zone, team); if(sit==='af' && b.act) f *= Math.min(1, b.act/5); return f; }
  if(b.kind==='auto'){ if(b.noaf && sit!=='normal') return 0; const k = sit==='normal' ? 2 : T-1, st = Math.max(1, b.stk||1);
    let f = k<=0 ? 0 : Math.min(1, (Math.min(k, st)+1)/(st+1)); if(b.act) f *= Math.min(1, b.act/(sit!=='normal' ? 5 : Math.max(1, (team && team.length) || 4))); return f; } // act N: N회 행동 버프(평상 턴은 전열 행동 중 N번)
  if(b.postAF) return sit==='normal' ? 0.5 : 0;
  return 1; }
const budScale = (o, x) => { if(x===1 || !o) return o; const r = {}; for(const k in o){ const v = o[k]; r[k] = typeof v==='number' ? v*x : v && typeof v==='object' ? budScale(v, x) : v; } return r; };
function budAgg(bd, team, enemy, A){
  if(!bd || !bd.main) return null;
  const b = bd.main, gear = b.gear || null, gx = gear && +gear.x>0 ? +gear.x : 1, gfx0 = gear && gear.fx || null, gfx = gfx0 && gfx0.by_form ? (gfx0.by_form[b.id] || null) : gfx0;
  const weakP = enemy ? (team.some(c=>c.elems.some(e=>enemyRel(enemy,e)==='weak') || enemyRel(enemy,c.wt)==='weak') ? 1 : Math.max(0, ...A.weakAdd.map(t=>weakFrac(A, t, 'normal')))) : 0.5;
  const has = f => team.some(f) ? 1 : 0;
  const whenP = w => !w || w==='zone' ? 1 : w==='weak' ? weakP : w==='mag' ? has(c=>c.atkKind==='mag') : w==='fire' || w==='wind' ? has(c=>c.elems.includes(w)) : w==='slashmag' ? has(c=>c.atkKind==='mag' || c.wt==='slash') : w==='spd300' ? 0.5 : 1;
  const reqOK = r => { if(!r) return true; const m = String(r).match(/^pers3:(.+)$/); if(m){ const ps = m[1].split('|'); return team.filter(c=>c.pers && ps.some(x=>c.pers.has(x))).length>=3; } return team.some(c=>c.id===r); };
  const ch = {cost: +b.cost>0 ? +b.cost : 6, plus: b.chg_plus||null, rnd: gfx && +gfx.chg>0 ? +gfx.chg : 0, c0: 0};
  const parts=[], sup={}; let enemyDown=0;
  const add = (x, kind, x2) => { if(!x) return; if(Array.isArray(x)){ x.forEach(y=>add(y, kind, x2)); return; } if(!reqOK(x.req)) return;
    const sc = kind==='auto' && x2 ? gx : 1, party = budScale(x.party||null, sc), deb = budScale(x.deb||null, sc);
    if(!party && !deb) return;
    const p = x.p!=null && x.when!=='weak' ? +x.p : whenP(x.when);
    parts.push({party, deb, p, zone:x.when==='zone'?x.zone:null, st:!!x.st, to:x.to||null, kind, stk: +x.stk||+(kind==='auto' && b.main && b.main.stk)||1, at: x.at || (kind==='chg' && b.sb && b.sb.at) || null, act: +x.act||0, noaf: !!x.noaf, postAF: x.when==='post_af', ch});
    if(deb) enemyDown = Math.max(enemyDown, pct(Math.max(deb.pwr||0, deb.int||0))*p); };
  add(b.main, 'auto', true); add(b.main2, 'auto', true); add(b.aura, 'aura'); add(b.sb, 'chg'); add(b.sb2, 'chg');
  for(const k in (b.sup||{})) sup[k]=b.sup[k];
  if(gfx){ if(gfx.main) add(Object.assign({stk: gfx.stk||1}, gfx.main), 'auto', false); // 장비 자체 오토 효과: 스탯 보정을 받는지 미확인 → 그대로(보수적)
    if(gfx.sb) add(gfx.sb, 'chg'); // 장비가 차지 스킬에 붙이는 효과(일점돌파 추진 부스터: 적 물리·전속성 내성 DOWN)
    for(const k in (gfx.sup||{})) sup[k] = Math.max(+sup[k]||0, +gfx.sup[k]||0); }
  const afgC = [b.sb].concat(b.sb2||[]).reduce((s,x)=>s + (x && reqOK(x.req) && +x.afg>0 ? +x.afg : 0), 0); // 차지 1회 AF 게이지 → 평상 턴엔 턴당 (차지 속도 ÷ 소모)로 나눠
  // 오토 스킬·장비가 거는 브레이크(2026-10-18: 건스 엘리멘탈 브레이크(雷) 3축적/턴·큐모스 일반 브레이크·플라즈마 쿼츠 웨폰 브레이크 3축적)와 독·페인(페인 에지·포이즌 니들 등)
  const brk = []; const addB = x => { if(!x) return; if(Array.isArray(x)){ x.forEach(addB); return; } if(x.brk && reqOK(x.req)) brk.push(x.brk); };
  addB(b.main); addB(b.main2); if(gfx){ addB(gfx.main); addB(gfx.main2); }
  const inf = gfx && gfx.inflict ? {poison: +gfx.inflict.poison||0, pain: +gfx.inflict.pain||0} : null;
  // 차지 스킬의 존 각성·극 존 전개(2026-10-18): 릴레노 煌斬陣 각성(zone_aw), 하자마짱 極・轟打陣·건스+벨벳 極・招雷陣(zone_dep level 2) — 짝 조건(sb2 req)이 맞으면 그쪽
  const zfxOf = x => { if(!x) return null; if(Array.isArray(x)){ for(const y of x){ const r = zfxOf(y); if(r) return r; } return null; } if(!reqOK(x.req)) return null;
    if(x.zone_aw) return {key: x.zone_aw}; if(x.zone_dep && +x.zone_dep.level>=2) return {key: x.zone_dep.key, dep: true}; return null; }; // dep: 존이 없어도 극 존을 새로 깖
  const zfx = zfxOf(b.sb2) || zfxOf(b.sb);
  return {parts, sup, enemyDown, afgA: +b.afg||0, afgC, ch, gear: gear ? gear.id : null, brk, inf, zfx, autoAtk: b.auto_atk || (gear && HYUGA_GEAR_WT[gear.id] && (b.id==null || b.id==='hyuga') ? {el:'shade', wt:HYUGA_GEAR_WT[gear.id], hits:1} : null), chgAtk: b.chg_atk || null}; // 휴우가: 機甲 장비를 껴야 오토 스킬에 공격(陰, 장비 종류로 타입 — 알테마 buddy/16) // autoAtk: 오토 스킬이 공격이면 그 공격 행동의 AF 게이지(존이면 행동당)
}
/* 흉성 3(AF 게이지 매 턴 소비, 2026-10-18 알테마 안・키・디그마): 턴을 넘겨 게이지를 못 모으니 버디 차지 스킬의 즉시 AF 게이지(afg)를 한 턴에 몰아 써서 50% 이상이면 AF.
   k = ⌈50 ÷ afg⌉번(건스(AS) 30 → 2번 60%), 필요 차지 k × cost, 차지 속도 r = 1 + chg_plus + 장비 → 첫 AF 1 + ⌈필요 ÷ r⌉턴째(초뢰진이면 6턴째 — 알테마 행동표와 같음), 그 뒤 ⌈필요 ÷ r⌉턴마다 */
function afDrainInj(bud, zone, team){
  if(!bud || !(bud.afgC>0) || !bud.ch || !(+bud.ch.cost>0)) return null;
  const k = Math.ceil(50/bud.afgC - 1e-9), need = k*bud.ch.cost, r = 1 + budChgPlus(bud.ch.plus, zone, team) + (bud.ch.rnd||0);
  const first = 1 + Math.ceil((need - (bud.ch.c0||0))/r - 1e-9), per = Math.max(1, Math.ceil(need/r - 1e-9)), turns = new Set();
  for(let t=first; t<=40; t+=per) turns.add(t);
  return {g0: Math.min(100, k*bud.afgC), first, per, turns, k};
}
/* 버디 오토 스킬 공격도 공격 행동이라 AF 게이지가 참(2026-10-19, TK '無限AF' 레시피: 輝晶陣에서 질야 오토 +15) — buddy_fx auto_atk {el, wt, hits}(el 'zone' = 4대 속성 존이면 그 속성).
   존이면 행동당 zoneAF, 없으면 타당 1.5%. 버디는 AF 중엔 안 움직이지만 AF가 끝난 그 턴에도 한 번 움직임(행동 밖 게이지 afOffOf에 들어감) */
const budAtkAfg = (bud, zone, team) => { const a = bud && bud.autoAtk; if(!a) return 0;
  const el = a.el==='zone' ? (zone && zone.kind==='elem' && ELEM4.includes(zone.key) ? zone.key : (a.el0||'none')) : (a.el||'none');
  const ex = +a.execs>1 && (!a.execs_req || (team||[]).some(c=>c && c.id===a.execs_req)) ? +a.execs : 1; // 피탄(AS): 전열 질퍼니(AS)면 다시 공격
  const za = zoneAF(zone, {el, wt: a.wt||null}, false); return za!=null ? za*ex : Math.min(30, Math.max(1, +a.hits||1)*ex)*1.5; };
const HYUGA_GEAR_WT = {kikou_kagizume:'slash', kikou_teyari:'pierce', kikou_kentsuba:'blunt'};
const budChgRate = (bud, zone, team) => bud && bud.ch && +bud.ch.cost>0 ? Math.min(1, (1 + budChgPlus(bud.ch.plus, zone, team) + (bud.ch.rnd||0))/bud.ch.cost) : 0; // 턴당 차지 스킬 사용 횟수(평균)
const budChgAtkAfg = (bud, zone) => { const a = bud && bud.chgAtk; if(!a) return 0; const el = a.el==='zone' ? (zone && zone.kind==='elem' && ELEM4.includes(zone.key) ? zone.key : (a.el0||'none')) : (a.el||'none');
  const za = zoneAF(zone, {el, wt: a.wt||null}, false); return za!=null ? za : Math.min(30, Math.max(1, +a.hits||1))*1.5; }; // 차지 공격 한 번의 AF 게이지
const budAfg = (bud, zone, team) => !bud ? 0 : (bud.afgA||0) + budAtkAfg(bud, zone, team) + ((bud.afgC||0) + budChgAtkAfg(bud, zone))*budChgRate(bud, zone, team);
/* 속성 변환(변환자재): 아군 전체를 존 속성·특정 속성으로 바꾸는 서포터, 자기 속성을 존·약점·옆 아군에 맞추는 캐릭터 */
function echgOf(team, progs){
  const L=[]; team.forEach((c,i)=>{ const e=c.echange; if(!e) return; if(e.req && !reqMet(e.req, team, c)) return; L.push(Object.assign({i}, e)); });
  L.sort((x,y)=>team[x.i].id < team[y.i].id ? -1 : team[x.i].id > team[y.i].id ? 1 : 0); // 변환이 둘이면 넣은 순서와 무관하게(2026-10-16)
  return L.length ? L : null;
}
/* 'ally' 속성 변환 상대(2026-10-16, 넣은 순서 의존 제거): 그 캐릭터 위치 규칙(1명 대상)이 고른 받는 사람 — 이벨라(AS) 오른쪽 ヴィルトゥス 아군, 노나(AS) 献身 대상. 위치 규칙이 없으면 배열 이웃 */
function allyOfPos(team, posSets){
  return team.map((c,j)=>{ if(!(c.echange && c.echange.el==='ally')) return null;
    if(posSets && posSets[j] && c.rules) for(let r=0;r<c.rules.list.length;r++){ const q = c.rules.list[r]; if(!(q.pos==='one' || q.pos==='selfone')) continue; const set = posSets[j][r]; if(!set) continue; for(const i of set) if(i!==j) return i; }
    const o = team.map((m,i)=>i).filter(i=>i!==j).sort((a,b)=>(team[b].pow||0)-(team[a].pow||0) || (team[a].id<team[b].id?-1:team[a].id>team[b].id?1:0)); // 위치 규칙이 없으면(알테나·피네(AS)) 가장 센 아군 옆에 둔다고 봄
    return o.length ? o[0] : null; });
}
const allyNb = (team, idx, A) => A && A.allyOf && A.allyOf[idx]!=null ? team[A.allyOf[idx]] : (team[idx+1] || team[idx-1]); // allyOf가 없을 때(화면 설명 등)만 배열 이웃
function echgElem(L, team, idx, el, sit, zone, enemy, A){
  const zEl = zone && zone.kind==='elem' && zone.level>0 ? zone.types[0] : null;
  const pick = (e, self)=>{
    if(e.sb && sit!=='sb') return null;
    if(e.zone && !(zEl===e.zone)) return null;
    if(e.el==='zone') return zEl || e.dflt || null; // 속성 ZONE이 없으면 기본 속성(네코코(ES) 変幻自在는 풍)
    if(e.el==='weak'){ if(!enemy) return null; const w=ELEMS.find(x=>enemy[x]==='weak'); return w||null; }
    if(e.el==='ally'){ if(!self) return null; const nb=allyNb(team, idx, A); return nb ? ((nb.persEl&&nb.persEl[0])||nb.elem) : null; }
    return e.el;
  };
  for(const e of L){
    if(e.to==='self'){ if(e.i!==idx) continue; const v=pick(e,true); if(v) return v; continue; }
    if(e.to==='shadow' && team[idx].align!=='shadow') continue;
    const v=pick(e,false); if(v) return v;
  }
  return el;
}
/* 속성 버프·내성 다운이 변환 대상 아군 속성을 따라감(elem_change buff:true, el 'ally', 2026-10-16): 이벨라(AS) オーラーティオー(ヴィルトゥス 아군 = 오른쪽),
   노나(AS) カスティーゴ(献身 대상) — 자기 변환과 같은 이웃 아군의 속성 퍼스널리티. 변환이 이 조합에서 안 켜지면(req) 데이터 속성 그대로 */
function folEls(team, j, A){
  const m = team[j], e = m && m.echange; if(!(e && e.buff && e.el==='ally')) return null;
  if(A && A.echg !== undefined && !(A.echg && A.echg.some(x=>x.i===j))) return null;
  const nb = allyNb(team, j, A); if(!nb) return null; const v = nb.persEl && nb.persEl.length ? nb.persEl : [nb.elem].filter(x=>x && x!=='none'); return v.length ? v : null; // 그 아군의 속성 퍼스널리티 전부(이벨라(AS) 원래 값도 자기 퍼스널리티 水·晶 둘)
}
const folV = (o, els, el) => els.includes(el) ? Math.max(0, ...Object.values(o).map(x=>+x||0)) : 0;
/* 이 조합의 독·페인 가동률: 부여 캐릭터 + 잠재 광석을 단 캐릭터(공격으로 직접 부여) */
const budInf = (inf, bi) => ({...inf, ...{poison: Math.max(inf.poison, +bi.poison||0), pain: Math.max(inf.pain, +bi.pain||0)}}); // 버디 장비 독·페인을 더한 것(평상 턴·2턴째 이후 AF)
function inflictOf(team, progs, S){
  const n = Math.max(1, S.enemyCount||1);
  let po=0, pa=0; const by={poison:[], pain:[]};
  let zc = null; const infOK = (f, c) => { if(f.req && !reqMet(f.req, team, c)) return false; // 부여 조건(2026-10-16): 편성 req, 존 zone/zlv(듀이(AC·AS) トリッキーヒット 페인은 ANOTHER ZONE 때만 — 이 조합에서 그 존을 펼 수 있으면)
    if(f.zone || f.zlv){ zc = zc || zoneCandidates(team, progs, 'normal'); return zc.some(z=>z.level>0 && (!f.zone || zoneMatch(f.zone, z)) && (!f.zlv || z.level>=f.zlv)); } return true; };
  const ok = [];
  team.forEach((c,i)=>{ const f0=c.inflict, f = f0 && infOK(f0, c) ? f0 : null; if(f){ const k = f.st && n>1 ? 0.6 : 1; ok.push(i);
      if(f.poison){ po=Math.max(po, f.poison*k); by.poison.push(i); } if(f.pain){ pa=Math.max(pa, f.pain*k); by.pain.push(i); } }
    const gl = progs[i] && progs[i].gl; if(gl && gl.ore){ po=Math.max(po,0.9); pa=Math.max(pa,0.9); by.poison.push(i); by.pain.push(i); } });
  return {poison:po, pain:pa, by, ok};
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
  if(ct.req && !reqMet(ct.req, team, c)) return null; // 편성 조건(2026-10-16 점검3: 아나벨(ES) 冥の誘い = 전열 冥 3명)
  const nE = Math.min(4, Math.max(1, S.enemyCount||1)), front = Math.max(1, Math.min(4, team.length));
  const H = Math.max(0.5, +S.enemyHits||2), pA = Math.min(1, Math.max(0, S.enemyAoE!=null ? +S.enemyAoE : 0.4));
  const coverAoE = team.map(m=>m.cover==='aoe');
  const immuneAll = team.some(m=>m.sup && m.sup.status_immune>=2);
  const selfT = ct.taunt || (c.sup&&c.sup.taunt>=2), otherT = team.some((m,j)=>j!==i && ((m.sup && m.sup.taunt>=2) || coverAoE[j]));
  const cp = ct.copy===true ? 1 : Math.max(0, Math.min(1, +ct.copy||0));
  const trigF = t => t==='phys' ? 0.7 : t==='fire' ? 0.3 : (t==='slash' || t==='pierce' || t==='blunt') ? 0.3 : 1; // 피격 조건: 물리 0.7, 화속성·물리 한 타입(베기 등) 0.3
  const nOf = (cov, trig) => { const aoeHits = cov ? front : team.some((m,j)=>j!==i && coverAoE[j]) ? 0 : 1;
    const stShare = cov ? 1 : selfT ? 0.9 : otherT ? 0.1 : 1/front;
    let n = nE * H * (pA*aoeHits + (1-pA)*stShare);
    n *= trigF(trig!=null ? trig : ct.trig);
    if(cx && cx.enemyCC && !immuneAll && !(c.sup && c.sup.status_immune>=1)) n*=0.6;
    return n; };
  const out = []; let rest = 1;
  for(const m of (ct.modes||[])){ const p = Math.max(0, Math.min(rest, +m.p||0)); if(!(p>0)) continue; rest -= p;
    const nb = nOf(coverAoE[i] || m.cover==='aoe', m.trig); out.push({p, nb, n:nb*(1+cp), mult:m.mult!=null ? +m.mult : (m.atk && m.atk.mult!=null ? +m.atk.mult : (+ct.atk.mult||1)), hx:+m.heal_x||1, atk:m.atk||null}); } // m.atk: 상태별 요격 공격(대상·타수·크리 확정, 시구레(ES) 夜叉の構え)
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
      const a2 = q.atk ? ({...a, ...q.atk}) : a; // 요격 크리 확정·방어 무시·배리어 관통은 데이터대로(2026-10-17, 딩 DB: 시구레(ES) 요격 크리 확정)
      const sk={skill:'요격', target:a2.target, kind:a2.kind, stat:a2.stat, element:a2.element||'none', weapon_type:a2.weapon_type, size:a2.size||'xl', mult:q.mult, hits:Math.max(1,a2.hits||1), repeat:0, crit_sure:a2.crit_sure===true ? true : Math.max(0, Math.min(1, +a2.crit_sure||0)), def_ignore:!!a2.def_ignore, barrier_pierce:!!a2.barrier_pierce, af_combo_x:1, condition:''};
      const t2=team.slice(); t2[i]=({...c, ...{main:sk, sb:null, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}});
      const co=attackerCore(t2, i, progs, A, enemy, S, 'normal', cx, FX, z); if(!co) continue;
      per[i]+=applyZoneCap(co, z, S, cap, null)*fw(co)*q.n*q.p; trig[i]+=q.n*q.p; els[i]=co.el; wts[i]=co.wt; kinds[i]=co.kind; tgts[i]=co.tgt; res[i]={ty:co.typeR, ph:co.physR, brk:co.brk, h:Math.max(1, +co.totHits||1)}; any=true;
      const za = zoneAF(z, co, false); afg += q.p*q.nb*(za!=null ? za : (enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak') ? 3.5 : 1.5)*Math.max(1, co.totHits||1)); }
  }
  return any ? {per, trig, els, wts, kinds, tgts, res, afg, total:per.reduce((x,y)=>x+y,0)} : null;
}
/* ---------- N턴 전투 시뮬레이션 (최고점 = 개전부터 N턴 총 대미지) ----------
   턴마다: AF(게이지 50% 이상이면 쓸지 말지 둘 다 따짐, 100%면 오래감) → AF 안에서 SB 게이지가 차면 그 시점 콤보로 SB.
   AF를 쓴 턴은 AF가 끝나면 아군 평상 행동 없음(사용자 확인 2026-10-16). 적은 AF가 끝난 뒤 공격 → 요격, 체인은 그 요격으로만(2026-10-17). 게이지 충전은 AF 안에서만, 턴 종료 공격은 있음.
   AF를 안 쓴 턴은 평상 턴(1턴은 속도·선제 순서), SB가 차 있으면 그 턴에 SB(SB는 턴을 쓰지 않음).
   게이지: AF 시작 50%(캐릭터·버디 조건이면 100%), 평상 턴 충전은 afGain. SB 시작 = 성향이 같은 전열 1명당 12.5%(최대 50%),
   아군 행동 1회당 2.5%(AF 중 행동 포함). 상태(턴, AF%, SB%)마다 남은 턴의 최댓값을 기억하는 동적 계획으로 가장 좋은 순서를 찾는다 */
function afStartOf(team, ctx, S){
  if(S && (S.afBan || S.afDrain)) return {g:0, why:[], ban:true}; // AF 금지·흉성 3(게이지 매 턴 소비): 시작 게이지 0(예전엔 0을 돌려줘 g0가 undefined)
  let g = +S.afStart; if(!(g>=0)) g = 50;
  const bud = ctx && ctx.buddy ? [ctx.buddy.main&&ctx.buddy.main.id, ctx.buddy.sub&&ctx.buddy.sub.id].filter(Boolean) : [];
  const why = [];
  for(const c of team){ const r=c.afStartR; if(!r) continue;
    if(r.need){ const al = r.need.align ? [].concat(r.need.align) : null, cnt = al ? (al.length>1 ? Math.max(...al.map(a=>team.filter(m=>m.align===a).length)) : team.filter(m=>m.align===al[0]).length) : team.filter(m=>(m.elems||[]).includes(r.need.elem)).length;
      if(cnt < (+r.need.n||1)) continue; } // need.align(천·명 n명, 배열이면 어느 한쪽이 n명 — 2026-10-18: 예전엔 elem만 봐서 알도 항목이 한 번도 안 맞았음)
    if(r.buddy && !r.buddy.some(b=>bud.includes(b))) continue;
    if((+r.start||0) > g){ g = +r.start; why.push(c.name); } }
  return {g: Math.min(100, g), why};
}
/* 타수로 벗기는 보스 기믹(hp_model.hitgim, 2026-10-19 거시 점검: 서가 31개 중 30개·회생 11개 중 9개에서 엔진 상위 덱이 전부 최소 턴(목숨·스토퍼 수)에 잡음 →
   HP로는 차이가 안 나고 실제 난이도는 기믹 — 그중 수치가 있는 '타수로 벗기는 것'부터. 보스 109개 중 타수 스택 25·배리어 횟수 36개):
   k 'stack'    스택 s마다 받는 피해 ×max(fl, 1−r·s). 맞는 타격(only_el·only_wt·only_kind)마다 per개 감소 — end면 턴 종료에 그 턴 타수만큼(최대 cap).
                regen = 턴 종료 증가(최대 max), decay = 턴 종료 감소, zero {turns} = 0이 되면 그 턴 수 뒤 s0으로 복구, unit 'act' = 타수 대신 공격 행동 수
   k 'barrier'  s0회 동안 피해 ×x(경감·무효 배리어 N회), refill = 매 턴 시작에 다시 s0
   k 'multihit' 스킬 한 번 안에서 2타째부터 step씩 덜 들어감(연격 경감) — 실행당 타수가 많을수록 손해
   공통: on 'start'(기본)|'revive'(부활마다)|'revive2'(2회째 부활부터), off 'revive2', from = 그 턴부터, reset_on 'revive'|'stop'(부활·스토퍼마다 s0), turns = 켜진 뒤 최대 턴.
   hp_model.dmg_cut 중 hits가 있는 것(경감 배리어 N회)도 barrier로 — 예전엔 turns 동안 통째로 경감하거나(결실 히스메나 50회 배리어를 3턴 내내) 아예 빠졌음 */
/* 배리어 경감(2026-10-19, 유튜브 클리어 대조 — 결실 마리엘 2T 투고 vs 엔진 12T): '경감·무효 배리어'는 배리어 관통 공격엔 안 먹음(Hinaden: 100% 감소 배리어를 공명(관통)으로 돌파).
   팀 배리어 관통 몫(평상 턴 캐릭터별 대미지 × 관통 비율 — ev.pierceS)만큼 경감을 덜 받음: x → x + (1 − x)·관통 몫. 경감 구간을 따로 모델링한 보스는 예전 일괄 관통 감점(needs.barrier_pierce: 관통 없는 공격 ×0.25 내내)을 안 씀 — 두 번 깎던 것 */
const isBarrierCut = q => !!q && !q.nopierce && /배리어|バリア|barrier/i.test(String(q.when||q.label||''));
function barrierModeled(b){ const hm = (b && b.hp_model) || {}; return (hm.dmg_cut||[]).some(isBarrierCut) || (Array.isArray(b && b.hitgim) && b.hitgim.some(g=>g && g.k==='barrier' && isBarrierCut(g))); }
const pierceX = (x, ps) => x + (1 - x)*Math.max(0, Math.min(1, +ps||0));
/* 팀에 맞춘 타수 기믹: 배리어는 관통 몫만큼 덜, '내성' 스택(보스 물리·마법 내성 UP)은 아군 내성 다운과 같은 합연산 묶음(대미지 × (1 + 내성 다운 − 보스 내성 UP))이라
   스택 1개 몫 r → r ÷ (1 + 팀 내성 다운 R)(2026-10-19 — 예전엔 따로 곱해 결실 마리엘 白亜 3스택이 ×0.1, 내성 다운 100% 덱도 ×0.2). pw > 1이면 그중 한 갈래만 내성(res로 지정) */
const hgTeam = (g, ps, R) => { if(!g) return g; if(g.k==='barrier') return isBarrierCut(g) ? ({...g, x: pierceX(+g.x||0, ps)}) : g;
  if(g.k==='stack' && +g.r>0 && +R>0 && /내성/.test(String(g.label||''))){ const p = +g.pw>0 ? +g.pw : 1, rP = g.res!=null ? Math.min(p, Math.max(0, +g.res)) : (p>1 ? 1 : p), r1 = (+g.r)/(1 + (+R)); return ({...g, r: ((p - rP)*(+g.r) + rP*r1)/p}); }
  return g; };
function hgList(b){ const L = []; if(!b) return L; const hm = b.hp_model || {}; // b = 보스(boss.hitgim — gim/merge.py가 hp_model 줄을 다시 쓰므로 바깥에 둠)
  for(const g of (Array.isArray(b.hitgim) ? b.hitgim : [])) if(g && (g.k==='multihit' ? +g.step>0 : (+g.s0>0 || +g.regen>0))) L.push({...g, k: g.k||'stack'});
  if(!b.hitgim_nocut) for(const q of (hm.dmg_cut||[])){ /* hitgim_nocut: 횟수 배리어를 hitgim에 직접 적었으면 dmg_cut hits는 안 씀 */ if(!q || !(+q.hits>0) || q.x==null || !(+q.x>=0 && +q.x<1)) continue; const mk = /^(start|revive2|revive|always)/.exec(String(q.when||'start')); if(!mk) continue;
    L.push({k:'barrier', s0:+q.hits, x:+q.x, on: mk[1]==='always' ? 'start' : mk[1], turns: +q.turns>0 ? +q.turns : 0, label: String(q.when||''), cut:true}); }
  return L; }
const hgSel = (g, q) => (!g.only_el || g.only_el.includes(q.el)) && (!g.only_wt || g.only_wt.includes(q.wt)) && (!g.only_kind || q.kind===g.only_kind);
const hgF = (g, x) => { x = Math.max(0, x||0); if(g.k==='barrier') return x>0 ? +g.x||0 : 1; const p = +g.pw>0 ? +g.pw : 1; return Math.max(+g.fl||0, Math.pow(Math.max(0, 1 - (+g.r||0)*x), p)); }; // pw: 내성·경감이 따로 곱해지는 기믹(아무레툼 1%+1% → (1−0.01s)²)
const hgS0 = g => g.k==='multihit' ? 1 : +g.s0||0;
function hgSeg(g, s, H, Q){ // H타(그중 Q타가 깎음)의 평균 피해 배율·남는 스택. 타격당 피해는 고르게 가정(AF는 콤보로 뒤 타격이 커서 실제보다 약간 불리)
  if(!(H>0) || !(s>0)) return {m: hgF(g, s), s};
  const e = (g.per!=null ? +g.per : 1)*Q/H; if(g.end || !(e>0)) return {m: hgF(g, s), s};
  const n0 = s/e; // 스택이 남아 있는 타수
  if(g.k==='barrier'){ const nb = Math.min(H, Math.ceil(n0 - 1e-9)), x1 = s - H*e; return {m: (nb*(+g.x||0) + (H - nb))/H, s: x1>1e-6 ? x1 : 0}; }
  const r = +g.r||0, fl = +g.fl||0, p = +g.pw>0 ? +g.pw : 1, xs = r>0 ? (1 - (fl>0 ? Math.pow(fl, 1/p) : 0))/r : Infinity, G0 = x => r>0 ? (1 - Math.pow(Math.max(0, 1 - r*x), p+1))/(r*(p+1)) : x, Fi = x => x<=xs ? G0(x) : G0(xs) + fl*(x - xs), x1 = s - H*e > 1e-6 ? s - H*e : 0;
  return {m: Math.max(0, Math.min(1, ((Fi(s) - Fi(x1))/e + Math.max(0, H - n0))/H)), s: x1}; }
const hgMH = (step, ws, hs) => { let W = 0, V = 0; (ws||[]).forEach((w,i)=>{ if(!(w>0)) return; const h = Math.max(1, Math.round((hs||[])[i]||1)); let a = 0; for(let k=0;k<h;k++) a += Math.max(0, 1 - step*k); W += w; V += w*a/h; }); return W>0 ? V/W : 1; };
/* 한 턴: 구간(segs 순서 — AF → 평상 → SB, 타수로 먼저 벗기고 큰 한 방을 뒤에 넣는다고 봄)마다 켜진 기믹 배율을 곱하고 스택을 줄인 뒤 턴 종료 처리.
   seg {k, d 피해, w 멤버별 타수, u 멤버별 행동 수, p 멤버별 피해 비중, e 실행당 타수, ch 체인·요격 타수}. only(g)가 있으면 그 기믹만 → {d, s, x 전체 배율, xs 구간별 배율} */
function hgTurn(G, st, segs, M, only){ const s = st.slice(), used = G.map(()=>0), xs = []; let d = 0, d0 = 0;
  for(const sg of segs){ let x = 1;
    G.forEach((g,j)=>{ if(s[j]==null || (only && !only(g))) return;
      if(g.k==='multihit'){ x *= hgMH(+g.step, sg.p, sg.e); return; }
      let H = 0, Q = 0; M.forEach((q,i)=>{ const h = g.unit==='act' ? (+(sg.u||[])[i]||0) : (+(sg.w||[])[i]||0); H += h; if(hgSel(g, q)) Q += h; });
      if(sg.ch>0){ H += sg.ch; if(!g.only_el && !g.only_wt && !g.only_kind) Q += sg.ch; } // 체인·요격 발동(1타·1행동씩)
      used[j] += Q; const r = hgSeg(g, s[j], H, Q); x *= r.m; if(!g.end) s[j] = r.s; });
    xs.push(x); d += (sg.d||0)*x; d0 += sg.d||0; }
  G.forEach((g,j)=>{ if(s[j]==null || g.k==='multihit' || (only && !only(g))) return; // 턴 종료
    if(g.end && used[j]>0 && s[j]>0) s[j] = Math.max(0, s[j] - Math.min(+g.cap>0 ? +g.cap : Infinity, (g.per!=null ? +g.per : 1)*used[j]));
    if(+g.decay>0 && s[j]>0) s[j] = Math.max(0, s[j] - +g.decay);
    if(s[j]<0){ s[j] += 1; if(s[j]>=0) s[j] = hgS0(g); }
    else if(g.zero && +g.zero.turns>0 && s[j]===0) s[j] = -(+g.zero.turns);
    if(+g.regen>0 && s[j]>=0) s[j] = Math.min(+g.max>0 ? +g.max : Infinity, s[j] + +g.regen); });
  return {d, s, x: d0>0 ? d/d0 : (xs.length ? xs.reduce((a,v)=>a*v, 1) : 1), xs}; }
/* 턴 시작: from(그 턴부터)·refill(매 턴 다시)·turns(최대 지속) */
function hgStart(G, s, at, t){ G.forEach((g,j)=>{
  if(s[j]==null && (g.on||'start')==='start' && +g.from>1 && t===+g.from){ s[j] = hgS0(g); at[j] = t; }
  if(s[j]!=null && g.refill && t>at[j]) s[j] = hgS0(g);
  if(s[j]!=null && +g.turns>0 && t >= at[j] + +g.turns) s[j] = null; }); }
function battleSim(N, o){
  // 극존(ZONE 각성)은 2턴 지속: 개전 자동이면 1·2턴, SB로 각성하면 그 턴과 다음 턴. awConst면(스킬·극 글래스터로 다시 각성) 계속
  const memo = new Map(), R = o.refill;
  const f = (t, g, s, e, aw, ou, hs, na)=>{ // ou: 전투 중 1회 SB(once_t) 캐릭터가 이미 SB를 썼는지, hs: 보스 타수 기믹 스택(o.hg)
    if(t>N) return {v: (o.cutW || o.turnX) && o.afTailV>0 && g>=50 ? 0.8*o.afTailV*Math.min(1, g/100) : 0, plan:[]}; // 개시 피해 경감이 있으면 N턴 끝에 남은 AF 게이지도 값(경감 중에 AF를 써 버리지 않게)
    if(o.sbFull && o.hasSB && o.sbFull.has(t)) s = 100; // SB 게이지 가득(sb_full 턴 시작 — 유우체리카 星天の力)
    if(o.afDrain) g = o.afDrain.turns.has(t) ? o.afDrain.g0 : 0; // 흉성 3(2026-10-18): 게이지는 매 턴 행동 뒤 소비 → 그 턴 버디 차지로 채운 만큼만(알테마: 건스(AS) 차지 2회 60% → AF)
    const key = t+'|'+Math.round(g*10)+'|'+Math.round(s*10)+'|'+e+'|'+aw+'|'+(ou||0)+(hs ? '|'+hs.map(v=>v==null ? 'x' : Math.round(v*10)).join(',') : '')+(o.maxAF!=null ? '|a'+(na||0) : o.preR || o.afFirst ? '|p'+((na||0)>0 ? 1 : 0) : '');
    let hs0 = hs; if(o.hg && hs){ hs0 = hs.slice(); hgStart(o.hg.G, hs0, o.hg.at, t); }
    const hit = memo.get(key); if(hit) return hit;
    let best = null;
    const opts = [];
    if(g >= (o.ss ? 100 : 50) && !o.noAF && !(o.maxAF!=null && (na||0) >= o.maxAF)) opts.push('af'); if(opts.includes('af') && o.hasSB && o.sbHold) opts.push('afH'); // 성해진: 100% 미만이면 AF 못 켬 // noAF: 서가 챌린지 점수 비교용(AF 턴엔 행동 보너스가 없음)
    opts.push('none');
    if(R && R.cost && !e && g>=R.cost) opts.push('stack');
    for(const op of opts){ const isAF = op==='af' || op==='afH'; // afH: AF 안에서 SB를 쓰지 않고 다음 평상 턴으로 미룸(서가 챌린지처럼 AF 피해에 상한이 있을 때, 2026-10-19)
      let d=0, g1=g, s1=s, e1=e, aw1 = o.budAw && o.budAw.has(t) ? Math.max(aw, 2) : aw, ou1=ou||0, dA=0, dS=0, rA=null; const rec={t, af:null, sb:null, combo:null, stack:false, fA:1, fS:1}; // 버디 차지 스킬 존 각성 턴 · fA·fS: 그 턴 AF·SB 몫에 곱해진 배율(타수 기믹·경감 — 딜 비중용)
      if(o.budAw && o.budAw.has(t)) rec.budAw = true;
      const L = ()=> (aw1>0 || o.awConst) ? 2 : 1;
      const useSB = (inAF, fin)=>{ if(o.sbAw) aw1 = Math.max(aw1, 2); const lv = (o.sbAw||aw1>0||o.awConst) ? 2 : 1; let sv = o.sbT ? o.sbT(t) : {b:o.sbBurst, b1:o.sbBurst1, ch:o.sbChain||0};
        if(o.sbOnce){ const ox = o.sbOnce.t(t); if(ou1 || t>o.sbOnce.maxT){ sv = {b: sv.b - (lv>=2 ? ox.b : 0), b1: sv.b1 - (lv>=2 ? 0 : ox.b1), ch: sv.ch}; rec.sbNo1 = true; } else ou1 = 1; } // 틸릴(ES) 心の剣: 剣持つ救世主(개전 3턴) 중에만, 쓰면 해제 → 전투 중 1번
        if(sv.on) rec.sbOn = true; d += (lv>=2 ? sv.b - (sv.ch||0) : sv.b1)*(inAF?fin:1)*(inAF && o.ss && o.ssAF ? 2 : 1); /* 성해진: AF 안 SB도 ×2(S.starseaAF일 때) */ /* SB 대미지만(그 턴 체인은 평상 턴 nd에 이미 있음 — SB는 체인을 발동시키지 않음) */ s1=0; rec.sb = inAF?'af':'turn'; if(inAF) rec.combo=fin;
        if(o.teSB){ d += o.teSB.total; rec.teSB = o.teSB.total; } // SB 턴 종료 공격
        if(R && (e1 || !R.cost) && !(inAF && R.noAF)){ g1=Math.max(g1, R.to); e1=0; rec.refill=true; }
        if(o.afSbG>0){ rec.gSb = o.afSbG; } }; // SB 턴 종료 추격의 AF 게이지는 턴 끝에(아래)
      // AF를 쓴 턴(사용자 확인 2026-10-16·17): AF가 끝나면 아군 평상 행동 없이 적이 공격 → 요격, 요격으로 체인(AF 공격으로는 체인 없음). AF 게이지·SB 게이지는 AF 안에서만. 턴 종료 공격은 남음
      if(isAF){ const f1 = o.afFirst && !(na>0), r=o.afRun(g1, L(), t, false, f1); if(f1) rec.af1st = true; d+=r.dmg; s1+=o.sbAct*(o.sbW && r.n ? (r.nS || r.n).reduce((x,v,i)=>x+(+v||0)*(o.sbW[i]||1), 0) : r.acts); /* SB 게이지는 AF 버프 행동도(nS = 모든 행동) */ g1 = o.afOffG>0 ? Math.min(100, o.afOffG) : 0; if(g1>0) rec.gOff = +g1.toFixed(1); rec.af=r.g0; rec.afD=r.dmg; rec.afL=L(); if(o.teAF){ d += o.teAF.total; rec.teAF = o.teAF.total; } if(o.teN){ d += o.teN; rec.teN = o.teN; }
        if(o.ctrAF){ d += o.ctrAF; rec.ctrAF = o.ctrAF; } // AF가 끝난 뒤 적 공격 → 요격 + 요격으로 발동한 체인(2026-10-17)
        dA = d; rA = r; rec.afN = r.n; if(o.hasSB && s1>=100 && op!=='afH') useSB(true, r.fin); if(op==='afH') rec.sbHold = true; dS = d - dA; }
      if(op==='stack'){ g1-=R.cost; e1=1; rec.stack=true; }
      if(!isAF && o.hasSB && !rec.sb && s1>=100){ const dq = d; useSB(false); dS = d - dq; }
      if(dS>0) rec.sbD = dS;
      let nd = isAF ? 0 : t===1 ? o.t1 : (L()>=2 ? o.normal : o.normal1)*(o.rmp ? o.rmp(t) : 1)*(o.ndOn ? o.ndOn(t) : 1)*(o.preR && !(na>0) ? o.preR : 1); // preR: AF 안 버프 운용의 첫 AF 전 평상 턴
      if(o.afFull && !isAF){ const gn = o.afGain>0 ? o.afGain : 1, full = g1>=100 ? 1 : Math.max(0, Math.min(1, (g1 + gn - 100)/gn)); // 게이지가 100%에 닿은 뒤 몫(평상 행동 중 차는 것은 고르게)
        if(full>0){ const k = 1 - full*(1 - o.afFull); nd *= k; if(rec.sb==='turn' && g1>=100){ d *= o.afFull; dS *= o.afFull; if(rec.sbD) rec.sbD = dS; rec.fS *= o.afFull; } rec.afFull = +full.toFixed(2); } }
      if(o.ss && !isAF && g>=100-1e-9){ nd *= 2; if(dS>0){ d += dS; dS *= 2; rec.sbD = dS; } rec.ss = true; } // 성해진: 게이지 100%인 평상 턴은 모든 공격 ×2
      d += nd; rec.nd = nd; rec.L = L(); // 누적 효과 예열(rmp). 2026-10-18 버그: 이 두 줄이 주석 안에 들어가 실전 딜 비중(bsim.per)에서 평상 턴이 빠졌었음
      if(!isAF){ s1 = Math.min(100, s1 + o.sbAct*((o.sbWN || o.sbW) ? (o.sbWN || o.sbW).reduce((x,v)=>x+v, 0) : o.front)); g1 = Math.min(100, g1 + o.afGain); } else s1 = Math.min(100, s1); aw1 = Math.max(0, aw1-1);
      if(rec.gSb) g1 = Math.min(100, g1 + rec.gSb); // SB 턴 종료 추격(메리나)
      let hs1 = hs0;
      if(o.hg && hs0){ const M = o.hg.M, segs = []; // 보스 타수 기믹(2026-10-19): AF(또는 평상) → SB 순으로 벗기며 그 구간 피해 ×배율
        if(isAF && rA) segs.push({k:'a', d:dA, w: (rA.n||[]).map((v,i)=>(+v||0)*M[i].h), u: (rA.n||[]).map((v,i)=>(+v||0)*M[i].x), p: rA.per, e: M.map(q=>q.en)});
        else segs.push({k:'n', d:nd, w: M.map(q=>q.hN), u: M.map(q=>q.aN), p: M.map(q=>q.pn), e: M.map(q=>q.en), ch: o.hg.ch});
        if(dS>0) segs.push({k:'s', d:dS, w: M.map(q=>q.hS), u: M.map(q=>q.xS), p: M.map(q=>q.ps), e: M.map(q=>q.es)});
        const R = hgTurn(o.hg.G, hs0, segs, M); hs1 = R.s; rec.hgS = hs1;
        if(Math.abs(R.x - 1) > 1e-9){ const xa = isAF ? R.xs[0] : 1, xn = isAF ? 1 : R.xs[0], xsb = dS>0 ? R.xs[1] : 1;
          d = d - dA - dS - nd + dA*xa + dS*xsb + nd*xn; rec.nd = nd*xn; if(rec.afD) rec.afD *= xa; if(rec.sbD) rec.sbD *= xsb; rec.fA *= xa; rec.fS *= xsb; rec.hg = +R.x.toFixed(3); } }
      if(o.cutW || o.turnX){ const m = (o.cutW ? o.cutW.reduce((q,w)=> t<=w.t ? Math.min(q, w.x) : q, 1) : 1)*(o.turnX && o.turnX[t-1]>0 ? o.turnX[t-1] : 1); if(m!==1){ d *= m; rec.nd *= m; if(rec.afD) rec.afD *= m; if(rec.sbD) rec.sbD *= m; rec.fA *= m; rec.fS *= m; rec.cut = +m.toFixed(3); } } // 보스 개시 피해 경감·턴마다 바뀌는 보스 내성 단계(그 턴 피해 전부 ×x — 낮아진 뒤 AF를 쓰는 계획을 고르게)
      /* AF 한 번 총 피해 상한(o.afTotCap = S.afTotalCap 9999억, 사용자 2026-10-19): AF + AF 안 SB(턴 종료 공격 제외)가 넘으면 상한까지 — 딜 비중(fA·fS)도 같은 비율로 */
      if(o.afTotCap>0 && isAF){ const teS = rec.sb==='af' ? (+rec.teSB||0) : 0, inAF = (+rec.afD||0) + (rec.sb==='af' ? Math.max(0, (+rec.sbD||0) - teS) : 0);
        if(inAF > o.afTotCap){ const k = o.afTotCap/inAF; d -= inAF - o.afTotCap; rec.afD = (+rec.afD||0)*k; if(rec.sb==='af'){ rec.sbD = Math.max(0, (+rec.sbD||0) - teS)*k + teS; rec.fS *= k; } rec.fA *= k; rec.afCap = true; rec.afRaw = inAF; } }
      /* 서가 챌린지 점수(o.scoreCap, 2026-10-19 알테마 星詠みの書架: 'AF 중에는 10억 이상 줘도 999,999,999까지만 가산'): AF 안에서 준 피해(AF + AF 안 SB)는 한 번에 상한까지만 → 점수를 최대로 하는 계획 */
      if(o.scoreCap>0 && isAF){ const inAF = (+rec.afD||0) + (rec.sb==='af' ? Math.max(0, (+rec.sbD||0) - (+rec.teSB||0)) : 0); /* SB 턴 종료 공격(teSB)은 AF가 끝난 뒤라 상한 밖 */ if(inAF > o.scoreCap){ rec.raw = d; d = d - inAF + o.scoreCap; rec.capped = true; } }
      rec.d = d; rec.g = g; rec.s = s; rec.g1 = g1;
      const nx = f(t+1, g1, s1, e1, aw1, ou1, hs1, (na||0) + (isAF ? 1 : 0)), v = d + nx.v;
      if(!best || v>best.v) best = {v, plan:[rec].concat(nx.plan)};
    }
    memo.set(key, best); return best;
  };
  const r = f(1, o.g0, o.s0, R && R.e0 ? 1 : 0, o.aw0||0, 0, o.hg ? o.hg.s0.slice() : null, 0);
  return {total: o.cutW || o.turnX ? r.plan.reduce((a,x)=>a+x.d, 0) : r.v, turns:r.plan, N};
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
/* 유니즌을 쓸 수 있는 캐릭터(전열에 다른 가창 캐릭터): 유니즌 쪽과 혼자 歌唱하는 쪽(엘의 노래 주는 대미지 50%·AF 콤보 +3%p, 재공격 없음)을 둘 다 계산 */
function uniCands(team, progs){ const out = []; team.forEach((c,i)=>{ if(uniOn(c, team, progs[i])) out.push(i); }); return out; }
function evalKey(ctx){ const m = ctx && (ctx.mode || ctx.keyMode); const k = m==='burst' ? (ev=>+ev.dummyT||0) : m==='sustain'||m==='stability' ? (ev=>+ev.sustain||0) : m==='opener' ? (ev=>+ev.opener||0) : (ev=>0.4*(+ev.burst||0)/Math.max(1, (ev.bsim&&ev.bsim.N)||3) + 0.3*(+ev.sustain||0));
  return m==='burst' ? k : (ev => ev && ev.score ? +ev.score.total||0 : k(ev)); } /* 서가 챌린지는 변형 고르기도 점수로(2026-10-19 점검: 점수와 지속 딜 단위가 달라 지속 딜이 정했음) */
/* 전투 중에 바뀌는 보스 존·상성(S.bossZoneLate [{key, lv, every, from 턴 | after 깬 줄 수 + hp 그 줄 HP%, aff {weak, resist, null, absorb}, bar, bars}], 2026-10-18 보스 기믹:
   플레임 로드 4턴째 極・烈火陣, 진·현현 츠키하 부활마다 極・烈火陣·내성 → 무효, 결실 유나 부활 水天陣, 로제타 부활 幻魔陣·약점 화 → 마법, 니즈헬그 30% 幻魔陣 등).
   보스가 깐 극 존은 다른 극 존처럼 2턴 뒤 일반 존 → 그 뒤엔 아군 극 존만 덮어씀(매 턴 다시 까는 every는 제외): 2턴 뒤 lv 1 단계를 자동으로 붙임(처음부터 까는 극 존도).
   단계마다 그 상태로 한 번 더 계산(같은 변형 — 성도 스킬 빼기·유니즌·자동 존, 같은 존·상성은 한 번)해 ev.zLate에 두고:
   실전 N턴은 바뀌는 턴부터 그 계산의 턴 기록으로(HP 기준은 앞 턴 피해 ÷ 1.15로 그 HP에 닿은 다음 턴부터), 지속 딜은 긴 전투(S.susHorizon 15턴)·HP 비율로 나눠 섞음, 처치 턴(killTurnsM)은 단계마다.
   탐색 어림 단계(stFast)는 처음 상태만 */
function affOver(enemy, aff){ const e = {...enemy||{}};
  for(const k of ['weak','resist','null','absorb']){ if(!Array.isArray(aff[k])) continue; for(const t of Object.keys(e)) if(e[t]===k) delete e[t]; for(const t of aff[k]) e[t] = k; }
  return e; }
function zlList(S){ const out = [], bz = S && S.bossZone;
  if(bz && bz.key && +bz.lv>=2 && !bz.every) out.push({key: bz.key, lv: 1, from: 3, auto: true});
  for(const q of (S && Array.isArray(S.bossZoneLate) ? S.bossZoneLate : [])){ if(!q || !(q.key || q.aff) || !(+q.from>1 || q.after!=null)) continue;
    out.push(q); if(q.key && +q.lv>=2 && !q.every) out.push(+q.from>1 ? ({...q, ...{lv:1, from:+q.from+2, auto:true}}) : ({...q, ...{lv:1, delay:2, auto:true}})); }
  return out.slice(0, 6); }
/* 적 내성↔약점 교환(2026-10-18, 마크바브 조사: 墨染の軍師 調虎離山 = 적 전체 내성을 약점·약점을 내성으로 영구 교환(전투 1회, 알테마 948), 셴화(AS) リバースホール あべこべ 3턴(다시 걸면 풀림, 알테마 1224)):
   교환하는 캐릭터가 있고 적에게 내성이 있으면, 2턴째부터 교환한 상성으로 계산한 쪽도 재서 성향 기준이 큰 쪽(무효·흡수는 그대로). 탐색 어림 단계는 전투 내내 교환한 쪽과 비교 */
function swapAff(enemy){ const e = {}; for(const k of Object.keys(enemy||{})){ const v = enemy[k]; e[k] = v==='resist' ? 'weak' : v==='weak' ? 'resist' : v; } return e; }
function evalTeam(team, progs, enemy, S, cap, ctx){
  if(ctx && ctx._zl) return evalTeamV(team, progs, enemy, S, cap, ctx);
  const swI = enemy && Object.values(enemy).includes('resist') && S && S.affSwap!==false ? team.findIndex(c=>c && c.affSwap) : -1;
  if(swI<0) return evalTeamZ(team, progs, enemy, S, cap, ctx, null);
  const val = evalKey(ctx), sw = {from: Math.max(2, +team[swI].affSwap.from||2), swap: true, by: team[swI].id, name: team[swI].name, t: +team[swI].affSwap.t||99};
  const e0 = evalTeamZ(team, progs, enemy, S, cap, ctx, null);
  const e1 = ctx && ctx.stFast ? evalTeamZ(team, progs, swapAff(enemy), S, cap, ctx, null) : evalTeamZ(team, progs, enemy, S, cap, ctx, sw);
  if(val(e1) > val(e0)*(1+1e-9)){ e1.affSwap = {by: sw.by, name: sw.name, from: sw.from, t: sw.t}; return e1; }
  return e0;
}
function evalTeamZ(team, progs, enemy, S, cap, ctx, sw){
  const zl = zlList(S).concat(sw ? [sw] : []);
  if(!zl.length) return evalTeamV(team, progs, enemy, S, cap, ctx);
  const S0 = ({...S, ...{bossZoneLate:null}}), ev = evalTeamV(team, progs, enemy, S0, cap, ctx);
  if(ctx && ctx.stFast) return ev;
  const vr = {sbOff: ev.sbOff || null, uni: ev.uni || null, songOff: ev.songOff || null, azBy: ev.azBy==null ? null : ev.azBy, redOff: !!ev.redOff, afBuff: +ev.afBuf||0}, HL = Math.max(4, +S.susHorizon || 15), NB = (ev.bsim && ev.bsim.N) || 3;
  const posOf = q => +q.from>1 ? (+q.from-1)/HL : Math.min(1, ((+q.after||0) + (q.hp!=null ? 1 - (+q.hp)/100 : 0))/Math.max(1, +q.bars||1)) + (q.delay ? q.delay/HL : 0);
  const L = zl.map(q=>({q, p: posOf(q)})).sort((a,b)=>a.p - b.p), memo = new Map(), ph = [];
  let curZ = S0.bossZone || null, curA = null, curS = false; // 단계마다 그때까지 바뀐 상태(보스 존·상성·내성↔약점 교환)
  for(const {q, p} of L){
    if(q.swap) curS = true; else { if(q.key) curZ = {key:q.key, lv:+q.lv||1, every:!!q.every}; if(q.aff) curA = q.aff; }
    const bzq = curZ, mk = JSON.stringify([bzq, curA, curS]);
    let e2 = memo.get(mk); if(!e2){ const en0 = curA ? affOver(enemy, curA) : enemy; e2 = evalTeamV(team, progs, curS ? swapAff(en0) : en0, ({...S0, ...{bossZone: bzq}}), cap, ({...ctx||{}, ...{variant: vr, _zl: true}})); memo.set(mk, e2); }
    const z2 = e2.normal && e2.normal.zone;
    ph.push({from: +q.from>1 ? +q.from : null, after: q.after!=null && !(+q.from>1) ? +q.after : null, hp: q.hp!=null ? +q.hp : null, delay: +q.delay||0, auto: !!q.auto, swap: !!q.swap, swBy: q.swap ? q.name||null : null, pos: p, key: q.key||null, lv: +q.lv||1, aff: q.aff||null, bar: +q.bar>0 ? +q.bar : 0,
      zone: z2 ? z2.label : null, sustain: +e2.sustain||0, sustainNoAF: +e2.sustainNoAF||0, sustainSB: +e2.sustainSB||0, af: +e2.af||0, afLate: e2.afLate ? {v: +e2.afLate.v||0} : null,
      afTurns: +e2.afTurns||4, afOff: !!e2.afOff, afDrain: e2.afDrain ? {first: e2.afDrain.first, per: e2.afDrain.per, af: e2.afDrain.af} : null,
      turns: e2.bsim ? e2.bsim.turns : [], btot: e2.bsim ? +e2.bsim.total||0 : 0, per: e2.bsim ? e2.bsim.per : null, nT: e2.normal ? +e2.normal.total||0 : 0 }); }
  // 실전 N턴: 바뀌는 턴부터 그 단계의 턴 기록
  // HP 기준 단계는 턴마다 그때 단계의 피해로 줄을 깎아(넘친 피해는 안 넘어감 — 한 턴에 목숨 하나) 닿는 턴을 찾음
  const mg = 1.15, recA = (ev.bsim && ev.bsim.turns) || [], swT = ph.map(p=>p.from ? p.from : Infinity);
  { const bar = (ph.find(p=>p.bar>0) || {}).bar*1e8, bars = Math.max(1, ...L.map(x=>+x.q.bars||1)); if(bar>0){ let bi = 0, rem = bar;
    for(let t=1; t<=recA.length && bi<bars; t++){ let k = -1; swT.forEach((s,j)=>{ if(t>=s) k = j; }); const r = k>=0 && ph[k].turns[t-1] ? ph[k].turns[t-1] : recA[t-1], d = Math.max(0, +r.d||0)/mg;
      if(d >= rem){ bi++; rem = bar; } else rem -= d; const prog = bi + 1 - rem/bar;
      ph.forEach((p,j)=>{ if(!p.from && swT[j]===Infinity && prog >= (p.after||0) + (p.hp!=null ? 1 - p.hp/100 : 0) - 1e-9) swT[j] = t + 1 + p.delay; }); } } }
  if(ev.bsim && recA.length && swT.some(t=>t<=NB)){
    const dA = recA.reduce((a,r)=>a+Math.max(0,+r.d||0),0) || 1, tA = +ev.bsim.total||0, turns = recA.slice(), parts = [];
    /* 단계 기록을 이어 붙이려면 바뀌는 턴의 게이지(AF·SB)가 앞 단계 기록과 같아야 함(2026-10-19: 각 단계는 1턴부터 따로 계획을 세워서, 앞 단계는 1턴 AF·뒤 단계는 1턴을 아껴 2턴 AF면
       이어 붙인 기록에 AF가 두 번 들어가 실전 딜이 거의 2배가 됐음 — 셴화(AS) 내성↔약점 교환 팀 다아트 12698 → 23017억). 다르면 앞 기록의 행동(AF·평상)을 그대로 두고 그 단계 값 비율만 곱함 */
    const okAt = new Map(), okOf = k => { if(okAt.has(k)) return okAt.get(k); const t0 = swT[k], a = recA[t0-1], b = ph[k].turns[t0-1]; const v = !!(a && b && Math.abs((+a.g||0) - (+b.g||0)) < 1 && Math.abs((+a.s||0) - (+b.s||0)) < 1); okAt.set(k, v); return v; };
    const rat = (p, r) => r.af ? (+ev.af>0 ? (+p.af||0)/ev.af : 1) : (+((ev.normal && ev.normal.total)||0)>0 ? (+p.nT||0)/ev.normal.total : 1);
    let keep = 0; const sc = {}; for(let t=1;t<=recA.length;t++){ let k = -1; swT.forEach((s,j)=>{ if(t>=s) k = j; }); if(k<0){ keep += Math.max(0,+recA[t-1].d||0); continue; }
      if(okOf(k)){ const r2 = ph[k].turns[t-1]; if(r2){ turns[t-1] = ({...r2, ...{bz: ph[k].zone || true}}); parts[k] = (parts[k]||0) + Math.max(0,+r2.d||0); } }
      else { const r = recA[t-1], x = Math.max(0, rat(ph[k], r)); turns[t-1] = ({...r, ...{d: (+r.d||0)*x, nd: (+r.nd||0)*x, afD: r.afD!=null ? r.afD*x : r.afD, sbD: r.sbD!=null ? r.sbD*x : r.sbD, bz: ph[k].zone || true, zlx: +x.toFixed(3)}}); sc[t] = x; } }
    const dAll = t => Math.max(0, +recA[t-1].d||0);
    let tot = tA*keep/dA; const per = (ev.bsim.per||[]).map(v=>(v||0)*keep/dA);
    Object.keys(sc).forEach(t=>{ const f = dAll(+t)/dA, x = sc[t]; tot += tA*f*x; (ev.bsim.per||[]).forEach((v,i)=>{ per[i] = (per[i]||0) + (v||0)*f*x; }); });
    ph.forEach((p,k)=>{ if(!parts[k]) return; const dB = p.turns.reduce((a,r)=>a+Math.max(0,+r.d||0),0) || 1, fB = parts[k]/dB; tot += p.btot*fB; (p.per||[]).forEach((v,i)=>{ per[i] = (per[i]||0) + (v||0)*fB; }); });
    ev.bsim = ({...ev.bsim, ...{turns, total: tot, per, zl: true}});
    if(ev.score){ const cap = +ev.score.cap||Infinity, cnt = L0 => L0.reduce((a,r)=>{ const d = Math.max(0, +r.d||0); if(!r.af) return a + d; const inAF = (+r.afD||0) + (r.sb==='af' ? Math.max(0, (+r.sbD||0) - (+r.teSB||0)) : 0); return a + d - inAF + Math.min(inAF, cap); }, 0);
      const c0 = cnt(recA); ev.burst = c0>0 ? ev.score.total*cnt(turns)/c0 : ev.score.total; } /* 서가 챌린지 점수: AF 상한을 넣어 센 피해 비율로(2026-10-19 점검 — 실제 피해 비율이면 AF 턴 몫이 과대) */
    else ev.burst = tot; }
  // 지속 딜: 단계별 구간 비율(턴 기준은 긴 전투 HL턴, HP 기준은 HP 비율)
  const sA = +ev.sustain||0, st = []; let prev = 0; ph.forEach(p=>{ const p0 = Math.min(1, Math.max(prev, p.pos)); st.push(p0); prev = p0; });
  let sus = sA*(st[0]||0); ph.forEach((p,k)=>{ sus += p.sustain*Math.max(0, (k+1<ph.length ? st[k+1] : 1) - st[k]); });
  ev.zLateSus0 = sA; ev.sustain = sus; ev.zLate = ph.map((p,k)=>({...p, ...{turns: undefined, per: undefined, swT: swT[k]===Infinity ? null : swT[k], share: +((k+1<ph.length ? st[k+1] : 1) - st[k]).toFixed(3)}}));
  return ev;
}
function evalTeamV(team, progs, enemy, S, cap, ctx){
  if(ctx && ctx._azPick!==undefined) return evalTeam0(team, progs, enemy, S, cap, ctx);
  if(ctx && ctx.variant){ // 계산(워커)이 이미 고른 변형으로 한 번만(화면 재계산, 2026-10-17 렉 줄이기): {sbOff:[bool], uni:[bool|null], azBy}
    const vr = ctx.variant, c2 = ({...ctx, ...{variant:null}}), by = autoZoneBy(team, progs) || [null];
    const pr = progs.map((p,i)=>{ const d = vr.sbOff && vr.sbOff[i], u = vr.uni && vr.uni[i]===false, so = vr.songOff && vr.songOff[i]; return d || u || so ? ({...p, ...d ? {sbOK:false, sbAw:true, sbOff:true} : null, ...u ? {uniOff:true} : null, ...so ? {songOff:true} : null}) : p; });
    const ev = evalTeam0(team, pr, enemy, S, cap, ({...c2, ...{_azPick: by.includes(vr.azBy) ? vr.azBy : by[0], _redOff: !!vr.redOff, _afBuff: +vr.afBuff||0}})); ev.redOff = !!vr.redOff; ev.afBuf = +vr.afBuff||0;
    ev.sbOff = team.map((c,i)=>!!(vr.sbOff && vr.sbOff[i])); ev.uni = vr.uni || null; ev.songOff = vr.songOff || null; ev.azBy = by.includes(vr.azBy) ? vr.azBy : by[0]; if(by.length>1){ ev.azAlt = by.length; ev.azBys = by.slice(); }
    return ev; }
  const by = autoZoneBy(team, progs) || [null], cand = S && S.sbDrop===false ? [] : sbDropCands(team, progs), uc = uniCands(team, progs);
  // 가창을 안 쓰는 운용(2026-10-18): 가창 중엔 행동 불가라, 가창 버프보다 본인 공격·다른 버프가 나으면 가창을 빼고 계산(주력이 가창 턴 종료 공격인 캐릭터는 제외)
  const sgc = team.map((c,i)=>i).filter(i=>team[i].song && !team[i].song.main && team[i].bact && team[i].bact.steps.some(st=>st.song));
  // 가창 효과는 하나뿐(나중 가창이 덮어쓰고 앞 가창자는 계속 잠김 — 나무위키) → 가창하는 사람이 둘 이상인 변형은 뺌. 변형: 전원 가창·한 명만·전원 안 함
  const sings = (i, pr) => { const c = team[i]; return !!(c.song && !(pr[i] && pr[i].songOff) && (c.song.main || (songOn(c, team, pr[i]) && c.bact && c.bact.steps.some(st=>st.song)))); };
  const sgF = ctx && ctx.stFast ? (()=>{ const ns = sgc.filter(i=>!(team[i].roles||[]).includes('dps')).sort((a,b)=>team[a].id<team[b].id?-1:1), keep = team.some(c=>c.song && c.song.main) ? -1 : (ns[0]!=null ? ns[0] : -1); return sgc.filter(i=>i!==keep); })() : null; // 탐색 어림: 딜러 아닌 가창 캐릭터 한 명만 가창(id 순), 나머지는 가창 안 함 — 한 가지만
  const sv = !sgc.length ? [[]] : sgF ? [sgF] : [[], sgc].concat(sgc.length>1 ? sgc.map(i=>sgc.filter(j=>j!==i)) : []);
  /* 겹치는 버프 빼기(stepValues red)는 평상 턴 일정·존 고르기까지 바꿔서 어림으로는 손해일 때가 있음 → 정밀 계산은 뺀 쪽·안 뺀 쪽 둘 다 보고 성향 기준이 큰 쪽(ev.redOff = 안 뺌) */
  const redPick0 = (ev, pr, c1) => { if(!ev || !ev.redDrop || (ctx && ctx.stFast)) { if(ev) ev.redOff = false; return ev; } const e2 = evalTeam0(team, pr, enemy, S, cap, ({...c1, ...{_redOff:true}})), vk = evalKey(ctx);
    if(vk(e2) > vk(ev)*(1+1e-9)){ e2.redOff = true; e2.redSkip = ev.redDrop; return e2; } ev.redOff = false; return ev; };
  /* AF 안에서 버프 걸기(2026-10-20, 사용자 '버프도 AF 시전하면서 다 걸어야'): 버프 스킬을 평상 턴 대신 AF 첫 행동들로 거는 운용(평상 턴은 그만큼 공격, AF는 행동이 줄고 버프는 다음 AF까지 남는 만큼 평상 턴에도)도 계산해 성향 기준이 큰 쪽.
     AF 주기는 기본 운용 값으로 어림(ev.afTurns). 최고점(허수아비)·탐색 어림·AF 못 쓰는 상대는 안 함 */
  const bufPick = (ev, pr, c1) => { if(ev) ev.afBuf = 0; if(!ev || !(ev.afPlN>0) || ev.afOff || (ctx && ctx.stFast) || (ctx && (ctx.mode||ctx.keyMode)==='burst') || S.afBuffVar===false) return ev;
    if(!(ev.afCastN >= (S.afBuffMin!=null ? +S.afBuffMin : 0.15))) return ev; // 평상 턴에 버프를 거의 안 거는 조합은 차이가 없어 계산 생략
    const cl = x => Math.max(1.5, Math.min(8, +x||3)), e1 = C => evalTeam0(team, pr, enemy, S, cap, ({...c1, ...{_redOff: !!ev.redOff, _afBuff: C}})), vk = evalKey(ctx);
    let C = cl(ev.afTurns), e2 = e1(C); const k0 = vk(ev), k1 = vk(e2); if(!(k1 > k0*(S.afBuffCut!=null ? +S.afBuffCut : 0.97))) return ev; // 첫 계산이 기본 운용보다 3% 넘게 낮으면 더 안 봄(계산량 — 무작위 120조합 결과 같음, 정밀 평가 약 −20%)
    if(Math.abs(cl(e2.afTurns) - C) > 0.4){ const C2 = cl(e2.afTurns), e3 = e1(C2); if(vk(e3) >= k1){ C = C2; e2 = e3; } } // 주기를 맞춘 쪽이 낫을 때만(2026-10-20 점검) // AF 주기가 바뀌면(평상 턴 공격이 늘어 게이지가 빨리 참) 한 번 더 맞춤
    let cv = C; if(e2.afMinD < C - 1e-9){ const e3 = e1(-C); if(vk(e3) > vk(e2)*(1+1e-9)){ e2 = e3; cv = -C; } } // 다음 AF 전에 버프가 끊기면: 끊긴 턴에 평상 턴에서 다시 거는 쪽도(afRe — 값은 −C)
    if(vk(e2) > vk(ev)*(1+1e-9)){ e2.redOff = !!ev.redOff; if(ev.redSkip) e2.redSkip = ev.redSkip; e2.afBuf = cv; return e2; } return ev; };
  const redPick = (ev, pr, c1) => bufPick(redPick0(ev, pr, c1), pr, c1);
  if(by.length<2 && !cand.length && !uc.length && sv.length===1 && !sv[0].length){ const c1 = ({...ctx||{}, ...{_azPick:null}}); return redPick(evalTeam0(team, progs, enemy, S, cap, c1), progs, c1); }
  const drops = [[]];
  if(cand.length){ const sup = cand.filter(i=>!(team[i].roles||[]).includes('dps'));
    if(ctx && ctx.stFast){ if(sup.length) drops.push(sup); } // 탐색 1단계(계산량): 딜러가 아닌 캐릭터만 빼 보는 한 가지
    else { for(const i of cand) drops.push([i]); if(cand.length>1) drops.push(cand); if(sup.length>1 && sup.length<cand.length) drops.push(sup); } }
  const val = evalKey(ctx); let best = null, bv = -Infinity;
  const uv = uc.length ? [[], uc] : [[]]; // 유니즌 끄기(혼자 歌唱)
  for(const b of by) for(const d of drops) for(const u of uv) for(const g of sv){
    const pr = d.length || u.length || g.length ? progs.map((p,i)=>d.includes(i) || u.includes(i) || g.includes(i) ? ({...p, ...d.includes(i) ? {sbOK:false, sbAw:true, sbOff:true} : null, ...u.includes(i) ? {uniOff:true} : null, ...g.includes(i) ? {songOff:true} : null}) : p) : progs;
    if(sgc.length + team.filter(c=>c.song && c.song.main).length > 1 && team.reduce((k,c,i)=>k + (sings(i, pr) ? 1 : 0), 0) > 1 && !(team.filter(c=>c.song && c.song.main).length > 1)) continue; // 가창 둘 이상 동시 X
    const c1 = ({...ctx||{}, ...{_azPick:b}}), ev = redPick(evalTeam0(team, pr, enemy, S, cap, c1), pr, c1); // 변형마다 겹치는 버프 빼기·안 빼기 둘 다
    const v = val(ev); if(v > bv*(1+1e-9)){ bv = v; best = ev; best.sbOff = team.map((c,i)=>d.includes(i)); best.uni = uc.length ? team.map((c,i)=>uc.includes(i) ? !u.includes(i) : null) : null; best.songOff = sgc.length ? team.map((c,i)=>g.includes(i)) : null; best.azBy = b; }
  }
  if(!best){ best = evalTeam0(team, progs.map((p,i)=> sgc.includes(i) ? ({...p, ...{songOff:true}}) : p), enemy, S, cap, ({...ctx||{}, ...{_azPick:by[0]}})); best.sbOff = team.map(()=>false); best.uni = null; best.songOff = team.map((c,i)=>sgc.includes(i)); best.azBy = by[0]; }
  // 개전 자동 존이 같은 등급으로 여럿이면 게임은 왼쪽(전열 배치 순)부터 전개(사용자 확인 2026-10-17) → 고른 전개자(azBy)를 다른 전개자(azBys)보다 왼쪽에 두는 배치로(explainTeam)
  if(by.length>1){ best.azAlt = by.length; best.azBys = by.slice(); } return best;
}
const NOAW_C = new WeakMap();
function evalTeam0(team, progs, enemy, S, cap, ctx){
  if(team.some((c,i)=>c && c.bact && c.bact.noAw && !(progs[i] && (progs[i].sbOK || progs[i].sbAw)))) team = team.map((c,i)=>{ if(!(c && c.bact && c.bact.noAw) || (progs[i] && (progs[i].sbOK || progs[i].sbAw))) return c; let v = NOAW_C.get(c); if(!v){ v = ({...c, ...{bact: c.bact.noAw}}); NOAW_C.set(c, v); } return v; }); // 성도각성 전: aw 행동은 버프 행동
  if(ctx && ctx.maxBack===0 && !progs.noBack){ progs = progs.slice(); progs.noBack = true; } // 후열 없음: VC(교대) 효과·VC 존 없음
  const A = teamAgg(team); A.azPick = ctx && ctx._azPick || null; A.noBack = !!progs.noBack;
  A.inf = inflictOf(team, progs, S);
  A.echg = echgOf(team, progs);
  A.bud = ctx && ctx.buddy ? budAgg(ctx.buddy, team, enemy, A) : null;
  if(A.bud){ for(const t of A.bud.brk||[]){ A.breaks.push(t); (A.breakJ || (A.breakJ = [])).push(-2); } // 버디 브레이크: 건 사람 -2(버디는 아군 뒤·AF 중엔 행동 안 함)
    if(A.bud.inf && (A.bud.inf.poison>0 || A.bud.inf.pain>0)){ A.infNoBud = A.inf; A.inf = budInf(A.inf, A.bud.inf); } else A.bud.inf = null; } // 버디 장비 독·페인: 평상 턴·2턴째 이후 AF만(허수아비·1턴째 AF는 infNoBud)
  A.painAny = A.inf.poison>0 || A.inf.pain>0;
  A.mule = muleShare(team, S, ctx, progs);
  { const nb = ctx && ctx.maxBack!=null ? ctx.maxBack : 2, lt = team.filter(c=>c.align==='light').length, sh = team.length-lt;
    A.aura = S.auraGl===false || S.glLocked ? null : {nb, nMaj: Math.max(lt, sh) + nb, nMin: Math.min(lt, sh), maj: lt>=sh ? 'light' : 'shadow', inv: ctx && ctx.pgl || null}; } // 후열은 많은 쪽 성향으로 가정
  const light = team.filter(c=>c.align==='light').length, shadow = team.length-light;
  const flux = light>shadow?'light':shadow>light?'shadow':'both';
  const hasSB = team.some((c,i)=>c.stellar && progs[i].sbOK);
  const cx = ({...ctx, ...{flux}});
  // 셔틀 P글래 배분 가중치(2026-10-16): 고정 위력 추정(pow) 대신 이 조합에서 각자 AF 1회 공격 대미지 비중 — 버프가 SB 배율로 커 보이는 서포터에게 셔틀 칸이 몰리던 문제
  if(A.mule && A.mule.plan) A.mule.wd = muleDmgW(team, progs, A, enemy, S, cx, cap);
  const anyR = team.some(c=>c.rules), ez = !!(A.echg && A.echg.some(e=>e.el==='zone'||e.zone)), mz = ez || team.some(c=>c.mzone), zdep = mz || (anyR && team.some(c=>c.rules&&c.rules.zdep)), sdep = anyR && team.some(c=>c.rules&&c.rules.sdep);
  if(A.echg && A.echg.some(e=>e.el==='ally')) A.allyOf = allyOfPos(team, team.some(c=>c.rules&&c.rules.hasPos) ? computePos(team) : null); // 받는 사람 순위 계산 전엔 pow 순 위치(아래에서 다시)
  const posW = () => { const zs = zoneCandidates(team, progs, 'af'); let z = null; for(const q of zs) if(q && q.level>0 && (!z || zBetter(q, z))) z = q; // 같은 등급이면 존 이름순(넣은 순서 무관)
    return team.map((c,i)=>{ const co = attackerCore(team, i, progs, A, enemy, S, 'af', cx, null, z); return co ? applyZoneCap(co, z, S, cap, 1) : 0; }); }; // 위치 버프 받는 사람: 이 조합에서 센 순서
  const posSets = anyR && team.some(c=>c.rules&&c.rules.hasPos) ? computePos(team, posW()) : null;
  if(A.allyOf) A.allyOf = allyOfPos(team, posSets);
  // 같은 상황에서 규칙 발동 상태가 같으면 계산을 재사용 (존 후보가 버프 조건을 바꾸지 않는 경우가 대부분)
  const memo = new Map();
  const stepV = ctx && ctx.stFast ? null : stepValues(team, progs, A, enemy, S, cx, cap, posSets, !!(ctx && ctx._redOff)); // 탐색 1단계는 점수 순서(계산량)
  A.stepV = stepV;
  const afBufC = ctx && ctx._afBuff ? Math.abs(+ctx._afBuff)||0 : 0; // AF 안에서 버프 걸기 변형(AF 주기 어림, evalTeamV가 정함)
  const sim = S.simOn!==false ? simTeam(team, progs, S, stepV, afBufC ? {afBuff: afBufC, afRe: ctx._afBuff < 0} : null) : null; let simUse = !!(sim && sim.any);
  let uptLow = simUse && (sim.upt.some(u=>u<1) || sim.kupAny);
  /* 가창(2026-10-18 사용자 확인): 평상 턴에 가창을 유지하는 캐릭터는 AF에서 행동 못 함 — 1턴째 AF(전투 시작부터 AF)는 가창을 거는 행동 1번 뒤 막힘, 2턴째부터는 처음부터 막힘.
     허수아비(1턴 AF)는 행동 계획에 가창이 들어 있으면 그 행동 뒤 막힘. 주력이 가창 턴 종료 공격인 캐릭터(미스트레아(AS) 등)도 AF 행동은 없음 */
  const singI = team.map((c,i)=> !!(c.song && !(progs[i] && progs[i].songOff) && (c.song.main || (songOn(c, team, progs[i]) && (!sim || (sim.songUp[i]||0) >= 0.5)))));
  const anySing = singI.some(Boolean), lkAt = rt => anySing ? team.map((c,i)=> singI[i] ? (rt>=2 || A.lateAF || c.song.main ? 0 : 1) : null) : null;
  const lkPlan = stepsArr => anySing ? team.map((c,j)=>{ if(!singI[j]) return null; if(c.song.main) return 0; const p = (stepsArr[j]||[]).findIndex(st=>st && st.song); return p>=0 ? p+1 : null; }) : null;
  A.singI = anySing ? singI : null;
  let uptArr = null;
  A.eqOff = sim && sim.eqOff.some(Boolean) ? sim.eqOff : null;
  const eqArr = sim ? sim.eqOff.map(o=>o ? {mf:o} : 1) : null, eqAny = !!(eqArr && eqArr.some(x=>x!==1)); // AF·SB에서 장착 못 한 버프 끄기
  const simDerive = () => { // 평상 턴 시뮬에서 나오는 값들(AF 턴 지속 감소로 시뮬을 다시 돌리면 다시)
    uptArr = simUse ? sim.upt.map((u,j)=> sim.kup[j] ? {mf: sim.kup[j]} : u) : null;
    A.stkMR = simUse ? sim.act.map(x=>Math.max(0.5, Math.min(1, +x||0))) : null; // 누적 예열: 주력으로 쌓는 누적은 주력을 쓰는 턴 비율만큼(누적을 쌓는 캐릭터는 주력을 우선 쓴다고 보고 0.5 이상)
    A.ctrU = team.some(c=>c.counter && c.counter.skill) ? team.map((c,j)=>{ const k = sim && sim.kup && sim.kup[j]; return k && k.ctr!=null ? k.ctr : 1; }) : null; // 요격 스킬 유지율(평상 턴)
    A.teU = team.some(c=>c.turnEnd && c.turnEnd.some(e=>e.act)) ? team.map((c,j)=>{ const k = sim && sim.kup && sim.kup[j]; if(!k) return null; const o = {}; for(const x in k) if(x.indexOf('te')===0 && /^te\d+$/.test(x)) o[x] = k[x]; return o; }) : null; // 턴 종료 공격을 거는 스킬 유지율
    if(A.echg) A.ecU = team.map((c,j)=>{ const k = sim && sim.kup && sim.kup[j]; return k && k.echg!=null ? k.echg : 1; }); }; // 속성 변환 유지율(ecGate) // 버프 행동이 있으면 항목별 유지율
  simDerive();
  const coresFor = (sit, z, useSim)=>{
    const upt = useSim && uptLow ? uptArr : sit!=='normal' && eqAny ? eqArr : null;
    if(!zdep){ const FX = (anyR||upt) ? buildBF(team,progs,sit,z,A,posSets,upt) : null; const cs = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,sit,cx,FX,z)); cs.FX = FX; cs.upt = upt; return cs; }
    let key = (sit==='sb'?7:sit==='af'?13:3) + (upt?100:0) + (A.realT||0)*1000 + (A.lateAF?500:0) + (sit==='normal' && A.stkT>0 ? Math.round(A.stkT*4)*10000 : 0); // 누적 예열 턴도 키에
    { // 아군 전체 글래(격진의 힘 <존>)·셔틀 P글래(각성의 힘)는 존에 따라 달라 존도 키에(2026-10-16: 존마다 같은 키라 다른 존의 계산을 재사용해 편성 순서에 따라 결과가 달라지던 문제)
      const zk = z && z.level>0 ? String(z.key||z.kind||'') : '', pl = !!(A.mule && A.mule.plan), invA = !!(A.aura && A.aura.inv && A.aura.inv._a && Object.values(A.aura.inv._a).some(v=>+v>0));
      const zid = pl ? zk+':'+(z?z.level:0) : (A.aura && zk && AURA_Z.has(zk) ? (invA ? zk : 'Z') : ''); // 아군 전체 글래 보유 표시가 없으면 격진의 힘은 '그 존에 있나'만 갈림
      let h = z && z.level>=2 ? 7 : 3; for(let q=0;q<zid.length;q++) h = (h*31 + zid.charCodeAt(q)) % 1000003; key = (key*1000003 + h) % 2147483629; }
    if(A.stOn) key = (key*7 + 5) % 2147483629; // 상태를 켠 계산(sb_full 턴) // 존 각성(극·절) 여부도: 각성의 힘 글래스터(×1.25)
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
  const wNof = () => simUse ? team.map((c,i)=>sim.act[i] + sim.alt[i]*(sim.altW ? sim.altW[i] : Math.max(ALT_R, c.naR)) + sim.na[i]*c.naR) : null; let wN = wNof();
  const sumZ = (cores,z,combo,w)=>{ let v=0; const per=cores.map((co,i)=>{ const d=applyZoneCap(co,z,S,cap,combo)*fw(co)*(w?w[i]:1); v+=d; return d; }); return {v,per}; };
  const res = {};
  A.tm = {S0:2, H:Math.max(1, Math.round(S.simTurns||6))};
  const runSit = (sit, zOnly) => { // zOnly: 이 존만(실전 3턴째 SB — 1턴째에 고른 존으로, 계산량)
    const s2 = (sit==='sb'&&!hasSB)?'normal':sit;
    const useSim = sit==='normal' && simUse, w = sit==='normal' ? wN : null;
    let zs = zOnly ? [zOnly] : zoneForce(zoneCandidates(team, progs, sit), A.azPick);
    /* 보스가 까는 존(S.bossZone {key, lv, every}, 2026-10-18 보스 기믹 조사: 진·현현 유인 매 턴 굉타진, 결실 가리유 매 턴 극·열화진, 개시 월광진·쌍격진 등):
       깔린 존은 더 높은 등급만 덮어씀 → 아군 존은 보스 존보다 등급이 높을 때만 후보, 매 턴 다시 까는 보스(every)는 평상 턴엔 보스 존 고정 */
    if(S.bossZone && !zOnly){ const bq = S.bossZone, zo = zoneOpt(bq.key); if(zo){ const lv = Math.max(1, Math.min(2, +bq.lv||1)), bzz = ({...zo, ...{level:lv, by:null, how:'보스 전개', label:(lv>=2?'극·':'')+(ZONE_KR[bq.key]||bq.key), unmet:[], brk:false}});
      zs = bq.every && sit==='normal' ? [bzz] : zs.filter(z=>z && z.level>lv).concat([bzz]); } }
    if(S.zoneBanAll && !zOnly){ zs = [{kind:'none', types:[], level:0, by:null, label:'존 없음'}]; } // 보스 서약 등: 아군 ZONE 전개 금지
    else if(sit==='normal' && !zOnly && Array.isArray(S.zoneBan) && S.zoneBan.length){ const ban = z => z && z.level>0 && ((z.kind==='elem' && S.zoneBan.includes('elem')) || (z.kind!=='elem' && S.zoneBan.includes('nonelem')));
      const z2 = zs.filter(z=>!ban(z)); zs = z2.length ? z2 : [{kind:'none', types:[], level:0, by:null, label:'존 없음'}]; } // 보스 흉성 등: 턴 종료에 존 파괴 → 평상 턴엔 그 종류 존 없음
    const shared = zdep ? null : coresFor(s2, null, useSim);
    // 요격·체인: 존마다 속성이 바뀔 수 있어(変幻自在 등) 존을 고를 때 같이 센다. 체인은 요격으로도 발동(요격 횟수를 공격으로 셈)
    const extra = (z, cores) => { let ctr = null, ch = null, te = null;
      // 요격·체인·턴 종료·1회 공격은 주력과 같은 버프 상태(평상 턴 유지율)로 — 존마다 한 번만 만듦
      const uo = useSim && uptLow ? uptArr : null; let FXn; const fxN = () => FXn!==undefined ? FXn : (FXn = (s2==='normal' && cores && cores.FX!==undefined && cores.upt===uo && zdep) ? cores.FX : (anyR||uo) ? buildBF(team,progs,'normal',z,A,posSets,uo) : null);
      if(hasCtr && sit==='normal') ctr = counterCalc(team, progs, A, enemy, S, cx, fxN(), z, cap, fw);
      if(hasChain){ const FXc = s2==='normal' ? fxN() : (anyR||eqAny ? buildBF(team,progs,s2,z,A,posSets,eqAny?eqArr:null) : null); ch = chainCalc(team, progs, A, enemy, S, s2, cx, FXc, z, cores, useSim?sim:null, cap, null, fw, ctr); }
      if(ch && ch.stk && sit==='normal' && !ch.rv){ const rv = rvAllyBoost(team, cores, z, S, cap, fw, w, ch); if(rv){ ch.per = ch.per.map((v,i)=>v + rv.per[i]); ch.total += rv.total; ch.rv = rv; } } // 아군 공격이 받는 레브마(체인 몫으로)
      const ctr0 = ctr ? {per: ctr.per.slice(), total: ctr.total} : null; // AF 턴 뒤 요격은 평상 턴 체인이 쌓은 스택 없이(2026-10-17 점검: 평상 턴 스택을 그대로 써 크게 잡힘)
      if(ctr && ch) counterStk(ctr, ch);
      let afPost = null; // AF를 쓴 턴: AF가 끝난 뒤 적이 공격 → 요격, 그 요격으로만 체인(아군 평상 행동·AF 공격으로는 체인 없음)
      if(ctr && ctr.total>0 && sit==='normal'){ const chC = hasChain ? chainCalc(team, progs, A, enemy, S, 'normal', cx, fxN(), z, cores, useSim?sim:null, cap, null, fw, ctr, true) : null;
        afPost = {per: ctr0.per.map((v,i)=>v + (chC ? chC.per[i] : 0)), total: ctr0.total + (chC ? chC.total : 0), ctr: ctr0.total, ch: chC ? chC.total : 0}; }
      if(hasTE && sit==='normal') te = turnEndCalc(team, progs, A, enemy, S, cx, fxN(), z, cap, fw);
      if(z && z._once && hasOnce && sit==='normal'){ const on1 = onceCalc(team, progs, A, enemy, S, cx, fxN(), z, cap, fw, cores); if(on1) te = te ? {per: te.per.map((v,i)=>v+on1.per[i]), total: te.total+on1.total, afg: te.afg||0} : {...on1, afg: 0}; }
      return {ctr, ch, te, afPost, v:(ctr?ctr.total:0)+(ch?ch.total:0)+(te?te.total:0)}; };
    const withX = (hasCtr && sit==='normal') || hasChain || (hasTE && sit==='normal');
    let best=null, bestV=-1, bestPer=null, bestCores=shared, bestX=null; const cands = [];
    for(const z of zSort(zs)){ // 같은 값이면 존 등급·이름·까는 사람 id 순(2026-10-16: 같은 極・風王陣을 멜피피아(AS)·네코코(ES)가 둘 다 펴면 넣은 순서로 갈리던 문제)
      const cores = zdep ? coresFor(s2, z, useSim) : shared;
      const r = sumZ(cores, z, null, w), x = withX ? extra(z, cores) : null, v = r.v + (x ? x.v : 0);
      if(sit==='normal' && !zOnly) cands.push({z, v, cores});
      if(v>bestV){ bestV=v; best=z; bestPer=r.per; bestCores=cores; bestX=x; }
    }
    if(hasOnce && sit==='normal' && best){ // 1회 공격: 고른 존에서 한 번
      const x2 = extra(({...best, ...{_once:true}}), bestCores); bestV += (x2.v - (bestX ? bestX.v : 0)); bestX = x2; }
    res[sit] = {total:bestV, zone:best, per:bestPer, cores:bestCores, zones:zs, sit:s2};
    if(bestX && bestX.ctr){ const ct=bestX.ctr; res[sit].counter=ct; res[sit].per=res[sit].per.map((v,i)=>v+ct.per[i]); }
    if(bestX && bestX.ch){ const ch=bestX.ch; res[sit].chain=ch; res[sit].per=res[sit].per.map((v,i)=>v+ch.per[i]); }
    if(bestX && bestX.te){ const te=bestX.te; res[sit].turnEnd=te; res[sit].per=res[sit].per.map((v,i)=>v+te.per[i]); }
    res[sit].afPost = bestX && bestX.afPost || null;
    res[sit]._cands = cands.length>1 ? cands : null;
  };
  runSit('normal');
  let zA = res.normal.zone; // AF 계산 도우미가 쓰는 존(존 고르기 동안 후보마다 바꿈)
  // AF 공격 스킬 고르기(2026-10-16): 주력·비SB 성도 스킬 중 1회 대미지만 보지 않고 AF 전체로 — 연속 실행 스킬은 AF 게이지를 더 채워 AF가 길어짐
  // (후열 유무로 1타가 조금 바뀌자 빅트가 주력↔성도 스킬로 갈리며 AF가 2배 차이 나던 문제)
  /* 횟수 제한 주력(main.uses + alt, 2026-10-16): 실전 AF도 행동마다 같은 주력이 아니라 uses번 뒤엔 alt — 세스타 二刀神狼은 턴 시작에 쌓인 神狼 1개로 AF 중 한 번(허수아비 dummySim과 같게).
     상태(state)로 주력을 바꾸는 캐릭터(세스타(AS) 狼志)는 그쪽이 맡음 */
  const afAltOf = cs => { if(cs.alt!==undefined) return cs.alt; let any = false;
    const L = cs.map((co,i)=>{ const c = team[i]; if(!co || !c.mainAlt || !(+c.main.uses>0) || c.afSk || co.viaSbN || co.skill!==c.main.skill) return null;
      const tAlt = team.map((m,k)=> k===i ? ({...m, ...{main:m.mainAlt, alts:null, _alt:true, _proxy:true}}) : m), ca = attackerCore(tAlt, i, progs, A, enemy, S, 'af', cx, cs.FX, zA); if(ca) any = true; return ca; });
    return (cs.alt = any ? L : null); };
  const afSplit = (cs, n) => { const al = afAltOf(cs); if(!al) return null; const nM = n.slice(), nA = n.map(()=>0);
    al.forEach((ca,i)=>{ if(!ca) return; const u = +team[i].main.uses; nM[i] = Math.min(n[i], u); nA[i] = Math.max(0, n[i]-u); }); return {al, nM, nA}; };
  const cmb = (co, k) => co && k>0 ? comboInc(co, S, true) + (k-1)*comboInc(co, S, false) : 0; // k번 쓰면 첫 번째만 '처음 쓰는 스킬'
  /* 感電(ルナティック<放電>, state shock = 타당 콤보, 2026-10-19 game-info 状態効果まとめ 4-4·AF 3-3): 건 사람이 공격한 뒤 그 적을 맞히는 모든 타격 +4%/타 — AF 상태 가동률만큼 */
  const shockAF = () => { let v = 0; team.forEach((c,i)=>{ for(const q of (c.states||[]).slice(0,3)) if(q && +q.shock>0) v = Math.max(v, +q.shock*stUp(q, 'af', A, c, i, team, zA)); }); return v; };
  const afG = (cs, n) => { const sp = afSplit(cs, n), sh = shockAF(); let g=0; cs.forEach((co,i)=>{ if(!co) return; g += sp ? cmb(co, sp.nM[i]) + cmb(sp.al[i]||co, sp.nA[i]) : cmb(co, n[i]); if(sh>0) g += sh*(n[i]||0)*Math.max(1, +co.totHits||1)*(co.tgt==='aoe' ? Math.max(1, +S.enemyCount||1) : 1); }); return g; };
  const afSum = (cs, z, avg, n) => { const sp = afSplit(cs, n); if(!sp) return sumZ(cs, z, avg, n); const x = sumZ(cs, z, avg, sp.nM), y = sumZ(sp.al.map((ca,i)=>ca||cs[i]), z, avg, sp.nA); return {v: x.v+y.v, per: x.per.map((d,i)=>d+y.per[i])}; };
  // AF 콤보 배율 조건 통상 공격(once.json combo, 2026-10-17): AF 끝 콤보가 그 배율에 닿으면 그 AF에 한 번, 주력 한 번 대신(콤보는 문턱과 끝의 중간으로)
  const afCmbX = (cs, z, n, fin) => { if(!team.some(c=>c.once && c.once.some(e=>+e.combo>0))) return null; let v = 0; const per = team.map(()=>0);
    team.forEach((c,i)=>{ const co = cs[i]; if(!co || !c.once || !(n[i]>0)) return;
      for(const e of c.once){ const thr = +e.combo; if(!(thr>0) || fin + 1e-9 < thr) continue;
        const t2 = team.map((q,k)=> k===i ? ({...q, ...{main:onceSkOf(e, q), afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}}) : q);
        const c2 = attackerCore(t2, i, progs, A, enemy, S, 'af', cx, cs.FX, z); if(!c2) continue;
        const cN = (thr + fin)/2, g = applyZoneCap(c2, z, S, cap, cN)*fw(c2) - applyZoneCap(co, z, S, cap, cN)*fw(co);
        if(g>0){ v += g; per[i] += g; } break; } });
    return v>0 ? {v, per} : null; };
  const addCx = (zz, cs, z, n, fin) => { const x = afCmbX(cs, z, n, fin); return x ? {v: zz.v + x.v, per: zz.per.map((d,i)=>d + x.per[i])} : zz; };
  /* AF 안에서 거는 버프(2026-10-20, 사용자 '버프도 AF 시전하면서 다 걸어야'): afMd 'cast' = 장착한 버프 스킬을 AF 첫 행동들로 걸고(게이지 0, 위키) 남은 행동으로 공격,
     'mix' = 다음 AF까지 남는 버프는 다시 안 걸어서 cast·none을 그 비율(afBW)로 섞음, 'none' = 평상 턴에 걸어 둔 상태(예전). 1턴째 AF는 버프가 아직 없어 늘 cast,
     AF 안 버프 운용 변형(ctx._afBuff)이면 3턴째 이후 AF도 mix. af_timing이 그 AF에서 0으로 둔 항목뿐인 스킬(AF에선 쓸 이유가 없는 스킬)은 안 검 */
  const afPlC = sim && sim.afSt && sim.afSt.some(L=>L && L.length) ? sim.afSt : null; let afMd = afBufC && afPlC ? 'mix' : 'none', afBW = 1;
  const afZero = (c, x, rt) => { const at = c.afT; if(!at) return false; const self = x.indexOf('s.')===0, deb = x.indexOf('d_')===0, k = self ? x.slice(2) : deb ? x.slice(2) : x;
    /* 아군이 받는 파티 버프는 party 표만(F와 같게), 자기 몫은 party+self 합친 표(afAdj와 같게), 디버프는 deb 표(2026-10-20 점검: 파티 항목도 합친 표로 봐서 self 값이 덮어쓰던 것) */
    if(!self){ const q = deb ? 'deb' : 'party', tb = at[q], tr = rt && at.real ? at.real[q] : null, v = tr && tr[k]!==undefined ? tr[k] : tb ? tb[k] : undefined; return v===0; }
    const m = afTMerge(at), v = rt && m.rt && m.rt[k]!==undefined ? m.rt[k] : m.t[k]; return v===0; };
  const afPlFor = () => { if(!afPlC) return null; const rt = (A.realT||0)>=2, P = team.map((c,i)=>(afPlC[i]||[]).filter(e=>![...e.g].every(x=>afZero(c, x, rt))).map(()=>'buff')); return P.some(L=>L.length) ? P : null; };
  const afEval1 = (cs, pl) => { const lk = lkAt(A.realT||0), p2 = pl ? team.map((c,i)=> lk && lk[i]!=null ? Array(lk[i]).fill('buff') : pl[i]) : undefined;
    const a0 = afActionsOf(team, progs, cs, zA, enemy, S, undefined, undefined, p2, lk), n = p2 ? a0.n.map((v,i)=>Math.max(0, v - p2[i].length)) : a0.n, a = p2 ? ({...a0, ...{n, nAll: a0.n, pl: p2}}) : a0, g = afG(cs, n);
    const avg = Math.min(0.75 + 0.5*g, S.comboCap>0 ? S.comboCap : Infinity); return {cs, afA:a, g, avg, afS:addCx(afSum(cs, zA, avg, n), cs, zA, n, Math.min(0.75 + g, S.comboCap>0 ? S.comboCap : Infinity)), pick:{}, pl: p2 || null, w: p2 ? 1 : 0}; };
  const afEval = cs => { const pl = afMd==='none' ? null : afPlFor(); if(!pl) return afEval1(cs);
    const X = afEval1(cs, pl), w = afMd==='cast' ? 1 : Math.max(0, Math.min(1, afBW)); if(w>=0.999) return X;
    const Y = afEval1(cs), m = (x,y)=>x*w + y*(1-w);
    return {cs, afA: ({...X.afA, ...{n: X.afA.n.map((v,i)=>m(v, Y.afA.n[i])), nAll: X.afA.nAll.map((v,i)=>m(v, Y.afA.n[i])), dur: m(+X.afA.dur||0, +Y.afA.dur||0)}}), g: m(X.g, Y.g), avg: m(X.avg, Y.avg), afS: {v: m(X.afS.v, Y.afS.v), per: X.afS.per.map((v,i)=>m(v, Y.afS.per[i]))}, pick:{}, pl, w}; };
  const afBWof = C => { if(!afPlC) return 1; let q = 0, k = 0; afPlC.forEach(L=>(L||[]).forEach(e=>{ q += 1/Math.max(1, Math.floor((+e.d||3)/Math.max(1, C) + 1e-9)); k++; })); return k ? q/k : 1; }; // 지속 d턴 버프: 2주기 이상 남으면 AF 한 번 걸러 다시
  const afWith = (md, f) => { const m0 = afMd; afMd = md; try{ return f(); } finally { afMd = m0; } };
  if(afBufC) afBW = afBWof(afBufC);
  const afPick = cs0 => { let best = afEval(cs0);
    team.map((c,i)=>i).sort((a,b)=>team[a].id<team[b].id?-1:team[a].id>team[b].id?1:0).forEach(i=>{ const c = team[i], co = best.cs[i]; if(!co || !c.sbN || !(progs[i] && progs[i].sbOK)) return; // id 순(넣은 순서 무관)
      const alt = co.viaSbN ? ({...c, ...{sbN:null}}) : ({...c, ...{afSk:c.sbN, _sbN:true}});
      const t2 = team.slice(); t2[i] = alt; const c2 = attackerCore(t2, i, progs, A, enemy, S, 'af', cx, cs0.FX, zA); if(!c2) return;
      const cs2 = best.cs.slice(); cs2.FX = cs0.FX; cs2.upt = cs0.upt; cs2[i] = ({...c2, ...{viaSbN: !co.viaSbN}}); const r = afEval(cs2);
      if(r.afS.v > best.afS.v*1.0005){ r.pick = ({...best.pick, ...{[i]: !co.viaSbN}}); best = r; } });
    return best; };
  // AF 게이지 충전(평상 턴): ZONE 없으면 타당 1.5%(약점 3.5%, 전체 공격도 1타겟), ZONE이 있으면 행동(실행)당(맞으면 7.5%, 그 밖 1.5%, 상극 0).
  // 서포트 등급(AF 게이지)·버디로 추가. AF 주기 K = 100 / 턴당 충전
  /* 행동 밖에서 차는 AF 게이지(2026-10-19, TK 蝕時ゴブキング '無限AF' 레시피·Hinaden '4AF' 서가 덱): 턴 시작·종료 패시브(af_start.json _turn — 오를레아(AS)·소이라(AS)·가창 중 밀디·피치카 등),
     턴 종료 추격(turn_end — 존이면 행동당), 버디 오토·차지. AF를 쓴 턴에도 AF가 끝난 뒤 차서, 합이 50% 이상이면 다음 턴에 바로 AF(예전엔 AF 턴 뒤 게이지 0) */
  const afPas = z => team.reduce((v,c,i)=>{ const q = c.afTurnR; if(!q || !(+q.v>0) || q.sb) return v;
    if(Array.isArray(q.zone) && q.zone.length && !(z && z.level>0 && q.zone.some(k => k===z.key || (k==='starsea' && isSS(z))))) return v;
    if(q.song && !(c.song && !(progs[i] && progs[i].songOff))) return v;
    const su = q.song && sim && sim.songUp && sim.songUp[i]!=null ? Math.min(1, Math.max(0, +sim.songUp[i]||0)) : 1; // 가창 중에만: 가창 유지율만큼
    return v + (+q.v)*(q.p!=null ? +q.p : 1)*su; }, 0);
  const teAfg = () => (res.normal && res.normal.turnEnd && +res.normal.turnEnd.afg) || 0;
  const afOffOf = z => S.afOffGain===false || S.afBan || S.afDrain ? 0 : Math.min(100, afPas(z) + teAfg() + (A.bud ? budAfg(A.bud, z, team) : 0));
  const afCyc1 = (g, off) => 1 + Math.max(off>=50 ? 0 : 1, Math.min(19, Math.max(0, 100 - off)/Math.max(1, g))); // AF 주기 = 평상 턴(AF 턴 뒤 남는 게이지 off에서 100%까지) + AF 턴
  const afGainOf = (z, cs) => { let g = 0;
    team.forEach((c,i)=>{ const co=cs[i]; if(!co) return; const pM = simUse ? sim.act[i] : 1, pA = simUse ? sim.alt[i] : 0;
      const za = zoneAFAct(z, co, false), za1 = zoneAF(z, co, false);
      const weak = enemy && (enemyRel(enemy, co.el)==='weak' || enemyRel(enemy, co.wt)==='weak');
      const byHit = Math.min(30, co.totHits) * (weak?3.5:1.5) * (co.cpy ? 0.5 : 1), byHit1 = Math.min(30, Math.max(1, Math.round((co.totHits||1)/Math.max(1, co.execs||1)))) * (weak?3.5:1.5);
      // 존이 있으면 행동(실행)당. 주력 아닌 공격 턴(공격 버프기·MP 부족 대체 공격)은 스킬 하나 = 실행 1번(2026-10-16: 주력의 연속 실행 수로 세던 문제 — 테오도로스·엑구레)
      g += pM * ((za!=null ? za : byHit) + 0.5*Math.min(30, co.linkHits||0)) + pA * (za1!=null ? za1 : byHit1); // 帯電·연계 추가 공격 타당 0.5%(위키)
      if(S.afOffGain===false || !c.afTurnR) g += [0,2,4,7][Math.min(3,(c.sup&&c.sup.af_gauge)||0)]; // 패시브 수치가 있으면 등급 대신 아래 afPas
    });
    if(S.afOffGain!==false) g += afPas(z) + teAfg(); // 턴 시작·종료 패시브·턴 종료 추격(평상 턴에도)
    if(A.bud) g += S.afOffGain===false ? (A.bud.afgA||0) + (A.bud.afgC||0)*budChgRate(A.bud, z, team) : budAfg(A.bud, z, team); // 버디 AF 게이지(2026-10-17 조사): 모케 오토 스킬 턴당 5, 코로보·건스(AS) 차지 30 ÷ 차지 소모(예전엔 셋 다 턴당 5)
    // 요격은 AF 게이지를 채우지 않음(사용자 확인 2026-10-16 — 예전엔 note.com 글 하나를 근거로 요격 1번 = 행동 1번으로 채웠음). counterCalc의 afg는 참고값
    return g; };
  /* 평상 턴 존 고르기에 AF도(2026-10-17 점검: 평상 턴 대미지만으로 존을 고르면 52→54억 조금 나은 존을 고르다 AF 게이지 22→13·AF가 한 턴 늦어
     성도각성·극 글래스터를 더하면 실전 총딜이 크게 떨어지던 문제). 후보 존마다 평상 턴 × 평상 턴 비율 + AF 1회 ÷ AF 주기(지속 딜과 같은 식)로 비교 */
  if(res.normal._cands && S.zoneByAF!==false && S.afCycle!==false && !S.afBan && !S.afDrain){ const s0 = A.tm.S0, rt0 = A.realT; A.tm.S0 = 0; A.realT = 0; let bK = -1, bZ = null;
    for(const cd of res.normal._cands){ zA = cd.z; const P = afPick(coresFor('af', cd.z, false)), g = afGainOf(cd.z, cd.cores), aT = afCyc1(g, afOffOf(cd.z));
      const k = cd.v*(aT-1)/aT + P.afS.v/aT; if(k > bK){ bK = k; bZ = cd.z; } }
    A.tm.S0 = s0; A.realT = rt0;
    if(bZ && bZ!==res.normal.zone) runSit('normal', bZ); }
  // 지속: 일반 존은 상시, 어나더 존은 2/5 턴 가동 (어나더 존 한정 버프도 그 동안만)
  const nz = res.normal.zone; zA = nz;
  let bzG = null; // 버디 차지 스킬 존 각성(아래)
  const xNof = () => (res.normal.chain?res.normal.chain.total:0) + (res.normal.counter?res.normal.counter.total:0) + (res.normal.turnEnd?res.normal.turnEnd.total:0);
  const bzNorm = () => sumZ(zdep || (bzG && bzG.dep) ? coresFor('normal', bzG.z, simUse) : res.normal.cores, bzG.z, null, wN).v + xNof(); // 버디가 각성시킨 극 존의 평상 턴
  const susOf = () => { const z0 = res.normal.zone;
    if(bzG && bzG.up && (bzG.dep ? !(z0 && z0.level>=1 && z0.kind!=='none') : z0 && z0.level===1 && z0.key===bzG.z.key)) return res.normal.total*(1-bzG.frac) + bzNorm()*bzG.frac; // 극은 차지 주기 중 2턴(dep: 존 없는 팀에 버디가 새로 깖)
    if(!(z0 && z0.level>=2)) return res.normal.total;
    const z1 = ({...z0, ...{level:1}});
    const cores1 = zdep ? coresFor('normal', z1, simUse) : res.normal.cores;
    const xN = xNof(); // 일반 존 턴에도 체인·요격·턴 종료(근사: 극 존 때 값)
    const w2 = bzG && !bzG.up ? Math.max(0.4, bzG.frac) : 0.4; // 버디가 다시 극으로 만들어도 개전 극(0.4)보다 줄지는 않게
    return (sumZ(cores1, z1, null, wN).v + xN)*(1-w2) + res.normal.total*w2; };
  let sustain = susOf();
  let afGain = (S.afBan || S.afDrain) ? 0 : afGainOf(nz, res.normal.cores); // S.afBan: AF 금지, S.afDrain: 보스 흉성 3(AF 게이지 매 턴 소비) → 평상 턴 충전 없음
  /* AF 턴도 버프 지속을 씀(2026-10-20 점검): 기본 운용의 평상 턴 시뮬은 처음엔 AF 주기를 몰라 AF 턴 없이 돌림(버프 3턴 = 평상 턴 3턴) →
     이 주기로 시뮬을 한 번 더(AF 턴마다 버프·가창 지속 1턴 감소, simTeam opt.afTick) 돌려 유지율이 바뀌면 같은 존으로 평상 턴·AF 게이지를 다시. 탐색 어림 단계(stFast)는 생략 */
  let afTickC = 0;
  if(!afBufC && sim && S.afTurnTick!==false && !(S.afBan || S.afDrain) && S.afCycle!==false && !(ctx && ctx.stFast) && afGain>0 && sim.buffN.some(n=>n>0)){
    const C0 = afCyc1(afGain, afOffOf(nz));
    if(C0 < 12){ const s2 = simTeam(team, progs, S, stepV, {afTick: C0}), ch = (a,b)=> a.some((v,i)=>Math.abs((+v||0) - (+b[i]||0)) > 1e-9);
      const kch = s2.kup.some((k,j)=>{ const k0 = sim.kup[j]; if(!k !== !k0) return true; if(!k) return false; for(const x in k) if(Math.abs((k[x]||0) - (k0[x]||0)) > 1e-9) return true; return false; });
      if(kch || ch(s2.act, sim.act) || ch(s2.alt, sim.alt) || ch(s2.upt, sim.upt) || ch(s2.na, sim.na)){
        Object.assign(sim, s2); simUse = !!sim.any; uptLow = simUse && (sim.upt.some(u=>u<1) || sim.kupAny); simDerive(); wN = wNof(); memo.clear();
        runSit('normal', nz); afGain = afGainOf(nz, res.normal.cores); sustain = susOf(); afTickC = +C0.toFixed(2); } } }
  const dInj = S.afDrain && !S.afBan ? afDrainInj(A.bud, nz, team) : null; // 흉성 3에서도 버디 차지 AF 게이지(건스(AS)·코로보)를 모아 그 턴에 쓰면 AF
  const afOff = !!(S.afBan || (S.afDrain && !dInj)), afCyc = S.afCycle!==false && !afOff; // AF를 못 쓰면 지속 딜에 AF 주기 없음(예전엔 afBan이어도 AF ÷ 20턴을 더했음)
  const offOK = !(S.afOffGain===false || S.afBan || S.afDrain);
  const teAF0 = (()=>{ if(!team.some(c=>c.turnEnd && c.turnEnd.some(e=>e.when && e.when.af))) return null; const r = turnEndCalc(team, progs, A, enemy, S, cx, null, nz, cap, fw, 'af'); return r && r.total>0 ? r : null; })(); // AF 턴 종료 공격(콤보 최대 기준 위력, 그 스킬 칸·AF 행동 1번은 따로 안 셈)
  const afOffG = offOK ? Math.min(100, afOffOf(nz) + ((teAF0 && +teAF0.afg)||0)) : 0; // AF 턴 뒤(AF가 끝난 다음) 행동 밖에서 차는 게이지(빅트(AS) AF 턴 종료 공격 포함)
  let afTurns = dInj ? dInj.per : afCyc1(afGain, afOffG); // AF 주기 = 게이지를 채우는 평상 턴 + AF 턴(AF 턴엔 평상 행동·게이지 충전 없음, 2026-10-16 — 행동 밖 충전 afOffG만, 2026-10-19)
  let susNW = afCyc ? (afTurns-1)/afTurns : 1; // 지속 딜에서 평상 턴 비율
  const sbIdx = team.map((c,i)=>i).filter(i=>team[i].stellar && progs[i].sbOK);
  const sbW = team.map((c,i)=> sbFillOK(team, i, progs, S) ? 2 : 1); // SB 게이지 행동 1회 충전 배율(허수아비 dummySim과 같게)
  const sbWN = sbW.map((w,i)=> w*(1 - Math.min(1, Math.max(0, (sim && sim.lock && +sim.lock[i]) || 0)))); // 평상 턴: 가창으로 잠긴 턴엔 행동이 없어 SB 게이지도 안 참(game-info 星導覚醒 '歌唱は使用したターンのみ', 2026-10-19)
  let afSbG = offOK ? sbIdx.reduce((v,i)=>{ const q = team[i].afTurnR; if(!q || !q.sb) return v; const n = Math.max(1, +q.acts||1), za = zoneAF(nz, {el:q.el||'none', wt:q.wt||null}, false); return v + (za!=null ? za*n : n*1.5); }, 0) : 0; // SB 턴 종료 추격(메리나 星導スキル)
  // 허수아비는 1턴만, AF 100%로 시작(사용자 확인) → 세팅 턴 없음: 축적은 AF 중 행동 횟수만큼
  A.tm.S0 = 0;
  runSit('sb');
  if(afBufC) afBW = afBWof(afTurns);
  const P1 = afWith('cast', ()=>afPick(coresFor('af', nz, false))); // AF 상황(AF 전용 스킬·AF 조건)으로 — 1턴째 AF라 버프 스킬은 AF 행동으로 걸며(afMd cast, 2026-10-20)
  const afCores = P1.cs, afA = P1.afA, gain = P1.g, avgCombo = P1.avg, afS = P1.afS;
  // 실전 N턴의 AF·SB(2026-10-16): 1턴째는 허수아비와 같은 상태(af_timing·축적 0), 3턴째부터는 세팅 2턴 뒤 —
  // af_timing real·skill_cond af_r·상태 구간(개전·사용)·축적(stackFill S0 2). 2턴째는 둘의 중간. 지속 딜의 AF는 3턴째 이후 값
  const mkR3 = () => { const sv = res.sb; A.realT = 3; A.tm.S0 = 2;
    const p3 = afPick(coresFor('af', nz, false)); runSit('sb', sv.zone || null); const sb3 = ({...res.sb, ...{zones: sv.zones}}); res.sb = sv; A.realT = 0; A.tm.S0 = 0;
    return {cores:p3.cs, afA:p3.afA, avg:p3.avg, afS:p3.afS, sb:sb3, pick:p3.pick, pl:p3.pl, w:p3.w}; };
  let R3 = mkR3();
  /* SB 턴 종료 추격의 AF 게이지(afSbG)는 SB를 쓴 턴마다 — 턴당 평균(SB 주기로)을 평상 턴 충전·AF 턴 뒤 게이지에 더해 AF 주기를 다시(2026-10-19 점검: 실전 시뮬과 지속 딜·처치 턴이 다르던 것) */
  const teSB0 = (()=>{ if(!team.some(c=>c.turnEnd && c.turnEnd.some(e=>e.sb_only))) return null; const r = turnEndCalc(team, progs, A, enemy, S, cx, null, res.sb.zone || nz, cap, fw, 'sb'); return r && r.total>0 ? r : null; })(); // SB를 쓴 턴의 종료 공격
  if(offOK && teSB0) afSbG += +teSB0.afg||0; // 그 AF 게이지도 SB 턴 끝에(피네(AS) 残響)
  if(afSbG>0 && afCyc && !dInj && S.sbCycle!==false){ const sa = S.sbPerAct!=null ? +S.sbPerAct : 2.5, aA = (R3.afA.nAll || R3.afA.n).reduce((x,y,i)=>x+y*sbW[i],0), gT = sa*sbWN.reduce((x,v)=>x+v,0)*susNW + sa*aA/afTurns, sbR = Math.min(1, gT/100);
    afTurns = afCyc1(afGain + afSbG*sbR, Math.min(100, afOffG + afSbG*sbR)); susNW = (afTurns-1)/afTurns;
    if(afBufC){ const w2 = afBWof(afTurns); if(Math.abs(w2 - afBW) > 0.01){ afBW = w2; R3 = mkR3(); } } } // AF 안 버프 운용: 주기가 바뀌면 다시 거는 AF 비율(afBW)·3턴째 AF도 다시(2026-10-20 점검)
  const capAF = v => +S.afTotalCap>0 ? Math.min(v, +S.afTotalCap) : v; // AF 한 번 총 피해 상한(9999억)
  const ssK = S.starseaZone!==false && isSS(nz) ? 2 : 1; let af = capAF(R3.afS.v); // ssK: 평상 존이 성해진(AF 공격 ×2는 applyZoneCap이 — 코어 sit 'af')
  /* 긴 전투의 AF(2026-10-18, 사용자 '빅트 고평가 — 단기전이라?'): 개전·한 번 쓰는 상태(歴戦 5턴·개전 3턴 등)는 지속 딜의 AF에서도 늘 켜져 있었음 →
     긴 전투(S.susHorizon, 기본 15턴) 중 그 구간 안의 AF 비율(구간 끝 ÷ 15)만 켜진 AF, 나머지는 구간이 끝난 뒤 AF(A.lateAF)로 섞음 */
  const HL = Math.max(6, +S.susHorizon||15), wEnds = [...new Set(team.flatMap(c=>(c.states||[]).filter(q=>q && q.up==null && !q.cycle && !q.res && (+q.dur>0 || +q.start>0)).map(q=>(+q.start||0) + (+q.uses||0)*(+q.dur||0))).concat((A.weakInfo||[]).filter(w=>w.up && +w.up.t>0).map(w=>+w.up.t)))].filter(w=>w>=1 && w<HL).sort((x,y)=>x-y).slice(0, 3); // 개전 n턴 한정 약점 간파도 구간 끝
  let pLate = null; // 첫 구간이 끝난 뒤 AF(실전 N턴에서 그 턴이 지난 AF — afRun)
  let afLate = null; // 구간 끝이 여럿이면(빅트 歴戦 5턴·다른 멤버 10턴) 구간마다 AF를 따로: [0,w1] = 3턴째 AF, (w1,w2] = w1+1턴째 AF … → 긴 전투(HL턴) 평균
  if(wEnds.length && S.afCycle!==false && !(ctx && ctx.stFast)){ const sv = res.sb; let acc = af*wEnds[0], prev = wEnds[0]; // 탐색 어림 단계(stFast)는 생략 — 정밀 단계에서
    try{ for(let k=0; k<wEnds.length; k++){ A.realT = wEnds[k] + 1; A.tm.S0 = 2; A.lateAF = true; const P = afPick(coresFor('af', nz, false)), v = capAF(P.afS.v), until = k+1<wEnds.length ? wEnds[k+1] : HL; if(k===0) pLate = {t: wEnds[0], cores: P.cs, afA: P.afA, afS: P.afS, pl: P.pl, w: P.w}; acc += v*(until - prev); prev = until; } }
    finally { A.lateAF = false; A.realT = 0; A.tm.S0 = 0; res.sb = sv; }
    afLate = {v: acc/HL, w: wEnds[0]/HL, h: HL, ends: wEnds}; }
  /* 버디 차지 스킬 존 각성(2026-10-18): 팀이 그 존(일반)을 깔 때만 — 차지가 모인 턴 시작에 써서 그 턴·다음 턴 극(SB 각성처럼 2턴), 차지 주기마다 다시.
     차지 = 턴당 1 + chg_plus 조건 + 장비 확률. 이미 늘 극(스킬·극 글래스터 각성)이면 없음. 허수아비·1턴째는 차지가 없어 그대로 */
  { const zf = A.bud && A.bud.zfx;
    const awC0 = !!(nz && nz.level>=2 && (res.normal.zones||[]).some(q=>q.key===nz.key && q.level>=2 && q.how!=='개전 자동' && q.how!=='SB 시' && q.how!=='1회 각성' && !q.once));
    if(zf && nz && nz.level>=1 && nz.kind!=='none' && (nz.key===zf.key || (nz.types||[]).includes(zf.key)) && !awC0){
      const ch = A.bud.ch, r = 1 + budChgPlus(ch.plus, nz, team) + (ch.rnd||0), first = 1 + Math.ceil((ch.cost - (ch.c0||0))/r - 1e-9), per = Math.max(1, Math.ceil(ch.cost/r - 1e-9));
      const turns = new Set(); for(let t=first; t<=40; t+=per) turns.add(t);
      const frac = Math.min(1, 2/per);
      if(nz.level>=2) bzG = {z: nz, up: false, turns, first, per, frac};
      else { const zB = ({...nz, ...{level:2, how:'버디 각성', label:'극·'+(ZONE_KR[nz.key]||String(nz.label||'존'))}}), zS = zA; zA = zB;
        const P1B = afWith('cast', ()=>afPick(coresFor('af', zB, false))); A.realT = 3; A.tm.S0 = 2; const P3B = afPick(coresFor('af', zB, false)); A.realT = 0; A.tm.S0 = 0; zA = zS;
        bzG = {z: zB, up: true, turns, first, per, frac, P1: P1B, P3: P3B}; }
      sustain = susOf(); }
    /* 존이 없는 팀에 버디가 극 존을 새로 까는 경우(2026-10-19: 하자마짱 極・轟打陣, 건스+벨벳 極・招雷陣): 차지 턴·다음 턴 극, 그 밖엔 존 없음. 평상 턴이 나아질 때만(안 맞는 타입 팀이면 안 씀) */
    else if(zf && zf.dep && !(nz && nz.level>=1 && nz.kind!=='none') && zoneOpt(zf.key)){
      const zo = zoneOpt(zf.key), ch = A.bud.ch, r = 1 + budChgPlus(ch.plus, null, team) + (ch.rnd||0), first = 1 + Math.ceil((ch.cost - (ch.c0||0))/r - 1e-9), per = Math.max(1, Math.ceil(ch.cost/r - 1e-9));
      const zB = ({...zo, ...{level:2, how:'버디 전개', label:'극·'+(ZONE_KR[zo.key]||zo.key)}}), turns = new Set(); for(let t=first; t<=40; t+=per) turns.add(t);
      const vB = sumZ(coresFor('normal', zB, simUse), zB, null, wN).v + xNof();
      if(vB > res.normal.total*1.01){ const zS = zA; zA = zB;
        const P1B = afWith('cast', ()=>afPick(coresFor('af', zB, false))); A.realT = 3; A.tm.S0 = 2; const P3B = afPick(coresFor('af', zB, false)); A.realT = 0; A.tm.S0 = 0; zA = zS;
        bzG = {z: zB, up: true, dep: true, turns, first, per, frac: Math.min(1, 2/per), P1: P1B, P3: P3B}; sustain = susOf(); } } }
  let afChain = null;
  // 체인 어빌리티는 AF 밖(평상·SB 턴)에서만 발동 (사용자 확인)
  const sbTurn = res.sb.total;
  const surv = survival(team, progs, A.bud);
  // 평상 턴 공격 실행 수(보스 반격 흉성 7 등, 2026-10-18): 멤버마다 주력 실행 × (1+재공격) × 주력 쓰는 턴 비율 + 공격 버프기·대체 공격·통상 공격 1번
  const atkN = team.reduce((t,c,i)=>{ const m = c.main||{}, ex = Math.max(1, +m.execs||1)*(1 + Math.max(0, +m.repeat||0)); return t + (simUse ? (sim.act[i]||0)*ex + (sim.alt[i]||0) + (sim.na[i]||0) : ex); }, 0);
  const sustainAF = sustain*susNW + (afCyc ? af/afTurns : 0); // 지속 딜: 평상 턴(AF 턴 제외) + AF를 주기마다 한 번
  const out = {sbTurn, af, af1: capAF(afS.v), afPer: R3.afS.per, afChain, afA: R3.afA, afA1: afA, sustain: sustainAF, sustainNoAF: sustain, susNW, afGain, afTurns, afOff, burst: sbTurn + 0.5*af, surv: surv.score, survDet: surv.det,
    flux, light, shadow, hasSB, avgCombo: R3.avg, avgCombo1: avgCombo, normal:res.normal, sb:res.sb, sb3:R3.sb, A, posSets, sim, mule:A.mule, atkN,
    // 턴당 공격 행동 수(보스 기믹 — 마크바브 オール・プロテクト, 알테마: 재행동 스킬·연계·요격·버디 공격이 판정에 들어감 — 15 이상이면 Lv −1, 4 이하면 +1):
    // 행동 = 실행(연속 실행 × (1+재공격)) + 연계 추가타 + 체인·요격 발동. 평상 턴 = 그 턴에 공격하는 비율로, cap = 전원이 주력을 쓰는 턴, AF 턴 = AF 행동 × 실행 수 + AF 뒤 요격
    actN: (()=>{ const sm = a => (a||[]).reduce((x,y)=>x+(+y||0), 0), ch = res.normal.chain ? sm(res.normal.chain.trig) : 0, ct = res.normal.counter ? sm(res.normal.counter.trig) : 0, cs = res.normal.cores || [];
      const hOf = i => { const co = cs[i], m = team[i].main||{}; return (co ? Math.max(1, +co.execs||1) : Math.max(1, +m.execs||1)*(1 + Math.max(0, +m.repeat||0))) + (co ? +co.linkHits||0 : 0); }; /* co.execs는 재공격까지 센 실행 수(2026-10-19: 예전엔 ×(1+재공격)을 한 번 더 — 테오도로스 3실행을 9로) */
      const nN = team.reduce((x,c,i)=> x + (simUse ? (sim.act[i]||0)*hOf(i) + (sim.alt[i]||0) + (sim.na[i]||0) : hOf(i)), 0);
      const afN = R3.afA && R3.afA.n ? R3.afA.n.reduce((x,v,i)=> x + (+v||0)*hOf(i), 0) : 0;
      const cap = team.reduce((x,c,i)=> x + hOf(i), 0) + ch + ct; // 멤버마다 주력(가장 타수 많은 공격)을 쓰면 — 횟수를 노리는 턴(알테마: '1~3턴째는 15회에 닿게 스킬을 돌림')
      return {n: +(nN + ch + ct).toFixed(1), cap: +cap.toFixed(1), af: +(afN + ct).toFixed(1)}; })()};
  /* 턴당 타수(보스 타수 기믹 hitgim, 2026-10-19): 멤버마다 평상 턴 타수(hN = 주력 타수 × 쓰는 비율 + 다른 공격·통상 공격 1타), 행동 1번 타수(h — AF 행동 수에 곱함), SB 타수(hS),
     실행 수(x), 실행당 타수(en·es — 연격 경감용), 그 구간 피해 비중(pn·pa·ps). 체인·요격 발동은 1타씩(ch) */
  if(afTickC) out.afTick = afTickC; // 평상 턴 시뮬에 넣은 AF 주기(AF 턴도 버프 지속을 씀)
  out.redDrop = stepV && stepV.red ? stepV.red.map(r=>({i: r.i, s: r.s, by: team[r.i].name})) : null; // 다른 아군 버프와 겹쳐 안 거는 버프 스킬
  out.afPlN = afPlC ? afPlC.reduce((k,L)=>k + (L ? L.length : 0), 0) : 0; // AF 안에서 걸 수 있는 버프 스킬 수
  out.afCastN = sim && sim.afCast ? +sim.afCast.reduce((x,y)=>x+y, 0).toFixed(3) : 0; // 평상 턴에 그 버프 스킬을 거는 턴 비율(멤버 합)
  out.afMinD = afPlC ? Math.min(...afPlC.flatMap(L=>(L||[]).map(e=>+e.d||3)), 99) : 99; // AF 안 버프 중 가장 짧은 지속(턴)
  out.afBufSk = afBufC && afPlC ? afPlC.map(L=>(L||[]).map(e=>e.s)) : null; out.afBufW = afBufC ? +afBW.toFixed(2) : null; // AF 안 버프 운용: 캐릭터별 스킬, 다시 거는 AF 비율
  out.hitN = (()=>{ const cs = res.normal.cores || [], sc = (res.sb && res.sb.cores) || [], aN = (R3.afA && R3.afA.n) || [], sm = a => (a||[]).reduce((x,y)=>x+(+y||0), 0);
    const m = team.map((c,i)=>{ const co = cs[i] || {}, so = sc[i] || {}, h = Math.max(1, +co.totHits||1) + (+co.linkHits||0), x = Math.max(1, +co.execs||1), sbU = !!(c.stellar && progs[i] && progs[i].sbOK);
      const hN = simUse ? (sim.act[i]||0)*h + (sim.alt[i]||0) + (sim.na[i]||0) : h, aN0 = simUse ? (sim.act[i]||0)*x + (sim.alt[i]||0) + (sim.na[i]||0) : x;
      return {el: co.el || null, wt: co.wt || null, kind: co.kind || null, h, x, hN, aN: aN0, hS: sbU ? Math.max(1, +so.totHits||1) + (+so.linkHits||0) : 0, xS: sbU ? Math.max(1, +so.execs||1) : 0,
        en: h/x, es: sbU ? (Math.max(1, +so.totHits||1))/Math.max(1, +so.execs||1) : 1, pn: +(res.normal.per||[])[i]||0, pa: +((R3.afS && R3.afS.per)||[])[i]||0, ps: sbU ? +((res.sb && res.sb.per)||[])[i]||0 : 0}; });
    const ch = (res.normal.chain ? sm(res.normal.chain.trig) : 0) + (res.normal.counter ? sm(res.normal.counter.trig) : 0);
    return {m, ch, aN, n: +(m.reduce((v,q)=>v+q.hN, 0) + ch).toFixed(1), af: +m.reduce((v,q,i)=>v+(+aN[i]||0)*q.h, 0).toFixed(1), sb: +m.reduce((v,q)=>v+q.hS, 0).toFixed(1)}; })();
  if(S.lifeCarryN!=null) out.lcN = !!S.lifeCarryN; // 처치 턴(killTurnsM) 목숨 넘김은 쓰는 설정으로
  if(bzG) out.budZ = {label: bzG.z.label, first: bzG.first, per: bzG.per, frac: bzG.frac};
  if(ctx && ctx.timeline){ const tl = turnTimeline(team, progs, enemy, S, cap, ctx, out); out.tl = tl; }
  // AF를 게이지 g0%에서 시작했을 때 (행동 수·콤보·화력). 100%는 위에서 계산한 값
  // 극존이 풀린(일반 존) 상태의 값: 개전 극존은 2턴, SB 극존은 그 턴·다음 턴만
  const nzL1 = nz && nz.level>=2 ? ({...nz, ...{level:1}}) : nz;
  // 같은 존을 여러 명이 펼 수 있으면(예: 리나리아 개전 자동 + 히스메나(ES) SB 각성) 각성 경로를 모두 센다 — 편성 순서와 무관하게
  const sameZ = (zs, z) => z && z.level>=2 ? (zs||[]).filter(q=>q.key===z.key && q.level>=2) : [];
  const nzs = sameZ(res.normal.zones, nz);
  const awConst = nzs.some(q=>q.how!=='개전 자동' && q.how!=='SB 시' && q.how!=='1회 각성' && !q.once), awStart = !awConst && nzs.some(q=>q.how==='개전 자동' || q.how==='1회 각성' || q.once);
  const sbz = res.sb.zone, sbAw0 = sameZ(res.sb.zones, sbz).some(q=>q.how==='SB 시');
  // zone.sb_fresh(2026-10-17 딩 DB: 히스메나(ES) カンペオン・ロハ는 '双撃陣・斬突이 아닐 때'만 SB로 존 파괴+극 전개) — 평상 턴에 같은 존(일반)을 깔아 두면 SB로 극이 안 됨
  const sbFr = !!sbz && sameZ(res.sb.zones, sbz).some(q=>q.how==='SB 시' && team.some(c=>c.id===q.by && c.raw && c.raw.zone && c.raw.zone.sb_fresh));
  const sbAw = sbAw0 && !(sbFr && nz && nz.key===sbz.key && nz.level>=1);
  const afMemo = {};
  /* AF 안 버프 운용(순수)의 첫 AF(2026-10-20 점검): 그 전엔 그 버프를 건 적이 없어 3턴째 이후 AF도 다 걸어야 함 — 섞기(afBW < 1, 지속이 길어 AF 한 번 걸러 다시 거는 버프)여도 첫 AF는 'cast' */
  const afFirstOn = !!(afBufC && ctx && ctx._afBuff > 0 && afPlC && afBW < 0.999); let R3c = null; const r3Cast = () => R3c || (R3c = afWith('cast', mkR3));
  const afRun = (g0, lv, t, gen, f1)=>{ /* gen: 일반 '3턴째 이후' 값(지속 딜·SB 주기·2턴째 평균) — sb_full 상태 켜진 턴(onT) 무시(2026-10-19 점검), f1: 순수 AF 안 버프 운용의 첫 AF */ g0 = Math.max(50, Math.min(100, Math.round(g0/10)*10)); const bU = !!(bzG && bzG.up && lv>=2), zH = bU ? bzG.z : nz; // bU: 버디가 각성시킨 극 존의 AF
    const lv2 = !(zH && zH.level>=2) || lv>=2, tOn = !gen && onT(t), tc = t>=3 || tOn ? 3 : t===2 ? 2 : 1, fC = !!(f1 && afFirstOn && !bU && !tOn), lt = !!(!gen && pLate && t > pLate.t && tc===3 && !bU && !tOn && !fC); const k=g0+(lv2?'a':'b')+(bU?'B':'')+tc+(tOn?'O':'')+(fC?'F':'')+(lt?'L':''); if(afMemo[k]) return afMemo[k]; // tOn: 상태가 켜진 턴(sb_full), lt: 개전 상태·약점 간파가 끝난 뒤 AF(2026-10-20)
    if(tc===2){ const p = afRun(g0, lv, 1, true), q = afRun(g0, lv, 3, true, fC), m = (x,y)=>(x+y)/2; // 2턴째 AF: 1턴째·3턴째의 중간
      return (afMemo[k] = {g0, dmg:m(p.dmg,q.dmg), per:p.per.map((v,i)=>m(v,q.per[i])), acts:m(p.acts,q.acts), fin:m(p.fin,q.fin), avg:m(p.avg,q.avg), n:p.n.map((v,i)=>m(v,q.n[i])), nS:(p.nS||p.n).map((v,i)=>m(v,(q.nS||q.n)[i]))}); }
    const PB = bU ? (tc===3 ? bzG.P3 : bzG.P1) : null;
    const R3x = tc===3 && fC ? r3Cast() : lt ? pLate : R3, ON = tOn && !PB ? onVals() : null, cs = PB ? PB.cs : ON ? ON.cs : tc===3 ? R3x.cores : afCores, a0 = PB ? PB.afA : ON ? ON.afA : tc===3 ? R3x.afA : afA, zU = lv2 ? zH : nzL1;
    const cC = S.comboCap>0 ? S.comboCap : Infinity, P0 = PB || ON || (tc===3 ? R3x : P1), pl0 = P0 && P0.pl, w0 = pl0 ? (P0.w!=null ? +P0.w : 1) : 0; // AF 안 버프 행동(afMd)
    if(g0<100 && pl0){ /* 게이지 g0%에서 시작: 버프 행동을 거는 AF(pl0)·안 거는 AF를 같은 비율(w0)로 */
      const runA = pl => { const a1 = afActionsOf(team, progs, cs, zU, enemy, S, g0, undefined, pl || undefined, lkAt(tc)), n = pl ? a1.n.map((v,i)=>Math.max(0, v - pl[i].length)) : a1.n, gn = afG(cs, n), avg = Math.min(0.75+0.5*gn, cC), fin = Math.min(0.75+gn, cC);
        return {n, nS: a1.n, avg, fin, zz: addCx(afSum(cs, zU, avg, n), cs, zU, n, fin)}; };
      const X = runA(pl0), Y = w0<0.999 ? runA(null) : null, m = (x,y)=> Y ? x*w0 + y*(1-w0) : x;
      return (afMemo[k] = {g0, dmg: m(X.zz.v, Y && Y.zz.v), per: X.zz.per.map((v,i)=>m(v, Y && Y.zz.per[i])), acts: m(X.n.reduce((x,y)=>x+y,0), Y && Y.n.reduce((x,y)=>x+y,0)), fin: m(X.fin, Y && Y.fin), avg: m(X.avg, Y && Y.avg),
        n: X.n.map((v,i)=>m(v, Y && Y.n[i])), nS: X.nS.map((v,i)=>m(v, Y && Y.n[i]))}); }
    const a = g0>=100 ? a0 : afActionsOf(team, progs, cs, zU, enemy, S, g0, undefined, undefined, lkAt(tc));
    const gn = afG(cs, a.n);
    const avg = Math.min(0.75+0.5*gn, cC), zz0 = (g0>=100 && lv2) ? (PB ? PB.afS : ON ? ON.afS : tc===3 ? R3x.afS : afS) : afSum(cs, zU, avg, a.n);
    const zz = (g0>=100 && lv2) ? zz0 : addCx(zz0, cs, zU, a.n, Math.min(0.75+gn, cC));
    return (afMemo[k] = {g0, dmg:zz.v, per:zz.per, acts:a.n.reduce((x,y)=>x+y,0), fin:Math.min(0.75+gn, cC), avg, n:a.n, nS: a.nAll || a.n}); };
  /* SB 게이지 가득(state sb_full {from, from_nosa, dur, cd}, 2026-10-19 game-info ユーチェリカ: 星天の力 상태에선 턴 시작에 天冥ゲージ를 天 200으로 채움 →
     그 상태 2턴 동안 매 턴 SB, 상태가 끝나면 星の導き를 다시 99까지(성도각성 + 개전 40이면 4턴째부터, 아니면 늦게)). 그 턴은 상태가 켜진 SB·AF·평상 턴으로 */
  const sbFullOf = (()=>{ if(!sbIdx.length || S.sbFull===false) return null; let set = null, info = null; const nm = new Set();
    team.forEach((c,i)=>{ for(const q of (c.states||[]).slice(0, 3)){ if(!q || !q.sb_full || !q.name) continue; const f = q.sb_full, sa = !!(progs[i] && (progs[i].sbOK || progs[i].sbAw));
      const from = Math.max(1, +(sa ? f.from : (f.from_nosa || (+f.from||4) + 4)) || 4), dur = Math.max(1, +f.dur||2), per = dur + Math.max(0, +f.cd||0);
      set = set || new Set(); for(let t=from; t<=60; t++) if(((t - from) % per) < dur) set.add(t); nm.add(q.name); if(!info) info = {from, dur, per, by: c.name, name: f.kr || q.name}; } });
    return set ? {set, nm, info} : null; })();
  let ONv = null; const onVals = () => { if(ONv) return ONv; const sv = res.sb, nv = res.normal; A.realT = 3; A.tm.S0 = 2; A.stOn = sbFullOf.nm;
    try{ const p = afPick(coresFor('af', nz, false)); runSit('sb', sv.zone || null); const sbO = res.sb; runSit('normal', nv.zone || null); ONv = {cs: p.cs, afA: p.afA, afS: p.afS, sb: sbO, nr: nv.total>0 ? res.normal.total/nv.total : 1, pl: p.pl, w: p.w}; }
    finally { A.stOn = null; A.realT = 0; A.tm.S0 = 0; res.sb = sv; res.normal = nv; } return ONv; };
  const onT = t => !!(sbFullOf && sbFullOf.set.has(t));
  const st = afStartOf(team, ctx, S);
  const extra = (res.normal.chain?res.normal.chain.total:0) + (res.normal.counter?res.normal.counter.total:0) + (res.normal.turnEnd?res.normal.turnEnd.total:0);
  const normal2 = res.normal.total, normal1 = nz && nz.level>=2 ? sumZ(zdep ? coresFor('normal', nzL1, simUse) : res.normal.cores, nzL1, null, wN).v + extra : normal2;
  const sbz1 = sbz && sbz.level>=2 ? ({...sbz, ...{level:1}}) : sbz, sbPer1 = sbz && sbz.level>=2 ? sumZ(res.sb.cores, sbz1, null, null).per : res.sb.per;
  const sb3 = R3.sb, sbz3 = sb3.zone, sbz31 = sbz3 && sbz3.level>=2 ? ({...sbz3, ...{level:1}}) : sbz3, sbPer31 = sbz3 && sbz3.level>=2 ? sumZ(sb3.cores, sbz31, null, null).per : sb3.per;
  const sbSum = (per) => sbIdx.reduce((v,i)=>v+(per[i]||0),0), sbCh = r => r.chain ? sbIdx.reduce((v,i)=>v+(r.chain.per[i]||0),0) : 0;
  { const P = res.normal.per||[], C = res.normal.cores||[]; let a = 0, w0 = 0; P.forEach((v,i)=>{ const w = Math.max(0, +v||0); w0 += w; a += w*(C[i] ? Math.min(1, +C[i].pw||0) : 0); }); out.pierceS = w0>0 ? +(a/w0).toFixed(3) : 0; let b = 0; P.forEach((v,i)=>{ const c = C[i]; if(c) b += Math.max(0, +v||0)*Math.max(0, (+c.typeR||0) + (+c.physR||0)); }); out.resR = w0>0 ? +(b/w0).toFixed(3) : 0; } /* 배리어 관통 몫·팀 내성 다운(대미지 비중 평균) */
  const simIn = {t1: out.tl ? out.tl.t1 : normal2, normal: bzG && bzG.up ? bzNorm() : normal2, normal1: bzG && bzG.up ? normal2 : normal1, budAw: bzG ? bzG.turns : null, sbBurst: sbSum(res.sb.per), sbBurst1: sbSum(sbPer1),
    sbChain: sbCh(res.sb), // 체인 추격은 평상 턴 SB에만(AF 안 SB엔 없음)
    sbT: t => { if(onT(t)){ const O = onVals(), b = sbSum(O.sb.per), r1 = sbSum(sb3.per)>0 ? sbSum(sbPer31)/sbSum(sb3.per) : 1; const ch = sbCh(O.sb); return {b, b1: (b - ch)*r1, ch, on: true}; } // sb_full 턴: 상태가 켜진 SB
      const w = Math.min(1, Math.max(0, (t-1)/2)), L = (x,y)=>x+(y-x)*w; return {b: L(sbSum(res.sb.per), sbSum(sb3.per)), b1: L(sbSum(sbPer1), sbSum(sbPer31)), ch: L(sbCh(res.sb), sbCh(sb3))}; }, // 실전 N턴의 SB: 턴이 지날수록 3턴째 값으로
    sbFull: sbFullOf ? sbFullOf.set : null, ndOn: sbFullOf ? (t => onT(t) ? onVals().nr : 1) : null,
    afTailV: (Array.isArray(S.cutWin) && S.cutWin.length) || S.protect ? af : 0,
    cutW: Array.isArray(S.cutWin) && S.cutWin.length ? S.cutWin.filter(w=>w && +w.t>0 && +w.x>=0 && +w.x<1).map(w=>({t:+w.t, x: w.b ? pierceX(+w.x, out.pierceS) : +w.x})) : null, // 보스 개시 피해 경감 구간(앱 effBoss — hp_model.dmg_cut start)
    hg: (()=>{ const G0 = Array.isArray(S.hitGim) && S.hitGim.length && out.hitN ? S.hitGim : null; if(!G0) return null; const G = G0.map(g=> hgTeam(g, out.pierceS, out.resR)); // 보스 타수 기믹(앱 effBoss — hgList(hp_model)): 실전 N턴은 개시·n턴째부터 켜지는 것만(부활 뒤 것은 처치 턴 계산에서)
      const on = g => (g.on||'start')==='start'; return {G, M: out.hitN.m, ch: out.hitN.ch, s0: G.map(g=> on(g) && !(+g.from>1) ? hgS0(g) : null), at: G.map(g=> on(g) ? Math.max(1, +g.from||1) : 0)}; })(),
    afFull: +S.afFull>0 && +S.afFull<1 ? +S.afFull : 0, // 보스 오라: AF 게이지가 꽉 차 있으면 아군 주는 피해 ×x(진·현현 유나·멜리나 — 게이지 100% 전에 AF)
    teN: res.normal.turnEnd ? res.normal.turnEnd.total : 0, // AF 턴에도 남는 턴 종료 공격(평상 턴 값)
    teAF: teAF0,
    sbOnce: (()=>{ const oi = sbIdx.filter(i=>team[i].sb && +team[i].sb.once_t>0); if(!oi.length) return null; const S1 = per => oi.reduce((v,i)=>v+(per[i]||0),0);
      return {maxT: Math.min(...oi.map(i=>+team[i].sb.once_t)), t: t => { const w = Math.min(1, Math.max(0, (t-1)/2)), L = (x,y)=>x+(y-x)*w; return {b: L(S1(res.sb.per), S1(sb3.per)), b1: L(S1(sbPer1), S1(sbPer31))}; }}; })(), // 전투 중 1회 SB(sb.once_t = 쓸 수 있는 마지막 턴)
    aw0: awStart ? 2 : 0, awConst, sbAw, hasSB: sbIdx.length>0,
    ss: ssK>1, ssAF: S.starseaAF!==false, afGain, afDrain: dInj ? {turns: dInj.turns, g0: dInj.g0} : null, g0: st.g, s0: Math.min(50, 12.5*team.length), sbAct: S.sbPerAct!=null ? +S.sbPerAct : 2.5, front: team.length, sbW, sbWN, afRun, /* SB 게이지 시작 = 전열 1명당 +25/200(2026-10-19 game-info 星導覚醒 'ステラバーストの細かい仕様' — 예전엔 천·명 중 많은 쪽 수만), sbW: 멤버별 행동 1회 충전 배율(스텔라 보드 天冥 어빌리티 증가(중) = +10/+5) */
    refill: (()=>{ const rc = sbIdx.length ? team.find(c=>c.afRefillR && c.afRefillR.on==='sb') : null; return rc ? {to:+rc.afRefillR.to||100, cost:+rc.afRefillR.cost||0, e0: +rc.afRefillR.start>0 ? 1 : 0, noAF: rc.afRefillR.af===false} : null; })(), // e0: 개전에 축적 1개(히스메나(ES) エスパーダ), noAF: AF 안 SB로는 안 채움
    teSB: teSB0};
  simIn.afSbG = afSbG; simIn.afFirst = afFirstOn; // afFirst: 순수 AF 안 버프 운용의 첫 AF는 버프를 다 걸고(afRun f1)
  simIn.afTotCap = +S.afTotalCap||0; // AF 한 번 총 피해 상한
  simIn.afOffG = afOffG; out.afOffG = simIn.afOffG>0 ? +simIn.afOffG.toFixed(1) : 0; // AF 턴 뒤 게이지(빅트(AS) AF 턴 종료 공격 포함)
  // 지속 딜의 AF도 극 존이 계속 유지될 때만 극(2026-10-17): 개전 자동·1회 각성(네코코(ES) 颯 첫 사용 등)은 2턴 뒤 일반 존 — 평상 턴(susOf)과 같은 비율(일반 0.6·극 0.4)로 섞음. SB로 다시 각성(sbAw)하면 그대로
  if(afCyc && !dInj && nz && nz.level>=2 && !awConst && !sbAw){ const a1 = capAF(afRun(100, 1, 3, true).dmg); if(a1 < af){ const dA = (bzG && !bzG.up ? 1-Math.max(0.4, bzG.frac) : 0.6)*(a1 - af)/afTurns; out.sustain += dA; out.susAfL1 = a1; } }
  if(afCyc && !dInj && bzG && bzG.up){ const aB = capAF(afRun(100, 2, 3, true).dmg); if(aB > af){ out.sustain += bzG.frac*(aB - af)/afTurns; out.susAfB = aB; } } // 버디 각성 극 존 AF는 차지 주기 중 2턴 몫
  if(afCyc && !dInj && afLate){ out.sustain += (afLate.v - af)/afTurns; out.afLate = afLate; } // 긴 전투 AF(구간 상태가 끝난 뒤 섞음)
  if(afCyc && dInj){ const aD = capAF(afRun(dInj.g0, 1, 3, true).dmg); out.sustain += (aD - af)/afTurns; out.afDrain = {first: dInj.first, per: dInj.per, g0: dInj.g0, k: dInj.k, af: aD}; } // 흉성 3: 차지로 채운 게이지(g0)에서 시작하는 AF
  if(afCyc){ if(simIn.teAF){ out.sustain += simIn.teAF.total/afTurns; out.teAF = simIn.teAF; } if(simIn.teN) out.sustain += simIn.teN/afTurns; } // AF 턴 종료 공격(AF 턴 전용 + 평상 턴 종료 공격)도 AF 주기마다
  // 지속 딜에 SB(2026-10-16, 사용자 확인: SB는 턴을 쓰지 않아 쓴 뒤에도 그 턴 행동을 그대로 함): SB 게이지가 차는 주기마다 한 번 더함.
  // 게이지 = 평상 턴 행동마다 + AF 행동마다(실전 시뮬과 같은 sbAct), 차는 몫이 AF 쪽이면 AF 끝 콤보로(실전 시뮬처럼 AF 안 SB)
  if(S.sbCycle!==false && sbIdx.length){ const sa = simIn.sbAct, afActs = (R3.afA.nAll || R3.afA.n).reduce((x,y,i)=>x+y*sbW[i],0), gN = sa*sbWN.reduce((x,v)=>x+v,0)*susNW, gA = afCyc ? sa*afActs/afTurns : 0, gT = gN + gA;
    const sbTurns = Math.max(1, 100/Math.max(1, gT)), fr = gT>0 ? gA/gT : 0, fin = afRun(100, bzG && bzG.up ? 1 : 2, 3, true).fin, k = fr*fin + (1-fr); // 버디 각성 극 AF는 차지 주기 중 일부라 SB 주기 콤보엔 안 씀(2026-10-18 점검)
    const Hs = (A.tm && A.tm.H) || 6; // 전투 중 1회 SB(once_t)는 주기마다가 아니라 전투(H턴)에 한 번
    // 긴 전투 SB(2026-10-18, 빅트 歴戦 SB 71.4 → 꺼지면 39.4): AF처럼 개전·한 번 쓰는 상태 구간 끝마다 그 뒤 SB를 계산해 시간 가중(탐색 어림 단계는 생략)
    let sbP = sb3.per; if(afLate && afLate.ends && afLate.ends.length && !(ctx && ctx.stFast)){ const sv0 = res.sb, E0 = afLate.ends, acc = sb3.per.map(v=>(v||0)*E0[0]); let prev = E0[0];
      try{ for(let q=0; q<E0.length; q++){ A.realT = E0[q] + 1; A.tm.S0 = 2; A.lateAF = true; runSit('sb', sv0.zone || null); const until = q+1<E0.length ? E0[q+1] : afLate.h; res.sb.per.forEach((v,i)=>{ acc[i] += (v||0)*(until - prev); }); prev = until; } }
      finally { A.lateAF = false; A.realT = 0; A.tm.S0 = 0; res.sb = sv0; }
      sbP = acc.map(v=>v/afLate.h); out.sbLate = true; }
    let sp = team.map((c,i)=> sbIdx.includes(i) ? Math.max(0, (sbP[i]||0) - (sb3.chain ? sb3.chain.per[i]||0 : 0))*k/(c.sb && +c.sb.once_t>0 ? Math.max(sbTurns, Hs) : sbTurns) : 0); let sv = sp.reduce((x,y)=>x+y,0);
    if(+S.afTotalCap>0 && afCyc && fr>0 && sv>0){ const sbA = sv*fr*fin/Math.max(1e-9, k), room = Math.max(0, +S.afTotalCap - af)/afTurns; if(sbA > room){ const f = (sv - sbA + room)/sv; sp = sp.map(v=>v*f); sv *= f; } } // AF 안 SB도 AF 총 피해 상한(9999억) 안 — AF가 이미 상한이면 0
    out.sustain += sv; out.sustainSB = sv; out.sbPerSus = sp; out.sbTurns = sbTurns;
    if(sbFullOf){ const I = sbFullOf.info, O = onVals(), fOn = I.dur/I.per; // sb_full: 주기(I.per턴) 중 I.dur턴은 매 턴 상태가 켜진 SB — 그 턴들의 평소 게이지 몫은 빼고
      const spO = team.map((c,i)=> sbIdx.includes(i) ? Math.max(0, (O.sb.per[i]||0) - (O.sb.chain ? O.sb.chain.per[i]||0 : 0))*fOn : 0), vO = spO.reduce((x,y)=>x+y,0);
      out.sustain += vO - sv*fOn; out.sustainSB = sv*(1-fOn) + vO; out.sbPerSus = sp.map((v,i)=>v*(1-fOn) + spO[i]); out.sbFull = {from: I.from, dur: I.dur, per: I.per, by: I.by, name: I.name, sb: +(vO/fOn).toFixed(0)}; }
    if(simIn.teSB){ out.sustain += simIn.teSB.total/sbTurns; out.teSB = simIn.teSB; } // SB 턴 종료 공격도 SB 주기마다
    // SB 뒤 효과(SB로만 거는 버프·디버프, af_timing 'sb')는 평상 턴에도 남음(사용자 확인 2026-10-16, 체인 어빌리티 공격만 빼고):
    // 남는 비율 = 지속 턴(turns.buff) ÷ SB 주기. 평상 턴을 그 비율로 다시 계산하고 지속 딜·실전 시뮬의 평상 턴 값을 바꿈
    const u = team.map((c,j)=> sbIdx.includes(j) ? Math.min(1, Math.max(1, c.buffTurns>=99 ? sbTurns : (c.buffTurns||3))/sbTurns) : 0);
    const has = team.some((c,j)=> u[j]>0 && ((c.afT && ['party','self','deb'].some(q=>c.afT[q] && Object.values(c.afT[q]).includes('sb'))) || (c.bact && c.bact.sbOnly.size) || (c.rules && c.rules.list.some(r=>r.w && r.w.sb))));
    if(has){ A.sbUpN = u;
      if(simUse){ sim.kup = sim.kup.map((kp,j)=> kp && team[j].bact && u[j]>0 ? ({...kp, ...Object.fromEntries([...team[j].bact.sbOnly].filter(x=>!team[j].bact.sb1.has(x)).map(x=>[x, Math.max(kp[x]||0, u[j])]))}) : kp); sim.kupAny = sim.kupAny || sim.kup.some(Boolean);
        uptArr = sim.upt.map((v,j)=> sim.kup[j] ? {mf: sim.kup[j]} : v); }
      memo.clear(); A.tm.S0 = 2; runSit('normal', nz); A.tm.S0 = 0; // 같은 존으로(AF·게이지는 그 존 기준, 2026-10-17 점검)
      { const te2 = res.normal.turnEnd ? res.normal.turnEnd.total : 0; if(afCyc && te2!==simIn.teN) out.sustain += (te2 - (simIn.teN||0))/afTurns; simIn.teN = te2; }
      const sus2 = susOf(), ex2 = (res.normal.chain?res.normal.chain.total:0) + (res.normal.counter?res.normal.counter.total:0) + (res.normal.turnEnd?res.normal.turnEnd.total:0);
      const nz2 = res.normal.zone, nz2L1 = nz2 && nz2.level>=2 ? ({...nz2, ...{level:1}}) : nz2;
      simIn.normal = res.normal.total; simIn.normal1 = nz2 && nz2.level>=2 ? sumZ(zdep ? coresFor('normal', nz2L1, simUse) : res.normal.cores, nz2L1, null, wN).v + ex2 : simIn.normal;
      if(bzG && bzG.up){ simIn.normal1 = res.normal.total; simIn.normal = bzNorm(); }
      out.sustain += (sus2 - out.sustainNoAF)*susNW; out.sustainNoAF = sus2; out.normal = res.normal; out.sbUpN = u; } }
  if(res.normal.afPost && res.normal.afPost.total>0){ simIn.ctrAF = res.normal.afPost.total; out.ctrAF = res.normal.afPost; if(afCyc) out.sustain += simIn.ctrAF/afTurns; } // AF 턴 뒤 요격·체인도 AF 주기마다
  /* 누적 효과 예열(2026-10-18): 평상 턴 t의 값 = 다 쌓인 값 × r(t) — r(1·2·3)은 그 턴 누적 수로 다시 계산, 그 뒤는 다 쌓이는 턴(stkSat)까지 직선으로 1.
     실전 N턴의 평상 턴·1턴째에 곱하고, 지속 딜의 평상 턴은 전투 H턴(A.tm.H) 평균 */
  /* 누적 효과 예열(2026-10-18): 평상 턴 t의 값 = 기준(평상 턴 평균) × r(t) — r은 그 턴까지 쌓인 수로 1·2·3·6턴째를 다시 계산(4·5턴은 사이 직선, 7턴부터 6턴 값).
     대상: 누적 데이터(stacks.json → c.stk)와 기존 축적 조건(self_stk·skill_cond stack·buff_rules stack/cnt — 평상 턴은 원래 H턴 평균이라 r이 1보다 클 수 있음).
     실전 N턴의 평상 턴·1턴째에 곱하고, 지속 딜 평상 턴은 전투 H턴(A.tm.H) 평균 r */
  let rmp = null;
  // 탐색 어림 단계(stFast)는 건너뜀 — 평상 턴 몫이라 순위 영향이 작고, 정밀 단계에서 계산
  if(S.stkRamp!==false && !(ctx && ctx.stFast) && team.some(c=>c.stk || c.stkAny)){ const zR = res.normal.zone, zC = zdep ? zR : null, cs0 = zdep ? coresFor('normal', zR, simUse) : res.normal.cores, base = sumZ(cs0, zR, null, wN).v;
    const Ts = Math.min(40, Math.max(0, ...team.map((c,j)=>c.stk ? stkSat(c.stk.all, A.stkMR ? A.stkMR[j] : null) : 0))), fillAny = team.some(c=>c.stkAny);
    if(base>0 && (Ts>0.5 || fillAny)){ const rr = {};
      // 다시 계산할 공격자: 파티 버프·디버프 누적이나 규칙 축적이 있으면 전원(규칙이 있으면 버프 행 FX도 다시), 자기 쪽만이면 그 캐릭터만
      const ruleR = team.some(c=>c.stkRule), allA = ruleR || team.some(c=>(c.stk && (Object.keys(c.stk.party).length || Object.keys(c.stk.deb).length)) || c.poSt), redo = team.map(c=>allA || !!c.stk || !!c.stkAny);
      for(const T of [1,2,3,4,5,6]){ if(T>Ts+0.5 && !fillAny){ rr[T] = 1; continue; } A.stkT = T; // 4·5턴도 직접(2026-10-18 점검: 3턴 개전 상태처럼 4턴째에 꺼지는 구간을 3·6턴 사이 직선으로 메워 지속 딜 약 3% 과대)
        const cs = ruleR ? coresFor('normal', zC, simUse) : team.map((c,i)=> redo[i] ? attackerCore(team,i,progs,A,enemy,S,'normal',cx,cs0.FX||null,zC) : cs0[i]); // 존 무관 조합은 공용 코어처럼 존 없이
        rr[T] = Math.max(0, Math.min(3, sumZ(cs, zR, null, wN).v/base)); }
      A.stkT = 0;
      const R = t => rr[Math.max(1, Math.min(6, Math.round(t)))];
      const H = Math.max(1, (A.tm && A.tm.H) || 6); let su = 0; for(let t=1;t<=H;t++) su += R(t); const rS = su/H;
      rmp = {r: [1,2,3,4,5,6].map(R), sus: rS, sat: Ts};
      if(Math.abs(rS-1)>1e-6){ out.sustain += out.sustainNoAF*susNW*(rS-1); out.sustainNoAF *= rS; }
      if(!out.tl) simIn.t1 *= R(1); simIn.rmp = R; out.stkRamp = rmp; } } // 턴 화력 줄(turnTimeline)이 있으면 1턴째는 이미 1턴만큼
  /* AF 안 버프 운용(순수, 2026-10-20 점검): 첫 AF 전 평상 턴엔 AF로 거는 버프가 아직 없음(예전엔 평균 유지율로 켜 둬 실전 N턴 1·2턴이 과대 — 그 운용 14조합 중 12조합이 1턴째 평상 턴) →
     그 버프를 끈 평상 턴(sim.kupPre)과 지금 평상 턴의 비율(preR)을 실전 N턴의 첫 AF 전 2턴째 이후에 곱함(1턴째는 turnTimeline이 따로), 체인·요격·턴 종료 몫은 그대로 */
  if(afBufC && !(ctx && ctx._afBuff < 0) && sim && sim.kupPre && sim.kupPre.some(Boolean) && !(ctx && ctx.stFast)){ const zR = res.normal.zone;
    const csOf = mf => { const FX = buildBF(team,progs,'normal',zR,A,posSets,mf); return team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,'normal',cx,FX,zR)); };
    const uC = team.map((c,j)=> sim.kup[j] ? {mf: sim.kup[j]} : simUse ? sim.upt[j] : 1), uP = team.map((c,j)=> sim.kupPre[j] ? {mf: sim.kupPre[j]} : uC[j]);
    const b = sumZ(csOf(uC), zR, null, wN).v, a = sumZ(csOf(uP), zR, null, wN).v, ex = xNof();
    if(b>0){ const r = Math.max(0, (a + ex)/(b + ex)); if(r < 0.999){ simIn.preR = r; out.afPreR = +r.toFixed(3); } } }
  const NB = Math.max(1, Math.min(10, (ctx && ctx.burstN) || +S.burstTurns || 3));
  /* 공격 행동 수로 내려가는 보스 내성 단계(S.protect = hp_model.protect, 마크바브): 전원이 주력을 쓰는 턴 행동 수(out.actN.cap)가 down 이상이면 매 턴 −1 → 실전 N턴 t턴째 × rel[Lv]
     (모자라면 AF 턴에만 내려가 계획에 따라 달라짐 → 실전 N턴엔 안 넣고 처치 턴 계산에서만) */
  if(S.protect && Array.isArray(S.protect.rel) && S.protect.rel.length && out.actN && out.actN.cap >= (+S.protect.down||15)){ const R = S.protect.rel, n = R.length, l0 = Math.min(n, +S.protect.lv0||n);
    simIn.turnX = Array.from({length: NB}, (_, k)=> +R[Math.max(1, l0 - k)-1] || 1); }
  // 조합 탐색 중에는 그 모드 점수에 쓰는 것만 계산(최고점 = 허수아비, 나머지 = N턴 시뮬). 화면용 재계산(ctx.mode 없음)은 둘 다
  const md = ctx && ctx.mode, needBsim = md!=='burst', needDummy = !md || md==='burst';
  if(needBsim){
    /* AF 게이지 경계 완화(2026-10-16): 턴당 충전이 50% 언저리면 '매 턴 AF'와 '격턴 AF'가 갈려 실전 총딜이 2배 가까이 뛰던 문제 —
       평상 턴 충전 추정(행동 비율·버프 턴)의 오차만큼 충전량 ×(1∓j)로도 돌려 0.25·0.5·0.25로 평균(j = S.afJitter, 기본 0.12, 0이면 끔). 화면의 턴 계획은 가운데 값 */
    const jit = S.afJitter!=null ? Math.max(0, +S.afJitter) : 0.12, JV = jit>0 ? [[1, 0.5], [1-jit, 0.25], [1+jit, 0.25]] : [[1, 1]];
    const perOf = bs => { // 실전 N턴 딜 비중(2026-10-16, 사용자 지적: 화면이 SB 턴 비중만 보여 주력 딜러 몫이 작게 보임): 고른 계획의 AF·SB·평상 턴을 캐릭터별로 다시 더함
      const per = team.map(()=>0), nT = res.normal.per.reduce((a,b)=>a+b,0)||1, add = (arr, k) => arr.forEach((v,i)=>{ per[i] += (v||0)*k; });
      for(const rc of bs.turns){
        if(rc.teSB && simIn.teSB) add(simIn.teSB.per, 1);
        if(rc.af){ const r = afRun(rc.af, rc.afL, rc.t, false, !!rc.af1st); add(r.per, rc.fA!=null ? rc.fA : 1); if(rc.teAF && simIn.teAF) add(simIn.teAF.per, 1); if(rc.teN && res.normal.turnEnd) add(res.normal.turnEnd.per, 1); if(rc.ctrAF && res.normal.afPost) add(res.normal.afPost.per, 1); }
        if(rc.sb){ const w = Math.min(1, Math.max(0, (rc.t-1)/2)), lv2 = rc.L>=2, ch1 = lv2 && res.sb.chain ? res.sb.chain.per : null, ch3 = lv2 && sb3.chain ? sb3.chain.per : null, k = (rc.sb==='af' ? (rc.combo||1) : 1)*(rc.fS!=null ? rc.fS : 1);
          const pOn = rc.sbOn ? onVals().sb.per : null, p1 = pOn || (lv2 ? res.sb.per : sbPer1), p3 = pOn || (lv2 ? sb3.per : sbPer31), chO = pOn && onVals().sb.chain ? onVals().sb.chain.per : null; // sb_full 턴은 상태가 켜진 SB의 체인을 뺌(2026-10-19 점검)
          sbIdx.forEach(i=>{ if(rc.sbNo1 && team[i].sb && +team[i].sb.once_t>0) return; const a1 = (p1[i]||0) - (pOn ? (chO ? chO[i]||0 : 0) : ch1 ? ch1[i]||0 : 0), a3 = (p3[i]||0) - (pOn ? (chO ? chO[i]||0 : 0) : ch3 ? ch3[i]||0 : 0); per[i] += Math.max(0, a1 + (a3-a1)*w)*k; }); }
        add(res.normal.per, (rc.nd||0)/nT); }
      return per; };
    let tot = 0; const perW = team.map(()=>0);
    JV.forEach(([k, w], q)=>{ const bs = q===0 ? battleSim(NB, simIn) : battleSim(NB, ({...simIn, ...{afGain: simIn.afGain*k}}));
      if(q===0){ out.bsim = bs; out.bsim.afStart = st; out.bsim.s0 = simIn.s0; if(simIn.cutW) out.bsim.cutS = true; if(simIn.turnX) out.bsim.protS = true; if(simIn.hg) out.bsim.hgS = true; }
      tot += w*bs.total; perOf(bs).forEach((v,i)=>{ perW[i] += w*v; }); });
    out.bsim.total0 = out.bsim.total; out.bsim.total = tot; out.bsim.per = perW;
    out.burstOld = out.burst; out.burst = out.bsim.total;
    /* 서가 챌린지 점수(2026-10-19, 알테마 투고 6건으로 확인): 점수 = 피해(AF 1회 999,999,999까지) × 보너스 × 10⁻⁵, 보너스 = 행동 보너스(지정 퍼스널리티를 가진 캐릭터가 AF 아닌 턴마다 1번 —
       맞는 퍼스널리티 값의 합, 피해 없는 행동이면 1.5배) + AF 1회 50 + 편성 1000(전열 전원이 지정 퍼스널리티 — 후열은 엔진이 모름). AF 턴엔 행동 보너스가 없어 AF를 안 쓰는 계획과도 비교 */
    if(+S.afScoreCap>0){ const scB = S.scoreBonus && S.scoreBonus.pers ? S.scoreBonus : null, base = ({...simIn, ...{scoreCap: +S.afScoreCap, afTailV: 0, sbHold: true}}); /* 챌린지는 N턴에서 끝 — 남은 게이지 값 없음 · sbHold: AF 안에서 찬 SB를 다음 평상 턴(상한 없음)에 쓰는 계획도 */
      const plans = [battleSim(NB, base)]; if(scB) for(const mx of [0, 1, 2]) plans.push(battleSim(NB, ({...base, ...{maxAF: mx}}))); /* AF 1회 +50 대 그 턴 행동 보너스 — AF 횟수별로 */
      const vI = team.map(c=> scB ? [...(c.pers||[])].reduce((a,p)=>a + (+scB.pers[p]||0), 0) : 0);
      const mI = team.map((c,i)=> simUse ? 1 + 0.5*Math.max(0, 1 - Math.min(1, (sim.act[i]||0) + (sim.alt[i]||0) + (sim.na[i]||0))) : 1);
      const comp = scB && vI.every(v=>v>0) ? (+scB.comp>0 ? +scB.comp : 1000) : 0, perT = vI.reduce((x,v,i)=>x + v*mI[i], 0);
      const bonusOf = pl => !scB ? null : comp + pl.turns.reduce((a,r)=> a + (r.af ? (+scB.af>0 ? +scB.af : 50) : perT), 0);
      let best = null; for(const pl of plans){ const B = bonusOf(pl), v = B!=null ? pl.total*B*1e-5 : pl.total; if(!best || v > best.v) best = {v, pl, B}; }
      out.score = {total: best.v, dmg: best.pl.total, bonus: best.B, comp: !!comp, vI, perT: +perT.toFixed(1), turns: best.pl.turns, cap: +S.afScoreCap}; out.burst = best.v; } // 성향 점수의 '실전'은 이 점수 — 처치 턴은 실제 피해(bsim)
    out.opener = NB===1 ? out.bsim.total : battleSim(1, simIn).total;
  } else { out.bsim = {total:0, turns:[], N:NB, afStart:st, s0:simIn.s0}; }
  if(needDummy && ctx && ctx.dummyFast){ // 탐색 1단계: 허수아비를 빠르게 어림(버프 다 깔린 AF + AF 끝 콤보 SB), 상위 후보만 2단계에서 정밀 계산
    const nAct = afA.nAll || afA.n, totA = Math.max(1, nAct.reduce((x,y)=>x+y,0)), sb0 = Math.min(50, 12.5*team.length), sa = S.sbPerAct!=null ? +S.sbPerAct : 2.5; // SB 게이지는 AF 안 버프 행동도(nAll, 2026-10-20 점검)
    const rateAvg = team.reduce((x,c,i)=>x + nAct[i]*sa*(sbFillOK(team, i, progs, S) ? 2 : 1), 0)/totA;
    const needA = (100 - sb0)/Math.max(0.1, rateAvg), sbOK = sbIdx.length>0 && needA <= totA + 1e-9;
    const cAt = Math.min(0.75 + gain*Math.min(1, needA/totA), S.comboCap>0?S.comboCap:Infinity);
    // 버프 행동(buff_acts): 버프 스킬을 다 쓰면 AF 행동·시간이 그만큼 빠짐 — 어림에도 반영(정밀 계산은 2단계)
    let afD = afS.v*0.85; // 허수아비는 1턴째 상태
    if(team.some(c=>c.bact && c.bact.steps.length)){
      const plan = team.map(c=> c.bact ? c.bact.steps.map(st=>st.k) : (c.buffAct ? ['buff'] : []));
      const a2 = afActionsOf(team, progs, afCores, nz, enemy, S, 100, dummyPrio(team, progs), plan, lkPlan(team.map(c=>c.bact ? c.bact.steps : [])));
      const nA = a2.n.map((v,i)=>Math.max(0, v - plan[i].length)); afD = afSum(afCores, nz, avgCombo, nA).v*0.85; }
    out.dummyT = afD + (sbOK ? (simIn.sbBurst - simIn.sbChain)*cAt : 0); out.dummy = {total:out.dummyT, fast:true, per:team.map(()=>0), order:team.map((_,i)=>i), n:afA.n}; return out; }
  if(!needDummy){ out.dummy = {total:0, af:0, sb:0, per:team.map(()=>0), afPer:team.map(()=>0), n:team.map(()=>0), order:team.map((_,i)=>i), fin:0.75, avg:0.75, acts:0, sbAt:null}; out.dummyT = 0; return out; }
  // 화면용 재계산(ctx.lazyDummy, 성향이 최고점이 아닐 때): 허수아비 1턴(가장 무거운 계산)은 카드에서 그 값을 볼 때 계산(2026-10-17 사용자 '렉 걸리고 계산이 오래 걸림')
  const dummyCalc = () => {
  // 허수아비 기록은 후열 연성 P글래 셔틀·풀장비로 잰다(사용자 확인): 보유 표시가 없으면 셔틀 2명을 가정(설정 dummyMule로 끔)
  let Ad = A;
  if(S.dummyMule!==false && !A.mule){ const m2 = muleShare(team, ({...S, ...{pglAssumeAll:true}}), ctx, progs); if(m2){ if(m2.plan) m2.wd = muleDmgW(team, progs, A, enemy, S, cx, cap); Ad = ({...A, ...{mule:m2}}); } }
  // 허수아비는 AF에서 펼칠 존을 고를 수 있다: 평상 턴 최적 존 + 다른 존 후보(존 없음 포함)를 다 돌려 가장 높은 것
  // af_timing의 zone: 'none' = AF에선 그 사람이 존을 못 폄(AF 밖 스킬·턴 종료로만 전개), 'base' = AF에선 각성(극) 없이 일반 존만
  const zAF = q => { if(!q || !q.by) return q; const m = team.find(c=>c.id===q.by);
    if(m && m.zoneVC && q.how!=='개전 자동' && q.how!=='SB 시') return {kind:'none', types:[], level:0, by:null, label:'존 없음'}; // VC(교대)로만 펴는 존은 1턴 AF에서 못 폄
    const zt = m && m.afT && m.afT.zone; if(!zt) return q;
    if(zt==='none') return {kind:'none', types:[], level:0, by:null, label:'존 없음'};
    if(zt==='base' && q.level>=2) return ({...q, ...{level:1, how:'', label:String(q.label||'').replace(/^(극|절)·/,'')}});
    return q; };
  let zc = [zAF(nz)]; for(const q0 of zSort(res.normal.zones||[])){ const q=zAF(q0); if(q && !zc.some(r=>r && r.kind===q.kind && r.key===q.key && r.level===q.level)) zc.push(q); }
  zc = zoneForce(zc, A.azPick); if(!zc.length) zc = [zAF(nz)];
  { const z0 = zc[0], zk = q => q ? (q.level||0) : -1; // 후보 순서를 넣은 순서와 무관하게(2026-10-16: 4개까지만 재고 동점이면 앞쪽이라 편성 순서에 따라 존이 바뀌던 문제)
    zc = [z0].concat(zc.slice(1).sort((a,b)=>zk(b)-zk(a) || String(a&&a.key||'').localeCompare(String(b&&b.key||'')) || String(a&&a.by||'').localeCompare(String(b&&b.by||'')))); }
  // 존 후보마다 버프 행동을 다 쓰는 계획으로 먼저 재고, 가장 높은 존에서만 버프 행동 개수를 바꿔 봄(계산량)
  let bestD = null, bestO = null; const qz = [];
  for(const zq of zc.slice(0, 4)){
    const zs2 = sameZ(res.normal.zones, zq), awC = zs2.some(q=>q.how!=='개전 자동' && q.how!=='SB 시' && q.how!=='1회 각성' && !q.once), awS = !awC && zs2.some(q=>q.how==='개전 자동');
    const teamD = Object.keys(P1.pick).length ? team.map((c,i)=> P1.pick[i]===undefined ? c : P1.pick[i] ? ({...c, ...{afSk:c.sbN, _sbN:true}}) : ({...c, ...{sbN:null}})) : team; // AF 스킬 고르기(위)를 허수아비에도
    const o = {team:teamD, progs, A:Ad, enemy, S, cx, posSets, cap, fw, nz:zq, awStart:awS, awConst:awC, sbz, sbAw:sbAw0, sbFresh:sbFr, sbIdx, sbCores:res.sb.cores, light, shadow, zcs:(res.normal.zones||[]).map(zAF), quick:true, deep:!(ctx && ctx.stFast), lkPlan: anySing ? lkPlan : null};
    const dd = dummySim(o); qz.push({dd, o});
    if(!bestD || dd.total > bestD.total*1.0005){ bestD = dd; bestO = o; }
  }
  if(bestO){ // 정밀 계산(버프 행동 개수 바꿔 보기): 가장 높은 존 + 어림이 85% 이상인 둘째 존까지(2026-10-17 점검: 어림 1위 존만 정밀하게 재서 성도각성을 더하면 최고점이 떨어지던 문제)
    const sec = qz.filter(q=>q.o!==bestO && q.dd.total >= bestD.total*0.85).sort((a,b)=>b.dd.total-a.dd.total)[0];
    bestO.quick = false; let dd = dummySim(bestO); if(dd.total < bestD.total) dd = bestD; // 같은 존이라 기억해 둔 계산을 이어 씀
    if(sec){ sec.o.quick = false; let d2 = dummySim(sec.o); if(d2.total < sec.dd.total) d2 = sec.dd; if(d2.total > dd.total*1.0005) dd = d2; }
    bestD = dd; }
  const dmy = bestD; dmy.mule = Ad.mule || null; dmy.S0 = A.tm.S0; return dmy; };
  if(ctx && ctx.lazyDummy && !md && ctx.keyMode!=='burst'){ const S0 = A.tm.S0; let cache = null; const get = () => { if(!cache){ const s1 = A.tm.S0; A.tm.S0 = S0; try{ cache = dummyCalc(); } finally { A.tm.S0 = s1; } } return cache; };
    Object.defineProperty(out, 'dummy', {configurable:true, enumerable:true, get, set(v){ cache = v; }});
    Object.defineProperty(out, 'dummyT', {configurable:true, enumerable:true, get(){ return get().total; }, set(v){ get().total = v; }});
    out.dummyLazy = true; out.dummyIfReady = () => cache; // 이미 계산했을 때만(배치·화면 표시가 계산을 일으키지 않게)
    return out; }
  out.dummy = dummyCalc();
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
  const {team, progs, A, enemy, S, cx, posSets, cap, fw, nz, awStart, awConst, sbz, sbAw, sbIdx, sbCores} = o, zcs = o.zcs || [], sbFresh = !!o.sbFresh;
  const n = team.length, prio = dummyPrio(team, progs);
  const passive = team.map(c=>c.buffHow==='passive'||c.buffHow==='auto');
  // ZONE: 개전 자동·상시 재각성은 처음부터, 그 밖엔 펼치는 사람이 행동한 뒤부터
  const zBy = nz && nz.level>0 ? team.findIndex(c=>c.id===nz.by) : -1;
  const zFrom0 = !!(nz && nz.level>0 && (awStart || nz.how==='개전 자동'));
  // 존은 하나(사용자 확인): 비어 있으면 펴고, 일반 존이 깔려 있으면 극(각성) 존만 덮어씀, 극 존은 존 파괴 없이는 못 바꿈
  const zoneOK = (cur, q) => !!(q && q.level>0) && (!cur || !cur.level || (cur.level<2 && q.level>=2) || (q.level===3 && cur.level===2 && cur.key===q.key) || (q.brk && !(cur.key===q.key && cur.level>=q.level))); // brk: 존 파괴 후 전개(zone.breaks)
  // 독·페인(글래스터 39·40행·'독 시 ○배' 스킬): 허수아비 1턴에선 실제로 건 뒤부터. inflict.json dummy —
  // start=개전 자동, main=주력 공격 뒤, skill=주력이 아닌 스킬이라 AF 행동 한 번을 그 스킬에 써야 함, 잠재 광석=그 캐릭터가 공격한 뒤
  const nE = Math.max(1, S.enemyCount||1);
  const infOn = new Set(A.inf && A.inf.ok ? A.inf.ok : team.map((c,j)=>j)); // 부여 조건(req·존)을 못 채운 캐릭터는 inflictOf에서 빠짐
  const infT = team.map((c,j)=>{ const f0=c.inflict, f = f0 && infOn.has(j) ? f0 : null, ore=!!(progs[j] && progs[j].gl && progs[j].gl.ore);
    if(!f && !ore) return null; const k = (f && f.st && nE>1 ? 0.6 : 1) * (f ? (f.p!=null ? f.p : 1) * (f.af!=null ? f.af : 1) : 1);
    const wOf = w0 => { let w = w0 || (f ? (f.when||'skill') : null); if(w==='start_sb') w = progs[j] && progs[j].sbOK ? 'start' : 'skill'; return w; };
    return {wPo: wOf(f && f.whenPo), wPa: wOf(f && f.whenPa), po: f && f.poison>0 ? k : 0, pa: f && f.pain>0 ? k : 0, ore}; });
  const infAt = (atk, ia) => { let po=0, pa=0; const at = (w, j) => w==='start' || (w==='main' && atk[j]) || (w==='skill' && ia[j]);
    infT.forEach((t,j)=>{ if(!t) return; if(at(t.wPo, j)) po=Math.max(po,t.po); if(at(t.wPa, j)) pa=Math.max(pa,t.pa);
      if(t.ore && (atk[j]||ia[j])){ po=Math.max(po,0.9); pa=Math.max(pa,0.9); } });
    return {poison:po, pain:pa}; };
  const infK = q => '|i'+Math.round(q.poison*10)+Math.round(q.pain*10)+(q.eg?'|e'+q.eg:'');
  // 속성 변환(elem_change): 건 사람이 행동한 뒤부터. act:2 = 파티 버프와 다른 스킬이라 버프 행동 다음 행동에(네코코(ES) 猫又巫女神楽)
  const egAll = A.echg ? A.echg.map(()=>'1').join('') : '';
  const all = team.map(()=>true);
  const Ad0 = ({...A, ...{dummy:true}}), full0 = team.map((c,i)=>attackerCore(team, i, progs, Ad0, enemy, S, 'af', cx, buildBF(team, progs, 'af', nz, Ad0, posSets, team.map(()=>1), true), nz)); // 행동 수·연출도 대미지(Av)와 같은 허수아비 조건으로(2026-10-19 점검: 'HP 50% 이상 재공격'이 행동 수에선 ×0.7)
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
      b = ({...b, ...{steps: b.steps.slice().sort((x,y)=>(y.z?1:0)-(x.z?1:0) || v.get(y)-v.get(x) || (y.sc||0)-(x.sc||0))}}); }
    if((j!==zBy || zFrom0) && j!==awJ && b.steps.some(st=>st.z)){ // 이 존 후보를 펴는 사람이 아니거나 존이 처음부터 깔려 있으면 존 전개·각성 행동은 효과 없음: 다른 효과(g)가 있으면 보통 행동으로, 없으면 뺌
      const st2 = b.steps.filter(st=>!st.z || st.g.size).map(st=>st.z ? ({...st, ...{z:null, sc:st.sc2}}) : st); // 순서는 그대로(존 전개였던 행동은 아래 가치 순서에서 제자리로)
      if(A.stepV && A.stepV[j]){ const v = new Map(c.bact.steps.map((st,q)=>[st.s+'|'+st.q, A.stepV[j][q]])); st2.sort((x,y)=>(v.get(y.s+'|'+y.q)||0)-(v.get(x.s+'|'+x.q)||0)); }
      else st2.sort((x,y)=>x.q-y.q);
      b = ({...b, ...{steps: st2}}); }
    if(j===zBy && !zFrom0){
      const d = b.steps.findIndex(st=>st.z==='deploy' && zkOK0(st));
      if(d>=0){ fr.push(d); if(nz && nz.level>=2 && nz.how!=='타인 각성'){ const a = b.steps.findIndex((st,q)=>q!==d && st.z==='awaken' && zkOK0(st)); if(a>=0) fr.push(a); } }
      else { const k = b.steps.findIndex(st=>sName(st.s) && zTxt.includes(sName(st.s))); if(k>=0) fr.push(k); } }
    if(j===awJ){ const a = b.steps.findIndex(st=>st.z==='awaken' || (nz.awSkill && sName(st.s)===sName(nz.awSkill))); if(a>=0) fr.push(a); }
    const e = A.echg && A.echg.find(x=>x.i===j && x.skill); if(e){ const k = b.steps.findIndex(st=>st.s===e.skill); if(k>=0 && !fr.includes(k)) fr.push(k); }
    if(!fr.length) return b;
    const steps = fr.map(k=>b.steps[k]).concat(b.steps.filter((st,k)=>!fr.includes(k)));
    return ({...b, ...{steps, nFront: fr.length}}); });
  // 존 전개·각성 행동(buff_acts z, 2026-10-16): 전개 행동이 있으면 그 행동 뒤(일반 존), 각성 행동이 따로 있으면 그 뒤 극. 같은 행동이 lv 2면 바로 극
  const zkOK = st => !st.zk || !nz || st.zk===nz.key;
  const zDep = zBy>=0 && !zFrom0 && B[zBy] ? B[zBy].steps.findIndex(st=>st.z==='deploy' && zkOK(st)) : -1;
  const zAwk = zBy>=0 && !zFrom0 && B[zBy] && nz && nz.level>=2 && nz.how!=='타인 각성' ? B[zBy].steps.findIndex(st=>st.z==='awaken' && zkOK(st)) : -1;
  const zMainZ = zBy>=0 && B[zBy] && B[zBy].zActs ? B[zBy].zActs : [];
  const zStep = zDep>=0 ? zDep : zBy>=0 && !zFrom0 && B[zBy] ? B[zBy].steps.findIndex(st=>sName(st.s) && zTxt.includes(sName(st.s))) : -1;
  const zMain = zBy>=0 && !zFrom0 && zStep<0 && (zMainZ.some(a=>a.k==='main' && a.z==='deploy') || !!(team[zBy].main && sName(team[zBy].main.skill_jp||team[zBy].main.skill) && zTxt.includes(sName(team[zBy].main.skill_jp||team[zBy].main.skill)))); // 빌드 데이터는 skill이 한국어(원문은 skill_jp, 2026-10-17 점검: 존 조건 원문과 비교가 늘 실패)
  const zRq = zStep>=0 ? B[zBy].steps[zStep].zreq : null, zRqNo = !!(zRq && zRq.kind!=='unknown' && !reqMet(zRq, team, team[zBy])); // 전개 행동의 극 조건(buff_acts req, 2026-10-16: 의협의 사냥꾼 猟人の妙手 = 전방 활/창 3명, 못 채우면 일반 존만)
  const zLv2Now = zStep>=0 && B[zBy].steps[zStep].zlv>=2 && !zRqNo; // 전개 행동 하나로 극
  const zStaged = !!nz && nz.level>=2 && !zFrom0 && !zLv2Now && (zAwk>=0 || nz.how==='타인 각성' || zMainZ.some(a=>a.z==='awaken') || zRqNo); // 일반 → 극 두 단계(극 조건을 못 채운 전개면 각성 행동이 없으면 일반 존 그대로)
  const awI = nz && nz.awBy ? team.findIndex(m=>m.id===nz.awBy) : -1, awStep = awI>=0 && B[awI] ? B[awI].steps.findIndex(st=>st.z==='awaken' || (nz.awSkill && sName(st.s)===sName(nz.awSkill))) : -1;
  const nz1 = zStaged ? ({...nz, ...{level:1, label:String(nz.label||'').replace(/^(극|절)·/,'')}}) : nz;
  const maskOf = (j, stepDone, atk, postSB) => { const b=B[j], m=new Set(b.auto); if(atk[j]) for(const x of b.main) m.add(x);
    for(let k=0;k<stepDone[j];k++) for(const x of b.steps[k].g) m.add(x); if(postSB && sbIdx.includes(j)) for(const x of b.sb) m.add(x); return m; };
  const mm = o.memo || (o.memo = {fx:new Map(), co:new Map(), bf:new Map()}), fxMemo = mm.fx, coMemo = mm.co, bfMemo = mm.bf; // 여러 행동 계획(run)·같은 존의 다시 계산이 같이 씀
  const stKey = (acted, stepDone, atk) => team.map((c,j)=> B[j] ? stepDone[j]+(atk[j]?'a':'') : (acted[j]||passive[j]?'1':'0')).join(',');
  const run = (kAct, castN, late) => { // late: SB를 게이지가 찬 순간이 아니라 그 행동(1부터) 뒤부터 — 플레이어가 고르는 시점(2026-10-19), kAct: 주력이 아닌 독·페인 스킬에 첫 공격 행동을 쓰는 캐릭터(없으면 null), castN: 캐릭터마다 쓰는 버프 행동 수(앞에서부터)
    const plan = team.map((c,j)=> B[j] ? B[j].steps.slice(0, castN[j]).map(st=>st.k) : (c.buffAct ? ['buff'] : []));
    const afA = afActionsOf(team, progs, full0, nz, enemy, S, 100, prio, plan, o.lkPlan ? o.lkPlan(team.map((c,j)=> B[j] ? B[j].steps.slice(0, castN[j]) : [])) : null);
    const isStepOf = (i, c2) => c2[i] < plan[i].length;
    // 글래스터 장착은 AF 전체에서 걸려 있는 비율(뒤 행동일수록 콤보가 커서 가중)로 고름
    { const c2=team.map(()=>0), at=team.map(()=>false), ia=team.map(()=>false); let w=0, sp=0, sa=0; const L=afA.seq.length;
      afA.seq.forEach((a,q)=>{ const i=a.i, bo = isStepOf(i, c2), isInf = i===kAct && !ia[i] && !bo;
        if(!bo && !isInf){ const st=infAt(at, ia), wq = 1 + q/Math.max(1,L); w+=wq; sp+=wq*st.poison; sa+=wq*st.pain; }
        c2[i]++; if(isInf) ia[i]=true; else if(!bo) at[i]=true; });
      var Av = ({...A, ...{_ecFix:true, dummy:true, eqOff:null, infPick:{poison: w>0?sp/w:0, pain: w>0?sa/w:0}, postSB:false, afN: afA.n.map((v,j)=>Math.max(1, v - (plan[j]||[]).length))}}); } // afN: 공격 행동 수(자원 소비형 상태)
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
      const tAlt = team.map((m,k)=> k===i ? ({...m, ...{main:m.mainAlt, alts:null, _alt:true, _proxy:true}}) : m);
      const co = attackerCore(tAlt, i, progs, Av, enemy, S, 'af', cx, FX, z); coMemo.set(key, co); return co; };
    const stepCoreAt = (st, z, i, inow, s0) => { const k0 = 'af|'+stKey(st.acted, st.stepDone, st.atk)+'|'+(z?z.key+':'+z.level:'-')+(Av.postSB?'|P':'')+infK(inow)+pk, key = 'stp|'+k0+'|'+i+'|'+s0.s; if(coMemo.has(key)) return coMemo.get(key);
      coreAt(st, z, 'af', i, inow); const FX = fxMemo.get(k0); const m = team[i].main || {};
      const pw = s0.pw, pk2 = pw && pw.wt ? (pw.wt==='magic' ? 'mag' : 'phys') : (m.kind==='mag'?'mag':'phys');
      const sk = {skill:s0.s, target:m.target==='st'?'st':'aoe', kind:pk2, stat: pk2===(m.kind==='mag'?'mag':'phys') && m.stat ? m.stat : (pk2==='mag'?'int':'pwr'),
        element: pw && pw.el ? pw.el : (m.element||team[i].elem||'none'), weapon_type: pw && pw.wt ? pw.wt : (m.weapon_type||null),
        size: pw ? pw.size : 'xl', mult: pw ? Math.max(0.1, pw.mult) : 1, hits: Math.max(1, pw ? pw.hits : (s0.h||1)), repeat:0, crit_sure:false, def_ignore:false, barrier_pierce:false, af_combo_x: pw && pw.afx ? pw.afx : 1, condition:''}; // 위력 자료가 없으면 특대 1배
      const t2 = team.map((q,k)=> k===i ? ({...q, ...{main:sk, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}}) : q);
      const co = attackerCore(t2, i, progs, Av, enemy, S, 'af', cx, FX, z); coMemo.set(key, co); return co; };
    const onceCoreAt = (st, z, i, inow, e) => { const k0 = 'af|'+stKey(st.acted, st.stepDone, st.atk)+'|'+(z?z.key+':'+z.level:'-')+(Av.postSB?'|P':'')+infK(inow)+pk, key = 'once|'+k0+'|'+i+'|'+e.name; if(coMemo.has(key)) return coMemo.get(key);
      coreAt(st, z, 'af', i, inow); const FX = fxMemo.get(k0); const a = e.atk;
      const sk = {skill:e.name||'1회', target:a.target==='st'?'st':'aoe', kind:a.kind==='mag'?'mag':'phys', stat:a.stat||(a.kind==='mag'?'int':'pwr'), element:a.element||team[i].elem||'none', weapon_type:a.weapon_type||null, size:a.size||'xl', mult:Math.max(0.1,+a.mult||1), hits:Math.max(1,+a.hits||1), repeat:+a.repeat||0, crit_sure:!!a.crit_sure, def_ignore:!!a.def_ignore, barrier_pierce:!!a.barrier_pierce, af_combo_x:+a.af_combo_x||1, condition:''};
      const t2 = team.map((q,k)=> k===i ? ({...q, ...{main:sk, afSk:null, sbN:null, mainAlt:null, alts:null, _alt:true, _proxy:true}}) : q);
      const co = attackerCore(t2, i, progs, Av, enemy, S, 'af', cx, FX, z); coMemo.set(key, co); return co; };
    const cUsed = team.map(()=>new Set()), usedSk = team.map(()=>new Set()); const shockNow = () => { let v = 0; team.forEach((c,j)=>{ if(!atk[j]) return; for(const q of (c.states||[]).slice(0,3)) if(q && +q.shock>0) v = Math.max(v, +q.shock*stUp(q, 'af', A, c, j, team, zCur)); }); return v; }; // 感電: 건 사람(放電)이 공격한 뒤 // AF 콤보 조건 공격을 이번 AF에 썼는지 · 이번 AF에 쓴 스킬(콤보: 처음 쓰는 스킬 5%)
    const acted = team.map(()=>false), per = team.map(()=>0), cnt = team.map(()=>0), mu = team.map(()=>0), atk = team.map(()=>false), ia = team.map(()=>false), stepDone = team.map(()=>0); // mu: 주력 사용 횟수(횟수 제한 스킬용)
    const st = {acted, stepDone, atk};
    // 속성 변환은 건 사람이 그 스킬을 쓴 뒤부터(elem_change.skill이 버프 행동에 있으면 그 행동 뒤, 없으면 act 수만큼 행동한 뒤)
    let mainAtk = team.map(()=>0);
    const egOf = () => A.echg ? A.echg.map(e=>{ if(e.to==='self' || passive[e.i]) return '1';
      const b=B[e.i]; if(b && e.skill){ const k=b.steps.findIndex(x=>x.s===e.skill); if(k>=0) return stepDone[e.i] > k ? '1' : '0'; }
      return cnt[e.i] >= ((+e.act||1) > 1 && team[e.i].buffAct ? 2 : 1) ? '1' : '0'; }).join('') : '';
    let combo = 0.75, af = 0, cw = 0, sbG = Math.min(50, 12.5*o.team.length); const ssF = z => S.starseaZone!==false && S.starseaAF!==false && isSS(z) ? 2 : 1; // 허수아비 AF는 100%에서 켬 → 성해진이면 SB도 ×2
    let sbAt = null, sb = 0, zCur = zFrom0 ? nz : null; const sbPer = [], sbCo = {}, used = team.map(()=>[]);
    for(const a of afA.seq){
      const i = a.i, c = team[i];
      const buffOnly = isStepOf(i, cnt), isInf = i===kAct && !ia[i] && !buffOnly;
      const zNow = zCur, inow = Object.assign(infAt(atk, ia), {eg: egOf()});
      if(!buffOnly && !isInf){
        const useAlt = c.mainAlt && mu[i] >= c.main.uses && !c.afSk; if(!useAlt) mu[i]++;
        let co = useAlt ? altCoreAt(st, zNow, i, inow) : coreAt(st, zNow, 'af', i, inow);
        if(!atk[i] && c.once){ const cN = Math.min(combo, cmax); let bd = co ? applyZoneCap(co, zNow, S, cap, cN)*fw(co) : 0; // 전투 중 1회·첫 사용 강공격은 첫 공격 행동에(더 셀 때)
          for(const e of c.once){ if(e.af===false || e.combo || !onceOK(e, i, team, progs, zNow, A)) continue; const c2 = onceCoreAt(st, zNow, i, inow, e); const d2 = c2 ? applyZoneCap(c2, zNow, S, cap, cN)*fw(c2) : 0; if(d2 > bd){ bd = d2; co = c2; } } }
        if(co && c.once) for(const e of c.once){ if(!(+e.combo>0) || cUsed[i].has(e.name) || combo + 1e-9 < +e.combo) continue; // AF 콤보 배율 조건 통상 공격(AF 1회, 2026-10-17: 플람라피스(ES) アム・ティンハル 600%·에이미 슈퍼 콤보 1000%)
          const cN = Math.min(combo, cmax), c2 = onceCoreAt(st, zNow, i, inow, e); if(c2 && applyZoneCap(c2, zNow, S, cap, cN)*fw(c2) > applyZoneCap(co, zNow, S, cap, cN)*fw(co)){ co = c2; cUsed[i].add(e.name); break; } }
        if(co){ const d = applyZoneCap(co, zNow, S, cap, Math.min(combo, cmax))*fw(co); af += d; per[i] += d; cw += d*Math.min(combo,cmax);
          combo += comboInc(co, S, !usedSk[i].has(co.skill), shockNow()); usedSk[i].add(co.skill); }
      } else if(buffOnly && B[i]){ const s0 = B[i].steps[stepDone[i]]; used[i].push(s0.s);
        if(s0.k==='attack'){ const co = stepCoreAt(st, zNow, i, inow, s0); // 주력 아닌 공격 버프기: buff_acts 위력(pw), 없으면 특대 1배·데이터 타수(주력과 같은 속성·종류)
          if(co){ const d = applyZoneCap(co, zNow, S, cap, Math.min(combo, cmax))*fw(co); af += d; per[i] += d; cw += d*Math.min(combo,cmax); combo += comboInc(co, S, !usedSk[i].has(co.skill), shockNow()); usedSk[i].add(co.skill); } } }
      acted[i] = true; if(buffOnly && B[i]) stepDone[i]++; cnt[i]++; sbG += sbRate[i]; if(isInf) ia[i] = true; else if(!buffOnly){ atk[i] = true; mainAtk[i]++; }
      if(i===zBy && nz && (zStep>=0 ? stepDone[i] > zStep : zMain ? atk[i] : true)){ const zt = zStaged ? nz1 : nz; // 존 전개 스킬을 쓴 뒤
        if(zoneOK(zCur, zt) && !(zCur && zCur.key===zt.key && zCur.level>=zt.level)) zCur = zt; }
      if(zStaged && zCur && zCur.key===nz.key && zCur.level<nz.level){ // 각성: 자기 각성 행동 뒤 / 주력 각성이면 두 번째 공격 뒤 / 남이 각성하면 그 사람의 각성 행동 뒤
        const awDone = nz.how==='타인 각성' ? (awI>=0 && (awStep>=0 ? stepDone[awI] > awStep : acted[awI])) : zAwk>=0 ? stepDone[zBy] > zAwk : mainAtk[zBy] >= (zMain ? 2 : 1);
        if(awDone) zCur = nz; }
      if(!buffOnly && !isInf && c.zoneSet){ const zc = zcs.find(q=>q && q.by===c.id && q.level>0); if(zoneOK(zCur, zc)) zCur = zc; }
      if(sbAt==null && sbIdx.length && sbG >= 100 - 1e-9 && (!late || afA.seq.indexOf(a)+1 >= late)){ // AF 도중 SB: 지금 콤보, 지금까지 깔린 버프
        sbAt = afA.seq.indexOf(a)+1;
        const sbZOK = !!(sbAw && sbz) && !(sbFresh && zCur && zCur.key===sbz.key) && (zoneOK(zCur, sbz) || (zCur && zCur.key===sbz.key)); // 극 존은 다른 존으로 못 바꿈, sb_fresh면 같은 존이 깔려 있으면 극 안 됨
        const zSB = sbZOK ? sbz : zCur, inow2 = Object.assign(infAt(atk, ia), {eg: egOf()});
        for(const j of sbIdx){ const co = coreAt(st, zSB, 'sb', j, inow2); if(!co) continue; const d = applyZoneCap(co, zSB, S, cap, Math.min(combo, cmax))*fw(co)*ssF(zSB); sb += d; per[j] += d; sbPer.push([j, d]); sbCo[j] = {co, z:zSB, combo:Math.min(combo, cmax)}; }
        if(sbZOK) zCur = sbz; // SB로 각성한 존은 남은 AF 동안
        Av.postSB = true; // SB로 건 버프(연격수+1·심안·크리 대미지 등)는 남은 AF 행동에도
      }
    }
    Av.postSB = false;
    const stAll = {acted: all, stepDone: team.map((c,j)=> B[j] ? castN[j] : 0), atk: all};
    const full = team.map((c,i)=>coreAt(stAll, nz, 'af', i, Object.assign(infAt(all, team.map((_,j)=>j===kAct)), {eg: egAll})));
    const fin = Math.min(combo, cmax);
    /* 허수아비는 AF 총 피해 상한 없음(사용자 확인 2026-10-20: 허수아비는 조 단위로 나오고, 실전에서만 AF 피해가 9999억으로 표시) */
    return {total: af + sb, af, sb, afPer: per.map((v,i)=>v - sbPer.filter(x=>x[0]===i).reduce((q,x)=>q+x[1],0)), per, n: cnt, avg: af>0 ? cw/af : 0.75, fin,
      sbCombo: null, sbAt, lv: nz && nz.level>=2 && zFrom0 ? 2 : (nz ? nz.level : 0), sbWhen: sbAt!=null ? 'af' : null,
      sbGauge: Math.min(100, sbG), sbNeed: sbIdx.length>0 && sbAt==null, acts: afA.seq.length, order: prio, ex: 0, dur: afA.dur,
      full, zFull: nz, sbCo, inf: {pick: Av.infPick, act: kAct}, buffUsed: used, castN: castN.slice()}; // 계산 근거 화면용: 버프가 다 깔린 AF 중 1회 공격(평상 존), SB 공격
  };
  // 버프 행동 고르기: 전부 쓰는 것에서 시작해 캐릭터마다 앞에서 몇 개만 쓰는 쪽(0개 포함)이 더 높으면 바꿈(한 바퀴)
  // 버프·디버프에 쓸 수 있는 스킬 칸 → 앞에서부터 쓸 수 있는 행동 수(통상 공격 칸 행동 na는 칸을 안 씀)
  const slotF = team.map((c,j)=>{ const L = skillSlots(c, progs[j]); if(!B[j]) return L; let k=0; const nm = new Set(), fr = freeSk(c, progs[j]); for(const st of B[j].steps){ if(!st.na){ const n = skN(st.s) || ('#'+k); if(!nm.has(n) && !fr.has(n)){ if(nm.size>=L) break; nm.add(n); } } k++; } return k; }); // 같은 이름 행동은 칸 하나
  const isDps = j => (team[j].roles||[]).includes('dps');
  /* 버프 행동 수(2026-10-18 다시): 행동 수 하나 차이로 AF가 SB 게이지 100%에 닿느냐가 갈려 값이 들쭉날쭉(셴화·야쿠모(AS)·애니 덱: 1·1·2·2 = 496억, 이웃 1·2·2·2 = 123억)
     → 시작점 둘(전부 쓰기 / 딜러 0·서포터 1)에서 한 사람씩 바꾸기를 나아지지 않을 때까지(최대 2바퀴 — 90조합 시험에서 3바퀴와 같음), 서포터도 0개 후보(애니 0개가 522억) */
  const optsOf = j => { const L = B[j] ? B[j].steps.length : 0; if(!L) return [];
    const opts = L>=3 ? [0, 1, 2, L] : L>=2 ? [0, 1, 2] : [0, 1]; // 2개까지(2026-10-16: 뇌 파티처럼 버프 행동이 많은 조합은 2개 쓰는 쪽이 가장 높은 경우가 많음) + 전부
    if(B[j].nFront && B[j].nFront < L){ if(!opts.includes(B[j].nFront)) opts.push(B[j].nFront); if(B[j].nFront+1 < L && !opts.includes(B[j].nFront+1)) opts.push(B[j].nFront+1); } // 존 전개·각성(속성 변환) 행동까지만 쓰는 계획
    return [...new Set(opts.map(k=>Math.min(k, slotF[j])))]; };
  const memo = new Map(), runM = cn => { const k = cn.join(); if(!memo.has(k)) memo.set(k, run(null, cn)); return memo.get(k); };
  const descend = cn0 => { let cN = cn0, bst = runM(cN);
    if(!o.quick) for(let pass=0, np=o.deep===false ? 1 : 2; pass<np; pass++){ let moved = false;
      for(const j of prio) for(const k of optsOf(j)){ if(k===cN[j]) continue; const cn = cN.slice(); cn[j] = k; const r = runM(cn); if(r.total > bst.total*1.0005){ bst = r; cN = cn; moved = true; } }
      if(!moved) break; }
    return [bst, cN]; };
  let [best, castN] = descend(team.map((c,j)=> B[j] ? Math.min(B[j].steps.length, slotF[j]) : 0));
  if(!o.quick && o.deep!==false){ // 두 번째 시작점(2026-10-18, 탐색 어림 단계 stFast에선 한 바퀴·시작점 하나 — 오르기 탐색이 정밀 허수아비를 수천 번 부름, 마지막 상위 80개·화면은 둘 다): 딜러 0개·서포터 1개(존 전개 행동까지는 씀)에서 한 바퀴 — '전부 쓰기'에서 시작한 한 바퀴가 나쁜 곳에 멈추는 일(셴화·야쿠모(AS) 덱 −15%)
    const s2 = team.map((c,j)=>{ const L = B[j] ? B[j].steps.length : 0; if(!L) return 0; let k = isDps(j) ? 0 : 1; if(B[j].nFront && B[j].nFront > k) k = B[j].nFront; return Math.min(k, L, slotF[j]); });
    if(s2.some((v,j)=>v!==castN[j])){ const [b2, c2] = descend(s2); if(b2.total > best.total*1.0005){ best = b2; castN = c2; } } }
  // 주력이 아닌 스킬로 독·페인을 거는 캐릭터: 첫 공격 행동을 그 스킬에 쓰는 쪽과 안 쓰는 쪽 중 높은 것
  const base = infAt(all, team.map(()=>false));
  const cands = infT.map((t,j)=>t && ((t.wPo==='skill' && t.po>0 && base.poison<t.po) || (t.wPa==='skill' && t.pa>0 && base.pain<t.pa)) ? j : -1).filter(j=>j>=0)
    .sort((x,y)=>(infT[y].po+infT[y].pa)-(infT[x].po+infT[x].pa) || prio.indexOf(x)-prio.indexOf(y)).slice(0,2);
  let bestK = null; if(!o.quick) for(const k of cands){ const r = run(k, castN); if(r.total > best.total*1.0005){ best = r; bestK = k; } }
  if(!o.quick && best.sbAt!=null){ const f0 = best.sbAt, N0 = best.acts, nq = o.deep===false ? 5 : 10; // best = run(bestK, castN) 그대로(예전엔 한 번 더 돌림), 탐색 어림 단계(deep false)는 5등분 — SB를 미루는 쪽(게이지가 일찍 차면 SB 콤보가 낮고, 너무 늦으면 SB 뒤 버프를 못 받음 — 시작 게이지 50%로 바로잡은 뒤): 남은 행동을 10등분
    for(const q of [...new Set(Array.from({length: nq}, (_, x)=>Math.round(f0 + (N0 - f0)*(x+1)/nq)))]){ if(q<=f0) continue; const r = run(bestK, castN, q); if(r.sbAt!=null && r.total > best.total*1.0005) best = r; } }
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
  if(f.kind==='elem') return co.el===f.v && (!!f.conv || co.elN==null || co.elN===f.v); // 속성 지정: 원래 그 속성인 공격만(사용자 2026-10-17: 물덱은 베르단타·엘실처럼 물 캐릭터로 — 남의 속성 변환으로 물이 된 공격은 f.conv일 때만)
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
const cvForeign = (c, F) => !!(F && F.kind==='elem' && !F.conv && cvTo(c, F) && !charFocusMatch(c, F));
const cvAll = c => !!(c && c.echange && c.echange.to==='all' && !c.echange.sb); // 아군 전체 속성 변환 담당(네코코(ES)·네코코(AS)·에니·아르카디아 4명 조건 캐릭터)
// 변환 필터(사용자 2026-10-17 '결현현이나 보스 등에도 네코코 필터'): 속성 지정이면 다른 속성 변환 담당만, 그 밖의 성향은 noConv(속성 변환 캐릭터 빼기)면 변환 담당 전부 후보에서 뺌
const cvBlock = (c, ctx) => !!(ctx && ((ctx.noConv && cvAll(c)) || cvForeign(c, ctx.focus))); // 변환 미포함(사용자 2026-10-17 '네코코 미포함으로 했는데 포함됨'): 다른 속성의 아군 전체 변환 담당(네코코(ES) 등)은 원래 속성 덱에 넣지 않음
function focusN(team, F){
  if(F && F.kind==='elem' && F.conv && team.some(c=>cvTo(c, F) && (!c.echange.req || reqMet(c.echange.req, team, c))) && teamZoneEl(team, F.v)) return team.length; // 변환 덱은 F.conv일 때만
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
    const dv=new Map(dealers.map(i=>[i,1])); const tgt=new Set(), badN = [];
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
        if(v/Math.max(r.x,1e-9) < 0.95 && r.note && !badN.includes(r.note)) badN.push(r.note);
      }
    });
    const vals=[...dv.values()];
    const lo=vals.length?Math.min(...vals):1, hi=vals.length?Math.max(...vals):1;
    const txt = (c.raw.party_buff||{}).restrict || (p.scope==='adjacent'?'양옆 아군만':'') || badN.join(' / '); // 2026-10-18: 제한 문구가 없으면 덜 받는 규칙의 메모(note 앞부분) — 예전엔 '버프 조건 미충족 —' 뒤가 비었음
    notes.push({j, name:c.name, text:txt, lvl: lo>=0.95?'ok':hi<0.3?'off':'part', to:[...tgt].map(i=>team[i].name), toIdx:[...tgt]});
  });
  // 추천 배치: 위치 지정 버프가 가장 많이 성립하는 좌→우 순서. 같으면 버퍼·서포터를 왼쪽, 딜 비중 큰 딜러를 오른쪽
  // (AF는 쿨타임이 끝난 캐릭터를 왼쪽부터 자동 선택해서, 왼쪽 버퍼가 먼저 버프·디버프·ZONE을 깔고 오른쪽 딜러가 받는다)
  const dmyX = ev.dummyLazy ? ev.dummyIfReady() : ev.dummy; // 화면용 지연 계산이면 계산된 경우만
  const dper = (dmyX && dmyX.per && dmyX.per.length===team.length) ? dmyX.per : per;
  const dtot = dper.reduce((a,b)=>a+b,0)||1;
  const giveW = team.map((c,i)=>{ const p=c.party||{}, d=c.deb||{}; let g = 1 - (dper[i]||0)/dtot;
    if(c.zoneTypes) g += 0.3; if(Object.values(p).some(v=>typeof v==='number'?v>0:v&&typeof v==='object'?Object.values(v).some(x=>x>0):!!v)) g += 0.2;
    if(Object.values(d).some(v=>typeof v==='number'?v>0:!!v)) g += 0.1; return g; });
  if(dmyX && Array.isArray(dmyX.order) && dmyX.order.length===team.length) dmyX.order.forEach((i,r)=>{ giveW[i] = team.length - r; }); // 허수아비 AF 시뮬레이션의 행동 순서와 같게
  const leftScore = pm => pm.reduce((a,m,slot)=>a + giveW[m]*(pm.length-slot), 0);
  const rel=[];
  if(posSets) team.forEach((c,j)=>{ if(!posSets[j]) return; c.rules.list.forEach((r,ri)=>{ const ps=posSets[j][ri]; if(!ps) return; ps.forEach(i=>{ if(i!==j) rel.push({j,i,side:r.side}); }); }); });
  let order=[0,1,2,3].slice(0,team.length), okN=-1;
  // 개전 자동 존(같은 등급 여럿): 고른 전개자가 나머지보다 왼쪽이어야 그 존이 깔림 — 배치에서 가장 먼저 지킴
  const azI = ev.azBy && Array.isArray(ev.azBys) ? team.findIndex(c=>c.id===ev.azBy) : -1, azO = azI>=0 ? ev.azBys.filter(id=>id!==ev.azBy).map(id=>team.findIndex(c=>c.id===id)).filter(i=>i>=0) : [];
  const azOK = pm => { if(azI<0) return 1; const p0 = pm.indexOf(azI); return azO.every(i=>pm.indexOf(i) > p0) ? 1 : 0; };
  if(!rel.length && azI>=0){ const perms=[]; const permute=(a,l)=>{ if(l===a.length){ perms.push(a.slice()); return; } for(let k=l;k<a.length;k++){ [a[l],a[k]]=[a[k],a[l]]; permute(a,l+1); [a[l],a[k]]=[a[k],a[l]]; } };
    permute(team.map((_,i)=>i),0); let bz=-1, bl=-1;
    for(const pm of perms){ const z = azOK(pm), L = leftScore(pm); if(z>bz || (z===bz && L>bl+1e-9)){ bz=z; bl=L; order=pm; } }
    return {notes, order, posOk:0, posTotal:0, rel:[], giveW, az:{by:azI, others:azO}}; }
  if(rel.length){
    const perms=[]; const permute=(a,l)=>{ if(l===a.length){ perms.push(a.slice()); return; } for(let k=l;k<a.length;k++){ [a[l],a[k]]=[a[k],a[l]]; permute(a,l+1); [a[l],a[k]]=[a[k],a[l]]; } };
    permute(team.map((_,i)=>i),0);
    const uniq=new Map(); rel.forEach(x=>uniq.set(x.j+'-'+x.i+'-'+(x.side||''),x));
    const R2=[...uniq.values()];
    let bestL=-1, bestZ=-1, okFree=-1;
    for(const pm of perms){
      const pos=[]; pm.forEach((m,slot)=>pos[m]=slot);
      let ok=0; for(const x of R2){ const d=pos[x.i]-pos[x.j]; if(x.side==='r'?d===1 : x.side==='l'?d===-1 : Math.abs(d)===1) ok++; }
      const L=leftScore(pm), z=azOK(pm); if(ok>okFree) okFree=ok;
      if(z>bestZ || (z===bestZ && (ok>okN || (ok===okN && L>bestL+1e-9)))){ bestZ=z; okN=ok; order=pm; bestL=L; }
    }
    return {notes, order, posOk:okN, posTotal:R2.length, rel:R2, giveW, az: azI>=0 ? {by:azI, others:azO, posLost: okFree - okN} : null};
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
    + pct(d.all_elem_res)*1.2 + pct(d.phys_res)+pct(d.mag_res)*0.6 + (c.zoneTypes?(c.zoneAwak?1.2:0.6):0) + (c.breakT?(BRK_ONCE.has(c.breakT)?0.1:0.4):0) + (c.weakExpose?0.8:0);
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
  const scored = owned.map(o=>({...o, ...{pot:soloPotential(o.pc,o.prog,enemy,S,cap,ctx)}}));
  const lockedSet = new Set(locked);
  const pick = new Map();
  scored.filter(o=>lockedSet.has(o.pc.id)).forEach(o=>pick.set(o.pc.id,o));
  const F = ctx&&ctx.focus;
  const free = scored.filter(o=>!lockedSet.has(o.pc.id) && !cvBlock(o.pc, ctx)); // 꼭 쓸 캐릭터로 고르면 변환 담당도 그대로
  const add = (key,n,src)=>{ (src||free).slice().sort((a,b)=>b.pot[key]-a.pot[key]).slice(0,n).forEach(o=>pick.set(o.pc.id,o)); };
  if(F){
    // 지정 속성·타입 공격자 + 그 속성·타입 존 담당 + 버퍼·생존 보강
    const fm = free.filter(o=>charFocusMatch(o.pc,F));
    add('dps', 20, fm);
    const cv = F.conv ? free.filter(o=>cvTo(o.pc, F)) : []; // 아군 전체 속성 변환 담당 — 변환 덱(F.conv)이면 다른 속성 딜러·탱커도 지정 속성으로 침
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
    const fb = o=> F && (charFocusMatch(o.pc,F) || (F.conv && cvTo(o.pc,F))) ? 1.5 : 1;
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
  if(mode==='boss'){ // 보스 '턴 단축'(2026-10-17 사용자: 턴 단축·안정성 두 가지로): 실전 N턴 총딜·지속 딜 위주, 생존은 너무 낮을 때만 감점(×0.85)
    const n = (boss&&boss.needs)||{};
    let w={b:0.55,s:0.4,t:0.05};
    if(n.burst) w.b+=0.1;
    if(n.sustain) w.s+=0.1;
    const tl = boss && boss.threat ? +boss.threat.lvl||0 : 0; if(tl>=3) w.t+=0.2; else if(tl>=2) w.t+=0.08; // 보스 공격이 강하면(2026-10-18 사용자: 갑개룡처럼 아픈 보스는 탱커 필요) 생존도
    return w;
  }
  if(mode==='boss_score') return {b:0.9, s:0, t:0.1}; // 턴 제한 안 최대 딜(서가 챌린지 5턴, 2026-10-18 사용자)
  if(mode==='boss_stable'){ // 보스 '안정성': 생존 위주 + 깰 수 있을 만큼의 딜
    const n = (boss&&boss.needs)||{};
    let w={b:0.2,s:0.25,t:0.55};
    if(n.sustain) w.t+=0.1;
    if(boss && boss.threat && +boss.threat.lvl>=3) w.t+=0.1;
    return w;
  }
  return {b:0.5,s:0.5,t:0};
}

/* 예상 처치 턴(2026-10-17 사용자: 보스는 턴 안에 못 깨는 경우도 있어 보유 덱 기준 예상 턴수를 넉넉하게): 보스 HP(억) × 1.3(기믹·방어 페이즈 여유)을
   실전 N턴 턴별 대미지 → 그 뒤는 지속 딜(턴당)로 채우는 턴. 부위별 통하는 공격(parts)이 있으면 그 효율만큼 대미지를 줄임 */
function killTurns(ev, boss, margin){
  if(!boss || !ev) return null;
  const hm = (boss.hp_model && (+boss.hp_model.bars>1 || boss.hp_model.reset || +boss.hp_model.kt_min>0 || (boss.hp_model.dmg_cut||[]).length || (boss.hp_model.stopper||[]).length || boss.hp_model.protect)) || (Array.isArray(boss.hitgim) && boss.hitgim.length) ? (boss.hp_model || {}) : null;
  if(hm) return killTurnsM(ev, boss, hm);
  if(!(+boss.hp>0)) return null;
  const need = +boss.hp*1e8*(margin||1.3), pf = partsEff(ev, boss), turns = (ev.bsim && ev.bsim.turns) || [], sus = Math.max(0, +ev.sustain||0)*pf;
  const fin = x => ({t: Math.min(99, Math.max(+boss.kt_min||0, x.t + (+boss.kt_extra||0))), sure: x.sure}); // kt_extra·kt_min: 보스 흉성(피해 경감 턴·최소 턴)
  let cum = 0, t = 0; for(const r of turns){ t++; cum += Math.max(0, +r.d||0)*pf; if(cum >= need) return fin({t, sure:true}); }
  if(!(sus>0)) return {t:99, sure:false};
  const more = Math.ceil((need - cum)/sus); return fin({t: Math.min(99, t + more), sure: t + more <= 99});
}
/* 보스 HP 구조(2026-10-18, 사용자: '부활도 하고 갑개룡같이 풀피 다 까는 기준 40스택에서 5 감소 — 한 번 죽인다고 끝이 아님'): boss.hp_model
   {bar 한 번에 깎아야 할 HP(억), bars 몇 번, reset 턴 종료 전회복(그 턴에 깎은 비율만 진행, step 단위), carry 넘친 피해가 다음 줄로 넘어가는지, kt_min, dmg_cut [{turns, x, when start|revive}]}.
   턴별 피해 = 실전 N턴 기록 → 그 뒤는 평상 턴(지속 딜의 평상 몫) + AF 주기마다 AF(긴 전투 AF) — 평균 지속 딜로 펴면 AF 한 턴에 몰린 피해가 넘쳐 버려지는 걸 못 봄. 추정 오차 여유는 피해 ÷ 1.15 */
function killTurnsM(ev, boss, hm){
  const seq = Array.isArray(hm.bar_seq) && hm.bar_seq.length && hm.bar_seq.every(v=>+v>0) ? hm.bar_seq.map(v=>+v*1e8) : null; // 줄마다 크기가 다름(스토퍼마다 전회복: 25%·50%·75%·100%)
  const pf = partsEff(ev, boss), mg = 1.15, barsF = seq ? seq.length : Math.max(1, +hm.bars||1), bars = Math.ceil(barsF - 1e-9), bar = seq ? seq[seq.length-1] : +hm.bar>0 ? +hm.bar*1e8 : (+boss.hp>0 ? +boss.hp*1e8/barsF : 0);
  if(!(bar>0)) return null;
  const barK = k => seq ? seq[Math.min(seq.length-1, k)] : bar;
  const rec = (ev.bsim && ev.bsim.turns) || [], N = rec.length, per = Math.max(+ev.afOffG>=50 ? 1 : 2, Math.round(+ev.afTurns||4)), afOn = !ev.afOff; /* AF 턴 뒤 게이지가 50% 이상이면 매 턴 AF도(2026-10-19 점검) */
  const nD = Math.max(0, (+ev.sustainNoAF||0) + (+ev.sustainSB||0)), /* 평상 턴 한 번(SB는 주기 평균) */ aD = afOn ? Math.max(0, ev.afDrain ? +ev.afDrain.af||0 : ev.afLate ? +ev.afLate.v||0 : +ev.af||0) : 0;
  const lastAF = (()=>{ let k = 0; rec.forEach((r,i)=>{ if(r.af) k = i+1; }); return k; })();
  // 전투 중에 바뀌는 보스 존·상성(ev.zLate, evalTeam): 바뀐 뒤엔 그 단계의 평상 턴·AF 주기(턴 기준 단계의 N턴 안은 이미 합친 턴 기록)
  const ZL = Array.isArray(ev.zLate) && ev.zLate.length ? ev.zLate : null;
  const mdl = p => p ? {per: Math.max(+p.afOffG>=50 ? 1 : 2, Math.round(+p.afTurns||4)), nD: Math.max(0, (+p.sustainNoAF||0) + (+p.sustainSB||0)), aD: p.afOff ? 0 : Math.max(0, p.afDrain ? +p.afDrain.af||0 : p.afLate ? +p.afLate.v||0 : +p.af||0), dr: p.afDrain || null}
    : {per, nD, aD, dr: ev.afDrain || null};
  const M0 = mdl(null), MZ = ZL ? ZL.map(mdl) : null;
  let prog = 0; const trT = ZL ? ZL.map(()=>0) : null; // 깬 줄 수 + 지금 줄 진행 비율, HP 기준 단계가 처음 닿은 턴(2턴 뒤 일반 존 단계용)
  const phaseAt = t => { if(!ZL) return -1; let k = -1;
    ZL.forEach((p,j)=>{ if(p.from){ if(t>=p.from) k = j; return; } if(prog >= (p.after||0) + (p.hp!=null ? 1 - p.hp/100 : 0) - 1e-9){ if(!trT[j]) trT[j] = t; if(t >= trT[j] + (p.delay||0)) k = j; } });
    return k; };
  /* 보스 피해 경감(hm.dmg_cut): when 앞머리로 시점 — start(개시부터 turns턴)·revive(부활마다, revive2가 따로 있으면 1회째만)·revive2(2회째 부활부터)·always(내내).
     설명이 붙은 when('start (50% 경감 배리어 5턴)' 등)도 앞머리로 읽음(2026-10-18: 예전엔 정확히 'start'·'revive'만 읽어 결실 보스 경감 대부분이 빠졌음). 겹치면 가장 작은 x */
  const cKind = q => { const m = /^(start|revive2|revive|always)/.exec(String(q.when||'start')); return m ? m[1] : null; };
  const cuts = (hm.dmg_cut||[]).filter(q=>q && q.x!=null && +q.x>=0 && +q.x<1 && cKind(q) && !(+q.hits>0) && (+q.turns>0 || cKind(q)==='always')).map(q=>({x: isBarrierCut(q) ? pierceX(+q.x, ev.pierceS) : +q.x, turns: cKind(q)==='always' ? 99 : +q.turns, k: cKind(q)}));
  const hasRv2 = cuts.some(q=>q.k==='revive2');
  // 스토퍼(2026-10-18 사용자: '반피 까면 더 안 내려가고 기믹 발동 — 한 번에 어포로 끝낼 수 있었으면 공략이 필요 없지'): 그 HP%에 닿으면 그 턴 남은 피해는 버려짐. 목숨이 여럿이면 마지막 줄에만(stopper_all이면 모든 줄)
  const stops = seq ? [] : (hm.stopper||[]).map(Number).filter(v=>v>0 && v<100).sort((x,y)=>y-x); // bar_seq면 스토퍼가 이미 줄로 들어가 있음
  let done = 0, t = 0, hpF = Math.min(1, barsF - (bars - 1)); // 첫 줄이 덜 찬 줄(예: 3.5배 = 반 줄 + 3줄)일 수 있음
  let rem = seq ? seq[0] : bar*hpF; const reset = !!hm.reset, step = +hm.step>0 ? +hm.step : 0, carry = hm.carry===true, lcN = hm.carry_n!=null ? !!hm.carry_n : ev.lcN!=null ? !!ev.lcN : !!DEFAULT_SETTINGS.lifeCarryN, /* lcN: 평상 턴은 목숨을 깎은 뒤 다음 공격이 부활한 목숨에(부활 = 끼어드는 보스 행동, AF 중엔 못 함 — 2026-10-19 사용자 확인) */ kpt = Math.max(1, Math.round(+hm.kpt||1)); /* kpt: 한 턴에 깰 수 있는 줄 수(결실 애니 박쥐 2마리 — 전체 공격으로 둘 다, 2026-10-19) */
  const win = []; for(const q of cuts) if(q.k==='start' || q.k==='always') win.push({a:1, b:q.turns, x:q.x, st: q.k==='start'}); // 켜진 경감 구간 [a, b]턴
  const bsCut = !!(ev.bsim && ev.bsim.cutS); // 실전 N턴 기록에 개시 경감이 이미 들어감(battleSim cutW)
  const cutAt = t => win.reduce((m,w)=> t>=w.a && t<=w.b && !(w.st && bsCut && t<=N) ? Math.min(m, w.x) : m, 1);
  const cutEnd = t => win.reduce((m,w)=> t>=w.a && t<=w.b && w.x<1 ? Math.max(m, w.b) : m, 0); // 지금 경감이 끝나는 턴
  const stopOn = k => stops.length && (hm.stopper_all || k===bars-1);
  const segRem = () => { if(stopOn(done)){ const sv = stops.map(v=>v/100*bar).find(v=>v < rem - 1e-6); if(sv!=null) return rem - sv; } return rem; }; // 다음 스토퍼·줄 끝까지 남은 HP
  /* AF 시점(2026-10-18 사용자 '언제 어포 켜서 쳐야 하는지 명시'): N턴 뒤엔 AF 주기마다 준비 → 평상 턴으로도 지금 구간(다음 스토퍼·목숨 끝)을 끊을 수 있으면 AF를 아낌(스토퍼에서 남은 피해가 버려지니 새 구간에 씀).
     턴마다 기록(log): AF·SB·스토퍼·목숨 처치·존 단계 */
  /* 공격 행동 수로 오르내리는 보스 내성 단계(hm.protect {lv0, rel[Lv1..], down, up}, 2026-10-18 사용자 '마크바브는 낫잡이 넣으면 쉽게 깸'): 그 턴 피해 × rel[Lv], 턴 종료 그 턴 공격 행동(ev.actN) down 이상이면 Lv −1·up 이하면 +1, 부활하면 lv0 */
  const PR = hm.protect && Array.isArray(hm.protect.rel) && hm.protect.rel.length ? hm.protect : null, prN = PR ? PR.rel.length : 0; let plv = PR ? Math.min(prN, +PR.lv0||prN) : 0;
  const actN = ev.actN || {n: +ev.atkN||4, af: 15}, px0 = () => PR ? (+PR.rel[plv-1]>0 ? +PR.rel[plv-1] : 1) : 1;
  /* 타수로 벗기는 기믹(hgList — hp_model.hitgim + 횟수 배리어 dmg_cut hits, 2026-10-19): 턴마다 그 턴 타수(AF 턴 = AF 행동 × 타수, 평상 턴 = 평상 타수)로 스택을 깎으며 피해 × 평균 배율.
     실전 N턴 기록에 개시 기믹이 이미 들어갔으면(bsim.hgS) 그 턴은 나머지(부활 뒤 기믹)만 곱하고 개시 기믹 스택은 기록대로 */
  const HG = hgList(boss).map(g=> hgTeam(g, ev.pierceS, ev.resR)), HM = ev.hitN && Array.isArray(ev.hitN.m) && ev.hitN.m.length ? ev.hitN.m : null, HGon = HG.length>0 && !!HM, bsHG = !!(ev.bsim && ev.bsim.hgS);
  let hst = HG.map(g => (g.on||'start')==='start' && !(+g.from>1) ? hgS0(g) : null); const hAt = HG.map(g => (g.on||'start')==='start' ? Math.max(1, +g.from||1) : 0), hgRv2 = HG.some(g=>g.cut && g.on==='revive2');
  const hSeg = (k, d, n) => { const M = HM, aN = n || (ev.hitN && ev.hitN.aN) || [];
    return k==='a' ? {k, d, w: M.map((q,i)=>(+aN[i]||0)*q.h), u: M.map((q,i)=>(+aN[i]||0)*q.x), p: M.map(q=>q.pa), e: M.map(q=>q.en)}
      : k==='s' ? {k, d, w: M.map(q=>q.hS), u: M.map(q=>q.xS), p: M.map(q=>q.ps), e: M.map(q=>q.es)}
      : {k, d, w: M.map(q=>q.hN), u: M.map(q=>q.aN), p: M.map(q=>q.pn), e: M.map(q=>q.en), ch: (ev.hitN && ev.hitN.ch) || 0}; };
  let hgD0 = 0, hgD1 = 0;
  let lastT = lastAF || (N && +rec[N-1].g>=30 ? N+1-per : Math.min(N, 2)), lastK = -1; const log = []; // 실전 N턴에 AF를 안 썼고 게이지가 차 있으면 바로 다음 턴부터
  while(t < 99 && done < bars){ t++; prog = done + Math.max(0, 1 - rem/barK(Math.floor(done)));
    const k = phaseAt(t), M = k>=0 ? MZ[k] : M0, cx = cutAt(t), L = {t, af:false, sb:null, ev:[]};
    if(k!==lastK && k>=0){ L.ev.push({k:'phase', z: ZL[k].zone || null, aff: !!ZL[k].aff}); } lastK = k;
    let d0;
    if(t<=N && !(k>=0 && !ZL[k].from)){ const r = rec[t-1]; d0 = Math.max(0, +r.d||0); L.af = !!r.af; L.sb = r.sb || null; if(r.af) L.g = r.af; }
    else if(M.dr){ const f0 = +M.dr.first||0, p0 = +M.dr.per||M.per; L.af = M.aD>0 && t>=f0 && (t-f0)%p0===0; d0 = L.af ? M.aD : M.nD; }
    else { const ready = M.aD>0 && t - lastT >= M.per, ce = cx<1 ? cutEnd(t) : 0; // 피해 경감이 3턴 안에 끝나면 그때까지 AF를 아낌
      const pHold = PR && plv > 2 && Math.max(+actN.n||0, +actN.cap||0) >= (+PR.down||15); /* 내성 단계를 평상 턴으로 내릴 수 있으면 Lv2 이하에서 AF(알테마 '레벨 3이 되면 AF로') */
      L.af = ready && (reset || M.nD*pf/mg*cx*px0() < segRem() - 1e-6) && !(ce && ce - t < 3) && !pHold; if(ready && !L.af) L.hold = true; d0 = L.af ? M.aD : M.nD; }
    if(L.af) lastT = t;
    let hx = 1;
    if(HGon){ hgStart(HG, hst, hAt, t); const r = t<=N && !(k>=0 && !ZL[k].from) ? rec[t-1] : null, segs = [];
      if(r){ const aD0 = r.af ? Math.max(0, +r.afD||0) : 0, sD0 = Math.max(0, +r.sbD||0), nD0 = Math.max(0, +r.nd||0), oth = Math.max(0, d0 - aD0 - sD0 - nD0);
        segs.push(r.af ? hSeg('a', aD0 + oth, r.afN) : hSeg('n', nD0 + oth)); if(sD0>0) segs.push(hSeg('s', sD0)); }
      else segs.push(L.af ? hSeg('a', d0) : hSeg('n', d0));
      const only = r && bsHG ? (g => (g.on||'start')!=='start') : null, R = hgTurn(HG, hst, segs, HM, only); hx = d0>0 ? R.d/d0 : 1; hst = R.s;
      if(only && Array.isArray(r.hgS)) HG.forEach((g,j)=>{ if((g.on||'start')==='start') hst[j] = r.hgS[j]; });
      if(hx < 0.995) L.hg = +hx.toFixed(2); }
    const px = PR && !(t<=N && ev.bsim && ev.bsim.protS) ? (+PR.rel[plv-1]>0 ? +PR.rel[plv-1] : 1) : 1; if(PR) L.plv = plv; // 실전 N턴 기록에 이미 들어갔으면 그 턴은 곱하지 않음(단계는 그대로 따라감)
    let d = d0*pf/mg*cx*px*hx; L.d = d0; if(cx<1) L.cut = cx; if(HGon && done<bars){ const rb = t<=N && !(k>=0 && !ZL[k].from) && bsHG && rec[t-1] && +rec[t-1].hg>0 ? +rec[t-1].hg : 1; hgD0 += d0*pf/mg*cx*px/rb; hgD1 += d; } /* 기믹 없을 때 대비 비율(실전 N턴 기록은 개시 기믹이 이미 곱해져 있어 되돌림) */
    if(reset){ let p = Math.min(1, d/bar); if(step>0) p = Math.floor(p/step + 1e-9)*step; done += p; L.pr = +done.toFixed(2); if(log.length<60) log.push(L); continue; } // 턴 종료 전회복: 그 턴에 깎은 만큼만(갑개룡 초생명력)
    let kTurn = 0, stopped = false; /* AF 턴: AF 피해는 목숨 하나까지(AF 중 부활 못 함), AF가 끝난 뒤 요격·체인·턴 종료 공격(dPost)은 부활한 목숨에 — 사용자 확인 2026-10-19 */
    const rT = t<=N && !(k>=0 && !ZL[k].from) ? rec[t-1] : null, dPost = L.af && lcN && rT && d0>0 ? d*Math.min(1, ((+rT.ctrAF||0) + (+rT.teAF||0) + (+rT.teN||0))/d0) : 0; d -= dPost; let inPost = false;
    /* 목숨 넘김(lcN) 평상 턴: 피해를 공격 nA번(평상 턴 공격 행동 수)으로 나눠, 목숨을 끝낸 공격의 넘친 몫은 버림(넘친 피해는 안 넘어감) — 한 턴에 깰 목숨도 nA개까지(2026-10-19 점검) */
    const nA = Math.max(kpt, Math.round(+actN.n||4)); let lcC = lcN && !carry && !L.af, ch = lcC ? d/nA : 0;
    for(;;){
    while(d>0 && done<bars){
      if(stopOn(done)){ const sv = stops.map(v=>v/100*bar).find(v=>v < rem - 1e-6); if(sv!=null && d >= rem - sv){ rem = sv; d = 0; stopped = true; L.ev.push({k:'stop', hp: Math.round(sv/bar*100)}); if(HGon) HG.forEach((g,j)=>{ if(g.reset_on==='stop' && hst[j]!=null) hst[j] = hgS0(g); }); break; } } // 다음 스토퍼까지 깎고 그 턴 끝 · 스토퍼마다 다시 쌓는 기믹
      if(d >= rem){ if(lcC && ch>0) d = Math.max(0, d - Math.ceil(rem/ch - 1e-9)*ch); else d -= rem; done++; L.ev.push({k:'kill', n: done, last: done>=bars}); rem = barK(done);
        if(done<bars) for(const q of cuts) if((q.k==='revive' && (!hasRv2 || done===1)) || (q.k==='revive2' && done>=2)) win.push({a:t+1, b:t+q.turns, x:q.x}); // 부활한 다음 턴부터
        if(PR && done<bars) plv = Math.min(prN, +PR.lv0||prN); // 부활하면 내성 단계 처음으로
        if(HGon && done<bars) HG.forEach((g,j)=>{ const o = g.on||'start'; // 부활: 부활 뒤 기믹 켜기·다시 쌓기·끄기
          if((o==='revive' && (!(g.cut && hgRv2) || done===1)) || (o==='revive2' && done>=2)){ hst[j] = hgS0(g); hAt[j] = t+1; }
          else if(g.off==='revive2' && done>=2) hst[j] = null;
          else if(g.reset_on==='revive' && hst[j]!=null) hst[j] = hgS0(g); });
        if(!carry && !(lcN && (!L.af || inPost)) && ++kTurn >= kpt) break; } else { rem -= d; d = 0; } }
    if(inPost || !(dPost>0) || done>=bars || stopped) break; d = dPost; ch = dPost/nA; lcC = !carry; inPost = true; }
    if(PR){ const na = L.af ? actN.af : Math.max(+actN.n||0, +actN.cap||0); /* 평상 턴은 횟수를 노려 전원이 주력(실행 수 많은 공격)을 쓴다고 봄 */ if(na >= (+PR.down||15)) plv = Math.max(1, plv-1); else if(na <= (+PR.up||4)) plv = Math.min(prN, plv+1); L.acts = na; }
    L.hp = done>=bars ? 0 : Math.round(rem/barK(Math.floor(done))*100); L.n = done; if(log.length<60) log.push(L); }
  const kmin = Math.max(+hm.kt_min||0, +boss.kt_min||0), tt = Math.min(99, Math.max(kmin, t + (+boss.kt_extra||0)));
  return {t: tt, sure: done>=bars && t<99, bars: barsF, done: Math.min(barsF, +done.toFixed(2)), log, hg: HGon && hgD0>0 && hgD1/hgD0 < 0.99 ? +(hgD1/hgD0).toFixed(2) : null};
}
const S_afOK = ev => !(ev && ev.afOff);
/* 보스 '턴 단축'(2026-10-18, 추천 덱 대조: 결실 라디카에서 1턴에 잡는 불 덱보다 2턴 걸리는 덱이 1위): 예상 처치 턴(HP 아는 보스만)을 점수에 — × 처치 턴^−0.6(1턴 1, 2턴 0.66, 4턴 0.44). 같은 턴이면 원래 점수 순 */
const ktFactor = (ev, boss) => { if(ev && ev.score) return 1; /* 서가 챌린지는 처치가 아니라 5턴 점수(2026-10-19) */ const k = killTurns(ev, boss); return k && k.t>0 ? Math.pow(Math.max(1, k.t), -0.6) : 1; };
function partsEff(ev, boss){
  if(!boss || !Array.isArray(boss.parts) || !boss.parts.length) return 1;
  const per = (ev.bsim && Array.isArray(ev.bsim.per) && ev.bsim.per.length) ? ev.bsim.per : ((ev.normal && ev.normal.per) || []);
  const cs = (ev.normal && ev.normal.cores) || [], sb = (ev.sb && ev.sb.cores) || [];
  const tot = per.reduce((a,v)=>a+(v>0?v:0), 0), hpT = boss.parts.reduce((a,q)=>a+(+q.hp>0 ? +q.hp : 1), 0); if(!(tot>0)) return 1;
  let pf = 1; for(const q of boss.parts){ if(!Array.isArray(q.need) || !q.need.length) continue;
    const sh = per.reduce((a,v,i)=>{ const co = cs[i] || sb[i]; if(!co || !(v>0)) return a; const ok = q.need.some(k=> k===co.wt || k===co.el || (k==='phys' && co.kind==='phys') || (k==='mag' && co.kind==='mag')); return a + (ok ? v : 0); }, 0)/tot;
    pf = Math.min(pf, sh/((+q.hp>0 ? +q.hp : 1)/hpT)); }
  return Math.max(0.05, Math.min(1, pf));
}
/* 약점 맞춤 성향(2026-10-18, 사용자 커뮤니티 피드백 '불 약점만 정했는데 휘정진·다른 속성 덱이 1위'): 정한 약점을 실제로 때리는 덱을 우선.
   실전 N턴 캐릭터별 대미지에서 정한 약점(속성·공격 타입, 변환 뒤 속성 기준 — 약점 부여로 만든 약점은 안 셈)을 때리는 몫 → f = 0.15 + 0.85 × min(1, 몫 ÷ 0.8)^1.5(하나도 안 때리면 ×0.15, 47% ×0.53, 80% 이상 ×1) */
function weakFit(ev, enemy){
  const W = enemy ? Object.keys(enemy).filter(k=>enemy[k]==='weak') : []; if(!W.length) return {f:1, miss:[], share:null};
  const per = (ev.bsim && Array.isArray(ev.bsim.per) && ev.bsim.per.length) ? ev.bsim.per : ((ev.normal && ev.normal.per) || []);
  const cs = (ev.normal && ev.normal.cores) || [], sb = (ev.sb && ev.sb.cores) || [];
  const tot = per.reduce((a,v)=>a+(v>0?v:0), 0); if(!(tot>0)) return {f:1, miss:[], share:null};
  const sh = per.reduce((a,v,i)=>{ const co = cs[i] || sb[i]; if(!co || !(v>0)) return a; return a + (W.includes(co.el) || W.includes(co.wt) ? v : 0); }, 0)/tot;
  const f = 0.15 + 0.85*Math.pow(Math.min(1, sh/0.8), 1.5), WK = W.map(k=>ELEM_KR[k] || WT_KR[k] || k).join('·'); // 2026-10-18 강화: 물 약점에 물 47% 휘정진 덱·마 약점에 마 0% 덱이 2위에 남던 것(예전 0.35 + 0.65 × min(1, 몫 ÷ 0.75))
  return {f, share:sh, miss: sh<0.5 ? [`정한 약점(${WK})을 때리는 공격 ${Math.round(sh*100)}%`] : []};
}
function needPenalty(ev, boss){
  if(!boss||(!boss.needs && !boss.parts && !boss.threat && !boss.punish && !boss.zone_bonus)) return {f:1, miss:[]};
  const n=boss.needs||{}, d=ev.survDet||{}; let f=1; const miss=[];
  /* 부위마다 통하는 공격이 다른 보스(parts, 2026-10-17 사용자 '키마이라 볼카처럼 여러 속성이 필요한 덱에 베기팟만 추천'): 사자 = 마법만·용 = 참격만·뱀 = 전부.
     모든 부위를 같이 쓰러뜨리는 데 걸리는 시간 = 부위마다 (부위 HP ÷ 그 부위에 통하는 공격 대미지) 중 가장 긴 것 → 화력 효율 f = min(통하는 공격 비중 ÷ 부위 HP 비중)(최대 1, 최소 0.05) */
  /* 보스를 강화하는 공격(boss.punish {only_wt, only_el, only_kind, x, label}, 2026-10-18: 갑개룡 — 타격 외 공격을 맞으면 안그리·헤이트 스택으로 강해짐) → 그런 공격 비중 × x만큼 깎음 */
  if(boss.punish){ const P = boss.punish, per = (ev.bsim && Array.isArray(ev.bsim.per) && ev.bsim.per.length) ? ev.bsim.per : ((ev.normal && ev.normal.per) || []), cs = (ev.normal && ev.normal.cores) || [], sb = (ev.sb && ev.sb.cores) || [];
    const ok = co => (!P.only_wt || P.only_wt.includes(co.wt)) && (!P.only_el || P.only_el.includes(co.el)) && (!P.only_kind || co.kind===P.only_kind) && !(P.not_wt || []).includes(co.wt) && !(P.not_el || []).includes(co.el);
    const tot = per.reduce((a,v)=>a+(v>0?v:0), 0); if(tot>0){ const bad = per.reduce((a,v,i)=>{ const co = cs[i] || sb[i]; return a + (co && v>0 && !ok(co) ? v : 0); }, 0)/tot;
      if(bad>0.001){ f *= Math.max(0.2, 1 - (+P.x>0 ? +P.x : 0.6)*bad); if(bad>=0.15) miss.push(`${P.label||'보스를 강화하는 공격'} ${Math.round(bad*100)}%`); } } }
  /* 존 오라(boss.zone_bonus {keys, lv, x, label}, 2026-10-18: 결실 클로드 극·순돌진·결실 펠미나 풍왕진이면 아군 주는 피해 +50%) → 맞는 존을 쓰면 점수 × (1 + (x−1)/2) */
  if(boss.zone_bonus){ const zb = boss.zone_bonus, z = ev.normal && ev.normal.zone; if(z && z.level>=(+zb.lv||1) && (zb.keys||[]).some(k=>k===z.key || (z.types||[]).includes(k))) f *= Math.max(0.3, 1 + ((+zb.x||1) - 1)/2); } // x<1이면 그 존을 쓰면 손해(마크바브: 극·굉타진/환마진이면 보스 피해 UP)
  if(Array.isArray(boss.parts) && boss.parts.length){
    const per = (ev.bsim && Array.isArray(ev.bsim.per) && ev.bsim.per.length) ? ev.bsim.per : ((ev.normal && ev.normal.per) || []);
    const cs = (ev.normal && ev.normal.cores) || [], sb = (ev.sb && ev.sb.cores) || [];
    const tot = per.reduce((a,v)=>a+(v>0?v:0), 0), hpT = boss.parts.reduce((a,q)=>a+(+q.hp>0 ? +q.hp : 1), 0);
    if(tot>0){ let pf = 1;
      for(const q of boss.parts){ if(!Array.isArray(q.need) || !q.need.length) continue;
        const sh = per.reduce((a,v,i)=>{ const co = cs[i] || sb[i]; if(!co || !(v>0)) return a;
          const ok = q.need.some(k=> k===co.wt || k===co.el || (k==='phys' && co.kind==='phys') || (k==='mag' && co.kind==='mag')); return a + (ok ? v : 0); }, 0)/tot;
        const r = sh/((+q.hp>0 ? +q.hp : 1)/hpT); if(r<pf) pf = r;
        if(r<0.999) miss.push(`${q.label||q.need.join('·')} 공격 부족(${Math.round(sh*100)}%)`); }
      f *= Math.max(0.05, Math.min(1, pf)); } }
  /* 보스 위협(boss.threat {lvl, tank, heal}, 2026-10-18 사용자 '갑개룡도 엄청 아파서 탱커가 필요한데 추천덱엔 탱커가 없어'): 위협 3이면 탱커·회복 없이는 사실상 못 버팀 → 크게 깎음 */
  const th = boss.threat || null, tl = th ? +th.lvl||0 : 0, tankOK = d.taunt>=2 || d.guard>=2;
  if(th && th.tank && !tankOK){ f *= tl>=3 ? 0.6 : 0.8; miss.push(tl>=3 ? '탱커(도발·수호) 없음 — 보스 공격이 매우 강함' : '탱커(도발·수호) 없음'); }
  else if(n.guard && !(d.guard>=2 || d.taunt>=2 || d.barrier>=3)){ f*=0.88; miss.push('수호·도발 부족'); }
  if(th && th.heal && !(d.heal>=2 || (d.heal>=1 && d.barrier>=2))){ f *= tl>=3 ? 0.75 : 0.88; miss.push(tl>=3 ? '회복·배리어 부족 — 보스 공격이 매우 강함' : '회복 부족'); }
  if(n.cleanse && !(d.cleanse>=1 || d.status_immune>=2 || d.debuff_guard>=1)){ f*=0.9; miss.push('상태이상/디버프 해제 없음'); }
  if(n.status_immune && !(d.status_immune>=1 || d.cleanse>=2)){ f*=0.92; miss.push('상태이상 무효 없음'); }
  if(n.sustain && d.heal<2){ f*=0.9; miss.push('회복량 부족(장기전)'); }
  // 보스 반격(boss.counter {fixed, per:'attack', skip:[af,sb]}, 2026-10-18 안키 디그마 흉성 7): 평상 턴 공격 행동(연속 실행·재공격 포함)마다 아군 1명 고정 피해.
  // 공격 행동이 많을수록(턴당 6번 넘게) 회복 부족이면 위험 → 점수 감점, 6번 이상이면 경고
  if(boss.counter && +boss.counter.fixed>0 && ev.atkN>0){ const na = ev.atkN, dmg = na*(+boss.counter.fixed), over = Math.max(0, na-6);
    if(over>0) f *= Math.max(0.7, 1 - over*(d.heal>=2 ? 0.02 : 0.04));
    if(na>=6) miss.push(`보스 반격: 평상 턴 공격 약 ${Math.round(na)}회 → 턴당 약 ${Math.round(dmg).toLocaleString()} 피해${d.heal>=2?'':' (회복 부족)'}`); }
  return {f, miss};
}

/* 버디 자동(2026-10-17 사용자 '보통 모케를 쓰는데 테트라로 고정 — 버디도 유동적으로'): 후보를 효과 값으로 거른 뒤(화력 상위 3 + 생존 1) 결과 조합마다 계산해 그 성향 점수가 가장 높은 버디 */
function budDmgScore(b, burst){ let v = 0; const gx = b.gear && +b.gear.x>0 ? +b.gear.x : 1; // 후보 고르기용 어림(2026-10-17: 오토 스킬은 누적·장비 반영, 최고점(허수아비 1턴)은 오라만)
  const add = (x, w) => { if(!x || !w) return; if(Array.isArray(x)){ x.forEach(y=>add(y, w)); return; } const p = x.party||{}, d = x.deb||{}, er = Object.values(d.elem_res||{}).map(Number), ea = Object.values(p.elem_atk||{}).map(Number), wa = Object.values(p.weapon_atk||{}).map(Number), wd = Object.values(p.wt_dmg||{}).map(Number), wr = Object.values(d.weapon_res||{}).map(Number);
    v += w*((+d.phys_res||0)*0.5 + (+d.mag_res||0)*0.5 + (+d.all_elem_res||0) + (er.length ? Math.max(...er)*0.6 : 0) + (wr.length ? Math.max(...wr)*0.35 : 0) + (+p.crit_dmg||0)*0.5 + (+p.crit_rate||0)*0.15 + (+p.all_elem_atk||0)*0.8 + (ea.length ? Math.max(...ea)*0.5 : 0) + (wa.length ? Math.max(...wa)*0.35 : 0) + (wd.length ? Math.max(...wd)*0.4 : 0) + (+p.pwr||0)*0.3 + (+p.int||0)*0.3 + (+p.dmg_up||0)*0.8 + (+p.dmg||0)*0.8); };
  add(b.main, burst ? 0 : 0.6*gx); add(b.main2, burst ? 0 : 0.6*gx); add(b.aura, b.aura && b.aura.when==='post_af' ? (burst ? 0 : 0.5) : 1); add(b.sb, burst ? 0 : 0.3); add(b.sb2, burst ? 0 : 0.3);
  const g = b.gear && b.gear.fx; if(g && g.main && !burst) add(g.main, 0.6); return v; }
function budSurvScore(b){ const s = b.sup||{}; return (+s.heal||0)*3 + (+s.cleanse||0)*2 + (s.revive ? 5 : 0) + (+s.barrier||0)*2 + (+s.dmg_cut||0)*2 + (+s.guard||0)*2; }
function budCands(list, survFirst, burst, afNeed){ const L = (list||[]).filter(b=>b && b.id); if(L.length<2) return L;
  const byD = L.slice().sort((a,b)=>budDmgScore(b, burst)-budDmgScore(a, burst) || (a.id<b.id?-1:1)), byS = L.slice().sort((a,b)=>budSurvScore(b)-budSurvScore(a) || (a.id<b.id?-1:1));
  // 흉성 3(AF 게이지 매 턴 소비, 2026-10-18): 차지 스킬로 AF 게이지를 바로 채우는 버디(건스(AS)·코로보)가 있어야 AF — 차지당 게이지가 큰 버디를 맨 앞(탐색 대표)에
  const afgOf = b => [b.sb].concat(b.sb2||[]).reduce((m,x)=>Math.max(m, x && !x.req && +x.afg>0 ? +x.afg : 0), 0)/Math.max(1, +b.cost||5);
  const byA = afNeed ? L.filter(b=>afgOf(b)>0).sort((a,b)=>afgOf(b)-afgOf(a) || (a.id<b.id?-1:1)) : [];
  const out = []; for(const b of byA.slice(0,1).concat(survFirst ? [byS[0]].concat(byD.slice(0,3)) : byD.slice(0,3).concat([byS[0]]))) if(b && !out.includes(b)) out.push(b); return out; }

/* 메인 진입점. 진행 콜백을 받는 비동기 함수 */
async function optimize(input, onProgress){
  const {owned, locked=[], excluded=[], backLocked=[], mode, enemy, boss, settings, recommendedIds=[]} = input;
  const S = ({...DEFAULT_SETTINGS, ...settings||{}});
  const ctx = buildCtx(input, owned);
  ctx.mode = mode;
  // 버디 자동: 탐색은 성향에 맞는 대표 버디 하나로, 마지막 결과마다 후보를 바꿔 봄(budPickFor)
  const budAuto = Array.isArray(input.buddyAuto) && input.buddyAuto.length ? input.buddyAuto : null, budC = budAuto ? budCands(budAuto, mode==='stability', mode==='burst', !!S.afDrain) : null;
  if(budAuto && !ctx.buddy && budC.length) ctx.buddy = {main: budC[0], sub:null};
  if(mode==='opener' || mode==='weak' || mode==='boss' || mode==='kesshitsu' || mode==='custom' || mode==='all') ctx.timeline = true; // 실전(N턴 총딜)의 1턴은 속도·선제 순서
  const BR = ev => mode==='opener' ? ev.opener : mode==='burst' ? ev.dummyT : ev.burst; // 최고점 = 허수아비 어포딜, 실전(약점·보스 등) = N턴 시뮬
  if(mode==='burst') ctx.dummyFast = true; // 1단계 어림 → 상위 후보만 행동 단위 시뮬레이션
  ctx.stFast = true; // 상태 가동률(state.json)은 탐색 중엔 우세한 쪽 하나로 어림 → 마지막에 상위 80개를 ON·OFF 섞어 다시 계산
  const cap = input.cap;
  const ex = new Set(excluded.concat(backLocked));
  const own = owned.filter(o=>!ex.has(o.pc.id));
  if(own.length<4) return {error:'보유 캐릭터가 4명 이상 필요합니다. (제외 목록 포함 확인)'};
  if(ctx.focus && !own.some(o=>charFocusMatch(o.pc,ctx.focus) || (ctx.focus.conv && cvTo(o.pc, ctx.focus)))) return {error:'지정한 속성·타입으로 공격하는 보유 캐릭터가 없습니다.', results:[], evaluated:0, poolSize:0};
  const pl = input.pledge || null; // 결현현 서약
  if(pl && pl.required && !own.some(o=>o.pc.id===pl.required)) return {error:'이 보스의 필수 캐릭터를 보유하지 않았습니다(또는 제외 목록에 있음).', results:[], evaluated:0, poolSize:0};
  const lockIds = (pl && pl.required ? [pl.required] : []).concat(locked.filter(id=>!(pl&&pl.required===id))).filter(id=>own.some(o=>o.pc.id===id)).slice(0,4);
  const nRes = backOf(input);
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
    if(pi!=null) return [preV[4*pi], preV[4*pi+1], preV[4*pi+2], preV[4*pi+3]];
    const tm = idxs.map(i=>pool[i]), ev = evalTeam(tm.map(o=>o.pc), tm.map(o=>o.prog), enemy, S, cap, ctx);
    // 4번째 값 = 보스 보정(필요 요소·부위별 공격·추천 캐릭터, 2026-10-17): 탐색 중에 바로 곱함 — 예전엔 마지막에 상위 400개를 다시 계산해 보스 모드가 오래 걸렸음
    const pen = mode==='boss' ? needPenalty(ev, boss).f*(1+0.06*tm.filter(o=>recSet.has(o.pc.id)).length)*ktFactor(ev, boss) : mode==='weak' ? weakFit(ev, enemy).f : 1;
    const r = [BR(ev), ev.sustain, ev.surv, pen];
    if(shard){ newK.push(ck); newV.push(r[0], r[1], r[2], r[3]); }
    return r;
  };
  const mine = (stage, c) => !shard || STG[shard.stage]!==stage || c % shard.n === shard.k;
  const shardOut = () => ({shard:true, stage:shard.stage, keys:newK, vals:Float64Array.from(newV), evaluated:newK.length, poolSize:pool.length});
  const teams=[], raws=[], tfl=[], tkey=[];
  const addT = (idxs, key, r) => { teams.push(idxs); raws.push(r[0], r[1], r[2], r[3]!=null ? r[3] : 1); tfl.push(flg()); tkey.push(key); seen.set(key, teams.length-1); return teams.length-1; };
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
  const deckIdx = [], deckIdxC = []; // 속성덱·타입덱 후보 (전방 3명 이상이 그 속성·타입으로 공격) · 변환 덱(남의 아군 전체 속성 변환으로 그 속성이 되는 조합, 따로)
  if(!ctx.focus && input.deckSeeds!==false){
    const FOC = ELEMS.map(v=>({kind:'elem',v})).concat(['slash','blunt','pierce','magic'].map(v=>({kind:'wt',v})));
    let di = 0;
    for(let fi=0; fi<FOC.length; fi++){
      const F=FOC[fi];
      if(!own.some(o=>charFocusMatch(o.pc,F))) continue;
      const fp = buildPool(own, lockIds, {enemy,S,cap,ctx:({...ctx, ...{focus:F.kind==='elem' ? ({...F, ...{conv:true}}) : F}}),mode,maxPool:input.deckPool||10}); // 후보 풀은 변환 담당까지
      for(const o of fp) if(!posOf.has(o.pc.id)){ posOf.set(o.pc.id,pool.length); pool.push(o); }
      const lk = lockIds.map(id=>fp.findIndex(o=>o.pc.id===id)).filter(i=>i>=0);
      const fr = fp.map((_,i)=>i).filter(i=>!lk.includes(i));
      const nd = 4-lk.length;
      const it2 = nd>0 ? combos(fr.length, nd) : [[]][Symbol.iterator]();
      for(const cmb of it2){
        const mem = lk.concat(cmb.map(k=>fr[k])).map(i=>fp[i]);
        const nMatch = focusN(mem.map(o=>o.pc), F), nConv = F.kind==='elem' ? focusN(mem.map(o=>o.pc), ({...F, ...{conv:true}})) : 0; if(!nMatch && !nConv) continue; // 변환으로 지정 속성이 되는 조합은 변환 덱으로
        const key = mem.map(o=>o.pc.id).sort().join();
        const cvF = F.kind==='elem' && mem.some(o=>cvForeign(o.pc, F)); // 다른 속성 변환 담당이 낀 조합은 변환 덱으로만
        const push = ti => { if(ti<0) return; if(nMatch>=3 && !cvF) (deckIdx[fi]=deckIdx[fi]||[]).push(ti); else if(nConv>=3) (deckIdxC[fi]=deckIdxC[fi]||[]).push(ti); };
        if(seen.has(key)){ push(seen.get(key)); continue; }
        const team=mem.map(o=>o.pc);
        if(dupBase(team)){ seen.set(key, -1); continue; }
        if(!mine(1, ci++)){ seen.set(key, -1); continue; }
        const idxs = mem.map(o=>posOf.get(o.pc.id)), ti = addT(idxs, key, evalRaw(idxs, key));
        push(ti);
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
      const team = os.map(o=>o.pc); if(dupBase(team) || team.some(c=>cvBlock(c, ctx) && !lockIds.includes(c.id)) || (ctx.focus && focusN(team, ctx.focus)<3)) continue; // 속성·타입 지정이면 그 덱만(변환 미포함이면 다른 속성 변환 담당이 낀 덱 제외)
      const key = team.map(c=>c.id).sort().join();
      for(const o of os) if(!posOf.has(o.pc.id)){ posOf.set(o.pc.id,pool.length); pool.push(o); }
      let ti = seen.get(key);
      if(ti==null){ if(!mine(1, ci++)){ seen.set(key, -1); continue; } ti = addT(os.map(o=>posOf.get(o.pc.id)), key, evalRaw(os.map(o=>posOf.get(o.pc.id)), key)); }
      if(ti>=0 && !ctx.focus && input.deckSeeds!==false) FOS.forEach((F,fi)=>{ if(!own.some(o=>charFocusMatch(o.pc,F))) return;
        if(focusN(team, F)>=3 && !team.some(c=>cvForeign(c, F))){ if(!(deckIdx[fi]||[]).includes(ti)) (deckIdx[fi]=deckIdx[fi]||[]).push(ti); }
        else if(F.kind==='elem' && focusN(team, ({...F, ...{conv:true}}))>=3 && !(deckIdxC[fi]||[]).includes(ti)) (deckIdxC[fi]=deckIdxC[fi]||[]).push(ti); });
    }
  }
  if(shard && shard.stage==='scan') return shardOut();
  if(ctx.dummyFast){ // 2단계: 어림 상위 250개만 허수아비 1턴 AF를 행동 단위로 다시 계산
    ctx.dummyFast = false;
    const top = teams.map((_,i)=>i).sort((a,b)=>raws[4*b]-raws[4*a]);
    for(let r=0; r<top.length; r++){
      const i = top[r];
      if(r<250){ if(mine(2, r)){ raws[4*i]=evalRaw(teams[i], tkey[i])[0]; tfl[i]=flg(); } }
      else raws[4*i] *= 0.5; // 정밀 계산 안 한 조합은 뒤로
      if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r2=>setTimeout(r2,0)); }
    }
    if(shard && shard.stage==='dprec') return shardOut();
  }
  let mb=1e-9, ms=1e-9, mt=1e-9;
  for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[4*i]); ms=Math.max(ms,raws[4*i+1]); mt=Math.max(mt,raws[4*i+2]); }
  const w = modeWeights(mode, boss, input.weights, pl);
  // 상위 조합에서 한 명씩 바꿔 보기 (후보 풀 밖의 시너지 캐릭터 찾기)
  if(input.refine!==false && teams.length){
    const scoreOf = (b,s,tt)=>{ let sc = w.b*b/mb + w.s*s/ms + w.t*tt/mt; if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all'||mode==='boss') && tt/mt<0.25) sc*=0.85; return sc; };
    const scI = i=>scoreOf(raws[4*i],raws[4*i+1],raws[4*i+2])*raws[4*i+3];
    const order = teams.map((_,i)=>i).sort((a,b)=>scI(b)-scI(a));
    const NST = input.climbStarts||8, NCD = input.climbCand||90; const starts=[]; for(const i of order){ if(starts.length>=NST) break; const ids=new Set(teams[i]); if(starts.some(s=>s.filter(x=>ids.has(x)).length>=3)) continue; starts.push(teams[i].slice()); }
    const cand = own.filter(o=>!cvBlock(o.pc, ctx) || lockIds.includes(o.pc.id)).map(o=>({...o, ...{pot:soloPotential(o.pc,o.prog,enemy,S,cap,ctx)}})).sort((a,b)=>(b.pot.dps+b.pot.sup*0.5)-(a.pot.dps+a.pot.sup*0.5)).slice(0,NCD);
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
    for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[4*i]); ms=Math.max(ms,raws[4*i+1]); mt=Math.max(mt,raws[4*i+2]); }
  }
  if(onProgress) onProgress(1);
  if(ctx.stFast){ ctx.stFast = false; const w0 = modeWeights(mode, boss, input.weights, pl);
    const sc0 = i => { let v = w0.b*raws[4*i]/mb + w0.s*raws[4*i+1]/ms + w0.t*raws[4*i+2]/mt; if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all') && raws[4*i+2]/mt<0.25) v*=0.85; return v*raws[4*i+3]; };
    const wSt = mode==='boss' ? modeWeights('boss_stable', boss) : null, scS0 = i => wSt.b*raws[4*i]/mb + wSt.s*raws[4*i+1]/ms + wSt.t*raws[4*i+2]/mt;
    let top = teams.map((_,i)=>i).sort((a,b)=>sc0(b)-sc0(a)).slice(0, 80);
    if(wSt){ const ts = new Set(top); for(const i of teams.map((_,i)=>i).sort((a,b)=>scS0(b)-scS0(a)).slice(0, 40)) if(!ts.has(i)){ ts.add(i); top.push(i); } } // 보스 안정성 목록 후보도 정밀하게
    for(let r=0; r<top.length; r++){ if(!mine(4, r)) continue; const i=top[r], v=evalRaw(teams[i], tkey[i]); raws[4*i]=v[0]; raws[4*i+1]=v[1]; raws[4*i+2]=v[2]; raws[4*i+3]=v[3]; tfl[i]=flg();
      if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r2=>setTimeout(r2,0)); } }
    if(shard && shard.stage==='prec') return shardOut();
    mb=1e-9; ms=1e-9; mt=1e-9; for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[4*i]); ms=Math.max(ms,raws[4*i+1]); mt=Math.max(mt,raws[4*i+2]); } }
  /* 꼭 쓸 캐릭터가 제 몫을 하는 덱(2026-10-19 테스터 피드백 '성각 안 한 5★을 넣어도 어질퍼니 휘정진 덱만'): 가장 센 덱에 끼워 넣기만 하면 꼭 쓸 의미가 없어서,
     상위 조합마다 그 캐릭터 자리에 다른 보유 캐릭터(혼자 화력 상위 4명)를 넣어 보고(어림 단계 값끼리) 비율 = 이 조합 ÷ 가장 나은 대체 조합 → 0.97 이상이면 그대로, 아니면 점수 × 0.45 × 비율²(제 몫 하는 덱이 먼저). 결현현 필수 캐릭터는 제외 */
  const userLock = lockIds.filter(id=>!(pl && pl.required===id)), lockFit = new Map();
  if(userLock.length && teams.length && input.lockFit!==false){
    const baseSc = i => { const tt = raws[4*i+2]/mt; let v = w.b*raws[4*i]/mb + w.s*raws[4*i+1]/ms + w.t*tt; if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all'||mode==='boss') && tt<0.25) v*=0.85; return v*raws[4*i+3]; };
    const ord = teams.map((_,i)=>i).sort((a,b)=>baseSc(b)-baseSc(a)), T0 = [], triS = new Set();
    for(const i of ord){ if(T0.length>=24) break; const ids = teams[i].map(k=>pool[k].pc.id).filter(id=>!userLock.includes(id)).sort().join(); if(triS.has(ids)) continue; triS.add(ids); T0.push(i); }
    for(const L of deckIdx) if(L && L.length){ let bi=-1, bs=-1; for(const i of L){ const v=baseSc(i); if(v>bs){ bs=v; bi=i; } } if(bi>=0 && !T0.includes(bi)) T0.push(bi); }
    const potL = own.filter(o=>!userLock.includes(o.pc.id) && (!cvBlock(o.pc, ctx))).map(o=>({o, p:soloPotential(o.pc,o.prog,enemy,S,cap,ctx)})).sort((a,b)=>(b.p.dps+b.p.sup*0.5)-(a.p.dps+a.p.sup*0.5));
    const st0 = ctx.stFast; ctx.stFast = true; /* 어림 값끼리 비교(대체 조합은 정밀 계산 안 함) */
    const fsc = r => { const tt = r[2]/mt; let v = w.b*r[0]/mb + w.s*r[1]/ms + w.t*tt; if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all'||mode==='boss') && tt<0.25) v*=0.85; return v*r[3]; };
    let fMin = 1;
    for(const i of T0){ const cur = teams[i], v0 = fsc(evalRaw(cur, tkey[i])); let ratio = 1, alt = null;
      for(let j=0;j<4;j++){ const id = pool[cur[j]].pc.id; if(!userLock.includes(id)) continue;
        let bestA = -1, bestO = null, n = 0;
        for(const q of potL){ if(n>=4) break; if(cur.some(k=>pool[k].pc.id===q.o.pc.id)) continue;
          if(!posOf.has(q.o.pc.id)){ posOf.set(q.o.pc.id, pool.length); pool.push(q.o); }
          const nt = cur.slice(); nt[j] = posOf.get(q.o.pc.id); const tm = nt.map(k=>pool[k].pc); if(dupBase(tm) || (compOK && !compOK(tm))) continue; n++;
          const key = tm.map(c=>c.id).sort().join(), va = fsc(evalRaw(nt, key)); if(va>bestA){ bestA = va; bestO = q.o.pc; } }
        if(bestA>0 && v0>0){ const r = v0/bestA; if(r<ratio){ ratio = r; alt = {lock:id, by:bestO.id, name:bestO.name}; } } }
      const f = ratio >= 0.97 ? 1 : 0.45*Math.pow(Math.min(1, ratio), 2); lockFit.set(i, {f, ratio:+ratio.toFixed(3), alt}); fMin = Math.min(fMin, f); /* 제 몫(대체보다 3% 안쪽)이면 그대로, 아니면 뒤로(끼워 넣기끼리는 점수 × 비율² 순) */
      if(Date.now()-lastYield>40){ lastYield=Date.now(); await new Promise(r2=>setTimeout(r2,0)); } }
    ctx.stFast = st0;
    for(let i=0;i<teams.length;i++) if(!lockFit.has(i)) lockFit.set(i, {f:fMin, ratio:null, alt:null}); /* 확인 안 한 조합은 확인한 것 중 가장 낮은 값으로 */
  }
  const lkF = i => lockFit.size ? lockFit.get(i).f : 1;
  const scored = [];
  const maxLv = input.maxDiff||4;
  for(let i=0;i<teams.length;i++){
    if(maxLv<4){ const d=teamDifficulty(teams[i].map(k=>pool[k].pc)); if(d.lv>maxLv) continue; }
    if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue;
    const b=raws[4*i]/mb, s=raws[4*i+1]/ms, t=raws[4*i+2]/mt;
    let sc = w.b*b + w.s*s + w.t*t;
    if(mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all'||mode==='boss') sc *= (t<0.25?0.85:1);
    scored.push([sc*raws[4*i+3]*lkF(i),i]);
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
  let finalList = chosen; // 보스 보정(필요 요소·부위·추천)은 탐색 값(raws 4번째)에 이미 곱해져 있음
  // 보스 안정성 목록(2026-10-17 사용자 '보스는 턴 단축·안정성 두 가지로'): 생존 위주 가중치, 같은 보정
  let finalListS = null;
  if(mode==='boss'){ const wS = modeWeights('boss_stable', boss), sS = [];
    for(let i=0;i<teams.length;i++){ if(maxLv<4 && teamDifficulty(teams[i].map(k=>pool[k].pc)).lv>maxLv) continue; if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue;
      sS.push([(wS.b*raws[4*i]/mb + wS.s*raws[4*i+1]/ms + wS.t*raws[4*i+2]/mt)*raws[4*i+3]*lkF(i), i]); }
    sS.sort((a,b)=>b[0]-a[0]); finalListS = [];
    // 안정성이라도 깨는 데 너무 오래 걸리면 뺌(보스 HP를 알 때): 어림 처치 턴 = N턴 총딜 뒤 지속 딜로, 턴 단축 1위의 2배·+4턴 중 큰 쪽까지
    const NBo = Math.max(1, Math.min(10, (ctx && ctx.burstN) || +S.burstTurns || 3)), need = +((boss && boss.hp) || 0)*1e8*1.3;
    const hmA = boss && boss.hp_model, hmB = hmA ? (Array.isArray(hmA.bar_seq) && hmA.bar_seq.length ? hmA.bar_seq.reduce((a,v)=>a+(+v||0), 0) : (+hmA.bar>0 ? +hmA.bar*Math.max(1, +hmA.bars||1) : 0)) : 0, hmMin = hmA ? +hmA.kt_min||0 : 0;
    // HP 구조가 있는 보스(2026-10-18): 전회복·스토퍼는 어림으로 못 셈 → 총량 ÷ 턴당 평균 딜과 최소 턴 중 큰 쪽(같은 기준으로 비교만)
    const ktA = i => { const b0 = raws[4*i], su = raws[4*i+1];
      if(hmB>0){ const tot = hmB*1e8*1.15, per = Math.max(su, b0/NBo); return Math.max(hmMin, per>0 ? Math.ceil(tot/per) : 99); }
      if(!(need>0)) return 0; return b0 >= need ? NBo : su>0 ? NBo + Math.ceil((need - b0)/su) : 99; };
    // 어림을 통과한 조합은 실제 처치 턴(killTurns — 목숨·스토퍼·바뀌는 보스 존·상성 단계)으로 다시 확인(2026-10-18: 부활 뒤 풍 무효인 츠키하에서 풍 덱이 63턴인데 안정성 목록에 남았음)
    const ktP = new Map(), ktOf = i => { if(ktP.has(i)) return ktP.get(i); const ids = teams[i]; let v = 0; try{ const k = killTurns(evalTeam(ids.map(q=>pool[q].pc), ids.map(q=>pool[q].prog), enemy, S, cap, ctx), boss); v = k ? k.t : 0; }catch(e){} ktP.set(i, v); return v; };
    const kt0 = !(+S.afScoreCap>0) && (need>0 || hmB>0) && chosen.length ? Math.max(ktA(chosen[0].i), ktOf(chosen[0].i)) : 0, ktMax = kt0 ? Math.max(kt0*2, kt0+4) : Infinity;
    for(const [sc,i] of sS){ if(finalListS.length>=nTop) break; const ids = teams[i]; if(ktA(i) > ktMax) continue; if(kt0 && ktOf(i) > ktMax) continue; if(finalListS.some(c=>{ const set=new Set(c.ids); return 4-ids.filter(x=>set.has(x)).length < minDiff; })) continue; finalListS.push({ids, sc, i}); } }
  /* 턴 제한 최대 딜(boss.turn_limit, 2026-10-18 사용자 '서가 챌린지는 5턴 제한 — 5턴 내 최대 딜과 안정 클리어로 구분'): 실전 N턴(= 턴 제한) 총딜 순, 생존이 너무 낮으면 ×0.85, 필요 요소·위협 감점만(처치 턴 보정은 뺌) */
  let finalList3 = null;
  if(mode==='boss' && boss && +boss.turn_limit>0){ const s3 = [];
    for(let i=0;i<teams.length;i++){ if(maxLv<4 && teamDifficulty(teams[i].map(k=>pool[k].pc)).lv>maxLv) continue; if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue;
      const tt = raws[4*i+2]/mt; s3.push([raws[4*i]/mb*(tt<0.25 ? 0.85 : 1), i]); }
    s3.sort((a,b)=>b[0]-a[0]); finalList3 = []; const cand3 = [];
    for(const [sc,i] of s3){ if(cand3.length>=nTop*2) break; const ids = teams[i]; if(cand3.some(c=>{ const set=new Set(c.ids); return 4-ids.filter(x=>set.has(x)).length < minDiff; })) continue; cand3.push({ids, sc, i}); }
    for(const c of cand3){ const team=c.ids.map(k=>pool[k].pc), progs=c.ids.map(k=>pool[k].prog); let f = 1; try{ f = needPenalty(evalTeam(team, progs, enemy, S, cap, ctx), boss).f; }catch(e){} c.sc *= f; }
    cand3.sort((a,b)=>b.sc-a.sc); finalList3 = cand3.slice(0, nTop); }
  const topScore = finalList.length? finalList[0].sc : 1;
  function pickReserves(team, progs, ev){
    const inTeam=new Set(team.map(t=>t.id)), baseIn=new Set(team.map(t=>t.base||t.id));
    const fixedBack = nRes>0 ? backLocked.map(id=>owned.find(o=>o.pc.id===id)).filter(Boolean).slice(0,nRes).map(o=>o.pc) : [];
    fixedBack.forEach(c=>baseIn.add(c.base||c.id));
    const mw = ev.mule && ev.mule.auto ? ev.mule.wp : null; // 셔틀 가정이면 그 무기 퍼스널리티 캐릭터를 후열 우선
    // 후열은 보통 글래 셔틀(사용자 확인 2026-10-17): P글래 셔틀 계획이 있으면 그 셔틀(보유 캐릭터 중 같은 퍼스널리티 묶음)을 먼저 후열로
    const muP = ev.mule || (ev.dummy && ev.dummy.mule), zq = (!ev.mule && ev.dummy && ev.dummy.zFull) || (ev.sb && ev.sb.zone), zk = zq && zq.level>0 ? (zq.key||zq.kind)+':'+zq.level : '-'; // 화면 셔틀 줄(app shuttlePlan)과 같은 존의 계획
    const plS = muP && muP.auto && muP._pm && muP._pm.size ? (muP._pm.get(zk) || [...muP._pm.values()].pop()) : null, shutPick = [];
    if(plS && plS.shuttles) for(const sh of plS.shuttles){ const id = (sh.ids||[]).find(x=>!inTeam.has(x) && !shutPick.includes(x) && own.some(o=>o.pc.id===x && !baseIn.has(o.pc.base||o.pc.id))); if(id) shutPick.push(id); }
    const needComp = compM ? Math.max(0, pl.comp.n - team.filter(compM).length) : 0;
    let shutPc = shutPick.map(id=>own.find(o=>o.pc.id===id).pc); const room = Math.max(0, nRes-fixedBack.length);
    if(needComp>0){ // 구성 서약(후열까지 셈)에 필요한 자리는 남김: 조건에 맞는 셔틀 먼저, 나머지 셔틀은 남는 자리만큼
      const okC = shutPc.filter(compM).slice(0, room), need = Math.max(0, needComp - fixedBack.filter(compM).length - okC.length);
      shutPc = okC.concat(shutPc.filter(c=>!compM(c)).slice(0, Math.max(0, room - okC.length - need))); }
    else shutPc = shutPc.slice(0, room);
    shutPc.forEach(c=>baseIn.add(c.base||c.id));
    const reserves = fixedBack.concat(shutPc, own.filter(o=>!inTeam.has(o.pc.id) && !baseIn.has(o.pc.base||o.pc.id) && !cvBlock(o.pc, ctx)).map(o=>({o, v:survival(team.concat([o.pc]),progs.concat([o.prog]),ev.A&&ev.A.bud).score - ev.surv + (+o.pc.sup.revive||0) + (mw && o.pc.pers.has(mw) ? 8 + ((o.prog&&o.prog.slots)||3) : 0) + (needComp && compM(o.pc) ? 100 : 0) + (S.scoreBonus && S.scoreBonus.pers && [...(o.pc.pers||[])].some(p=>S.scoreBonus.pers[p]) ? 30 : 0)})) /* 서가 챌린지 편성 보너스 1000은 후열까지 — 남는 후열 자리는 지정 퍼스널리티 먼저 */
      .sort((a,b)=>b.v-a.v).filter(x=>{ const b=x.o.pc.base||x.o.pc.id; if(baseIn.has(b)) return false; baseIn.add(b); return true; }).slice(0,Math.max(0,nRes-fixedBack.length-shutPc.length)).map(x=>x.o.pc));
    return {reserves, fixedBack};
  }
  const budPickFor = (team, progs, wq) => { // 결과 조합마다 버디 후보를 바꿔 계산해 그 성향 점수가 가장 높은 것
    const scoreEv = ev => { const t = ev.surv/mt; let v = (wq.b*BR(ev)/mb + wq.s*ev.sustain/ms + wq.t*t); if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all'||mode==='boss') && t<0.25 && wq.t<0.5) v *= 0.85; return v*(mode==='boss' ? needPenalty(ev, boss).f*ktFactor(ev, boss) : mode==='weak' ? weakFit(ev, enemy).f : 1); };
    const evB = b => evalTeam(team,progs,enemy,S,cap, b ? ({...ctx, ...{buddy:{main:b, sub:null}}}) : ctx);
    let best = null;
    if(!budC || budC.length<2){ const b0 = budC && budC[0] ? budC[0] : (ctx.buddy && ctx.buddy.main) || null, ev = evB(b0); best = {ev, v: scoreEv(ev), b: b0}; }
    else for(const b of budC){ const ev = evB(b), v = scoreEv(ev); if(!best || v > best.v*(1+1e-9)) best = {ev, v, b}; }
    // 버디 장비 자동(2026-10-17, 사용자 '맞는 버디 장비도 세팅'): 고른 버디의 추천 장비 후보(최대 3)를 바꿔 계산. 최고점은 오토 스킬이 없어(허수아비 1턴) 장비 차이가 없음
    const b = best.b; if(b && mode!=='burst' && Array.isArray(b.gearAlts) && b.gearAlts.length>1)
      for(const g of b.gearAlts.slice(0,3)){ if(b.gear && g.id===b.gear.id) continue; const b2 = ({...b, gear:g}), ev = evB(b2), v = scoreEv(ev); if(v > best.v*(1+1e-6)) best = {ev, v, b:b2}; }
    return {ev: best.ev, bud: budC && budC.length && best.b ? best.b.id : null, gear: best.b && best.b.gearAlts ? (best.b.gear ? best.b.gear.id : 'none') : null}; };
  const results = finalList.map((c,rank)=>{
    const team=c.ids.map(k=>pool[k].pc), progs=c.ids.map(k=>pool[k].prog);
    const bp = budPickFor(team, progs, w), ev = bp.ev;
    const np=needPenalty(ev,boss); if(mode==='weak') np.miss = np.miss.concat(weakFit(ev, enemy).miss);
    const lf = lockFit.size ? lockFit.get(c.i) : null; if(lf && lf.alt && lf.ratio!=null && lf.ratio<0.95){ const lc = team.find(t=>t.id===lf.alt.lock); np.miss = np.miss.concat([`꼭 쓸 캐릭터 ${lc ? lc.name : ''}: 이 조합에선 ${lf.alt.name}을(를) 대신 넣으면 점수 약 ${Math.round((1/lf.ratio-1)*100)}% 높음`]); }
    // 후방 2명: 남은 보유 캐릭터 중 생존 기여 상위
    const {reserves, fixedBack} = pickReserves(team, progs, ev);
    return {rank:rank+1, team, progs, ev, reserves, score:c.sc, rel:c.sc/topScore,
      norm:{b:BR(ev)/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:np.miss, kt: killTurns(ev, boss), bud: bp.bud, bg: bp.gear,
      recCount: team.filter(t=>recSet.has(t.id)).length, diff: teamDifficulty(team), fixedBack: new Set(fixedBack.map(c=>c.id)), lockFit: lf ? {ratio: lf.ratio, alt: lf.alt} : null};
  });
  const topS = finalListS && finalListS.length ? finalListS[0].sc : 1;
  const results2 = finalListS ? finalListS.map((c,rank)=>{ const team=c.ids.map(k=>pool[k].pc), progs=c.ids.map(k=>pool[k].prog), bp=budPickFor(team, progs, modeWeights('boss_stable', boss)), ev=bp.ev, np=needPenalty(ev,boss), {reserves, fixedBack} = pickReserves(team, progs, ev);
    return {rank:rank+1, team, progs, ev, reserves, score:c.sc, rel:c.sc/topS, norm:{b:BR(ev)/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:np.miss, kt: killTurns(ev, boss), bud: bp.bud, bg: bp.gear,
      recCount: team.filter(t=>recSet.has(t.id)).length, diff: teamDifficulty(team), fixedBack: new Set(fixedBack.map(c=>c.id))}; }) : null;
  const top3 = finalList3 && finalList3.length ? finalList3[0].sc : 1;
  const results3 = finalList3 ? finalList3.map((c,rank)=>{ const team=c.ids.map(k=>pool[k].pc), progs=c.ids.map(k=>pool[k].prog), bp=budPickFor(team, progs, modeWeights('boss_score', boss)), ev=bp.ev, np=needPenalty(ev,boss), {reserves, fixedBack} = pickReserves(team, progs, ev);
    return {rank:rank+1, team, progs, ev, reserves, score:c.sc, rel:c.sc/top3, norm:{b:BR(ev)/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:np.miss, kt: killTurns(ev, boss), bud: bp.bud, bg: bp.gear,
      recCount: team.filter(t=>recSet.has(t.id)).length, diff: teamDifficulty(team), fixedBack: new Set(fixedBack.map(c=>c.id))}; }) : null;
  // 속성덱·타입덱: 각 속성·타입에서 점수가 가장 높은 조합
  const FOCL = ELEMS.map(v=>({kind:'elem',v})).concat(['slash','blunt','pierce','magic'].map(v=>({kind:'wt',v})));
  const decks = [];
  const deckBest = L => { let bi=-1, bs=-1; if(!L) return {bi, bs};
    for(const i of L){ if(compOK && !compOK(teams[i].map(k=>pool[k].pc))) continue; const b=raws[4*i]/mb, s=raws[4*i+1]/ms, tt=raws[4*i+2]/mt; let sc=w.b*b+w.s*s+w.t*tt; if((mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all'||mode==='boss') && tt<0.25) sc*=0.85; sc*=raws[4*i+3]; if(maxLv<4 && teamDifficulty(teams[i].map(k=>pool[k].pc)).lv>maxLv) continue; if(sc>bs){ bs=sc; bi=i; } }
    return {bi, bs}; };
  const pushDeck = (F, bi, bs) => { const team=teams[bi].map(k=>pool[k].pc), progs=teams[bi].map(k=>pool[k].prog); const ev=evalTeam(team,progs,enemy,S,cap,ctx); const rv=pickReserves(team,progs,ev);
    const npD = needPenalty(ev,boss); // 보스 보정은 deckBest가 raws 4번째로 이미 곱함
    decks.push({focus:F, team, progs, ev, reserves:rv.reserves, fixedBack:new Set(rv.fixedBack.map(c=>c.id)), score:bs, rel:bs/topScore, norm:{b:BR(ev)/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:npD.miss, recCount:team.filter(t=>recSet.has(t.id)).length, diff:teamDifficulty(team)}); };
  // 속성덱(원래 그 속성인 캐릭터 3명 이상)과, 그보다 점수가 높을 때만 변환 덱(남의 아군 전체 속성 변환으로 그 속성이 되는 조합)을 따로(2026-10-17, 사용자: 물덱에 베르단타·엘실이 없음)
  FOCL.forEach((F,fi)=>{ const a = deckBest(deckIdx[fi]), c = deckBest(deckIdxC[fi]);
    if(a.bi>=0) pushDeck(F, a.bi, a.bs);
    if(c.bi>=0 && c.bs > a.bs) pushDeck(({...F, ...{conv:true}}), c.bi, c.bs); });
  decks.sort((a,b)=>b.score-a.score);
  return {results, results2, results3, decks, evaluated:teams.length, poolSize:pool.length, pool:pool.map(o=>o.pc.id), weights:w, focus:ctx.focus, nmax:{b:mb, s:ms, t:mt}};
}

/* ---------- 캐릭터별 최적 조합 ---------- */
async function perCharBest(input, onProgress){
  const {owned, excluded=[], backLocked=[], mode, enemy, boss, settings, recommendedIds=[]} = input;
  const S = ({...DEFAULT_SETTINGS, ...settings||{}});
  const ctx = buildCtx(input, owned);
  ctx.mode = mode;
  if(mode==='opener' || mode==='weak' || mode==='boss' || mode==='kesshitsu' || mode==='custom' || mode==='all') ctx.timeline = true; // 실전(N턴 총딜)의 1턴은 속도·선제 순서
  const cap = input.cap, maxLv = input.maxDiff||4;
  if(mode==='burst') ctx.dummyFast = true; // 1단계 어림 → 캐릭터마다 상위 후보만 행동 단위 시뮬레이션
  ctx.stFast = true; // 상태 가동률은 탐색 중 어림, 캐릭터마다 상위 후보만 다시 계산
  const ex = new Set(excluded.concat(backLocked));
  const own = owned.filter(o=>!ex.has(o.pc.id) && !cvBlock(o.pc, ctx)); // 변환 미포함이면 변환 담당은 행·짝에서 모두 뺌(2026-10-17 점검: 풀 밖 짝으로 섞여 들어감)
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
    const pen = mode==='boss' ? needPenalty(ev,boss).f * (1+0.06*team.filter(c=>recSet.has(c.id)).length) * ktFactor(ev, boss) : mode==='weak' ? weakFit(ev, enemy).f : 1;
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
  /* 캐릭터마다 고르는 덱(2026-10-18, 커뮤니티 피드백 '성각 안 나온 캐릭터들은 전부 휘정진에 넣어버림'): 가장 센 덱에 4번째로 끼워 넣기만 하면 의미가 없어서,
     그 캐릭터가 제 몫을 하는 덱 = 같은 세 명에 다른 4번째를 넣은 조합(계산한 것 중)보다 점수가 높은 덱 중 가장 높은 것. 그런 덱이 없으면 끼워 넣기(filler 표시) */
  const SC = new Float64Array(N).fill(-1);
  for(let i=0;i<N;i++){
    if(R[5*i+4]>maxLv) continue;
    const b=R[5*i]/mb, sv=R[5*i+1]/ms, t=R[5*i+2]/mt;
    let sc = w.b*b + w.s*sv + w.t*t;
    if(mode==='sustain'||mode==='weak'||mode==='opener'||mode==='all') sc *= (t<0.25?0.85:1);
    SC[i] = sc * R[5*i+3];
  }
  const triK = (i, j) => { const a = []; for(let q=0;q<4;q++) if(q!==j) a.push(T[4*i+q]); a.sort((x,y)=>x-y); return (a[0]*1024 + a[1])*1024 + a[2]; };
  const TB = new Map(); // 세 명 → [최고 점수, 그 조합, 둘째 점수]
  for(let i=0;i<N;i++){ if(SC[i]<0) continue; for(let j=0;j<4;j++){ const k = triK(i, j), e = TB.get(k);
    if(!e) TB.set(k, [SC[i], i, -1]); else if(SC[i]>e[0]){ e[2] = e[0]; e[0] = SC[i]; e[1] = i; } else if(SC[i]>e[2]) e[2] = SC[i]; } }
  const bestSc = new Float64Array(own.length).fill(-1), bestI = new Int32Array(own.length).fill(-1), fillSc = new Float64Array(own.length).fill(-1), fillI = new Int32Array(own.length).fill(-1);
  for(let i=0;i<N;i++){ if(SC[i]<0) continue; const sc = SC[i];
    for(let j=0;j<4;j++){ const k=T[4*i+j], e = TB.get(triK(i, j)), alt = e ? (e[1]===i ? e[2] : e[0]) : -1;
      if(sc>fillSc[k]){ fillSc[k]=sc; fillI[k]=i; }
      if(sc >= alt*(1-1e-9) && sc>bestSc[k]){ bestSc[k]=sc; bestI[k]=i; } } }
  /* 제 몫을 하는 덱이 없으면(2026-10-19 테스터 피드백) 가장 센 덱에 끼워 넣기 대신 덜 손해 보는 덱: 점수 × min(1, 이 조합 ÷ 같은 세 명 + 다른 4번째 최고)² 가 가장 큰 것 */
  const fbV = new Float64Array(own.length).fill(-1), fbI = new Int32Array(own.length).fill(-1);
  for(let i=0;i<N;i++){ if(SC[i]<0) continue; const sc = SC[i];
    for(let j=0;j<4;j++){ const k=T[4*i+j]; if(bestI[k]>=0) continue; const e = TB.get(triK(i, j)), alt = e ? (e[1]===i ? e[2] : e[0]) : -1, r = alt>0 ? Math.min(1, sc/alt) : 1, v = sc*r*r;
      if(v>fbV[k]){ fbV[k]=v; fbI[k]=i; } } }
  const filler = new Uint8Array(own.length);
  for(let k=0;k<own.length;k++) if(bestI[k]<0 && fbI[k]>=0){ bestI[k]=fbI[k]; bestSc[k]=SC[fbI[k]]; filler[k]=1; }
  let top=1e-9; for(const v of bestSc) top=Math.max(top,v);
  const evM = new Map(); // 같은 조합은 한 번만(워커에선 ev를 버리므로 input.noEv면 계산 안 함)
  const list = own.map((o,k)=>{
    if(bestI[k]<0) return {pc:o.pc, none:true};
    const i=bestI[k]; const mem=[0,1,2,3].map(j=>own[T[4*i+j]]);
    const team=mem.map(m=>m.pc), progs=mem.map(m=>m.prog), tk=team.map(c=>c.id).sort().join();
    if(!input.noEv && !evM.has(tk)) evM.set(tk, evalTeam(team,progs,enemy,S,cap,ctx));
    return {pc:o.pc, score:bestSc[k], rel:bestSc[k]/top, team, progs, ev:evM.get(tk)||null, diff:teamDifficulty(team), norm:{b:R[5*i]/mb, s:R[5*i+1]/ms, t:R[5*i+2]/mt}, filler: !!filler[k], best: fillI[k]>=0 && fillI[k]!==i ? fillSc[k]/top : null};
  }).sort((a,b)=>(b.score||0)-(a.score||0));
  return {list, evaluated:N, poolSize:pool.length, nmax:{b:mb, s:ms, t:mt}};
}

const API = {AF_WAIT, afWait, barrierModeled, hitInfo, dingHit, dingCap, G5_OF, GEAR_STD, GEAR_FX, ELEMS,WTYPES,WEAPON_TYPE,ELEM_KR,WT_KR,WEAPON_KR,ZONE_KR,DEFAULT_SETTINGS,SPECIAL_GRASTA,MANIFEST,
  SURV_CATS, SURV_W, prepChar, charProg, grastaFactor, parseZoneCond, reqText, teamDifficulty, DIFF_LV, evalTeam, computeCap, optimize, perCharBest, survival, zoneCandidates, multihitAvg, dimin,
  explainTeam, charFocusMatch, compileRules, simTeam, PERS_KR, buildCtx, shuttlePoolOf, WEAPON_PERS, SIZE_TABLE, SIZE_IDX, turnTimeline, inflictOf,
  statsAt, charStats, STAT_ORDER, killTurns, hgList, needPenalty, weakFit, budCands, isBuilderDefault, gearSpdOf, GEAR_SPD_AUTO, dupBase, PGL_ALL, PGL_HPMAX, PGL_ZONE5, PGL_HPLOW, PGL_ELEMP, pglPlan};
if(typeof module!=='undefined' && module.exports) module.exports = API; else root.AEOpt = API;
})(typeof window!=='undefined'?window:globalThis);
