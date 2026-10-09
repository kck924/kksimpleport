// Portfolio projects, shared by the current homepage (src/App.jsx) and the v2 redesign (src/v2/).
// Optional field used only by v2: `note` = a handwritten margin note shown beside the tile.

export const portfolioData = [
  {
    id: 1,
    title: 'Beasts of Bellevue Fantasy Dashboard',
    description: 'Full-stack fantasy football league tracker with 40+ components featuring advanced data visualization, historical records, head-to-head analysis, draft explorer, and power rankings. Built with React 19 and deployed on Firebase.',
    tags: ['React', 'Recharts', 'Tailwind CSS'],
    category: 'analytics',
    date: 'July 2025',
    tools: 'React, Recharts, Firebase',
    link: 'https://beastsofbellevue.com',
    image: '/bob.png',
    languages: [
      { name: 'JavaScript (JSX)', percent: 75, color: '#00d9ff' },
      { name: 'CSS', percent: 15, color: '#a78bfa' },
      { name: 'JSON', percent: 8, color: '#4ade80' },
      { name: 'HTML', percent: 2, color: '#fb923c' }
    ]
  },
  {
    id: 2,
    title: 'Trading Champion Portfolio Analytics',
    description: 'Advanced trading analytics platform featuring OHLC candlestick charts, win rate histograms, length-depth scatter analysis, rolling winning percentage trends, and edge/expectancy calculations. Built with React 19 and TypeScript.',
    tags: ['React', 'TypeScript', 'Recharts'],
    category: 'analytics',
    date: 'August 2025',
    tools: 'React, TypeScript, Tailwind CSS',
    link: 'https://msp-analytics.web.app/',
    image: '/msp.png',
    languages: [
      { name: 'TypeScript', percent: 59, color: '#00d9ff' },
      { name: 'JSON', percent: 40, color: '#4ade80' },
      { name: 'JS/HTML/CSS', percent: 1, color: '#9b9b9b' }
    ]
  },
  {
    id: 3,
    title: 'Baseball LLM Semantic Layer',
    description: 'Natural language to SQL application powered by Claude 3.5 Sonnet. Users ask questions about MLB data in plain English and receive SQL queries, results from BigQuery, and natural language explanations. Full-stack app with FastAPI backend and React frontend deployed on Cloud Run.',
    tags: ['Python', 'Claude', 'BigQuery'],
    category: ['genai', 'analytics'],
    date: 'September 2025',
    tools: 'FastAPI, Claude, React',
    link: 'https://baseball-llm-analytics.web.app/',
    image: '/baseball.png',
    languages: [
      { name: 'JavaScript', percent: 50, color: '#00d9ff' },
      { name: 'Python', percent: 48, color: '#a78bfa' },
      { name: 'HTML', percent: 2, color: '#fb923c' },
      { name: 'CSS', percent: 0.2, color: '#9b9b9b' }
    ]
  },
  {
    id: 4,
    title: 'MCPS School Boundary Viewer',
    description: 'Interactive mapping application exploring 25+ years of Montgomery County Public Schools boundary changes (1999-2025). Features time travel through historical data, multi-layer boundary visualization, school search, address lookup with assignment determination, and responsive design. Built with React 19, Mapbox GL, and Material-UI.',
    tags: ['React', 'Mapbox', 'MUI'],
    category: 'analytics',
    date: 'July 2025',
    tools: 'React, Mapbox GL, Firebase',
    link: 'https://mcpszoning.com/',
    image: '/mcps.png',
    languages: [
      { name: 'JavaScript', percent: 96.5, color: '#00d9ff' },
      { name: 'HTML', percent: 1.5, color: '#fb923c' },
      { name: 'JSON', percent: 1.3, color: '#4ade80' },
      { name: 'CSS', percent: 0.6, color: '#a78bfa' }
    ]
  },
  {
    id: 5,
    title: 'Sherwood Community Time Capsule',
    description: 'Interactive web application visualizing student geographic distribution from Sherwood High School across multiple school years (2001-2002 and 2004-2005). Features Mapbox-powered map with color-coded markers, full-text student search, neighborhood connections finder, grade filtering, and responsive design optimized for mobile and desktop.',
    tags: ['React', 'Mapbox', 'Vite'],
    category: 'analytics',
    date: 'March 2025',
    tools: 'React, Mapbox GL, Firebase',
    link: 'https://sherwoodtimecapsule.com',
    image: '/shs.png',
    languages: [
      { name: 'JSX (React)', percent: 54, color: '#00d9ff' },
      { name: 'CSS', percent: 28, color: '#a78bfa' },
      { name: 'JavaScript', percent: 15.5, color: '#3178c6' },
      { name: 'HTML/JSON/MD', percent: 2.3, color: '#fb923c' }
    ]
  },
  {
    id: 6,
    title: 'ColorIsData Scientific Color Picker',
    description: 'Browser-based scientific color analysis tool featuring interactive canvas color wheel, spectral analysis with physics calculations, WCAG accessibility testing, color vision deficiency simulation, and comprehensive format conversions (HEX, RGB, HSL, LAB, XYZ). Built with vanilla JavaScript and Chart.js, no build tools required.',
    tags: ['JavaScript', 'Chart.js', 'Canvas'],
    category: 'analytics',
    date: 'July 2025',
    tools: 'JavaScript, Chart.js, Firebase',
    link: 'https://www.colorisdata.com',
    image: '/color.png',
    languages: [
      { name: 'HTML', percent: 42.4, color: '#fb923c' },
      { name: 'JavaScript', percent: 35.5, color: '#00d9ff' },
      { name: 'CSS', percent: 22.1, color: '#a78bfa' }
    ]
  },
  {
    id: 7,
    title: 'Old Buddies Contact Scanner',
    description: 'Nostalgic mobile app that rediscovers AIM screen names from the early 2000s by scanning phone contacts using pattern detection and confidence scoring. Features Windows XP-themed UI, classic buddy list visualization with online/away/offline status, retro sound effects, and social sharing. Built with React Native, Expo, and Firebase backend with Cloud Functions.',
    tags: ['React Native', 'TypeScript', 'Firebase'],
    category: 'engineering',
    date: 'October 2025',
    tools: 'React Native, Expo, Firebase',
    link: 'https://oldbuddies.app',
    image: '/oldbuddies.png',
    languages: [
      { name: 'TypeScript (TSX)', percent: 75, color: '#00d9ff' },
      { name: 'JavaScript', percent: 20, color: '#3178c6' },
      { name: 'JSON/Config', percent: 5, color: '#4ade80' }
    ]
  },
  {
    id: 8,
    title: 'Robuttal - AI Debate Arena',
    description: 'Automated platform where AI language models compete head-to-head in formal debates on user-submitted topics. Features 4-phase debate structure (Opening, Rebuttal, Cross-Examination, Closing), AI judging with meta-auditing for fairness, Elo ranking system, and community voting. Supports models from Anthropic, OpenAI, Google, Mistral, xAI, and DeepSeek.',
    tags: ['Python', 'Next.js', 'FastAPI'],
    category: ['genai', 'analytics'],
    date: 'December 2025',
    tools: 'FastAPI, Next.js, PostgreSQL, Supabase',
    link: 'https://www.robuttal.com',
    image: '/robuttal.png',
    languages: [
      { name: 'TypeScript/TSX', percent: 42.2, color: '#00d9ff' },
      { name: 'Python', percent: 34.6, color: '#a78bfa' },
      { name: 'JSON', percent: 20.3, color: '#4ade80' },
      { name: 'Markdown/CSS', percent: 2.8, color: '#fb923c' }
    ]
  },
  {
    id: 9,
    title: 'Hawkins Lab Terminal',
    description: 'Immersive web experience styled as a 1983 Department of Energy terminal from Hawkins National Laboratory (Stranger Things). Features authentic CRT aesthetics with scanlines and phosphor effects, real-time USGS seismic data, live atmospheric monitoring, location-based dimensional risk scanner, 15+ unlockable character dossiers, and hidden easter eggs.',
    tags: ['React', 'Vite', 'Real-time APIs'],
    category: 'engineering',
    date: 'December 2025',
    tools: 'React, Vite, Vercel',
    link: 'https://hawkinslabterminal.com',
    image: '/hawkins.png',
    languages: [
      { name: 'JavaScript (JSX)', percent: 91.2, color: '#00d9ff' },
      { name: 'JavaScript (Hooks)', percent: 8.5, color: '#3178c6' },
      { name: 'HTML', percent: 0.4, color: '#fb923c' }
    ]
  },
  {
    id: 10,
    title: 'OviGoals.com',
    description: 'Interactive animated data visualization tracking every Alex Ovechkin NHL goal (912+) as he chases Wayne Gretzky\'s all-time record. Features cinematic goal timeline with particle animations, NHL rink shot map, stacking bar charts for top goalies/teams/assists, cumulative career chart with historic player comparisons, embedded milestone video highlights, keyboard controls, and auto-updating data via GitHub Actions.',
    tags: ['React', 'Framer Motion', 'SVG'],
    category: 'analytics',
    date: 'December 2025',
    tools: 'React, Vite, Framer Motion, Supabase, Vercel',
    link: 'https://ovigoals.com',
    image: '/ovi.png',
    languages: [
      { name: 'JavaScript (JSX)', percent: 88.7, color: '#00d9ff' },
      { name: 'CSS', percent: 5.8, color: '#a78bfa' },
      { name: 'Python', percent: 4.3, color: '#3572A5' },
      { name: 'YAML/HTML', percent: 1.2, color: '#fb923c' }
    ]
  },
  {
    id: 11,
    title: 'Misery Battery: Sports Fandom Misery Index',
    description: 'Interactive analytics tool that scores how joyful or miserable a sports fandom has been across MLB, the NBA, the NHL and the NFL since 1976. Ranks 98 metro-based fan bases against each other, or any custom set of teams (including team-change histories) against every possible combination of the same leagues and years, on a 100 misery to 100 joy scale. Features season-by-season strips, a scoring engine with tests, a Python data pipeline over 5,600 team-seasons, and share cards rendered in the browser with per-fan-base link previews.',
    tags: ['JavaScript', 'Python', 'Data Viz'],
    category: ['analytics', 'misc'],
    date: 'October 2026',
    tools: 'JavaScript, Canvas, Python, pandas, NHL API, Firebase',
    link: 'https://kckdata.com/misery-battery/',
    image: '/miserybattery.png',
    languages: [
      { name: 'JavaScript', percent: 57.1, color: '#00d9ff' },
      { name: 'CSS', percent: 17.1, color: '#a78bfa' },
      { name: 'Python', percent: 16.0, color: '#3572A5' },
      { name: 'HTML', percent: 9.3, color: '#fb923c' },
      { name: 'Shell', percent: 0.5, color: '#4ade80' }
    ]
  },
  {
    id: 12,
    title: 'NHL Has a Refereeing Problem',
    description: 'Data journalism piece using two seasons of NHL play-by-play to show referees evening up penalty calls: the next call goes against the team that has been called less 60% of the time, rising to 76% at a gap of three, and all 33 regular referees show the effect. Model-adjusted estimates with intervals, interactive charts with tooltips and table views.',
    tags: ['Data Journalism', 'SVG', 'Statistics'],
    category: ['analytics', 'misc'],
    date: 'October 2026',
    tools: 'NHL play-by-play data, JavaScript, SVG, Firebase',
    link: 'https://kckdata.com/nhl-refereeing-problem/',
    image: '/nhlrefs.png',
    languages: [
      { name: 'JavaScript', percent: 46.1, color: '#00d9ff' },
      { name: 'HTML', percent: 35.9, color: '#fb923c' },
      { name: 'CSS', percent: 18.0, color: '#a78bfa' }
    ]
  },
  {
    id: 13,
    title: 'Where in Olney?',
    note: 'built for my community',
    description: 'A daily GeoGuessr-style game for the Olney, Brookeville, Ashton and Sandy Spring, MD community. Each round drops you at a frozen Street View and you pin your guess on the map: five rounds, up to 5,000 points each. Everyone gets the same five locations each day from a seeded shuffle, with streaks, unlimited practice, live community standings (today, week, month and all-time), podium badges and monthly contests.',
    tags: ['JavaScript', 'Leaflet', 'Firebase'],
    category: 'engineering',
    date: 'August 2026',
    tools: 'JavaScript, Leaflet, OpenStreetMap, Google Street View, Firestore, Vercel',
    link: 'https://whereinolney.com',
    image: '/whereinolney.png',
    languages: [
      { name: 'JavaScript', percent: 66.3, color: '#00d9ff' },
      { name: 'CSS', percent: 17.0, color: '#a78bfa' },
      { name: 'HTML', percent: 10.7, color: '#fb923c' },
      { name: 'Python', percent: 2.8, color: '#3572A5' },
      { name: 'Firestore rules/JSON', percent: 3.2, color: '#4ade80' }
    ]
  }
];
