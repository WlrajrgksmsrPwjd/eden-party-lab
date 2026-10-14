
// ── 대미지 역산: 입력부와 같은 항목을 가진 창에서 한 항목을 골라, 본 대미지에서 그 값을 거꾸로 구함 ──
let revVals = {}, revTarget = '', revObs = [''], revCrit = 'n', revRes = null, revLastFocus = null, revLo = '', revHi = '';
function revFields() {   // 입력부(aside) 순서 그대로: { el, id, label, head, kind }
  const out = []; let head = '';
  document.querySelectorAll('aside .sec-h, aside .sub-h, aside input, aside select').forEach(el => {
    if (el.matches('.sec-h, .sub-h')) { head = (el.childNodes[0] && el.childNodes[0].textContent || el.textContent).trim(); return; }
    if (!el.id || el.closest('[hidden]') || el.type === 'file' || el.type === 'search') return;
    const lab = el.closest('label'); let label = el.getAttribute('aria-label') || '';
    if (lab) { const c = lab.cloneNode(true); c.querySelectorAll('input, select, .hint').forEach(x => x.remove()); label = c.textContent.replace(/\s+/g, ' ').trim() || label; }
    out.push({ el, id: el.id, label: label || el.id, head, kind: el.type === 'checkbox' ? 'chk' : el.tagName === 'SELECT' ? 'sel' : el.type === 'number' ? 'num' : 'txt' });
  });
  return out;
}
const revGet = el => el.type === 'checkbox' ? el.checked : el.value;
const revSet = (el, v) => { if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
// 창의 값으로 잠시 바꿔 계산 (계산 뒤 원래 값으로 되돌림)
function revWith(over, fn) {
  const F = revFields(), save = F.map(f => [f.el, revGet(f.el)]);
  try { F.forEach(f => { if (over[f.id] !== undefined) revSet(f.el, over[f.id]); }); return fn(); }
  finally { save.forEach(([el, v]) => revSet(el, v)); }
}
function revHit(over) {   // 1타 대미지 (일반·크리) 최소~최대
  return revWith(over, () => { const s = S(); const r = evalBuild(itemsWith(null, null, s), s).r; return revCrit === 'c' ? r.c : r.n; });
}
function revRun() {
  const F = revFields(), f = F.find(x => x.id === revTarget); revRes = null;
  const obs = revObs.map(v => +String(v).replace(/,/g, '')).filter(v => v > 0);
  if (!f) { revRes = { err: '역산할 항목을 고르세요.' }; return; }
  if (!obs.length) { revRes = { err: '게임에서 본 1타 대미지를 넣으세요.' }; return; }
  const step = f.el.step === 'any' || /\./.test(f.el.step || '') ? 0.01 : 1;
  const cur = +revVals[f.id] || 0;
  let lo = revLo !== '' ? +revLo : f.el.min !== '' ? +f.el.min : Math.min(0, cur), hi = revHi !== '' ? +revHi : f.el.max !== '' ? +f.el.max : Math.max(cur * 4, cur + 2000, 1000);
  if (!(hi > lo)) { revRes = { err: '찾을 범위가 잘못됐습니다.' }; return; }
  const N = Math.round((hi - lo) / step), X = i => +(lo + i * step).toFixed(step < 1 ? 2 : 0);
  const at = i => revHit(Object.assign({}, revVals, { [f.id]: X(i) }));
  const a = at(0), b = at(N); const inc = b.avg >= a.avg;
  if (Math.abs(b.avg - a.avg) < 1e-9) { revRes = { err: `${f.label} 값을 ${X(0)}~${X(N)}로 바꿔도 대미지가 변하지 않습니다. (상한·조건 때문에 이 항목이 계산에 쓰이지 않거나 상한에 걸림)` }; return; }
  // 대미지가 한 방향으로 변한다고 보고, 본 값이 무작위 폭(최소~최대) 안에 들어오는 구간을 이분 탐색
  const ok = [];
  for (const o of obs) {
    // first: 최대가 o 이상(증가) / 최소가 o 이하(감소)가 되는 첫 위치, last: 반대쪽 끝
    const firstIdx = pred => { let l = 0, r = N + 1; while (l < r) { const m = (l + r) >> 1; if (pred(at(m))) r = m; else l = m + 1; } return l; };
    let s0, s1;
    if (inc) { s0 = firstIdx(h => h.max >= o); s1 = firstIdx(h => h.min > o) - 1; }
    else { s0 = firstIdx(h => h.min <= o); s1 = firstIdx(h => h.max < o) - 1; }
    ok.push([s0, s1]);
  }
  const s0 = Math.max(...ok.map(x => x[0])), s1 = Math.min(...ok.map(x => x[1]));
  const hit0 = at(0), hitN = at(N);
  if (s0 > s1 || s0 > N || s1 < 0) {
    const edge = inc ? (Math.min(...obs) < hit0.min ? 'low' : Math.max(...obs) > hitN.max ? 'high' : '') : (Math.max(...obs) > hit0.max ? 'low' : Math.min(...obs) < hitN.min ? 'high' : '');
    revRes = { err: `${X(0)}~${X(N)} 범위 안에서는 본 대미지가 나오는 값이 없습니다.` + (edge === 'low' ? ' 범위 최솟값보다 더 낮은 쪽일 수 있어요.' : edge === 'high' ? ' 범위 최댓값보다 더 높은 쪽일 수 있어요.' : obs.length > 1 ? ' 넣은 대미지들이 서로 맞지 않습니다(조건이 다른 타격일 수 있음).' : ' 다른 입력값이 실제와 다를 수 있어요.'), range: [X(0), X(N)], dmg: [Math.round(hit0.min), Math.round(hitN.max)] };
    return;
  }
  revRes = { f, lo: X(s0), hi: X(s1), mid: X(Math.round((s0 + s1) / 2)), atLo: at(s0), atHi: at(s1) };
}
function renderRev() {
  const F = revFields(), box = $('revBody');
  const opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(l)}</option>`;
  let h = `<div class="rev-obs"><div class="sub-h" style="border:0;margin-top:0;padding-top:0">게임에서 본 대미지</div><div class="rev-row">
    <select id="revCrit" aria-label="크리티컬 여부">${opt('n', '일반 (비크리)', revCrit === 'n')}${opt('c', '크리티컬', revCrit === 'c')}</select>
    ${revObs.map((v, i) => `<span class="rev-o"><input type="text" inputmode="numeric" data-ro="${i}" value="${esc(v)}" placeholder="1타 대미지" aria-label="본 대미지 ${i + 1}">${revObs.length > 1 ? `<button class="lx" type="button" data-rodel="${i}" aria-label="삭제">×</button>` : ''}</span>`).join('')}
    <button class="btn" type="button" id="revObsAdd" style="padding:2px 10px">+ 대미지</button></div>
    <span class="hint">다단 히트는 한 타의 대미지를 넣으세요. 같은 조건에서 본 숫자를 여러 개 넣으면 범위가 좁아집니다.</span></div>`;
  { // 계산에 쓰이는 장착 장비 (지금 장착 그대로)
    const s0 = S();
    const rows = SLOTS.map(([k, label]) => {
      const it = equip[k] ? getItem(equip[k], s0) : null, lk = lockOf(k, s0.fate);
      const o = GS.includes(k) && it ? ` <span class="hint">${esc(oreName(it, ore[k] || ''))}</span>` : '';
      return `<div class="rev-eq-r"><span class="k">${esc(label)}</span><span>${lk ? `<span class="hint">🔒 잠김${it ? ' · ' + esc(it.n) + ' (계산 제외)' : ''}</span>` : it ? esc(it.n) + (it.custom ? ' <span class="tag cus">커스텀</span>' : '') + o : '<span class="hint">비어 있음</span>'}</span></div>`;
    }).join('');
    h += `<details class="rev-eq" open><summary><b>장착 장비</b> <span class="hint">(지금 장착한 그대로 계산 — 바꾸려면 창을 닫고 장착 칸에서 바꾸세요)</span></summary>${rows}</details>`;
  }
  const tf = F.find(x => x.id === revTarget);
  h += `<div class="rev-target">${tf ? `<b>역산할 항목: ${esc(tf.head)} › ${esc(tf.label)}</b>` : '<b>아래에서 역산할 항목(숫자 칸)의 ◎를 고르세요</b>'}
    ${tf ? `<span class="rev-row"><label class="cus-n">찾을 범위<input type="number" id="revLo" value="${esc(revLo)}" placeholder="${esc(tf.el.min || '자동')}"></label>~<input type="number" id="revHi" value="${esc(revHi)}" placeholder="${esc(tf.el.max || '자동')}" aria-label="찾을 범위 최댓값"></span>` : ''}
    <button class="btn solid" type="button" id="revGo"${tf ? '' : ' disabled'}>역산</button></div>`;
  if (revRes) {
    if (revRes.err) h += `<div class="shot-warn">${esc(revRes.err)}${revRes.dmg ? ` (이 범위의 1타 대미지: ${fmt(revRes.dmg[0])} ~ ${fmt(revRes.dmg[1])})` : ''}</div>`;
    else h += `<div class="rev-res"><span>${esc(revRes.f.label)} =</span> <b>${revRes.lo === revRes.hi ? revRes.lo : `${revRes.lo} ~ ${revRes.hi}`}</b>
      <span class="hint">이 값에서 ${revCrit === 'c' ? '크리' : '일반'} 1타 대미지 ${fmt(revRes.atLo.min)} ~ ${fmt(revRes.atHi.max)}</span>
      <button class="btn solid" type="button" id="revApply">입력부에 적용 (${revRes.mid})</button></div>`;
  }
  // 입력부와 같은 항목들
  let cur = '';
  h += '<div class="rev-list">';
  for (const f of F) {
    if (f.head !== cur) { cur = f.head; h += `<div class="rev-h">${esc(cur)}</div>`; }
    const v = revVals[f.id], id = 'rv_' + f.id;
    let ctl;
    if (f.kind === 'chk') ctl = `<input type="checkbox" id="${id}" data-rv="${f.id}"${v ? ' checked' : ''}>`;
    else if (f.kind === 'sel') ctl = `<select id="${id}" data-rv="${f.id}">${[...f.el.options].map(o => opt(o.value, o.textContent, o.value === v)).join('')}</select>`;
    else ctl = `<input type="${f.kind === 'num' ? 'number' : 'text'}" id="${id}" data-rv="${f.id}" value="${esc(v)}" step="${esc(f.el.step || 'any')}"${f.id === revTarget ? ' disabled' : ''}>`;
    h += `<div class="rev-item${f.id === revTarget ? ' on' : ''}">${f.kind === 'num' ? `<input type="radio" name="revT" data-rt="${f.id}"${f.id === revTarget ? ' checked' : ''} aria-label="${esc(f.label)} 역산">` : '<span class="rev-sp"></span>'}<label for="${id}">${esc(f.label)}</label>${ctl}</div>`;
  }
  h += '</div>';
  box.innerHTML = h;
}
function openRev() {
  revLastFocus = document.activeElement; revVals = {}; revFields().forEach(f => { revVals[f.id] = revGet(f.el); }); revRes = null;
  $('revModal').hidden = false; renderRev(); $('revClose').focus();
}
function closeRev() { $('revModal').hidden = true; if (revLastFocus) revLastFocus.focus(); }
$('revOpen').onclick = openRev;
$('revClose').onclick = closeRev;
$('revModal').addEventListener('click', e => {
  const t = e.target;
  if (t === $('revModal')) return closeRev();
  if (t.id === 'revObsAdd') { revObs.push(''); renderRev(); const ins = document.querySelectorAll('[data-ro]'); ins[ins.length - 1].focus(); }
  else if (t.closest('[data-rodel]')) { revObs.splice(+t.closest('[data-rodel]').dataset.rodel, 1); renderRev(); }
  else if (t.id === 'revGo') { revRun(); renderRev(); }
  else if (t.id === 'revApply' && revRes && !revRes.err) { const el = $(revRes.f.id); el.value = revRes.mid; el.dispatchEvent(new Event('input', { bubbles: true })); render(); save(); closeRev(); }
});
$('revModal').addEventListener('input', e => {
  const d = e.target.dataset;
  if (d.ro !== undefined) revObs[+d.ro] = e.target.value;
  else if (d.rv !== undefined && e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') revVals[d.rv] = e.target.value;
  else if (e.target.id === 'revLo') revLo = e.target.value;
  else if (e.target.id === 'revHi') revHi = e.target.value;
});
$('revModal').addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (d.rt !== undefined) { revTarget = d.rt; revRes = null; revLo = ''; revHi = ''; renderRev(); }
  else if (d.rv !== undefined && (t.type === 'checkbox' || t.tagName === 'SELECT')) revVals[d.rv] = t.type === 'checkbox' ? t.checked : t.value;
  else if (t.id === 'revCrit') { revCrit = t.value; revRes = null; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('revModal').hidden) { e.preventDefault(); closeRev(); } });
