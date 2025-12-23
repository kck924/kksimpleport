import { useState, useEffect } from 'react';
import './LanguageBreakdown.css';

function LanguageBreakdown({ languages }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="language-breakdown">
      <div className="language-bars">
        {languages.map((lang, index) => (
          <div key={index} className="language-bar-wrapper">
            <div className="language-info">
              <span className="language-name">{lang.name}</span>
              <span className="language-percent">{lang.percent}%</span>
            </div>
            <div className="language-bar-track">
              <div
                className="language-bar-fill"
                style={{
                  width: animate ? `${lang.percent}%` : '0%',
                  backgroundColor: lang.color,
                  transitionDelay: `${index * 100}ms`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LanguageBreakdown;
