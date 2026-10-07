// Misery Battery page: the misery–joy spectrum. Plain DOM over the scoring engine in misery.js.
import { createMisery, PRESETS } from '/misery-battery/misery.js';
import { renderCard, cardBlob } from '/misery-battery/share-card.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

drawLogo();

// Temporary light/dark toggle (remembered per browser).
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('theme').textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
  $('theme').setAttribute('aria-pressed', t === 'dark');
  try { localStorage.setItem('mb-theme', t); } catch { /* storage blocked */ }
}
let savedTheme = 'light';
try { savedTheme = localStorage.getItem('mb-theme') || 'light'; } catch { /* storage blocked */ }
setTheme(savedTheme);
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

let data;
try {
  data = await (await fetch('/misery-battery/misery-data.json')).json();
} catch {
  $('result').innerHTML = '<p class="warn">The season data didn\'t load. Refresh the page to try again.</p>';
  throw new Error('misery-data.json failed to load');
}
const M = createMisery(data);
const { firstYear, lastYear } = M.meta;
const LGS = M.leagues;
const STAGE_COLORS = ['var(--st0)', 'var(--st1)', 'var(--st2)', 'var(--st3)', 'var(--st4)'];
const STAGE_TEXT = ['missed the playoffs', 'made the playoffs', 'reached the final four', 'lost in the final', 'won the title'];
const DEFAULT_TEAMS = ['MLB-BAL', 'NBA-WAS', 'NHL-WSH', 'NFL-WAS'];

// ---------- state ----------
const state = {
  from: firstYear, to: lastYear,
  // per league, the rooting history: segments [{ id | null, from }] in year order; one segment = one team throughout
  hist: DEFAULT_TEAMS.map(id => [{ id, from: firstYear }]),
  leagues: [...LGS],  // the sports this fan follows (1–4); hidden leagues keep their pick
  tab: 'rank', showAll: false, city: '',  // city: Local fandoms 'start from a city' (metro name)  // 'rank' = Local fandoms (default), 'build' = Build your own
};
readUrl();

// ---------- helpers ----------
const seasonLabel = (lg, y) => (lg === 'NBA' || lg === 'NHL') ? `${y}-${String(y + 1).slice(2)}` : String(y);
const short = n => {
  if (n.startsWith('Mighty Ducks')) return 'Ducks';
  if (n.startsWith('Washington') && /Redskins|Football Team|Commanders/.test(n)) return 'Washington';
  for (const two of ['Red Sox', 'White Sox', 'Blue Jays', 'Red Wings', 'Maple Leafs', 'Golden Knights', 'Trail Blazers', 'Devil Rays', 'Blue Jackets', 'Hockey Club'])
    if (n.endsWith(two)) return two === 'Hockey Club' ? 'Utah HC' : two;
  return n.split(' ').pop();
};
const suffix = n => ['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th';
const fmt = n => n.toLocaleString('en-US');
const ordinal = n => fmt(n) + suffix(n);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
// Scoring is always the engine's Balanced preset.
const WEIGHTS = PRESETS.balanced.weights;
const opts = () => ({ from: state.from, to: state.to, weights: WEIGHTS, leagues: state.leagues });
const single = id => [{ id, from: firstYear }];
const chosen = () => LGS.map((lg, i) => [lg, state.hist[i]]).filter(([lg]) => state.leagues.includes(lg))
  .map(([lg, h]) => h.length === 1 && h[0].id ? h[0].id : { league: lg, segments: h });
const NUM = ['', 'one', 'two', 'three', 'four'];
const k = () => state.leagues.length;
const yourN = () => k() === 1 ? 'your team' : `your ${NUM[k()]}`;
const leagueList = () => { const l = state.leagues; return l.length < 3 ? l.join(' and ') : `${l.slice(0, -1).join(', ')} and ${l.at(-1)}`; };
const combosText = n => k() === 1 ? `${fmt(n)} qualified ${state.leagues[0]} teams` : `${fmt(n)} possible ${NUM[k()]}-team combinations`;
const years = () => Array.from({ length: state.to - state.from + 1 }, (_, i) => state.from + i);
// a lineage (one season row or -1 per year) as editable segments; lockout years don't split a segment
const histFromRows = (rows, lg) => {
  const segs = [];
  rows.forEach((i, k) => {
    const y = firstYear + k;
    if (i < 0 && lg === 'NHL' && y === 2004) return;
    const id = i >= 0 ? M.franchises[M.season(i).franchise].id : null;
    if (!segs.length || segs.at(-1).id !== id) segs.push({ id, from: segs.length ? y : firstYear });
  });
  return segs;
};
const svg = d => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SHARE_ICON = svg('M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8');
const DOWNLOAD_ICON = svg('M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M5 21h14');
const ZOOM_ICON = svg('M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7');
const LINK_ICON = svg('M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1');
const spanText = () => state.from === state.to ? `${state.from}` : `${state.from}–${state.to}`;

// Season strip: one square per season. Hover, tap, or focus the strip and use the arrow keys to read each season.
// Squares carry their text in data-* attributes; one shared tooltip (below) shows it.
const NO_SEASON = (lg, y) => lg === 'NHL' && y === 2004;  // the 2004-05 lockout: no season for anyone
function strip(seasonsByYear, lg, label) {
  const ys = years();
  const cells = ys.map(y => {
    const s = seasonsByYear.get(y);
    const when = seasonLabel(lg, y);
    if (!s) {
      const why = NO_SEASON(lg, y) ? 'No season (lockout)' : 'No team · counts as an average season';
      return `<i class="x" data-when="${when}" data-what="${why}"></i>`;
    }
    return `<i style="background:${STAGE_COLORS[s.stage]}" data-when="${when}" data-team="${esc(s.name)}" data-rec="${esc(s.record)}" data-pct="${winPct(s.record, lg)}" data-stage="${s.stage}"></i>`;
  }).join('');
  const played = [...seasonsByYear.values()].filter(s => s.year >= state.from && s.year <= state.to);
  const summary = `${label}, ${spanText()}: ${played.filter(s => s.stage >= 1).length} playoff seasons and ${played.filter(s => s.stage === 4).length} titles in ${played.length} seasons. Use the arrow keys to read each season.`;
  return `<div class="strip" tabindex="0" role="group" aria-label="${esc(summary)}" style="grid-template-columns:repeat(${ys.length},minmax(0,1fr))">${cells}</div>`;
}

const tip = document.createElement('div');
tip.className = 'stip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
document.body.appendChild(tip);
const live = document.createElement('div');
live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
document.body.appendChild(live);
const cap = t => t[0].toUpperCase() + t.slice(1);
// winning percentage from a record string: MLB/NBA W-L; NFL W-L-T (ties count half); NHL W-L-OT as points % (2 a win, 1 an OT loss or tie)
function winPct(record, lg) {
  const [w = 0, l = 0, o = 0] = String(record).split('-').map(Number);
  const v = lg === 'NHL' ? (2 * w + o) / (2 * (w + l + o)) : (w + 0.5 * o) / (w + l + o);
  if (!Number.isFinite(v)) return '';
  return `${v.toFixed(3).replace(/^0/, '')} ${lg === 'NHL' ? 'pts%' : 'win%'}`;
}
let tipCell = null;
function showTip(cell) {
  if (!cell) return;
  tipCell?.classList.remove('on');
  tipCell = cell; cell.classList.add('on');
  const d = cell.dataset;
  if (d.tip) {  // explanatory figures: a title and a sentence
    tip.innerHTML = `<div class="t">${esc(d.tipt || '')}</div><div>${esc(d.tip)}</div>`;
    tip.hidden = false;
    const r = cell.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2))}px`;
    tip.style.top = `${r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8}px`;
    live.textContent = `${d.tipt}: ${d.tip}`;
    return;
  }
  const body = d.team
    ? `<div class="sw-row"><i style="background:${STAGE_COLORS[d.stage]}"></i><b>${cap(STAGE_TEXT[d.stage])}</b></div><div>${esc(d.team)} · ${esc(d.rec)}${d.pct ? ` · ${esc(d.pct)}` : ''}</div>`
    : `<div>${d.what}</div>`;
  tip.innerHTML = `<div class="t">${d.when}</div>${body}`;
  tip.hidden = false;
  const r = cell.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  const x = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
  const y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
  live.textContent = d.team ? `${d.when}: ${d.team}, ${d.rec}${d.pct ? ` (${d.pct})` : ''}, ${STAGE_TEXT[d.stage]}` : `${d.when}: ${d.what}`;
}
function hideTip() { tipCell?.classList.remove('on'); tipCell = null; tip.hidden = true; }
const TIPPED = '.strip i, [data-tip]';
document.addEventListener('pointerover', e => { const c = e.target.closest(TIPPED); if (c) showTip(c); });
// touch fires pointerout as the finger lifts; keep a tapped season showing until the next tap elsewhere
document.addEventListener('pointerout', e => { if (e.pointerType !== 'touch' && e.target.closest(TIPPED) && !e.relatedTarget?.closest?.(TIPPED)) hideTip(); });
document.addEventListener('pointerdown', e => { const c = e.target.closest(TIPPED); if (c) showTip(c); else hideTip(); });
// keyboard focus starts at the latest season; a tap or click keeps the square it landed on
document.addEventListener('focusin', e => { if (e.target.matches?.('.strip') && !e.target.contains(tipCell)) showTip(e.target.querySelector('i:last-child')); });
document.addEventListener('focusout', e => { if (e.target.matches?.('.strip')) hideTip(); });
document.addEventListener('keydown', e => {
  const st = e.target.closest?.('.strip'); if (!st || !tipCell || !st.contains(tipCell)) return;
  const cells = [...st.children], i = cells.indexOf(tipCell);
  const j = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: cells.length - 1 }[e.key];
  if (j == null) { if (e.key === 'Escape') hideTip(); return; }
  e.preventDefault(); showTip(cells[Math.max(0, Math.min(cells.length - 1, j))]);
});
window.addEventListener('scroll', hideTip, { passive: true });

const yearAxis = () => {
  const mid = Math.round((state.from + state.to) / 2);
  return `<div class="yrs"><span>${state.from}</span>${state.to - state.from >= 4 ? `<span>${mid}</span>` : ''}<span>${state.to}</span></div>`;
};

// ---------- shared controls ----------
for (const id of ['from', 'to']) {
  const sel = $(id);
  for (let y = firstYear; y <= lastYear; y++) sel.add(new Option(y, y));
  sel.addEventListener('change', () => {
    state[id] = +sel.value;
    if (state.from > state.to) { if (id === 'from') state.to = state.from; else state.from = state.to; }
    update();
  });
}
const SPANS = [
  [`All ${lastYear - firstYear + 1} years`, firstYear, lastYear], ['Last 20', lastYear - 19, lastYear], ['Last 10', lastYear - 9, lastYear],
  ['1980s', 1980, 1989], ['1990s', 1990, 1999], ['2000s', 2000, 2009], ['2010s', 2010, 2019], ['2020s', 2020, lastYear],
];
$('spans').innerHTML = SPANS.map(([l, a, b]) => `<button class="chip" data-a="${a}" data-b="${b}">${l}</button>`).join('');
$('spans').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  state.from = +b.dataset.a; state.to = +b.dataset.b; update();
});


// ---------- tabs ----------
const TABS = [['rank', 'tab-rank'], ['build', 'tab-build']];
function setTab(t, focus) {
  state.tab = t;
  for (const [key, id] of TABS) {
    const on = key === t;
    $(id).setAttribute('aria-selected', on);
    $(id).tabIndex = on ? 0 : -1;
    $(id === 'tab-build' ? 'build' : 'rankings').hidden = !on;
    if (on && focus) $(id).focus();
  }
  update();
}
$('tab-build').addEventListener('click', () => setTab('build'));
$('tab-rank').addEventListener('click', () => setTab('rank'));
// in-text links to a tab ("click the Build your own tab above")
document.addEventListener('click', e => {
  const a = e.target.closest('a.tablink'); if (!a) return;
  e.preventDefault(); setTab(a.dataset.tab, true);
  $('tab-build').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
document.querySelector('[role=tablist]').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const i = TABS.findIndex(([k]) => k === state.tab);
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
  setTab(TABS[next][0], true);
});

// sports toggle: at least one stays on
$('sports').innerHTML = LGS.map(lg => `<button class="chip" data-lg="${lg}">${lg}</button>`).join('');
$('sports').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const lg = b.dataset.lg, on = state.leagues.includes(lg);
  if (on && state.leagues.length === 1) return;
  state.leagues = on ? state.leagues.filter(x => x !== lg) : LGS.filter(x => x === lg || state.leagues.includes(x));
  state.showAll = false; update();
});

// ---------- your teams ----------
const metroMap = M.metroDefaults();
$('metro').add(new Option('Choose a city…', ''));
for (const m of metroMap.keys()) $('metro').add(new Option(m, m));
$('metro').addEventListener('change', e => {
  const ids = metroMap.get(e.target.value);
  if (ids) { state.hist = ids.map(single); update(); }
});

$('pickers').innerHTML = LGS.map((lg, i) => `<div class="picker"><label class="lbl" for="pick${i}">${lg}</label>
  <div class="pickrow"><img class="plogo" id="plogo${i}" width="32" height="32" alt=""><select id="pick${i}"></select></div>
  <div class="changes" id="chg${i}"></div>
  <button type="button" class="addchg" data-i="${i}">+ Team change</button></div>`).join('');
LGS.forEach((lg, i) => $('pick' + i).addEventListener('change', e => { state.hist[i][0].id = e.target.value || null; $('metro').value = ''; update(); }));
// team changes: "from [year] [team | No team]"; the first segment always starts at the beginning of the data
const sortHist = i => { const [head, ...rest] = state.hist[i]; state.hist[i] = [head, ...rest.sort((a, b) => a.from - b.from)]; };
$('pickers').addEventListener('click', e => {
  const add = e.target.closest('.addchg'), rm = e.target.closest('.rmchg');
  if (add) {
    const i = +add.dataset.i, last = state.hist[i].at(-1);
    if (last.from >= lastYear) return;
    state.hist[i].push({ id: null, from: Math.min(lastYear, Math.max(last.from + 1, Math.round((Math.max(last.from, state.from) + state.to) / 2))) });
    $('metro').value = ''; update();
    $(`ct${i}_${state.hist[i].length - 1}`)?.focus();
  } else if (rm) {
    const i = +rm.dataset.i; state.hist[i].splice(+rm.dataset.k, 1);
    if (state.hist[i].length === 1 && !state.hist[i][0].id) state.hist[i][0].id = DEFAULT_TEAMS[i];
    update(); $(`pick${i}`).focus();
  }
});
$('pickers').addEventListener('change', e => {
  const el = e.target; if (!el.dataset.f) return;
  const i = +el.dataset.i, k = +el.dataset.k;
  const seg = state.hist[i][k];
  if (el.dataset.f === 'from') seg.from = +el.value; else seg.id = el.value || null;
  sortHist(i); $('metro').value = ''; update();
  $(`${el.dataset.f === 'from' ? 'cy' : 'ct'}${i}_${state.hist[i].indexOf(seg)}`)?.focus();  // keep focus on the edited field
});

function fillPickers() {
  const o = opts();
  LGS.forEach((lg, i) => {
    const sel = $('pick' + i);
    const avail = new Set(M.franchisesIn(lg, o).map(f => f.id));
    const list = M.franchises.filter(f => f.league === lg).sort((a, b) => a.name.localeCompare(b.name));
    sel.innerHTML = list.map(f => {
      const former = f.eras.filter(e => e.name !== f.name).map(e => e.name);
      const extra = [former.length ? `was ${[...new Set(former)].join(', ')}` : '', f.last < lastYear ? `through ${f.last}` : ''].filter(Boolean).join('; ');
      const label = f.name + (extra ? ` (${extra})` : '') + (avail.has(f.id) ? '' : ' (no seasons in span)');
      return `<option value="${f.id}"${avail.has(f.id) ? '' : ' disabled'}>${esc(label)}</option>`;
    }).join('');
    const h = state.hist[i];
    if (h.length > 1) sel.insertAdjacentHTML('afterbegin', `<option value="">No team</option>`);
    sel.value = h[0].id ?? '';
    const shown = h[0].id ?? h.find(x => x.id)?.id;
    $('plogo' + i).src = shown ? `/misery-battery/logos/${shown}.webp` : '';
    $('plogo' + i).style.visibility = shown ? '' : 'hidden';
    const teamOpts = list.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');
    $('chg' + i).innerHTML = h.slice(1).map((x, j) => {
      const k = j + 1, yrs = Array.from({ length: lastYear - firstYear }, (_, n) => firstYear + 1 + n)
        .map(y => `<option value="${y}"${y === x.from ? ' selected' : ''}>${y}</option>`).join('');
      return `<div class="chg"><label class="lbl" for="cy${i}_${k}">From</label>
        <select id="cy${i}_${k}" data-i="${i}" data-k="${k}" data-f="from">${yrs}</select>
        <select id="ct${i}_${k}" data-i="${i}" data-k="${k}" data-f="id" aria-label="${lg} team from ${x.from}"><option value="">No team</option>${teamOpts}</select>
        <button type="button" class="rmchg" data-i="${i}" data-k="${k}" aria-label="Remove the ${lg} change from ${x.from}">×</button></div>`;
    }).join('');
    h.slice(1).forEach((x, j) => { $(`ct${i}_${j + 1}`).value = x.id ?? ''; });
    sel.closest('.picker').hidden = !state.leagues.includes(lg);
  });
}

// ---------- the misery–joy spectrum ----------
// The engine scores misery 0–100 (0 = a perfect season every year). The page places that score on a spectrum by rank:
// +100 = the most miserable option, 0 = the middle, −100 = the most joyful. Batteries rank against every possible
// combination of the chosen leagues for the span; teams rank against the qualified teams in their league.
const spectrum = (miseryRank, n) => n > 1 ? 100 - (200 * (miseryRank - 1)) / (n - 1) : 0;
const side = v => Math.round(v) > 0 ? 'misery' : Math.round(v) < 0 ? 'joy' : 'even';
// Only the single most joyful / most miserable option reads 100; everything else tops out at 99.
const specNum = v => { const n = Math.round(Math.abs(v)); return `${n === 100 && Math.abs(v) < 100 ? 99 : n}`; };
const pctText = p => `${p > 99.9 && p < 100 ? '99.9' : p.toFixed(1)}%`;
const specLabel = v => side(v) === 'even' ? 'dead even' : side(v);
const TIERS = [[90, 'Cursed'], [60, 'Miserable'], [20, 'Rough'], [-20, 'Middling'], [-60, 'Happy'], [-90, 'Joyful'], [-Infinity, 'Blessed']];
const tierOf = v => TIERS.find(([t]) => v >= t)[1];
const logo = (id, size, cls = 'logo') =>
  `<img class="${cls}" src="/misery-battery/logos/${id}.webp" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;

function gauge(v, label) {
  const pos = (100 - v) / 2;  // misery on the left, joy on the right
  return `<div class="gauge" role="img" aria-label="${esc(label)}">
    <div class="gbar"><span class="gmark ${side(v)}" style="left:${pos.toFixed(1)}%"></span></div>
    <div class="gticks"><span>100 misery</span><span>0</span><span>100 joy</span></div>
  </div>`;
}

function renderBuild() {
  fillPickers();
  const r = M.batteryReport(chosen(), opts());
  const span = spanText();
  const res = $('result');
  if (!r.complete) {
    const missing = r.teams.filter(t => !t.available).map(t => t.name).join(' and ');
    res.innerHTML = `<p class="warn">The ${esc(missing)} didn't play in ${span}. Pick a team that did, or widen the time frame, to see the full score.</p>`;
  } else {
    const v = spectrum(r.miseryRank, r.totalCombos);
    const dist = M.distribution(opts());
    const joyRank = r.moreMiserableThan + 1;
    const share = side(v) === 'joy'
      ? `More joy than <b>${pctText((100 * (r.miseryRank - 1)) / r.totalCombos)}</b> of the <b>${combosText(r.totalCombos)}</b> over ${span}. That's <b>${ordinal(joyRank)}</b> most joyful.`
      : `More misery than <b>${pctText(r.percentile)}</b> of the <b>${combosText(r.totalCombos)}</b> over ${span}. That's <b>${ordinal(r.miseryRank)}</b> most miserable.`;
    res.innerHTML = `
      <div class="verdict">
        <div class="big ${side(v)}">${specNum(v)}<small>${specLabel(v)}, ${span}</small></div>
        <div>
          <div class="tier">${tierOf(v)}</div>
          <p class="vtext">${share} Together: <b>${r.titles}</b> title${r.titles === 1 ? '' : 's'}, <b>${r.finals}</b> trip${r.finals === 1 ? '' : 's'} to the final, <b>${r.playoffs}</b> playoff seasons out of ${r.seasonCount}.</p>
          <p class="bridge">${bridge(r)}</p>
        </div>
      </div>
      ${gauge(v, `${yourN()[0].toUpperCase() + yourN().slice(1)} sits at ${specNum(v)} ${specLabel(v)} on a scale from 100 joy to 100 misery`)}
      <figure>
        <div class="fig-head"><div class="fig-title">Where ${yourN()} ${k() === 1 ? 'lands' : 'land'}</div><div class="fig-sub">${k() === 1 ? `Every qualified ${state.leagues[0]} team` : `Every possible ${leagueList()} combination`}, ${span}, from most miserable to most joyful</div></div>
        <div class="chart">${histogram(dist, r.score, v)}</div>
        <div class="histcap">
          <span class="ends"><span class="lab misery">Most miserable possible</span>${dist.worst.map(t => `<span class="tm">${logo(t.id, 20)}${esc(short(t.name))}</span>`).join('')}</span>
          <span class="ends right"><span class="lab joy">Most joyful possible</span>${dist.luckiest.map(t => `<span class="tm">${logo(t.id, 20)}${esc(short(t.name))}</span>`).join('')}</span>
        </div>
        <div class="fig-foot"><span>Source: Retrosheet, FiveThirtyEight, nflverse, NHL, Basketball-Reference</span><span>kckdata.com</span></div>
      </figure>`;
  }
  lastBuild = r.complete ? r : null;
  if (r.complete) {
    res.insertAdjacentHTML('beforeend', `<div class="sharebox">
      <button type="button" class="sharethumb" aria-haspopup="dialog" aria-label="View your share card larger"><img id="sharethumb" alt="" width="1200" height="630"><span class="zoomhint">${ZOOM_ICON}Enlarge</span></button>
      <div class="sharecopy">
        <div class="sharetitle">Share your fandom</div>
        <p>Post your card, then see where your friends land.</p>
        <div class="sharebtns">
          <button type="button" class="btn share primary" aria-haspopup="menu" aria-expanded="false">${SHARE_ICON}Share</button>
          <button type="button" class="btn quick" data-quick="image">${DOWNLOAD_ICON}Save image</button>
          <button type="button" class="btn quick" data-quick="copy">${LINK_ICON}Copy link</button>
        </div>
      </div>
    </div>`);
    previewCard(r);
  }
  $('cards').innerHTML = r.teams.map(teamCard).join('');
}

// Where a build-your-own result would land among the metro-based fan bases (same span and sports).
function bridge(r) {
  const local = M.rankLocalBatteries(opts());
  const place = (rank, n) => n > 1 ? (rank - 1) / (n - 1) : 0;
  const mine = place(r.miseryRank, r.totalCombos);
  const n = local.length, rank = local.filter(b => place(b.miseryRank, b.total) < mine).length + 1;
  const yours = k() === 1 ? 'your team' : `your ${NUM[k()]}`;
  const where = rank === 1 ? `would be <b>more miserable than all of them</b>`
    : rank > n ? `would be <b>more joyful than all of them</b>`
    : rank <= n / 2 ? `would rank <b>${ordinal(rank)} most miserable</b>` : `would rank <b>${ordinal(n - rank + 1)} most joyful</b>`;
  return `Among the ${n} metro-based fan bases, ${yours} ${where}.`;
}

function histogram(dist, score, v) {
  // Draw at the panel's real width (320–600) so the 11px axis text stays legible on phones.
  const W = Math.round(Math.min(600, Math.max(320, $('result').clientWidth - 24))), H = 96, top = 18, base = 72, n = dist.hist.length, bw = W / n;
  const max = Math.max(...dist.hist);
  // most miserable on the left, most joyful on the right
  const x = s => ((dist.max - s) / (dist.max - dist.min || 1)) * W;
  let cum = 0;
  const bars = dist.hist.map((c, i) => {
    const h = (c / max) * (base - top);
    const miserySide = cum + c / 2 > dist.total / 2;  // bin centre past the median combination
    cum += c;
    return `<rect x="${(W - (i + 1) * bw + 0.5).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${h.toFixed(1)}" fill="var(${miserySide ? '--misery-soft' : '--joy-soft'})"/>`;
  }).join('');
  const mx = Math.max(1, Math.min(W - 1, x(score)));
  const anchor = mx < 60 ? 'start' : mx > W - 60 ? 'end' : 'middle';
  return `<svg class="hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribution of all ${fmt(dist.total)} possible batteries from most joyful to most miserable. Yours sits at ${specNum(v)} ${specLabel(v)}.">
    ${bars}
    <line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="var(--axis)" stroke-width="1"/>
    <line x1="${mx}" x2="${mx}" y1="${top - 4}" y2="${base}" stroke="var(--${side(v) === 'joy' ? 'joy' : 'misery'})" stroke-width="2.5"/>
    <text x="${mx}" y="${top - 7}" text-anchor="${anchor}" style="fill:var(--${side(v) === 'joy' ? 'joy' : 'misery'});font-weight:500">${yourN()}: ${specNum(v)} ${specLabel(v)}</text>
    <text x="0" y="${H - 4}" style="fill:var(--misery)">← more misery</text>
    <text x="${W}" y="${H - 4}" text-anchor="end" style="fill:var(--joy)">more joy →</text>
  </svg>`;
}

function teamSpectrum(t) {
  // Qualified teams use their league rank; short-tenure teams and rooting histories are placed by score against the
  // qualified field.
  if (t.qualified) return { v: spectrum(t.miseryRank, t.leagueSize), rank: t.miseryRank, n: t.leagueSize };
  const field = M.leagueTable(t.league, opts()).filter(x => x.qualified);
  const rank = field.filter(x => x.score > t.score).length + 1;
  return { v: spectrum(Math.min(rank, field.length), field.length), rank: t.custom ? rank : null, n: field.length };
}

// best and worst season on a team card: label, year with its outcome chip, outcome, record (and team, for histories)
function bestWorst(t, lg, withTeam) {
  const one = (s, label) => `<div class="bwx">
      <div class="bwl">${label}</div>
      <div class="bwy"><i style="background:${STAGE_COLORS[s.stage]}"></i>${seasonLabel(lg, s.year)}</div>
      <div class="bwo">${cap(STAGE_TEXT[s.stage])}</div>
      ${withTeam ? `<div class="bwt">${esc(s.name)}</div>` : ''}<div class="bwr">${esc(s.record)} · ${winPct(s.record, lg)}</div>
    </div>`;
  return `<div class="bw">${one(t.best, 'Best season')}${one(t.worst, 'Worst season')}</div>`;
}

// a team card for a rooting history with team changes
function historyCard(t) {
  const f = t.franchise != null ? M.franchises[t.franchise] : null;
  const parts = t.segments.map(sg => [sg, Math.max(sg.from, state.from), Math.min(sg.to, state.to)]).filter(([, a, b]) => a <= b)
    .map(([sg, a, b]) => `${sg.name ?? 'No team'} ${a === b ? a : `${a}–${b}`}`).join(' · ');
  const head = `<div class="ch">${f ? logo(f.id, 40, 'clogo') : '<span class="clogo"></span>'}
    <div style="min-width:0"><div class="lbl">${t.league} · your history</div><div class="cname">${esc(t.name)}</div><div class="cera">${esc(parts)}</div></div>`;
  if (!t.available) return `<article class="card">${head}</div><p class="warn">None of these teams played between ${state.from} and ${state.to}.</p></article>`;
  const { v, rank, n } = teamSpectrum(t);
  const pill = side(v) === 'joy'
    ? `<span class="pill joy">Would rank ${ordinal(Math.max(1, n - rank + 1))} most joyful of ${n}</span>`
    : `<span class="pill misery">Would rank ${ordinal(Math.min(rank, n))} most miserable of ${n}</span>`;
  return `<article class="card">${head}
      <div class="cscore ${side(v)}">${specNum(v)}<span>${specLabel(v)}</span></div>
    </div>
    <div>${pill}</div>
    ${t.neutralSeasons ? `<div class="cera">${t.neutralSeasons} season${t.neutralSeasons === 1 ? '' : 's'} in this span with no team count as average</div>` : ''}
    <div class="stats"><span><b>${t.titles}</b> title${t.titles === 1 ? '' : 's'}</span><span><b>${t.finals}</b> final${t.finals === 1 ? '' : 's'}</span><span><b>${t.finalFours}</b> final four${t.finalFours === 1 ? '' : 's'}</span><span><b>${t.playoffs}</b>/${t.seasonCount} playoff seasons</span></div>
    <div>${strip(new Map(t.seasons.map(s => [s.year, s])), t.league, t.name)}${yearAxis()}</div>
    ${bestWorst(t, t.league, true)}
  </article>`;
}

function teamCard(t) {
  if (t.custom) return historyCard(t);
  const f = M.franchises[t.franchise];
  const eras = f.eras.filter(e => e.to >= state.from && e.from <= state.to);
  const eraText = eras.length > 1 || (eras[0] && eras[0].name !== f.name)
    ? eras.map(e => `${e.name} ${e.from === e.to ? e.from : `${Math.max(e.from, state.from)}–${Math.min(e.to, state.to)}`}`).join(' · ') : '';
  if (!t.available) {
    return `<article class="card"><div class="ch">${logo(f.id, 40, 'clogo')}<div><div class="lbl">${f.league}</div><div class="cname">${esc(f.name)}</div></div></div>
      <p class="warn">No seasons between ${state.from} and ${state.to}. This franchise played ${f.first}–${f.last}.</p></article>`;
  }
  const byYear = new Map(t.seasons.map(s => [s.year, s]));
  const { v, rank, n } = teamSpectrum(t);
  const pill = rank == null
    ? `<span class="pill calm">Unranked: ${t.seasonCount} of ${t.spanSeasons} seasons</span>`
    : side(v) === 'joy'
      ? `<span class="pill joy">${ordinal(n - rank + 1)} most joyful of ${n}</span>`
      : `<span class="pill misery">${ordinal(rank)} most miserable of ${n}</span>`;
  return `<article class="card">
    <div class="ch">
      ${logo(f.id, 40, 'clogo')}
      <div style="min-width:0"><div class="lbl">${f.league}</div><div class="cname">${esc(f.name)}</div>${eraText ? `<div class="cera">${esc(eraText)}</div>` : ''}</div>
      <div class="cscore ${side(v)}">${specNum(v)}<span>${specLabel(v)}</span></div>
    </div>
    <div>${pill}</div>
    ${t.neutralSeasons ? `<div class="cera">${t.neutralSeasons} season${t.neutralSeasons === 1 ? '' : 's'} in this span without the team count as average</div>` : ''}
    <div class="stats"><span><b>${t.titles}</b> title${t.titles === 1 ? '' : 's'}</span><span><b>${t.finals}</b> final${t.finals === 1 ? '' : 's'}</span><span><b>${t.finalFours}</b> final four${t.finalFours === 1 ? '' : 's'}</span><span><b>${t.playoffs}</b>/${t.seasonCount} playoff seasons</span></div>
    <div>${strip(byYear, f.league, f.name)}${yearAxis()}</div>
    ${bestWorst(t, f.league, false)}
  </article>`;
}


// ---------- local rankings ----------
['q', 'localonly', 'best'].forEach(id => $(id).addEventListener('input', () => { state.showAll = false; renderRank(); }));
// Local fandoms: start from a city (every metro that has a local fan base)
const LOCAL_METROS = [...new Set(data.localBatteries.flatMap(b => b.metros))].sort((a, b) => a.localeCompare(b));
$('lcity').add(new Option('All cities', ''));
for (const m of LOCAL_METROS) $('lcity').add(new Option(m, m));
$('lcity').addEventListener('change', e => { state.city = e.target.value; state.showAll = false; update(); });
$('more').addEventListener('click', () => { state.showAll = true; renderRank(); });
$('list').addEventListener('click', e => {
  const b = e.target.closest('button[data-ids]'); if (!b) return;
  const row = localRows.get(b.dataset.key);
  if (row) {  // bring in the fan base's whole season-by-season history, editable as team changes
    for (const sl of row.r.slots) state.hist[LGS.indexOf(sl.league)] = histFromRows(sl.rows, sl.league);
  } else for (const id of b.dataset.ids.split(',')) state.hist[LGS.indexOf(id.split('-')[0])] = single(id);
  $('metro').value = ''; setTab('build');
  window.scrollTo({ top: $('build').getBoundingClientRect().top + window.scrollY - 80 });
});

function segs(rows) {
  const out = [];
  for (const i of rows) {
    if (i < 0) continue;
    const s = M.season(i);
    if (s.year < state.from || s.year > state.to) continue;
    const n = short(s.name);
    if (out.length && out.at(-1).n === n) out.at(-1).b = s.year; else out.push({ n, a: s.year, b: s.year, f: s.franchise });
  }
  return out;
}
function renderRank() {
  const q = $('q').value.trim().toLowerCase();
  const ranked = M.rankLocalBatteries(opts());
  const joyFirst = $('best').checked;
  let rows = ranked.filter(r => !$('localonly').checked || r.allLocalToday);
  if (state.city) rows = rows.filter(r => r.metros.includes(state.city));
  if (q) rows = rows.filter(r => (r.metros.join(' ') + ' ' + r.slots.flatMap(s => s.seasons || []).map(s => s.name).join(' ')).toLowerCase().includes(q));
  if (joyFirst) rows = rows.slice().reverse();
  const shown = state.showAll || q || state.city ? rows : rows.slice(0, 25);
  localRows.clear();
  $('list').innerHTML = shown.length ? shown.map(r => {
    const v = spectrum(r.rank, ranked.length);  // local fan bases are ranked against each other
    const key = localKey(r);
    localRows.set(key, { r, n: ranked.length });
    const slots = r.slots.map(s => {
      const g = segs(s.rows);
      if (!g.length) return `<div class="slot"><span class="lg">${s.league}</span><div class="slotbody"><span class="tname none">No local team in ${spanText()}</span></div></div>`;
      const cur = g.at(-1);
      const prior = g.slice(0, -1).map(x => `${x.n} ${x.a === x.b ? x.a : `${x.a}–${x.b}`}`).join(', ');
      const byYear = new Map((s.seasons || []).map(x => [x.year, x]));
      const fr = M.franchises[cur.f], sameName = s.seasons.at(-1).name === fr.name;  // e.g. no Thunder logo on the Sonics
      return `<div class="slot"><span class="lg">${sameName ? logo(fr.id, 22, 'slogo') : '<span class="slogo"></span>'}${s.league}</span><div class="slotbody">
        <span class="tname">${esc(cur.n)}${prior ? ` <small>· earlier ${esc(prior)}</small>` : ''}</span>
        <span class="tline">${s.playoffs} playoffs · ${plural(s.titles, 'title')}</span>
        ${strip(byYear, s.league, `${s.league} ${cur.n}`)}</div></div>`;
    }).join('');
    // the team each slot was following at the end of the span
    const ids = r.slots.filter(s => s.score != null).map(s => {
      const inSpan = s.rows.filter(i => i >= 0 && M.season(i).year >= state.from && M.season(i).year <= state.to);
      return M.franchises[M.season((inSpan.length ? inSpan : s.rows.filter(i => i >= 0)).at(-1)).franchise].id;
    });
    const names = r.slots.map(s => { const g = segs(s.rows); return g.length ? g.at(-1).n : null; }).filter(Boolean);
    const partial = r.leagues.length < state.leagues.length ? ` · ranked on ${r.leagues.join(', ')} only` : '';
    const shownRank = joyFirst ? ranked.length - r.rank + 1 : r.rank;
    return `<article class="item${shownRank <= 10 ? ` top ${joyFirst ? 'joy' : 'misery'}` : ''}" data-key="${key}">
      <div class="rank">${shownRank}</div>
      <div style="min-width:0"><div class="names">${esc(names.join(' · '))}</div>
        <div class="facts">${esc(r.metros.join(', '))} · ${plural(r.titles, 'title')} · ${plural(r.finals, 'final')} · ${r.playoffs} playoff seasons${partial}
        · <button class="load" data-ids="${ids.join(',')}" data-key="${key}" aria-label="Open as my teams: ${esc(names.join(', '))}">Open as my teams</button>
        · <button class="load share" data-key="${key}" aria-haspopup="menu" aria-expanded="false" aria-label="Share ${esc(cityName(r))}: ${esc(names.join(', '))}">${SHARE_ICON}Share</button></div></div>
      <div class="score ${side(v)}"><b>${specNum(v)}</b><span>${specLabel(v)}</span></div>
      <div class="slots">${slots}<div class="slot"><span></span>${yearAxis()}</div></div>
    </article>`;
  }).join('') : state.city && !q
    ? `<p class="empty">${esc(state.city)} didn't have a team in every sport you chose during ${spanText()}. Turn a sport off or widen the time frame to see it.</p>`
    : `<p class="empty">No fan base matches${state.city ? ` in ${esc(state.city)}` : ''}${q ? ` "${esc(q)}"` : ''}. Try a team nickname or another city.</p>`;
  $('lcount').textContent = state.city
    ? `${rows.length} ${state.city} fan base${rows.length === 1 ? '' : 's'}, ranked among all ${ranked.length}. A city gets more than one when it has more than one team in a sport, or its teams changed over the span.`
    : '';
  if (state.focus) {  // arriving from a shared fan base link: bring that row into view
    const el = $('list').querySelector(`[data-key="${state.focus}"]`);
    if (el) { el.classList.add('flash'); requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' })); }
    state.focus = null;
  }
  $('more').hidden = state.showAll || !!q || !!state.city || rows.length <= 25;
  $('more').textContent = `Show all ${rows.length}`;
}

// ---------- sharing ----------
// Every result can be shared as a link (state lives in the URL) and as a 1200×630 card image. Local fan bases in the
// default view (all four sports, full span) also have a static preview page at /misery-battery/f/<key>/ with their own
// link-preview image, so a shared link shows that fan base instead of the generic card.
const slugify = t => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isDefaultView = () => state.from === firstYear && state.to === lastYear && state.leagues.length === LGS.length;
const cellsFor = (seasonsByYear, from, to) => Array.from({ length: to - from + 1 }, (_, i) => seasonsByYear.get(from + i)?.stage ?? null);
const slotName = s => s.seasons.at(-1).name;
// stable per data build: city + team nicknames + a short code from the fan base's season-by-season teams
const hash4 = t => { let h = 2166136261; for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36).slice(-4); };
const localKey = r => `${slugify(`${r.metros.join(' ')} ${r.slots.map(s => short(slotName(s))).join(' ')}`)}-${hash4(r.slots.map(s => s.lineage).join('.'))}`;
const placeText = (rank, n) => rank === 1 ? `the most miserable of ${n}`
  : rank === n ? `the most joyful of ${n}`
  : rank <= n / 2 ? `the ${ordinal(rank)} most miserable of ${n}` : `the ${ordinal(n - rank + 1)} most joyful of ${n}`;
const cityName = r => r.metros.join(' & ');

function buildShare(r) {
  const v = spectrum(r.miseryRank, r.totalCombos), span = spanText();
  const pct = side(v) === 'joy' ? pctText((100 * (r.miseryRank - 1)) / r.totalCombos) : pctText(r.percentile);
  const word = side(v) === 'joy' ? 'joy' : 'misery';
  const pool = k() === 1 ? `${state.leagues[0]} team` : `${leagueList()} fandom`;
  const names = r.teams.map(t => t.name);
  return {
    file: `my-fandom-${slugify(r.teams.map(t => (t.id || 'none').split('-').pop()).join('-'))}.png`,
    url: location.href,
    text: `My sports fandom (${names.join(', ')}) scores ${specNum(v)} ${specLabel(v)} for ${span}: more ${word} than ${pct} of every possible ${pool}. How joyful or miserable is yours?`,
    card: {
      kicker: 'My sports fandom', years: { from: state.from, to: state.to },
      compare: k() === 1
        ? `Compared with every qualified ${state.leagues[0]} team, ${span} (${fmt(r.totalCombos)} in all)`
        : `Compared with every possible ${state.leagues.join(' · ')} combination, ${span} (${fmt(r.totalCombos)} in all)`,
      headline: `${tierOf(v)}: more ${word} than ${pct} of every possible ${pool}`,
      big: { value: specNum(v), side: side(v), label: specLabel(v) },
      gauge: v,
      rows: r.teams.map(t => {
        const ts = teamSpectrum(t);
        const label = t.custom ? [...new Set(t.segments.filter(g => g.name).map(g => short(g.name)))].join(' → ') : t.name;  // histories by nickname
        return { logo: t.id ? `/misery-battery/logos/${t.id}.webp` : null, name: label, cells: cellsFor(new Map(t.seasons.map(s => [s.year, s])), state.from, state.to),
          right: { value: specNum(ts.v), label: `${specLabel(ts.v)} in ${t.league}`, side: side(ts.v) } };
      }),
      foot: 'How joyful or miserable is yours?',
    },
  };
}

function localShare(r, n, from = state.from, to = state.to) {
  const v = spectrum(r.rank, n), span = from === to ? `${from}` : `${from}–${to}`;
  const key = localKey(r), names = r.slots.map(slotName);
  const appUrl = new URL(location.origin + location.pathname);
  for (const [k2, v2] of new URLSearchParams(location.search)) appUrl.searchParams.set(k2, v2);
  appUrl.searchParams.set('city', r.metros[0]); appUrl.searchParams.set('fb', key);
  return {
    key, file: `${key}.png`,
    url: isDefaultView() ? `${location.origin}/misery-battery/f/${key}/` : appUrl.toString().replace(/%2C/g, ','),
    title: `${cityName(r)} fans: ${placeText(r.rank, n)} local fandoms (${span})`,
    text: `${cityName(r)} fans (${names.join(', ')}): ${placeText(r.rank, n)} local sports fandoms, ${span}. Where does your city land?`,
    description: `${names.join(', ')}: ${plural(r.titles, 'title')} and ${r.playoffs} playoff seasons. See where every city lands between misery and joy.`,
    card: {
      kicker: 'Local fandoms', years: { from, to },
      compare: `Ranked among the ${n} metro-based fan bases with ${r.slots.map(sl => sl.league).join(' · ')} teams, ${span}`,
      headline: `${cityName(r)} fans: ${placeText(r.rank, n)} local fandoms`,
      big: { value: specNum(v), side: side(v), label: specLabel(v) },
      gauge: v,
      rows: r.slots.map(s => {
        const cur = M.season(s.seasons.at(-1).index);
        const fr = M.franchises[cur.franchise];  // current logos only fit teams still under today's name
        return { logo: fr.name === slotName(s) ? `/misery-battery/logos/${fr.id}.webp` : null, name: slotName(s),
          cells: cellsFor(new Map(s.seasons.map(x => [x.year, x])), from, to), right: { text: `${s.playoffs} playoffs · ${plural(s.titles, 'title')}`.toUpperCase() } };
      }),
      foot: 'Where does your city land?',
    },
  };
}

// share menu (one floating menu, positioned under whichever Share button opened it)
const menu = document.createElement('div');
menu.className = 'smenu'; menu.hidden = true; menu.setAttribute('role', 'menu');
document.body.appendChild(menu);
let current = null;
const toast = msg => { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); };

async function saveImage(sh) {
  const blob = await cardBlob(await renderCard(sh.card, { scale: 2 }));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = sh.file;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Image saved');
}
async function copyLink(sh) {
  try { await navigator.clipboard.writeText(sh.url); toast('Link copied'); } catch { toast('Copy the address bar to share'); }
}
async function nativeShare(sh) {
  const data = { title: document.title, text: sh.text, url: sh.url };
  if (sh.card) try {
    const blob = await cardBlob(await renderCard(sh.card, { scale: 2 }));
    const file = new File([blob], sh.file, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) data.files = [file];
  } catch { /* share without the image */ }
  try { await navigator.share(data); } catch { /* cancelled */ }
}
const intents = sh => ({
  x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(sh.text)}&url=${encodeURIComponent(sh.url)}`,
  bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${sh.text} ${sh.url}`)}`,
  threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${sh.text} ${sh.url}`)}`,
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sh.url)}`,
});

function openMenu(btn, sh) {
  current = sh;
  const it = intents(sh);
  menu.innerHTML = `${navigator.share ? '<button role="menuitem" data-act="native">Share…</button>' : ''}
    <button role="menuitem" data-act="copy">${LINK_ICON}Copy link</button>
    ${sh.card ? `<button role="menuitem" data-act="image">${DOWNLOAD_ICON}Save image</button>` : ''}
    <a role="menuitem" href="${it.x}" target="_blank" rel="noopener">Post on X</a>
    <a role="menuitem" href="${it.bluesky}" target="_blank" rel="noopener">Post on Bluesky</a>
    <a role="menuitem" href="${it.threads}" target="_blank" rel="noopener">Post on Threads</a>
    <a role="menuitem" href="${it.facebook}" target="_blank" rel="noopener">Share on Facebook</a>`;
  menu.hidden = false;
  const r = btn.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, r.left))}px`;
  menu.style.top = `${r.bottom + 6 + h > window.innerHeight ? r.top - h - 6 : r.bottom + 6}px`;
  btn.setAttribute('aria-expanded', 'true'); menu.opener = btn; menu.y0 = scrollY;
  menu.querySelector('[role=menuitem]').focus();
}
function closeMenu() {
  if (menu.hidden) return;
  menu.hidden = true; menu.opener?.setAttribute('aria-expanded', 'false');
}
menu.addEventListener('click', async e => {
  const el = e.target.closest('[role=menuitem]'); if (!el) return;
  const act = el.dataset.act, sh = current;
  closeMenu();
  if (act === 'copy') copyLink(sh);
  else if (act === 'image') saveImage(sh);
  else if (act === 'native') nativeShare(sh);
});
document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('.share')) closeMenu(); });
document.addEventListener('keydown', e => {
  if (menu.hidden) return;
  if (e.key === 'Escape') { const o = menu.opener; closeMenu(); o?.focus(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = [...menu.querySelectorAll('[role=menuitem]')], i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  }
});
// close on a real scroll, not the small nudge of a smooth scroll settling
window.addEventListener('scroll', () => { if (!menu.hidden && Math.abs(scrollY - menu.y0) > 60) closeMenu(); }, { passive: true });

// phones get the native share sheet straight away (with the card attached); everyone else gets the menu
const touchFirst = () => navigator.share && matchMedia('(pointer: coarse)').matches;
async function share(btn, sh) {
  if (!menu.hidden && menu.opener === btn) { closeMenu(); return; }
  if (touchFirst()) nativeShare(sh); else openMenu(btn, sh);
}

let lastBuild = null;
const localRows = new Map();
$('result').addEventListener('click', e => {
  if (!lastBuild) return;
  const b = e.target.closest('.share'), q = e.target.closest('[data-quick]');
  if (e.target.closest('.sharethumb')) { openCardView(); return; }
  if (b) { writeUrl(); share(b, buildShare(lastBuild)); }
  else if (q) { writeUrl(); (q.dataset.quick === 'image' ? saveImage : copyLink)(buildShare(lastBuild)); }
});

// live preview of the share card under the result (redrawn after each change; stale draws are dropped)
let previewToken = 0;
async function previewCard(r) {
  const token = ++previewToken;
  try {
    const canvas = await renderCard(buildShare(r).card);
    if (token !== previewToken || !$('sharethumb')) return;
    $('sharethumb').src = canvas.toDataURL('image/png');
  } catch { /* preview is optional */ }
}

// enlarged share card: a modal dialog with the card at full resolution and the same share actions
const cv = $('cardview');
async function openCardView() {
  if (!lastBuild) return;
  writeUrl();
  const sh = buildShare(lastBuild);
  $('cardbig').alt = `Share card: ${sh.card.headline}. ${sh.card.big.value} ${sh.card.big.label}.`;
  $('cardbig').src = $('sharethumb')?.src || '';
  cv.append(menu, $('toast'));  // the dialog sits in the top layer; keep the menu and notices above it
  cv.showModal();
  cv.querySelector('.share').focus();
  try { $('cardbig').src = (await renderCard(sh.card, { scale: 2 })).toDataURL('image/png'); } catch { /* keep the preview */ }
}
cv.addEventListener('click', e => {
  if (e.target === cv) { cv.close(); return; }  // click on the backdrop
  if (e.target.closest('#cvimg') && matchMedia('(max-width: 760px)').matches) { $('cvimg').classList.toggle('zoomed'); return; }  // phones: tap to zoom
  if (e.target.closest('#cvclose')) { cv.close(); return; }
  if (!lastBuild) return;
  const b = e.target.closest('.share'), q = e.target.closest('[data-quick]');
  if (b) share(b, buildShare(lastBuild));
  else if (q) (q.dataset.quick === 'image' ? saveImage : copyLink)(buildShare(lastBuild));
});
cv.addEventListener('close', () => { $('cvimg').classList.remove('zoomed'); closeMenu(); document.body.append(menu, $('toast')); $('result').querySelector('.sharethumb')?.focus(); });

// floating Share button: the result on Build your own; the chosen city (or the whole page) on Local fandoms
const fab = document.createElement('button');
fab.type = 'button'; fab.className = 'fab share'; fab.setAttribute('aria-haspopup', 'menu'); fab.setAttribute('aria-expanded', 'false');
fab.innerHTML = `${SHARE_ICON}<span>Share</span>`;
document.body.appendChild(fab);
const pageShare = () => ({
  url: `${location.origin}/misery-battery/`, file: 'misery-or-joy.png', card: null,
  text: 'How joyful or miserable has your sports fandom been? Pick your teams (or your city) and see where you land against every possible combination.',
});
fab.addEventListener('click', () => {
  writeUrl();
  if (state.tab === 'build') { if (lastBuild) share(fab, buildShare(lastBuild)); else share(fab, pageShare()); return; }
  const first = state.city && [...localRows.values()][0];
  share(fab, first ? localShare(first.r, first.n) : pageShare());
});
function placeFab() {
  fab.classList.toggle('on', scrollY > 320);
  document.body.classList.toggle('legend-on', flegend.classList.contains('on'));
}
$('list').addEventListener('click', e => {
  const b = e.target.closest('.share'); if (!b) return;
  const row = localRows.get(b.dataset.key); if (row) share(b, localShare(row.r, row.n));
});

// For scripts/build-share-pages.js: preview data and card images for every local fan base in the default view.
window.__mbSharePages = async () => {
  const o = { from: firstYear, to: lastYear, weights: WEIGHTS, leagues: [...LGS] };
  const saved = { from: state.from, to: state.to, leagues: state.leagues };
  Object.assign(state, { from: firstYear, to: lastYear, leagues: [...LGS] });
  try {
    const ranked = M.rankLocalBatteries(o), out = [];
    for (const r of ranked) {
      const sh = localShare(r, ranked.length, firstYear, lastYear);
      const canvas = await renderCard(sh.card);
      out.push({ key: sh.key, city: r.metros[0], title: sh.title, description: sh.description, image: canvas.toDataURL('image/jpeg', 0.84) });
    }
    return out;
  } finally { Object.assign(state, saved); }
};

// ---------- floating legend ----------
// A copy of the season-squares legend floats at the bottom while the original is scrolled away and the visitor is
// looking at a list or result; it hides again over the controls and the methodology.
const flegend = $('legend').cloneNode(true);
flegend.removeAttribute('id'); flegend.classList.add('flegend'); flegend.setAttribute('aria-hidden', 'true');
document.body.appendChild(flegend);
function placeLegend() {
  const orig = $('legend').getBoundingClientRect(), notes = $('methodology').getBoundingClientRect();
  const panel = $(state.tab === 'build' ? 'build' : 'rankings').getBoundingClientRect();
  const show = orig.bottom < 0 && notes.top > innerHeight * 0.5 && panel.bottom > 0;
  flegend.classList.toggle('on', show);
  placeFab();
}
let legendRaf = 0;
const queueLegend = () => { cancelAnimationFrame(legendRaf); legendRaf = requestAnimationFrame(placeLegend); };
window.addEventListener('scroll', queueLegend, { passive: true });
window.addEventListener('resize', queueLegend);

// ---------- "How it's scored": collapsible, with explanatory figures drawn from the live engine and data ----------
const method = $('method');
let methodDrawn = false;
function drawMethod() {
  if (methodDrawn) return;
  methodDrawn = true;
  drawPoints(); drawNeutral(); drawScale(); drawLines();
}
method.addEventListener('toggle', () => { if (method.open) drawMethod(); });
if (location.hash === '#methodology') { method.open = true; drawMethod(); }

// 1. points a season earns, by outcome (from the Balanced weights the page scores with)
function drawPoints() {
  const w = WEIGHTS, max = w.reg + w.po + w.f4 + w.f2 + w.ch;
  const outcomes = [
    ['Missed playoffs', 0, 0], ['Made playoffs', 1, w.po], ['Final four', 2, w.po + w.f4],
    ['Lost in the final', 3, w.po + w.f4 + w.f2], ['Won the title', 4, w.po + w.f4 + w.f2 + w.ch],
  ];
  const pct = v => (100 * v) / max;
  const mis = v => Math.round((100 * (max - v)) / max);
  const grid = Array.from({ length: max + 1 }, (_, i) => `<i class="grid" style="left:${pct(i)}%"></i>`).join('');
  const rows = outcomes.map(([label, st, base]) => {
    const tipBase = `${base} point${base === 1 ? '' : 's'} for getting this far, plus 0–${w.reg} for regular-season finish: ${base}–${base + w.reg} of ${max}.`;
    const tipRec = `Regular-season finish adds 0 (worst record in the league) to ${w.reg} (best). Season misery ${mis(base + w.reg)}–${mis(base)}.`;
    return `<div class="lab">${label}</div>
      <div class="track">${grid}
        ${base ? `<span class="seg base" style="left:0;width:${pct(base)}%;background:${STAGE_COLORS[st]}" data-tip="${esc(tipBase)}" data-tipt="${esc(label)}"></span>` : ''}
        <span class="seg rec${base ? '' : ' alone'}" style="left:calc(${pct(base)}% + ${base ? 2 : 0}px);width:calc(${pct(w.reg)}% - ${base ? 2 : 0}px);background:${STAGE_COLORS[st]}" data-tip="${esc(tipRec)}" data-tipt="${esc(`${label}: regular season`)}"></span>
      </div>
      <div class="mis">${mis(base + w.reg)}–${mis(base)}</div>`;
  }).join('');
  const axis = Array.from({ length: max + 1 }, (_, i) => `<span style="left:${pct(i)}%">${i}</span>`).join('');
  $('pts').innerHTML = `<div></div><div class="hd">Points, out of ${max}</div><div class="hd mis">Season misery</div>${rows}<div></div><div class="axis">${axis}</div><div></div>`;
  $('pts-tbl').innerHTML = `<table class="mtable"><thead><tr><th>Season ended</th><th>Points for getting there</th><th>Regular season</th><th>Total (of ${max})</th><th>Season misery</th></tr></thead><tbody>${
    outcomes.map(([label, , base]) => `<tr><td>${label}</td><td>${base}</td><td>0–${w.reg}</td><td>${base}–${base + w.reg}</td><td>${mis(base + w.reg)}–${mis(base)}</td></tr>`).join('')}</tbody></table>`;
}

// 2. neutral seasons: Seattle's NBA line over the last 20 seasons
function drawNeutral() {
  const o = { from: lastYear - 19, to: lastYear, weights: WEIGHTS, leagues: [...LGS] };
  const fb = M.rankLocalBatteries(o).find(b => b.metros.includes('Seattle'));
  const sl = fb?.slots.find(s => s.league === 'NBA');
  if (!sl) { $('fig-neutral').hidden = true; return; }
  const realOnly = (100 * sl.seasons.reduce((a, s) => a + s.misery, 0)) / sl.seasons.length;
  const keep = { from: state.from, to: state.to };
  Object.assign(state, { from: o.from, to: o.to });
  const html = strip(new Map(sl.seasons.map(s => [s.year, s])), 'NBA', `Seattle NBA`) + yearAxis();
  Object.assign(state, keep);
  $('fig-neutral-sub').textContent = `Seattle's NBA line, ${o.from}–${o.to}: two SuperSonics seasons before the team left in 2008, then ${sl.neutralSeasons} seasons with no local team.`;
  $('neutral').innerHTML = `<div class="nx"><div>${html}</div><div class="cmp">
    <div><b class="dim">${realOnly.toFixed(0)}</b><span>misery if only the 2 Sonics seasons counted</span></div>
    <div><b>${sl.score.toFixed(0)}</b><span>misery with ${sl.neutralSeasons} average seasons</span></div></div></div>`;
}

// 3. the misery–joy scale and its tier words
function drawScale() {
  const tiers = [
    ['Cursed', '90–100 misery', 'var(--misery)'], ['Miserable', '60–89 misery', 'color-mix(in srgb, var(--misery) 62%, var(--misery-soft))'],
    ['Rough', '20–59 misery', 'var(--misery-soft)'], ['Middling', '19 misery to 20 joy', 'var(--gmid)'],
    ['Happy', '21–60 joy', 'var(--joy-soft)'], ['Joyful', '61–90 joy', 'color-mix(in srgb, var(--joy) 62%, var(--joy-soft))'], ['Blessed', '91–100 joy', 'var(--joy)'],
  ];
  $('scale').innerHTML = `<div class="tiers">${tiers.map(([t, r, c]) => `<div class="t"><i class="bar" style="background:${c}" data-tip="${esc(`A result of ${r}.`)}" data-tipt="${t}"></i><b>${t}</b><span>${r}</span></div>`).join('')}</div>`;
  $('scale-tbl').innerHTML = `<table class="mtable"><thead><tr><th>Word</th><th>Range</th></tr></thead><tbody>${tiers.map(([t, r]) => `<tr><td>${t}</td><td>${r}</td></tr>`).join('')}</tbody></table>`;
}

// 4. who a local fan base follows: three real NFL lines over the full span
function drawLines() {
  const o = { from: firstYear, to: lastYear, weights: WEIGHTS, leagues: [...LGS] };
  const nfl = M.rankLocalBatteries(o).flatMap(b => b.slots.filter(s => s.league === 'NFL').map(s => ({ s, metros: b.metros })));
  const names = s => s.seasons.map(x => x.name);
  const pick = test => nfl.find(({ s }) => test(names(s)))?.s;
  const lines = [
    [pick(n => n[0] === 'Houston Oilers' && n.at(-1) === 'Houston Texans'), 'Houston'],
    [pick(n => n[0] === 'Baltimore Colts' && n.at(-1) === 'Baltimore Ravens'), 'Baltimore'],
  ].filter(([s]) => s);
  const n = lastYear - firstYear + 1;
  const keep = { from: state.from, to: state.to };
  Object.assign(state, { from: firstYear, to: lastYear });
  $('lines').innerHTML = `<div class="lines">${lines.map(([s, who]) => {
    const segs = [];
    s.rows.forEach((i, k) => {
      const y = firstYear + k;
      if (i < 0 && y === 2004) return;  // NHL-only lockout gap never appears in an NFL line, but keep segments whole
      const nm = i >= 0 ? short(M.season(i).name) : 'no team';
      if (segs.length && segs.at(-1).nm === nm) segs.at(-1).b = y; else segs.push({ nm, a: y, b: y });
    });
    const cap = segs.map(g => `<span style="left:${(100 * (g.a - firstYear)) / n}%;width:${(100 * (g.b - g.a + 1)) / n}%" title="${esc(`${g.nm === 'no team' ? 'No team, counted as average' : g.nm} ${g.a}–${g.b}`)}">${esc(g.nm)}</span>`).join('');
    return `<div class="line"><div class="lt"><b>${esc(who)}</b></div>
      ${strip(new Map(s.seasons.map(x => [x.year, x])), 'NFL', `${who} NFL line`)}<div class="segcap">${cap}</div></div>`;
  }).join('')}</div><div class="yrs"><span>${firstYear}</span><span>${Math.round((firstYear + lastYear) / 2)}</span><span>${lastYear}</span></div>`;
  Object.assign(state, keep);
}

// ---------- URL state ----------
function readUrl() {
  try {
    const p = new URLSearchParams(location.search);
    const from = +p.get('from'), to = +p.get('to');
    if (Number.isInteger(from) && from >= firstYear && from <= lastYear) state.from = from;
    if (Number.isInteger(to) && to >= state.from && to <= lastYear) state.to = to;
    LGS.forEach((lg, i) => {
      const v = p.get(lg.toLowerCase());
      // "ind" or a history "ind.none@1984.bal@1996"
      const [head, ...rest] = (v || '').split('.');
      const fid = c => c === 'none' ? null : `${lg}-${c.toUpperCase()}`;
      const ok = c => c === 'none' || M.franchiseIndex(fid(c)) != null;
      if (!head || !ok(head) || (head === 'none' && !rest.length)) return;
      const h = [{ id: fid(head), from: firstYear }];
      for (const t of rest) {
        const m = t.match(/^([a-z0-9]+)@(\d{4})$/);
        if (m && ok(m[1]) && +m[2] > firstYear && +m[2] <= lastYear) h.push({ id: fid(m[1]), from: +m[2] });
      }
      state.hist[i] = [h[0], ...h.slice(1).sort((a, b) => a.from - b.from)];
    });
    state.focus = (p.get('fb') || '').replace(/[^a-z0-9-]/g, '') || null;
    const city = p.get('city');
    if (city && data.localBatteries.some(b => b.metros.includes(city))) state.city = city;
    const sp = (p.get('sports') || '').toUpperCase().split(',').filter(x => LGS.includes(x));
    if (sp.length) state.leagues = LGS.filter(lg => sp.includes(lg));
    if (location.hash === '#build') state.tab = 'build';  // old #rankings links land on the default local view
  } catch { /* no URL access */ }
}
function writeUrl() {
  try {
    const p = new URLSearchParams();
    p.set('from', state.from); p.set('to', state.to);
    if (state.leagues.length < LGS.length) p.set('sports', state.leagues.join(',').toLowerCase());
    if (state.city) p.set('city', state.city);
    const code = id => id ? id.split('-')[1].toLowerCase() : 'none';
    state.hist.forEach((h, i) => {
      if (state.leagues.includes(LGS[i])) p.set(LGS[i].toLowerCase(), [code(h[0].id), ...h.slice(1).map(x => `${code(x.id)}@${x.from}`)].join('.'));
    });
    history.replaceState(null, '', `${location.pathname}?${String(p).replace(/%2C/g, ',').replace(/%40/g, '@')}${state.tab === 'build' ? '#build' : ''}`);
  } catch { /* sandboxed */ }
}

// ---------- render ----------
function update() {
  $('from').value = state.from; $('to').value = state.to;
  $('spans').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.a === state.from && +b.dataset.b === state.to));
  $('sports').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', state.leagues.includes(b.dataset.lg)));
  $('lcity').value = state.city;
  if (state.tab === 'build') renderBuild(); else renderRank();
  writeUrl();
  queueLegend();
}
setTab(state.tab);
let lastW = $('result').clientWidth;
window.addEventListener('resize', () => {
  const w = $('result').clientWidth;
  if (state.tab === 'build' && Math.abs(w - lastW) > 20) { lastW = w; renderBuild(); }
});

// ---------- masthead: "KEVIN KLEIN" as a scatterplot (same as the other kckdata.com pieces) ----------
function drawLogo() {
  const svg = $('logo'); if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const P = {
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'], I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    N: ['10001', '11001', '10101', '10101', '10011', '10011', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    ' ': ['000', '000', '000', '000', '000', '000', '000'],
  };
  const colors = ['#00d9ff', '#a78bfa', '#4ade80', '#fb923c', '#f472b6'];
  let seed = 20261002; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const W = 460, H = 92, m = { l: 28, r: 28, t: 8, b: 10 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
  const g = el('g', { transform: `translate(${m.l},${m.t})` }, svg);
  for (let v = 0; v <= 100; v += 25) {
    const y = ih * (1 - v / 100);
    el('line', { x1: 0, x2: iw, y1: y, y2: y, stroke: 'rgba(255,255,255,.08)', 'stroke-dasharray': '2,2' }, g);
    if (v % 50 === 0) { const t = el('text', { x: -6, y: y + 3, 'text-anchor': 'end', fill: 'rgba(255,255,255,.45)', 'font-size': 8, 'font-family': 'DM Mono, monospace' }, g); t.textContent = v; }
  }
  for (let v = 0; v <= 100; v += 20) el('line', { x1: iw * v / 100, x2: iw * v / 100, y1: 0, y2: ih, stroke: 'rgba(255,255,255,.08)', 'stroke-dasharray': '2,2' }, g);
  el('line', { x1: 0, x2: 0, y1: 0, y2: ih, stroke: 'rgba(255,255,255,.4)' }, g);
  el('line', { x1: 0, x2: iw, y1: ih, y2: ih, stroke: 'rgba(255,255,255,.4)' }, g);
  const name = 'KEVIN KLEIN';
  let units = 0; for (const ch of name) units += P[ch][0].length + 1; units -= 1;
  const sp = Math.min((iw - 16) / units, (ih - 8) / 7), x0 = (iw - units * sp) / 2, y0 = (ih - 7 * sp) / 2;
  const pts = []; let cx = x0;
  for (const ch of name) {
    const pat = P[ch];
    pat.forEach((row, r) => [...row].forEach((on, c) => {
      if (on === '1') pts.push({ x: cx + c * sp + (rnd() - .5) * 2, y: y0 + r * sp + (rnd() - .5) * 2, r: 1.6 + rnd() * 2.6,
        fill: colors[Math.floor(rnd() * colors.length)], o: .7 + rnd() * .3, sx: rnd() * iw, sy: rnd() * ih });
    }));
    cx += (pat[0].length + 1) * sp;
  }
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dots = pts.map(p => el('circle', { cx: still ? p.x : p.sx, cy: still ? p.y : p.sy, r: p.r, fill: p.fill, opacity: p.o }, g));
  if (still) return;
  const t0 = performance.now(), dur = 1300, ease = t => 1 - Math.pow(1 - t, 3);
  (function step(now) {
    let done = true;
    pts.forEach((p, i) => {
      const t = Math.min(1, Math.max(0, (now - t0 - i * 3) / dur)); if (t < 1) done = false;
      const e = ease(t); dots[i].setAttribute('cx', p.sx + (p.x - p.sx) * e); dots[i].setAttribute('cy', p.sy + (p.y - p.sy) * e);
    });
    if (!done) requestAnimationFrame(step);
  })(t0);
}
