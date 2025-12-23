import { useState } from 'react';
import './Timeline.css';

const timelineData = [
  {
    date: 'May 2010',
    timestamp: new Date(2010, 4, 1),
    title: 'Graduated University of Maryland',
    description: 'Bachelor\'s degree',
    type: 'education'
  },
  {
    date: 'February 2014',
    timestamp: new Date(2014, 1, 1),
    title: 'Hanapin Marketing',
    description: 'Started career in digital marketing',
    type: 'job'
  },
  {
    date: 'August 2015',
    timestamp: new Date(2015, 7, 1),
    title: 'Deluxe Corporation',
    description: 'Joined Deluxe Corporation',
    type: 'job'
  },
  {
    date: 'January 2017',
    timestamp: new Date(2017, 0, 1),
    title: 'Microsoft',
    description: 'Analytical Lead',
    type: 'job'
  },
  {
    date: 'September 2020',
    timestamp: new Date(2020, 8, 1),
    title: 'Promotion',
    description: 'Senior Analytical Lead',
    type: 'promotion'
  },
  {
    date: 'September 2022',
    timestamp: new Date(2022, 8, 1),
    title: 'Promotion',
    description: 'Analytical Director',
    type: 'promotion'
  },
  {
    date: 'October 2022',
    timestamp: new Date(2022, 9, 1),
    title: 'Promotion',
    description: 'Head of Advertiser Analytics',
    type: 'promotion'
  },
  {
    date: 'September 2025',
    timestamp: new Date(2025, 8, 1),
    title: 'Promotion',
    description: 'Director, Head of Advertiser Analytics',
    type: 'promotion'
  }
];

// Calculate proportional spacing based on time between events
const calculateSpacing = () => {
  const minSpacing = 80; // minimum pixels between items
  const pixelsPerMonth = 8; // scale factor

  const spacings = [];
  for (let i = 0; i < timelineData.length; i++) {
    if (i === 0) {
      spacings.push(0);
    } else {
      const monthsDiff = (timelineData[i].timestamp - timelineData[i - 1].timestamp) / (1000 * 60 * 60 * 24 * 30);
      spacings.push(Math.max(minSpacing, monthsDiff * pixelsPerMonth));
    }
  }
  return spacings;
};

const spacings = calculateSpacing();

function Timeline() {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <div className="timeline-container">
      <h2 className="timeline-heading">Professional Timeline</h2>
      <div className="scroll-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      <div className="timeline-wrapper">
        <div className="timeline-track">
          <div className="timeline-line"></div>
          {timelineData.map((item, index) => (
            <div
              key={index}
              className={`timeline-item ${activeIndex === index ? 'active' : ''} ${item.type}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{
                '--delay': `${index * 0.1}s`,
                marginLeft: index === 0 ? '0' : `${spacings[index]}px`
              }}
            >
              <div className="timeline-marker">
                <div className="marker-dot"></div>
                <div className="marker-pulse"></div>
              </div>
              <div className={`timeline-content ${index % 2 === 0 ? 'above' : 'below'}`}>
                <svg className="connector-border" preserveAspectRatio="none">
                  <rect className="border-path" rx="6" ry="6" />
                </svg>
                <div className="connector-line"></div>
                <div className="content-inner">
                  <span className="timeline-date">{item.date}</span>
                  <h3 className="timeline-title">{item.title}</h3>
                  <p className="timeline-description">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
