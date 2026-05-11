import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import { useDashboardSummary } from '../hooks/useDashboardData';
import { getCoverUrl } from '../api/shelf';
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
  const { token } = useAuth();
  const { data: summary } = useDashboardSummary(token);

  const activity = Array.isArray(summary?.activity) ? summary.activity : [];
  const recentReadings = activity.slice(0, 3);

  return (
    <div className="insights-root">

      <main className="insights-container">
        {/* Row 1 - Box 1: Recent Readings */}
        <div className="insight-card card-recent-readings">
          <div className="card-header">
            <h3>RECENT READINGS</h3>
          </div>
          <div className="recent-readings-grid">
            {recentReadings.length > 0 ? (
              recentReadings.map((item, i) => (
                <div 
                  key={i} 
                  className="recent-book-cover"
                  onClick={() => navigate(`/book/${encodeURIComponent(item.book_id)}`)}
                >
                  {item.book_cover ? (
                    <img src={getCoverUrl(item.book_cover)} alt={item.book_title} />
                  ) : (
                    <div className="cover-placeholder">📚</div>
                  )}
                </div>
              ))
            ) : (
              [1, 2, 3].map((_, i) => (
                <div key={i} className="recent-book-cover empty">
                  <div className="cover-placeholder">📖</div>
                </div>
              ))
            )}
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
