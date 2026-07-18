import React, { useEffect, useState } from 'react';
import './JournalPage.css';

const JournalPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live data from a free, open News API (no key required)
    const API_URL = "https://saurav.tech/NewsAPI/top-headlines/category/business/us.json";
    
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

  // Ensure you have enough articles to populate your template blocks
  const heroArticle = articles.length > 0 ? articles[0] : { title: "THE BUSINESS AWARD GOES TO LICERIA & CO.", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", urlToImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" };
  const subArticle1 = articles.length > 1 ? articles[1] : { title: "Story Title Goes Here", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", urlToImage: "" };
  const subArticle2 = articles.length > 2 ? articles[2] : { title: "Story Title Goes Here", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", urlToImage: "" };
  const issue1 = articles.length > 3 ? articles[3] : { title: "New Markets Open", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." };
  const issue2 = articles.length > 4 ? articles[4] : { title: "Tech Innovations", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." };
  const issue3 = articles.length > 5 ? articles[5] : { title: "Global Economy", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." };

  // Helper to ensure text looks good in columns
  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  return (
    <div className="newsletter-wrapper">
      <div className="np-container">
        
        {/* Left Column */}
        <div className="np-left">
          <div className="np-left-story">
            <h2>{truncate(subArticle1.title, 40)}</h2>
            <p>{subArticle1.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
          </div>
          <div className="np-left-story">
            <h2>{truncate(subArticle2.title, 40)}</h2>
            <p>{subArticle2.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <img src={subArticle2.urlToImage || "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop"} className="np-left-img" alt="secondary article" />
          </div>
        </div>

        {/* Right Column */}
        <div className="np-right">
          
          <div className="np-issues">
            <div className="np-issue">
              <h3>Issue 1</h3>
              <p>{truncate(issue1.title, 60)}<br/><br/>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div className="np-issue">
              <h3>Issue 2</h3>
              <p>{truncate(issue2.title, 60)}<br/><br/>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div className="np-issue">
              <h3>Issue 3</h3>
              <p>{truncate(issue3.title, 60)}<br/><br/>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </div>

          <div className="np-thick-divider"></div>
          
          <h1 className="np-title">NEWSLETTER</h1>
          
          <div className="np-subtitle-row">
            <span className="np-subtitle">Issue 1 Spring 2024</span>
            <div className="np-subtitle-line"></div>
          </div>

          <img src={heroArticle.urlToImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop'} className="np-hero-img" alt="hero article" />
          
          <h2 className="np-hero-headline">{heroArticle.title}</h2>
          <h3 className="np-hero-sub">Story Title Goes Here</h3>
          
          <div className="np-hero-text">
            <p>{heroArticle.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."}</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
