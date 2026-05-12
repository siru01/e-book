import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import { useDashboardSummary, useBookmarks } from '../hooks/useDashboardData';
import { getCoverUrl } from '../api/shelf';
import './InsightsPage.css';
import CounterLoader from "../components/CounterLoader";

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

const HOLIDAYS_2026 = {
  "01-01": "New Year's Day",
  "01-12": "Swami Vivekananda Birthday",
  "01-23": "Netaji's Birthday",
  "01-26": "Republic Day",
  "02-02": "Saraswati Puja",
  "03-03": "Doljatra",
  "03-21": "Eid-Ul-Fitr",
  "03-26": "Ram Navami",
  "03-31": "Mahavir Jayanti",
  "04-03": "Good Friday",
  "04-14": "Ambedkar Jayanti",
  "04-15": "Bengali New Year (Nababarsha)",
  "05-01": "May Day / Buddha Purnima",
  "05-09": "Rabindranath Tagore Birthday",
  "08-15": "Independence Day",
  "08-26": "Id-E-Milad",
  "10-02": "Gandhi Jayanti",
  "10-16": "Maha Shashthi",
  "10-17": "Maha Saptami",
  "10-18": "Maha Ashtami",
  "10-19": "Maha Navami",
  "10-20": "Maha Dashami",
  "10-21": "Vijayadashami",
  "10-31": "Lakshmi Puja",
  "11-08": "Kali Puja / Diwali",
  "11-14": "Children's Day",
  "12-25": "Christmas",
};

function CalendarMonth({ sessions = [], monthOffset = 0, setHoverDate }) {
  const todayObj = new Date();
  const viewDate = new Date(todayObj.getFullYear(), todayObj.getMonth() + monthOffset, 1);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); 

  const todayInKolkata = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const todayStr = `${todayInKolkata.getFullYear()}-${String(todayInKolkata.getMonth() + 1).padStart(2, '0')}-${String(todayInKolkata.getDate()).padStart(2, '0')}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); 
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

  const sessMap = {};
  sessions.forEach(s => sessMap[s.date] = s.minutes_read);

  const getCol = (min) => {
    if (!min) return "var(--cal-shade-empty)";
    if (min >= 60) return "var(--cal-shade-4)"; 
    if (min >= 30) return "var(--cal-shade-3)"; 
    if (min >= 15) return "var(--cal-shade-2)"; 
    if (min >= 1) return "var(--cal-shade-1)"; 
    return "var(--cal-shade-empty)";
  };

  const formatTime = (total) => {
    if (!total) return "No reading recorded";
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0) return `${h}h ${m}m read`;
    return `${m}m read`;
  };

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const holidayKey = `${mm}-${dd}`;
    cells.push({ day: d, dateStr, holidayKey, minutes: sessMap[dateStr] || 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null); // Only pad to nearest row, not always 42


  return (
    <div className="cal-month-item">
      <div className="cal-monthly-header">
        <span className="cal-month-title">{monthName} {year}</span>
      </div>

      <div className="cal-monthly-grid">
        {weekDays.map(d => <span key={d} className="cal-weekday">{d}</span>)}
        {cells.map((cell, i) => {
          const isFuture = cell && cell.dateStr > todayStr;
          const isHoliday = cell && HOLIDAYS_2026[cell.holidayKey];
          return !cell ? <div key={`pad-${i}`} className="cal-day-empty" /> : (
            <div key={i} className="cal-day-cell">
              <div 
                className={`cal-day-circle ${isHoliday ? "cal-day-holiday" : ""} ${isFuture ? "cal-day-future" : ""} ${cell.dateStr === todayStr ? "cal-day-today" : ""}`} 
                style={{ backgroundColor: getCol(cell.minutes) }}
                onMouseEnter={() => setHoverDate(cell.holidayKey)}
                onMouseLeave={() => setHoverDate(null)}
              >
                {cell.day}
                {!isFuture && <div className="cal-tooltip">{formatTime(cell.minutes)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarHeatmap({ sessions = [], setHoverDate }) {
  // Show last 6 months
  const months = [0, -1, -2, -3, -4, -5];
  
  return (
    <div className="cal-scroll-container">
      {months.map(offset => (
        <CalendarMonth 
          key={offset} 
          sessions={sessions} 
          monthOffset={offset} 
          setHoverDate={setHoverDate} 
        />
      ))}
    </div>
  );
}

const InsightsPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary(token);
  const { data: bookmarks, isLoading: isBookmarksLoading } = useBookmarks(token);
  const [hoverDate, setHoverDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [coversPreloaded, setCoversPreloaded] = useState(false);

  const activity = Array.isArray(summary?.activity) ? summary.activity : [];
  const recentReadings = activity.slice(0, 6);
  const sessions = Array.isArray(summary?.sessions) ? summary.sessions : [];

  const todayObj = new Date();
  const todayKey = `${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  
  // Find current session data for info display
  const currentSess = sessions.find(s => {
    if (!hoverDate) return false;
    return s.date.endsWith(hoverDate);
  });

  const currentDisplayDate = hoverDate || todayKey;
  const currentEvent = HOLIDAYS_2026[currentDisplayDate];
  const currentMinutes = currentSess ? currentSess.minutes_read : 0;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes_read || 0), 0);
  const lastBook = activity[0];

  const formatTime = (total) => {
    if (!total) return "No reading recorded";
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0) return `${h}h ${m}m read`;
    return `${m}m read`;
  };

  const formatTotalTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}H ${m}M`;
    return `${m}M`;
  };

  // Preload covers for recent readings and bookmarks
  useEffect(() => {
    if (isSummaryLoading || isBookmarksLoading) return;
    
    const coversToLoad = [
      ...recentReadings.map(b => b.book_cover),
      ...(bookmarks ? bookmarks.slice(0, 4).map(b => b.book_cover) : []),
      lastBook?.book_cover
    ].filter(Boolean).map(c => getCoverUrl(c));

    if (coversToLoad.length === 0) {
      setCoversPreloaded(true);
      return;
    }

    let loadedCount = 0;
    coversToLoad.forEach(url => {
      const img = new Image();
      img.src = url;
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === coversToLoad.length) setCoversPreloaded(true);
      };
    });
  }, [isSummaryLoading, isBookmarksLoading, recentReadings.length, bookmarks?.length, lastBook?.book_id]);

  useEffect(() => {
    if (!isSummaryLoading && !isBookmarksLoading && coversPreloaded) {
      setDataReady(true);
    }
  }, [isSummaryLoading, isBookmarksLoading, coversPreloaded]);

  const handleLoaderComplete = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <div className={`insights-root ${loading ? 'is-loading' : 'is-ready'}`}>
      {loading && (
        <CounterLoader 
          dataReady={dataReady} 
          onComplete={handleLoaderComplete} 
          brand="INSIGHTS"
          label="Calculating your reading stats…"
        />
      )}

      <main className="insights-container">
        {/* Row 1 - Box 1: Recent Readings */}
        <div className="insight-card card-recent-readings">
          <div className="card-header">
            <h3>RECENT READINGS</h3>
          </div>
          <div className="recent-readings-grid">
            {!isSummaryLoading && recentReadings.length > 0 && (
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
            )}
            {!isSummaryLoading && recentReadings.length === 0 && (
              <p className="no-activity-msg">No recent activity</p>
            )}
          </div>
        </div>

        {/* Row 1 - Box 2: Bookmarks */}
        <div className="insight-card card-bookmarks">
          <div className="card-header">
            <h3>BOOKMARKS</h3>
          </div>
          <div className="recent-readings-grid">
            {!isBookmarksLoading && bookmarks && bookmarks.length > 0 && (
              bookmarks.slice(0, 10).map((item, i) => (
                <div 
                  key={i} 
                  className="recent-book-cover"
                  onClick={() => navigate(`/book/${encodeURIComponent(item.book_id)}`)}
                >
                  {item.book_cover ? (
                    <img src={getCoverUrl(item.book_cover)} alt={item.book_title} />
                  ) : (
                    <div className="cover-placeholder">🔖</div>
                  )}
                </div>
              ))
            )}
            {!isBookmarksLoading && (!bookmarks || bookmarks.length === 0) && (
              <p className="no-activity-msg">No bookmarks saved</p>
            )}
          </div>
        </div>

        <div className="insight-card card-dual-stat">
          <div className="stat-section total-time">
            <div className="card-header"><h3>TOTAL TIME READ</h3></div>
            <h2 className="section-value">{formatTotalTime(totalMinutes)}</h2>
          </div>
          <div className="stat-separator" />
          <div className="stat-section last-book">
            <div className="card-header"><h3>LAST READ</h3></div>
            {lastBook ? (
              <div className="last-book-mini" onClick={() => navigate(`/book/${encodeURIComponent(lastBook.book_id)}`)}>
                <div className="mini-cover">
                   <img src={getCoverUrl(lastBook.book_cover)} alt={lastBook.book_title} />
                </div>
                <div className="mini-details">
                  <span className="mini-title">{lastBook.book_title}</span>
                  <span className="mini-author">{lastBook.book_author}</span>
                </div>
              </div>
            ) : (
              <p className="no-activity-msg">None yet</p>
            )}
          </div>
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

        <div className="insight-card card-calendar">
          <div className="card-top">
             <span className="label">Activity Calendar</span>
             <div className="header-event-info">
               {currentEvent ? (
                 <>
                   <span className="event-name">{currentEvent}</span>
                 </>
               ) : hoverDate ? (
                 <span className="event-name">{formatTime(currentMinutes)}</span>
               ) : HOLIDAYS_2026[todayKey] ? (
                 <>
                   <span className="sparkle">✨</span>
                   <span className="event-name">{HOLIDAYS_2026[todayKey]}</span>
                 </>
               ) : (
                 <span className="event-name opacity-low">Hover dates for info</span>
               )}
             </div>
          </div>
          <CalendarHeatmap sessions={sessions} setHoverDate={setHoverDate} />
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
