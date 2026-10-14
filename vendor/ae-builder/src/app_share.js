
// ── 빌드 공유: 내보내기 표(최적 빌드 내보내기와 같은 형식) · 가져와서 비교 · 상대 장비 장착 ──
const BT_STATS = [['str', '힘'], ['int', '지능'], ['spd', '속도'], ['luck', '행운'], ['mp', '최대 MP'], ['fate', '천명'], ['atkAdj', '공격 추가 보정'], ['magAdj', '마력 추가 보정']];
const BT_HEAD = ['칸', '기본 스탯 (장비 제외)', '능력치', '보정', '빌드 코드'];
const myStats = () => { const o = {}; BT_STATS.forEach(([k]) => { o[k] = +$(k).value || 0; }); return o; };
const myWho = () => $('who').value.trim();
// 파티원 P글래 설정 (모드·직접 입력값·목록) — 빌드와 함께 내보냄
const P_FIELDS = ['pMode', 'pDmg', 'pElem', 'pAddDmg', 'pAddElem'];
const myP = () => ({ f: Object.fromEntries(P_FIELDS.map(k => [k, $(k).value])), l: pgl.map(p => ({ n: p.n, c: p.c, o: p.o, m: p.m === true })) });
const pManual = p => { const v = pVar(p), t = v && v.c && v.c !== '(없음)' ? condName(v.c) : ''; return t && !TYPES.includes(t) ? t : ''; };
function pText(P) {
  const f = P.f || {}, add = (+f.pAddDmg || +f.pAddElem) ? `, 직접 추가 대미지 ${+f.pAddDmg || 0}%·속성 ${+f.pAddElem || 0}%` : '';
  if (f.pMode !== 'pick') return [`직접 입력 (대미지 ${+f.pDmg || 0}%, 속성 ${+f.pElem || 0}%)`, ''];
  return [`P글래 선택 ${P.l.length}개${add}`, P.l.map(p => `${p.n} | ${p.c || '-'} | ${p.o === 'pot' ? '잠재 연성' : '각성'} | ${pManual(p) ? (p.m ? '해당' : '미해당') : '-'}`).join(' ; ')];
}
function pParse(a, b) {
  const P = { f: { pMode: 'direct', pDmg: 0, pElem: 0, pAddDmg: 0, pAddElem: 0 }, l: [] };
  let m = String(a).match(/직접 입력 \(대미지 (-?[\d.]+)%, 속성 (-?[\d.]+)%\)/);
  if (m) { P.f.pDmg = +m[1]; P.f.pElem = +m[2]; return P; }
  if (!/P글래 선택/.test(a)) return null;
  P.f.pMode = 'pick';
  m = String(a).match(/직접 추가 대미지 (-?[\d.]+)%·속성 (-?[\d.]+)%/); if (m) { P.f.pAddDmg = +m[1]; P.f.pAddElem = +m[2]; }
  String(b || '').split(' ; ').forEach(x => { const [n, c, o, h] = x.split(' | ').map(s => (s || '').trim()); if (PG[n]) P.l.push({ n, c: c === '-' ? '' : c, o: o === '잠재 연성' ? 'pot' : '', m: h === '해당' }); });
  return P;
}
const b64e = s => { const u = new TextEncoder().encode(s); let b = ''; for (let i = 0; i < u.length; i += 8192) b += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64d = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new TextDecoder().decode(u); };

// 지금 장착(또는 찾은 빌드) → 가져오기용 코드. 장비는 id와 이름을 함께 적어 데이터가 바뀌어도 이름으로 찾음
function buildCode(st, wt) {
  const bvById = {}; ['badge1', 'badge2'].forEach(k => { if (equip[k] && badgeVal[k] && badgeVal[k].length) bvById[equip[k]] = badgeVal[k]; });
  const o = { v: 1, who: myWho(), st: myStats(), eq: {}, ore: {}, bv: {}, wc: {}, gc: {}, cu: [] };
  for (const k of OPT_ALL) {
    const id = st.equip[k], it = id && ITEMS[id]; if (!it) continue;
    o.eq[k] = [id, it.n, it.t || ''];
    if (GS.includes(k)) { const oid = st.ore[k] || ''; o.ore[k] = [oid, oreName(it, oid)]; if (gChoice[id]) o.gc[id] = gChoice[id]; }
    else if (wChoice[id]) o.wc[id] = wChoice[id];
    if (k.startsWith('badge')) { const v = bvById[id]; if (v && v.length) o.bv[k] = v; }
    if (it.custom) { const c = customs.find(x => x.id === id); if (c && !o.cu.some(x => x.id === id)) o.cu.push(JSON.parse(JSON.stringify(c))); }
  }
  if (st.equip.gs && ITEMS[st.equip.gs] && isClassPledge(ITEMS[st.equip.gs])) o.pl = pledge;
  o.p = myP(); o.wt = st.equip.weapon && ITEMS[st.equip.weapon] ? ITEMS[st.equip.weapon].t : (wt || baseType());   // 무기 미장착이어도 무기 종류는 남김
  return 'AEB1.' + b64e(JSON.stringify(o));
}

// 내보내기 표: [제목] [기준] [조건] [캐릭터] · 칸별 장비 · 기본 스탯 · 능력치 · 보정 · 빌드 코드
function buildTable({ wt, title, basis, cond, st, s, D }) {
  const T = [[title, '', '', '', ''], ['기준', ...basis, ''], ['조건', cond.join(' / '), '', '', ''], ['캐릭터', myWho(), '', '', ''], ['P글래', ...pText(myP()), '', ''], ['', '', '', '', ''],
    ['칸', '장비', '연성', '적용 효과', '미발동 효과']];
  for (const k of OPT_ALL) {
    if (lockOf(k, s.fate)) { T.push([optSlotLabel(k), `잠김 (천명 ${lockOf(k, s.fate)} 이상 필요)`, '', '', '']); continue; }
    const id = st.equip[k], it = id ? getItem(id, s) : null, fx = D.per[k] || [];
    T.push([optSlotLabel(k), it ? it.n + (it.custom ? ' [커스텀]' : '') : k === 'weapon' ? `(미장착 · ${wt || baseType()})` : '(비움)', GS.includes(k) && it ? oreName(it, st.ore[k] || '') : '', fx.filter(c => c.ok).map(c => c.t).join(', '), fx.filter(c => !c.ok).map(c => c.t).join(', ')]);
  }
  T.push(['', '', '', '', ''], ['기본 스탯 (장비 제외)', '값', '', '', '']);
  BT_STATS.forEach(([k, l]) => T.push([l, myStats()[k], '', '', '']));
  T.push(['', '', '', '', ''], ['능력치', '값', '', '', '']);
  [['공격', D.atk], ['마력', D.mag], ['힘', D.str], ['지능', D.int], ['속도', D.spd], ['행운', D.luck], ['최대 MP', D.mp], [D.phys ? '크리율' : '마법 크리율', +D.crit.toFixed(2) + '%'],
    ['일반 대미지', Math.round(D.n)], ['크리티컬 대미지', Math.round(D.c)], ['기대 대미지', Math.round(D.exp)]].forEach(([k, v]) => T.push([k, v, '', '', '']));
  if (D.rows.length) { T.push(['', '', '', '', ''], ['보정', '값', '', '', '']); D.rows.forEach(([k, v]) => T.push([k, v, '', '', ''])); }
  T.push(['', '', '', '', ''], ['빌드 코드', buildCode(st, wt), '빌드 비교 → 가져오기에 이 표나 코드를 붙여넣으면 장비·스탯을 불러옵니다', '', '']);
  return T;
}
const btRowsHtml = T => T.map((r, i) => `<tr${i === 0 || BT_HEAD.includes(r[0]) ? ' class="hd"' : ''}>${r.map((c, j) => `<td${r[0] === '빌드 코드' && j === 1 ? ' class="bt-code"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('');

// ── 가져오기: 붙여넣은 표(TSV) · CSV · 코드만 ──
function parseCells(txt) {
  txt = txt.replace(/^﻿/, '');
  if (/\t/.test(txt)) return txt.split(/\r?\n/).map(l => l.split('\t'));
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  row.push(cur); rows.push(row); return rows;
}
const POOL_OF = { weapon: () => DATA.w, armor: () => DATA.armor, badge: () => DATA.badges, gl: () => DATA.gl, gs: () => DATA.gl };
function findItem(k, id, name, type) {
  const L = POOL_OF[slotKind(k)]().filter(x => !x.custom);
  name = String(name || '').replace(/\s*\[커스텀\]$/, '').trim();
  if (id && ITEMS[id] && !ITEMS[id].custom && ITEMS[id].n === name) return id;
  const hit = L.find(x => x.n === name && (!type || x.t === type)) || L.find(x => x.n === name);
  return hit ? hit.id : null;
}
function findOre(g, oid, name) {
  if (oid !== undefined && ORES[oid] && oreName(g, oid) === name) return oid;
  if (!name) return oid && ORES[oid] ? oid : '';
  if (name === oreName(g, 'pot')) return 'pot';
  const n = name.replace(/^각성(\s*\+\s*)?/, '');
  if (!n) return '';
  const o = Object.values(ORES).find(x => x.n === n); return o ? o.id : '';
}
function parseBuild(txt) {
  const R = { wt: '', p: null, who: '', st: null, equip: {}, ore: {}, bv: {}, wc: {}, gc: {}, pl: null, cu: [], miss: [], from: '' };
  const m = String(txt).match(/AEB1\.[A-Za-z0-9_-]+/);
  if (m) {
    let o; try { o = JSON.parse(b64d(m[0].slice(5))); } catch (e) { return { err: '빌드 코드를 읽지 못했습니다. 표를 통째로 다시 복사해 붙여넣어 보세요.' }; }
    R.from = 'code'; R.wt = TYPES.includes(o.wt) ? o.wt : ''; R.who = o.who || ''; R.st = o.st || null; R.pl = o.pl || null;
    R.p = o.p && o.p.f ? { f: o.p.f, l: (o.p.l || []).filter(p => PG[p.n]).map(p => ({ n: p.n, c: p.c || '', o: p.o || '', m: p.m === true })) } : null;
    const idMap = {};
    (o.cu || []).forEach((c, i) => { const nid = 'x' + (i + 1); idMap[c.id] = nid; R.cu.push(Object.assign({}, c, { id: nid })); });
    for (const k of OPT_ALL) {
      const e = o.eq && o.eq[k]; if (!e) continue;
      const id = idMap[e[0]] || findItem(k, e[0], e[1], e[2]);
      if (!id) { R.miss.push(`${optSlotLabel(k)}: ${e[1]}`); continue; }
      R.equip[k] = id;
      if (GS.includes(k)) { const oe = (o.ore && o.ore[k]) || ['', '']; R.ore[k] = idMap[e[0]] ? '' : findOre(ITEMS[id], oe[0], oe[1]); if (o.gc && o.gc[e[0]]) R.gc[id] = o.gc[e[0]]; }
      else if (o.wc && o.wc[e[0]]) R.wc[id] = o.wc[e[0]];
      if (o.bv && o.bv[k]) R.bv[k] = o.bv[k];
    }
    return R;
  }
  // 코드가 없으면 표 내용으로 (커스텀 장비·배지 입력 수치·선택형 옵션은 기본값)
  const rows = parseCells(String(txt)).map(r => r.map(c => String(c || '').trim()));
  const lab = Object.fromEntries(SLOTS.map(([k, l]) => [l, k]));
  let sec = '';
  for (const r of rows) {
    if (BT_HEAD.includes(r[0])) { sec = r[0]; continue; }
    if (!r[0]) { continue; }
    if (r[0] === '캐릭터') { R.who = r[1] || ''; continue; }
    if (r[0] === 'P글래' && !sec) { R.p = pParse(r[1], r[2]); continue; }
    if (sec === '칸' && lab[r[0]]) {
      const k = lab[r[0]]; const mw = r[1].match(/^\(미장착 · (.+)\)$/); if (k === 'weapon' && mw && TYPES.includes(mw[1])) { R.wt = mw[1]; continue; }
      if (!r[1] || r[1] === '(비움)' || r[1].startsWith('잠김')) continue;
      const id = findItem(k, '', r[1], k === 'weapon' ? '' : '');
      if (!id) { R.miss.push(`${r[0]}: ${r[1]}`); continue; }
      R.equip[k] = id; if (GS.includes(k)) R.ore[k] = findOre(ITEMS[id], undefined, r[2] || '');
    } else if (sec === '기본 스탯 (장비 제외)') {
      const s = BT_STATS.find(x => x[1] === r[0]); if (s) { R.st = R.st || {}; R.st[s[0]] = +String(r[1]).replace(/,/g, '') || 0; }
    }
  }
  if (!Object.keys(R.equip).length && !R.miss.length) return { err: '빌드를 찾지 못했습니다. "표로 내보내기"에서 복사한 표나 CSV 파일, 빌드 코드를 넣어 주세요.' };
  R.from = 'table'; return R;
}

// 장비·스탯을 잠시 바꿔 계산 (계산 조건은 지금 화면 설정 그대로)
function shareEval(b, stats, P) {
  const sv = { pgl, pf: P_FIELDS.map(k => [k, $(k).value]), equip: Object.assign({}, equip), ore: Object.assign({}, ore), bv: badgeVal, wc: wChoice, gc: gChoice, pl: pledge, cu: customs, dom: BT_STATS.map(([k]) => [k, $(k).value]) };
  try {
    if (b.cu && b.cu.length) { customs = customs.concat(b.cu); registerCustoms(); }
    for (const k of OPT_ALL) { equip[k] = b.equip[k] || null; if (GS.includes(k)) ore[k] = b.ore[k] || ''; }
    badgeVal = { badge1: (b.bv && b.bv.badge1) || [], badge2: (b.bv && b.bv.badge2) || [] };
    wChoice = Object.assign({}, wChoice, b.wc || {}); gChoice = Object.assign({}, gChoice, b.gc || {}); if (b.pl) pledge = b.pl;
    if (stats) BT_STATS.forEach(([k]) => { if (stats[k] !== undefined) $(k).value = stats[k]; });
    if (P) { pgl = P.l.map(p => Object.assign({}, p)); P_FIELDS.forEach(k => { if (P.f[k] !== undefined) $(k).value = P.f[k]; }); }
    wAuto = new Map();
    const s = optS();
    const D = optDetail({ equip: Object.assign({}, equip), ore: Object.assign({}, ore) }, s, !equip.weapon && b.wt ? b.wt : null);
    if (!equip.weapon && b.wt) baseWT = b.wt;   // P글래 무기종 판정도 같은 종류로
    // P글래 적용 여부 (무기종 조건은 이 열의 무기로 판정 — optDetail이 calcWT를 맞춰 둠)
    const pi = { pick: s.pMode === 'pick', f: P ? P.f : Object.fromEntries(P_FIELDS.map(k => [k, $(k).value])), l: pgl.map((p, i) => { const c = pCond(p), v = pVar(p); return { i, n: p.n, c: v && v.c && v.c !== '(없음)' ? v.c : '', man: pManual(p), m: p.m === true, ok: c.ok, why: c.why, pot: p.o === 'pot' && v && v.potOk }; }) };
    return { D, fate: s.fate, pi };
  } finally {
    sv.dom.forEach(([k, v]) => { $(k).value = v; }); sv.pf.forEach(([k, v]) => { $(k).value = v; }); pgl = sv.pgl;
    baseWT = null; customs = sv.cu; registerCustoms();
    Object.assign(equip, sv.equip); Object.assign(ore, sv.ore); badgeVal = sv.bv; wChoice = sv.wc; gChoice = sv.gc; pledge = sv.pl; wAuto = new Map();
  }
}
const curBuild = () => ({ equip: Object.assign({}, equip), ore: Object.assign({}, ore), bv: badgeVal, wc: {}, gc: {}, cu: [] });

// ── 창 ──
let shareImp = null, shareRes = null, shareMsg = '', shareUndo = null, shareExOpen = false, shareLastFocus = null, shareText = '';
function shareCurTable() {
  const s = optS(), st = { equip: Object.assign({}, equip), ore: Object.assign({}, ore) }, D = optDetail(st, s);
  const cond = optCondText(s).filter(t => !/^무기 종류|^고정 /.test(t));
  return buildTable({ title: 'AE 빌드', basis: ['지금 장착한 빌드', '기대 대미지', Math.round(D.exp)], cond, st, s, D });
}
function shareCompare() {
  const I = shareImp; if (!I || I.err) { shareRes = null; return; }
  const mine = shareEval(curBuild(), null), theirs = shareEval(I, I.st || myStats(), I.p), mix = shareEval(I, myStats());
  shareRes = { mine, theirs, mix };
}
function renderShare() {
  const box = $('shareBody'), s = optS();
  let h = `<div class="opt-cond"><b>비교 조건</b> <span class="hint">(스킬·보스·버프는 세 열 모두 지금 왼쪽 설정으로 계산합니다. P글래만 "상대 장비 + 상대 스탯" 열에서 상대가 내보낸 P글래를 씁니다)</span><div>${optCondText(s).filter(t => !/^무기 종류|^고정 /.test(t)).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>`;
  // 내보내기
  h += `<div class="shot-act"><button class="btn" type="button" id="shareEx" aria-expanded="${shareExOpen}">${shareExOpen ? '내 빌드 내보내기 닫기' : '내 빌드 표로 내보내기'}</button><span class="hint">최적 빌드 찾기의 "표로 내보내기"와 같은 형식입니다${myWho() ? '' : ' · 캐릭터 이름을 적어 두면 표에 함께 들어갑니다(선택)'}</span></div>`;
  if (shareExOpen) {
    const T = shareCurTable();
    h += `<div class="opt-ex"><div class="shot-act"><button class="btn solid" type="button" id="shareCopy">표 복사 (시트에 붙여넣기)</button>${optDl ? '<button class="btn" type="button" id="shareCSV">CSV 파일 저장</button>' : ''}<span class="hint" id="shareExMsg"></span></div>
      <div class="opt-ex-wrap"><table class="shot-tb opt-ex-tb"><tbody>${btRowsHtml(T)}</tbody></table></div></div>`;
  }
  // 가져오기
  h += `<div class="share-imp"><b>빌드 가져오기</b> <span class="hint">내보낸 표(복사한 내용·CSV 파일)나 빌드 코드를 넣으세요</span>
    <textarea id="shareIn" rows="3" placeholder="여기에 붙여넣기">${esc(shareText)}</textarea>
    <div class="shot-act"><button class="btn solid" type="button" id="shareLoad">불러와 비교</button><label class="btn" style="cursor:pointer">CSV 파일 열기<input type="file" id="shareFile" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden></label><span class="hint">${esc(shareMsg)}</span></div></div>`;
  const I = shareImp;
  if (I && I.err) h += `<p class="hint">${esc(I.err)}</p>`;
  if (I && !I.err && shareRes) {
    const { mine, theirs, mix } = shareRes, my = myStats(), th = I.st || my;
    const nm = I.who ? `${I.who}` : '상대';
    if (I.from === 'table') h += `<p class="hint">빌드 코드가 없어 표 내용으로 읽었습니다. 커스텀 장비·배지 입력 수치·선택형 옵션은 기본값으로 계산합니다.</p>`;
    if (!I.st) h += `<p class="hint">상대 기본 스탯이 없어 내 스탯으로 계산했습니다.</p>`;
    if (I.miss.length) h += `<p class="hint">찾지 못한 장비 (비워 두고 계산): ${I.miss.map(esc).join(', ')}</p>`;
    const nameOf = (b, k) => { const id = b.equip[k]; if (!id) return `<span class="hint">${k === 'weapon' ? `미장착 (${esc(b.wt || baseType())})` : '비움'}</span>`; const it = ITEMS[id]; return it ? esc(it.n) + (it.custom ? ' <span class="tag">커스텀</span>' : '') + (GS.includes(k) ? `<div class="hint">${esc(oreName(it, b.ore[k] || ''))}</div>` : '') : esc(id); };
    const lockTxt = (k, f) => lockOf(k, f) ? `<span class="hint">🔒 천명 ${lockOf(k, f)} 필요</span>` : '';
    const dpct = (v, b) => { if (!b) return ''; const d = (v - b) / b * 100; return `<div class="${d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'zero'}">${d >= 0 ? '+' : ''}${d.toFixed(1)}%</div>`; };
    const cur = curBuild();
    // 장비 이름 표시는 임시 커스텀(x…)을 잠시 등록해야 보임
    const sv = customs; if (I.cu.length) { customs = customs.concat(I.cu); registerCustoms(); }
    let eqRows;
    try {
      eqRows = OPT_ALL.map(k => `<tr${(cur.equip[k] || null) !== (I.equip[k] || null) ? ' class="chg"' : ''}><td>${esc(optSlotLabel(k))}</td><td>${lockTxt(k, my.fate) || nameOf(cur, k)}</td><td>${lockTxt(k, th.fate) || nameOf(I, k)}</td><td>${lockOf(k, my.fate) && I.equip[k] ? lockTxt(k, my.fate) + ' <span class="hint">(빠짐)</span>' : lockTxt(k, my.fate) || nameOf(I, k)}</td></tr>`).join('');
    } finally { const eq = Object.assign({}, equip); customs = sv; registerCustoms(); Object.assign(equip, eq); }
    const sRows = BT_STATS.map(([k, l]) => `<tr${my[k] !== th[k] ? ' class="chg"' : ''}><td>${l}</td><td>${fmt(my[k])}</td><td>${fmt(th[k])}</td><td>${fmt(my[k])}</td></tr>`).join('');
    const A = [mine.D, theirs.D, mix.D];
    const aRows = [['공격', 'atk'], ['마력', 'mag'], ['힘', 'str'], ['지능', 'int'], ['속도', 'spd'], ['행운', 'luck'], ['최대 MP', 'mp']].map(([l, k]) => `<tr><td>${l}</td>${A.map(D => `<td>${fmt(D[k])}</td>`).join('')}</tr>`).join('')
      + `<tr><td>${A[0].phys ? '크리율' : '마법 크리율'}</td>${A.map(D => `<td>${+D.crit.toFixed(2)}%</td>`).join('')}</tr>`;
    const dRows = [['일반', 'n'], ['크리티컬', 'c'], ['기대값', 'exp']].map(([l, k]) => `<tr class="dmg"><td>${l}</td><td><b>${fmt(A[0][k])}</b></td><td><b>${fmt(A[1][k])}</b>${dpct(A[1][k], A[0][k])}</td><td><b>${fmt(A[2][k])}</b>${dpct(A[2][k], A[0][k])}</td></tr>`).join('');
    const pCell = (R, who) => {
      const P = R.pi; if (!P.pick) return `<span class="hint">직접 입력: 대미지 ${+P.f.pDmg || 0}% · 속성 ${+P.f.pElem || 0}%</span>`;
      if (!P.l.length) return '<span class="hint">없음</span>';
      return P.l.map(p => `<div class="sp-row${p.ok ? '' : ' off'}">${esc(p.n)}${p.pot ? ' <span class="hint">잠재</span>' : ''}${p.c ? ` <span class="tag">${esc(p.c)}</span>` : ''}`
        + (p.man ? ` <label class="chk sp-chk"><input type="checkbox" data-spm="${who}:${p.i}"${p.m ? ' checked' : ''}> 해당</label>` : p.ok ? '' : ` <b title="${esc(p.why)}">✕</b> <span class="hint">${esc(p.why)}</span>`) + '</div>').join('');
    };
    const pRow = `<tr class="grp"><td colspan="4">P글래 (파티원) <span class="hint">— 무기종 조건은 자동 판정, 그 외 조건은 직접 체크</span></td></tr>
      <tr><td>P글래</td><td>${pCell(mine, 'me')}</td><td>${pCell(theirs, I.p ? 'them' : 'me')}${I.p ? '' : '<div class="hint">(상대 P글래 정보가 없어 내 P글래로 계산)</div>'}</td><td>${pCell(mix, 'me')}</td></tr>`;
    h += `<div class="opt-ex-wrap"><table class="shot-tb share-tb"><thead><tr><th></th><th>내 장비 + 내 스탯</th><th>${esc(nm)} 장비 + ${esc(nm)} 스탯</th><th>${esc(nm)} 장비 + 내 스탯</th></tr></thead><tbody>
      <tr class="grp"><td colspan="4">대미지 (1타)</td></tr>${dRows}
      ${pRow}
      <tr class="grp"><td colspan="4">장비</td></tr>${eqRows}
      <tr class="grp"><td colspan="4">기본 스탯 (장비 제외)</td></tr>${sRows}
      <tr class="grp"><td colspan="4">능력치 (장비 포함)</td></tr>${aRows}
    </tbody></table></div>`;
    const other = OPT_ALL.some(k => { const it = ITEMS[I.equip[k]]; return it && it.only && !(myWho() && it.only.includes(myWho())); });
    h += `<div class="shot-act"><button class="btn solid" type="button" id="shareEquip">${esc(nm)} 장비 장착 (내 스탯 유지)</button>${shareUndo ? '<button class="btn" type="button" id="shareUndo">장착 되돌리기</button>' : ''}<span class="hint">${other ? '다른 캐릭터 전용 장비가 있어 내 캐릭터에는 장착되지 않거나 효과가 다를 수 있습니다. ' : ''}${I.cu.length ? '커스텀 장비는 내 커스텀 장비에 추가됩니다. ' : ''}천명으로 잠긴 칸은 장착하지 않습니다. P글래는 파티 설정이라 내 것을 그대로 둡니다.</span></div>`;
  } else if (shareUndo) h += `<div class="shot-act"><button class="btn" type="button" id="shareUndo">장착 되돌리기</button></div>`;
  box.innerHTML = h;
}
function shareLoad(txt) {
  shareText = txt.length > 4000 ? '' : txt; shareImp = parseBuild(txt); shareMsg = '';
  shareCompare(); renderShare();
}
function shareEquip() {
  const I = shareImp; if (!I || I.err) return;
  shareUndo = { equip: Object.assign({}, equip), ore: Object.assign({}, ore), bv: badgeVal, curType, ncu: customs.length };
  const map = {};
  for (const c of I.cu) {   // 같은 커스텀 장비가 이미 있으면 그걸 씀
    const sig = x => JSON.stringify([x.slot, x.t, x.gwt, x.n, x.atk, x.mag, x.st, x.fx]);
    const same = customs.find(x => sig(x) === sig(c));
    const { id: _x, ...rest } = c; map[c.id] = same ? same.id : cusAdd(JSON.parse(JSON.stringify(rest))).id;
  }
  const f = +$('fate').value || 0;
  for (const k of OPT_ALL) {
    if (lockOf(k, f)) continue;
    const id = I.equip[k] ? (map[I.equip[k]] || I.equip[k]) : null;
    equip[k] = id && ITEMS[id] ? id : null; if (GS.includes(k)) ore[k] = map[I.equip[k]] ? '' : (I.ore[k] || '');
  }
  badgeVal = { badge1: (I.bv && I.bv.badge1) || [], badge2: (I.bv && I.bv.badge2) || [] };
  Object.entries(I.wc || {}).forEach(([id, v]) => { wChoice[id] = v; }); Object.entries(I.gc || {}).forEach(([id, v]) => { gChoice[id] = v; });
  if (I.pl && equip.gs && isClassPledge(ITEMS[equip.gs])) pledge = I.pl;
  curType = equip.weapon ? ITEMS[equip.weapon].t : (I.wt || curType);
  render(); shareCompare(); shareMsg = '장착했습니다. 내 스탯은 그대로입니다.'; renderShare();
}
function shareUndoFn() {
  const u = shareUndo; if (!u) return;
  if (customs.length > u.ncu) { customs.splice(u.ncu); registerCustoms(); }   // 장착하며 추가한 커스텀 장비도 되돌림
  Object.assign(equip, u.equip); Object.assign(ore, u.ore); badgeVal = u.bv; curType = u.curType;
  shareUndo = null; shareMsg = '되돌렸습니다.'; render(); if (shareImp && !shareImp.err) shareCompare(); renderShare();
}
function openShare() { shareLastFocus = document.activeElement; $('shareModal').hidden = false; if (shareImp && !shareImp.err) shareCompare(); renderShare(); $('shareClose').focus(); }
function closeShare() { $('shareModal').hidden = true; if (shareLastFocus) shareLastFocus.focus(); }
$('shareOpen').onclick = openShare;
$('shareClose').onclick = closeShare;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('shareModal').hidden) { e.preventDefault(); closeShare(); } });
$('shareModal').addEventListener('click', async e => {
  const t = e.target;
  if (t === $('shareModal')) closeShare();
  else if (t.id === 'shareEx') { shareExOpen = !shareExOpen; renderShare(); }
  else if (t.id === 'shareLoad') shareLoad($('shareIn').value);
  else if (t.id === 'shareEquip') shareEquip();
  else if (t.id === 'shareUndo') shareUndoFn();
  else if (t.id === 'shareCopy') {
    const txt = optTSV(shareCurTable()), msg = $('shareExMsg');
    try { await navigator.clipboard.writeText(txt); msg.textContent = '복사했습니다.'; return; } catch (er) {}
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (er) {}
    ta.remove(); msg.textContent = ok ? '복사했습니다.' : '복사가 막혀 있습니다. 아래 표를 드래그해 직접 복사해 주세요.';
  }
  else if (t.id === 'shareCSV') {
    const msg = $('shareExMsg'); if (!optDl) return;
    const w = ITEMS[equip.weapon];
    try { const r = await optDl.save({ filename: `AE_빌드_${(myWho() || (w ? w.t : '')).replace(/[\\/:*?"<>|\s]+/g, '_')}_${(w ? w.n : '').replace(/[\\/:*?"<>|\s]+/g, '_')}.csv`, data: optCSV(shareCurTable()) }); msg.textContent = r && r.status === 'delivered' ? '' : '저장했습니다.'; }
    catch (er) { const c = er && er.code; msg.textContent = c === 'declined' ? '저장을 취소했습니다.' : '저장하지 못했습니다. "표 복사"를 써 주세요.'; }
  }
});
$('shareModal').addEventListener('change', e => {
  const sp = e.target.dataset && e.target.dataset.spm;
  if (sp) {   // P글래 조건 직접 체크: 상대 열은 가져온 목록, 내 열은 왼쪽 내 설정과 같이 바뀜
    const [who, i] = sp.split(':');
    if (who === 'them' && shareImp && shareImp.p) shareImp.p.l[+i].m = e.target.checked;
    else if (who === 'me' && pgl[+i]) { pgl[+i].m = e.target.checked; render(); }
    shareCompare(); renderShare(); return;
  }
  if (e.target.id !== 'shareFile' || !e.target.files || !e.target.files[0]) return;
  const f = e.target.files[0], rd = new FileReader();
  rd.onload = () => shareLoad(String(rd.result || ''));
  rd.onerror = () => { shareMsg = '파일을 읽지 못했습니다.'; renderShare(); };
  rd.readAsText(f, 'utf-8');
});
