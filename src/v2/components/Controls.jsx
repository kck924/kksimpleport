import { COLOR, KINDS, LABEL, countFor } from '../lib/projects';

const SHORT = { all: 'All', analytics: 'Analytics', genai: 'GenAI', engineering: 'Eng', misc: 'Misc' };

// Filter chips + Grid/Scatter toggle. Rendered in the page (as two separate pieces, `parts`) and again, compact and
// whole, in the floating header.
export default function Controls({ filter, setFilter, mode, setMode, compact = false, parts = 'all' }) {
  return (
    <div className={`v2-controls${compact ? ' compact' : ''}`}>
      {parts !== 'views' && <div className="v2-filters" role="group" aria-label="Filter projects">
        {['all', ...KINDS].map(k => (
          <button key={k} type="button" className="v2-chip" aria-pressed={filter === k} style={{ '--c': COLOR[k] ?? '#e8ebf1' }}
            onClick={() => setFilter(k)}>
            <i />{compact ? null : <>{k === 'all' ? 'Everything' : LABEL[k]} <small>{countFor(k)}</small></>}
            {compact && <span className="v2-chip-short">{SHORT[k]}</span>}
          </button>
        ))}
      </div>}
      {parts !== 'filters' && <div className="v2-views" role="group" aria-label="View">
        <button type="button" aria-pressed={mode === 'grid'} onClick={() => setMode('grid')}>
          <svg viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="7" height="5" rx="1.5" /><rect x="9.5" y="1" width="3.5" height="5" rx="1.2" /><rect x="1" y="7.5" width="3.5" height="5.5" rx="1.2" /><rect x="6" y="7.5" width="7" height="5.5" rx="1.5" /></svg>
          Grid
        </button>
        <button type="button" aria-pressed={mode === 'scatter'} onClick={() => setMode('scatter')}>
          <svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="3" cy="10" r="2" /><circle cx="7" cy="5" r="2" /><circle cx="11.5" cy="8" r="2" /><circle cx="10" cy="2.5" r="1.4" /></svg>
          Scatter
        </button>
      </div>}
    </div>
  );
}
