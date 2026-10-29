// The resume curator's scoring engine. It decides what goes on each resume, and it is plain arithmetic: no AI runs
// in this file. The same code runs in the private tool that builds each resume, and it's published here so anyone
// can check the method described at kckdata.com/resume/.
//
//   library      every role, accomplishment and skill, each accomplishment tagged with the skills it shows
//   requirements what the job asks for, each with a kind (required / responsibility / preferred) and a weight
//   select()     picks accomplishments one at a time, each time taking the one that adds the most uncovered weight

export const VERSION = '1.4';

// ---------- text ----------
const STOP = new Set(`a about above across after again against all also am an and any are as at be because been before being
below between both but by can could did do does doing down during each either etc ever every few for from further had has have
having he her here hers him his how i if in into is it its itself just least less like may me might more most must my no nor
not of off on once one only or other our ours out over own per plus same she should so some such than that the their them then
there these they this those through to too under until up upon us very was we were what when where which while who whom why will
with within without would you your yours able ability across experience experiences years year strong excellent proven demonstrated
including include includes work working works job role team teams new well using use used help ideal candidate looking based
related relevant similar equivalent preferred required requirements qualifications responsibilities bonus nice skill skills
knowledge understanding familiarity comfort comfortable ensure across make makes making get gets want need needs`.split(/\s+/));

// a light stemmer: enough to match "forecasting" with "forecast" and "dashboards" with "dashboard"
export function stem(w) {
  if (w.length <= 4) return w;
  for (const [suf, rep] of [['ational', 'ate'], ['ization', 'ize'], ['ations', 'ate'], ['ation', 'ate'], ['ments', ''], ['ment', ''],
    ['ings', ''], ['ing', ''], ['ies', 'y'], ['ied', 'y'], ['ers', ''], ['er', ''], ['ed', ''], ['es', ''], ['ly', ''], ['s', '']])
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length) + rep;
  return w;
}
export const norm = s => ` ${String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9+#.%$/]+/g, ' ').replace(/\.(?=\s|$)/g, '')} `;
export const terms = s => [...new Set(norm(s).trim().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w) && !/^\d/.test(w)).map(stem))];

// Every skill a piece of text mentions, compared word by word after stemming (so "managing people" finds "managed").
// A skill has two kinds of other names: `aliases` are true synonyms that can be printed on the resume ("A/B testing"
// for experimentation), and `related` terms only count toward a match and are never printed ("Tableau" is evidence
// of dashboards, but it would be false to list Tableau for someone who uses Power BI).
const stems = s => ` ${norm(s).trim().split(/\s+/).map(stem).join(' ')} `;
export function findSkills(text, skills) {
  const t = stems(text), out = [];
  for (const s of skills) {
    const names = [s.name, ...(s.aliases || []), ...(s.related || [])].map(a => stems(a).trim()).filter(Boolean);
    if (names.some(a => t.includes(` ${a} `))) out.push(s.id);
  }
  return out;
}

// the posting's own wording for each skill it names, when that wording is a printable name for the skill. Recruiters
// search candidate databases with the posting's exact terms, and older systems match them literally, so the skills
// line uses "A/B testing" when that's what the posting says, but only ever a name the library lists as true.
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function postingTerms(text, skills) {
  const out = {};
  for (const s of skills) for (const a of [s.name, ...(s.aliases || [])]) {
    const m = String(text).match(new RegExp(`(?<![\\w/])${escRe(a)}(?![\\w/])`, 'i'));
    if (m) { out[s.id] = m[0]; break; }
  }
  return out;
}

// ---------- reading a job description without AI ----------
const YOU = "you(?:['’]?ll| will)?";
const HEAD = [
  ['skip', /\b(benefits|perks|what we offer|we offer|compensation|salary|pay range|equal opportunity|about us|about the company|our values)\b/i],
  ['preferred', new RegExp(`\\b(preferred|nice to have|nice-to-have|bonus|plus if|pluses|desired|ideally|ways to stand out|stand out from the crowd|extra credit)\\b`, 'i')],
  ['required', new RegExp(`\\b(requirements?|qualifications?|must have|must-have|what ${YOU} (?:need|bring)|what we need to see|what we(?:['’]re| are) looking for|${YOU} (?:have|bring)|who you are|about you|minimum|basic)\\b`, 'i')],
  ['responsibility', new RegExp(`\\b(responsibilit|what ${YOU} (?:be )?do(?:ing)?|the role|day to day|in this role|${YOU} will|your impact|what the job involves)\\b`, 'i')]];
// hiring boilerplate that sits under the last heading of many postings
const BOILER = /\b(we offer|benefits|401\(?k|paid time off|equal opportunity|equal employment|salary range|pay range|base salary|eligible for (equity|bonus)|applications? (for this job|will be accepted)|this posting is|recruiting process|widely considered|reasonable accommodation|e-verify|visa sponsorship|background check)/i;
// logistics that checks() reports instead: where the job is, and what the employer says about AI in applications
const LOGISTICS = /\b(hybrid|on-?site|in-?office|remote)\b.*\b(role|position|days?|week|schedule)\b|\b(do not|don['’]?t|please refrain|without)\b.*\b(AI|ChatGPT|LLMs?|generative)\b/i;
export const KIND_WEIGHT = { required: 3, responsibility: 2, preferred: 1, other: 1.5 };

export function parseJD(text, lib) {
  let section = 'other'; const reqs = [];
  for (const raw of String(text).split(/\n+/)) {
    const bullet = /^\s*([•*·\-–—▪●○◦]|\d+[.)])\s*/.test(raw), line = raw.replace(/^[\s•*·\-–—▪●○◦]+|^\s*\d+[.)]\s+/, '').trim();
    if (!line) continue;
    // a short line that names a section switches the section; it isn't a requirement itself
    if (line.length < 60 && !/[.;]$/.test(line)) { const h = HEAD.find(([, re]) => re.test(line)); if (h) { section = h[0]; continue; } }
    if (section === 'skip' || BOILER.test(line) || LOGISTICS.test(line)) continue;
    // before any section heading, only bullets and full sentences count (that skips the job title and company lines)
    if (section === 'other' && !bullet && line.length < 60) continue;
    if (line.length < 18 || line.length > 400) continue;
    const skills = findSkills(line, lib.skills), keywords = terms(line), said = postingTerms(line, lib.skills);
    if (!skills.length && keywords.length < 3) continue;
    const kind = section === 'other' && /\b(preferred|a plus|bonus|nice to have)\b/i.test(line) ? 'preferred' : section;
    reqs.push({ id: 'r' + (reqs.length + 1), text: line.length > 180 ? line.slice(0, 177) + '…' : line, kind,
      weight: KIND_WEIGHT[kind] + (skills.length ? .5 : 0), skills, keywords, terms: said });
  }
  return reqs.sort((a, b) => b.weight - a.weight).slice(0, 25).map((r, i) => ({ ...r, id: 'r' + (i + 1) }));
}

// ---------- screening checks ----------
// Hard filters usually arrive as application questions (years, degree, work authorization, location), and recruiters
// and AI screeners check them before reading anything else. These flag them before applying; they never change picks.
const DEGREE = [['phd', /\b(ph\.?d|doctorate|doctoral)\b/i], ['masters', /\b(master'?s|m\.?s\.?|m\.?a\.?|mba|graduate degree)\b/i], ['bachelors', /\b(bachelor'?s|b\.?s\.?|b\.?a\.?|undergraduate degree|4-year degree|college degree)\b/i]];
const RANK = { bachelors: 1, masters: 2, phd: 3 };
const degreeOf = s => DEGREE.find(([, re]) => re.test(s))?.[0];
export function checks(text, lib, now = new Date()) {
  const out = [], t = String(text);
  // years: the largest "N+ years" the posting asks for, against the span of the experience roles
  const years = [...t.matchAll(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)(?:['’]?)?(?:\s+of)?/gi)].map(m => +m[1]).filter(n => n > 0 && n < 40);
  const exp = lib.roles.filter(r => (r.section || 'experience') === 'experience');
  const start = Math.min(...exp.map(r => +new Date((r.start || '') + '-01')));
  const have = isFinite(start) ? Math.floor((now - start) / 3.156e10) : null;
  if (years.length) { const ask = Math.max(...years);
    out.push({ kind: 'years', status: have == null ? 'info' : have >= ask ? 'ok' : 'warn', detail: have == null ? `Asks for ${ask}+ years.` : `Asks for ${ask}+ years; I have ${have}.` }); }
  // degree: the highest degree the posting mentions, against the education on file
  const ask = DEGREE.map(([k]) => k).find(k => DEGREE.find(d => d[0] === k)[1].test(t));
  if (ask) { const best = Math.max(0, ...(lib.education || []).map(e => RANK[degreeOf(e.degree)] || 0)), NAME = { bachelors: "a bachelor's", masters: "a master's", phd: 'a PhD' };
    const line = t.split(/\n|(?<=\.)\s/).find(l => DEGREE.find(d => d[0] === ask)[1].test(l)) || '';
    const soft = /equivalent|preferred|a plus|bonus|ideally|nice to have/i.test(line);
    out.push({ kind: 'degree', status: best >= RANK[ask] ? 'ok' : soft ? 'info' : 'warn',
      detail: `Mentions ${NAME[ask]}${soft ? ' (as preferred or with an equivalent)' : ''}; mine: ${best ? NAME[Object.keys(RANK).find(k => RANK[k] === best)] : 'none listed'}.` }); }
  // field of study: postings often name one ("statistics, computer science or a related quantitative field"), which a
  // degree-level match alone would miss. Compare the fields the posting names against the education on file.
  const FIELD = /\b(quantitative|stem|statistics|mathematics|math|computer science|data science|economics|engineering|physics|operations research|finance|business|marketing|analytics)\b/gi;
  const fl = t.split(/\n|(?<=\.)\s/).find(l => DEGREE.some(([, re]) => re.test(l)) && FIELD.test(l)) || '';
  const fields = [...new Set((fl.match(FIELD) || []).map(f => f.toLowerCase()))];
  if (fields.length) { const have = (lib.education || []).map(e => e.degree).join('; '), hit = fields.some(f => have.toLowerCase().includes(f));
    const soft = /equivalent|preferred|a plus|bonus|ideally|nice to have|or related experience|or equivalent experience/i.test(fl);
    if (!hit) out.push({ kind: 'field', status: soft ? 'info' : 'warn', detail: `Names a field of study (${fields.join(', ')})${soft ? ' with an equivalent or as preferred' : ''}; mine: ${have || 'none listed'}, so my experience has to cover this one.` }); }
  if (/\b(security clearance|clearance required|ts\/sci|top secret|secret clearance)\b/i.test(t)) out.push({ kind: 'clearance', status: 'warn', detail: 'Asks for a security clearance.' });
  if (/\b(sponsorship|authorized to work|work authorization|right to work)\b/i.test(t)) out.push({ kind: 'authorization', status: 'info', detail: 'Asks about work authorization or sponsorship.' });
  const where = t.match(/\b(on-?site|in-?office|hybrid|relocat\w*|\d (?:days|times) (?:a|per) week in (?:the )?office)\b/i);
  if (where) out.push({ kind: 'location', status: 'info', detail: `Mentions "${where[0]}"; I check it against where I'd work.` });
  // some employers ask applicants not to use AI on the application; the receipt approach must not go to them unread
  const ai = t.match(/[^.\n]*\b(?:AI|artificial intelligence|ChatGPT|LLMs?|generative)\b[^.\n]*\b(?:application|resume|cover letter|apply|applying|candidates?)\b[^.\n]*/i);
  if (ai && /\b(not|don['’]?t|without|prohibit|refrain|avoid|disclose|own words)\b/i.test(ai[0]))
    out.push({ kind: 'ai-policy', status: 'warn', detail: `The posting says something about AI in applications: "${ai[0].trim().slice(0, 200)}"` });
  return out;
}

// ---------- scoring ----------
const yearOf = d => (d ? +String(d).slice(0, 4) : new Date().getFullYear());

// how well one accomplishment answers one requirement, 0 to 1: a shared skill counts most, shared words a little
export function match(item, req) {
  const skills = req.skills.filter(s => item.skills.includes(s));
  const keywords = req.keywords.filter(k => item._terms.has(k));
  return { m: Math.min(1, skills.length * .6 + keywords.length * .15), skills, keywords };
}

// what an accomplishment is worth before looking at the job: recent work counts more, measured results a little more
export function baseFactor(item, role, now = new Date().getFullYear()) {
  const age = Math.max(0, now - yearOf(role.end));
  return Math.max(.5, 1 - .08 * age) * (item.metric ? 1.1 : 1) * (item.priority ?? 1);
}

export const DEFAULTS = { budget: 14, perRole: [5, 5, 3, 3, 1], projects: 3, decay: .5, floor: .05 };

export function select(lib, reqs, opts = {}) {
  const o = { ...DEFAULTS, ...opts }, pins = new Set(o.pins || []), drops = new Set(o.drops || []);
  const roles = Object.fromEntries(lib.roles.map(r => [r.id, r]));
  const exp = lib.roles.filter(r => (r.section || 'experience') === 'experience' && !r.hidden)
    .sort((a, b) => yearOf(b.end) - yearOf(a.end) || String(b.start).localeCompare(String(a.start)));
  const cap = r => (r.section === 'projects' ? o.projects : o.perRole[Math.min(exp.indexOf(r), o.perRole.length - 1)]);
  const items = lib.items.filter(it => roles[it.role] && !roles[it.role].hidden && !drops.has(it.id)).map(it => {
    const _terms = new Set([...terms([it.text, it.short, ...(it.tags || [])].join(' ')), ...it.skills.map(stem)]);
    const x = { ...it, _terms }; x.base = baseFactor(x, roles[it.role]);
    x.matches = reqs.map(r => ({ req: r.id, ...match(x, r) })).filter(mm => mm.m > 0);
    x.score = x.matches.reduce((s, mm) => s + reqs.find(r => r.id === mm.req).weight * mm.m, 0) * x.base;
    return x;
  });
  const covered = Object.fromEntries(reqs.map(r => [r.id, 0])), W = Object.fromEntries(reqs.map(r => [r.id, r.weight]));
  // the marginal gain: requirement weight times match, halved for every pick that already covers that requirement,
  // so a second SQL bullet is worth less than a first stakeholder bullet
  const gain = x => x.base * (o.floor + x.matches.reduce((s, mm) => s + W[mm.req] * mm.m * o.decay ** covered[mm.req], 0));
  const picks = [], per = {}, why = {};
  const take = (x, reason) => { picks.push({ ...x, gain: gain(x), reason }); per[x.role] = (per[x.role] || 0) + 1; x.matches.forEach(mm => covered[mm.req]++); };
  const open = x => !picks.some(p => p.id === x.id) && (per[x.role] || 0) < cap(roles[x.role]);
  items.filter(x => pins.has(x.id)).forEach(x => take(x, 'pinned'));
  // every experience role keeps at least one line, so the timeline has no holes
  for (const r of exp) if (!per[r.id]) { const best = items.filter(x => x.role === r.id && open(x)).sort((a, b) => gain(b) - gain(a))[0]; if (best) take(best, 'keeps the timeline whole'); }
  while (picks.filter(p => roles[p.role].section !== 'projects').length < o.budget) {
    const c = items.filter(x => roles[x.role].section !== 'projects' && open(x)).sort((a, b) => gain(b) - gain(a))[0];
    if (!c || gain(c) <= o.floor * c.base * 1.01) break; take(c, 'highest added coverage');
  }
  for (const r of lib.roles.filter(r => r.section === 'projects' && !r.hidden))
    while ((per[r.id] || 0) < cap(r)) { const c = items.filter(x => x.role === r.id && open(x)).sort((a, b) => gain(b) - gain(a))[0]; if (!c || !c.matches.length) break; take(c, 'highest added coverage'); }
  for (const x of items) if (!picks.some(p => p.id === x.id)) why[x.id] = (per[x.role] || 0) >= cap(roles[x.role]) ? 'role already full' : !x.matches.length ? 'matches nothing in this job' : 'others covered the same ground better';
  const picked = new Set(picks.map(p => p.id));
  const coverage = reqs.map(r => {
    const by = picks.map(p => ({ id: p.id, m: (p.matches.find(mm => mm.req === r.id) || { m: 0 }).m })).filter(b => b.m >= .3).sort((a, b) => b.m - a.m);
    return { req: r.id, by: by.map(b => b.id), best: by[0]?.m || 0, gap: !by.length };
  });
  const fit = reqs.length ? coverage.reduce((s, c) => s + W[c.req] * Math.min(1, c.best), 0) / reqs.reduce((s, r) => s + r.weight, 0) : 0;
  // skills: the ones this job names first, by how much weight asks for them, then the rest of the library.
  // A skill is only printed when at least one line in the library shows it (or it's marked `vouched`, for basics like
  // Excel that never make a bullet): naming a skill nothing on the page backs up is the keyword stuffing screeners flag.
  const shown = new Set(lib.items.flatMap(i => i.skills));
  const ask = Object.fromEntries(lib.skills.map(s => [s.id, reqs.reduce((t, r) => t + (r.skills.includes(s.id) ? r.weight : 0), 0)]));
  const said = Object.assign({}, ...reqs.map(r => r.terms || {}));
  const skills = lib.skills.filter(s => !s.hidden && (shown.has(s.id) || s.vouched)).map((s, i) => ({ id: s.id, name: s.name, as: said[s.id] ? said[s.id][0].toUpperCase() + said[s.id].slice(1) : s.name, group: s.group, asked: ask[s.id], i }))
    .sort((a, b) => b.asked - a.asked || a.i - b.i);
  const strip = ({ _terms, ...x }) => x;
  return { picks: picks.map(strip), left: items.filter(x => !picked.has(x.id)).map(x => ({ ...strip(x), why: why[x.id] })).sort((a, b) => b.score - a.score),
    coverage, fit, skills, opts: o };
}

// ---------- guarding AI rewrites ----------
const NUM = /\$?\d[\d,.]*\s?(%|percent|x|k|m|b|bn|million|billion|thousand)?/gi;
const nums = s => (String(s).match(NUM) || []).map(n => n.toLowerCase().replace(/[\s,]/g, '').replace(/\.$/, ''));

// a rewrite may change wording, never facts: every number must come from the original, nothing on the never-list
// may appear, and it may not grow by more than a quarter
// words recruiters single out as signs of unedited AI text; flagged only when a rewrite introduces them
// Writing that reads as machine-made. Words: the stock vocabulary of generated resumes and corporate filler.
// Patterns: the habits behind it (Strunk & White's "omit needless words", plus the tics models overuse): the
// "not just X, but Y" turn, a trailing "-ing" clause that claims an effect ("..., driving growth"), em dashes, stacked
// adjectives, and throat-clearing like "in order to" or "a wide range of". A flag is a prompt to reread, not a ban.
export const AI_TELLS = ['leverage', 'leveraged', 'leveraging', 'spearheaded', 'spearheading', 'synergy', 'synergies', 'realm', 'pivotal', 'showcasing', 'showcased',
  'intricate', 'delve', 'delved', 'robust', 'seamless', 'seamlessly', 'cutting-edge', 'dynamic', 'passionate', 'results-driven', 'utilize', 'utilized', 'fostering', 'fostered',
  'tapestry', 'meticulous', 'meticulously', 'transformative', 'innovative', 'impactful', 'holistic', 'empower', 'empowered', 'empowering', 'elevate', 'elevated', 'harness',
  'harnessed', 'unlock', 'unlocked', 'unlocking', 'streamline', 'streamlined', 'navigate', 'navigated', 'landscape', 'journey', 'world-class', 'best-in-class', 'game-changing',
  'groundbreaking', 'visionary', 'thought leadership', 'track record', 'proven', 'strategic initiatives', 'actionable insights', 'data-driven decision', 'drive impact',
  'drove impact', 'key stakeholders', 'cross-functional synergy', 'step-change', 'paradigm', 'north star', 'deep dive', 'best practices', 'value-add', 'mission-critical',
  // from Wikipedia's "Signs of AI writing" (via the humanizer skill): words models use far more often than people do
  'additionally', 'align with', 'aligned with', 'aligning with', 'bolstered', 'crucial', 'enduring', 'enhance', 'enhanced', 'enhancing', 'garner', 'garnered', 'interplay',
  'intricacies', 'testament', 'underscore', 'underscored', 'underscores', 'underscoring', 'valuable', 'vibrant', 'quietly', 'profound', 'renowned', 'exemplifies', 'commitment to',
  'highlighting', 'emphasizing', 'cultivating', 'cultivated', 'encompassing', 'invaluable', 'instrumental'];
export const AI_PATTERNS = [
  [/\bnot (just|only|simply|merely)\b[^.;]*\b(but|—)/i, '"not just X but Y"'],
  [/,\s*(driving|enabling|ensuring|fostering|resulting in|leading to|delivering|creating|empowering|unlocking|positioning)\b/i, 'trailing "-ing" effect clause'],
  [/—|–(?!\s*\d)/, 'dash'],
  [/\bin order to\b|\ba (wide|broad|diverse) (range|array|variety) of\b|\bvarious\b|\bnumerous\b|\bplethora\b/i, 'needless words'],
  [/\b(successfully|effectively|efficiently|strategically|proactively|seamlessly|significantly)\b/i, 'empty adverb'],
  [/\b(was|were|been|being) (\w+ed|built|led|made|given|run|seen|taken|chosen)\b(?! (?:to|as)\b)/i, 'passive voice'],
  [/\b(\w+), (\w+),? and (\w+) (insights|solutions|outcomes|results|growth)\b/i, 'triplet of abstractions'],
  [/\b(rather than|instead of)\b/i, '"X rather than Y" contrast'],
  [/,\s*(highlighting|underscoring|emphasizing|reflecting|symbolizing|contributing to|cultivating|showcasing|encompassing|demonstrating)\b/i, 'shallow "-ing" rider'],
  [/\b(serves?|served|serving|stands?|stood|functions?|functioned|acts?|acted) as (a|an|the)\b/i, '"serves as" for "is"'],
  [/\b(played|plays|playing) a (key|pivotal|crucial|critical|vital|central) role\b|\bsetting the stage\b|\bpaving the way\b|\blasting impact\b|\bmarking a\b/i, 'inflated significance'],
  [/\b(associated with|in connection with|linked to|tied to)\b/i, 'vague association'],
  [/\b(at its core|the real question|what really matters|fundamentally|in reality)\b/i, 'saying that sounds deep'],
];
// every tell in a piece of text: [{tell, kind}]
export function tells(text) {
  const n = ` ${norm(text)} `, out = [];
  for (const w of AI_TELLS) if (n.includes(` ${norm(w).trim()} `)) out.push({ tell: w, kind: 'word' });
  for (const [re, name] of AI_PATTERNS) { const m = text.match(re); if (m) out.push({ tell: name, kind: 'pattern', at: m[0] }); }
  return out;
}
export function guard(original, rewrite, never = []) {
  const flags = [], have = new Set(nums(original));
  const o = norm(original);
  const before = new Set(tells(original).map(t => t.tell));
  for (const t of tells(rewrite)) if (!before.has(t.tell)) flags.push(t.kind === 'word' ? `AI-sounding word: ${t.tell}` : `AI-sounding pattern: ${t.tell}`);
  for (const n of nums(rewrite)) if (!have.has(n)) flags.push(`new number: ${n}`);
  for (const n of nums(original)) if (!nums(rewrite).includes(n)) flags.push(`dropped number: ${n}`);
  for (const w of never) if (w && norm(rewrite).includes(norm(w).trim())) flags.push(`never-list: ${w}`);
  if (rewrite.length > original.length * 1.25 + 10) flags.push('grew by more than a quarter');
  return flags;
}

// a word-level diff, for showing exactly what a rewrite changed
export function diff(a, b) {
  const A = String(a).split(/(\s+)/), B = String(b).split(/(\s+)/), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  const push = (t, s) => { const last = out[out.length - 1]; if (last && last.t === t) last.s += s; else out.push({ t, s }); };
  while (i < n && j < m) { if (A[i] === B[j]) { push('=', A[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]); else push('+', B[j++]); }
  while (i < n) push('-', A[i++]); while (j < m) push('+', B[j++]);
  return out;
}

// ---------- the receipt: what gets published for each resume ----------
export function receipt({ id, lib, job, reqs, result, finals, model, parsedBy, redact, flags = [] }) {
  const reqText = Object.fromEntries(reqs.map(r => [r.id, r.text]));
  return {
    id, version: VERSION, created: new Date().toLocaleDateString('en-CA'),
    job: { title: job.title, company: redact ? (job.alias || 'Company withheld') : job.company },
    method: { parsedBy, rewrittenBy: model || null, budget: result.opts.budget },
    fit: Math.round(result.fit * 100),
    roles: lib.roles.filter(r => result.picks.some(p => p.role === r.id)).map(r => ({ id: r.id, org: r.org, title: r.title, section: r.section || 'experience' })),
    requirements: reqs.map(r => { const c = result.coverage.find(c => c.req === r.id); return { id: r.id, text: r.text, kind: r.kind, weight: r.weight, coveredBy: c.by, gap: c.gap }; }),
    picks: result.picks.map(p => ({ id: p.id, role: p.role, original: p.text, final: finals[p.id] ?? p.text, rewritten: finals[p.id] != null && finals[p.id] !== p.text,
      reason: p.reason, score: +p.score.toFixed(2), matched: p.matches.map(mm => ({ req: mm.req, text: reqText[mm.req], skills: mm.skills, m: +mm.m.toFixed(2) })) })),
    // lines flagged `check` (non-public figures or names) never appear here: they weren't sent, so nothing was confirmed
    leftOut: result.left.filter(x => !x.check).slice(0, 8).map(x => ({ text: x.text, why: x.why, score: +x.score.toFixed(2) })),
    skills: result.skills.filter(s => s.asked > 0).map(s => s.as),
    checks: flags.filter(c => c.kind !== 'ai-policy').map(({ kind, status, detail }) => ({ kind, status, detail })),
  };
}
