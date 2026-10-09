import { useEffect, useRef, useState } from 'react';

// Types `text` out one character at a time after `delay` ms, with a caret that blinks a few times then fades.
// The untyped rest is kept in place but invisible, so the line never shifts the layout. Reduced motion: shown whole.
// `whenVisible` holds the clock until the line has scrolled into view.
export default function TypedLine({ text, delay = 0, speed = 45, className = '', as = 'p', whenVisible = false }) {
  const Tag = as;
  const [n, setN] = useState(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? text.length : 0));
  const [seen, setSeen] = useState(!whenVisible);
  const ref = useRef(null);
  useEffect(() => {
    if (seen) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { threshold: 1 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  useEffect(() => {
    if (!seen || n >= text.length) return undefined;
    const t = setTimeout(() => setN(c => c + 1), n === 0 ? delay : speed + (text[n - 1] === ' ' ? 30 : 0));
    return () => clearTimeout(t);
  }, [n, text, delay, speed, seen]);
  const done = n >= text.length;
  return (
    <Tag ref={ref} className={`v2-typed ${className}${n > 0 ? ' started' : ''}${done ? ' done' : ''}`} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <i className="v2-caret" aria-hidden="true" />
      <span aria-hidden="true" className="rest">{text.slice(n)}</span>
    </Tag>
  );
}
