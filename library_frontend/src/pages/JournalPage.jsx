import React, { useEffect, useState } from 'react';
import './JournalPage.css';

const JournalPage = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Add a slight delay to trigger the entrance animation
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`journal-root ${ready ? 'is-ready' : ''}`}>
      <main className="journal-container">
        <div className="journal-status-card">
          <div className="journal-card-top">
            <span className="journal-label">SYSTEM STATUS</span>
          </div>
          <h1>Journal</h1>
          <p>Will be updating soon...</p>
          <div className="journal-accent"></div>
          
          {/* Engineering-style corner markers */}
          <div className="card-corner tl"></div>
          <div className="card-corner tr"></div>
          <div className="card-corner bl"></div>
          <div className="card-corner br"></div>
        </div>
      </main>
    </div>
  );
};

export default JournalPage;
