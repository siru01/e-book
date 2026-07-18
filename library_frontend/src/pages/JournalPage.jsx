import React, { useEffect, useState } from 'react';
import './JournalPage.css';

const JournalPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch live data from your content API
    const API_URL = "https://newsdata.io/api/1/news?language=en&q=business";
    
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setArticles(data.results || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch news:", err);
        setArticles([]);
        setLoading(false);
      });
  }, []);

  // Ensure you have enough articles to populate your template blocks
  const heroArticle = articles.length > 0 ? articles[0] : { title: "Default Title", description: "Content placeholder...", image_url: "" };
  const subArticle1 = articles.length > 1 ? articles[1] : { title: "Secondary News", description: "More context..." };
  const subArticle2 = articles.length > 2 ? articles[2] : { title: "Industry News", description: "More context..." };

  return (
    <div className="newsletter-wrapper">
      <div className="newsletter-container">
        {/* Header */}
        <div className="header">
            <h1>Corporate Business Newsletter</h1>
            <div className="meta-bar">JULY 2026 | ISSUE #45 | Verified Live API Feed</div>
        </div>

        {/* Hero Content Section */}
        <div className="hero-section">
            <div 
              className="hero-image-placeholder" 
              style={{ backgroundImage: heroArticle.image_url ? `url('${heroArticle.image_url}')` : 'none' }}
            ></div>
            <h2 style={{ color: '#1a365d', marginTop: '15px' }}>{heroArticle.title}</h2>
            <p style={{ color: '#4a5568', lineHeight: '1.6' }}>{heroArticle.description}</p>
        </div>

        {/* Two Column Article Distribution Layout */}
        <div className="columns-container">
            <div className="column">
                <h3>{subArticle1.title}</h3>
                <p style={{ fontSize: '14px', color: '#4a5568' }}>{subArticle1.description}</p>
            </div>
            <div className="column">
                <h3>{subArticle2.title}</h3>
                <p style={{ fontSize: '14px', color: '#4a5568' }}>{subArticle2.description}</p>
                <div className="quote-box">
                    "Let us DO the Best Creative Business With Our Strategy!"
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
