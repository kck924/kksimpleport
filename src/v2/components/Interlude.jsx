import { useEffect, useRef } from 'react';
import { COLOR, PROJECTS, kindOf } from '../lib/projects';

// A pinned, scroll-driven bridge from the projects to the career timeline. One dot per project (in its category
// colour) floats around "that's the stuff nobody asked for."; as you scroll they drift together and merge into a
// single bright dot, the line turns into "here's the stuff they did.", and the dot drops toward the timeline below,
// where the spiral starts drawing from its centre. Reduced motion: both lines, still, no pinning.
const DOTS = PROJECTS.map((p, i) => {
  const a = i * 2.39996, r = 0.45 + ((i * 0.618034) % 1) * 0.55;  // golden-angle scatter, so it's even but not a grid
  return { c: COLOR[kindOf(p)], x: Math.cos(a) * r, y: Math.sin(a) * r * 0.75, s: 12 + ((i * 7) % 5) * 3, ph: i * 0.9 };
});
const clamp = v => Math.min(1, Math.max(0, v));
const ease = t => t * t * (3 - 2 * t);
const band = (p, a, b) => ease(clamp((p - a) / (b - a)));

export default function Interlude() {
  const track = useRef(null), dots = useRef([]), one = useRef(null), two = useRef(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let r = 0;
    const update = () => {
      r = 0;
      const box = track.current.getBoundingClientRect(), p = clamp(-box.top / (box.height - innerHeight));
      const W = Math.min(innerWidth, 1100) * 0.42, H = innerHeight * 0.36, t = performance.now() / 1000;
      const gather = band(p, 0.3, 0.66), fall = band(p, 0.74, 1);
      dots.current.forEach((el, i) => {
        const d = DOTS[i], wob = (1 - gather) * 10;
        // they gather just under the line (not on top of it), then the survivor drops away and fades into the timeline
        const gy = 90, x = d.x * W * (1 - gather) + Math.sin(t + d.ph) * wob;
        const y = d.y * H * (1 - gather) + gy * gather + Math.cos(t * 0.8 + d.ph) * wob + fall * innerHeight * 0.32;
        // on merging, every dot but the first fades out and the survivor turns cyan and brightens
        const last = i === 0, o = band(p, 0.02, 0.14) * (last ? 1 - band(p, 0.88, 0.99) : 1 - band(p, 0.62, 0.72));
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(last ? 1 + gather * 0.4 : 1 - gather * 0.3).toFixed(3)})`;
        el.style.opacity = o.toFixed(3);
        if (last) el.style.setProperty('--c', gather > 0.92 ? 'var(--cyan)' : d.c);
      });
      one.current.style.opacity = (band(p, 0.04, 0.16) * (1 - band(p, 0.36, 0.46))).toFixed(3);
      one.current.style.transform = `translateY(${(-band(p, 0.36, 0.46) * 16).toFixed(1)}px)`;
      two.current.style.opacity = band(p, 0.5, 0.6).toFixed(3);  // stays up and scrolls away as the timeline arrives
      two.current.style.transform = `translateY(${((1 - band(p, 0.5, 0.6)) * 16).toFixed(1)}px)`;
      // keep the dots gently drifting while the gathering hasn't started yet
      if (p > 0 && p < 0.3) r = requestAnimationFrame(update);
    };
    const onScroll = () => { if (!r) r = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(r); };
  }, []);

  return (
    <section ref={track} className="v2-inter" aria-label="From side projects to the day job">
      <div className="v2-inter-pin">
        <div className="v2-inter-dots" aria-hidden="true">
          {DOTS.map((d, i) => <i key={i} ref={el => { dots.current[i] = el; }} style={{ '--c': d.c, width: d.s, height: d.s, margin: -d.s / 2 }} />)}
        </div>
        <p ref={one} className="v2-inter-line one">that&apos;s the stuff nobody asked for.</p>
        <p ref={two} className="v2-inter-line two">here&apos;s the stuff they did.</p>
      </div>
    </section>
  );
}
