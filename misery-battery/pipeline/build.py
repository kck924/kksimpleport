"""Build team-season table (all 4 leagues, 50 seasons) with location, record percentile and playoff stage."""
import glob, re, json, math
import pandas as pd

from pathlib import Path
HERE = Path(__file__).resolve().parent
RS = str(HERE / "raw" / "retrosheet")
D = str(HERE / "data")
Y0, Y1 = 1976, 2025  # season index year (NBA/NHL season 1976-77 -> 1976)

CITY = {  # lat, lon
 'Anaheim':(33.81,-117.88),'Arizona':(33.53,-112.26),'Atlanta':(33.76,-84.40),'Baltimore':(39.28,-76.62),
 'Boston':(42.35,-71.06),'Foxborough':(42.09,-71.26),'Buffalo':(42.88,-78.80),'Calgary':(51.04,-114.05),
 'Carolina':(35.80,-78.72),'Charlotte':(35.23,-80.84),'Chicago':(41.88,-87.65),'Cincinnati':(39.10,-84.51),
 'Cleveland':(41.50,-81.69),'Colorado':(39.75,-105.00),'Denver':(39.74,-104.99),'Columbus':(39.97,-83.01),
 'Dallas':(32.79,-96.81),'Arlington':(32.75,-97.08),'Detroit':(42.34,-83.05),'Edmonton':(53.55,-113.50),
 'Florida':(26.16,-80.33),'Miami':(25.78,-80.19),'Green Bay':(44.50,-88.06),'Hartford':(41.77,-72.67),
 'Houston':(29.75,-95.36),'Indianapolis':(39.76,-86.16),'Jacksonville':(30.32,-81.64),'Kansas City':(39.05,-94.48),
 'Las Vegas':(36.10,-115.18),'Los Angeles':(34.05,-118.25),'Memphis':(35.14,-90.05),'Milwaukee':(43.04,-87.92),
 'Minnesota':(44.95,-93.10),'Minneapolis':(44.98,-93.27),'Montreal':(45.50,-73.57),'Nashville':(36.16,-86.78),
 'New Jersey':(40.73,-74.17),'New Orleans':(29.95,-90.08),'New York':(40.75,-73.99),'NY Islanders':(40.72,-73.59),
 'East Rutherford':(40.81,-74.07),'Oakland':(37.75,-122.20),'Oklahoma City':(35.46,-97.52),'Orlando':(28.54,-81.38),
 'Ottawa':(45.30,-75.93),'Philadelphia':(39.90,-75.17),'Phoenix':(33.45,-112.07),'Pittsburgh':(40.44,-80.01),
 'Portland':(45.53,-122.67),'Quebec':(46.81,-71.21),'Sacramento':(38.58,-121.51),'St. Louis':(38.63,-90.19),
 'Salt Lake City':(40.77,-111.90),'San Antonio':(29.43,-98.44),'San Diego':(32.71,-117.16),'San Francisco':(37.78,-122.39),
 'Santa Clara':(37.40,-121.97),'San Jose':(37.33,-121.90),'Seattle':(47.60,-122.33),'Tampa Bay':(27.95,-82.46),
 'St. Petersburg':(27.77,-82.65),'Toronto':(43.64,-79.39),'Vancouver':(49.28,-123.11),'Washington':(38.90,-77.02),
 'Landover':(38.91,-76.86),'Winnipeg':(49.89,-97.14),'Vegas':(36.10,-115.18),'Utah':(40.77,-111.90),
 'Memphis TN Oilers':(35.14,-90.05),'Greensboro':(36.07,-79.79),'Brooklyn':(40.68,-73.98),'Golden State':(37.77,-122.39),
 'Texas':(32.75,-97.08),'Tennessee':(36.16,-86.77),'New England':(42.09,-71.26),
}
# metro label used for grouping anchors
METRO = {'Foxborough':'Boston','New England':'Boston','Arlington':'Dallas–Fort Worth','Texas':'Dallas–Fort Worth','Dallas':'Dallas–Fort Worth',
 'Anaheim':'Los Angeles','East Rutherford':'New York','New Jersey':'New York','NY Islanders':'New York','Brooklyn':'New York',
 'Florida':'Miami','Carolina':'Raleigh','Colorado':'Denver','Minnesota':'Minneapolis–St. Paul','Minneapolis':'Minneapolis–St. Paul',
 'Arizona':'Phoenix','Tampa Bay':'Tampa Bay','St. Petersburg':'Tampa Bay','Landover':'Washington','Golden State':'San Francisco',
 'Santa Clara':'San Jose','Vegas':'Las Vegas','Utah':'Salt Lake City','Tennessee':'Nashville','Memphis TN Oilers':'Memphis'}

def dist(a, b):
    (la1, lo1), (la2, lo2) = a, b
    p = math.pi/180
    h = math.sin((la2-la1)*p/2)**2 + math.cos(la1*p)*math.cos(la2*p)*math.sin((lo2-lo1)*p/2)**2
    return 3958.8*2*math.asin(math.sqrt(h))

rows = []  # league, fid, year, name, city, wpct, stage, rec

# ---------------- MLB (Retrosheet) ----------------
MLB_NAME = {'ANA':'Angels','CAL':'Angels','ARI':'Diamondbacks','ATH':'Athletics','OAK':'Athletics','ATL':'Braves','BAL':'Orioles',
 'BOS':'Red Sox','CHA':'White Sox','CHN':'Cubs','CIN':'Reds','CLE':'Guardians','COL':'Rockies','DET':'Tigers','FLO':'Marlins','MIA':'Marlins',
 'HOU':'Astros','KCA':'Royals','LAN':'Dodgers','MIL':'Brewers','MIN':'Twins','MON':'Expos','WAS':'Nationals','NYA':'Yankees','NYN':'Mets',
 'PHI':'Phillies','PIT':'Pirates','SDN':'Padres','SEA':'Mariners','SFN':'Giants','SLN':'Cardinals','TBA':'Rays','TEX':'Rangers','TOR':'Blue Jays'}
MLB_FID = {'CAL':'ANA','OAK':'ATH','FLO':'MIA','MON':'WAS'}
def mlb_city(code, y):
    return {'ANA':'Anaheim','CAL':'Anaheim','ARI':'Phoenix','ATH':'Sacramento','OAK':'Oakland','ATL':'Atlanta','BAL':'Baltimore','BOS':'Boston',
     'CHA':'Chicago','CHN':'Chicago','CIN':'Cincinnati','CLE':'Cleveland','COL':'Denver','DET':'Detroit','FLO':'Miami','MIA':'Miami','HOU':'Houston',
     'KCA':'Kansas City','LAN':'Los Angeles','MIL':'Milwaukee','MIN':'Minneapolis','MON':'Montreal','WAS':'Washington','NYA':'New York','NYN':'New York',
     'PHI':'Philadelphia','PIT':'Pittsburgh','SDN':'San Diego','SEA':'Seattle','SFN':'San Francisco','SLN':'St. Louis','TBA':'St. Petersburg',
     'TEX':'Arlington','TOR':'Toronto'}[code]
def mlb_name(code, y):
    n = MLB_NAME[code]
    if code == 'CLE' and y < 2022: n = 'Indians'
    if code == 'TBA' and y < 2008: n = 'Devil Rays'
    if code in ('FLO',): n = 'Marlins'
    pre = {'ANA':'Anaheim' if y < 2005 else 'Los Angeles','CAL':'California','ATH':'','OAK':'Oakland','TBA':'Tampa Bay','FLO':'Florida','ARI':'Arizona',
           'COL':'Colorado','MIN':'Minnesota','TEX':'Texas','CHA':'Chicago','CHN':'Chicago','NYA':'New York','NYN':'New York','LAN':'Los Angeles',
           'SFN':'San Francisco','SDN':'San Diego','SLN':'St. Louis','KCA':'Kansas City'}.get(code, mlb_city(code, y))
    if code == 'ANA' and 1997 <= y <= 2004: pre = 'Anaheim'
    return (pre + ' ' + n).strip()

def series_results(prefix):
    e = pd.read_csv(f"{RS}/gamelog/GL{prefix}.TXT", header=None, usecols=[0, 3, 6, 9, 10])
    e['y'] = e[0].astype(str).str[:4].astype(int)
    e = e[(e.y >= Y0) & (e.y <= Y1)]
    out = {}
    for y, g in e.groupby('y'):
        wins = {}
        teams = set(g[3]) | set(g[6])
        for _, r in g.iterrows():
            w = r[3] if r[9] > r[10] else r[6]
            wins[w] = wins.get(w, 0) + 1
        out[y] = (teams, wins)
    return out
post = {p: series_results(p) for p in ['WC', 'DV', 'LC', 'WS']}
for y in range(Y0, Y1+1):
    f = glob.glob(f"{RS}/seasons/{y}/[Gg][Ll]{y}.[Tt][Xx][Tt]")[0]
    g = pd.read_csv(f, header=None, usecols=[3, 6, 9, 10])
    rec = {}
    for v, h, vs, hs in g.itertuples(index=False):
        for t in (v, h): rec.setdefault(t, [0, 0])
        if vs > hs: rec[v][0] += 1; rec[h][1] += 1
        elif hs > vs: rec[h][0] += 1; rec[v][1] += 1
    made = set()
    for p in ['WC', 'DV', 'LC', 'WS']:
        if y in post[p]: made |= post[p][y][0]
    f4 = post['LC'][y][0] if y in post['LC'] else set()
    f2 = post['WS'][y][0] if y in post['WS'] else set()
    champ = max(post['WS'][y][1], key=post['WS'][y][1].get) if y in post['WS'] else None
    for t, (w, l) in rec.items():
        st = 4 if t == champ else 3 if t in f2 else 2 if t in f4 else 1 if t in made else 0
        rows.append(dict(league='MLB', fid=MLB_FID.get(t, t), year=y, name=mlb_name(t, y), city=mlb_city(t, y),
                         wpct=w/(w+l), stage=st, rec=f"{w}-{l}"))

# ---------------- NFL ----------------
def nfl_city(code, y):
    m = {'ARI':'Arizona','ATL':'Atlanta','BAL':'Baltimore','BUF':'Buffalo','CAR':'Charlotte','CHI':'Chicago','CIN':'Cincinnati','CLE':'Cleveland',
         'DAL':'Arlington','DEN':'Denver','DET':'Detroit','GB':'Green Bay','HOU':'Houston','IND':'Indianapolis','JAX':'Jacksonville','KC':'Kansas City',
         'MIA':'Miami','MIN':'Minneapolis','NE':'Foxborough','NO':'New Orleans','NYG':'East Rutherford','NYJ':'East Rutherford','PHI':'Philadelphia',
         'PIT':'Pittsburgh','SEA':'Seattle','SF':'Santa Clara' if y >= 2014 else 'San Francisco','TB':'Tampa Bay','WAS':'Landover','WSH':'Landover',
         'SD':'San Diego','STL':'St. Louis','LV':'Las Vegas','OAK':'Oakland','LA':'Los Angeles'}
    if code == 'TEN': return 'Houston' if y <= 1996 else 'Memphis TN Oilers' if y == 1997 else 'Nashville'
    if code == 'LAR': return 'Los Angeles' if (y <= 1994 or y >= 2016) else 'St. Louis'
    if code == 'LAC': return 'San Diego' if y <= 2016 else 'Los Angeles'
    if code == 'OAK': return 'Los Angeles' if 1982 <= y <= 1994 else 'Las Vegas' if y >= 2020 else 'Oakland'
    if code == 'ARI': return 'St. Louis' if y <= 1987 else 'Phoenix' if y <= 1993 else 'Arizona'
    if code == 'IND' and y <= 1983: return 'Baltimore'
    return m[code]
NFL_FID = {'LA':'LAR','STL':'LAR','SD':'LAC','LV':'OAK','WSH':'WAS'}
NFL_NICK = {'ARI':'Cardinals','ATL':'Falcons','BAL':'Ravens','BUF':'Bills','CAR':'Panthers','CHI':'Bears','CIN':'Bengals','CLE':'Browns','DAL':'Cowboys',
 'DEN':'Broncos','DET':'Lions','GB':'Packers','HOU':'Texans','IND':'Colts','JAX':'Jaguars','KC':'Chiefs','MIA':'Dolphins','MIN':'Vikings',
 'NE':'Patriots','NO':'Saints','NYG':'Giants','NYJ':'Jets','PHI':'Eagles','PIT':'Steelers','SEA':'Seahawks','SF':'49ers','TB':'Buccaneers',
 'LAR':'Rams','LAC':'Chargers','OAK':'Raiders'}
def nfl_name(fid, y):
    if fid == 'TEN': return 'Houston Oilers' if y <= 1996 else 'Tennessee Oilers' if y <= 1998 else 'Tennessee Titans'
    if fid == 'WAS': return 'Washington Redskins' if y <= 2019 else 'Washington Football Team' if y <= 2021 else 'Washington Commanders'
    if fid == 'OAK': return ('Los Angeles' if 1982 <= y <= 1994 else 'Oakland' if y <= 2019 else 'Las Vegas') + ' Raiders'
    if fid == 'LAR': return ('St. Louis' if 1995 <= y <= 2015 else 'Los Angeles') + ' Rams'
    if fid == 'LAC': return ('San Diego' if y <= 2016 else 'Los Angeles') + ' Chargers'
    if fid == 'ARI': return ('St. Louis' if y <= 1987 else 'Phoenix' if y <= 1993 else 'Arizona') + ' Cardinals'
    if fid == 'IND': return ('Baltimore' if y <= 1983 else 'Indianapolis') + ' Colts'
    c = {'NE':'New England','NYG':'New York','NYJ':'New York','TB':'Tampa Bay','GB':'Green Bay','KC':'Kansas City','NO':'New Orleans','SF':'San Francisco',
         'CAR':'Carolina','JAX':'Jacksonville','MIN':'Minnesota','DAL':'Dallas','MIA':'Miami'}.get(fid)
    return (c or nfl_city(fid, y)) + ' ' + NFL_NICK[fid]

def add_nfl(y, games):  # games: list of (t1, t2, s1, s2, kind) kind in REG/WC/DIV/CON/SB
    rec, made, f4, f2, champ = {}, set(), set(), set(), None
    for t1, t2, s1, s2, k in games:
        if k == 'REG':
            for t in (t1, t2): rec.setdefault(t, [0, 0, 0])
            if s1 > s2: rec[t1][0] += 1; rec[t2][1] += 1
            elif s2 > s1: rec[t2][0] += 1; rec[t1][1] += 1
            else: rec[t1][2] += 1; rec[t2][2] += 1
        else:
            made |= {t1, t2}
            if k in ('CON', 'SB'): f4 |= {t1, t2}
            if k == 'SB': f2 |= {t1, t2}; champ = t1 if s1 > s2 else t2
    for t, (w, l, ti) in rec.items():
        st = 4 if t == champ else 3 if t in f2 else 2 if t in f4 else 1 if t in made else 0
        rows.append(dict(league='NFL', fid=t, year=y, name=nfl_name(t, y), city=nfl_city(t, y),
                         wpct=(w+0.5*ti)/(w+l+ti), stage=st, rec=f"{w}-{l}" + (f"-{ti}" if ti else "")))

old = pd.read_csv(f"{D}/../raw/nfl_games.csv")
for y in range(Y0, 1999):
    g = old[old.season == y].sort_values('date')
    po = g[g.playoff == 1]
    kinds = {}
    idx = list(po.index)
    for i in idx: kinds[i] = 'WC'
    kinds[idx[-1]] = 'SB'; kinds[idx[-2]] = 'CON'; kinds[idx[-3]] = 'CON'
    games = []
    for i, r in g.iterrows():
        k = kinds.get(i, 'REG')
        games.append((NFL_FID.get(r.team1, r.team1), NFL_FID.get(r.team2, r.team2), r.score1, r.score2, k))
    add_nfl(y, games)
new = pd.read_csv(f"{D}/../raw/games.csv")
for y in range(1999, Y1+1):
    g = new[(new.season == y) & new.home_score.notna()]
    games = [(NFL_FID.get(r.home_team, r.home_team), NFL_FID.get(r.away_team, r.away_team), r.home_score, r.away_score, r.game_type)
             for r in g.itertuples()]
    add_nfl(y, games)

# ---------------- NBA / NHL (sports-reference franchise tables) ----------------
def stage_text(s):
    s = (s or '').strip()
    if not s: return 0
    if s.startswith('Won'): return 4
    if 'Stanley Cup Final' in s or s == 'Lost Finals': return 3
    if 'Conf. Finals' in s or 'Conference Finals' in s or s == 'Lost NHL Semi-Finals': return 2
    return 1
NBA_CITY = {'Golden State':'San Francisco','Utah':'Salt Lake City','New Jersey':'New Jersey','Indiana':'Indianapolis','Minnesota':'Minneapolis',
            'Phoenix':'Phoenix','Brooklyn':'Brooklyn','Vancouver':'Vancouver','Seattle':'Seattle','New Orleans/Oklahoma City':'Oklahoma City'}
NBA_SPECIAL = {('WAS', y): 'Landover' for y in range(Y0, 1997)}  # Capital Centre until Dec 1997
def city_from_name(name, league):
    if name.startswith('New Orleans/Oklahoma City'): return 'Oklahoma City'
    for c in sorted(set(CITY) | set(NBA_CITY) | {'Indiana', 'Mighty Ducks of Anaheim', 'Utah'}, key=len, reverse=True):
        if name.startswith(c): return NBA_CITY.get(c, c) if league == 'NBA' else c
    if name.startswith('Mighty Ducks'): return 'Anaheim'
    raise ValueError(name)
for lg in ['nba', 'nhl']:
    for f in sorted(glob.glob(f"{D}/{lg}/*.csv")):
        t = pd.read_csv(f, dtype=str, keep_default_na=False)
        for r in t.itertuples():
            y = int(r.season[:4])
            if y < Y0 or y > Y1: continue
            w, l = int(r.W), int(r.L)
            if lg == 'nhl':
                gp = int(r.GP); otp = gp - w - l  # ties + OT/SO losses: 1 point each
                wpct = (2*w + otp) / (2*gp); rec = f"{w}-{l}-{otp}"
                city = city_from_name(r.team_name, 'NHL')
                if r.team_name.startswith('Mighty Ducks') or r.team_name.startswith('Anaheim'): city = 'Anaheim'
                if r.team_name.startswith('New York Islanders'): city = 'NY Islanders'
                if r.team_name.startswith('Carolina') and y <= 1998: city = 'Carolina'
            else:
                wpct = w/(w+l); rec = f"{w}-{l}"
                city = NBA_SPECIAL.get((r.franchise, y)) or city_from_name(r.team_name, 'NBA')
                if r.franchise == 'GSW' and y <= 2018: city = 'Oakland'
            rows.append(dict(league=lg.upper(), fid=r.franchise, year=y, name=r.team_name.strip(), city=city,
                             wpct=wpct, stage=int(r.stage) if 'stage' in t.columns else stage_text(r.playoff_result), rec=rec))

df = pd.DataFrame(rows)
# NBA counts the 1988-2002 Charlotte Hornets as the current Charlotte franchise
df.loc[(df.league == 'NBA') & (df.fid == 'CHH'), 'fid'] = 'CHA'
# normalize Chicago Black Hawks
df.loc[df.name.str.startswith('Chicago Bl'), 'name'] = 'Chicago Blackhawks'
# percentile of record within league-season (0 worst, 1 best)
df['pct'] = df.groupby(['league', 'year']).wpct.rank(pct=False, method='average')
n = df.groupby(['league', 'year']).wpct.transform('count')
df['pct'] = (df.pct - 1) / (n - 1)
for c in df.city.unique(): assert c in CITY, c
df['lat'] = df.city.map(lambda c: CITY[c][0]); df['lon'] = df.city.map(lambda c: CITY[c][1])
df.to_csv(f"{D}/team_seasons.csv", index=False)
if __name__ == '__main__':
    print(df.groupby('league').size().to_string())
