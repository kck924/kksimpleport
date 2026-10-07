// misery.js — scoring engine for the Misery Battery tool.
// Framework-free ES module. No DOM access. Feed it the parsed misery-data.json.

export const DEFAULT_WEIGHTS = { reg: 1, po: 1, f4: 1, f2: 1, ch: 5, hb: 0 };

export const PRESETS = {
  balanced:   { label: 'Balanced',    weights: { reg: 1, po: 1, f4: 1, f2: 1, ch: 5, hb: 0 } },
  losing:     { label: 'Just losing', weights: { reg: 3, po: 1, f4: 0, f2: 0, ch: 0, hb: 0 } },
  rings:      { label: 'Rings only',  weights: { reg: 0, po: 0, f4: 0, f2: 0, ch: 5, hb: 0 } },
  heartbreak: { label: 'Heartbreak',  weights: { reg: 1, po: 1, f4: 1, f2: 1, ch: 5, hb: 2 } },
};

export const WEIGHT_FIELDS = [
  { key: 'reg', label: 'Regular-season standing', min: 0, max: 3, step: 0.25 },
  { key: 'po',  label: 'Made playoffs',           min: 0, max: 3, step: 0.25 },
  { key: 'f4',  label: 'Reached final four',      min: 0, max: 3, step: 0.25 },
  { key: 'f2',  label: 'Reached the final',       min: 0, max: 3, step: 0.25 },
  { key: 'ch',  label: 'Won the title',           min: 0, max: 6, step: 0.5 },
  { key: 'hb',  label: 'Lost-final heartbreak',   min: 0, max: 3, step: 0.25 },
];

// Stage codes: 0 missed playoffs, 1 made playoffs, 2 final four, 3 lost final, 4 won title.
export function seasonJoy(pct, stage, w) {
  return w.reg * pct + w.po * (stage >= 1) + w.f4 * (stage >= 2) + w.f2 * (stage >= 3)
       + w.ch * (stage === 4) - w.hb * (stage === 3);
}

// 0 = perfect season, 1 = worst possible season under these weights.
export function seasonMisery(pct, stage, w) {
  const hi = w.reg + w.po + w.f4 + w.f2 + w.ch;
  const lo = -w.hb;
  if (hi - lo <= 0) return 0;
  return (hi - seasonJoy(pct, stage, w)) / (hi - lo);
}

export function createMisery(data) {
  const { leagues, franchises, seasons, lineages, localBatteries, meta } = data;
  const S = { F: 0, YEAR: 1, PCT: 2, STAGE: 3, REC: 4, NAME: 5 };

  // franchise index -> list of season row indices, in year order
  const byFranchise = franchises.map(() => []);
  seasons.forEach((s, i) => byFranchise[s[S.F]].push(i));
  byFranchise.forEach(list => list.sort((a, b) => seasons[a][S.YEAR] - seasons[b][S.YEAR]));
  const idIndex = new Map(franchises.map((f, i) => [f.id, i]));

  const opts = o => ({
    from: o?.from ?? meta.firstYear,
    to: o?.to ?? meta.lastYear,
    weights: { ...DEFAULT_WEIGHTS, ...(o?.weights || {}) },
    // A franchise must have played this share of the span's seasons to be ranked
    // or to count in the all-batteries distribution (keeps 5-season expansion teams off the extremes).
    minShare: o?.minShare ?? 0.5,
    // Which leagues a battery covers (1–4). Defaults to all four; always kept in league order.
    leagues: o?.leagues?.length ? leagues.filter(lg => o.leagues.includes(lg)) : [...leagues],
  });
  // season rows per league-year; a league-year with no rows (the 2004-05 NHL lockout) didn't happen for anyone
  const leagueYear = new Map();
  seasons.forEach((x, i) => {
    const k = `${franchises[x[S.F]].league}|${x[S.YEAR]}`;
    if (!leagueYear.has(k)) leagueYear.set(k, []);
    leagueYear.get(k).push(i);
  });
  const spanYears = (league, o) => {
    const ys = [];
    for (let y = o.from; y <= o.to; y++) if (leagueYear.has(`${league}|${y}`)) ys.push(y);
    return ys;
  };
  const spanSeasons = (league, o) => spanYears(league, o).length;
  // A season with no team (before a franchise existed, after it left, or a fan base with no local team) is neutral:
  // it counts as that league's average season that year.
  const neutralCache = new Map();
  const neutral = (league, y, w) => {
    const k = `${league}|${y}|${w.reg},${w.po},${w.f4},${w.f2},${w.ch},${w.hb}`;
    if (!neutralCache.has(k)) {
      const rows = leagueYear.get(`${league}|${y}`);
      neutralCache.set(k, rows.reduce((a, i) => a + seasonMisery(seasons[i][S.PCT], seasons[i][S.STAGE], w), 0) / rows.length);
    }
    return neutralCache.get(k);
  };

  const season = i => {
    const s = seasons[i];
    return { index: i, franchise: s[S.F], year: s[S.YEAR], pct: s[S.PCT], stage: s[S.STAGE], record: s[S.REC], name: s[S.NAME] };
  };

  // Score a franchise's rows or a lineage over the span. Real seasons are listed and counted; years in the span with
  // no team score as neutral (the league average that year), so a short stint doesn't carry a full team's weight.
  function scoreRows(rows, o, league) {
    const inRange = rows.filter(i => i >= 0 && seasons[i][S.YEAR] >= o.from && seasons[i][S.YEAR] <= o.to);
    if (!inRange.length) return null;
    const list = inRange.map(i => {
      const x = season(i);
      x.misery = seasonMisery(x.pct, x.stage, o.weights);
      return x;
    });
    const have = new Set(list.map(x => x.year));
    let sum = list.reduce((a, x) => a + x.misery, 0), n = list.length;
    for (const y of spanYears(league, o)) if (!have.has(y)) { sum += neutral(league, y, o.weights); n++; }
    const count = st => list.filter(x => x.stage >= st).length;
    const byMisery = [...list].sort((a, b) => a.misery - b.misery || b.year - a.year);
    return {
      score: (100 * sum) / n,
      seasons: list,
      seasonCount: list.length,
      neutralSeasons: n - list.length,
      playoffs: count(1), finalFours: count(2), finals: count(3), titles: count(4),
      best: byMisery[0], worst: byMisery[byMisery.length - 1],
    };
  }

  function franchisesIn(league, o) {
    o = opts(o);
    return franchises
      .map((f, i) => ({ ...f, index: i }))
      .filter(f => f.league === league && f.last >= o.from && f.first <= o.to &&
        byFranchise[f.index].some(r => seasons[r][S.YEAR] >= o.from && seasons[r][S.YEAR] <= o.to));
  }

  // All franchises in a league with seasons in range, most miserable first.
  // `qualified` is false for teams that played under minShare of the span.
  function leagueTable(league, o) {
    o = opts(o);
    const need = Math.max(1, Math.ceil(spanSeasons(league, o) * o.minShare));
    return franchisesIn(league, o)
      .map(f => {
        const r = scoreRows(byFranchise[f.index], o, league);
        return { franchise: f.index, id: f.id, name: f.name, ...r, qualified: r.seasonCount >= need };
      })
      .sort((a, b) => b.score - a.score);
  }

  function franchiseReport(fid, o) {
    o = opts(o);
    const fi = typeof fid === 'number' ? fid : idIndex.get(fid);
    if (fi == null) throw new Error(`Unknown franchise ${fid}`);
    const r = scoreRows(byFranchise[fi], o, franchises[fi].league);
    if (!r) return { franchise: fi, ...franchises[fi], available: false };
    const table = leagueTable(franchises[fi].league, o);
    const me = table.find(t => t.franchise === fi);
    const ranked = table.filter(t => t.qualified);
    // miseryRank: 1 = most miserable qualified team in the league; null when the team played too few seasons
    const miseryRank = me.qualified ? ranked.findIndex(t => t.franchise === fi) + 1 : null;
    return { franchise: fi, ...franchises[fi], available: true, ...r, qualified: me.qualified,
             miseryRank, leagueSize: ranked.length, spanSeasons: spanSeasons(franchises[fi].league, o) };
  }

  // Distribution of every possible one-team-per-league battery for the span, over the chosen leagues.
  // Leagues are split into two groups whose pairwise sums are combined, so 4 leagues cost |A×B|·|C×D|.
  const distCache = new Map();
  function distribution(o) {
    o = opts(o);
    const key = JSON.stringify(o);
    if (distCache.has(key)) return distCache.get(key);
    const k = o.leagues.length;
    const tables = o.leagues.map(lg => leagueTable(lg, o).filter(t => t.qualified));
    const sums = group => group.reduce((acc, t) => acc.flatMap(x => t.map(y => x + y.score)), [0]);
    const half = Math.ceil(k / 2);
    const ab = sums(tables.slice(0, half)), cd = sums(tables.slice(half));
    cd.sort((p, q) => p - q);
    const total = ab.length * cd.length;
    const hist = new Array(50).fill(0);
    let min = Infinity, max = -Infinity;
    for (const x of ab) for (const y of cd) {
      const s = (x + y) / k;
      if (s < min) min = s;
      if (s > max) max = s;
    }
    const width = (max - min) / hist.length || 1;
    for (const x of ab) for (const y of cd) {
      hist[Math.min(hist.length - 1, Math.floor(((x + y) / k - min) / width))]++;
    }
    const pick = (sel) => tables.map(t => sel(t));
    const res = {
      leagues: o.leagues, k, total, ab, cd, min, max, hist, binWidth: width, tables,
      worst: pick(t => t[0]), luckiest: pick(t => t[t.length - 1]),
    };
    distCache.set(key, res);
    return res;
  }

  // Number of batteries with a score strictly below / above `score`.
  function countBelow(dist, score) {
    const target = score * dist.k;
    let n = 0;
    for (const x of dist.ab) {  // count cd values < target - x
      let lo = 0, hi = dist.cd.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (dist.cd[m] < target - x - 1e-9) lo = m + 1; else hi = m; }
      n += lo;
    }
    return n;
  }
  function countAbove(dist, score) {
    const target = score * dist.k;
    let n = 0;
    for (const x of dist.ab) {
      let lo = 0, hi = dist.cd.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (dist.cd[m] <= target - x + 1e-9) lo = m + 1; else hi = m; }
      n += dist.cd.length - lo;
    }
    return n;
  }

  // Where any battery score falls among all possible batteries for the span (also used for local batteries).
  function rankScore(score, o) {
    o = opts(o);
    const dist = distribution(o);
    const below = countBelow(dist, score), above = countAbove(dist, score);
    return { total: dist.total, below, above, percentile: (100 * below) / dist.total, miseryRank: above + 1 };
  }

  // ids: one to four franchise ids (e.g. ['MLB-BAL','NBA-WAS','NHL-WSH','NFL-WAS']) or indices, at most one per league.
  // The battery is compared against every combination of the same leagues.
  // A rooting history in one league: segments [{ id | null, from }] in year order, each running until the next one
  // starts (id null = no team). Seasons are taken from each franchise only for its own segment; every other season in
  // the span is neutral, as for any team. Ranked against the qualified teams of the league by score.
  function historyReport(league, segments, o) {
    o = opts(o);
    const segs = [...segments].sort((a, b) => a.from - b.from)
      .map((s, i, all) => ({ ...s, to: i + 1 < all.length ? all[i + 1].from - 1 : meta.lastYear }))
      .filter(s => s.to >= s.from);
    const rows = [];
    for (const s of segs) {
      if (s.id == null) continue;
      const fi = idIndex.get(s.id);
      if (fi == null || franchises[fi].league !== league) throw new Error(`Unknown ${league} franchise ${s.id}`);
      for (const i of byFranchise[fi]) { const y = seasons[i][S.YEAR]; if (y >= s.from && y <= s.to) rows.push(i); }
    }
    const used = segs.filter(s => s.id != null);
    const nameIn = s => {  // the team's name during the seasons followed, e.g. "Baltimore Colts"
      const fi = idIndex.get(s.id);
      const inSeg = byFranchise[fi].filter(i => seasons[i][S.YEAR] >= Math.max(s.from, o.from) && seasons[i][S.YEAR] <= Math.min(s.to, o.to));
      return inSeg.length ? seasons[inSeg.at(-1)][S.NAME] : franchises[fi].name;
    };
    const last = used.at(-1) ? idIndex.get(used.at(-1).id) : null;
    const base = { league, custom: true, segments: segs.map(s => ({ ...s, name: s.id == null ? null : nameIn(s) })),
                   franchise: last, id: last != null ? franchises[last].id : null,
                   name: [...new Set(used.map(nameIn))].join(' → ') || 'No team' };
    const r = rows.length ? scoreRows(rows, o, league) : null;
    if (!r) return { ...base, available: false };
    const ranked = leagueTable(league, o).filter(t => t.qualified);
    return { ...base, available: true, ...r, qualified: false,
             miseryRank: ranked.filter(t => t.score > r.score).length + 1, leagueSize: ranked.length, spanSeasons: spanSeasons(league, o) };
  }

  // Each entry is a franchise id (or index), or a rooting history { league, segments }.
  function batteryReport(ids, o) {
    o = opts(o);
    const teams = ids.map(id => id && typeof id === 'object' ? historyReport(id.league, id.segments, o) : franchiseReport(id, o));
    const leaguesSeen = new Set(teams.map(t => t.league));
    if (!teams.length || leaguesSeen.size !== teams.length) throw new Error('Pick one team from each league you follow');
    o = { ...o, leagues: leagues.filter(lg => leaguesSeen.has(lg)) };
    const ok = teams.filter(t => t.available);
    const complete = ok.length === teams.length;
    const score = ok.length ? ok.reduce((a, t) => a + t.score, 0) / ok.length : null;
    const out = { teams, complete, score, from: o.from, to: o.to };
    if (complete) {
      const dist = distribution(o);
      const below = countBelow(dist, score), above = countAbove(dist, score);
      Object.assign(out, {
        totalCombos: dist.total,
        moreMiserableThan: below,          // batteries this one beats on misery
        percentile: (100 * below) / dist.total,
        miseryRank: above + 1,             // 1 = most miserable possible battery
        titles: teams.reduce((a, t) => a + t.titles, 0),
        finals: teams.reduce((a, t) => a + t.finals, 0),
        playoffs: teams.reduce((a, t) => a + t.playoffs, 0),
        seasonCount: teams.reduce((a, t) => a + t.seasonCount, 0),
      });
    }
    return out;
  }

  // Geographic batteries (60-mile radius with nearest-team fallback), scored for the span over the chosen leagues.
  // A fan base with no team in one of the chosen leagues at any point in the span is left out.
  // Fan bases that only differed in a league left out are merged (metros combined).
  const lineageLeague = li => franchises[seasons[lineages[li].find(i => i >= 0)][S.F]].league;
  function rankLocalBatteries(o) {
    o = opts(o);
    const merged = new Map();
    localBatteries.forEach((b, bi) => {
      const lins = b.lineages.filter(li => o.leagues.includes(lineageLeague(li)))
        .sort((x, y) => leagues.indexOf(lineageLeague(x)) - leagues.indexOf(lineageLeague(y)));
      // merge fan bases whose teams are identical within the span (they may differ outside it)
      const key = lins.map(li => lineages[li].slice(o.from - meta.firstYear, o.to - meta.firstYear + 1).join('.')).join('|');
      const m = merged.get(key);
      if (m) { m.metros = [...new Set([...m.metros, ...b.metros])].sort(); m.allLocalToday ||= b.allLocalToday; }
      else merged.set(key, { battery: bi, lins, metros: [...b.metros], allLocalToday: b.allLocalToday });
    });
    const ranked = [...merged.values()].map(({ battery, lins, metros, allLocalToday }) => {
      const slots = lins.map(li => {
        const rows = lineages[li];
        const r = scoreRows(rows, o, lineageLeague(li));
        return { lineage: li, league: lineageLeague(li), rows, ...r };
      });
      // Only fan bases with a team in every chosen league during the span are ranked.
      const valid = slots.filter(s => s.score != null);
      if (valid.length < slots.length) return null;
      const score = valid.reduce((a, s) => a + s.score, 0) / valid.length;
      const pos = rankScore(score, { ...o, leagues: valid.map(s => s.league) });
      return {
        battery, metros, allLocalToday, slots, leagues: valid.map(s => s.league), score,
        percentile: pos.percentile, miseryRank: pos.miseryRank, total: pos.total,
        titles: valid.reduce((a, s) => a + s.titles, 0),
        finals: valid.reduce((a, s) => a + s.finals, 0),
        playoffs: valid.reduce((a, s) => a + s.playoffs, 0),
      };
    }).filter(Boolean);
    // Most miserable first, by position among comparable combinations (0 = most miserable possible). Raw scores
    // only compare within one league set, so a fan base missing a league is placed by its rank, not its score.
    const place = r => r.total > 1 ? (r.miseryRank - 1) / (r.total - 1) : 0;
    ranked.sort((a, b) => place(a) - place(b) || b.score - a.score);
    ranked.forEach((r, i) => { r.rank = i + 1; });
    return ranked;
  }

  // Nearest current team in each league for every metro that has a team (for "start from a city").
  const metroDefaults = () => new Map(Object.entries(data.metros || {}));

  return {
    meta, leagues, franchises, seasons, season,
    franchiseIndex: id => idIndex.get(id),
    franchisesIn, leagueTable, franchiseReport, historyReport, batteryReport, distribution, rankScore, rankLocalBatteries, metroDefaults,
  };
}
