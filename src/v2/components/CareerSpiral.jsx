import { useEffect, useRef, useState } from 'react';
import { EVENTS, GRAD, GROUPS, LOGOS, M, MON, MS_SHADES, NOW, ORGS, ROLES, ROLE_COLOR, dur, fmt } from '../lib/career';

// The career as a spiral, one turn per year (January at twelve o'clock, 2010 at the centre, today at the edge),
// that unwinds into a step chart on demand: both shapes are sampled at the same months, so the morph just slides
// every point from one to the other. The SVG is drawn imperatively (it's rebuilt on resize and redrawn every frame
// of the morph); the numbered list beside it is plain React.
// The spiral draws itself from the centre outward. Where the whole section fits on screen it's scroll-driven: the
// section pins and scrolling draws it (and rewinds it on the way back up); otherwise (phones, short windows) it
// draws over ~2.6s once it's scrolled into view. A year counter ticks along while it draws.
const NS = 'http://www.w3.org/2000/svg';
const T0 = M(2010, 1);
const DRAW_MS = 2600, MORPH_MS = 1500;
const PIN_TOP = 57;  // px: pinned just under the floating header
const EXTRA = 1.1;   // viewport heights of scrolling it takes to draw the spiral while pinned
const clamp = v => Math.min(1, Math.max(0, v));
const blurbOf = (i, straight) => (i === null || straight ? null : EVENTS[i].blurb);
// the list's rail draws continuously with the spiral: event i's stretch covers [its date, the next event's date); where
// the next event is at another employer that stretch is split, half down to the end of this group and half through
// the next group's interchange
const NEXT = EVENTS.map((e, i) => (i + 1 < EVENTS.length ? EVENTS[i + 1].at : NOW));
const RAIL = { li: [], head: [] };
EVENTS.forEach((e, i) => {
  const crosses = i + 1 < EVENTS.length && EVENTS[i + 1].org !== e.org, mid = (e.at + NEXT[i]) / 2;
  RAIL.li[i] = [e.at, crosses ? mid : NEXT[i]];
  if (crosses) RAIL.head[i + 1] = [mid, NEXT[i]];
});
RAIL.head[0] = [GRAD.at - 1, GRAD.at];

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  parent?.append(e);
  return e;
}

export default function CareerSpiral() {
  const track = useRef(null), head = useRef(null), pin = useRef(null), host = useRef(null), list = useRef(null), year = useRef(null);
  const frame = useRef(() => {}), draw = useRef(() => {}), badges = useRef([]), runsRef = useRef([]), trace = useRef(null), k = useRef(0), f = useRef(0), raf = useRef(0);
  const focus = useRef(null), typer = useRef(0);
  const [straight, setStraight] = useState(false);
  const [hot, setHot] = useState(null);
  const [layout, setLayout] = useState({ narrow: false, left: 0, pinned: false, pinH: 0, headH: 0 });

  // drive the drawing: scroll-linked while pinned, otherwise a timed run once it's on screen
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { f.current = 1; draw.current(1); return undefined; }
    if (layout.pinned) {
      let r = 0;
      const update = () => {
        r = 0;
        const top = track.current.getBoundingClientRect().top, start = innerHeight * 0.5, end = PIN_TOP - innerHeight * EXTRA;
        f.current = clamp((start - top) / (start - end));
        draw.current(f.current);
      };
      const onScroll = () => { if (!r) r = requestAnimationFrame(update); };
      update();
      addEventListener('scroll', onScroll, { passive: true });
      return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(r); };
    }
    if (f.current >= 1) return undefined;
    let r = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const from = f.current, t0 = performance.now();
      const step = now => { f.current = from + (1 - from) * clamp((now - t0) / DRAW_MS); draw.current(f.current); if (f.current < 1) r = requestAnimationFrame(step); };
      r = requestAnimationFrame(step);
    }, { threshold: 0.3 });
    io.observe(pin.current);
    return () => { io.disconnect(); cancelAnimationFrame(r); };
  }, [layout.pinned]);

  // build the SVG for the current width (and again whenever the width changes)
  useEffect(() => {
    const box = host.current, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lastW = -1, lastH = -1;
    const build = () => {
      const W = box.clientWidth, vh = innerHeight;
      if (W === lastW && vh === lastH) return;
      lastW = W; lastH = vh;
      // side by side only when the 640px spiral and a readable list both fit; otherwise the list stacks underneath
      const narrow = W < 1060, H = narrow ? Math.min(W, 520) : 640;
      const cx = narrow ? W / 2 : H / 2, cy = H / 2, A = (narrow ? Math.min(W, H) : H) / 2 - 34, R0 = A * 0.15, STEP = (A - R0) / ((NOW - T0) / 12);
      const spiral = m => { const a = ((m % 12) / 12) * 2 * Math.PI - Math.PI / 2, r = R0 + (m - T0) / 12 * STEP; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
      const L = 16, R = narrow ? 18 : 40, T = 56, B = 44, t1 = NOW + 8;
      const sx = m => L + (m - T0) / (t1 - T0) * (W - L - R), sy = lv => H - B - 14 - lv * ((H - B - 14 - T) / 7);
      const armW = Math.min(9, STEP * 0.62), wig = narrow ? 10 : 18;  // px: peak wiggle mid-morph  // thick enough to read, thin enough that the turns stay apart

      box.textContent = '';
      const svg = el('svg', { class: 'v2-cs-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, box);

      // spiral furniture: year rings, month spokes and letters, year labels up the twelve o'clock spoke
      const gS = el('g', {}, svg), rOut = R0 + (NOW - T0) / 12 * STEP;
      for (let y = 2010; y <= Math.floor(NOW / 12); y++) el('circle', { class: 'ring', cx, cy, r: R0 + (y - 2010) * STEP }, gS);
      MON.forEach((m, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
        el('line', { class: 'spoke', x1: cx + R0 * 0.6 * c, y1: cy + R0 * 0.6 * s, x2: cx + (rOut + 18) * c, y2: cy + (rOut + 18) * s }, gS);
        el('text', { class: 'mo', x: cx + (rOut + 28) * c, y: cy + (rOut + 28) * s }, gS).textContent = m[0];
      });
      for (let y = 2010; y <= Math.floor(NOW / 12); y += 2) { const [x, yy] = spiral(M(y, 1) - 0.01); el('text', { class: 'yr', x, y: yy - STEP / 2 }, gS).textContent = `'${String(y).slice(2)}`; }
      el('text', { class: 'centre', x: cx, y: cy + 6 }, gS).textContent = '2010';

      // step-chart furniture: employer bands, year grid and axis, labels beside each step
      const gT = el('g', {}, svg);
      for (const o of ['hanapin', 'deluxe', 'msft']) {
        const rs = ROLES.filter(r => r.org === o), a = sx(rs[0].start), b = sx(rs.at(-1).end);
        el('rect', { class: 'band', x: a, y: T - 26, width: b - a, height: H - B - T + 26, fill: ORGS[o].color, rx: 6 }, gT);
        // each band is labelled with the employer's logo: the wordmark where it fits, the square mark where it doesn't
        const lg = LOGOS[o], word = !narrow && (b - a - 12) >= 15 * lg.wordR, h = word ? 15 : 16, w = h * (word ? lg.wordR : lg.markR);
        el('image', { href: word ? lg.word : lg.mark, x: a + 6, y: T - 21, width: w, height: h, preserveAspectRatio: 'xMinYMid meet' }, gT);
      }
      for (let yr = 2010; yr <= Math.floor(t1 / 12); yr += narrow ? 4 : 2) {
        el('line', { class: 'grid', x1: sx(M(yr, 1)), x2: sx(M(yr, 1)), y1: T - 26, y2: H - B }, gT);
        el('text', { class: 'tick', x: sx(M(yr, 1)), y: H - B + 20 }, gT).textContent = yr;
      }
      el('line', { class: 'axis', x1: L, x2: W - R + 16, y1: H - B, y2: H - B }, gT);
      const labels = el('g', {}, gT);
      if (!narrow) {
        EVENTS.forEach(e => {
          const grad = e.level === 0, x = grad ? sx(e.at) + 10 : sx(e.at) - 22, y = sy(e.level) + (grad ? -12 : 0), anchor = grad ? 'start' : 'end';
          if (grad) el('image', { href: LOGOS.umd.mark, x: x - 1, y: y - 40, width: 22 * LOGOS.umd.markR, height: 22 }, labels);
          el('text', { class: 'rl', x, y: y - 6, 'text-anchor': anchor }, labels).textContent = grad ? 'Graduated UMD' : e.title;
          el('text', { class: 'rd', x, y: y + 8, 'text-anchor': anchor }, labels).textContent = `${fmt(e.at)}${e.current ? ' → now' : ''}`;
        });
        el('text', { class: 'note', x: sx(M(2017, 1)) + 16, y: sy(3) + 38 }, labels).textContent = '↖ the jump to Microsoft';
      }

      // the arm, sampled every eighth of a month so both shapes share points; a role's first point sits at the
      // previous level, which draws the step chart's riser (and is just the role's own start on the spiral)
      const runs = [{ a: GRAD.at, b: ROLES[0].start, lv: 0, prev: 0, gap: true },
        ...ROLES.map((r, i) => ({ a: r.start, b: r.end, lv: r.level, prev: i ? ROLES[i - 1].level : 0, color: ROLE_COLOR.get(r) }))];
      for (const rn of runs) {
        rn.pts = [];
        for (let m = rn.a; m <= rn.b + 1e-9; m += 0.125) { const mm = Math.min(m, rn.b); rn.pts.push([spiral(mm), [sx(mm), sy(rn.lv)], mm]); }
        if (!rn.gap) rn.pts.unshift([spiral(rn.a), [sx(rn.a), sy(rn.prev)], rn.a]);
        rn.el = el('path', rn.gap ? { class: 'gap', pathLength: 1 } : { class: 'arm', pathLength: 1, stroke: rn.color }, svg);
      }
      badges.current = EVENTS.map((e, i) => {
        // the outer group carries the morph's position, the inner one the pop-in (so the two transforms never fight)
        const pos = el('g', {}, svg), g = el('g', { class: 'badge' }, pos);
        el('circle', { class: 'halo', r: 10, fill: 'none', stroke: e.color }, g);  // ripples out while the event is hovered
        el('circle', { r: 10, fill: e.color }, g);
        el('text', {}, g).textContent = i + 1;
        g.addEventListener('pointerenter', () => setHot(i));
        g.addEventListener('pointerleave', () => setHot(null));
        return { g, pos, sp: spiral(e.at), st: [sx(e.at), sy(e.level)] };
      });
      runsRef.current = runs;
      // a short bright dash that loops along the hovered role's stretch of the arm
      trace.current = el('path', { class: 'trace', pathLength: 1 }, svg);
      // today's pulse at the tip of the arm, shown once the drawing reaches it
      const tip = MS_SHADES.at(-1), gNow = el('g', { class: 'today' }, svg);
      const pulse = el('circle', { class: 'now', r: 6, fill: tip }, gNow), dot = el('circle', { r: 6, fill: tip }, gNow);
      const nowAt = { sp: spiral(NOW), st: [sx(NOW), sy(7)] };

      // one frame of the morph at t (0 = spiral, 1 = straight)
      const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      frame.current = t => {
        const e = t * t * (3 - 2 * t);
        // mid-morph the arm wiggles: a wave runs along it (by month) while it's in transit, zero at either end, so the
        // spiral looks like it's being shaken loose rather than slid
        const amp = Math.sin(Math.PI * e) * wig, ph = e * 9;
        const wob = m => amp * Math.sin((m - T0) * 0.32 - ph);
        for (const rn of runs) {
          rn.el.setAttribute('d', rn.pts.map(([p, q, m], i) => { const [x, y] = lerp(p, q, e), w = wob(m); return `${i ? 'L' : 'M'}${(x + w * 0.35).toFixed(1)} ${(y + w).toFixed(1)}`; }).join(''));
          if (!rn.gap) rn.el.setAttribute('stroke-width', (armW + (3.5 - armW) * e).toFixed(2));
        }
        badges.current.forEach((b, i) => { const [x, y] = lerp(b.sp, b.st, e), w = wob(EVENTS[i].at); b.pos.setAttribute('transform', `translate(${(x + w * 0.35).toFixed(1)} ${(y + w).toFixed(1)})`); });
        const lit = runs.find(rn => rn.el.classList.contains('lit'));
        if (lit) { trace.current.setAttribute('d', lit.el.getAttribute('d')); trace.current.setAttribute('stroke-width', lit.el.getAttribute('stroke-width')); }
        for (const c of [pulse, dot]) { const [x, y] = lerp(nowAt.sp, nowAt.st, e), w = wob(NOW); c.setAttribute('cx', x + w * 0.35); c.setAttribute('cy', y + w); }
        gS.style.opacity = Math.max(0, 1 - e * 2.2);
        gT.style.opacity = Math.max(0, e * 2 - 1);
        labels.style.opacity = Math.max(0, (e - 0.75) * 4);
      };
      // draw up to fraction t of the way from graduation to today: each run of the arm traces on as the clock passes
      // it, markers and list entries appear as it reaches them, and the year counter follows along
      draw.current = t => {
        const m = GRAD.at + t * (NOW - GRAD.at);
        for (const rn of runs) rn.el.style.strokeDashoffset = (1 - clamp((m - rn.a) / Math.max(0.01, rn.b - rn.a))).toFixed(4);
        badges.current.forEach((b, i) => b.g.classList.toggle('on', m >= EVENTS[i].at - 0.01));
        list.current.querySelectorAll('[data-at]').forEach(li => li.toggleAttribute('data-in', m >= +li.dataset.at - 0.01));
        list.current.querySelectorAll('[data-rail]').forEach(el => {
          const [a, b] = el.dataset.rail.split(',').map(Number);
          const v = clamp((m - a) / (b - a));
          el.style.setProperty('--rail', v.toFixed(3));
          el.classList.toggle('drawing', v > 0 && v < 1);
        });
        gNow.classList.toggle('on', t >= 1);
        year.current.textContent = Math.floor(Math.min(m, NOW) / 12);
        year.current.classList.toggle('on', t > 0 && t < 1);
      };
      frame.current(k.current);
      draw.current(f.current);
      // pin and scroll-draw only where the whole section fits on screen under the floating header
      const pinH = pin.current.offsetHeight, headH = head.current.offsetHeight, pinned = !calm && !narrow && pinH + headH <= innerHeight - PIN_TOP - 16;
      setLayout(l => (l.narrow === narrow && l.left === H + 40 && l.pinned === pinned && l.pinH === pinH && l.headH === headH ? l : { narrow, left: H + 40, pinned, pinH, headH }));
    };
    const ro = new ResizeObserver(build);
    ro.observe(box);
    addEventListener('resize', build);
    return () => { ro.disconnect(); removeEventListener('resize', build); cancelAnimationFrame(raf.current); };
  }, []);

  // hovering an event (its marker or its list entry) spotlights it on the chart: the rest dims, its stretch of the arm
  // gets a light running along it, its marker ripples, and its dates show in the corner. Event 0 is the degree (no
  // stretch of its own); event i is role i - 1, drawn by runs[i] (runs[0] is the gap before the first job).
  useEffect(() => {
    const svg = host.current.querySelector('svg'), runs = runsRef.current;
    if (!svg) return;
    svg.classList.toggle('focus', hot !== null);
    badges.current.forEach((b, i) => b.g.classList.toggle('hot', i === hot));
    runs.forEach((rn, j) => rn.el.classList.toggle('lit', hot !== null && hot > 0 && j === hot));
    const lit = hot > 0 ? runs[hot] : null, tr = trace.current;
    tr.classList.toggle('on', !!lit);
    if (lit) { tr.setAttribute('d', lit.el.getAttribute('d')); tr.setAttribute('stroke-width', lit.el.getAttribute('stroke-width')); }
    const fc = focus.current;
    fc.classList.toggle('on', hot !== null);
    if (hot !== null) {
      const e = EVENTS[hot], r = hot > 0 ? ROLES[hot - 1] : null;
      fc.style.setProperty('--c', e.color);
      const yr = m => Math.floor(m / 12), sameYear = r && !r.current && yr(r.start) === yr(r.end);  // a short stint shows its months
      fc.querySelector('b').textContent = !r ? `${yr(e.at)}` : sameYear ? `${fmt(r.start)} → ${fmt(r.end)}` : `${yr(r.start)} → ${r.current ? 'now' : yr(r.end)}`;
      fc.querySelector('small').textContent = r ? `${e.title} · ${dur(r.end - r.start)}` : e.title;
    }
    // straightened, the job's story types itself out under the readout (the step chart's top-left is empty space)
    const story = fc.querySelector('.story'), text = straight && hot !== null ? EVENTS[hot].blurb ?? '' : '';
    clearInterval(typer.current);
    story.querySelector('span').textContent = '';
    story.classList.toggle('on', !!text);
    if (text) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) story.querySelector('span').textContent = text;
      else {
        let n = 0;
        typer.current = setInterval(() => {
          n += 1;
          story.querySelector('span').textContent = text.slice(0, n);
          if (n >= text.length) clearInterval(typer.current);
        }, 16);
      }
    }
    return () => clearInterval(typer.current);
  }, [hot, straight]);

  const toggle = () => {
    const to = straight ? 0 : 1, from = k.current, start = performance.now();
    const D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MORPH_MS;
    setStraight(!straight);
    cancelAnimationFrame(raf.current);
    const step = now => {
      const p = D ? Math.min(1, (now - start) / D) : 1;
      k.current = from + (to - from) * p;
      frame.current(k.current);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  return (
    <div ref={track} className={`v2-cs${straight ? ' straight' : ''}${layout.narrow ? ' narrow' : ''}${layout.pinned ? ' pinned' : ''}`}
      style={layout.pinned ? { height: `calc(${layout.pinH + layout.headH}px + ${EXTRA * 100}vh)`, '--hh': `${layout.headH}px` } : undefined}>
      {/* the heading sits outside the pinned block, so it stays stuck under the floating header for the whole section */}
      <div ref={head} className="v2-cs-head">
        <h2>Professional Timeline</h2>
        <button type="button" className="v2-cs-swap" onClick={toggle}>
          <svg viewBox="0 0 26 26" aria-hidden="true"><path d="M13 13 m0 -1.6 a1.6 1.6 0 1 1 -1.6 1.6 a3.6 3.6 0 0 1 3.6 -3.6 a5.6 5.6 0 0 1 5.6 5.6 a7.6 7.6 0 0 1 -7.6 7.6" /></svg>
          {/* the short label is for phones, where the full one won't fit beside the heading */}
          <span className="long">{straight ? 'Wind it back up' : 'Straighten this viz out'}</span>
          <span className="short">{straight ? 'Wind up' : 'Straighten'}</span>
        </button>
        {/* the caption doubles as the story line: hovering a stop swaps it for what that job was. It lives in the sticky
            heading so it's on screen wherever you are in the section. */}
        <p className={`v2-cs-cap${blurbOf(hot, straight && !layout.narrow) ? ' story' : ''}`} style={blurbOf(hot, straight && !layout.narrow) ? { '--c': EVENTS[hot].color } : undefined} aria-live="polite">
          {blurbOf(hot, straight && !layout.narrow)
            ? <><b>{EVENTS[hot].title}</b>{blurbOf(hot, straight && !layout.narrow)}</>
            : straight
              ? 'Each move is a step up, coloured by employer.'
              : 'One turn per year, from 2010 at the centre to today at the edge; January is at twelve o\'clock.'}
        </p>
      </div>
      <div ref={pin} className="v2-cs-pin">
        <div className="v2-cs-stage">
          <div ref={host} className="v2-cs-host" />
          <span ref={year} className="v2-cs-year" aria-hidden="true">2010</span>
          <span ref={focus} className="v2-cs-focus" aria-hidden="true"><b /><small /><span className="story"><span /><i className="v2-caret" /></span></span>
          <ol ref={list} className="v2-cs-list" style={layout.narrow ? undefined : { left: layout.left }} aria-label="Career events">
            {GROUPS.map((g, gi) => (
              <li key={g.org} className="grp" data-at={g.events[0].at}
                style={{ '--c': g.events[0].color, '--pc': gi ? GROUPS[gi - 1].events.at(-1).color : g.events[0].color }}>
                <div className="grp-head" data-rail={RAIL.head[g.events[0].i]}>
                  <i className="stn" aria-hidden="true" />
                  <img src={LOGOS[g.org].word} alt={ORGS[g.org].name} style={{ height: LOGOS[g.org].h, width: LOGOS[g.org].h * LOGOS[g.org].wordR }} />
                </div>
                <ol>
                  {g.events.map(e => (
                    <li key={e.at} className={hot === e.i ? 'hot' : undefined} data-at={e.at} data-rail={RAIL.li[e.i]} style={{ '--c': e.color }}
                      onPointerEnter={() => setHot(e.i)} onPointerLeave={() => setHot(null)}>
                      <span className="n">{e.i + 1}</span>
                      <span className="txt"><b>{e.title}</b><small>{e.sub}<em>{e.len}</em></small>{e.blurb && <span className="blurb">{e.blurb}</span>}</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
