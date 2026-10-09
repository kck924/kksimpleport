import { useState } from 'react';
import './App.css';
import PortfolioCard from './components/PortfolioCard';
import TimeCounter from './components/TimeCounter';
import ProfileImageRotator from './components/ProfileImageRotator';
import Timeline from './components/Timeline';
import ScatterName from './components/ScatterName';
import RadialClock from './components/RadialClock';
import { portfolioData } from './data/projects';

const parseDate = (dateStr) => {
  const months = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };
  const [month, year] = dateStr.split(' ');
  return new Date(parseInt(year), months[month]);
};


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
    : activeView === 'misc'
    ? sortedProjects.filter(project => hasCategory(project, 'misc'))
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
          className={`toggle-btn ${activeView === 'misc' ? 'active' : ''}`}
          onClick={() => setActiveView('misc')}
        >
          Miscellaneous
        </button>
        <button
          className={`toggle-btn ${activeView === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveView('timeline')}
        >
          Professional Timeline
        </button>
      </div>

      <div className="view-content">
        {activeView === 'all' || activeView === 'non-analytics' || activeView === 'genai' || activeView === 'misc' ? (
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
