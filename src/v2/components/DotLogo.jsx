import { useEffect, useRef } from 'react';

// "KEVIN KLEIN" drawn as a scatterplot: each letter is a 5×7 dot pattern in the five site colours. The dots fly in
// from random spots on load (skipped with reduced motion), like the live homepage's ScatterName.
const PATTERNS = {
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  N: ['10001', '11001', '10101', '10101', '10011', '10011', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
};
const COLORS = ['#00d9ff', '#a78bfa', '#4ade80', '#fb923c', '#f472b6'];
// the plot area sits inside axes, like a real chart: y ticks on the left, x axis along the bottom
const W = 660, H = 150, M = { l: 34, r: 8, t: 10, b: 16 };
const PW = W - M.l - M.r, PH = H - M.t - M.b;

function buildDots(text) {
  let seed = 20261007;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  let units = -1;
  for (const ch of text) units += PATTERNS[ch][0].length + 1;
  const sp = Math.min((PW - 24) / units, (PH - 16) / 7), x0 = M.l + (PW - units * sp) / 2, y0 = M.t + (PH - 7 * sp) / 2;
  const dots = [];
  let cx = x0;
  for (const ch of text) {
    const pat = PATTERNS[ch];
    pat.forEach((row, r) => [...row].forEach((on, c) => {
      if (on !== '1') return;
      dots.push({
        x: cx + c * sp + (rnd() - 0.5) * 2, y: y0 + r * sp + (rnd() - 0.5) * 2,
        r: 2 + rnd() * 3.4, fill: COLORS[Math.floor(rnd() * COLORS.length)], o: 0.72 + rnd() * 0.28,
        sx: M.l + rnd() * PW, sy: M.t + rnd() * PH,
      });
    }));
    cx += (pat[0].length + 1) * sp;
  }
  return dots;
}

const DOTS = buildDots('KEVIN KLEIN');
// gridlines: horizontal at 25/50/75 (0 and 100 are the axis and the top), verticals every 20%
const GRID = [
  ...[25, 50, 75, 100].map(v => ({ k: `y${v}`, line: { x1: M.l, x2: W - M.r, y1: M.t + PH * (1 - v / 100), y2: M.t + PH * (1 - v / 100) } })),
  ...[20, 40, 60, 80, 100].map(v => ({ k: `x${v}`, line: { x1: M.l + PW * v / 100, x2: M.l + PW * v / 100, y1: M.t + PH, y2: M.t } })),
];
const DRAWN_AT = 750;  // ms: the dots start flying in once the axes and grid are drawn
// ms after mount when the last dot has landed (each dot starts 4ms after the previous and flies for 1200ms)
export const LOGO_DONE_MS = DRAWN_AT + (DOTS.length - 1) * 4 + 1200;

// `still` is the small copy that lives in the floating header: dots already in the letters, no drawing, no ticks.
export default function DotLogo({ still = false }) {
  const ref = useRef(null);
  const maskId = still ? 'v2-logo-grid-still' : 'v2-logo-grid';
  useEffect(() => {
    const circles = [...ref.current.querySelectorAll('circle')];
    if (still || matchMedia('(prefers-reduced-motion: reduce)').matches) {  // no flight: straight into the letters
      circles.forEach((el, i) => { el.setAttribute('cx', DOTS[i].x); el.setAttribute('cy', DOTS[i].y); });
      return undefined;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = now => {
      let done = true;
      circles.forEach((el, i) => {
        const d = DOTS[i], k = Math.min(1, Math.max(0, (now - t0 - DRAWN_AT - i * 4) / 1200));
        if (k < 1) done = false;
        const e = 1 - Math.pow(1 - k, 3);
        el.setAttribute('cx', d.sx + (d.x - d.sx) * e);
        el.setAttribute('cy', d.sy + (d.y - d.sy) * e);
      });
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [still]);
  return (
    <svg ref={ref} className={`v2-logo${still ? ' still' : ''}`} viewBox={`0 0 ${W} ${H}`} role={still ? undefined : 'img'} aria-label={still ? undefined : 'Kevin Klein, drawn as a scatterplot'} aria-hidden={still || undefined}>
      <g aria-hidden="true">
        <defs>
          {/* reveals the dashed grid line by line, like it's being drawn */}
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            {GRID.map((g, i) => (
              <line key={g.k} className="v2-draw gridrev" style={{ '--i': i }} pathLength="1" {...g.line} stroke="#fff" strokeWidth="4" />
            ))}
          </mask>
        </defs>
        <g className="gridg" mask={`url(#${maskId})`}>{GRID.map(g => <line key={g.k} className="grid" {...g.line} />)}</g>
        {[0, 50, 100].map((v, i) => (
          <text key={v} x={M.l - 7} y={M.t + PH * (1 - v / 100) + 3} textAnchor="end" className="tick" style={{ '--i': i, '--n': String(v).length }}>{v}</text>
        ))}
        <path className="v2-draw axis ay" pathLength="1" d={`M ${M.l} ${M.t + PH} C ${M.l - 1.2} ${M.t + PH * 0.6}, ${M.l + 1.2} ${M.t + PH * 0.3}, ${M.l} ${M.t}`} />
        <path className="v2-draw axis ax2" pathLength="1" d={`M ${M.l} ${M.t + PH} C ${M.l + PW * 0.35} ${M.t + PH + 1.2}, ${M.l + PW * 0.7} ${M.t + PH - 1.2}, ${W - M.r} ${M.t + PH}`} />
      </g>
      {/* dots start scattered (their flight's starting point) and invisible; they fade in while the grid draws, then fly */}
      {DOTS.map((d, i) => (
        <circle key={i} cx={still ? d.x : d.sx} cy={still ? d.y : d.sy} r={d.r.toFixed(1)} fill={d.fill} opacity={d.o.toFixed(2)}
          style={still ? undefined : { '--f': ((i * 0.618034) % 1).toFixed(3) }} />  /* --f: a scattered fade-in order */
      ))}
    </svg>
  );
}
