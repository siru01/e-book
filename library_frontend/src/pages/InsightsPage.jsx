import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InsightsPage.css';

const IconArrowRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const IconHeart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const InsightsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="insights-root">
      <nav className="insights-nav">
        <div className="insights-nav-left" onClick={() => navigate('/dashboard')}>
           <span className="insights-back-arrow">←</span>
           <span className="insights-brand">SHELF / INSIGHTS</span>
        </div>
      </nav>

      <main className="insights-container">
        {/* Row 1 */}
        <div className="insight-card card-apps">
          <div className="card-header">
            <h3>A complete family of Apps</h3>
            <button className="launch-btn">Launch Apps <IconArrowRight /></button>
          </div>
          <div className="apps-grid">
            <div className="app-icon github">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </div>
            <div className="app-icon youtube">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>
            </div>
            <div className="app-icon twitter">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
            </div>
            <div className="app-icon tiktok">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
            </div>
            <div className="app-icon facebook">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </div>
          </div>
        </div>

        <div className="insight-card card-stat card-likes">
           <div className="heart-bg">
             <IconHeart />
             <IconHeart />
             <IconHeart />
           </div>
           <h2 className="stat-value">25K</h2>
           <p className="stat-label">Weekly Likes</p>
        </div>

        <div className="insight-card card-stat card-viewers">
           <div className="live-indicator">
             <span className="dot"></span> LIVE
           </div>
           <h2 className="stat-value">50K</h2>
           <p className="stat-label">Weekly Viewers</p>
        </div>

        {/* Row 2 */}
        <div className="insight-card card-stat card-active-users">
          <div className="card-top">
            <span className="label">Active Users</span>
            <span className="trend positive">+154</span>
          </div>
          <h2 className="stat-value-large">1,538</h2>
        </div>

        <div className="insight-card card-design">
           <div className="design-pattern"></div>
           <h2 className="design-text">DESIGN</h2>
        </div>

        <div className="insight-card card-subscribers">
          <div className="card-top">
             <span className="label">Total Subscribers</span>
             <span className="trend positive">+7%</span>
          </div>
          <div className="subscriber-chart">
            <svg viewBox="0 0 400 150" className="chart-svg">
              <path d="M0,100 Q50,90 100,110 T200,80 T300,100 T400,60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
              <path d="M0,110 Q50,100 100,120 T200,90 T300,110 T400,70" fill="none" stroke="white" strokeWidth="4" />
            </svg>
          </div>
          <h2 className="stat-value-xl">200K</h2>
        </div>

        {/* Row 3 */}
        <div className="insight-card card-learning">
           <h2>A place to learn UI Design & Web Design.</h2>
           <div className="learning-accent"></div>
        </div>
      </main>
    </div>
  );
};

export default InsightsPage;
