"""NHL franchise seasons from records.nhl.com -> pipeline/data/nhl/<CODE>.csv (same columns as the hand-pulled tables, plus stage)."""
import json, glob, csv, sys, unicodedata
from collections import defaultdict
Y0 = int(sys.argv[2]) if len(sys.argv) > 2 else 1976
Y1 = int(sys.argv[3]) if len(sys.argv) > 3 else 2025
OUT = sys.argv[1]
CODE = {'VGK': 'VEG'}
def code(fid_abbrev, name, y):
    if name.startswith('Winnipeg Jets') and y <= 1995: return 'ARI'  # Jets I -> Coyotes franchise (kit convention)
    if fid_abbrev == 'WPG': return 'WPG'                         # Thrashers + Jets II
    return CODE.get(fid_abbrev, fid_abbrev)
def clean(n, y):
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().replace(' (1979)', '')
    if n == 'Anaheim Ducks' and y <= 2005: n = 'Mighty Ducks of Anaheim'   # API uses the current name
    return n
F = {f['id']: f for f in json.load(open('franchise.json'))['data']}
rows = defaultdict(list)
for p in glob.glob('fsr_*.json'):
    for r in json.load(open(p))['data']:
        y = r['seasonId'] // 10000
        if y < Y0 or y > Y1 or r['gameTypeId'] != 2: continue
        name = clean(r['teamName'], y)
        fr = F[r['franchiseId']]['teamAbbrev']
        c = code(fr, name, y)
        rnd, last = r['playoffRound'], r['finalPlayoffRound']
        if not r['inPlayoffs']: st, txt = 0, ''
        elif rnd == last and r['decision'] == 'W': st, txt = 4, 'Won Stanley Cup Final'
        elif rnd == last: st, txt = 3, 'Lost Stanley Cup Final'
        elif rnd == last - 1: st, txt = 2, f"Lost {r['seriesTitle']}"
        else: st, txt = 1, f"Lost {r['seriesTitle'] or 'playoffs'}"
        ot = r['overtimeLosses'] or ''
        rows[c].append(dict(franchise=c, season=f"{y}-{str(y+1)[2:]}", team_name=name, GP=r['gamesPlayed'], W=r['wins'], L=r['losses'],
                            T=r['ties'] if r['ties'] is not None else '', OL=ot, playoff_result=txt, stage=st))
for c, rs in rows.items():
    rs.sort(key=lambda r: r['season'])
    with open(f"{OUT}/{c}.csv", 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rs[0])); w.writeheader(); w.writerows(rs)
print(len(rows), 'franchises', sum(map(len, rows.values())), 'seasons')
