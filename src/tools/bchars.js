// 장비 빌더용 캐릭터 목록(2026-10-17, 사용자 '장비 빌더를 쉽고 빠르게'): dist/index.html의 캐릭터 데이터로
// 이름·무기·속성·기본 스탯(천명 단계 표)·주력 스킬 조건(편성 연구실 eqCondNeutral과 같은 식)을 작게 뽑아 stdout으로.
// build.py가 builder.html에 <script id="db-bchars">로 넣는다.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'src', 'engine.js'));
const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const grab = id => { const m = html.match(new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>')); return m ? JSON.parse(m[1]) : null; };
const chars = grab('db-chars') || [], ishi = grab('db-ishi') || {};
const WT_B = {slash:'베기', pierce:'찌르기', blunt:'타격', magic:'마법'}, STAT_B = {pwr:'힘', int:'지능', spd:'속도'};
const EL_B = {fire:'불', water:'물', earth:'땅', wind:'바람', thunder:'번개', shade:'그림자', crystal:'결정', none:'무속성'};
const baseName = n => String(n || '').replace(/\s*\(.*\)\s*$/, '').trim();
const out = [];
for (const raw of chars) {
  const c = E.prepChar(raw), sk = c.main || c.sb; if (!sk) continue;
  const kind = sk.kind === 'mag' ? 'mag' : 'phys', el = sk.element || c.elem || 'none', tgt = sk.target === 'st' ? 'st' : 'aoe';
  const T = E.SIZE_TABLE[tgt + '_' + kind + '_' + (el === 'none' ? 'no' : 'el')] || E.SIZE_TABLE.aoe_phys_el;
  const sizeV = T[E.SIZE_IDX[sk.size] ?? 3] / 100, hits = Math.max(1, sk.hits || 1), stat = sk.stat === 'int' ? 'int' : sk.stat === 'spd' ? 'spd' : 'pwr';
  const wt = kind === 'mag' ? 'magic' : (sk.weapon_type || c.wt);
  const e = ishi[c.id], st = raw.style || 'NS';
  out.push({i: c.id, n: raw.name_kr, w: E.WEAPON_KR[c.weapon] || '', who: baseName(raw.name_kr), tier: raw.tier || '', sc: raw.score || 0, st: Array.isArray(raw.stats) && raw.stats.length === 8 ? raw.stats : null, ft: raw.fate_tbl || null,
    tn: e ? (e.k ? e.t + '(이시층' + (st === 'AS' || st === 'ES' ? '·' + st : '') + ')' : e.t) : '', jp: raw.name_jp || '', al: (raw.alias_kr || []),
    k: {atkCls: kind === 'mag' ? '마법' : '물리', kind: STAT_B[stat], atkType: kind === 'mag' ? '' : (WT_B[wt] || ''), elem: EL_B[el] || '무속성', range: tgt === 'st' ? '단일' : '전체',
      power: Math.max(10, Math.round(sizeV * 100 * Math.max(1, sk.mult || 1) / hits)), hits}, sk: sk.skill || ''});
}
process.stdout.write(JSON.stringify(out).replace(/</g, '\\u003c'));
