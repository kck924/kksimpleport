from pathlib import Path
"""Write the site data file: franchises, team-seasons, lineages and local batteries."""
import json
import pandas as pd
d = pd.read_csv(str(Path(__file__).resolve().parent / 'data' / 'team_seasons.csv'))
m = json.load(open(str(Path(__file__).resolve().parent / 'data' / 'misery.json')))
assert len(m['teams']) == len(d)
LG = ['MLB', 'NBA', 'NHL', 'NFL']
fr, fidx = [], {}
for (lg, fid), g in sorted(d.groupby(['league', 'fid']), key=lambda x: (LG.index(x[0][0]), x[1].sort_values('year').name.iloc[-1])):
    g = g.sort_values('year')
    eras = []
    for r in g.itertuples():
        if eras and eras[-1]['name'] == r.name and eras[-1]['to'] == r.year - 1 - (1 if (lg == 'NHL' and r.year == 2005) else 0):
            eras[-1]['to'] = r.year
        elif eras and eras[-1]['name'] == r.name:
            eras[-1]['to'] = r.year
        else:
            eras.append(dict(name=r.name, **{'from': int(r.year), 'to': int(r.year)}))
    fidx[(lg, fid)] = len(fr)
    fr.append(dict(id=f"{lg}-{fid}", league=lg, name=g.name.iloc[-1], city=g.city.iloc[-1],
                   first=int(g.year.min()), last=int(g.year.max()), eras=eras))
seasons = [[fidx[(r.league, r.fid)], int(r.year), round(float(r.pct), 4), int(r.stage), r.rec, r.name] for r in d.itertuples()]
import math
from build import dist, METRO, Y0, Y1
last = d[d.year == Y1]
metros = {}
for city in sorted(d.city.unique()):
    mk = METRO.get(city, city)
    if mk in metros: continue
    r0 = d[d.city == city].iloc[0]; pt = (r0.lat, r0.lon)
    ids = []
    for lg in LG:
        g = last[last.league == lg]
        best = min(g.itertuples(), key=lambda r: dist(pt, (r.lat, r.lon)))
        if dist(pt, (best.lat, best.lon)) > 60:
            # no local team today: the current franchise with the shortest average distance over the span (see combos.py)
            h = d[(d.league == lg) & d.fid.isin(set(g.fid))]
            avg = h.assign(mi=h.apply(lambda r: dist(pt, (r.lat, r.lon)), axis=1)).groupby('fid').mi.mean()
            ids.append(f"{lg}-{avg.idxmin()}"); continue
        ids.append(f"{lg}-{best.fid}")
    metros[mk] = ids
out = dict(
    meta=dict(firstYear=Y0, lastYear=Y1, generated=__import__('datetime').date.today().isoformat(),
              seasonFields=['franchise', 'year', 'pct', 'stage', 'record', 'name'],
              stages=['Missed playoffs', 'Made playoffs', 'Final four', 'Lost final', 'Won title'],
              radiusMiles=60),
    metros=dict(sorted(metros.items())),
    leagues=LG, franchises=fr, seasons=seasons, lineages=m['lineages'],
    localBatteries=[dict(lineages=c[0], metros=c[1], allLocalToday=bool(c[2])) for c in m['combos']])
json.dump(out, open(str(Path(__file__).resolve().parent.parent / 'data' / 'misery-data.json'), 'w'), separators=(',', ':'))
print(len(fr), 'franchises', len(seasons), 'seasons', len(out['localBatteries']), 'local batteries')
for f in fr:
    if len(f['eras']) > 1 or f['last'] < Y1: print(f['id'], f['name'], [(e['name'], e['from'], e['to']) for e in f['eras']])
