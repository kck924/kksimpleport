import { useState } from 'react';
import './App.css';
import PortfolioCard from './components/PortfolioCard';
import TimeCounter from './components/TimeCounter';
import ProfileImageRotator from './components/ProfileImageRotator';
import Timeline from './components/Timeline';
import ScatterName from './components/ScatterName';
import RadialClock from './components/RadialClock';

const parseDate = (dateStr) => {
  const months = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };
  const [month, year] = dateStr.split(' ');
  return new Date(parseInt(year), months[month]);
};

const portfolioData = [
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
  }
];

function App() {
  const [activeView, setActiveView] = useState('all');

  const hasCategory = (project, cat) => {
    if (Array.isArray(project.category)) {
      return project.category.includes(cat);
    }
    return project.category === cat;
  };

  const sortedProjects = [...portfolioData].sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const filteredProjects = activeView === 'all'
    ? sortedProjects
    : activeView === 'non-analytics'
    ? sortedProjects.filter(project => !hasCategory(project, 'analytics'))
    : activeView === 'genai'
    ? sortedProjects.filter(project => hasCategory(project, 'genai'))
    : sortedProjects;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="profile-section">
            <ProfileImageRotator />
            <div className="contact-links">
              <a href="mailto:kevinklein333@gmail.com" className="email">kevinklein333@gmail.com</a>
              <a href="https://www.linkedin.com/in/kevinkleinads" target="_blank" rel="noopener noreferrer" className="linkedin-btn" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
          <div className="header-main">
            <ScatterName />
          </div>
          <div className="time-counters">
            <div className="time-counter-group">
              <TimeCounter startDate="2017-01-10" label="Time at Microsoft" />
              <RadialClock startDate="2017-01-10" />
            </div>
            <div className="time-counter-group">
              <TimeCounter startDate="2022-10-01" label="Time in Role" />
              <RadialClock startDate="2022-10-01" />
            </div>
          </div>
        </div>
      </header>

      <div className="view-toggle">
        <button
          className={`toggle-btn ${activeView === 'all' ? 'active' : ''}`}
          onClick={() => setActiveView('all')}
        >
          All
        </button>
        <button
          className={`toggle-btn ${activeView === 'non-analytics' ? 'active' : ''}`}
          onClick={() => setActiveView('non-analytics')}
        >
          Non-Analytics
        </button>
        <button
          className={`toggle-btn ${activeView === 'genai' ? 'active' : ''}`}
          onClick={() => setActiveView('genai')}
        >
          Generative AI
        </button>
        <button
          className={`toggle-btn ${activeView === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveView('timeline')}
        >
          Professional Timeline
        </button>
      </div>

      <div className="view-content">
        {activeView === 'all' || activeView === 'non-analytics' || activeView === 'genai' ? (
          <div className="portfolio-view">
            {activeView === 'genai' && (
              <div className="genai-view">
                <div className="genai-content">
                  <h2>Generative AI Leadership</h2>
                  <div className="genai-description">
                    <p>
                      In my current role as Director and Head of Advertiser Analytics at Microsoft, I own the Generative AI strategy for a 50-person analytics organization.
                    </p>
                    <p>
                      My focus is on influencing analyst roles to get comfortable working in IDE environments with in-line LLM assistants. While I personally love Claude Code, internally at Microsoft we primarily use GitHub Copilot CLI.
                    </p>
                    <p>
                      Analysts are encouraged to leverage LLMs for both theoretical approaches to problems and executing technical solutions. The core ethos is that LLMs, when used smartly, augment what analysts are capable of. They expand technical toolkits and help analysts tackle more complex challenges.
                    </p>
                    <p>
                      This approach shifts traditional analytics roles toward AI-augmented work. Analysts work in modern development environments, write production-quality code with AI assistance, and ship insights faster.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="portfolio-grid">
              {filteredProjects.map((project, index) => (
                <PortfolioCard key={project.id} {...project} index={index} filterKey={activeView} />
              ))}
            </div>
          </div>
        ) : activeView === 'timeline' ? (
          <Timeline />
        ) : null}
      </div>
    </div>
  );
}

export default App;
