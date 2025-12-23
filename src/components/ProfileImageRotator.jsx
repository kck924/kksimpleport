import { useState, useEffect } from 'react';
import './ProfileImageRotator.css';

const images = [
  '/kevin.jpg',
  '/kkguitar.png',
  '/kkhanks.png',
  '/kkom2.png'
];

function ProfileImageRotator() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Rotate every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="profile-image-container">
      {images.map((image, index) => (
        <img
          key={image}
          src={image}
          alt="Kevin Klein"
          className={`profile-image ${index === currentIndex ? 'active' : ''}`}
        />
      ))}
    </div>
  );
}

export default ProfileImageRotator;
