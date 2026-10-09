import { useEffect, useRef, useState } from 'react';
import ProfileImageRotator from '../components/ProfileImageRotator';
import Controls from './components/Controls';
import BrandsMarquee from './components/BrandsMarquee';
import CareerSpiral from './components/CareerSpiral';
import DotLogo, { LOGO_DONE_MS } from './components/DotLogo';
import FloatingHeader from './components/FloatingHeader';
import Interlude from './components/Interlude';
import MsClock from './components/MsClock';
import ProjectStage from './components/ProjectStage';
import TypedLine from './components/TypedLine';
import { PROJECTS } from './lib/projects';

// v2 homepage: a full-screen hero (photo, dot-letter name drawn on chart axes, handwritten title, two dials) with a
// scroll cue; the projects (bento grid, or the same tiles as a scatter) only animate in once scrolled to. Scrolling
// flies the logo up into a floating header, which picks up the project controls once the page's own are gone. Lives at /v2/ beside the live homepage.
const readView = () => (new URLSearchParams(location.search).get('view') === 'grid' ? 'grid' : 'scatter');  // scatter is the default
// the hero's entrance runs in sequence: the logo draws and its dots land, then the two dials unfurl, then the tagline types
const CLOCKS_AT = LOGO_DONE_MS, TAGLINE_AT = CLOCKS_AT + 1500;
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

export default function App() {
  const [mode, setMode] = useState(readView);
  const [filter, setFilter] = useState('all');
  const [stuck, setStuck] = useState(false);
  const [past, setPast] = useState(false);  // scrolled beyond the end of the projects
  // the floating header only carries the project controls while you're in the projects, and never in the grid (whose
  // own heading and controls stick there instead)
  const [docked, setDocked] = useState(false);
  const sentinel = useRef(null), endSentinel = useRef(null), projects = useRef(null), logoBox = useRef(null), logoSlot = useRef(null);
  const cue = useRef(null), note = useRef(null);

  const changeMode = m => {
    setMode(m);
    const u = new URL(location.href);
    if (m === 'grid') u.searchParams.set('view', 'grid'); else u.searchParams.delete('view');
    history.replaceState(null, '', u);
  };
  const controls = { filter, setFilter, mode, setMode: changeMode };

  // the floating header shows once the page's filter bar has scrolled up under it (so there's never two sets of controls)
  useEffect(() => {
    // read on scroll rather than with an IntersectionObserver: a jump straight past a sentinel (a fling, an anchor,
    // the back-to-top button) never crosses it, so an observer would miss the change
    let r = 0;
    const check = () => {
      r = 0;
      setStuck(sentinel.current.getBoundingClientRect().top < 64);
      setPast(endSentinel.current.getBoundingClientRect().top < 64);
    };
    const onScroll = () => { if (!r) r = requestAnimationFrame(check); };
    check();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(r); };
  }, []);

  // scroll-linked: the hero logo shrinks and slides into the header's logo slot, reaching it exactly as its natural
  // scroll position meets the header (so the vertical motion is just the scroll), then hands over to the header copy
  useEffect(() => {
    const box = logoBox.current, slot = logoSlot.current, calm = matchMedia('(prefers-reduced-motion: reduce)');
    let geo, raf = 0;
    const update = () => {
      raf = 0;
      const run = geo.top - geo.tTop, p = run > 0 ? Math.min(1, Math.max(0, scrollY / run)) : 1;
      if (calm.matches || p === 0) { box.style.transform = ''; box.style.removeProperty('--p'); }
      else {
        const ex = 1 - (1 - p) * (1 - p);  // sideways leads a little, so the path curves up into the corner
        box.style.transform = `translate(${((geo.tLeft - geo.left) * ex).toFixed(1)}px, 0) scale(${(1 + (geo.s - 1) * p).toFixed(4)})`;
        box.style.setProperty('--p', p.toFixed(3));
      }
      setDocked(p >= 1);
    };
    const measure = () => {
      box.style.transform = '';
      const b = box.getBoundingClientRect(), t = slot.getBoundingClientRect();
      geo = { top: b.top + scrollY, left: b.left, tTop: t.top, tLeft: t.left, s: t.width / b.width };
      update();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(measure);
    ro.observe(box); ro.observe(slot); ro.observe(document.documentElement);
    addEventListener('scroll', onScroll, { passive: true });
    return () => { ro.disconnect(); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // scroll-linked: the "the fun stuff" cue and the projects heading trade places. Both travel toward each other along
  // the same path (centre to centre, growing to the heading's size) and cross-fade through a blur, so the cue reads as
  // morphing into the heading; it settles by the time the heading is a third of the way down the screen
  useEffect(() => {
    const a = cue.current, b = note.current, calm = matchMedia('(prefers-reduced-motion: reduce)');
    let geo, raf = 0;
    const smooth = (x, lo, hi) => { const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
    const update = () => {
      raf = 0;
      if (calm.matches) { a.style.cssText = ''; b.style.cssText = ''; return; }
      const p = geo.end > 0 ? Math.min(1, Math.max(0, scrollY / geo.end)) : 1, e = smooth(p, 0, 1);
      // the heading fades in before the cue fades out, so mid-morph there's one solid shape rather than two ghosts
      const fadeIn = smooth(p, .2, .55), fadeOut = smooth(p, .45, .8), blur = (Math.sin(Math.PI * smooth(p, .15, .85)) * 3).toFixed(1);
      a.style.transform = `translate(${(geo.dx * e).toFixed(1)}px, ${(geo.dy * e).toFixed(1)}px) scale(${(1 + (geo.k - 1) * e).toFixed(3)})`;
      a.style.opacity = (1 - fadeOut).toFixed(3);
      a.style.filter = `blur(${blur}px)`;
      a.style.pointerEvents = p > .5 ? 'none' : '';
      b.style.transform = p >= 1 ? '' : `translate(${(-geo.dx * (1 - e)).toFixed(1)}px, ${(-geo.dy * (1 - e)).toFixed(1)}px) scale(${(1 + (1 / geo.k - 1) * (1 - e)).toFixed(3)})`;
      b.style.opacity = p >= 1 ? '' : fadeIn.toFixed(3);
      b.style.filter = p >= 1 ? '' : `blur(${blur}px)`;
    };
    const measure = () => {
      a.style.cssText = ''; b.style.cssText = '';
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      geo = {
        dx: rb.left + rb.width / 2 - (ra.left + ra.width / 2), dy: rb.top + rb.height / 2 - (ra.top + ra.height / 2),
        k: parseFloat(getComputedStyle(b).fontSize) / parseFloat(getComputedStyle(a).fontSize),
        end: rb.top + scrollY - innerHeight * 0.33,
      };
      update();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    addEventListener('scroll', onScroll, { passive: true });
    return () => { ro.disconnect(); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="v2">
      <FloatingHeader docked={docked} stuck={stuck && !past && mode !== 'grid'} slotRef={logoSlot} onTop={() => scrollTo({ top: 0, behavior: smooth() })} {...controls} />
      <div className="v2-wrap">
        <header className="v2-hero">
          <div className="v2-herorow">
            <div className="v2-name">
              <ProfileImageRotator images={['/v2img/kevin.webp', '/v2img/kkguitar.webp', '/v2img/kkhanks.webp', '/v2img/kkom2.webp']} />
              <div className="v2-nametext">
                <div ref={logoBox} className={`v2-logobox${docked ? ' docked' : ''}`}><DotLogo /></div>
                <div className="v2-role">Director, Head of Advertiser Analytics <span className="v2-at"><i>@</i> Microsoft</span></div>
                <TypedLine className="v2-sub" text="Using data to create experiences" delay={TAGLINE_AT} />
                <div className="v2-contact">
                  <a href="mailto:kevinklein333@gmail.com">kevinklein333@gmail.com</a>
                  <a href="https://www.linkedin.com/in/kevinkleinads" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
                </div>
              </div>
            </div>
            <div className="v2-clocks" style={{ '--at': `${CLOCKS_AT}ms` }}>
              <MsClock start="2017-01-10" label="Time at Microsoft" />
              <MsClock start="2022-10-01" label="Time in role" />
            </div>
          </div>
          <button ref={cue} type="button" className="v2-cue" onClick={() => projects.current.scrollIntoView({ behavior: smooth(), block: 'start' })}>
            the fun stuff
            <svg viewBox="0 0 24 34" aria-hidden="true"><path d="M12 2 C 10 12, 14 20, 12 30 M12 30 l-6 -7 M12 30 l6 -7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
        </header>

        <section ref={projects} className="v2-projects" aria-label="Projects">
          <div className="v2-kicker">The work <span>side projects, 2025 – now</span></div>
          {/* in the grid the heading and the filters stick under the floating header while you scroll the tiles */}
          <div className={`v2-phead${mode === 'grid' ? ' sticky' : ''}`}>
          <div className="v2-bar">
            <div ref={note} className="v2-note">
              <svg viewBox="0 0 62 36" aria-hidden="true"><path d="M4 6 C 20 2, 40 6, 46 22 M46 22 l-8 -2 M46 22 l2 -8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              things I build when nobody&apos;s asking me to
            </div>
            <Controls {...controls} parts="views" />
          </div>
          {/* the toggle stays put in the row above; the scatter gets a typed title, and the filters sit under it */}
          {mode === 'scatter' && <TypedLine as="h3" className="v2-charttitle" text="Some of KCK's Projects" delay={150} whenVisible />}
          {mode === 'scatter' && <p className="v2-dek">Each dot is a project: when I built it, and whether it leans analysis or build.</p>}
          <div className="v2-filterrow"><Controls {...controls} parts="filters" /></div>
          </div>
          {/* once this scrolls under the top edge, the page's own controls are gone and the floating header takes over */}
          <div ref={sentinel} className="v2-sentinel" aria-hidden="true" />
          <ProjectStage projects={PROJECTS} mode={mode} filter={filter} />
          {mode === 'scatter' && (
            <p className="v2-source"><b>Note</b> Vertical position is by category, not a measured score. <b>Source</b> kckdata.com project log</p>
          )}
          <div ref={endSentinel} className="v2-sentinel" aria-hidden="true" />
        </section>

        <Interlude />

        <section className="v2-career" aria-label="Professional timeline">
          <div className="v2-kicker">The career <span>2010 – now</span></div>
          <CareerSpiral />
          <p className="v2-source"><b>Note</b> Straightened, each step is one move, not a measured scale. Hover a stop for the story.</p>
        </section>

        <BrandsMarquee />

        <footer className="v2-foot">
          <span>Kevin Klein · kckdata.com</span>
          <span className="v2-hand">thanks for poking around ✌</span>
        </footer>
      </div>
    </div>
  );
}
