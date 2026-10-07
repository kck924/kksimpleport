from pathlib import Path
import json, math, itertools
import pandas as pd
from build import dist, METRO, Y0, Y1  # noqa (re-runs build quickly)

R = 60
d = pd.read_csv(str(Path(__file__).resolve().parent / 'data' / 'team_seasons.csv')).reset_index(drop=True)
YEARS = list(range(Y0, Y1 + 1))
LEAGUES = ['MLB', 'NBA', 'NHL', 'NFL']
by = {(lg, y): g for (lg, y), g in d.groupby(['league', 'year'])}

anchors = d[['city', 'lat', 'lon']].drop_duplicates('city').values.tolist()

def nearest_over_span(lg, pt):
    """For a city that never had a team in lg: the franchise with the shortest average distance to the city over the
    seasons it played in the span, measured from wherever it played each season. Nearest *today* would give
    Salt Lake City 44 years of Oakland/LA Raiders history (the Raiders reached Las Vegas in 2020); this picks the
    Broncos, and doesn't send Calgary to Oklahoma City with the Sonics or Charlotte away from the Hurricanes."""
    g = d[(d.league == lg) & d.year.isin(YEARS)]
    avg = g.assign(mi=g.apply(lambda r: dist(pt, (r.lat, r.lon)), axis=1)).groupby('fid').mi.mean()
    return avg.idxmin()

def metro_of(city):
    return METRO.get(city, city)

def lineage(lg, F, pt, local_ever, home):
    """One fan's team in league lg, season by season.
    A city that had a team in this league (within R miles) at some point follows F while F is local. When F isn't
    there (before it arrived, after it left), the fan only takes on a successor: a team in the same city (metro
    `home`) that never played alongside F. Rivals that coexisted with F, or teams merely within the radius of
    another city, are never adopted: those seasons are blank (-1) and score as neutral.
    A city that never had one follows its nearest team F for the whole span, and only F."""
    if not local_ever:
        seq = []
        for y in YEARS:
            g = by.get((lg, y))
            mine = g[g.fid == F] if g is not None else []
            seq.append(int(mine.index[0]) if len(mine) else -1)
        return tuple(seq)
    local = {}  # year -> local rows (within R)
    for y in YEARS:
        g = by.get((lg, y))
        if g is None: continue
        ds = g.apply(lambda r: dist(pt, (r.lat, r.lon)), axis=1)
        local[y] = ds[ds <= R]
    f_years = {y for y, loc in local.items() if any(d.fid[i] == F for i in loc.index)}
    rivals = {d.fid[i] for y in f_years for i in local[y].index if d.fid[i] != F}
    seq = []
    for y in YEARS:
        loc = local.get(y)
        if loc is None or not len(loc): seq.append(-1); continue
        mine = [i for i in loc.index if d.fid[i] == F]
        if mine: seq.append(int(mine[0])); continue
        ok = loc[[d.fid[i] not in rivals and metro_of(d.city[i]) == home for i in loc.index]]
        if not len(ok): seq.append(-1); continue
        prev = next((d.fid[i] for i in reversed(seq) if i >= 0), None)
        m = [i for i in ok.index if d.fid[i] == prev]
        seq.append(int(m[0] if m else ok.idxmin()))
    return tuple(seq)

lineages, lin_id = [], {}
combos = {}
for city, la, lo in anchors:
    pt = (la, lo)
    metro = METRO.get(city, city)
    per = []
    localnow = set()
    for lg in LEAGUES:
        ever = set()
        for y in YEARS:
            g = by.get((lg, y))
            if g is None: continue
            for r in g.itertuples():
                if dist(pt, (r.lat, r.lon)) <= R: ever.add(r.fid)
        local_ever = bool(ever)
        if not ever:
            ever = {nearest_over_span(lg, pt)}
        ids = []
        for F in sorted(ever):
            s = lineage(lg, F, pt, local_ever, metro)
            if s not in lin_id: lin_id[s] = len(lineages); lineages.append(s)
            ids.append(lin_id[s])
            if s[-1] >= 0:
                last = d.loc[s[-1]]
                if dist(pt, (last.lat, last.lon)) <= R: localnow.add(lin_id[s])
        per.append(sorted(set(ids)))
    for c in itertools.product(*per):
        e = combos.setdefault(c, [set(), False])
        e[0].add(metro)
        e[1] = e[1] or all(x in localnow for x in c)

print('anchors', len(anchors), 'lineages', len(lineages), 'combos', len(combos))
teams = d[['league', 'year', 'name', 'pct', 'stage', 'rec', 'city']].copy()
out = dict(
    teams=[[r.league, r.year, r.name, round(r.pct, 4), int(r.stage), r.rec] for r in teams.itertuples()],
    lineages=[list(s) for s in lineages],
    combos=[[list(c), sorted(m[0]), int(m[1])] for c, m in combos.items()],
    years=YEARS)
json.dump(out, open(str(Path(__file__).resolve().parent / 'data' / 'misery.json'), 'w'), separators=(',', ':'))
