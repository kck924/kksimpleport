import { useEffect, useRef, useState } from 'react';

// A pinned bridge from the projects to the career timeline: two lines in my handwriting that get written out live,
// letter by letter, as if a pen is moving across the page. The letters are the real KKHand glyphs (via opentype.js).
// Each letter is revealed through a mask: a thick pen stroke that travels along the glyph's own path, so the ink
// appears in the order a pen would lay it down, with a small pen tip riding the end of the stroke. Letters go quickly,
// with a short beat between words. Scrolling to the section starts line one; further on, it clears and line two is
// written. Scroll back above the section and it resets. Reduced motion (or if the font can't be read): plain text.
const LINES = [
  { text: "That's what I work on at night.", cls: 'one' },
  { text: 'Here are my days...', cls: 'two' },  // KKHand has no ellipsis glyph
];
const clamp = v => Math.min(1, Math.max(0, v));
const PX_PER_MS = 2.6, MIN_MS = 45, MAX_MS = 150, LETTER_GAP = 12, WORD_GAP = 110;  // pen speed and pauses

let fontPromise;
// opentype.js is only fetched when the page needs it, so it stays out of the first load
const loadFont = () => (fontPromise ||= Promise.all([import('opentype.js'), fetch('/fonts/KKHand.ttf').then(r => r.arrayBuffer())]).then(([ot, buf]) => ot.parse(buf)));

// lay a line out as glyph paths, wrapped to maxW at font size `size`, each row centred
function layout(font, text, size, maxW) {
  const space = font.getAdvanceWidth(' ', size), rows = [[]];
  let x = 0;
  for (const w of text.split(' ')) {
    const ww = font.getAdvanceWidth(w, size);
    if (x && x + ww > maxW) { rows.push([]); x = 0; }
    rows.at(-1).push({ w, x });
    x += ww + space;
  }
  const lineH = size * 1.15, rowW = rows.map(row => row.at(-1).x + font.getAdvanceWidth(row.at(-1).w, size)), wMax = Math.max(...rowW);
  const glyphs = [];
  rows.forEach((row, r) => row.forEach(({ w, x: wx }) => {
    let gx = wx + (wMax - rowW[r]) / 2, first = true;
    for (const ch of w) {
      const g = font.charToGlyph(ch), d = g.getPath(gx, size * 0.85 + r * lineH, size).toPathData(2);
      if (d) { glyphs.push({ d, wordStart: first }); first = false; }
      gx += g.advanceWidth * size / font.unitsPerEm;
    }
  }));
  return { w: wMax, h: rows.length * lineH + size * 0.25, size, glyphs };
}

export default function Interlude() {
  const track = useRef(null), svgs = useRef([]);
  const [shapes, setShapes] = useState(null);  // per line: its layout, once the font has been read
  const [calm, setCalm] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  // build the glyph paths for the current width (and again if the width changes)
  useEffect(() => {
    if (calm) return undefined;
    let alive = true, lastW = 0;
    const build = () => loadFont().then(font => {
      const W = Math.min(innerWidth - 32, 1000);
      if (!alive || W === lastW) return;
      lastW = W;
      const size = Math.max(46, Math.min(76, W / 8.5));
      setShapes(LINES.map(l => layout(font, l.text, size, W)));
    }).catch(() => { if (alive) setCalm(true); });
    build();
    addEventListener('resize', build);
    return () => { alive = false; removeEventListener('resize', build); };
  }, [calm]);

  // the pen: plays a line's letters in sequence on a clock once the scroll reaches it
  useEffect(() => {
    if (!shapes) return undefined;
    const lines = svgs.current.map(svg => {
      const masks = [...svg.querySelectorAll('mask path')], inks = [...svg.querySelectorAll('.ink')], tip = svg.querySelector('.tip');
      let t = 0;
      const plan = masks.map((m, k) => {
        const len = m.getTotalLength(), dur = Math.min(MAX_MS, Math.max(MIN_MS, len / PX_PER_MS));
        if (k) t += svg.dataset.ws[k] === '1' ? WORD_GAP : LETTER_GAP;
        const at = t; t += dur;
        m.style.strokeDasharray = `${len} ${len}`;
        return { m, ink: inks[k], len, at, dur };
      });
      return { svg, tip, plan, total: t, state: 'idle', start: 0 };
    });
    const draw = (L, now) => {
      const e = now - L.start;
      let pen = null;
      for (const s of L.plan) {
        const v = clamp((e - s.at) / s.dur);
        s.m.style.strokeDashoffset = (s.len * (1 - v)).toFixed(1);
        s.ink.style.opacity = v > 0 ? 1 : 0;  // unwritten letters stay hidden (the pen's round cap would leave a dot)
        if (v > 0 && v < 1) pen = s.m.getPointAtLength(s.len * v);
      }
      L.tip.style.opacity = pen ? 1 : 0;
      if (pen) L.tip.setAttribute('transform', `translate(${pen.x.toFixed(1)} ${pen.y.toFixed(1)})`);
      return e < L.total;
    };
    const reset = L => { L.state = 'idle'; for (const s of L.plan) { s.m.style.strokeDashoffset = s.len; s.ink.style.opacity = 0; } L.tip.style.opacity = 0; };
    const finish = L => { L.state = 'done'; for (const s of L.plan) { s.m.style.strokeDashoffset = 0; s.ink.style.opacity = 1; } L.tip.style.opacity = 0; };
    let raf = 0;
    const tick = now => {
      raf = 0;
      let busy = false;
      for (const L of lines) if (L.state === 'play') { if (draw(L, now)) busy = true; else finish(L); }
      if (busy) raf = requestAnimationFrame(tick);
    };
    const play = L => { if (L.state !== 'idle') return; L.state = 'play'; L.start = performance.now(); if (!raf) raf = requestAnimationFrame(tick); };
    lines.forEach(reset);
    let sr = 0;
    const onScroll = () => {
      if (sr) return;
      sr = requestAnimationFrame(() => {
        sr = 0;
        const box = track.current.getBoundingClientRect(), p = clamp(-box.top / (box.height - innerHeight));
        const [one, two] = lines;
        if (p <= 0 && box.top > innerHeight * 0.4) { reset(one); reset(two); }
        if (box.top < innerHeight * 0.35) play(one);
        if (p >= 0.5) { one.svg.style.opacity = 0; play(two); }
        else { one.svg.style.opacity = 1; if (p < 0.4 && two.state !== 'idle') reset(two); }
      });
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); cancelAnimationFrame(sr); };
  }, [shapes]);

  return (
    <section ref={track} className={`v2-inter${calm ? ' calm' : ''}`} aria-label="From side projects to the day job">
      <div className="v2-inter-pin">
        {LINES.map((l, li) => (calm || !shapes ? (
          <p key={l.cls} className={`v2-inter-line ${l.cls}`} style={calm ? { opacity: 1 } : undefined}>{l.text}</p>
        ) : (
          <svg key={l.cls} ref={el => { svgs.current[li] = el; }} className={`v2-inter-ink ${l.cls}`} role="img" aria-label={l.text}
            data-ws={shapes[li].glyphs.map(g => (g.wordStart ? '1' : '0')).join('')}
            viewBox={`-4 -4 ${(shapes[li].w + 8).toFixed(0)} ${(shapes[li].h + 8).toFixed(0)}`} style={{ width: shapes[li].w + 8 }}>
            <defs>
              {shapes[li].glyphs.map((g, k) => (
                <mask key={k} id={`ink-${l.cls}-${k}`} maskUnits="userSpaceOnUse" x="-20" y="-20" width={shapes[li].w + 40} height={shapes[li].h + 40}>
                  {/* the pen: wide enough to cover the stroke's full thickness as it travels along one edge */}
                  <path d={g.d} fill="none" stroke="#fff" strokeWidth={(shapes[li].size * 0.16).toFixed(1)} strokeLinecap="round" strokeLinejoin="round" />
                </mask>
              ))}
            </defs>
            {shapes[li].glyphs.map((g, k) => <path key={k} className="ink" d={g.d} mask={`url(#ink-${l.cls}-${k})`} />)}
            <circle className="tip" r={(shapes[li].size * 0.045).toFixed(1)} />
          </svg>
        )))}
      </div>
    </section>
  );
}
