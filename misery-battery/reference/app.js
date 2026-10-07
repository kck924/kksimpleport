// Reference UI for the Misery Battery tool. Plain DOM, no framework.
import { createMisery, PRESETS, WEIGHT_FIELDS, DEFAULT_WEIGHTS } from '../src/misery.js';

const DATA_URL = '../data/misery-data.json';
const data = window.MISERY_DATA ?? await (await fetch(DATA_URL)).json();
const M = createMisery(data);
const { firstYear, lastYear } = M.meta;
const LGS = M.leagues;
const STAGE_COLORS = ['var(--s0)', 'var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const STAGE_TEXT = ['missed the playoffs', 'made the playoffs', 'reached the final four', 'lost in the final', 'won the title'];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- state ----------
const state = {
  from: firstYear, to: lastYear,
  weights: { ...DEFAULT_WEIGHTS }, preset: 'balanced',
  teams: ['MLB-BAL', 'NBA-WAS', 'NHL-WSH', 'NFL-WAS'],
  tab: 'build', showAll: false,
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
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const fmt = n => n.toLocaleString('en-US');
const opts = () => ({ from: state.from, to: state.to, weights: state.weights });
const years = () => Array.from({ length: state.to - state.from + 1 }, (_, i) => state.from + i);

function strip(seasonsByYear, lg) {
  const ys = years();
  const cells = ys.map(y => {
    const s = seasonsByYear.get(y);
    if (!s) return `<i class="x" title="${seasonLabel(lg, y)}: no season"></i>`;
    return `<i style="background:${STAGE_COLORS[s.stage]}" title="${esc(`${seasonLabel(lg, y)} ${s.name} ${s.record}, ${STAGE_TEXT[s.stage]}`)}"></i>`;
  }).join('');
  return `<div class="strip" style="grid-template-columns:repeat(${ys.length},1fr)">${cells}</div>`;
}
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
  ['All 35 years', firstYear, lastYear], ['Last 20', lastYear - 19, lastYear], ['Last 10', lastYear - 9, lastYear],
  ['1990s', 1991, 1999], ['2000s', 2000, 2009], ['2010s', 2010, 2019], ['2020s', 2020, lastYear],
];
$('spans').innerHTML = SPANS.map(([l, a, b]) => `<button class="chip" data-a="${a}" data-b="${b}">${l}</button>`).join('');
$('spans').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  state.from = +b.dataset.a; state.to = +b.dataset.b; update();
});

for (const [key, p] of Object.entries(PRESETS)) {
  const b = document.createElement('button');
  b.className = 'chip'; b.dataset.p = key; b.textContent = p.label;
  b.addEventListener('click', () => { state.weights = { ...p.weights }; state.preset = key; update(); });
  $('presets').appendChild(b);
}
for (const f of WEIGHT_FIELDS) {
  const d = document.createElement('div'); d.className = 'sl';
  d.innerHTML = `<label for="w_${f.key}">${f.label}<output id="o_${f.key}"></output></label>
    <input type="range" id="w_${f.key}" min="${f.min}" max="${f.max}" step="${f.step}">`;
  d.querySelector('input').addEventListener('input', e => { state.weights[f.key] = +e.target.value; state.preset = null; update(); });
  $('sliders').appendChild(d);
}

// ---------- tabs ----------
function setTab(t) {
  state.tab = t;
  $('tab-build').setAttribute('aria-selected', t === 'build');
  $('tab-rank').setAttribute('aria-selected', t === 'rank');
  $('build').hidden = t !== 'build';
  $('rankings').hidden = t !== 'rank';
  update();
}
$('tab-build').addEventListener('click', () => setTab('build'));
$('tab-rank').addEventListener('click', () => setTab('rank'));

// ---------- build-your-own ----------
const metroMap = M.metroDefaults();
$('metro').add(new Option('Choose a city…', ''));
for (const m of metroMap.keys()) $('metro').add(new Option(m, m));
$('metro').addEventListener('change', e => {
  const ids = metroMap.get(e.target.value);
  if (ids) { state.teams = [...ids]; update(); }
});

$('pickers').innerHTML = LGS.map((lg, i) => `<div class="picker"><label class="lbl" for="pick${i}">${lg}</label><select id="pick${i}"></select></div>`).join('');
LGS.forEach((lg, i) => $('pick' + i).addEventListener('change', e => { state.teams[i] = e.target.value; $('metro').value = ''; update(); }));

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
    sel.value = state.teams[i];
  });
}

const TIERS = [[95, 'Cursed'], [80, 'Miserable'], [60, 'Rough'], [40, 'Middling'], [20, 'Comfortable'], [0, 'Spoiled']];
function renderBuild() {
  fillPickers();
  const r = M.batteryReport(state.teams, opts());
  const span = state.from === state.to ? `${state.from}` : `${state.from}–${state.to}`;
  const res = $('result');
  if (!r.complete) {
    const missing = r.teams.filter(t => !t.available).map(t => t.name).join(' and ');
    res.innerHTML = `<p class="warn">${esc(missing)} didn't play in ${span}. Pick a team that did, or widen the time frame, to see the full score.</p>`;
  } else {
    const tier = TIERS.find(([p]) => r.percentile >= p)[1];
    const dist = M.distribution(opts());
    res.innerHTML = `
      <div class="verdict">
        <div class="big">${r.score.toFixed(1)}<small>misery, ${span}</small></div>
        <div>
          <div class="tier">${tier}</div>
          <p class="vtext">More miserable than <b>${r.percentile.toFixed(1)}%</b> of the <b>${fmt(r.totalCombos)}</b> possible four-team batteries over ${span}. That's <b>${fmt(r.miseryRank)}${ordinal(r.miseryRank).replace(/^\d+/, '')}</b> most miserable. Together: <b>${r.titles}</b> title${r.titles === 1 ? '' : 's'}, <b>${r.finals}</b> trip${r.finals === 1 ? '' : 's'} to the final, <b>${r.playoffs}</b> playoff seasons out of ${r.seasonCount}.</p>
        </div>
      </div>
      ${histogram(dist, r.score)}
      <div class="histcap">
        <span>Luckiest possible: <b>${dist.luckiest.map(t => short(t.name)).join(' · ')}</b> (${(dist.luckiest.reduce((a, t) => a + t.score, 0) / 4).toFixed(1)})</span>
        <span>Most miserable possible: <b>${dist.worst.map(t => short(t.name)).join(' · ')}</b> (${(dist.worst.reduce((a, t) => a + t.score, 0) / 4).toFixed(1)})</span>
      </div>`;
  }
  $('cards').innerHTML = r.teams.map(teamCard).join('');
}

function histogram(dist, score) {
  const W = 600, H = 92, top = 16, base = 70, n = dist.hist.length, bw = W / n;
  const max = Math.max(...dist.hist);
  const x = s => ((s - dist.min) / (dist.max - dist.min || 1)) * W;
  const bars = dist.hist.map((c, i) => {
    const h = (c / max) * (base - top);
    const mid = dist.min + (i + 0.5) * dist.binWidth;
    return `<rect x="${(i * bw + 0.5).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${h.toFixed(1)}" rx="1" fill="${mid > score ? 'var(--bruise-soft)' : 'var(--bar)'}"/>`;
  }).join('');
  const mx = Math.max(1, Math.min(W - 1, x(score)));
  const anchor = mx < 40 ? 'start' : mx > W - 40 ? 'end' : 'middle';
  return `<svg class="hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribution of all possible battery scores; yours is ${score.toFixed(1)}">
    ${bars}
    <line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="var(--rule)"/>
    <line x1="${mx}" x2="${mx}" y1="${top - 4}" y2="${base}" stroke="var(--bruise)" stroke-width="2.5"/>
    <text x="${mx}" y="${top - 6}" text-anchor="${anchor}" style="fill:var(--bruise);font-weight:600">your four</text>
    <text x="0" y="${H - 6}">${dist.min.toFixed(1)} luckier</text>
    <text x="${W}" y="${H - 6}" text-anchor="end">more miserable ${dist.max.toFixed(1)}</text>
  </svg>`;
}

function teamCard(t) {
  const f = M.franchises[t.franchise];
  const eras = f.eras.filter(e => e.to >= state.from && e.from <= state.to);
  const eraText = eras.length > 1 || (eras[0] && eras[0].name !== f.name)
    ? eras.map(e => `${e.name} ${e.from === e.to ? e.from : `${e.from}–${e.to}`}`).join(' · ') : '';
  if (!t.available) {
    return `<article class="card"><div class="ch"><div><div class="lbl">${f.league}</div><div class="cname">${esc(f.name)}</div></div></div>
      <p class="warn">No seasons between ${state.from} and ${state.to}. This team played ${f.first}–${f.last}.</p></article>`;
  }
  const byYear = new Map(t.seasons.map(s => [s.year, s]));
  const rank = t.qualified
    ? `<span class="pill${t.miseryRank > t.leagueSize / 2 ? ' calm' : ''}">${ordinal(t.miseryRank)} most miserable of ${t.leagueSize}</span>`
    : `<span class="pill calm">Unranked: ${t.seasonCount} of ${t.spanSeasons} seasons</span>`;
  const sline = s => `${seasonLabel(f.league, s.year)}, ${s.record}, ${STAGE_TEXT[s.stage]}`;
  return `<article class="card">
    <div class="ch">
      <div style="min-width:0"><div class="lbl">${f.league}</div><div class="cname">${esc(f.name)}</div>${eraText ? `<div class="cera">${esc(eraText)}</div>` : ''}</div>
      <div class="cscore">${t.score.toFixed(1)}<span>misery</span></div>
    </div>
    <div>${rank}</div>
    <div class="stats"><span><b>${t.titles}</b> title${t.titles === 1 ? '' : 's'}</span><span><b>${t.finals}</b> finals</span><span><b>${t.finalFours}</b> final fours</span><span><b>${t.playoffs}</b>/${t.seasonCount} playoff seasons</span></div>
    ${strip(byYear, f.league)}${yearAxis()}
    <div class="bw"><span>Best: <b>${esc(sline(t.best))}</b></span><span>Worst: <b>${esc(sline(t.worst))}</b></span></div>
  </article>`;
}

// ---------- local rankings ----------
['q', 'localonly', 'best'].forEach(id => $(id).addEventListener('input', () => { state.showAll = false; renderRank(); }));
$('more').addEventListener('click', () => { state.showAll = true; renderRank(); });
$('list').addEventListener('click', e => {
  const b = e.target.closest('button[data-ids]'); if (!b) return;
  state.teams = b.dataset.ids.split(','); $('metro').value = ''; setTab('build'); window.scrollTo({ top: 0 });
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
  let rows = ranked.filter(r => !$('localonly').checked || r.allLocalToday);
  if (q) rows = rows.filter(r => (r.metros.join(' ') + ' ' + r.slots.flatMap(s => s.seasons || []).map(s => s.name).join(' ')).toLowerCase().includes(q));
  if ($('best').checked) rows = rows.slice().reverse();
  const shown = state.showAll || q ? rows : rows.slice(0, 25);
  $('list').innerHTML = shown.length ? shown.map(r => {
    const slots = r.slots.map(s => {
      const g = segs(s.rows);
      if (!g.length) return '';
      const cur = g.at(-1);
      const prior = g.slice(0, -1).map(x => `${x.n} ${x.a === x.b ? x.a : `${x.a}–${x.b}`}`).join(', ');
      const byYear = new Map((s.seasons || []).map(x => [x.year, x]));
      return `<div class="slot"><span class="lg">${s.league}</span><div class="slotbody">
        <span class="tname">${esc(cur.n)}${prior ? ` <small>· earlier ${esc(prior)}</small>` : ''}</span>
        <span class="tline">${s.playoffs} playoffs · ${s.titles} title${s.titles === 1 ? '' : 's'}</span>
        ${strip(byYear, s.league)}</div></div>`;
    }).join('');
    // the team each slot was following at the end of the span
    const ids = r.slots.map(s => {
      const inSpan = s.rows.filter(i => i >= 0 && M.season(i).year >= state.from && M.season(i).year <= state.to);
      return M.franchises[M.season((inSpan.length ? inSpan : s.rows.filter(i => i >= 0)).at(-1)).franchise].id;
    });
    const names = r.slots.map(s => { const g = segs(s.rows); return g.length ? g.at(-1).n : '—'; });
    return `<article class="item${r.rank <= 10 ? ' top' : ''}">
      <div class="rank">${r.rank}</div>
      <div style="min-width:0"><div class="metro">${esc(names.join(' · '))}</div>
        <div class="facts">${esc(r.metros.join(', '))} · ${r.titles} title${r.titles === 1 ? '' : 's'} · ${r.finals} finals · ${r.playoffs} playoff seasons
        · <button class="load" data-ids="${ids.join(',')}">Open as my four</button></div></div>
      <div class="score"><b>${r.score.toFixed(1)}</b><span>misery</span></div>
      <div class="slots">${slots}<div class="slot"><span></span>${yearAxis()}</div></div>
    </article>`;
  }).join('') : `<p class="empty">No battery matches "${esc(q)}". Try a team nickname or a city.</p>`;
  $('more').hidden = state.showAll || !!q || rows.length <= 25;
  $('more').textContent = `Show all ${rows.length}`;
}

// ---------- URL state (works on a normal site; ignored where the URL can't change) ----------
function readUrl() {
  try {
    const p = new URLSearchParams(location.search);
    const from = +p.get('from'), to = +p.get('to');
    if (from >= firstYear && from <= lastYear) state.from = from;
    if (to >= state.from && to <= lastYear) state.to = to;
    const t = LGS.map(lg => p.get(lg.toLowerCase()));
    t.forEach((v, i) => { if (v && M.franchiseIndex(`${LGS[i]}-${v.toUpperCase()}`) != null) state.teams[i] = `${LGS[i]}-${v.toUpperCase()}`; });
    const w = p.get('w');
    if (w) {
      const vals = w.split('_').map(Number);
      if (vals.length === WEIGHT_FIELDS.length && vals.every(v => v >= 0 && v <= 10)) {
        WEIGHT_FIELDS.forEach((f, i) => { state.weights[f.key] = vals[i]; }); state.preset = null;
      }
    } else if (PRESETS[p.get('preset')]) { state.preset = p.get('preset'); state.weights = { ...PRESETS[state.preset].weights }; }
    if (location.hash === '#rankings') state.tab = 'rank';
  } catch { /* no URL access */ }
}
function writeUrl() {
  try {
    if (window.top !== window || !/^https?:$/.test(location.protocol)) return;
    const p = new URLSearchParams();
    p.set('from', state.from); p.set('to', state.to);
    state.teams.forEach((id, i) => p.set(LGS[i].toLowerCase(), id.split('-')[1].toLowerCase()));
    if (state.preset) { if (state.preset !== 'balanced') p.set('preset', state.preset); }
    else p.set('w', WEIGHT_FIELDS.map(f => state.weights[f.key]).join('_'));
    history.replaceState(null, '', `${location.pathname}?${p}${state.tab === 'rank' ? '#rankings' : ''}`);
  } catch { /* sandboxed */ }
}

// ---------- render ----------
function update() {
  $('from').value = state.from; $('to').value = state.to;
  $('spans').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.a === state.from && +b.dataset.b === state.to));
  $('presets').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === state.preset));
  for (const f of WEIGHT_FIELDS) {
    $('w_' + f.key).value = state.weights[f.key];
    $('o_' + f.key).textContent = String(+(+state.weights[f.key]).toFixed(2));
  }
  if (state.tab === 'build') renderBuild(); else renderRank();
  writeUrl();
}
setTab(state.tab);
