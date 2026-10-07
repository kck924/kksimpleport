# Misery Battery: build instructions

This kit adds an interactive "How miserable is your battery?" tool to this site. A **battery** is one team from each of MLB, NBA, NHL and NFL. Visitors pick a time frame and four teams. The tool scores how miserable those teams made their fans and ranks that score against every possible four-team combination. A second view ranks the 102 "local" batteries a fan could plausibly hold based on geography.

A finished, working version is in `reference/`. Your job is to **port that experience into this site's stack and design system**. Do not redesign the scoring.

## What's in the kit

| Path | What it is |
|---|---|
| `data/misery-data.json` | The only runtime data (~250 KB). 125 franchises, 4,149 team-seasons (1991–2025), 102 local batteries. |
| `src/misery.js` | Scoring engine. Framework-free ES module, no DOM, no dependencies. **Use it as-is.** |
| `tests/misery.test.js` | Golden-value tests for the engine. Run `node --test` from the kit root (Node 18+). |
| `reference/index.html`, `reference/app.js` | Working reference UI in plain DOM. Serve the kit root and open `/reference/` to try it. |
| `pipeline/` | Python scripts that rebuild `data/misery-data.json` from raw sources. See "Updating the data". |

## Step 1: Look before you build

1. Identify this repo's framework (Next.js, Astro, SvelteKit, Hugo, plain HTML, etc.), its routing, its styling approach and its existing design tokens/components.
2. Pick a route. Default is `/misery`, unless the site has a projects/tools section where it belongs better.
3. Decide where static data lives (`public/`, `static/`, `assets/`). Copy `data/misery-data.json` there unchanged.
4. Copy `src/misery.js` into the site's source (e.g. `src/lib/misery.js`). Keep the file intact so the tests still apply. If the site uses TypeScript, add a `misery.d.ts` next to it rather than converting it.
5. Copy `tests/misery.test.js` next to it, fix the import paths, and wire it into the site's test runner, or keep it runnable with `node --test`.

If anything below conflicts with this repo's own conventions (lint rules, component patterns, CSS approach), follow the repo.

## Step 2: Build the page

Load the JSON once (fetch at runtime, or import at build time if the framework supports it), then call `createMisery(data)`. Everything else is UI over the engine's return values. The page is **fully client-side**; there's no backend.

### Shared controls (apply to both views)

- **Time frame.** "From" and "To" year selects, 1991–2025. If From > To, move the other end to match. Quick chips: All 35 years, Last 20, Last 10, 1990s, 2000s, 2010s, 2020s. Years mean the season's starting year (2025 = NBA/NHL 2025-26).
- **Scoring presets.** Chips for `PRESETS` (Balanced, Just losing, Rings only, Heartbreak). Balanced is the default.
- **Custom weights.** Collapsed "Adjust scoring weights" disclosure with one slider per `WEIGHT_FIELDS` entry. Moving a slider deselects the preset chip.
- **Legend** for season squares: Missed playoffs, Playoffs, Final four, Lost final, Title.

Pass `{ from, to, weights }` as the options object to every engine call.

### View 1: "Your four teams" (default)

- **Four pickers**, one per league (`leagues` order: MLB, NBA, NHL, NFL). List every franchise in that league alphabetically by current name. Show former identities in the label, e.g. "Washington Nationals (was Montreal Expos)", and "through 2023" for defunct ones. Franchises with no seasons in the span (`franchisesIn(league, opts)` doesn't include them) stay in the list but are **disabled** with "(no seasons in span)".
- **Start from a city** select fills all four pickers from `metroDefaults()` (metro name → four franchise ids, nearest current team per league).
- **Default selection:** `MLB-BAL`, `NBA-WAS`, `NHL-WSH`, `NFL-WAS` (Orioles, Wizards, Capitals, Commanders).
- **Result block** from `batteryReport(ids, opts)`:
  - Big score (`score`, 1 decimal) labelled "misery, {from}–{to}".
  - Tier word by `percentile`: ≥95 Cursed, ≥80 Miserable, ≥60 Rough, ≥40 Middling, ≥20 Comfortable, otherwise Spoiled.
  - Sentence: "More miserable than {percentile}% of the {totalCombos} possible four-team batteries over {span}. That's {miseryRank} most miserable. Together: {titles} titles, {finals} trips to the final, {playoffs} playoff seasons out of {seasonCount}."
  - Histogram of all possible batteries from `distribution(opts)`: `hist` (50 bins between `min` and `max`, `binWidth` wide), with a marker at the visitor's score. Bins above the marker use a "more miserable" tint. Below it, name the luckiest and most miserable possible batteries (`luckiest`, `worst`: one entry per league, each with `name` and `score`; the battery score is their mean).
  - If `complete` is false, a team didn't play in the span. Replace the result with a message naming the team and suggesting a different team or a wider span. Still render the other cards.
- **Team cards** (one per `teams[i]` from the report): league, current name, eras within the span (`franchises[i].eras`), team misery score, rank pill ("{miseryRank} most miserable of {leagueSize}", or "Unranked: {seasonCount} of {spanSeasons} seasons" when `qualified` is false), counts (titles, finals, final fours, playoff seasons / seasons), a **season strip** (one square per year in the span, colored by stage, dashed when there was no season, tooltip "2008 Baltimore Orioles 68-93, missed the playoffs"), and best/worst season lines.

### View 2: "Local rankings"

- From `rankLocalBatteries(opts)`: a ranked list, most miserable first, showing 25 rows with a "Show all" button.
- Each row: rank, the current team names, metros, totals (titles, finals, playoff seasons), score, and four season strips. A team followed through a relocation or fallback shows "earlier X 1991–1995" (build these segments from the slot's `seasons` names within the span).
- Controls: text filter (matches metro and any team name in the lineage), "Only fan bases with a local team in all four leagues today" (`allLocalToday`), "Luckiest first".
- Each row has **"Open as my four"**, which loads the franchises the slot was following at the end of the span into View 1 and switches tabs.
- Keep a short explainer: 60-mile radius from each team city, nearest-team fallback, and following whichever team was local in seasons before a team arrived or after it left.

### Shareable URLs

State lives in the query string so links reproduce a result:

```
/misery?from=1991&to=2025&mlb=bal&nba=was&nhl=wsh&nfl=was&preset=heartbreak#rankings
```

- Team params are the part of the franchise id after the league prefix, lower-cased (`MLB-BAL` → `mlb=bal`).
- `preset` is omitted for Balanced. With custom weights, send `w=` followed by the six weights joined by `_` in `WEIGHT_FIELDS` order, e.g. `w=1_1_1_1_3_0`.
- `#rankings` opens View 2.
- Validate everything on read and silently fall back to defaults. Update with `history.replaceState`, not `pushState`.
- Add a "Copy link" button. If the site has an OG image pipeline, a per-battery share image is a nice extra but not required.

### Methodology section

Below the tool, carry over the "How it's scored" notes from `reference/index.html`, plus a data-sources credit line: Retrosheet, nflverse, FiveThirtyEight, Basketball-Reference, Hockey-Reference.

## Scoring (what `misery.js` does)

Stage codes per team-season: 0 missed playoffs, 1 made playoffs, 2 final four (LCS / conference finals / conference championship game), 3 lost final, 4 won title. `pct` is the team's regular-season standing within its league that year (0 = worst record, 1 = best), so leagues with different schedule lengths compare fairly.

```
joy(season)    = reg*pct + po*[stage≥1] + f4*[stage≥2] + f2*[stage≥3] + ch*[stage=4] − hb*[stage=3]
misery(season) = (max − joy) / (max − min)     max = reg+po+f4+f2+ch, min = −hb    → 0..1
team score     = 100 × mean misery over the team's seasons in [from, to]
battery score  = mean of the four team scores
```

- **Qualification.** A team must have played at least half the span's seasons to get a league rank or to count in the all-batteries distribution (`minShare`, default 0.5). This keeps 5-season expansion teams from owning the extremes. Unqualified teams still get a score.
- **Percentile.** `percentile` is the share of all possible batteries (product of qualified teams per league, ~650k–950k) with a strictly lower score. `miseryRank` is 1 + the number with a strictly higher score. The engine uses pairwise sums and binary search, and caches per options, so a change costs roughly 20–40 ms.
- **Gaps.** The NHL 2004-05 lockout season doesn't exist and isn't counted. MLB 1994 (strike, no postseason) counts as a missed-playoffs season for everyone.

## Data format (`misery-data.json`)

```
meta:        { firstYear, lastYear, seasonFields, stages, radiusMiles }
leagues:     ["MLB","NBA","NHL","NFL"]
franchises:  [{ id:"MLB-WAS", league, name (current), city, first, last, eras:[{name, from, to}] }]
seasons:     [[franchiseIndex, year, pct, stage, record, nameThatSeason], …]
lineages:    [[seasonIndex | -1 per year 1991..2025], …]   // what one local fan followed each season
localBatteries: [{ lineages:[4 lineage indices], metros:[…], allLocalToday }]
metros:      { "Baltimore": ["MLB-BAL","NBA-WAS","NHL-WSH","NFL-BAL"], … }
```

Franchise ids follow the franchise, not the city: `MLB-WAS` includes the Expos years, `NBA-OKC` includes Seattle, `NHL-ARI` is the Jets/Coyotes franchise that ended in 2024, and `NHL-UTA` is separate. The 1991–2002 Charlotte Hornets belong to `NBA-CHA`, per the NBA's official records.

## Design

The reference uses its own tokens (condensed display face, cool grey paper, a bruise-red accent, a blue-to-gold stage scale). **Use the site's design system instead** wherever it has one. Keep these parts, which carry meaning:

- The stage color scale must be ordered (light → dark for missed → lost final) with **title in a distinct warm color**. Check that it reads in both light and dark themes.
- Season strips: one cell per season, equal width, no gaps that look like missing data. Missing seasons get a dashed outline.
- Numbers use tabular figures.
- Mobile: at ~390px, pickers stack in 1–2 columns, nothing scrolls horizontally, and strips shrink rather than overflow.

Accessibility requirements:
- Every select and slider has a label.
- Tabs use `role="tab"` / `aria-selected`.
- The result block is `aria-live="polite"`.
- The histogram SVG has an `aria-label` stating the visitor's score.
- Strip squares have `title` tooltips. If the site has a tooltip component, use it and make the squares keyboard-focusable.

## Done when

- [ ] `node --test` passes (8 tests) against the copied engine and data.
- [ ] Default load shows Orioles/Wizards/Capitals/Commanders, **87.0**, "Miserable", 93.4%, rank 56,860 of 864,000.
- [ ] Choosing 2016–2025 changes that to **85.9** out of 921,600.
- [ ] Choosing 1991–2000 disables Seattle Kraken in the NHL picker. A pre-selected Kraken shows the "didn't play" message.
- [ ] Local rankings, full span, Balanced: #1 Mets/Nets/Islanders/Jets **87.7**; last is Red Sox/Celtics/Bruins/Patriots **71.6**.
- [ ] A URL with params reproduces the same result in a fresh tab.
- [ ] No horizontal scroll at 390px; light and dark themes both legible; keyboard can operate every control.
- [ ] Lighthouse accessibility ≥ 95 on the page.

## Updating the data (once a year, after the NFL season)

The site copy lives in `public/misery-battery/` (data, engine, logos); this folder holds the pipeline. Data covers 1976–2025.

```
cd pipeline
./fetch_raw.sh                      # MLB (Retrosheet) + NFL (nflverse, FiveThirtyEight) raw files into raw/
# NHL: all franchise seasons from the NHL records API (records.nhl.com/site/api/franchise and .../franchise-season-results),
#   saved as fsr_<id>.json, then: python3 sources/nhl_to_csv.py data/nhl 1976 <last year>
# NBA: save basketball-reference.com/teams/<CODE>/ for each code in data/nba (4 s apart; 20 requests/min limit),
#   then in that folder: python3 sources/nba_to_csv.py <pipeline>/data/nba 1976 <last year>
# bump Y1 in build.py (combos.py and export.py read it)
python3 build.py && python3 combos.py && python3 export.py   # writes ../data/misery-data.json
cp ../data/misery-data.json ../../public/misery-battery/
```

Then rebuild the share preview pages (one per local fan base, with its own link-preview image), with the site running locally:

```
npm run dev                                                      # site root
node misery-battery/scripts/build-share-pages.cjs http://localhost:5173   # needs Playwright + Chrome
```

That rewrites `public/misery-battery/f/<key>/`. Keys include a short code from each fan base's teams, so links from a previous build may point to a fan base that no longer exists; those land on the city's list instead.

Requirements: Python 3.10+ and pandas.

Then run these checks before shipping:
- Exactly one champion per league-season (the test checks this).
- For NBA and MLB, league-wide wins = losses each season.
- For the NHL, W = L + OT losses after 2005.
- Every new team city has coordinates in `CITY` in `build.py` (the script asserts this).

Update the golden values in the tests on purpose, and note it in the commit.

## Known limitations

- The data starts in 1976 (`Y0` in build.py). Before that, playoff formats differ enough (no LCS before 1969, separate AFL/NFL before 1970) that the five stages stop meaning the same thing.
- NBA/NHL records came from franchise tables pulled via a summarizing fetch. Records were validated by league-wide W/L balance (three bad 1991-92 rows were found and fixed), and champions and finalists are verified. Treat a single team's W-L as very likely, not guaranteed, correct.
- A hand-picked team counts only the seasons that franchise played (no fallback team before an expansion team existed). The local rankings do use fallbacks. The UI explains both.
- The "local" geography is a 60-mile radius from stadium/arena coordinates. It doesn't reflect actual fan surveys.
