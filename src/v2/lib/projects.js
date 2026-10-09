// Helpers shared by the v2 components: one colour per kind of project, dates as month indexes, and the
// project list sorted newest first.
import { portfolioData } from '../../data/projects';

export const KINDS = ['analytics', 'genai', 'engineering', 'misc'];
export const COLOR = { analytics: '#00d9ff', genai: '#a78bfa', engineering: '#fb923c', misc: '#f472b6' };
export const LABEL = { analytics: 'Analytics', genai: 'Generative AI', engineering: 'Engineering', misc: 'Miscellaneous' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = MONTHS.map(m => m.slice(0, 3));

export const categories = p => [].concat(p.category);
// the kind a project is drawn as (its colour, its scatter band): the most specific of its categories
export const kindOf = p => ['misc', 'genai', 'engineering', 'analytics'].find(k => categories(p).includes(k));
export const monthIndex = p => { const [m, y] = p.date.split(' '); return +y * 12 + MONTHS.indexOf(m); };

// newest first; within a month, the earlier-added project leads
export const PROJECTS = [...portfolioData].sort((a, b) => monthIndex(b) - monthIndex(a) || a.id - b.id);
export const countFor = k => (k === 'all' ? PROJECTS.length : PROJECTS.filter(p => categories(p).includes(k)).length);
