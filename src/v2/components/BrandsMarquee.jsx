import { useEffect, useRef } from 'react';
import { BRANDS } from '../lib/brands';

// "Brands I've worked with": two full-bleed rows of logos drifting in opposite directions, fading out at both edges.
// Each track holds its logos twice and slides by half its width, so the loop is seamless. Hovering a row eases it to
// a stop (and back up on leave); the logo under the pointer brightens and shows its name. Reduced motion: a static,
// wrapped set of logos.
const LANES = [BRANDS.filter((_, i) => i % 2 === 0), BRANDS.filter((_, i) => i % 2 === 1)];
const AREA = 2200, MAX_H = 40, MAX_W = 136;  // px: roughly equal visual area per logo, within a height and width cap
const sizeOf = r => { const h = Math.min(MAX_H, Math.sqrt(AREA / r)); return { height: +h.toFixed(1), width: +Math.min(MAX_W, h * r).toFixed(1) }; };

function Logo({ b, dup }) {
  return (
    <span className="v2-brand" aria-hidden={dup || undefined}>
      <img src={`/logos/brands/${b.id}.png`} alt={dup ? '' : b.name} style={sizeOf(b.ratio)} />
      <span className="nm">{b.name}</span>
    </span>
  );
}

export default function BrandsMarquee() {
  const root = useRef(null);
  useEffect(() => {
    const off = [];
    root.current.querySelectorAll('.v2-lane').forEach(lane => {
      const anim = lane.querySelector('.v2-track').getAnimations()[0];
      if (!anim) return;  // reduced motion: nothing to ease
      let raf = 0;
      const ease = to => {
        cancelAnimationFrame(raf);
        const step = () => {
          const r = anim.playbackRate + (to - anim.playbackRate) * 0.12;
          anim.playbackRate = Math.abs(r - to) < 0.01 ? to : r;
          if (anim.playbackRate !== to) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      };
      const stop = () => ease(0), go = () => ease(1);
      lane.addEventListener('pointerenter', stop);
      lane.addEventListener('pointerleave', go);
      off.push(() => { lane.removeEventListener('pointerenter', stop); lane.removeEventListener('pointerleave', go); cancelAnimationFrame(raf); });
    });
    return () => off.forEach(f => f());
  }, []);

  return (
    <section ref={root} className="v2-brands" aria-labelledby="v2-brands-title">
      <h2 id="v2-brands-title">Brands I&apos;ve Worked With</h2>
      <div className="v2-marquee">
        {LANES.map((lane, i) => (
          <div key={i} className={`v2-lane${i ? ' rev' : ''}`}>
            <div className="v2-track" style={{ '--dur': `${i ? 52 : 46}s` }}>
              {lane.map(b => <Logo key={b.id} b={b} />)}
              {lane.map(b => <Logo key={`${b.id}-dup`} b={b} dup />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
