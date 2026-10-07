"""Basketball-Reference franchise pages (teams/<CODE>/) -> pipeline/data/nba/<CODE>.csv for Y0..Y1, NBA seasons only."""
import csv, glob, html, os, re, sys

OUT, Y0, Y1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
cell = lambda row, stat: html.unescape(re.sub(r'<[^>]+>', '', (re.search(rf'data-stat="{stat}"[^>]*>(.*?)</t[dh]>', row, re.S) or [None, ''])[1])).strip()

rows = {}
for p in sorted(glob.glob('*.html')):
    code = os.path.basename(p)[:-5]
    h = open(p, encoding='utf-8', errors='replace').read()
    m = re.search(rf'<table[^>]*id="{code}"[^>]*>(.*?)</table>', h, re.S)
    if not m:
        print('no table', code); continue
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', m.group(1), re.S):
        season = cell(tr, 'season')
        if not re.match(r'\d{4}-\d{2}', season): continue
        y = int(season[:4])
        if y < Y0 or y > Y1 or cell(tr, 'lg_id') != 'NBA': continue
        team = cell(tr, 'team_name').replace('*', '').strip()
        # Basketball-Reference files the 1988-2002 Hornets under today's Charlotte page; the kit keeps them as CHH (merged into CHA in build.py)
        c = 'CHH' if code == 'CHA' and y <= 2001 else code
        rows.setdefault(c, []).append(dict(franchise=c, season=season, team_name=team, W=cell(tr, 'wins'), L=cell(tr, 'losses'),
                                           playoff_result=cell(tr, 'rank_team_playoffs')))
for c, rs in rows.items():
    rs.sort(key=lambda r: r['season'])
    with open(f'{OUT}/{c}.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rs[0])); w.writeheader(); w.writerows(rs)
print(len(rows), 'franchises', sum(map(len, rows.values())), 'seasons')
