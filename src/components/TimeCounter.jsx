import { useState, useEffect } from 'react';
import './TimeCounter.css';

function TimeCounter({ startDate, label }) {
  const [timeElapsed, setTimeElapsed] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDate);
      const now = new Date();
      const diff = now - start;

      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
      const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));

      return `${years}y ${months}m ${days}d`;
    };

    setTimeElapsed(calculateTime());

    const interval = setInterval(() => {
      setTimeElapsed(calculateTime());
    }, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <div className="time-counter">
      <div className="counter-label">{label}</div>
      <div className="counter-value">{timeElapsed}</div>
    </div>
  );
}

export default TimeCounter;
