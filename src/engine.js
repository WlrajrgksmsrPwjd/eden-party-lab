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
  afActions: 5
};
const SPECIAL_GRASTA = {none:1, vc:1.03, shin:1.07, goku:1.12};
const MANIFEST = [1, 1.08, 1.15];
const FOCUS_VAL = 1.6, OVERTHROW_VAL = 1.0, EAGLE_VAL = 0.6;

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
  if(/퍼스널리티|アルカナ|아르카디아|IDA|아웃로|KMS|輪舞/.test(cl)) return {kind:'unknown', vals:[], n:1, others};
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
  else if(req.kind==='kof') n = pool.filter(m=>KOF_JP.includes(m.raw.name_jp)).length;
  else if(req.kind==='name') n = pool.filter(m=>req.vals.includes(m.raw.name_jp)).length;
  else if(req.kind==='distinct') n = new Set(pool.flatMap(m=>m.elems.filter(e=>req.vals.includes(e)))).size;
  else return false;
  return n >= (req.n||1);
}
const KOF_JP = ['テリー・ボガード','草薙京','クーラ・ダイアモンド','不知火舞'];
function reqText(req){
  if(!req) return '';
  const nm = req.kind==='elem' ? req.vals.map(v=>ELEM_KR[v]).join('·')+' 속성'
    : req.kind==='weap' ? req.vals.map(v=>WEAPON_KR[v]).join('·')
    : req.kind==='align' ? (req.vals[0]==='light'?'천':'명')+' 캐릭터'
    : req.kind==='kof' ? 'KOF 콜라보' : req.kind==='name' ? req.vals.join('·')
    : req.kind==='distinct' ? req.vals.map(v=>ELEM_KR[v]).join('/')+' 서로 다른' : '특정 퍼스널리티';
  return `전방 ${nm} ${req.n||1}${req.kind==='distinct'?'종':'명'}${req.others?'(본인 제외)':''}`;
}

/* 팀 구성에 따라 속성이 바뀌는 캐릭터 (존 종류와 주력 속성) */
const ELEM_SWITCH = {
  jilfany_as: {need:{kind:'elem', vals:['crystal'], n:3, others:false}, yes:'crystal', no:'water'}
};
/* ---------- 파티 버프 조건 규칙 (data/buff_rules.json → party_rules) ---------- */
const FG = {
  stat:['pwr','int','spd'], pwr:['pwr'], int:['int'], spd:['spd'],
  elem:['all_elem_atk','elem_atk'], allel:['all_elem_atk'], elat:['elem_atk'],
  weap:['weapon_atk'], crit:['crit_rate'], critd:['crit_dmg'],
  sf:['singular_focus'], mf:['mental_focus'], focus:['singular_focus','mental_focus'],
  ot:['overthrow'], eagle:['eagle_eyes'], oc:['over_crit'], mh:['multihit'], xhit:['extra_hit'],
  pierce:['barrier_pierce'], weak:['weak_dmg'], link:['link']
};
const ALLF = [...new Set(Object.values(FG).flat())];
function compileRules(c){
  const p = c.party_buff||{};
  let rules = Array.isArray(c.party_rules) ? c.party_rules.slice() : [];
  if(!rules.length && p.scope==='adjacent') rules=[{f:['*'],to:{pos:'adj'}}];
  if(!rules.length && (p.scope==='left'||p.scope==='right')) rules=[{f:['*'],to:{pos:'one',side:p.scope==='left'?'l':'r'}}];
  if(!rules.length) return null;
  const list=[]; let zel=false, zdep=false, sdep=false;
  for(const r of rules){
    if(r.zel){ zel=true; zdep=true; continue; }
    const fs=new Set();
    for(const g of (r.f||['*'])){
      if(g==='*') ALLF.forEach(k=>fs.add(k));
      else if(g.indexOf('elat:')===0) fs.add('elem_atk:'+g.slice(5));
      else (FG[g]||[]).forEach(k=>fs.add(k));
    }
    const w=r.when||{}, to=r.to||{};
    if(w.zone||w.zlv) zdep=true;
    if(w.sb||w.af||w.t!=null) sdep=true;
    list.push({fs:[...fs], to, w, x:r.x!=null?r.x:1, e:r.e!=null?r.e:0, me:!!r.me, pos:to.pos||null, side:to.side||null});
  }
  return {list, zel, zdep, sdep, hasPos:list.some(r=>r.pos)};
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
  if(w.sb && !(sit==='sb' && progs[j] && progs[j].sbOK)) return 0;
  if(w.af && sit!=='af') return 0;
  if(w.req && !reqMet(w.req, team, team[j])) return 0;
  if(w.pain && !A.painAny) return 0;
  if(w.up!=null) a*=w.up;
  if(w.t!=null && sit==='normal') a*=w.t;
  return a;
}
function toFilterOK(to, m){
  if(to.elem && !m.elems.some(e=>to.elem.includes(e))) return false;
  if(to.weap && !to.weap.includes(m.weapon)) return false;
  if(to.wt && !to.wt.includes(m.atkWt)) return false;
  if(to.align && m.align!==to.align) return false;
  if(to.kind && m.atkKind!==to.kind) return false;
  if(to.kof && !KOF_JP.includes((m.raw||{}).name_jp)) return false;
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
function buildBF(team, progs, sit, z, A, posSets){
  const n=team.length; let any=false; const FX=new Array(n).fill(null);
  for(let j=0;j<n;j++){
    const R=team[j].rules; if(!R) continue;
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
          v = r.e + a*t*(r.x-r.e);
        }
        if(v===1) continue;
        const row=rows[i]; for(const k of r.fs) row[k]=(row[k]==null?1:row[k])*v;
      }
    }
    FX[j]={rows, zel:R.zel};
  }
  return any?FX:null;
}

/* ---------- 캐릭터 전처리 ---------- */
function skillPow(sk){
  if(!sk) return 0;
  const tgt = sk.target==='st'?'st':'aoe', kind = sk.kind==='mag'?'mag':'phys', el=(sk.element||'none')==='none'?'no':'el';
  const sv = (SIZE_TABLE[tgt+'_'+kind+'_'+el]||SIZE_TABLE.aoe_phys_el)[SIZE_IDX[sk.size]??3]/100;
  let m = Math.max(sk.mult||1,1); if(isCharge(sk.condition) && m>=30){ m*=0.4; if(m>25) m=25+(m-25)*0.2; }
  return sv*m*(1+(sk.repeat||0)*0.7);
}
function prepChar(c){
  const p = c.party_buff||{}, s=c.self_buff||{}, d=c.debuff||{}, sp=c.support||{};
  const wt = WEAPON_TYPE[c.weapon]||'slash';
  const zone = c.zone && c.zone.type ? c.zone : null;
  const zoneTypes = zone ? normZoneType(zone.type) : null;
  const zspec = zone ? parseZoneCond(zone.condition||'', !!zone.awakened) : null;
  const cx = complexity(c);
  const m0 = c.main||{};
  const atkKind = m0.kind==='mag'?'mag':'phys';
  const pow = Math.max(skillPow(c.main), 0.6*skillPow(c.sb)) * ((c.roles||[]).includes('dps')?1:0.5);
  return {
    cx: cx.v, cxWhy: cx.why, rules: compileRules(c), pow, atkKind, atkWt: m0.weapon_type || (atkKind==='mag'?'magic':wt),
    id:c.id, raw:c, name:c.name_kr, elem:(c.element&&c.element[0])||'none', elems:c.element||[], weapon:c.weapon, wt,
    align:c.align, stellar:!!c.stellar, tier:c.tier||'', score:c.score||0, roles:c.roles||[],
    main:c.main, sb:c.sb,
    self:s, party:p, deb:d, sup:sp, tags:c.tags||[],
    zone, zoneTypes, zspec, zoneAwak: !!(zone&&zone.awakened),
    breakT: (d.break||'').toLowerCase(),
    weakExpose: (d.weak_expose||'').split(/[(\s]/)[0],
    pain: !!d.pain_poison,
    selfDamage: (c.tags||[]).includes('self_damage')
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

/* ---------- 계정 상태(보유/육성) 반영 ---------- */
function charProg(pc, own, S){
  // own: {t:천명치, s:성도각성, m:현현 0/1/2, g:'none'|'vc'|'shin'|'goku', gl:공격 글래스터 배치|null}
  const t = own ? (+own.t||0) : 0;
  let f = 1, sbOK = false, sbMul = 1;
  const slots = t>=200 ? 4 : 3;
  const gl = Object.assign({}, (S&&S.grastaDefault)||DEFAULT_SETTINGS.grastaDefault, (own&&own.gl)||{});
  if(pc.stellar && own && own.s){
    if(t>=15){ sbOK=true; sbMul = t>=30?1:0.8; }
    if(t>=80) f*=1.15; else if(t>=50) f*=1.08; else if(t>=30) f*=1.04;
  }
  if(t>=120) f*=1.02;
  if(t>=255) f*=1.03;
  f *= MANIFEST[own?(+own.m||0):0]||1;
  const g = own&&own.g ? own.g : 'none';
  f *= SPECIAL_GRASTA[g]||1;
  return {f, sbOK, sbMul, goku: g==='goku', t, slots, gl};
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
function zoneFactor(z, el, wt, S){
  if(!z || z.kind==='none' || z.level===0) return 1;
  const L = z.level-1;
  if(z.kind==='elem'){
    if(z.types.includes(el)) return S.zoneElem[L];
    if(z.types.some(t=>OPP[t]===el)) return S.zoneOppElem;
    return 1;
  }
  if(z.kind==='weap'){
    return z.types.includes(wt) ? S.zoneWeap[L] : S.zoneOffWeap;
  }
  if(z.kind==='all') return S.zoneWeap[0];
  return 1;
}
function zoneFactorEff(z, el, wt, S){
  const f = zoneFactor(z, el, wt, S);
  if(z && z.level>=2 && z.how==='스킬 각성'){ // 각성 준비 턴이 필요한 극존은 85%만 인정
    const f1 = zoneFactor(Object.assign({}, z, {level:1}), el, wt, S);
    return f1 + 0.85*(f-f1);
  }
  return f;
}

/* ---------- 팀 단위 공통 집계 ---------- */
function teamAgg(team){
  // 적에게 거는 것(독·페인, 브레이크, 약점 부여)만 팀 공통. 아군 버프는 attackerCore에서 받는 사람별로 조건을 따진다.
  const A = {painAny:false, breaks:[], weakAdd:[]};
  for(const c of team){
    if(c.pain) A.painAny=true;
    if(c.breakT) A.breaks.push(c.breakT);
    if(c.weakExpose) A.weakAdd.push(c.weakExpose);
  }
  return A;
}

/* ---------- 공격자 1명의 대미지 (상대값, 존 배율 제외) ---------- */
function attackerCore(team, idx, progs, A, enemy, S, situation, ctx, FX, zone){
  const c = team[idx], pr = progs[idx];
  const sit = situation==='af' ? 'normal' : situation; // AF는 스킬 선택이 평상과 같음
  let row=null; const F = (j,k)=>{ if(!row) return 1; const v=row[k]; return v==null?1:v; };
  let sk = c.main, usingSB=false;
  if(sit==='sb' && c.sb && pr.sbOK && c.sb.mult>0){ sk=c.sb; usingSB=true; }
  if(!sk) return null;
  let el = sk.element||c.elem; const kind = sk.kind==='mag'?'mag':'phys';
  const swc = ELEM_SWITCH[c.id];
  if(swc && (el===swc.yes || el===swc.no)) el = reqMet(swc.need, team, c) ? swc.yes : swc.no;
  const wt = sk.weapon_type || (kind==='mag'?'magic':c.wt);
  const tgt = sk.target==='st'?'st':'aoe';
  const key = tgt+'_'+kind+'_'+(el==='none'?'no':'el');
  const sizeV = (SIZE_TABLE[key]||SIZE_TABLE.aoe_phys_el)[SIZE_IDX[sk.size]??3]/100;
  let mult = Math.max(sk.mult||1, 1);
  if(situation!=='sb' && isCharge(sk.condition) && mult>=30){ mult*=0.4; if(mult>25) mult = 25 + (mult-25)*0.2; } // 축적형 큰 한 방은 평상시 평균으로 낮춤
  if(usingSB) mult*=pr.sbMul;
  let dmg = sizeV*mult*(tgt==='st'?1.1:1)*(el!=='none'?1.75:1);

  // 스탯 버프 (완력/지성/속도)
  const stat = sk.stat==='int'?'int':sk.stat==='spd'?'spd':'pwr';
  const sv=[pct(c.self[stat])], ev=[pct(c.self.elem_atk)], wv=[pct(c.self.weapon_atk)], spv=[];
  let critA=0, critD = pct(c.self.crit_dmg);
  let ocW = c.self.over_crit?1:0, mhW = c.self.multihit?1:0, xW=0, pierceW = sk.barrier_pierce?1:0;
  const weakD = [pct(c.self.weak_dmg)];
  if(kind==='phys' && c.self.singular_focus) spv.push(FOCUS_VAL);
  if(kind==='mag' && c.self.mental_focus) spv.push(FOCUS_VAL);
  if(c.self.overthrow) spv.push(OVERTHROW_VAL);
  if(c.self.eagle_eyes) spv.push(EAGLE_VAL);
  const zElem = zone && zone.kind==='elem' && zone.level>0 ? zone.types : null;
  for(let j=0;j<team.length;j++){
    const p = team[j].party; if(!p || p.scope==='none') continue;
    row = FX&&FX[j] ? FX[j].rows[idx] : null;
    sv.push(pct(p[stat])*F(j,stat));
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
    if(p.weapon_atk){ const fw=F(j,'weapon_atk'); wv.push(pct(p.weapon_atk.all)*fw, pct(p.weapon_atk[c.weapon])*fw, pct(p.weapon_atk[wt])*fw); }
    critA += pct(p.crit_rate)*F(j,'crit_rate');
    critD += pct(p.crit_dmg)*F(j,'crit_dmg');
    if(p.over_crit) ocW=Math.max(ocW, F(j,'over_crit'));
    if(p.multihit) mhW=Math.max(mhW, F(j,'multihit'));
    if(p.extra_hit) xW=Math.max(xW, F(j,'extra_hit'));
    if(p.barrier_pierce) pierceW=Math.max(pierceW, F(j,'barrier_pierce'));
    if(p.weak_dmg) weakD.push(pct(p.weak_dmg)*F(j,'weak_dmg'));
    if(j!==idx){
      if(kind==='phys' && p.singular_focus) spv.push(FOCUS_VAL*F(j,'singular_focus'));
      if(kind==='mag' && p.mental_focus) spv.push(FOCUS_VAL*F(j,'mental_focus'));
      if(p.overthrow) spv.push(OVERTHROW_VAL*F(j,'overthrow'));
      if(p.eagle_eyes) spv.push(EAGLE_VAL*F(j,'eagle_eyes'));
    }
  }
  let critR = (kind==='phys'?0.2:0) + pct(c.self.crit_rate) + critA;
  const statB = dimin(sv,1), elB = dimin(ev,1), wB = dimin(wv,1);
  let specB = dimin(spv, 3.5);
  dmg *= (1+statB)*(stat==='spd'?(1+statB*0.6):1)*(1+elB)*(1+wB)*(1+specB);

  // 적 디버프 (내성 그룹)
  const tv=[], phv=[], mgv=[];
  for(const m of team){
    const d=m.deb; if(!d) continue;
    tv.push(pct(d.all_elem_res)); if(d.elem_res && el!=='none') tv.push(pct(d.elem_res[el]));
    if(kind==='phys'){ phv.push(pct(d.phys_res)); if(d.weapon_res) phv.push(pct(d.weapon_res[wt])); }
    else mgv.push(pct(d.mag_res));
  }
  const typeR = (el!=='none'||kind==='mag') ? dimin(tv,1) : 0;
  const physR = kind==='phys' ? dimin(phv,1) : dimin(mgv,1);
  dmg *= (1+typeR+physR);

  // 크리티컬
  if(sk.crit_sure) critR = Math.max(critR,1);
  if(kind==='mag' && critR<=0) critR=0;
  const p = Math.min(Math.max(critR,0),1);
  const critF = 1 + p*(1.857*(1+critD)-1);
  // 오버크리티컬: 크리율 100% 초과분 ÷ 10 이 발생 확률 (1100%면 확정), 발생 시 대미지 2배
  const ocP = ocW>0 ? Math.min(Math.max((critR-1)/10,0),1)*Math.min(1,ocW) : 0;
  dmg *= critF * (1+ocP);

  // 브레이크
  let brk = 1;
  for(const b of A.breaks){
    if(b===el || b===wt || (b==='slash_pierce'&&(wt==='slash'||wt==='pierce'))) { brk=Math.max(brk,1.5); }
    else if(['all','any','generic','break','weapon'].includes(b)) brk=Math.max(brk,1.3);
  }
  dmg *= brk;

  // 약점/내성
  let rel = null;
  if(enemy){
    const r1 = enemyRel(enemy, el), r2 = enemyRel(enemy, wt);
    const added = A.weakAdd.includes(el)||A.weakAdd.includes(wt);
    const rs=[r1,r2];
    if(rs.includes('weak') || (added && !rs.includes('null') && !rs.includes('absorb'))) rel='weak';
    else if(rs.includes('resist')) rel='resist';
    else if(rs.includes('null')) rel='null';
    else if(rs.includes('absorb')) rel='absorb';
  }
  let relF = 1;
  if(rel==='weak') relF = 2 + weakD.reduce((a,b)=>a+b,0);
  else if(rel==='resist') relF = 0.25;
  else if(rel==='null'||rel==='absorb') relF = 0;
  dmg *= relF;

  // 다단강화
  const xh = xW>=0.5 && kind==='phys';
  const hits = Math.max(1, sk.hits||1) + (xh ? 1 : 0);
  if(mhW>0) dmg *= 1 + (multihitAvg(hits)-1)*Math.min(1,mhW);
  if(xh) dmg *= hits/Math.max(1,hits-1);

  // 장비: 공격 글래스터 (속성/HP계 가산 +30%, 페인·독 곱연산 ×1.3)
  const gk = A.painAny?'_gq1':'_gq0';
  const gq = pr[gk] || (pr[gk] = grastaFactor(pr, A.painAny));
  dmg *= gq.f * pr.f;

  // 방어 무시/배리어
  if(sk.def_ignore) dmg *= 1.1;
  const pierce = pierceW>=0.5;
  if(ctx.needPierce) dmg *= 0.25 + 0.75*Math.min(1,pierceW);

  // 반복/재공격
  let rep = sk.repeat||0;
  if(situation!=='sb' && rep>0 && (sk.condition||'').length>0) rep*=0.7;
  const totHits = hits*(1+rep);
  // 대상 수
  const nT = tgt==='aoe' ? Math.max(1,S.enemyCount) : 1;
  // 천/명 흐름 보너스 (SB 강화 어빌리티)
  if(usingSB && ctx.flux && (ctx.flux===c.align || ctx.flux==='both')) dmg*=1.1;

  const total = dmg*(1+rep);
  return {perHit: total/totHits, totHits, nT, el, wt, kind, tgt, usingSB, skill:sk.skill, rel, critR, ocP, statB, elB, wB, specB, typeR, physR, brk,
    afx: sk.af_combo_x||1, hitsPerAct: totHits, gq, pierce:!!pierce};
}

function grastaFactor(pr, teamPain){
  const gl = pr.gl||DEFAULT_SETTINGS.grastaDefault, n = pr.slots||3;
  const painOK = !!(gl.ore || teamPain);
  if(gl.mode==='none') return {f:1,e:0,pa:0,po:0,painOK,n};
  if(gl.mode==='auto'){
    let best={f:0};
    for(let k=0;k<=n;k++){
      const f=(painOK?Math.pow(1.3,k):1)*(1+0.3*(n-k));
      if(f>best.f+1e-9) best={f,e:n-k,pa:Math.ceil(k/2),po:Math.floor(k/2)};
    }
    return Object.assign(best,{painOK,n,auto:true});
  }
  let e=Math.max(0,+gl.e||0), pa=Math.max(0,+gl.pa||0), po=Math.max(0,+gl.po||0);
  let over = e+pa+po-n;
  while(over>0){ if(po>0) po--; else if(pa>0) pa--; else e--; over--; }
  const f=(1+0.3*e)*(painOK?Math.pow(1.3,pa+po):1);
  return {f,e,pa,po,painOK,n};
}

function applyZoneCap(core, z, S, cap, combo){
  if(!core) return 0;
  const zf = zoneFactorEff(z, core.el, core.wt, S);
  let ph = core.perHit*zf*(combo||1);
  if(S.capOn && cap>0) ph = Math.min(ph, cap);
  return ph*core.totHits*core.nT;
}

/* ---------- 생존 점수 ---------- */
function survival(team, progs){
  const cats = ['heal','barrier','cleanse','guard','taunt','status_immune','mp_recover'];
  const W = {heal:6,barrier:5,cleanse:4,guard:5,taunt:2,status_immune:3,mp_recover:1.5};
  let s=0; const det={};
  for(const k of cats){
    const v = team.map(c=>+(c.sup[k]||0)).sort((a,b)=>b-a);
    const val = (v[0]||0) + 0.35*(v[1]||0);
    det[k]=v[0]||0; s += W[k]*val;
  }
  const rev = team.some(c=>c.sup.revive); det.revive=rev; if(rev) s+=6;
  const pd = dimin(team.map(c=>pct(c.deb.pwr)),1), id = dimin(team.map(c=>pct(c.deb.int)),1);
  det.enemyDown = Math.max(pd,id); s += 12*(pd+id)/2;
  const selfD = team.filter(c=>c.selfDamage).length;
  if(det.heal<2) s -= 3*selfD;
  for(let i=0;i<team.length;i++) if(progs[i].t>=80 && team[i].stellar) s+=0.6;
  return {score:Math.max(s,0), det};
}

/* ---------- 팀 평가 ---------- */
function evalTeam(team, progs, enemy, S, cap, ctx){
  const A = teamAgg(team);
  const light = team.filter(c=>c.align==='light').length, shadow = team.length-light;
  const flux = light>shadow?'light':shadow>light?'shadow':'both';
  const hasSB = team.some((c,i)=>c.stellar && progs[i].sbOK);
  const cx = Object.assign({}, ctx, {flux});
  const anyR = team.some(c=>c.rules), zdep = anyR && team.some(c=>c.rules&&c.rules.zdep), sdep = anyR && team.some(c=>c.rules&&c.rules.sdep);
  const posSets = anyR && team.some(c=>c.rules&&c.rules.hasPos) ? computePos(team) : null;
  // 같은 상황에서 규칙 발동 상태가 같으면 계산을 재사용 (존 후보가 버프 조건을 바꾸지 않는 경우가 대부분)
  const memo = new Map();
  const coresFor = (sit, z)=>{
    if(!zdep){ const FX = anyR ? buildBF(team,progs,sit,z,A,posSets) : null; return team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,sit,cx,FX,z)); }
    let key = sit==='sb'?7:sit==='af'?13:3;
    for(let j=0;j<team.length;j++){ const R=team[j].rules; if(!R) continue;
      if(R.zel) key = (key*131 + (z&&z.kind==='elem'&&z.level>0 ? ELEMS.indexOf(z.types[0])+1+(z.types.length>1?40:0) : 0)) % 2147483629;
      for(const r of R.list) key = (key*1009 + Math.round(ruleAct(r,j,team,progs,sit,z,A)*1000)) % 2147483629; }
    const hit = memo.get(key); if(hit) return hit;
    const FX = anyR ? buildBF(team,progs,sit,z,A,posSets) : null;
    const cores = team.map((c,i)=>attackerCore(team,i,progs,A,enemy,S,sit,cx,FX,z));
    memo.set(key, cores); return cores;
  };
  const fw = focusW(ctx&&ctx.focus);
  const sumZ = (cores,z,combo)=>{ let v=0; const per=cores.map(co=>{ const d=applyZoneCap(co,z,S,cap,combo)*fw(co); v+=d; return d; }); return {v,per}; };
  const res = {};
  for(const sit of ['normal','sb']){
    const s2 = (sit==='sb'&&!hasSB)?'normal':sit;
    const zs = zoneCandidates(team, progs, sit);
    const shared = zdep ? null : coresFor(s2, null);
    let best=null, bestV=-1, bestPer=null, bestCores=shared;
    for(const z of zs){
      const cores = zdep ? coresFor(s2, z) : shared;
      const r = sumZ(cores, z);
      if(r.v>bestV){ bestV=r.v; best=z; bestPer=r.per; bestCores=cores; }
    }
    res[sit] = {total:bestV, zone:best, per:bestPer, cores:bestCores, zones:zs, sit:s2};
  }
  // 지속: 일반 존은 상시, 어나더 존은 2/5 턴 가동 (어나더 존 한정 버프도 그 동안만)
  const nz = res.normal.zone;
  let sustain = res.normal.total;
  if(nz && nz.level>=2){
    const z1 = Object.assign({}, nz, {level:1});
    const cores1 = zdep ? coresFor('normal', z1) : res.normal.cores;
    sustain = sumZ(cores1, z1).v*0.6 + res.normal.total*0.4;
  }
  // AF: 0MP, 콤보 배율 (AF 중 한정 버프·타이밍 버프 반영)
  const afCores = sdep ? coresFor('af', nz) : res.normal.cores;
  let gain=0;
  afCores.forEach(co=>{ if(co) gain += S.afActions*co.hitsPerAct*0.025*co.afx*(co.tgt==='aoe'?Math.max(1,S.enemyCount):1); });
  const avgCombo = Math.min(0.75 + 0.5*gain, 4);
  const af = sumZ(afCores, nz, avgCombo).v*S.afActions;
  const sbTurn = res.sb.total;
  const surv = survival(team, progs);
  return {sbTurn, af, sustain, burst: sbTurn + 0.5*af, surv: surv.score, survDet: surv.det,
    flux, light, shadow, hasSB, avgCombo, normal:res.normal, sb:res.sb, A, posSets};
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
  const A = teamAgg(team);
  const posSets = ev.posSets || (team.some(c=>c.rules&&c.rules.hasPos) ? computePos(team) : null);
  const sbz = ev.sb.zone, sit = ev.sb.sit || 'sb';
  const FX = buildBF(team, progs, sit, sbz, A, posSets);
  const per = ev.sb.per, tot = per.reduce((a,b)=>a+b,0)||1;
  const dealers = per.map((v,i)=>[v/tot,i]).filter(x=>x[0]>=0.2).map(x=>x[1]);
  const notes = [];
  team.forEach((c,j)=>{
    const R=c.rules; if(!R || !R.list.length) return;
    const p=c.party||{};
    const hasVal = r=>[...r.fs].some(k=>{ const kk=k.split(':')[0]; const v=p[kk]; return typeof v==='number'?v>0 : v&&typeof v==='object' ? Object.values(v).some(x=>x>0) : !!v; });
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
  // 추천 배치: 위치 지정 버프가 가장 많이 성립하는 좌→우 순서
  const rel=[];
  if(posSets) team.forEach((c,j)=>{ if(!posSets[j]) return; c.rules.list.forEach((r,ri)=>{ const ps=posSets[j][ri]; if(!ps) return; ps.forEach(i=>{ if(i!==j) rel.push({j,i,side:r.side}); }); }); });
  let order=[0,1,2,3].slice(0,team.length), okN=-1;
  if(rel.length){
    const perms=[]; const permute=(a,l)=>{ if(l===a.length){ perms.push(a.slice()); return; } for(let k=l;k<a.length;k++){ [a[l],a[k]]=[a[k],a[l]]; permute(a,l+1); [a[l],a[k]]=[a[k],a[l]]; } };
    permute(team.map((_,i)=>i),0);
    const uniq=new Map(); rel.forEach(x=>uniq.set(x.j+'-'+x.i+'-'+(x.side||''),x));
    const R2=[...uniq.values()];
    for(const pm of perms){
      const pos=[]; pm.forEach((m,slot)=>pos[m]=slot);
      let ok=0; for(const x of R2){ const d=pos[x.i]-pos[x.j]; if(x.side==='r'?d===1 : x.side==='l'?d===-1 : Math.abs(d)===1) ok++; }
      if(ok>okN){ okN=ok; order=pm; }
    }
    return {notes, order, posOk:okN, posTotal:R2.length, rel:R2};
  }
  return {notes, order, posOk:0, posTotal:0, rel:[]};
}

/* ---------- 1타 상한 (상대값 단위) ---------- */
function computeCap(allPrepped, S){
  return (S.capAbs||9999999999) / Math.max(1000, S.statK||22000);
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
  const dps = applyZoneCap(co1,z,S,cap) + applyZoneCap(co2,z,S,cap)*1.5;
  const p=c.party||{}, d=c.deb||{};
  const sup = pct(p.pwr)+pct(p.int)+pct(p.all_elem_atk)+0.5*Math.max(0,...Object.values(p.elem_atk||{0:0}).map(pct))
    + 0.6*Math.max(0,...Object.values(p.weapon_atk||{0:0}).map(pct)) + pct(p.crit_rate)*0.4 + pct(p.crit_dmg)
    + (p.singular_focus||p.mental_focus?1:0)+(p.overthrow?0.6:0)+(p.multihit?0.8:0)+(p.barrier_pierce?0.5:0)+(p.extra_hit?1:0)+(p.over_crit?0.5:0)
    + pct(d.all_elem_res)*1.2 + pct(d.phys_res)+pct(d.mag_res)*0.6 + (c.zoneTypes?(c.zoneAwak?1.2:0.6):0) + (c.breakT?0.5:0) + (c.weakExpose?0.8:0);
  const sv = survival([c],[prog]).score;
  return {dps, sup, surv:sv};
}

/* ---------- 조합 탐색 ---------- */
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
    const quota = mode==='stability' ? {dps:14,sup:14,surv:14} : {dps:18,sup:16,surv:8};
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

function modeWeights(mode, boss){
  if(mode==='burst') return {b:1,s:0,t:0};
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
  const ctx = {needPierce: !!(boss&&boss.needs&&boss.needs.barrier_pierce), focus: input.focus||null};
  const cap = input.cap;
  const ex = new Set(excluded.concat(backLocked));
  const own = owned.filter(o=>!ex.has(o.pc.id));
  if(own.length<4) return {error:'보유 캐릭터가 4명 이상 필요합니다. (제외 목록 포함 확인)'};
  if(ctx.focus && !own.some(o=>charFocusMatch(o.pc,ctx.focus))) return {error:'지정한 속성·타입으로 공격하는 보유 캐릭터가 없습니다.', results:[], evaluated:0, poolSize:0};
  const lockIds = locked.filter(id=>own.some(o=>o.pc.id===id)).slice(0,4);
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
  for(const cmb of it){
    const idxs = lockIdx.concat(cmb.map(k=>free[k]));
    const team = idxs.map(i=>pool[i].pc), progs = idxs.map(i=>pool[i].prog);
    const ev = evalTeam(team, progs, enemy, S, cap, ctx);
    teams.push(idxs); raws.push(ev.burst, ev.sustain, ev.surv);
    done++;
    if(Date.now()-lastYield>40){ lastYield=Date.now(); if(onProgress) onProgress(done/total); await new Promise(r=>setTimeout(r,0)); }
  }
  let mb=1e-9, ms=1e-9, mt=1e-9;
  for(let i=0;i<teams.length;i++){ mb=Math.max(mb,raws[3*i]); ms=Math.max(ms,raws[3*i+1]); mt=Math.max(mt,raws[3*i+2]); }
  const w = modeWeights(mode, boss);
  const scored = [];
  const maxLv = input.maxDiff||4;
  for(let i=0;i<teams.length;i++){
    if(maxLv<4){ const d=teamDifficulty(teams[i].map(k=>pool[k].pc)); if(d.lv>maxLv) continue; }
    const b=raws[3*i]/mb, s=raws[3*i+1]/ms, t=raws[3*i+2]/mt;
    let sc = w.b*b + w.s*s + w.t*t;
    if(mode==='burst'||mode==='sustain'||mode==='weak') sc *= (t<0.25?0.85:1);
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
      cand.push({ids:teams[i], sc: sc*np.f*(1+0.03*rec), i});
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
  const results = finalList.map((c,rank)=>{
    const team=c.ids.map(k=>pool[k].pc), progs=c.ids.map(k=>pool[k].prog);
    const ev=evalTeam(team,progs,enemy,S,cap,ctx);
    const np=needPenalty(ev,boss);
    // 후방 2명: 남은 보유 캐릭터 중 생존 기여 상위
    const inTeam=new Set(team.map(t=>t.id));
    const fixedBack = backLocked.map(id=>owned.find(o=>o.pc.id===id)).filter(Boolean).slice(0,2).map(o=>o.pc);
    const reserves = fixedBack.concat(own.filter(o=>!inTeam.has(o.pc.id)).map(o=>({o, v:survival(team.concat([o.pc]),progs.concat([o.prog])).score - ev.surv + (o.pc.sup.revive?3:0)}))
      .sort((a,b)=>b.v-a.v).slice(0,2-fixedBack.length).map(x=>x.o.pc));
    return {rank:rank+1, team, progs, ev, reserves, score:c.sc, rel:c.sc/topScore,
      norm:{b:ev.burst/mb, s:ev.sustain/ms, t:ev.surv/mt}, miss:np.miss,
      recCount: team.filter(t=>recSet.has(t.id)).length, diff: teamDifficulty(team), fixedBack: new Set(fixedBack.map(c=>c.id))};
  });
  return {results, evaluated:teams.length, poolSize:pool.length, pool:pool.map(o=>o.pc.id), weights:w, focus:ctx.focus};
}

/* ---------- 캐릭터별 최적 조합 ---------- */
async function perCharBest(input, onProgress){
  const {owned, excluded=[], backLocked=[], mode, enemy, boss, settings, recommendedIds=[]} = input;
  const S = Object.assign({}, DEFAULT_SETTINGS, settings||{});
  const ctx = {needPierce: !!(boss&&boss.needs&&boss.needs.barrier_pierce), focus: input.focus||null};
  const cap = input.cap, maxLv = input.maxDiff||4;
  const ex = new Set(excluded.concat(backLocked));
  const own = owned.filter(o=>!ex.has(o.pc.id));
  if(own.length<4) return {error:'보유 캐릭터가 4명 이상 필요합니다.'};
  let pool = buildPool(own, [], {enemy,S,cap,ctx,mode});
  const maxD = Math.max(1e-9, ...pool.map(o=>o.pot.dps));
  pool = pool.sort((a,b)=>(b.pot.dps/maxD + b.pot.sup*0.3 + (mode==='stability'?b.pot.surv*0.02:0))-(a.pot.dps/maxD + a.pot.sup*0.3 + (mode==='stability'?a.pot.surv*0.02:0))).slice(0,36);
  const w = modeWeights(mode, boss), recSet = new Set(recommendedIds);
  const idxOf = new Map(own.map((o,i)=>[o.pc.id,i]));
  const T=[], R=[]; // T: 멤버 인덱스(own 기준) 4개씩, R: burst,sustain,surv,penalty,diffLv
  const record = (mem)=>{
    const team=mem.map(o=>o.pc), progs=mem.map(o=>o.prog);
    const ev=evalTeam(team,progs,enemy,S,cap,ctx);
    let pen=1;
    if(mode==='boss') pen = needPenalty(ev,boss).f * (1+0.03*team.filter(c=>recSet.has(c.id)).length);
    T.push(...mem.map(o=>idxOf.get(o.pc.id)));
    R.push(ev.burst, ev.sustain, ev.surv, pen, teamDifficulty(team).lv);
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
  let mb=1e-9, ms=1e-9, mt=1e-9;
  for(let i=0;i<N;i++){ mb=Math.max(mb,R[5*i]); ms=Math.max(ms,R[5*i+1]); mt=Math.max(mt,R[5*i+2]); }
  const bestSc = new Float64Array(own.length).fill(-1), bestI = new Int32Array(own.length).fill(-1);
  for(let i=0;i<N;i++){
    if(R[5*i+4]>maxLv) continue;
    const b=R[5*i]/mb, sv=R[5*i+1]/ms, t=R[5*i+2]/mt;
    let sc = w.b*b + w.s*sv + w.t*t;
    if(mode==='burst'||mode==='sustain'||mode==='weak') sc *= (t<0.25?0.85:1);
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

const API = {ELEMS,WTYPES,WEAPON_TYPE,ELEM_KR,WT_KR,WEAPON_KR,ZONE_KR,DEFAULT_SETTINGS,SPECIAL_GRASTA,MANIFEST,
  prepChar, charProg, grastaFactor, parseZoneCond, reqText, teamDifficulty, DIFF_LV, evalTeam, computeCap, optimize, perCharBest, survival, zoneCandidates, multihitAvg, dimin,
  explainTeam, charFocusMatch, compileRules};
if(typeof module!=='undefined' && module.exports) module.exports = API; else root.AEOpt = API;
})(typeof window!=='undefined'?window:globalThis);
