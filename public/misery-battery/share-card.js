// Share card renderer: draws a 1200×630 result card on a canvas (the size link previews use).
// Used by the page ("Save image", native share) and by scripts/build-share-pages.js for the per–fan base preview images.
// Always drawn in the light house style so a shared image looks the same everywhere.

// season stages; the four blues pass the ordinal checks (one hue, monotone, >=0.06 ΔL steps, 2:1 light end) on white
export const STAGE_FILL = ['#a9b5c2', '#70a4d2', '#2a75b5', '#0a3f6a', '#f2a900'];
const C = { ink: '#111111', ink2: '#555555', ink3: '#6b6b6b', misery: '#b8321a', joy: '#0072aa', miserysoft: '#e7b3a7', joysoft: '#a9cfe6', mid: '#e4e4e4', dash: '#a8a8a8', mast: '#0d1117' };
const HEAD = '"Libre Franklin", "Helvetica Neue", Arial, sans-serif';
const MONO = '"DM Mono", ui-monospace, Menlo, monospace';

const loadImage = src => new Promise(resolve => {
  const im = new Image();
  im.onload = () => resolve(im);
  im.onerror = () => resolve(null);
  im.src = src;
});

function wrap(ctx, text, maxWidth) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function spaced(ctx, text, x, y, spacing, align = 'left') {
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.letterSpacing = '0px';
    return;
  }
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

/**
 * model = {
 *   kicker, headline,                       // top-left text
 *   big: { value: '62', side: 'misery'|'joy'|'even', label: 'MISERY · 1976–2025' },
 *   gauge,                                  // −100 (joy) … +100 (misery); misery is drawn on the left
 *   rows: [{ logo, name, cells: [stage|null], right: { value, label, side } | { text } }],
 *   foot,                                   // bottom-left line
 * }
 */
export async function renderCard(model, { scale = 1 } = {}) {
  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  await Promise.all([
    document.fonts.load(`800 48px ${HEAD}`), document.fonts.load(`700 20px ${HEAD}`), document.fonts.load(`500 14px ${MONO}`),
  ]).catch(() => {});
  const logos = await Promise.all(model.rows.map(r => r.logo ? loadImage(r.logo) : null));
  const colour = side => side === 'joy' ? C.joy : side === 'misery' ? C.misery : C.ink;

  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.mast; ctx.fillRect(0, 0, W, 20);
  ctx.textBaseline = 'alphabetic';

  // kicker + headline (left), big number (right)
  ctx.fillStyle = C.misery; ctx.font = `700 19px ${HEAD}`;
  spaced(ctx, model.kicker.toUpperCase(), 64, 66, 1.9);
  // the selected years, as a dark label right after the kicker
  if (model.years) {
    const kw = ctx.measureText(model.kicker.toUpperCase()).width + model.kicker.length * 1.9;
    const n = model.years.to - model.years.from + 1;
    const label = `${model.years.from === model.years.to ? model.years.from : `${model.years.from}–${model.years.to}`}`;
    const sub = ` · ${n} YEAR${n === 1 ? '' : 'S'}`;
    ctx.font = `800 22px ${HEAD}`; const lw = ctx.measureText(label).width;
    ctx.font = `700 15px ${HEAD}`; const sw = ctx.measureText(sub).width + sub.length * 1.2;
    const px = 64 + kw + 16, pw = lw + sw + 28;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(px, 40, pw, 36, 18); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 22px ${HEAD}`; ctx.textAlign = 'left'; ctx.fillText(label, px + 14, 66);
    ctx.font = `700 15px ${HEAD}`; spaced(ctx, sub, px + 14 + lw, 65, 1.2);
  }
  ctx.fillStyle = C.ink; ctx.font = `800 44px ${HEAD}`;
  // headline: up to 3 lines, stepping down in size if needed so it clears the comparison line
  let hs = 44, lines = wrap(ctx, model.headline, 760);
  while (lines.length > 3 && hs > 34) { hs -= 2; ctx.font = `800 ${hs}px ${HEAD}`; lines = wrap(ctx, model.headline, 760); }
  const lh = Math.round(hs * 1.09);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 64, 74 + hs + i * lh));

  ctx.textAlign = 'right';
  ctx.fillStyle = colour(model.big.side); ctx.font = `800 120px ${HEAD}`;
  ctx.fillText(model.big.value, W - 64, 168);
  ctx.fillStyle = C.ink2; ctx.font = `700 16px ${HEAD}`;
  spaced(ctx, model.big.label.toUpperCase(), W - 64, 200, 1.3, 'right');
  ctx.textAlign = 'left';

  // what the number is compared with (group, leagues, years), right above the gauge
  if (model.compare) {
    ctx.fillStyle = C.ink2; ctx.font = `600 15px ${HEAD}`; ctx.textAlign = 'left';
    let t = model.compare;
    while (ctx.measureText(t).width > W - 128 && t.length > 10) t = t.slice(0, -2).trimEnd() + '…';
    ctx.fillText(t, 64, 247);
  }

  // gauge: 100 misery (left) … 0 … 100 joy (right)
  const gx = 64, gy = 262, gw = W - 128, gh = 12;
  const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
  grad.addColorStop(0, C.misery); grad.addColorStop(0.3, C.miserysoft); grad.addColorStop(0.5, C.mid);
  grad.addColorStop(0.7, C.joysoft); grad.addColorStop(1, C.joy);
  ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 6); ctx.fill();
  const mx = Math.max(gx + 6, Math.min(gx + gw - 6, gx + gw * ((100 - model.gauge) / 200)));
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(mx - 5.5, gy - 8, 11, 28, 3); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(mx - 3.5, gy - 6, 7, 24, 2); ctx.fill();
  ctx.font = `500 14px ${MONO}`;
  ctx.fillStyle = C.misery; spaced(ctx, '100 MISERY', gx, gy + 34, 0.6);
  ctx.fillStyle = C.ink3; spaced(ctx, '0', gx + gw / 2, gy + 34, 0.6, 'center');
  ctx.fillStyle = C.joy; spaced(ctx, '100 JOY', gx + gw, gy + 34, 0.6, 'right');
  ctx.textAlign = 'left';

  // rows: logo, name, season strip, number
  ctx.fillStyle = C.ink; ctx.fillRect(64, 318, W - 128, 4);
  const n = model.rows.length, rowH = n === 1 ? 70 : n === 2 ? 80 : n === 3 ? 62 : 48, top = n <= 2 ? 356 : 342;
  // rows with a text summary on the right (local fandoms) need a shorter strip than rows with a number
  const hasText = model.rows.some(r => r.right?.text);
  const stripX = 430, stripW = hasText ? 486 : 600;
  model.rows.forEach((r, i) => {
    const y = top + i * rowH;
    if (logos[i]) ctx.drawImage(logos[i], 64, y, 34, 34);
    ctx.fillStyle = C.ink; ctx.font = `700 22px ${HEAD}`;
    let name = r.name;
    while (ctx.measureText(name).width > 300 && name.length > 4) name = name.slice(0, -2).trimEnd() + '…';
    ctx.fillText(name, 114, y + 25);
    const k = r.cells.length, gap = k > 40 ? 2 : 3, cw = (stripW - gap * (k - 1)) / k;
    r.cells.forEach((st, j) => {
      const x = stripX + j * (cw + gap);
      if (st == null) {
        ctx.strokeStyle = C.dash; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]);
        ctx.strokeRect(x + 0.6, y + 5.6, cw - 1.2, 22.8); ctx.setLineDash([]);
      } else { ctx.fillStyle = STAGE_FILL[st]; ctx.fillRect(x, y + 5, cw, 24); }
    });
    ctx.textAlign = 'right';
    if (r.right?.value != null) {
      ctx.fillStyle = colour(r.right.side); ctx.font = `800 28px ${HEAD}`;
      ctx.fillText(r.right.value, W - 64, y + 24);
      ctx.fillStyle = C.ink2; ctx.font = `700 11px ${HEAD}`;
      spaced(ctx, r.right.label.toUpperCase(), W - 64, y + 39, 0.9, 'right');
    } else if (r.right?.text) {
      ctx.fillStyle = C.ink3; ctx.font = `500 14px ${MONO}`;
      ctx.fillText(r.right.text, W - 64, y + 24);
    }
    ctx.textAlign = 'left';
  });
  // year marks under the strips
  if (model.years && n) {
    const { from, to } = model.years, k = to - from + 1, gap = k > 40 ? 2 : 3, cw = (stripW - gap * (k - 1)) / k;
    const ay = top + (n - 1) * rowH + 50, cx = j => stripX + j * (cw + gap) + cw / 2;
    ctx.fillStyle = C.ink2; ctx.font = `500 14px ${MONO}`;
    ctx.textAlign = 'left'; ctx.fillText(String(from), stripX, ay);
    ctx.textAlign = 'right'; ctx.fillText(String(to), stripX + stripW, ay);
    if (k >= 8) { const mid = Math.round((from + to) / 2); ctx.textAlign = 'center'; ctx.fillText(String(mid), cx(mid - from), ay); }
    ctx.textAlign = 'left';
  }

  // legend for the season squares (same labels as the page)
  const LEGEND = [[0, 'Missed playoffs'], [1, 'Playoffs'], [2, 'Final four'], [3, 'Lost final'], [4, 'Title'], [null, 'No team']];
  ctx.font = `500 14px ${HEAD}`; ctx.textAlign = 'left';
  let lx = 64; const ly = H - 64;
  for (const [st, label] of LEGEND) {
    if (st == null) {
      ctx.strokeStyle = C.dash; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]);
      ctx.strokeRect(lx + 0.6, ly - 11.4, 11.8, 11.8); ctx.setLineDash([]);
    } else { ctx.fillStyle = STAGE_FILL[st]; ctx.fillRect(lx, ly - 12, 13, 13); }
    ctx.fillStyle = C.ink2; ctx.fillText(label, lx + 19, ly);
    lx += 19 + ctx.measureText(label).width + 22;
  }

  ctx.fillStyle = C.ink3; ctx.font = `500 15px ${MONO}`;
  spaced(ctx, model.foot.toUpperCase(), 64, H - 26, 0.9);
  spaced(ctx, 'KCKDATA.COM', W - 64, H - 26, 0.9, 'right');
  return canvas;
}

export const cardBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
