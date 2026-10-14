// 장착 순서: 무기 → 방어구 → 배지1 → 배지2 → 글래스터1 → 연성1 → … (메모 시트 기준)
// slot/cand: 비교 중인 칸과 후보. 글래스터 칸의 광석 모드에서는 cand가 광석 id
function itemsWith(slot, cand, s, oreOv) {
  const out = [];
  const wid0 = slot === 'weapon' ? cand : equip.weapon; calcWT = (wid0 && ITEMS[wid0] && ITEMS[wid0].t) || baseType();
  for (const [k] of SLOTS) {
    if (lockOf(k, s.fate)) continue;   // 천명 부족으로 잠긴 칸
    if (GS.includes(k)) {
      const gid = (k === slot && gMode === 'glaster') ? cand : equip[k];
      const gl = gid && ITEMS[gid];
      let oid = ore[k];
      if (k === slot && gMode === 'ore') oid = cand;
      else if (k === slot) oid = oreOv !== undefined ? oreOv : defOre(gl);   // 후보 글래스터는 기본 연성 상태로 비교
      if (!gl) continue;
      if (oid === 'pot' && !gl.canPot) oid = '';
      out.push(glasterEff(gl, oid));
      if (oid && oid !== 'pot' && ORES[oid] && !gl.noRef) out.push(ORES[oid]);
    } else {
      const id = k === slot ? cand : equip[k];
      const it = id ? withWChoice(getItem(id, s), s) : null;
      if (it && k === 'armor' && wid0 && it.t !== ARMOR_OF[calcWT]) continue;   // 무기 종류에 맞지 않는 방어구는 장착 불가 (무기가 있을 때만)
      if (it) out.push(k.startsWith('badge') && k !== slot ? badgeWithVals(it, k) : it);
    }
  }
  // 파티원 P글래스터 (선택 모드): 내 장비 다음에 【P】 효과만 더함
  if (s.pMode === 'pick') for (const p of pgl) { const e = pglEff(p); if (e) out.push(e); }
  return out;
}

const isClassPledge = g => /\(5★ 클래스\)의 증표$/.test(g.n);   // 극·진·일반 5★ 클래스 증표
function candidates(s) {
  const who = s.who.trim();
  let list;
  if (cat === 'weapon') {
    const at = equip.armor && ITEMS[equip.armor] ? ITEMS[equip.armor].t : '';
    list = DATA.w.filter(w => curType === '전체' ? (!at || ARMOR_OF[w.t] === at) : w.t === curType);
  }
  else if (cat === 'armor') list = DATA.armor.filter(a => equip.weapon ? a.t === ARMOR_OF[weaponType()] : (armorType === '전체' || a.t === armorType));   // 무기를 장착했으면 맞는 방어구만
  else if (cat.startsWith('badge')) list = DATA.badges.slice();
  else if (gMode === 'ore') {
    const g = equip[cat] && ITEMS[equip[cat]];
    list = g && !g.noRef ? Object.values(ORES).filter(o => o.id !== 'pot' || g.canPot) : [];
    if (s.dmgOnly) list = list.filter(o => o.id === '' || o.id === 'pot' || o.fx.some(e => solOn() || !(e.k === 'stat' && SOL_STAT(e.s))) || o.id === ore[cat]);
  } else {
    const wt = weaponType();
    // 전용 글래스터 칸: 캐릭터 전용 + 특수계 / 기본 칸(1~4): 캐릭터 전용·특수계 제외
    const special = g => g.ck === 'char' || g.fam === '특수계';
    list = DATA.gl.filter(g => (!g.wt || g.wt === wt) && (cat === 'gs' ? special(g) : !special(g) && (gFam === '전체' || g.fam === gFam)));
    const solG = g => solOn() && g.st.concat(g.fxA, g.fxP).some(e => e.k === 'stat' && SOL_STAT(e.s));   // 솔선이 켜지면 내구·정신 글래스터도
    if (s.dmgOnly) list = list.filter(g => g.dmg || solG(g) || g.id === equip[cat] || isClassPledge(g));   // 클래스 증표는 항상 표시
  }
  if (s.hideOther && !(cat === 'gs' && gMode === 'glaster' && !who)) list = list.filter(w => !w.only || (who && w.only.includes(who)) || w.id === equip[cat]);
  const q = $('q').value.trim();
  if (q) list = list.filter(w => w.n.includes(q) || (w.lines || []).some(l => l[0].includes(q)) || (w.conds || []).some(c => c.includes(q)));
  return list;
}

const josaEun = w => { const c = (w || '').charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c % 28 ? '은' : '는'; };
function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function statText(it) {
  const wsel = (it.wch || []).map((c, i) => {
    const cur = (wChoice[it.id] || [])[i], auto = wPick(it, i, S()), has = cur !== undefined && cur !== '';
    const opts = [`<option value=""${!has ? ' selected' : ''}>자동 (${esc(c.opts[auto].t)})</option>`].concat(c.opts.map((o, oi) => `<option value="${oi}"${has && +cur === oi ? ' selected' : ''}>${esc(o.t)}</option>`)).join('');
    return `<span class="prow"><select data-wch="${it.id}" data-i="${i}" aria-label="${esc(it.n)} 선택 효과 ${i + 1}">${opts}</select></span>`;
  }).join('');
  if (it.slot === 'weapon') return `${it.atk} / ${it.mag}` + (wsel ? `<div class="pledge">${wsel}</div>` : '');

  if (it.slot === 'armor') return `<span class="hint">${esc(it.stat || '')}</span>` + (wsel ? `<div class="pledge">${wsel}</div>` : '');
  if (it.slot === 'glaster' && PLEDGE[it.n]) {   // 진 증표 · 일반 증표: 활성 스탯 직접 입력
    const p = PLEDGE[it.n];
    const opt = (sel) => [['', '스탯 선택'], ['str', '힘'], ['int', '지능'], ['spd', '속도'], ['luck', '행운'], ['mp', 'MP'], ['hp', 'HP'], ['end', '내구'], ['spr', '정신']]
      .map(([v, n]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${n}</option>`).join('');
    return `<div class="pledge">${pledge[p].map(([k, v], i) => `<span class="prow"><select id="${p}s${i}" data-pl="${p}" data-i="${i}" data-f="s" aria-label="${esc(it.n)} 스탯 ${i + 1}">${opt(k)}</select><input type="number" id="${p}v${i}" data-pl="${p}" data-i="${i}" data-f="v" value="${+v || 0}" aria-label="${esc(it.n)} 값 ${i + 1}"></span>`).join('')}</div>`;
  }
  if (it.slot === 'glaster' && it.ch && it.ch.length) {   // 선택 스탯 드롭다운
    const fixed = it.act.replace(/\(([^)]*) 중 하나\)\+\d+/g, '').replace(/[,\s]+$/,'').replace(/^[,\s]+/,'').replace(/,\s*,/g, ',').trim();
    const sels = it.ch.map((c, i) => {
      const cur = (gChoice[it.id] || [])[i] || '', auto = autoPick(c.o);
      const opts = [`<option value=""${!cur ? ' selected' : ''}>자동 (${STAT_KO[auto]})</option>`].concat(c.o.map(o => `<option value="${o}"${cur === o ? ' selected' : ''}>${STAT_KO[o]}</option>`)).join('');
      return `<span class="prow"><select id="ch_${it.id}_${i}" data-ch="${it.id}" data-i="${i}" aria-label="${esc(it.n)} 선택 스탯 ${i + 1}">${opts}</select><span class="hint">+${c.v}</span></span>`;
    }).join('');
    return `<div class="pledge">${fixed ? `<span class="hint">${esc(fixed.replace(/\n/g, ' '))}</span>` : ''}${sels}</div>`;
  }
  if (it.slot === 'glaster') return `<span class="hint">${esc(it.act.replace(/\n/g, ' '))}</span>`;
  return '<span class="hint">—</span>';
}
const candId = it => it.id;
const isOn = id => GS.includes(cat) && gMode === 'ore' ? ore[cat] === id : equip[cat] === id;
function condTag(g) {
  if (g.ck === 'wt') return `<span class="tag">&lt;${esc(g.wt)}&gt;</span>`;
  if (g.ck === 'pers') { const c = g.conds.map(x => x.replace(/[<>]/g, '')); return `<span class="tag" title="${esc(c.join(', '))}">성격: ${esc(c.slice(0, 3).join(', '))}${c.length > 3 ? ` 외 ${c.length - 3}` : ''}</span>`; }
  if (g.ck === 'any' && g.conds.length === 0) return '<span class="tag">조건 없음</span>';
  return '';
}

function cuText(s, mp) {
  const parts = [];
  const phys = PHYS.includes(s.kind);
  if (s.cu1) parts.push(phys ? '정신 통일 미적용(물리 공격)' : `정신 통일 +${+Math.min(250, mp * AECalc.rd(s.cu1v, 2)).toFixed(2)}%`);
  if (s.cu2) parts.push(!phys ? '심기일체 미적용(마법 공격)' : `심기일체 +${+Math.min(250, mp * AECalc.rd(s.cu2v, 2)).toFixed(2)}%`);
  return parts.length ? ` · 최대 MP ${fmt(mp)} → ${parts.join(', ')}` : ` · 최대 MP ${fmt(mp)}`;
}
// 특수 연산 합계 표시 (정신 통일·심기일체·호시탐탐·하극상 버프: 상한 +350% / 장비 하극상)
function spText(v) {
  const parts = [];
  if (Math.abs(v.sp) > 1e-9) parts.push(`특수 상태 합계 +${+v.sp.toFixed(2)}%${v.sp >= 350 - 1e-9 ? ' (상한 +350%)' : ''}`);
  if (Math.abs(v.gk) > 1e-9) parts.push(`장비 하극상 합계 +${+v.gk.toFixed(2)}%`);
  return parts.length ? ' · ' + parts.join(' · ') : '';
}
// 효과 하나 → 나열용 [분류, 조건 라벨, 값]
function pglKey(e, s) {
  switch (e.k) {
    case 'elem': return ['속성 공격', e.e === 'all' ? '모든 속성' : e.e === 'none' ? '무속성' : e.e + ' 속성', fv(e.v, s)];
    case 'hp': return ['대미지 증가', e.cond === 'hpmax' ? 'HP 최대 시' : `HP ${e.th || 50}% 이하 시`, e.v];
    case 'zone': return ['대미지 증가', 'ZONE 각성 중', e.v];
    case 'zonet': return ['대미지 증가', `${e.z} 전개 시`, e.v];
    case 'fateally': { const w = e.who || '천', n = Math.max(0, w === '명' ? s.meiAllies : s.fateAllies); return ['대미지 증가', `${w} 아군 수 (${n}명 × ${e.per}%)`, e.per * n]; }
    case 'stat': return ['스탯', STATN[e.s], Math.floor(fv(e.v, s))];
    default: return ['기타', interpret(e, s, PHYS.includes(s.kind))[0], null];
  }
}
function pglWhy(e, s) {
  switch (e.k) {
    case 'elem': return `스킬 속성이 ${s.elem}`;
    case 'hp': return `HP ${s.hpPct}%`;
    case 'zone': return 'ZONE 각성 아님';
    case 'zonet': return `${e.z} 미전개` + (s.zoneT ? ` (지금 ${s.zone && e.z.startsWith('극 ') ? '' : ''}${s.zoneT}${s.zone ? ' · ZONE 각성' : ''})` : '');
    case 'fateally': return `${e.who || '천'} 아군 수 0명`;
    default: return '발동 조건 미충족';
  }
}
// 장착한 P글래 효과 하나하나의 실제 적용 여부: [효과, 적용, 미적용 이유]
function pglRows(p, s) {
  const v = pVar(p); if (!v) return [];
  const fx = p.o === 'pot' && v.potOk ? v.fxP : v.fxA, cd = pCond(p), phys = PHYS.includes(s.kind);
  return fx.map(e => {
    if (!e.party && !cd.ok) return [e, false, '장착 조건: ' + cd.why];
    const ok = interpret(e, s, phys)[1];
    return [e, !!ok, ok ? '' : pglWhy(e, s)];
  });
}
const pctTxt = v => (v >= 0 ? '+' : '') + (+(+v).toFixed(2)) + '%';
// P글래 대미지 증가량: P글래 없이 계산한 기대 대미지와 비교
const noP = s => Object.assign({}, s, { pMode: 'none', pDmg: 0, pElem: 0, pAddDmg: 0, pAddElem: 0 });
const gainTxt = (a, b) => { a = Math.round(a); b = Math.round(b); const d = a - b; return d === 0 ? '<span class="zero">±0</span>' : `<span class="up">${d > 0 ? '+' : '−'}${fmt(Math.abs(d))} (${d > 0 ? '+' : '−'}${(Math.abs(d) / Math.max(1, b) * 100).toFixed(1)}%)</span>`; };
function renderPgl() {
  const pick = $('pMode').value === 'pick', s = S();
  $('pDirect').hidden = pick; $('pPick').hidden = !pick;
  const wt = weaponType();
  const base = evalBuild(itemsWith(null, null, noP(s)), noP(s)).exp, full = evalBuild(itemsWith(null, null, s), s).exp;
  $('pglGain').innerHTML = `<span class="hint">P글래 대미지 증가량 (현재 세팅 기대 대미지 기준)</span>
    <div><span class="big">${fmt(base)} → ${fmt(full)}</span> ${gainTxt(full, base)}</div>`;
  // 장착한 P글래 하나씩 뺐을 때와의 차이 = 그 P글래의 증가량
  const each = pick ? pgl.map((p, i) => { const keep = pgl; pgl = keep.filter((_, j) => j !== i); const v = evalBuild(itemsWith(null, null, s), s).exp; pgl = keep; return Math.round(full) - Math.round(v); }) : [];
  $('pglList').innerHTML = pgl.length ? pgl.map((p, i) => {
    const g = PG[p.n], v = pVar(p), lines = p.o === 'pot' && v.potOk ? v.lp : v.la;
    const conds = g.vars.map(x => x.c);
    const ct = v.c && v.c !== '(없음)' ? condName(v.c) : '';
    const condSel = conds.length > 1 ? `<select data-pc="${i}" aria-label="${esc(p.n)} 장착 조건">${conds.map(c => `<option value="${esc(c)}"${c === v.c ? ' selected' : ''}>${esc(c || '조건 없음')}</option>`).join('')}</select>`
      : ct ? `<span class="tag">${esc(v.c)}</span>` : '';
    const manual = ct && !TYPES.includes(ct) ? `<label class="chk" style="padding:2px 8px"><input type="checkbox" data-pm="${i}"${p.m === true ? ' checked' : ''}> 내 캐릭터 &lt;${esc(ct)}&gt;</label>` : '';
    const rows = pglRows(p, s);
    const chips = rows.length ? rows.map(([e, ok, why]) => `<span class="pfx${ok ? '' : ' off'}" title="${esc(why)}">${esc(interpret(e, s, PHYS.includes(s.kind))[0])}${ok ? '' : ' <b aria-label="미적용">✕</b>'}</span>`).join('')
      : `<span class="hint">${lines.length ? esc(lines.join(' · ')) + ' (대미지 무관)' : '각성 상태에서는 파티원에게 주는 효과가 없습니다 (잠재 연성 시 적용)'}</span>`;
    return `<div class="lrow"><span class="pn">${esc(p.n)}</span>${condSel}
      ${v.potOk ? `<select data-pi="${i}" aria-label="${esc(p.n)} 연성 상태"><option value=""${p.o === 'pot' ? '' : ' selected'}>각성</option><option value="pot"${p.o === 'pot' ? ' selected' : ''}>각성 + 잠재 연성</option></select>` : '<span class="tag">각성</span>'}
      ${manual}
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:2px"><span class="pgv${each[i] ? '' : ' zero'}" title="이 P글래를 뺐을 때와의 기대 대미지 차이">${each[i] ? '+' + fmt(each[i]) + ` (+${(each[i] / Math.max(1, full - each[i]) * 100).toFixed(1)}%)` : '±0'}</span>
      <button class="lx" type="button" data-pdel="${i}" aria-label="${esc(p.n)} 해제">×</button></span>
      <div class="pfxs">${chips}</div></div>`;
  }).join('') : '<span class="hint">장착한 P글래스터가 없습니다. 선택 창에서 파티원이 장착한 글래스터를 고르세요.</span>';
  $('pglOpen').textContent = `P글래 선택 창 열기 (${pgl.length}/${PGL_MAX})`;
  // 조건별 합계: 대미지 증가 · 속성 공격 (✕ = 지금 계산에 적용 안 됨)
  const grp = {};
  for (const p of pgl) for (const [e, ok, why] of pglRows(p, s)) {
    const [cat, lab, val] = pglKey(e, s); if (val === null) continue;
    const k = cat + '|' + lab + '|' + ok + '|' + why;
    (grp[k] = grp[k] || { cat, lab, ok, why, v: 0, n: 0 }).v += val; grp[k].n++;
  }
  if (s.pAddDmg) grp['add|d'] = { cat: '대미지 증가', lab: '직접 추가 (43행)', ok: true, why: '', v: s.pAddDmg, n: 1 };
  if (s.pAddElem) grp['add|e'] = { cat: '속성 공격', lab: '직접 추가', ok: true, why: '', v: s.pAddElem, n: 1 };
  const cats = ['대미지 증가', '속성 공격', '스탯'];
  $('pglSum').innerHTML = pgl.length || s.pAddDmg || s.pAddElem ? cats.map(c => {
    const xs = Object.values(grp).filter(x => x.cat === c).sort((a, b) => (b.ok - a.ok) || a.lab.localeCompare(b.lab, 'ko'));
    if (!xs.length) return '';
    const tot = xs.filter(x => x.ok).reduce((a, x) => a + x.v, 0);
    return `<div class="psum"><div class="psum-h">${c}<span>적용 합 ${c === '스탯' ? (tot >= 0 ? '+' : '') + tot : pctTxt(tot)}</span></div>`
      + xs.map(x => `<div class="psum-r${x.ok ? '' : ' off'}"><span>${esc(x.lab)}${x.n > 1 ? ` <span class="hint">×${x.n}</span>` : ''}</span><span>${c === '스탯' ? (x.v >= 0 ? '+' : '') + x.v : pctTxt(x.v)}${x.ok ? '' : ` <b title="${esc(x.why)}">✕</b>`}</span></div>`
        + (x.ok ? '' : `<div class="psum-why">${esc(x.why)}</div>`)).join('') + '</div>';
  }).join('') + '<span class="hint">✕는 지금 설정에서 계산에 들어가지 않는 값입니다. 대미지 증가는 조건마다 계산기의 다른 행(HP 36행, ZONE 각성 49행, 특정 ZONE 50행, 천·명 아군 51행)으로 들어가 서로 곱해지고, 직접 추가한 대미지 증가는 43행으로 따로 곱해집니다. 속성 공격은 35행에서 내 장비의 속성 공격과 더해집니다.</span>' : '';
}
function renderPglRows() {
  const q = $('pglQ').value.trim(), dmgOnly = $('pglDmg').checked;
  let list = PG_LIST.filter(g => (!dmgOnly || g.dmg) && (!q || (g.n + ' ' + g.vars.map(v => v.c + ' ' + v.la.join(' ') + ' ' + v.lp.join(' ')).join(' ')).includes(q)));
  const full = pgl.length >= PGL_MAX;
  // 장착했을 때의 기대 대미지 증가량 (지금 장착한 P글래에 더해서, 기본 장착 조건·연성 상태로)
  const s = Object.assign(S(), { pMode: 'pick' });
  const now = Math.round(evalBuild(itemsWith(null, null, s), s).exp);
  const gain = new Map(list.map(g => {
    const c = pDefCond(g), v = g.vars.find(x => x.c === c), keep = pgl;
    pgl = keep.concat([{ n: g.n, c, o: v.potOk || !v.la.length ? 'pot' : '', m: true }]);
    const d = Math.round(evalBuild(itemsWith(null, null, s), s).exp) - now; pgl = keep;
    return [g, d];
  }));
  const so = $('pglSort').value;
  if (so === 'gain') list = list.slice().sort((a, b) => gain.get(b) - gain.get(a));
  else if (so === 'name') list = list.slice().sort((a, b) => a.n.localeCompare(b.n, 'ko'));
  $('pglRows').innerHTML = list.length ? list.map(g => {
    const cnt = pgl.filter(p => p.n === g.n).length, v = g.vars.find(x => x.c === pDefCond(g)) || g.vars[0];
    const cs = g.vars.map(x => x.c).filter(c => c && c !== '(없음)');
    const condTxt = g.party && !cs.length ? '파티 전원에게 적용 (아군 전체)' : cs.length ? `장착 조건: ${cs.length > 6 ? cs.slice(0, 6).join(' ') + ` 외 ${cs.length - 6}개` : cs.join(' ')} · 같은 조건의 파티원에게만 적용` : '조건 없음';
    return `<div class="pgrow"><div class="pgi"><div><strong>${esc(g.n)}</strong><span class="tag">${esc(g.fam)}</span>${cnt ? `<span class="tag taken">${cnt}개 장착됨</span>` : ''}</div>
      <div class="pge">${esc(condTxt)}${g.same ? '' : ' · 조건마다 수치가 다름'}</div>
      <div class="pge">각성: ${v.la.length ? esc(v.la.join(' · ')) : '파티원 효과 없음'}${v.potOk || (!v.la.length && v.lp.length) ? `<br>잠재 연성: ${esc(v.lp.join(' · '))}` : ''}</div></div>
      <div class="pgside"><span class="pgv${gain.get(g) ? '' : ' zero'}" title="장착하면 늘어나는 기대 대미지 (지금 장착한 P글래에 더해서)">${gain.get(g) ? (gain.get(g) > 0 ? '+' : '−') + fmt(Math.abs(gain.get(g))) + ` (${gain.get(g) > 0 ? '+' : '−'}${(Math.abs(gain.get(g)) / Math.max(1, now) * 100).toFixed(1)}%)` : '±0'}</span>
      <button class="btn" type="button" data-padd="${esc(g.n)}"${full ? ' disabled' : ''}>장착</button></div></div>`;
  }).join('') : '<div class="hint" style="padding:10px 2px">조건에 맞는 P글래스터가 없습니다.</div>';
}
let pglLastFocus = null;
function openPgl() { pglLastFocus = document.activeElement; $('pglModal').hidden = false; renderPglRows(); $('pglQ').focus(); }
function closePgl() { $('pglModal').hidden = true; if (pglLastFocus) pglLastFocus.focus(); }
function renderLuna() {
  const used = lunatic.map(x => x.t);
  $('lunaList').innerHTML = lunatic.length ? lunatic.map((x, i) => `<div class="lrow">
      <select id="lunaT${i}" data-li="${i}" aria-label="루나틱 종류 ${i + 1}">${['솔선', '결사', '심안'].map(t => `<option${t === x.t ? ' selected' : ''}${t !== x.t && used.includes(t) ? ' disabled' : ''}>${t}</option>`).join('')}</select>
      ${x.t === '솔선' ? `<span class="lsol"><span class="lsol-in"><label class="f">캐릭터 내구<input type="number" id="lunaE${i}" data-li="${i}" data-lf="end" value="${+x.end || 0}"></label><label class="f">캐릭터 정신<input type="number" id="lunaS${i}" data-li="${i}" data-lf="spr" value="${+x.spr || 0}"></label></span>
        <label class="chk" style="padding:2px 8px;justify-self:start"><input type="checkbox" data-li="${i}" data-lf="eqManual"${x.eqManual ? ' checked' : ''}> 장비 내구·정신 직접 입력</label>
        ${x.eqManual ? `<span class="lsol-in"><label class="f">장비 내구<input type="number" id="lunaEE${i}" data-li="${i}" data-lf="eqEnd" value="${+x.eqEnd || 0}"></label><label class="f">장비 정신<input type="number" id="lunaES${i}" data-li="${i}" data-lf="eqSpr" value="${+x.eqSpr || 0}"></label></span>` : ''}
        <span class="soltot" id="lunaEq${i}"></span></span>`
        : `<span class="hint">${x.t === '결사' ? '대미지 ×1.7 · 크리티컬 확정' : '대미지 ×1.5 · 약점 배율 +1'}</span>`}
      <button class="lx" type="button" data-ldel="${i}" aria-label="루나틱 ${i + 1} 삭제">×</button></div>`).join('')
    : '<span class="hint">루나틱이 없습니다. "+ 추가"로 솔선·결사·심안을 넣으세요.</span>'
    + (lunatic.some(x => x.t === '솔선') ? '<span class="hint">솔선: 초기 내구만큼 힘, 초기 정신만큼 지능이 오릅니다. 초기 내구·정신 = 캐릭터 값(장비 제외) + 장비가 주는 내구·정신(자동 계산, 또는 직접 입력). 초기 스탯이 아닌 상태 효과로 더해져 공격·마력과 약점 계산에만 반영되고, (1+힘/32) 배율과 속성 보정에는 반영되지 않습니다.</span>' : '');
  $('lunaAdd').disabled = lunatic.length >= 3;
}
function render() {
  wAuto = new Map();   // 조건이 바뀌면 선택형 장비의 자동 선택 다시 계산
  { // 방어구를 장착했으면 무기 탭의 종류를 그 방어구에 맞는 것으로
    const at = equip.armor && ITEMS[equip.armor] ? ITEMS[equip.armor].t : '';
    if (at && curType !== '전체' && ARMOR_OF[curType] !== at && (!equip.weapon || cat === 'weapon')) curType = TYPES.find(x => ARMOR_OF[x] === at);
  }
  { // 공격 타입은 시전 스킬 유형에 맞는 것만: 물리 → 베기·찌르기·타격, 마법 → 마법
    const cls = $('atkCls').value || clsOfWeapon(weaponType()), sel = $('atkType');
    [...sel.options].forEach(op => { if (op.value) op.disabled = cls === '마법' ? op.value !== '마법' : op.value === '마법'; });
    if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled) sel.value = '';
  }
  save();
  renderPgl();
  const s0 = S();
  $('mpNote').textContent = Math.abs(s0.mpPct) > 100 ? `MP %는 ${s0.mpPct > 0 ? '+100%(2배)' : '−100%'}까지만 적용됩니다.` : s0.mpPct ? `최대 MP ${+(1 + s0.mpPct / 100).toFixed(2)}배` : '';
  { // 자동 선택 결과 표시
    const w = weaponType(), wl = !equip.weapon && curType === '전체' ? '기본' : w;   // 전체 탭(무기 미장착)은 '기본'
    const cls0 = $('atkCls').value || clsOfWeapon(w);
    $('atkCls').options[0].textContent = `${wl} - ${clsOfWeapon(w)}`;
    $('kind').options[0].textContent = `${baseOfWeapon(w)} - ${wl} 기준`;
    $('atkType').options[0].textContent = `${wl} - ${cls0 === '마법' ? '마법' : physTypeOf(s0, w) || '?'}`;
    { // 지팡이 + 물리 스킬: 공격 타입은 베기·찌르기·타격 중에서만 (마법 선택지 숨김)
      // 첫 칸(자동)을 '베기'로 보여 주고 따로 있는 베기·마법 칸은 숨김 → 보이는 선택지: 베기 · 찌르기 · 타격
      const sp = w === '지팡이' && cls0 === '물리', O = [...$('atkType').options], mo = O.find(o => o.value === '마법'), bo = O.find(o => o.value === '베기');
      mo.hidden = mo.disabled = bo.hidden = sp;
      if (sp) { if ($('atkType').value === '마법' || $('atkType').value === '베기') $('atkType').value = ''; O[0].textContent = '베기'; }
    }
    // 스킬 배율 표에서 정한 값 요약 (대상 · 공격 유형 · 속성 · 일반 공격)
    $('powSum').innerHTML = [s0.range, $('atkCls').value || `${clsOfWeapon(w)} (무기 기준)`, s0.elem, s0.normalAtk ? '일반 공격' : ''].filter(Boolean).map(x => `<span class="tag">${esc(x)}</span>`).join('') + '<span class="hint">스킬 배율 표에서 바꿉니다</span>';
  }
  { // ZONE 각성: 각성 가능한 ZONE이 전개돼 있을 때만
    const ok = ZONE_AWK.includes($('zoneT').value), el = $('zone');
    el.disabled = !ok; el.closest('label').title = ok ? '' : ($('zoneT').value ? '특수 ZONE은 각성할 수 없습니다' : 'ZONE이 전개돼 있어야 각성할 수 있습니다');
    el.closest('label').style.opacity = ok ? '' : '0.5';
  }
  { // ZONE 자체 효과 표시
    const z = zoneEffect(s0);
    $('zoneNote').textContent = !s0.zoneT ? '' : ['회복', '치유'].includes(s0.kind) ? `${s0.zoneT}: 회복·치유에는 적용하지 않습니다.`
      : `${z.k ? '극 ' : ''}${s0.zoneT} 효과: ${z.why}${z.v ? ` 대미지 ${z.v > 0 ? '+' : ''}${z.v}%` : ''}`
        + ($('zone').checked && !ZONE_AWK.includes(s0.zoneT) ? ' (특수 ZONE은 각성 불가)' : '')
        + (s0.zoneAb ? ` · ZONE 어빌리티 ${s0.zoneAb > 0 ? '+' : ''}${s0.zoneAb}%` : '')
        + (z.v || s0.zoneAb ? ` → 계산기 56행 합계 ${(z.v + (s0.zoneAb || 0)) > 0 ? '+' : ''}${z.v + (s0.zoneAb || 0)}%` : '');
  }
  const s = s0, phys = PHYS.includes(s.kind), isG = GS.includes(cat);
  const cur = evalBuild(itemsWith(null, null, s), s);
  lunatic.forEach((x, i) => { const el = document.getElementById('lunaEq' + i); if (!el || x.t !== '솔선') return;
    const eq = solEquip(x, itemsWith(null, null, s), s), e0 = +x.end || 0, s0 = +x.spr || 0;
    el.innerHTML = `<b>초기 내구 ${e0 + eq.end} → 힘 +${e0 + eq.end}</b><b>초기 정신 ${s0 + eq.spr} → 지능 +${s0 + eq.spr}</b><span class="hint">캐릭터 ${e0} / ${s0} + 장비 ${eq.end} / ${eq.spr}${x.eqManual ? ' (직접 입력)' : ' (장착 장비 자동 계산)'}</span>`; });
  const wt = weaponType();
  // 장착 칸
  $('total').innerHTML = `<span class="k">현재 세팅 기대 대미지</span><span class="v">${fmt(cur.exp)}</span><span class="n">일반 ${fmt(cur.n)} · 크리 ${fmt(cur.c)} · 크리율 ${+cur.crit.toFixed(2)}%${cuText(s, cur.mp)}${spText(cur)}</span><span class="n raw">25억 경감 전: ${fmt((cur.raw || cur).exp)}${cur.raw ? ` (일반 ${fmt(cur.raw.n)} · 크리 ${fmt(cur.raw.c)})` : ' · 경감 없음'}</span>`;
  const slotHtml = ([k, label]) => {
    const it = equip[k] ? getItem(equip[k], s) : null;
    let sub = '';
    if (GS.includes(k)) {
      const o = ore[k];
      sub = `<span class="o">${!it ? '' : it.noRef ? '연성 불가' : esc(oreName(it, o)) + (it.np && !it.sp ? ' · 잠재 연성 불가' : '')}</span>`;
      if (it && it.wt && it.wt !== wt) sub += `<span class="o warn">무기 종류(${esc(it.wt)})가 달라요</span>`;
    }
    if (k.startsWith('badge') && it && badgeVarKeys(it)) {   // 스탯 이름 배지: 수치는 사진 확인 창에서 입력한 값 (없으면 시트 값)
      const rows = badgeRows(k), base = it.lines.map(l => l[0].replace(/^·\s*/, '')).join(', ');
      sub += `<span class="o">${rows.length ? esc(rows.map(r => `${BADGE_LABEL[r.s]}${+r.v >= 0 ? '+' : ''}${+r.v || 0}`).join(', ')) + ' (사진에서 입력)' : `시트 값(${esc(base)})`}</span>`;
    }
    if (k === 'armor' && it && equip.weapon && it.t !== ARMOR_OF[wt]) sub = `<span class="o warn">${esc(wt)}${josaEun(wt)} ${ARMOR_OF[wt]}만 장착 가능 · 계산에서 제외</span>`;
    if (it && it.custom) sub = `<span class="o">${cusTagHtml(it)}</span>` + sub;
    const lk = lockOf(k, s.fate);
    if (lk) sub = `<span class="o warn">잠김 · 천명 ${lk} 이상 필요${it ? ' (계산 제외)' : ''}</span>`;
    return `<div class="slot ${GS.includes(k) ? 'g' : ''}${lk ? ' locked' : ''}" role="button" tabindex="0" data-slot="${k}" aria-pressed="${cat === k}">
      <span class="k">${lk ? '🔒 ' : ''}${label}</span><span class="v ${it && !lk ? '' : 'empty'}">${it ? esc(it.n) : lk ? '잠김' : '비어 있음'}</span>${sub}
      ${it ? `<span class="x" role="button" tabindex="0" data-unequip="${k}" aria-label="${label} 해제" title="해제">×</span>` : ''}</div>`;
  };
  $('slots').innerHTML = `<div class="srow">${SLOTS.filter(([k]) => !GS.includes(k)).map(slotHtml).join('')}</div><div class="srow g5">${SLOTS.filter(([k]) => GS.includes(k)).map(slotHtml).join('')}</div>`;
  $('cats').innerHTML = SLOTS.map(([k, label]) => `<button class="tab" type="button" data-cat="${k}" aria-pressed="${cat === k}">${label}</button>`).join('');
  // 보조 탭
  let sub = '';
  if (cat === 'weapon') {
    // 방어구를 장착했으면 그 방어구를 낄 수 있는 무기 종류만
    const at = equip.armor && ITEMS[equip.armor] ? ITEMS[equip.armor].t : '';
    const okT = at ? TYPES.filter(x => ARMOR_OF[x] === at) : TYPES;
    sub = ['전체'].concat(okT).map(t => `<button class="tab" type="button" data-sub="${t}" aria-pressed="${t === curType}">${t}</button>`).join('')
      + (at ? `<span class="hint" style="align-self:center">${at} 장착 중 · ${okT.join('·')}만 표시</span>` : '');
  }
  else if (cat === 'armor' && !equip.weapon) sub = ARMOR_TYPES.map(t => `<button class="tab" type="button" data-sub="${t}" aria-pressed="${t === armorType}">${t}</button>`).join('');
  else if (cat === 'armor') sub = `<button class="tab" type="button" aria-pressed="true" disabled>${ARMOR_OF[wt]}</button><span class="hint" style="align-self:center">${esc(wt)}${josaEun(wt)} ${ARMOR_OF[wt]}만 장착할 수 있습니다</span>`;
  else if (isG) {
    sub = `<button class="tab" type="button" data-gmode="glaster" aria-pressed="${gMode === 'glaster'}">글래스터 고르기</button><button class="tab" type="button" data-gmode="ore" aria-pressed="${gMode === 'ore'}">연성 광석 고르기</button>`;
    if (gMode === 'glaster' && cat !== 'gs') sub += '<span class="sep"></span>' + FAMS.filter(t => t !== '특수계').map(t => `<button class="tab" type="button" data-fam="${t}" aria-pressed="${t === gFam}">${t}</button>`).join('');
  }
  $('subtabs').innerHTML = sub; $('subtabs').hidden = !sub;
  $('dmgWrap').hidden = !isG;
  $('withWrap').hidden = !(isG && gMode === 'glaster');
  $('gHint').hidden = !isG;
  if (isG) {
    const g = equip[cat] ? ITEMS[equip[cat]] : null;
    $('gHint').innerHTML = (cat === 'gs' && gMode === 'glaster' ? '전용 글래스터 칸에는 특정 캐릭터 전용 글래스터와 특수계 글래스터가 나옵니다. 왼쪽 "캐릭터 이름"을 넣으면 다른 캐릭터의 전용 글래스터는 빠집니다. ' : '') + (gMode === 'glaster'
      ? `무기 종류 <b>${esc(wt)}</b>에 맞는 글래스터와 조건 없는 글래스터를 보여 줍니다. ` + ($('withOre').checked ? '글래스터마다 각성·잠재 연성·특수 광석 중 가장 좋은 상태를 붙여 비교합니다. "장착"하면 그 상태까지 적용됩니다.' : '상급·P 글래스터는 "각성 + 잠재 연성", 그 외는 "각성" 상태로 비교합니다. 장착한 뒤 "연성 광석 고르기"에서 연성을 바꿀 수 있습니다.')
      : !g ? '이 칸에 글래스터를 먼저 장착하세요.'
        : g.noRef ? `<b>${esc(g.n)}</b>은(는) 연성할 수 없는 글래스터라 각성 효과로만 계산합니다.`
        : `이 칸의 글래스터(<b>${esc(g.n)}</b>, 지금 <b>${esc(oreName(g, ore[cat]))}</b>)의 연성을 바꿔 비교합니다. ` + ((g.pot ? '상급·P 글래스터라 "각성 + 잠재 연성"이 기본입니다. ' : '"각성"이 기본입니다. ') + (g.canPot ? '각성한 상태에서 잠재 연성을 하면 각성 효과가 잠재 연성 값으로 강화됩니다.' : '이 글래스터는 잠재 연성이 없어 특수 광석만 연성할 수 있습니다.')) + ' 특수 광석으로 바꾸면 각성 효과 + 광석 효과로 계산합니다.');
  }
  const slotName = SLOTS.find(x => x[0] === cat)[1];
  $('thName').textContent = isG ? (gMode === 'ore' ? '광석' : '글래스터') : { weapon: '무기', armor: '방어구', badge1: '배지', badge2: '배지' }[cat];
  $('thStat').textContent = cat === 'weapon' ? '공격 / 마력' : cat === 'armor' ? '방어 / 마방' : isG && gMode === 'glaster' ? '활성 스탯' : '';

  const lockNow = lockOf(cat, s.fate);
  const list = lockNow ? [] : candidates(s);
  const gEqForChip = isG && equip[cat] ? ITEMS[equip[cat]] : null;
  const best = isG && gMode === 'glaster' && s.withOre;
  let oreOpts = null;
  if (best) { // 광석만 먼저 순위를 매겨 상위 8개 + 연성 안 함 + 잠재 광석만 글래스터마다 대입
    const special = Object.values(ORES).filter(o => o.fx.length && o.id !== 'pot');
    const probe = equip[cat] || (DATA.gl.find(x => !x.pot) || {}).id;
    const ranked = special.map(o => [o, evalBuild(itemsWith(cat, probe, s, o.id), s)[s.sort]]).sort((a, b) => b[1] - a[1]);
    oreOpts = [ORES['']].concat(ranked.slice(0, 8).map(r => r[0]));
  }
  const emptyBase = evalBuild(itemsWith(cat, null, s), s);   // 이 칸이 비었을 때 (실효값 계산용)
  const res = list.map(it => {
    let v, bo;
    if (best) { // 글래스터마다 가장 좋은 연성 광석을 붙여 비교
      for (const o of (it.noRef ? [ORES['']] : it.canPot ? [ORES.pot].concat(oreOpts) : oreOpts)) {
        const r = evalBuild(itemsWith(cat, it.id, s, o.id), s);
        if (!v || r[s.sort] > v[s.sort] + 1e-9) { v = r; bo = o.id; }
      }
    } else v = evalBuild(itemsWith(cat, candId(it), s), s);
    const fx = it.slot === 'glaster' ? glasterEff(it).fx : withWChoice(it, s).fx;
    const chips = fx.map(e => interpret(e, s, phys));
    let shownOre;
    if (it.slot === 'glaster') {
      shownOre = best ? bo : defOre(it);
      const gfx = glasterEff(it, shownOre).fx;
      chips.length = 0; gfx.forEach(e => chips.push(interpret(e, s, phys)));
      chips.unshift([it.noRef ? '연성 불가' : oreName(it, shownOre), true, 'ore']);
      if (shownOre && shownOre !== 'pot') ORES[shownOre].fx.forEach(e => chips.push(interpret(e, s, phys)));
    }
    if (it.id === 'pot') chips.splice(0, chips.length, ['각성 효과를 잠재 연성 값으로 강화' + (gEqForChip && defOre(gEqForChip) === 'pot' ? ' (기본)' : ''), true, 'ore']);
    else if (it.id === '' && !it.slot) chips.splice(0, chips.length, ['각성 효과 적용' + (gEqForChip && defOre(gEqForChip) === '' ? ' (기본)' : ''), true, 'ore']);
    // 하극상(장비)은 다른 장비 하극상과 특수 연산으로 합쳐지므로 실제로 더해지는 값을 함께 표시
    if (fx.some(e => e.k === 'gekoku')) {
      const eff = v.gk - emptyBase.gk;
      chips.forEach(c => { if (/^하극상 \+/.test(c[0])) { const raw = parseFloat(c[0].replace(/[^0-9.]/g, '')); if (Math.abs(raw - eff) > 0.005) c[0] += ` (실효 +${+eff.toFixed(2)}%)`; } });
    }
    return Object.assign(v, { it, chips, bo: shownOre });
  });
  res.sort((a, b) => b[s.sort] - a[s.sort]);
  const oreMode = isG && gMode === 'ore';
  if (oreMode) { // 기본 상태(각성 · 잠재 연성)를 맨 위에 고정
    const base = ((gEqForChip && defOre(gEqForChip) === 'pot') ? ['pot', ''] : ['', 'pot']).map(id => res.find(x => x.it.id === id)).filter(Boolean);
    const rest = res.filter(x => x.it.id !== 'pot' && x.it.id !== '');
    res.length = 0; res.push(...base, ...rest); res.nBase = base.length;
  }
  const pledgeMode = cat === 'gs' && gMode === 'glaster';
  if (pledgeMode) { // 전용 칸: 클래스 증표를 따로 묶어 맨 위에
    const pl = res.filter(x => isClassPledge(x.it)), rest = res.filter(x => !isClassPledge(x.it));
    res.length = 0; res.push(...pl, ...rest); res.nPl = pl.length;
  }
  const tb = $('tbody');
  const label = { exp: '기대 대미지', n: '일반 평균', c: '크리티컬 평균', max: '최대' }[s.sort];
  if (!res.length) {
    tb.innerHTML = lockNow ? `<tr><td colspan="9" class="empty">🔒 이 칸은 천명 ${lockNow} 이상부터 열립니다. (지금 천명 ${s.fate})</td></tr>` : isG && gMode === 'ore' ? `<tr><td colspan="9" class="empty">이 칸에서는 고를 광석이 없습니다. 위 안내를 확인하세요.</td></tr>` : `<tr><td colspan="9" class="empty">조건에 맞는 후보가 없습니다. 검색어를 지우거나 "다른 캐릭터 전용 장비 숨기기"를 끄세요.</td></tr>`;
    $('summary').innerHTML = ''; return;
  }
  const top = res.reduce((a, x) => x[s.sort] > a[s.sort] ? x : a, res[0]), maxV = Math.max(...res.map(x => x[s.sort]));
  const curV = cur[s.sort];
  const warn = cat !== 'weapon' && !equip.weapon ? `<div class="sum-card"><span class="k">확인</span><span class="v" style="font-size:14px;font-family:var(--body)">무기 칸이 비어 있습니다</span><span class="n" style="font-family:var(--body)">무기를 먼저 장착하면 실제와 가까운 수치가 나옵니다.</span></div>` : '';
  const topGain = curV ? (top[s.sort] / curV - 1) * 100 : 0;
  $('summary').innerHTML = `
    <div class="sum-card"><span class="k">${slotName}${isG && gMode === 'ore' ? ' 연성' : ''} 1위 · ${label}</span><span class="v">${esc(top.it.n)}</span><span class="n">${fmt(top[s.sort])}${isOn(top.it.id) ? ' · 장착 중' : curV ? ` · 현재보다 ${topGain >= 0 ? '+' : ''}${topGain.toFixed(1)}%` : ''}</span></div>
    <div class="sum-card"><span class="k">계산 조건</span><span class="v" style="font-size:15px;font-family:var(--body)">${esc(s.kind)} · ${esc(s.elem)} · ${s.power}% × ${Math.max(1, s.hits)}타</span><span class="n" style="font-family:var(--body)">대상 Lv${s.tlv} · ${esc(s.aff)} · 후보 ${res.length}개</span></div>${warn}`;
  let html = '';
  const gEq = isG && equip[cat] ? ITEMS[equip[cat]] : null;
  // 다른 칸에 이미 장착된 글래스터 (이름 기준)
  const takenBy = n => SLOTS.filter(([k]) => GS.includes(k) && k !== cat && equip[k] && ITEMS[equip[k]].n === n).map(([, l]) => l);
  res.forEach((x, i) => {
    if (oreMode && i === 0 && res.nBase) html += `<tr class="grp"><td colspan="9">기본 연성 상태</td></tr>`;
    if (pledgeMode && i === 0 && res.nPl) html += `<tr class="grp"><td colspan="9">5★ 클래스 증표</td></tr>`;
    if (pledgeMode && i === (res.nPl || 0)) html += `<tr class="grp"><td colspan="9">전용 글래스터 · ${label} 순</td></tr>`;
    if (oreMode && i === (res.nBase || 0)) html += `<tr class="grp"><td colspan="9">특수 광석 · ${label} 순</td></tr>`;
    const k = x.it.id, on = isOn(k), rowKey = 'k' + k;
    const d = curV ? (x[s.sort] / curV - 1) * 100 : null;
    const chips = x.chips.map(c => `<span class="chip ${c[2]} ${c[1] ? '' : 'off'}">${esc(c[0])}</span>`).join('');
    const un = !oreMode && optExcl.has(x.it.id);
    const tags = ((cat === 'armor' && !equip.weapon && armorType === '전체') || (cat === 'weapon' && curType === '전체') ? `<span class="tag">${esc(x.it.t)}</span>` : '')
      + cusTagHtml(x.it) + (un ? '<span class="tag un">미보유</span>' : '')
      + (x.it.slot === 'glaster' ? (x.it.grade ? `<span class="tag">${esc(x.it.grade)}${x.it.hasP ? '·P' : ''}</span>` : '') + condTag(x.it) + (x.it.noRef ? '<span class="tag">연성 불가</span>' : x.it.np && !x.it.sp ? '<span class="tag">잠재 연성 불가</span>' : '') : '')
      + (x.it.only ? `<span class="tag only">${esc(x.it.only)} 전용</span>` : '')
      + (x.it.sn ? '<span class="tag" title="' + esc(x.it.sn) + '">범위</span>' : '')
      + (oreMode && gEq && k === defOre(gEq) ? '<span class="tag">기본</span>' : '')
      + (x.it.slot === 'glaster' && !oreMode && takenBy(x.it.n).length ? `<span class="tag taken">${esc(takenBy(x.it.n).join(', '))}에 이미 장착됨</span>` : '');
    html += `<tr class="row ${on ? 'cur' : ''}${un ? ' unown' : ''}" data-k="${esc(rowKey)}" tabindex="0" aria-expanded="${openKey === rowKey}">
      <td class="rank">${oreMode && i < (res.nBase || 0) ? '' : oreMode ? i + 1 - (res.nBase || 0) : pledgeMode && i < (res.nPl || 0) ? '' : pledgeMode ? i + 1 - (res.nPl || 0) : i + 1}</td>
      <td><span class="name">${esc(oreMode && k === '' && gEq ? oreName(gEq, '') : x.it.n)}</span>${tags}
        <div class="chips">${chips || '<span class="hint">대미지 관련 효과 없음</span>'}</div></td>
      <td class="r mono">${statText(x.it)}</td>
      <td class="r mono">${fmt(x.n)}</td>
      <td class="r mono crit">${fmt(x.c)}</td>
      <td class="r mono">${+x.crit.toFixed(2)}%</td>
      <td class="r barcell"><span class="exp">${fmt(x.exp)}</span>${x.raw ? `<div class="rawv">경감 전 ${fmt(x.raw.exp)}</div>` : ''}<div class="bar"><i style="width:${(x[s.sort] / maxV * 100).toFixed(1)}%"></i></div></td>
      <td class="r">${on ? '<span class="delta">장착 중</span>' : d === null ? '<span class="hint">—</span>' : `<span class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d.toFixed(1)}%</span>`}</td>
      <td class="r"><button class="eq ${on ? 'on' : ''}" type="button" data-eq="${esc(k)}"${x.bo !== undefined && !on ? ` data-ore="${esc(x.bo)}"` : ''}>${on ? '해제' : isG && gMode === 'ore' ? '연성' : '장착'}</button>${oreMode ? '' : `<button class="own${un ? ' on' : ''}" type="button" data-own="${esc(x.it.id)}" aria-pressed="${un}">${un ? '보유' : '미보유'}</button>`}</td></tr>`;
    if (openKey === rowKey) {
      let lines = (x.it.lines || []).filter(l => l[0]);
      if (x.it.slot === 'glaster') {
        const usePot = (isG && gMode === 'glaster' ? x.bo : ore[cat]) === 'pot' && x.it.canPot;
        lines = lines.filter(l => x.it.canPot || !l[0].startsWith('잠재 연성')).map(l => [l[0], l[1] && !(l[0].startsWith('각성') && usePot) && !(l[0].startsWith('잠재 연성') && !usePot)]);
      }
      html += `<tr class="detail"><td colspan="9"><div class="det">
        <div><h4>효과 원문</h4><ul>${lines.map(l => `<li class="${l[1] ? 'p' : 'u'}">${esc(l[0])}</li>`).join('') || '<li class="u">효과 없음</li>'}</ul>
          ${x.it.conds && x.it.conds.length ? `<h4 style="margin-top:10px">장착 조건</h4><div class="src">${esc(x.it.conds.join(', '))}</div>` : ''}</div>
        <div><h4>대미지 범위 (1타)</h4><div class="mono">일반 ${fmt(x.r.n.min)} ~ ${fmt(x.r.n.max)}<br>크리 ${fmt(x.r.c.min)} ~ ${fmt(x.r.c.max)}</div>
          ${x.it.src ? `<h4 style="margin-top:10px">획득처</h4><div class="src">${esc(x.it.src)}</div>` : ''}</div>
      </div></td></tr>`;
    }
  });
  const fid = document.activeElement && document.activeElement.closest && document.activeElement.closest('#tbody') ? document.activeElement.id : '';
  tb.innerHTML = html;
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); if (el.type === 'number') { const v = el.value; el.value = ''; el.value = v; } } }
}

document.addEventListener('click', e => {
  const ow = e.target.closest('[data-own]');
  if (ow) { e.stopPropagation(); const id = ow.dataset.own; if (optExcl.has(id)) optExcl.delete(id); else optExcl.add(id); optSaveExcl(); render(); return; }
  if (e.target.closest('.prow') || e.target.closest('.bvals')) return;
  const un = e.target.closest('[data-unequip]');
  if (un) { equip[un.dataset.unequip] = null; render(); return; }
  const sl = e.target.closest('[data-slot]');
  if (sl) { cat = sl.dataset.slot; openKey = null; render(); return; }
  const c = e.target.closest('[data-cat]');
  if (c) { cat = c.dataset.cat; openKey = null; render(); return; }
  const sb = e.target.closest('[data-sub]');
  if (sb) { if (cat === 'weapon') curType = sb.dataset.sub; else armorType = sb.dataset.sub; openKey = null; render(); return; }
  const gm = e.target.closest('[data-gmode]');
  if (gm) { gMode = gm.dataset.gmode; openKey = null; render(); return; }
  const fm = e.target.closest('[data-fam]');
  if (fm) { gFam = fm.dataset.fam; openKey = null; render(); return; }
  const eq = e.target.closest('[data-eq]');
  if (eq && lockOf(cat, S().fate)) return;
  if (eq) {
    const id = eq.dataset.eq;
    if (GS.includes(cat) && gMode === 'ore') ore[cat] = ore[cat] === id ? '' : id;
    else {
      const wasOn = equip[cat] === id;
      equip[cat] = wasOn ? null : id;
      if (cat.startsWith('badge')) badgeVal[cat] = [];   // 새 배지는 시트 값부터
      if (!wasOn && GS.includes(cat)) {
        ore[cat] = eq.dataset.ore !== undefined ? eq.dataset.ore : defOre(ITEMS[id]);   // 비교할 때의 연성 상태 그대로 장착
      }
    }
    render(); return;
  }
  const tr = e.target.closest('tr.row');
  if (tr) { openKey = openKey === tr.dataset.k ? null : tr.dataset.k; render(); }
});
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('.prow')) return;
  if ((e.key === 'Enter' || e.key === ' ') && (e.target.matches('tr.row') || e.target.matches('[data-unequip]') || e.target.matches('[data-slot]'))) { e.preventDefault(); e.target.click(); }
});
let rT; const renderSoon = () => { clearTimeout(rT); rT = setTimeout(render, 120); };
document.querySelector('aside').addEventListener('input', renderSoon);
$('pMode').addEventListener('change', () => { renderPgl(); });
$('pglOpen').onclick = openPgl;
$('pglClose').onclick = closePgl;
$('pglModal').addEventListener('click', e => {
  if (e.target === $('pglModal')) { closePgl(); return; }
  const b = e.target.closest('[data-padd]');
  if (b && pgl.length < PGL_MAX) { const g = PG[b.dataset.padd]; const c = pDefCond(g); const v = g.vars.find(x => x.c === c); pgl.push({ n: g.n, c, o: v.potOk || !v.la.length ? 'pot' : '', m: false }); renderPgl(); renderPglRows(); render(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('pglModal').hidden) { e.preventDefault(); closePgl(); } });
$('pglQ').addEventListener('input', renderPglRows);
$('pglDmg').addEventListener('change', renderPglRows);
$('pglSort').addEventListener('change', renderPglRows);
$('pglList').addEventListener('click', e => { const d = e.target.closest('[data-pdel]'); if (d) { pgl.splice(+d.dataset.pdel, 1); renderPgl(); render(); } });
$('pglList').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.pi !== undefined) pgl[+el.dataset.pi].o = el.value;
  else if (el.dataset.pc !== undefined) { const p = pgl[+el.dataset.pc]; p.c = el.value; if (!pVar(p).potOk && pVar(p).la.length) p.o = ''; else if (pVar(p).potOk || !pVar(p).la.length) p.o = p.o || 'pot'; }
  else if (el.dataset.pm !== undefined) pgl[+el.dataset.pm].m = el.checked;
  else return;
  renderPgl(); render();
});
$('lunaAdd').onclick = () => { const t = ['솔선', '결사', '심안'].find(x => !lunatic.some(l => l.t === x)); if (t) { lunatic.push(t === '솔선' && solBase ? { t, v: 0, end: solBase.end, spr: solBase.spr } : { t, v: 0 }); renderLuna(); render(); } };
$('lunaList').addEventListener('click', e => { const d = e.target.closest('[data-ldel]'); if (d) { lunatic.splice(+d.dataset.ldel, 1); renderLuna(); render(); } });
$('lunaList').addEventListener('input', e => { const el = e.target.closest('input[data-lf]'); if (!el) return; if (el.type === 'checkbox') { lunatic[+el.dataset.li][el.dataset.lf] = el.checked; renderLuna(); render(); } else { lunatic[+el.dataset.li][el.dataset.lf] = +el.value || 0; renderSoon(); } });
$('lunaList').addEventListener('change', e => { const el = e.target.closest('select[data-li]'); if (el) { const L = lunatic[+el.dataset.li]; L.t = el.value; if (L.t === '솔선' && solBase && !+L.end && !+L.spr) { L.end = solBase.end; L.spr = solBase.spr; } renderLuna(); render(); } });
const onPledge = e => { const el = e.target.closest('[data-pl]'); if (!el) return; const r = pledge[el.dataset.pl][+el.dataset.i]; if (el.dataset.f === 's') r[0] = el.value; else r[1] = +el.value || 0; renderSoon(); };
$('tbody').addEventListener('input', onPledge);
$('tbody').addEventListener('change', onPledge);
$('tbody').addEventListener('change', e => { const w = e.target.closest('[data-wch]'); if (w) { const arr = wChoice[w.dataset.wch] = wChoice[w.dataset.wch] || []; arr[+w.dataset.i] = w.value; save(); renderSoon(); return; } });
$('tbody').addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (!el) return; const arr = gChoice[el.dataset.ch] = gChoice[el.dataset.ch] || []; arr[+el.dataset.i] = el.value; renderSoon(); });
$('slots').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.bsel) { badgeRows(el.dataset.bsel)[+el.dataset.i].s = el.value; render(); }
  else if (el.dataset.bnum) { badgeRows(el.dataset.bnum)[+el.dataset.i].v = el.value === '' ? 0 : +el.value; render(); }
});
$('slots').addEventListener('click', e => {
  const a = e.target.closest('[data-badd]'), d = e.target.closest('[data-bdel]');
  if (a) { const k = a.dataset.badd; if (!Array.isArray(badgeVal[k])) badgeVal[k] = []; const used = badgeVal[k].map(r => r.s), pref = (equip[k] && ITEMS[equip[k]] && badgeVarKeys(ITEMS[equip[k]])) || []; badgeVal[k].push({ s: pref.find(f => !used.includes(f)) || BADGE_STATS.find(f => !used.includes(f)) || 'str', v: 0 }); render(); setTimeout(() => { const ins = document.querySelectorAll(`[data-bnum="${k}"]`); if (ins.length) ins[ins.length - 1].focus(); }, 0); }
  else if (d) { badgeRows(d.dataset.bdel).splice(+d.dataset.i, 1); render(); }
});
$('slots').addEventListener('keydown', e => { if (e.target.closest('.bvals')) e.stopPropagation(); });
$('dmgOnly').addEventListener('change', render);
$('withOre').addEventListener('change', render);
$('q').addEventListener('input', renderSoon); $('sort').addEventListener('change', render);
$('reset').onclick = () => { fields.forEach(el => { if (el.type === 'checkbox') el.checked = defaults[el.id]; else el.value = defaults[el.id]; }); render(); };
load(); renderLuna(); render();

// ───────── 스킬 배율 표 (대상·유형·속성·위력 등급 → 1Hit 위력) ─────────
// 계산기의 '표준 위력 계산기'와 같은 식: 표 위력 = (단일 130 / 전체 90) + 무속성 10 + 물리 10 + 등급(약 0·중 20·강 40·극 60·극대 110)
//   1Hit 위력 = ROUNDDOWN( ROUNDUP(표 위력 ÷ 타수) × 위력 ○배 ), 기본 공격 = 100
const POW_GRADE = { '약': 0, '중': 20, '강': 40, '극': 60, '극대': 110 };
const powTable = (tg, cls, none, gr) => gr === '기본 공격' ? 100 : (tg === '단일' ? 130 : 90) + (none ? 10 : 0) + (cls === '물리' ? 10 : 0) + POW_GRADE[gr];
function powCalc() {
  const tg = $('pwTarget').value, cls = $('pwCls').value, none = $('pwElem').value === '무속성', gr = $('pwGrade').value;
  const hits = Math.max(1, Math.round(+$('pwHits').value || 1)), mul = +$('pwMul').value || 0;
  const base = powTable(tg, cls, none, gr), per = base / hits, v = per * mul;
  const r4 = x => Math.round(x * 10000) / 10000;   // 표시용 (부동소수 잡음 제거)
  return { tg, cls, none, gr, hits, mul, base, per: r4(per), v: r4(v) };
}
function renderPow() {
  const c = powCalc(), gs = ['약', '중', '강', '극', '극대'];
  let h = `<thead><tr><th>대상</th><th>유형</th><th>속성</th>${gs.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>`;
  h += `<tr><th colspan="3" scope="row">기본 공격 (물리·무속성)</th><td class="v${c.gr === '기본 공격' ? ' sel' : ''}" data-pw="단일|물리|1|기본 공격" colspan="5">100%</td></tr>`;
  for (const tg of ['단일', '전체']) for (const cls of ['물리', '마법']) for (const none of [true, false]) {
    const first = cls === '물리' && none, firstC = none;
    h += `<tr>${first ? `<th rowspan="4" scope="rowgroup">${tg}</th>` : ''}${firstC ? `<th rowspan="2" scope="rowgroup">${cls}</th>` : ''}<th scope="row">${none ? '무속성' : '속성'}</th>` + gs.map(g => {
      const on = c.gr === g && c.tg === tg && c.cls === cls && c.none === none;
      return `<td class="v${on ? ' sel' : ''}" data-pw="${tg}|${cls}|${none ? 1 : 0}|${g}">${powTable(tg, cls, none, g)}%</td>`;
    }).join('') + '</tr>';
  }
  $('powTb').innerHTML = h + '</tbody>';
  $('powRes').innerHTML = c.gr === '기본 공격'
    ? `기본 공격: 표 위력 100%${c.hits > 1 ? ` → ${c.hits}타로 나눠 ${c.per}%` : ''}${c.mul !== 1 ? ` × ${c.mul}배` : ''} → 1Hit 위력 <b>${c.v}%</b> × ${c.hits}타`
    : `${c.tg} · ${c.cls} · ${c.none ? '무속성' : '속성'} · ${c.gr}: 표 위력 ${c.base}%${c.hits > 1 ? ` → ${c.hits}타로 나눠 ${c.per}%` : ''}${c.mul !== 1 ? ` × ${c.mul}배` : ''} → 1Hit 위력 <b>${c.v}%</b> × ${c.hits}타`;
}
let powLastFocus = null;
function openPow() {
  powLastFocus = document.activeElement;
  const s = S();
  $('pwTarget').value = s.range === '단일' ? '단일' : '전체';
  $('pwCls').value = PHYS.includes(s.kind) ? '물리' : '마법';
  $('pwElem').value = s.elem;
  $('pwHits').value = Math.max(1, s.hits || 1);
  $('powModal').hidden = false; renderPow(); $('pwGrade').focus();
}
function closePow() { $('powModal').hidden = true; if (powLastFocus) powLastFocus.focus(); }
$('powOpen').onclick = openPow;
$('powClose').onclick = closePow; $('powCancel').onclick = closePow;
$('powModal').addEventListener('click', e => {
  if (e.target === $('powModal')) { closePow(); return; }
  const td = e.target.closest('[data-pw]');
  if (td) {
    const [tg, cls, none, gr] = td.dataset.pw.split('|');
    $('pwTarget').value = tg; $('pwCls').value = cls; $('pwGrade').value = gr;
    if (none === '1') $('pwElem').value = '무속성';
    else if ($('pwElem').value === '무속성') $('pwElem').value = $('elem').value !== '무속성' ? $('elem').value : '불';
    renderPow();
  }
});
['pwTarget', 'pwCls', 'pwElem', 'pwGrade', 'pwMul', 'pwHits'].forEach(id => $(id).addEventListener('input', renderPow));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('powModal').hidden) { e.preventDefault(); closePow(); } });
$('powApply').onclick = () => {
  const c = powCalc();
  $('range').value = c.tg; $('atkCls').value = c.cls; $('elem').value = $('pwElem').value;
  $('power').value = c.v; $('hits').value = c.hits;
  $('normalAtk').checked = c.gr === '기본 공격';
  closePow(); render();
};

// 창 크기 조절: 각 모달 카드 우하단 손잡이(마우스·터치 공용), 크기는 창별로 기억
(() => {
  const KEY = 'ae-modal-size';
  let sz = {}; try { sz = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  const keyOf = c => (c.closest('[id]') || c).id || 'm';
  const apply = c => { const v = sz[keyOf(c)]; if (v) { c.classList.add('sized'); c.style.width = Math.min(v[0], innerWidth * 0.98) + 'px'; c.style.height = Math.min(v[1], innerHeight * 0.96) + 'px'; c.style.maxHeight = '96vh'; } };
  document.querySelectorAll('.modal-card').forEach(c => {
    if (c.querySelector(':scope > .rs-grip')) return;
    const g = document.createElement('div'); g.className = 'rs-grip'; g.title = '끌어서 창 크기 조절 (두 번 누르면 원래 크기)'; c.appendChild(g);
    apply(c);
    g.addEventListener('pointerdown', e => {
      e.preventDefault(); g.setPointerCapture(e.pointerId);
      const r = c.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
      c.classList.add('sized'); c.style.maxHeight = '96vh';
      const mv = ev => {
        // 카드가 화면 중앙 정렬이라 가로는 양쪽으로 늘어남 → 이동량의 2배
        c.style.width = Math.max(300, Math.min(innerWidth * 0.98, r.width + 2 * (ev.clientX - x0))) + 'px';
        c.style.height = Math.max(220, Math.min(innerHeight * 0.96, r.height + 2 * (ev.clientY - y0))) + 'px';
      };
      const up = () => {
        g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
        const b = c.getBoundingClientRect(); sz[keyOf(c)] = [Math.round(b.width), Math.round(b.height)];
        try { localStorage.setItem(KEY, JSON.stringify(sz)); } catch (e) {}
      };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
    g.addEventListener('dblclick', () => {
      delete sz[keyOf(c)]; try { localStorage.setItem(KEY, JSON.stringify(sz)); } catch (e) {}
      c.classList.remove('sized'); c.style.width = c.style.height = c.style.maxHeight = '';
    });
  });
})();

// 모바일 숫자 키패드에 '−'가 없는 문제: 음수가 들어갈 수 있는 숫자 칸에 ± 버튼 (터치 기기에서만 보임)
(() => {
  const POS = new Set(['str', 'int', 'spd', 'luck', 'mp', 'power', 'tlv', 'tdef', 'tmdef', 'bCombo', 'hits', 'fate']);
  const want = el => { if (el.type !== 'number' || el.closest('.neg-wrap')) return false; const k = el.id || (el.dataset && el.dataset.rv) || ''; if (POS.has(k) || POS.has(el.dataset && el.dataset.rv)) return false; return el.min === '' || +el.min < 0; };
  const fire = el => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const add = el => {
    const w = document.createElement('span'); w.className = 'neg-wrap'; el.parentNode.insertBefore(w, el); w.appendChild(el);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'neg-btn'; b.textContent = '±'; b.tabIndex = -1; b.setAttribute('aria-label', '부호 바꾸기 (음수/양수)'); w.appendChild(b);
    b.addEventListener('pointerdown', e => e.preventDefault());   // 입력 칸 포커스·키패드 유지
    b.addEventListener('click', () => {
      if (el.disabled) return;
      const v = +el.value || 0;
      if (v) { delete el.dataset.neg; el.value = String(-v); b.classList.remove('on'); fire(el); }
      else { const on = el.dataset.neg !== '1'; if (on) el.dataset.neg = '1'; else delete el.dataset.neg; b.classList.toggle('on', on); }   // 0이면 다음 입력을 음수로
    });
    el.addEventListener('input', () => { if (el.dataset.neg === '1' && +el.value > 0) { delete el.dataset.neg; b.classList.remove('on'); el.value = String(-el.value); fire(el); } });
  };
  const scan = root => (root.querySelectorAll ? root.querySelectorAll('input[type=number]') : []).forEach(el => { if (want(el)) add(el); });
  scan(document);
  let q = false; new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; scan(document); }); }).observe(document.body, { childList: true, subtree: true });
})();
