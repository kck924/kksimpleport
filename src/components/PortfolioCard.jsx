import { useState, useEffect } from 'react';
import LanguageBreakdown from './LanguageBreakdown';
import ImageModal from './ImageModal';

function PortfolioCard({ title, description, tags, date, tools, link, languages, image, index = 0, filterKey }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [filterKey]);

  const handleProjectClick = () => {
    if (window.gtag) {
      window.gtag('event', 'project_click', {
        project_name: title,
        project_url: link
      });
    }
  };

  return (
    <div
      className={`portfolio-card ${isAnimating ? 'card-enter' : ''}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="card-tags">
        {tags.map((tag, index) => (
          <span key={index} className="tag">
            {tag}
          </span>
        ))}
      </div>

      <h3 className="card-title">{title}</h3>

      {image && (
        <>
          <div className="card-image" onClick={() => setIsModalOpen(true)}>
            <img src={image} alt={title} />
            <div className="image-overlay">
              <span className="expand-hint">Click to expand</span>
            </div>
          </div>
          {isModalOpen && (
            <ImageModal
              image={image}
              title={title}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </>
      )}

      <p className="card-description">{description}</p>

      <div className="card-meta">
        {date && <span>{date}</span>}
        {tools && <span>{tools}</span>}
      </div>

      {languages && <LanguageBreakdown languages={languages} />}

      {link && (
        <div className="card-links">
          <a href={link} className="card-link" target="_blank" rel="noopener noreferrer" onClick={handleProjectClick}>
            <span>View Project →</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default PortfolioCard;
