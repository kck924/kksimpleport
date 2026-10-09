import { useEffect, useState } from 'react';

// A time-elapsed dial, like the live site's: one floating dot per full year above the rings, then five rings,
// outermost first: months (out of 12) and days (out of 31) elapsed, and the current hour, minute and second in
// Eastern time, so the inner rings tick live. Hover a ring or a dot for its value.
function elapsed(start, now) {
  let y = now.getFullYear() - start.getFullYear();
  let m = now.getMonth() - start.getMonth();
  let d = now.getDate() - start.getDate();
  if (d < 0) { m -= 1; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y -= 1; m += 12; }
  return { y, m, d };
}
const eastern = now => new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

export default function MsClock({ start, label }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const [tip, setTip] = useState(null);  // { name, value, color, x, y } for the hovered ring or year dot
  const show = (name, value, color) => e => {
    const box = e.currentTarget.closest('.v2-clock-dial').getBoundingClientRect();
    setTip({ name, value, color, x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const hide = () => setTip(null);

  const { y, m, d } = elapsed(new Date(`${start}T00:00:00`), now), et = eastern(now);
  const rings = [
    ['months', m, 12, 58, '#a78bfa'], ['days', d, 31, 48, '#4ade80'], ['hours (ET)', et.getHours(), 24, 38, '#fb923c'],
    ['minutes (ET)', et.getMinutes(), 60, 28, '#f472b6'], ['seconds (ET)', et.getSeconds(), 60, 18, '#fbbf24'],
  ];
  const live = tip && rings.find(r => r[0] === tip.name);  // a hovered ring's value keeps ticking
  const tipValue = live ? `${live[1]}/${live[2]}` : tip?.value;
  return (
    <div className="v2-clock">
      <div>
        <div className="v2-lbl">{label}</div>
        <div className="v2-clocknum">{y}y {m}m {d}d</div>
      </div>
      <div className="v2-clock-dial">
        <div className="v2-clock-years" aria-hidden="true">
          {Array.from({ length: y }, (_, i) => <i key={i} style={{ '--i': i }} onPointerMove={show(`year ${i + 1}`, '', '#00d9ff')} onPointerLeave={hide} />)}
        </div>
        <svg viewBox="0 0 132 132" role="img" aria-label={`${y} years, ${m} months and ${d} days`}>
          {rings.map(([name, v, max, r, c], idx) => {
            const C = 2 * Math.PI * r, f = v / max;
            // --j: drawing order, innermost first, so the dial winds outward like a spiral
            return (
              <g key={name} style={{ '--j': rings.length - 1 - idx, '--C': C.toFixed(1) }}>
                <circle className="track" cx="66" cy="66" r={r} fill="none" stroke="var(--line)" strokeWidth="7" transform="rotate(-90 66 66)" />
                {/* always rendered (so a ring that ticks back to zero doesn't replay its entrance); hidden at zero, where
                    the round end caps would otherwise still draw a dot */}
                <circle className="ring" cx="66" cy="66" r={r} fill="none" stroke={c} strokeWidth="7" strokeLinecap="round"
                  style={{ '--len': (C * Math.min(1, f)).toFixed(1), visibility: f > 0 ? undefined : 'hidden' }} transform="rotate(-90 66 66)"
                  onPointerMove={show(name, `${v}/${max}`, c)} onPointerLeave={hide} />
              </g>
            );
          })}
        </svg>
        {tip && (
          <div className="v2-clock-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
            <span style={{ color: tip.color }}>{tip.name}</span>{tipValue && `: ${tipValue}`}
          </div>
        )}
      </div>
    </div>
  );
}
