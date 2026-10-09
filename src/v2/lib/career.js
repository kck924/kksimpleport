// Career data for the v2 timeline (the same events as src/components/Timeline.jsx). Months are year * 12 + (month - 1).
export const M = (y, m) => y * 12 + (m - 1);
const today = new Date();
export const NOW = today.getFullYear() * 12 + today.getMonth();
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmt = m => `${MON[m % 12]} ${Math.floor(m / 12)}`;
export const dur = n => { const y = Math.floor(n / 12), m = n % 12; return [y && `${y}y`, m && `${m}m`].filter(Boolean).join(' ') || '<1m'; };

export const ORGS = {
  umd: { name: 'University of Maryland', short: 'UMD', color: '#4ade80' },
  hanapin: { name: 'Hanapin Marketing', short: 'Hanapin', color: '#fb923c' },
  deluxe: { name: 'Deluxe Corporation', short: 'Deluxe', color: '#f472b6' },
  msft: { name: 'Microsoft', short: 'Microsoft', color: '#00d9ff' },
};

// transparent logos for the dark page (public/logos): a wordmark and a small square mark for each, with aspect ratios.
// Sources: Wikimedia Commons (Microsoft, Deluxe, University of Maryland; public domain) and Hanapin's own site
// (via the Wayback Machine); text recoloured light where it was black or grey.
export const LOGOS = {
  umd: { word: '/logos/umd.svg', wordR: 5.02, mark: '/logos/umd-mark.svg', markR: 0.92, h: 24 },
  hanapin: { word: '/logos/hanapin.png', wordR: 5.48, mark: '/logos/hanapin-mark.png', markR: 0.87, h: 24 },
  deluxe: { word: '/logos/deluxe.svg', wordR: 5.23, mark: '/logos/deluxe-mark.svg', markR: 0.96, h: 18 },
  msft: { word: '/logos/microsoft.svg', wordR: 4.7, mark: '/logos/microsoft-mark.svg', markR: 1, h: 21 },
};  // h: list height per logo, tuned so they all carry the same visual weight

// the events grouped by employer

export const GRAD = { at: M(2010, 5), title: 'Graduated University of Maryland', sub: "Bachelor's degree" };

// blurb: a line of what the job was, shown when its stop is hovered (or under it on phones)
// level is an ordinal for the step chart (each move is one step up), not a measured scale
const R = [
  { org: 'hanapin', title: 'Account Manager', start: M(2014, 2), blurb: 'I managed digital media investment on behalf of clients.' },
  { org: 'deluxe', title: 'Deluxe Corporation', start: M(2015, 8), blurb: 'I was brought in house to manage the digital investment strategy and execution across a portfolio of 11 different brands beneath the Deluxe umbrella.' },
  { org: 'msft', title: 'Analytical Lead', start: M(2017, 1), blurb: 'I brandished the swords of data science and machine learning in the environs of digital media sales, working primarily on behalf of a portfolio of Fortune 100 customers.' },
  { org: 'msft', title: 'Senior Analytical Lead', start: M(2020, 9) },
  { org: 'msft', title: 'Analytical Director', start: M(2022, 9) },
  { org: 'msft', title: 'Head of Advertiser Analytics', start: M(2022, 10) },
  { org: 'msft', title: 'Director, Head of Advertiser Analytics', start: M(2025, 9), blurb: 'I run a team across FinServ, Automotive, Pharma and Lead Gen inside the Global Measurement and Insights organization, and lead our AI strategy: a global team turning ad data into decisions for major brands and agencies.' },
];
export const ROLES = R.map((r, i) => ({ ...r, level: i + 1, end: i + 1 < R.length ? R[i + 1].start : NOW, current: i === R.length - 1 }));

// Microsoft runs in steps of cyan that brighten with each promotion, so the moves show on the spiral's arm itself
export const MS_SHADES = ['#0e7490', '#0891b2', '#06b6d4', '#22d3ee', '#a5f3fc'];
let msi = 0;
export const ROLE_COLOR = new Map(ROLES.map(r => [r, r.org === 'msft' ? MS_SHADES[msi++] : ORGS[r.org].color]));

// the numbered events: the degree, then every role
export const EVENTS = [
  // sub: the plain part of the line under the title; len: the part highlighted in the event's colour (its tenure)
  { at: GRAD.at, org: 'umd', color: ORGS.umd.color, title: GRAD.title, sub: `${GRAD.sub} · `, len: fmt(GRAD.at), level: 0 },
  ...ROLES.map(r => ({ at: r.start, org: r.org, color: ROLE_COLOR.get(r), title: r.title, level: r.level, current: r.current,
    sub: `${fmt(r.start)} · `, len: `${dur(r.end - r.start)}${r.current ? ' and counting' : ''}`, blurb: r.blurb })),
];

export const GROUPS = Object.keys(ORGS).map(org => ({ org, events: EVENTS.map((e, i) => ({ ...e, i })).filter(e => e.org === org) }));
