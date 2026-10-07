// Run with: node --test   (from the kit root)
// Golden values come from the reference implementation on the 2026-10-04 data build.
// 2026-10-04: data extended to 1976–2025. The original 1991–2025 values are kept, pinned to that span, to prove
// the extension didn't change any existing season; new full-span values were added on purpose.
// 2026-10-05: titles raised to 5 points and seasons with no team now count as neutral (the league's average season that
// year) instead of being skipped, so every score-based golden value below was updated on purpose.
// If you change scoring on purpose, update them; if they break by accident, the port is wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMisery, PRESETS, seasonMisery, DEFAULT_WEIGHTS } from '../src/misery.js';

const data = JSON.parse(readFileSync(new URL('../data/misery-data.json', import.meta.url)));
const M = createMisery(data);
const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('data shape', () => {
  assert.equal(M.franchises.length, 126);
  assert.equal(M.seasons.length, 5613);
  assert.equal(data.localBatteries.length, 98);
  assert.equal(M.meta.firstYear, 1976);
});

test('exactly one champion per league-season (except MLB 1994, NHL 2004-05)', () => {
  const champs = new Map();
  for (const s of M.seasons) if (s[3] === 4) {
    const k = M.franchises[s[0]].league + s[1];
    champs.set(k, (champs.get(k) || 0) + 1);
  }
  for (const lg of M.leagues) for (let y = M.meta.firstYear; y <= M.meta.lastYear; y++) {
    const expected = (lg === 'MLB' && y === 1994) || (lg === 'NHL' && y === 2004) ? undefined : 1;
    assert.equal(champs.get(lg + y), expected, `${lg} ${y}`);
  }
});

test('season misery bounds', () => {
  close(seasonMisery(1, 4, DEFAULT_WEIGHTS), 0);
  close(seasonMisery(0, 0, DEFAULT_WEIGHTS), 1);
  close(seasonMisery(0, 3, PRESETS.heartbreak.weights), (9 - 3 + 2) / 11);
});

const SPAN_91 = { from: 1991, to: 2025 };

test('Baltimore–Washington battery, 1991–2025, balanced', () => {
  const r = M.batteryReport(['MLB-BAL', 'NBA-WAS', 'NHL-WSH', 'NFL-WAS'], SPAN_91);
  close(r.score, 89.54);
  assert.equal(r.totalCombos, 864000);
  assert.equal(r.miseryRank, 48142);
  close(r.percentile, 94.43);
  assert.equal(r.titles, 2);
  assert.deepEqual(r.teams.map(t => t.miseryRank), [5, 1, 22, 9]);
});

test('time frame changes the comparison set', () => {
  const r = M.batteryReport(['MLB-BAL', 'NBA-WAS', 'NHL-WSH', 'NFL-WAS'], { from: 2016, to: 2025 });
  close(r.score, 88.49);
  assert.equal(r.totalCombos, 921600);
});

test('a team that did not exist in the span makes the battery incomplete', () => {
  const r = M.batteryReport(['MLB-SEA', 'NBA-OKC', 'NHL-SEA', 'NFL-SEA'], { from: 1991, to: 2000 });
  assert.equal(r.complete, false);
  assert.equal(r.teams[2].available, false);
});

// 2026-10-04: local fan bases no longer adopt a team from another city when theirs is missing (seasons are blank),
// so the local-ranking golden values changed on purpose. Vancouver's six Grizzlies seasons now count on their own.
test('local rankings, 1991–2025: top and bottom', () => {
  const r = M.rankLocalBatteries(SPAN_91);
  const names = b => b.slots.map(s => s.seasons.at(-1).name);
  assert.equal(r.length, 90);  // fan bases missing a team in a league for the whole span are left out
  assert.deepEqual(names(r[0]), ['New York Mets', 'Brooklyn Nets', 'New York Islanders', 'New York Jets']);
  close(r[0].score, 90.41);
  assert.deepEqual(names(r.at(-1)), ['Boston Red Sox', 'Boston Celtics', 'Boston Bruins', 'New England Patriots']);
  close(r.at(-1).score, 75.86);
  assert.equal(r.at(-1).titles, 13);
});

test('league extremes, 1991–2025', () => {
  assert.equal(M.leagueTable('NFL', SPAN_91).filter(t => t.qualified)[0].name, 'Cleveland Browns');
  assert.equal(M.leagueTable('MLB', SPAN_91).at(-1).name, 'New York Yankees');
});

test('Baltimore–Washington battery, full 1976–2025 span, balanced', () => {
  const r = M.batteryReport(['MLB-BAL', 'NBA-WAS', 'NHL-WSH', 'NFL-WAS']);
  close(r.score, 87.19);
  assert.equal(r.totalCombos, 809100);
  assert.equal(r.miseryRank, 152208);
  close(r.percentile, 81.19);
  assert.equal(r.titles, 6);
  assert.deepEqual(r.teams.map(t => t.miseryRank), [9, 5, 16, 19]);
});

test('local rankings, full span: top and bottom', () => {
  const r = M.rankLocalBatteries();
  const names = b => b.slots.map(s => s.seasons.at(-1).name);
  assert.deepEqual(r[0].metros, ['New York']);
  assert.deepEqual(names(r[0]), ['New York Mets', 'Brooklyn Nets', 'New York Rangers', 'New York Jets']);
  close(r[0].score, 88.41);
  assert.deepEqual(names(r.at(-1)), ['Los Angeles Dodgers', 'Los Angeles Lakers', 'Anaheim Ducks', 'Los Angeles Rams']);
  close(r.at(-1).score, 76.16);
});

test('relocations before 1991 follow the franchise', () => {
  const name = (id, y) => M.seasons.find(s => M.franchises[s[0]].id === id && s[1] === y)[5];
  assert.equal(name('NFL-IND', 1983), 'Baltimore Colts');
  assert.equal(name('NFL-ARI', 1987), 'St. Louis Cardinals');
  assert.equal(name('NFL-OAK', 1981), 'Oakland Raiders');
  assert.equal(name('NHL-COL', 1985), 'Quebec Nordiques');
  assert.equal(name('NHL-ARI', 1985), 'Winnipeg Jets');
  assert.equal(name('NBA-SAC', 1980), 'Kansas City Kings');
  assert.equal(name('MLB-WAS', 1981), 'Montreal Expos');
});

test('rankScore places any score among all possible batteries', () => {
  const r = M.batteryReport(['MLB-BAL', 'NBA-WAS', 'NHL-WSH', 'NFL-WAS']);
  const s = M.rankScore(r.score);
  assert.equal(s.total, r.totalCombos);
  assert.equal(s.miseryRank, r.miseryRank);
  close(s.percentile, r.percentile);
  const top = M.rankLocalBatteries()[0];
  close(M.rankScore(top.score).percentile, 93.99);
});

test('a battery can leave out leagues: compared only against combinations of the same leagues', () => {
  const two = M.batteryReport(['MLB-BAL', 'NHL-WSH']);
  assert.equal(two.complete, true);
  assert.equal(two.totalCombos, 900);
  assert.equal(two.miseryRank, 304);
  close(two.score, 86.75);
  const three = M.batteryReport(['MLB-BAL', 'NBA-WAS', 'NFL-WAS']);
  assert.equal(three.totalCombos, 26970);
  assert.equal(three.miseryRank, 4991);
  assert.throws(() => M.batteryReport(['MLB-BAL', 'MLB-NYA']));
});

test('a one-league battery ranks exactly like the league table', () => {
  const r = M.batteryReport(['NHL-WSH']);
  const table = M.leagueTable('NHL').filter(t => t.qualified);
  assert.equal(r.totalCombos, table.length);
  assert.equal(r.miseryRank, table.findIndex(t => t.id === 'NHL-WSH') + 1);
});

test('local rankings over chosen leagues merge fan bases that become identical', () => {
  const r = M.rankLocalBatteries({ leagues: ['MLB', 'NHL'] });
  assert.equal(r.length, 55);
  assert.ok(r.every(b => b.slots.length === 2 && b.slots[0].league === 'MLB' && b.slots[1].league === 'NHL'));
  assert.deepEqual(r[0].slots.map(s => s.seasons.at(-1).name), ['Seattle Mariners', 'Vancouver Canucks']);
  assert.equal(M.rankLocalBatteries().length, 98);
});

test('local fan bases never adopt a team from another city', () => {
  const houston = M.rankLocalBatteries().find(b => b.metros.includes('Houston')).slots.find(s => s.league === 'NFL');
  assert.ok(houston.seasons.every(s => /Oilers|Texans/.test(s.name)));
  assert.equal(houston.seasonCount, 45);  // 1997–2001 blank
  const quebec = M.rankLocalBatteries().find(b => b.metros.includes('Quebec')).slots.find(s => s.league === 'NHL');
  assert.ok(quebec.seasons.every(s => s.name === 'Quebec Nordiques'));
  // no local NHL team in 1991–2000: Seattle is left out with the NHL selected, and back without it
  assert.ok(!M.rankLocalBatteries({ from: 1991, to: 2000 }).some(b => b.metros.includes('Seattle')));
  assert.ok(M.rankLocalBatteries({ from: 1991, to: 2000, leagues: ['MLB', 'NBA', 'NFL'] }).some(b => b.metros.includes('Seattle')));
  assert.ok(M.rankLocalBatteries({ from: 1991, to: 2000 }).every(b => b.slots.every(sl => sl.score != null)));
});

test('seasons with no team are neutral: they count as the league average that year', () => {
  // Seattle, last 20 years: two Sonics seasons and five Kraken seasons no longer carry a full team's weight
  const r = M.rankLocalBatteries({ from: 2006, to: 2025 });
  const seattle = r.find(b => b.metros.includes('Seattle'));
  const sonics = seattle.slots.find(s => s.league === 'NBA');
  assert.equal(sonics.seasonCount, 2);
  assert.equal(sonics.neutralSeasons, 18);
  assert.ok(r.indexOf(seattle) > r.length / 3);
  // a hand-picked expansion team fills the years before it existed with neutral seasons
  const rays = M.franchiseReport('MLB-TBA');
  assert.equal(rays.neutralSeasons, 1998 - 1976);
});

test('a fan base only takes on a same-city successor, never a rival', () => {
  // 2026-10-06: Colts fans don't become Redskins fans (and vice versa); Devils fans weren't Rangers fans before 1982
  const lines = data.lineages.map(l => l.filter(i => i >= 0).map(i => M.franchises[data.seasons[i][0]].id));
  assert.ok(!lines.some(l => l.includes('NFL-IND') && l.includes('NFL-WAS')));
  assert.ok(!lines.some(l => l.includes('NHL-NJD') && l.includes('NHL-NYR')));
  assert.ok(!lines.some(l => l.includes('MLB-WAS') && l.includes('MLB-BAL')));
  // a successor in the same city still carries on: Colts -> (no team) -> Ravens, Oilers -> (no team) -> Texans
  assert.ok(lines.some(l => l.includes('NFL-IND') && l.includes('NFL-BAL') && !l.includes('NFL-WAS')));
  assert.ok(lines.some(l => l.includes('NFL-TEN') && l.includes('NFL-HOU')));
});

test('a rooting history scores each team only for its own stretch, with neutral gaps', () => {
  const single = M.historyReport('NFL', [{ id: 'NFL-WAS', from: 1976 }]);
  close(single.score, M.franchiseReport('NFL-WAS').score, 1e-9);
  const colts = [{ id: 'NFL-IND', from: 1976 }, { id: null, from: 1984 }, { id: 'NFL-BAL', from: 1996 }];
  const h = M.historyReport('NFL', colts);
  assert.equal(h.name, 'Baltimore Colts → Baltimore Ravens');
  assert.equal(h.seasonCount, 8 + 30);
  assert.equal(h.neutralSeasons, 12);
  // identical to the Baltimore local fan base that follows the Colts, then the Ravens
  const local = M.rankLocalBatteries().flatMap(b => b.slots)
    .find(s => s.league === 'NFL' && s.seasons[0].name === 'Baltimore Colts' && s.seasons.at(-1).name === 'Baltimore Ravens');
  close(h.score, local.score, 1e-9);
  const r = M.batteryReport(['MLB-BAL', 'NBA-WAS', 'NHL-WSH', { league: 'NFL', segments: colts }]);
  assert.equal(r.complete, true);
  assert.equal(r.totalCombos, 809100);
  assert.throws(() => M.historyReport('NFL', [{ id: 'MLB-BAL', from: 1976 }]));
});

test('a city with no team in a sport follows the team that was nearest over the span, not just today', () => {
  // 2026-10-06: Salt Lake City's NFL line is the Broncos (371 mi every season), not the Raiders, who reached
  // Las Vegas (368 mi) only in 2020 after 44 seasons in Oakland and LA
  const slc = M.rankLocalBatteries().find(b => b.metros.includes('Salt Lake City')).slots.find(s => s.league === 'NFL');
  assert.ok(slc.seasons.every(s => s.name === 'Denver Broncos'));
  assert.equal(data.metros['Salt Lake City'][3], 'NFL-DEN');
});
