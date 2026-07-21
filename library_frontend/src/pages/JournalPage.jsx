import React, { useEffect, useState } from 'react';
import './JournalPage.css';

const JournalPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live data from a free, open News API (no key required)
    const API_URL = "https://saurav.tech/NewsAPI/top-headlines/category/technology/in.json";
    
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch news:", err);
        setArticles([]);
        setLoading(false);
      });
  }, []);

  const defaultArticle = {
    title: "Loading Latest Updates...",
    description: "Please wait while we fetch today's latest updates from around the globe.",
    content: "Fetching data...",
    urlToImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
  };

  const heroArticle = articles.length > 0 ? articles[0] : defaultArticle;
  const subArticle1 = articles.length > 1 ? articles[1] : defaultArticle;
  const subArticle2 = articles.length > 2 ? articles[2] : defaultArticle;
  const issue1 = articles.length > 3 ? articles[3] : defaultArticle;
  const issue2 = articles.length > 4 ? articles[4] : defaultArticle;
  const issue3 = articles.length > 5 ? articles[5] : defaultArticle;

  // Helper to ensure text looks good in columns
  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="newsletter-wrapper">
      <div className="np-container">
        
        {/* Left Column */}
        <div className="np-left">
          <div className="np-left-story">
            <h2>{truncate(subArticle1.title, 60)}</h2>
            <p>{subArticle1.description}</p>
            <p>{subArticle1.content ? truncate(subArticle1.content, 120) : "Read the full story on our platform..."}</p>
          </div>
          <div className="np-left-story">
            <h2>{truncate(subArticle2.title, 60)}</h2>
            <p>{subArticle2.description}</p>
            <img src={subArticle2.urlToImage || "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop"} className="np-left-img" alt="secondary article" />
          </div>
        </div>

        {/* Right Column */}
        <div className="np-right">
          
          <div className="np-issues">
            <div className="np-issue">
              <h3>Update 1</h3>
              <p>{truncate(issue1.title, 60)}<br/><br/>{truncate(issue1.description, 80)}</p>
            </div>
            <div className="np-issue">
              <h3>Update 2</h3>
              <p>{truncate(issue2.title, 60)}<br/><br/>{truncate(issue2.description, 80)}</p>
            </div>
            <div className="np-issue">
              <h3>Update 3</h3>
              <p>{truncate(issue3.title, 60)}<br/><br/>{truncate(issue3.description, 80)}</p>
            </div>
          </div>

          <div className="np-thick-divider"></div>
          
          <h1 className="np-title">NEWSLETTER</h1>
          
          <div className="np-subtitle-row">
            <span className="np-subtitle">Daily Edition | {today.toUpperCase()}</span>
            <div className="np-subtitle-line"></div>
          </div>

          <img src={heroArticle.urlToImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop'} className="np-hero-img" alt="hero article" />
          
          <h2 className="np-hero-headline">{heroArticle.title}</h2>
          
          <div className="np-hero-text" style={{ marginTop: '20px' }}>
            <p style={{ fontWeight: 'bold' }}>{heroArticle.description}</p>
            <p>{heroArticle.content || "More details unfolding as this story develops..."}</p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
