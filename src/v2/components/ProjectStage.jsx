import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { COLOR, LABEL, MONTH_SHORT, categories, kindOf } from '../lib/projects';
import { bentoLayout, scatterLayout } from '../lib/layout';

// Every project is one tile, positioned absolutely. "grid" packs them into a bento; "scatter" shrinks the same tiles
// into dots on when-built × analysis-vs-build. CSS transitions on transform/size do the morph between the two.
const shortName = t => t.split(/[:(]| - /)[0].trim();

// The scatter's axes and gridlines as one SVG so they can be drawn like pen strokes (see .v2-draw in v2.css).
function Axes({ width, box, ticks }) {
  const ox = box.L - 16, top = box.T - 14, bottom = box.H - box.B + 8, right = width - 2;
  const h = bottom - top, w = right - ox;
  const yAxis = `M ${ox} ${bottom} C ${ox - 1.6} ${bottom - h * 0.35}, ${ox + 1.4} ${bottom - h * 0.7}, ${ox} ${top}`;
  const xAxis = `M ${ox} ${bottom} C ${ox + w * 0.35} ${bottom + 1.4}, ${ox + w * 0.7} ${bottom - 1.6}, ${right} ${bottom}`;
  return (
    <svg className="v2-axsvg" width={width} height={box.H}>
      <defs>
        <mask id="v2-grid-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={box.H}>
          {ticks.map(({ m, x }, i) => (
            <line key={m} className="v2-draw grid" style={{ '--i': i }} pathLength="1" x1={x} x2={x} y1={top} y2={bottom} stroke="#fff" strokeWidth="4" />
          ))}
        </mask>
      </defs>
      <g mask="url(#v2-grid-reveal)">
        {ticks.map(({ m, x }) => <line key={m} className="gl" x1={x} x2={x} y1={top} y2={bottom} />)}
      </g>
      <path className="v2-draw ax ay" pathLength="1" d={yAxis} />
      <path className="v2-draw ax ax2" pathLength="1" d={xAxis} />
      <path className="v2-draw ax head h1" pathLength="1" d={`M ${ox - 5} ${top + 8} L ${ox} ${top} L ${ox + 5} ${top + 8}`} />
      <path className="v2-draw ax head h2" pathLength="1" d={`M ${right - 8} ${bottom - 5} L ${right} ${bottom} L ${right - 8} ${bottom + 5}`} />
    </svg>
  );
}

// v2 serves compressed WebP copies of the project screenshots (public/v2img), leaving the live site's files alone
const v2img = src => `/v2img/${src.split('/').pop().replace(/\.\w+$/, '')}.webp`;

export default function ProjectStage({ projects, mode, filter }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [peek, setPeek] = useState(null);  // { id, x, y } in scatter view
  // nothing animates until the projects are scrolled to: then the grid's tiles rise in one after another, or the
  // scatter draws its axes and pops its dots in time order ('wait' holds every animation at its first frame)
  const [intro, setIntro] = useState('wait');
  useEffect(() => {
    if (intro === 'wait') {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIntro('run'); }, { threshold: 0.25 });
      io.observe(ref.current);
      return () => io.disconnect();
    }
    if (intro === 'run') {
      const id = setTimeout(() => setIntro('done'), 2600);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [intro]);

  useLayoutEffect(() => {
    const el = ref.current;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const inFilter = p => filter === 'all' || categories(p).includes(filter);
  const visible = useMemo(() => projects.filter(p => filter === 'all' || categories(p).includes(filter)), [projects, filter]);
  const layout = useMemo(() => {
    if (!width) return null;
    return mode === 'grid' ? bentoLayout(visible, width) : scatterLayout(projects, width);
  }, [mode, visible, projects, width]);
  // where a filtered-out tile fades away in grid view: its spot in the unfiltered bento
  const fullGrid = useMemo(() => (width ? bentoLayout(projects, width) : null), [projects, width]);

  const showPeek = p => {
    if (mode !== 'scatter' || !layout) return;
    const at = layout.pos.get(p.id), stageW = width;
    let x = at.x + 34;
    if (x + 290 > stageW) x = at.x - 300;
    setPeek({ id: p.id, x: Math.max(8, x), y: Math.max(10, Math.min(layout.height - 300, at.y - 40)) });
  };
  const hidePeek = () => setPeek(null);
  const lastPointer = useRef('mouse');  // how the last tile press happened (touch gets tap-to-preview)
  const glow = e => {
    if (mode !== 'grid') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const peeked = peek && projects.find(p => p.id === peek.id);

  return (
    <div ref={ref} onClick={e => { if (peek && !e.target.closest('.v2-tile')) hidePeek(); }} className={`v2-stage ${mode}${peek ? ' peeking' : ''}${intro !== 'done' ? ` intro intro-${intro}` : ''}`} style={{ height: layout ? layout.height : 600 }}>
      {mode === 'scatter' && layout && (
        <div className="v2-axes" aria-hidden="true">
          {/* open chart, "drawn" on: the axes are pen strokes (a little hand wobble, arrowheads), the dashed month
              gridlines draw top to bottom through a mask, then the labels and handwritten titles write on */}
          <Axes width={width} box={layout.box} ticks={layout.ticks} />
          {layout.ticks.map(({ m, x }, i) => (
            <span key={m} className="tick" style={{ left: x - 18, bottom: layout.box.B - 30, '--i': i, '--n': `${MONTH_SHORT[m % 12]} ${Math.floor(m / 12)}`.length }}>{MONTH_SHORT[m % 12]} {Math.floor(m / 12)}</span>
          ))}
          <span className="ttl" style={{ left: layout.box.L - 10, top: layout.box.T - 42 }}>↑ analysis</span>
          <span className="ttl" style={{ left: layout.box.L - 4, bottom: layout.box.B }}>builds ↓</span>
          <span className="ttl" style={{ right: 0, bottom: 2 }}>when I built it →</span>
        </div>
      )}

      {layout && projects.map(p => {
        const at = layout.pos.get(p.id), kind = kindOf(p), shown = inFilter(p);
        const where = at ?? fullGrid?.pos.get(p.id);
        const style = { '--c': COLOR[kind] };
        if (where) Object.assign(style, { width: where.w, height: where.h, transform: `translate(${where.x}px, ${where.y}px)` });
        if (mode === 'scatter' && at) Object.assign(style, { '--d': `${at.order * 70}ms`, '--fl': `${at.drift.toFixed(2)}s`, '--fd': `${(-at.drift * (at.order % 5) / 5).toFixed(2)}s` });
        if (mode === 'grid' && at && intro !== 'done') style['--d'] = `${visible.indexOf(p) * 60}ms`;
        return (
          <a key={p.id} className={`v2-tile ${where?.size ?? ''}${shown && at ? '' : ' out'}${peek?.id === p.id ? ' hot' : ''}`}
            href={p.link} target="_blank" rel="noopener noreferrer" style={style}
            aria-label={`${p.title}, ${LABEL[kind]}, ${p.date}`} tabIndex={shown && at ? 0 : -1} aria-hidden={shown && at ? undefined : true}
            onPointerDown={e => { lastPointer.current = e.pointerType; }} onPointerMove={glow} onPointerEnter={e => { if (e.pointerType !== 'touch') showPeek(p); }} onPointerLeave={e => { if (e.pointerType !== 'touch') hidePeek(); }}
            onFocus={() => { if (lastPointer.current !== 'touch') showPeek(p); }} onBlur={hidePeek}
            onClick={e => {
              // on touch screens there's no hover, so in the scatter the first tap shows the preview and the second opens it
              if (mode === 'scatter' && lastPointer.current === 'touch' && peek?.id !== p.id) { e.preventDefault(); showPeek(p); return; }
              window.gtag?.('event', 'project_click', { project_name: p.title, project_url: p.link, view: mode });
            }}>
            <img src={v2img(p.image)} alt="" loading="lazy" decoding="async" />
            <span className="body">
              <span className="cat"><i />{LABEL[kind]}</span>
              <h3>{p.title}</h3>
              <span className="desc">{p.description}</span>
              <span className="meta"><span>{p.date}</span><span className="go">open ↗</span></span>
            </span>
            {/* near the right edge the label goes on the dot's left, so it never runs off the chart */}
            <span className={`lab${mode === 'scatter' && at && at.x > width - 240 ? ' flip' : ''}`} aria-hidden="true">{shortName(p.title)}</span>
          </a>
        );
      })}

      {mode === 'grid' && layout && visible.filter(p => p.note).map(p => {
        const at = layout.pos.get(p.id);
        return (
          // first-row tiles get the note in the margin above; lower tiles carry it inside their top-left corner
          <div key={`n${p.id}`} className={`v2-scrawl${at.y > 0 ? ' inside' : ''}`} aria-hidden="true"
            style={{ transform: at.y > 0 ? `translate(${at.x + 16}px, ${at.y + 14}px) rotate(-2deg)` : `translate(${at.x + at.w - 230}px, ${at.y - 36}px) rotate(-3deg)` }}>
            {p.note}
            <svg viewBox="0 0 44 28"><path d="M4 6 C 18 4, 32 10, 38 22 M38 22 l-8 -1 M38 22 l1 -8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </div>
        );
      })}

      {mode === 'scatter' && (
        <div className={`v2-peek${peeked ? ' on' : ''}`} style={peek ? { left: peek.x, top: peek.y } : undefined} aria-hidden="true">
          {peeked && (<><img src={v2img(peeked.image)} alt="" /><div><b>{peeked.title}</b><p>{peeked.description.slice(0, 150)}…</p></div></>)}
        </div>
      )}
    </div>
  );
}
