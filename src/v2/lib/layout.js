// Positions for the project stage. Both views place the same tiles; switching views just changes these numbers
// and CSS transitions do the morph.
import { kindOf, monthIndex } from './projects';

// Tile sizes follow position among the *visible* projects, so any filtered set still packs into a full bento.
const SIZES = ['wide', 'wide', 'tall', '', '', 'small', 'small', 'tall', '', 'small', '', 'small', ''];
const SPAN = { wide: [4, 2], tall: [2, 3], small: [2, 1], '': [2, 2] };

export const PHONE = 640;  // px: below this the stage uses its phone layouts

/** Phones: a single-column feed. The newest project is a featured card (screenshot on top); the rest are compact
 *  rows (thumbnail on the left, title and a two-line description beside it), so nothing depends on hover. */
function feedLayout(visible, width) {
  const gap = 12, FEAT = 360, ROW = 152;
  let y = 0;
  const pos = new Map(visible.map((p, i) => {
    const h = i === 0 ? FEAT : ROW, at = { x: 0, y, w: width, h, size: i === 0 ? 'feat' : 'row' };
    y += h + gap;
    return [p.id, at];
  }));
  return { pos, height: Math.max(0, y - gap) };
}

/** Bento: first-fit packing on a 6-column grid (2 on small tablets), like CSS grid-auto-flow: dense. */
export function bentoLayout(visible, width) {
  if (width < PHONE) return feedLayout(visible, width);
  const cols = width < 760 ? 2 : 6, gap = 14, rowH = width < 760 ? 140 : 150;
  const cw = (width - gap * (cols - 1)) / cols;
  const taken = [];
  const fits = (r, c, w, h) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (x >= cols || taken[y]?.[x]) return false;
    return true;
  };
  const placed = [];
  let rows = 0;
  visible.forEach((p, rank) => {
    const size = SIZES[rank] ?? '';
    let [w, h] = SPAN[size];
    if (cols === 2) { w = size === 'wide' ? 2 : 1; h = 2; }
    let r = 0, c = 0;
    search: for (r = 0; ; r++) for (c = 0; c < cols; c++) if (fits(r, c, w, h)) break search;
    for (let y = r; y < r + h; y++) { taken[y] = taken[y] || []; for (let x = c; x < c + w; x++) taken[y][x] = true; }
    rows = Math.max(rows, r + h);
    placed.push({ p, r, c, w, h, size });
  });
  // fill holes so the grid always ends square: a tile grows right, then down, into cells nobody took
  const free = (r, c) => r < rows && c < cols && !taken[r]?.[c];
  for (const t of placed) {
    while (Array.from({ length: t.h }, (_, i) => free(t.r + i, t.c + t.w)).every(Boolean)) {
      for (let i = 0; i < t.h; i++) taken[t.r + i][t.c + t.w] = true;
      t.w++;
    }
    while (t.r + t.h < rows && Array.from({ length: t.w }, (_, i) => free(t.r + t.h, t.c + i)).every(Boolean)) {
      taken[t.r + t.h] = taken[t.r + t.h] || [];
      for (let i = 0; i < t.w; i++) taken[t.r + t.h][t.c + i] = true;
      t.h++;
    }
  }
  const pos = new Map(placed.map(({ p, r, c, w, h, size }) =>
    [p.id, { x: c * (cw + gap), y: r * (rowH + gap), w: w * cw + (w - 1) * gap, h: h * rowH + (h - 1) * gap, size: w >= 4 ? 'wide' : size }]));
  return { pos, height: Math.max(0, rows * (rowH + gap) - gap) };
}

// deterministic 0–1 noise from an integer (mulberry32-style)
function hash(n) {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Scatter: x = when it was built, y = analysis (top) to builds (bottom). Each kind of project gets a band and every
// project its own row inside it, so the handwritten labels never collide.
const BAND = { analytics: [0.05, 0.4], misc: [0.47, 0.55], genai: [0.62, 0.7], engineering: [0.77, 0.93] };

// Phones: the scatter turns on its side so it suits a tall screen. Time runs down the page (oldest at the top) and
// the four kinds of project are columns from analysis (left) to builds (right). Every project gets its own row, at
// least ROW px below the one before, so each dot has room for a readable label; month ticks follow the same mapping.
const COLS = { analytics: 0.06, misc: 0.34, genai: 0.62, engineering: 0.9 };
function scatterPhone(all, width) {
  const L = 70, R = 14, T = 74, B = 30, dot = 22, ROW = 46, PER_MONTH = 22;
  const t = all.map(monthIndex), t0 = Math.min(...t) - 1, t1 = Math.max(...t) + 1;
  const oldestFirst = [...all].sort((a, b) => monthIndex(a) - monthIndex(b) || a.id - b.id);
  const plotW = width - L - R;
  // y for each project: linear in time, pushed down where projects crowd together
  const ys = [];
  let push = 0;
  oldestFirst.forEach((p, i) => {
    let yy = T + (monthIndex(p) - t0) * PER_MONTH + push;
    if (i && yy < ys[i - 1].y + ROW) { push += ys[i - 1].y + ROW - yy; yy = ys[i - 1].y + ROW; }
    ys.push({ p, y: yy, push });
  });
  const yOfMonth = m => { const last = [...ys].reverse().find(r => monthIndex(r.p) <= m); return T + (m - t0) * PER_MONTH + (last ? last.push : 0); };
  const pos = new Map();
  ys.forEach(({ p, y }, order) => {
    const cx = L + COLS[kindOf(p)] * plotW;
    const room = { right: width - (cx + dot / 2) - 10, left: cx - dot / 2 - L - 4 };
    pos.set(p.id, { x: cx - dot / 2, y: y - dot / 2, w: dot, h: dot, size: '', order, drift: 3.2 + hash(p.id * 3) * 2.4,
      side: room.right >= 150 || room.right >= room.left ? 'right' : 'left', room: Math.round(Math.max(room.right, room.left)) });
  });
  const H = ys[ys.length - 1].y + dot + B;
  const ticks = [];
  for (let m = t0 + 1; m <= t1 - 1; m += 3) ticks.push({ m, y: yOfMonth(m) });
  const cols = Object.entries(COLS).map(([k, f]) => ({ k, x: L + f * plotW }));
  return { pos, height: H, ticks, cols, box: { L, R, T, B, H }, phone: true };
}

export function scatterLayout(all, width) {
  if (width < PHONE) return scatterPhone(all, width);
  const narrow = width < 760;
  const H = narrow ? 520 : 600, L = narrow ? 28 : 40, R = narrow ? 24 : 220, T = 52, B = 58, dot = narrow ? 18 : 22;
  const t = all.map(monthIndex), t0 = Math.min(...t) - 1, t1 = Math.max(...t) + 1;
  const x = v => L + ((v - t0) / (t1 - t0)) * (width - L - R), y = v => T + v * (H - T - B);
  const oldestFirst = [...all].sort((a, b) => monthIndex(a) - monthIndex(b) || a.id - b.id);
  const pos = new Map();
  all.forEach(p => {
    const k = kindOf(p), same = oldestFirst.filter(q => kindOf(q) === k), j = same.indexOf(p), [a, b0] = BAND[k], b = narrow ? Math.min(b0, 0.88) : b0;  // keep phones' bottom row clear of the axis
    const v = same.length === 1 ? (a + b) / 2 : a + (j / (same.length - 1)) * (b - a);
    // jitter: a small fixed offset per project (same every load) so it reads like real data, not tidy rows;
    // ±10px across the month, ±5px up/down keeps labels clear of their neighbours
    const jx = (hash(p.id * 7 + 1) - 0.5) * 20, jy = (hash(p.id * 13 + 5) - 0.5) * 10;
    pos.set(p.id, {
      x: x(monthIndex(p)) - dot / 2 + jx, y: y(v) - dot / 2 + jy, w: dot, h: dot, size: '',
      order: oldestFirst.indexOf(p),          // arrival order for the entrance (left to right in time)
      drift: 3.2 + hash(p.id * 3) * 2.4,      // idle drift period, seconds
    });
  });
  const ticks = [];
  for (let m = t0 + 1; m <= t1 - 1; m += width < 420 ? 12 : narrow ? 6 : 3) ticks.push({ m, x: x(m) });  // fewer labels on small phones
  return { pos, height: H, ticks, box: { L, R, T, B, H } };
}
