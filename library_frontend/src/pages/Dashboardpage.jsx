import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { useQueryClient } from "@tanstack/react-query";
import { searchBooks, parseBFFBook } from "../api/shelf";
import "./DashboardPage.css";
import {
  useDashboardSummary,
  useShelfRows,
} from "../hooks/useDashboardData";

const toArray = (raw) => Array.isArray(raw) ? raw : raw?.results || [];

function timeAgo(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/* ── Greeting helpers ── */
const capitalizeFirst = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const getGreeting = (username) => {
  const hour = new Date().getHours();
  const displayName = username ? capitalizeFirst(username) : "";
  const name = displayName ? `, ${displayName}` : "";
  if (hour >= 5  && hour < 12) return `Good Morning 🌅${name}`;
  if (hour >= 12 && hour < 17) return `Good Afternoon ☕${name}`;
  if (hour >= 17 && hour < 21) return `Good Evening 🌙${name}`;
  return `Night Owl 🦉${name} – rest is productive too!`;
};

const SUBTITLES = [
  "What are you in the mood for?",
  "What's on your reading list?",
  "What do you want to pick up?",
  "Any preferences for today?",
  "What type of stories are you looking for?",
  "What's your pick for today?",
  "What are you keen to delve into?",
  "What are you in the market for?",
  "What is your preference for today's reading?",
  "What materials would you like to examine?",
  "What topic would you like to explore?",
  "Do you have a preference for current literature?",
];

/* ── Icons ── */
const IconBook     = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const IconBookmark = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconCal      = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconHistory  = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>;
const IconCheck    = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconSearch   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconBell     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconLogout   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const HERO_CARDS = [
  { key: "recent",          label: "RECENT READINGS", sub: "Continue",  Icon: IconBook,     stat: (c) => `${c.books} BOOKS`   },
  { key: "bookmarks",       label: "BOOKMARKS",        sub: "Saved",     Icon: IconBookmark, stat: (c) => `${c.marks} MARKS`   },
  { key: "calendar",        label: "CALENDAR",         sub: "Routine",   Icon: IconCal,      stat: (c) => `STREAK ${c.streak}` },
  { key: "history",         label: "HISTORY",          sub: "Journey",   Icon: IconHistory,  stat: ()  => "FULL LOG"           },
  { key: "previously_read", label: "FINISHED",         sub: "Completed", Icon: IconCheck,    stat: (c) => `${c.done} DONE`     },
];

/* ══════════════════════════════════════════════════════════════════
   Profile Dropdown
══════════════════════════════════════════════════════════════════ */
function ProfileDropdown({ username, email, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const initials = username
    ? username.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="profile-wrap" ref={ref}>
      <button
        className="profile-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Profile menu"
      >
        <span className="avatar-initials">{initials}</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-avatar">{initials}</div>
            <div className="profile-dropdown-info">
              <span className="profile-dropdown-name">{capitalizeFirst(username) || "User"}</span>
              <span className="profile-dropdown-email">{email || "—"}</span>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          <button className="profile-dropdown-logout" onClick={() => { setOpen(false); onLogout(); }}>
            <IconLogout />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Panel Book Row ── */
function PanelBookRow({ book, extra }) {
  return (
    <div className="panel-book-row">
      <div className="panel-book-cover">
        {book.cover_url ? <img src={book.cover_url} alt="" /> : <span>📚</span>}
      </div>
      <div className="panel-book-info">
        <span className="panel-book-title">{book.title}</span>
        <span className="panel-book-author">{book.author}</span>
        {extra}
      </div>
    </div>
  );
}

/* ── Book Card ── */
function BookCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="book-card" onClick={() => navigate(`/book/${encodeURIComponent(book.bookId)}`)}>
      <div className="book-card-cover">
        {book.cover
          ? <img src={book.cover} alt={book.title} loading="lazy" />
          : <div className="book-card-placeholder">📖</div>}
        <div className="book-card-hover"><span>View Book</span></div>
      </div>
      <div className="book-card-meta">
        <span className="book-card-title">{book.title}</span>
        <span className="book-card-author">{book.author}</span>
      </div>
    </div>
  );
}

/* ── Search Result Card ── */
function SearchResultCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="src-card" onClick={() => navigate(`/book/${encodeURIComponent(book.bookId)}`)}>
      <div className="src-card-cover">
        {book.cover ? <img src={book.cover} alt="" loading="lazy" /> : <span>📖</span>}
      </div>
      <div className="src-card-info">
        <span className="src-card-title">{book.title}</span>
        <span className="src-card-author">{book.author}</span>
      </div>
    </div>
  );
}

/* ── Skeleton Loaders ── */
function SkeletonHeroCard() {
  return (
    <div className="dash-hero-cards">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton skeleton-hero" />
      ))}
    </div>
  );
}

function SkeletonShelf() {
  return (
    <div className="skeleton-shelf">
      <div className="skeleton skeleton-shelf-title" />
      <div className="skeleton-book-row">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton-book-card">
            <div className="skeleton skeleton-book-cover" />
            <div className="skeleton skeleton-line skeleton-line-title" />
            <div className="skeleton skeleton-line skeleton-line-author" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HeroCard
══════════════════════════════════════════════════════════════════ */
const HeroCard = memo(function HeroCard({ card, counts, panelContent, onExpand, onCollapse }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  
  // Status: 'idle' | 'opening' | 'open' | 'closing'
  const [status, setStatus] = useState('idle');
  const [cardStyle, setCardStyle] = useState({});
  const [wrapperStyle, setWrapperStyle] = useState({});

  const isActive = status !== 'idle';
  const isExpanded = status === 'open' || status === 'closing' || status === 'opening';

  const open = useCallback(() => {
    if (isActive) return;
    setStatus('opening');
    
    // Capture precise fractional dimensions
    const rect = containerRef.current.getBoundingClientRect();
    
    // Keep the grid placeholder stable using EXACT dimensions (both W and H)
    setWrapperStyle({ 
      width: `${rect.width}px`, 
      height: `${rect.height}px`, 
      flex: 'none' 
    });
    
    // Set initial fixed position exactly over the current spot
    setCardStyle({
      position: "fixed",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: 0,
      zIndex: 400,
      transition: "none"
    });
    
    onExpand();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const w = Math.min(560, vw * 0.92), h = Math.min(540, vh * 0.85);

        setCardStyle({
          position: "fixed",
          top: `${(vh - h) / 2}px`,
          left: `${(vw - w) / 2}px`,
          width: `${w}px`,
          height: `${h}px`,
          zIndex: 400,
          borderRadius: "28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
          transition: "all 0.4s ease-out"
        });
        
        setTimeout(() => setStatus('open'), 400);
      });
    });
  }, [isActive, onExpand]);

  const close = useCallback(() => {
    if (status !== 'open') return;
    setStatus('closing');

    // Recalculate target position using raw fractional values
    const rect = containerRef.current.getBoundingClientRect();
    
    setCardStyle(prev => ({
      ...prev,
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: "20px",
      boxShadow: "none",
      transition: "all 0.4s ease-out"
    }));

    setTimeout(() => {
      setCardStyle({});
      setWrapperStyle({});
      setStatus('idle');
      onCollapse();
    }, 410);
  }, [status, onCollapse]);

  return (
    <div className="hero-card-wrapper" ref={containerRef} style={wrapperStyle}>
      {status !== 'idle' && (
        <div 
          className="hc-backdrop" 
          onMouseDown={close} 
          style={{ background: "transparent", pointerEvents: "auto" }} 
        />
      )}
      <div 
        className={`hero-card ${isExpanded ? "hero-card--expanded" : ""} ${(status === 'opening' || status === 'closing') ? "hero-card--animating" : ""}`} 
        style={cardStyle} 
        onClick={status === 'idle' ? open : undefined}
      >
        <div className="hc-top">
          <span className="hc-label">{card.label}</span>
          <span className="hc-stat">{card.stat(counts)}</span>
        </div>
        
        {/* Always keep container to maintain 3-item flex layout stability */}
        <div className="hc-content">
          {status !== 'idle' && panelContent}
        </div>
        
        <div className="hc-bottom">
          <span className="hc-sub">{card.sub}</span>
          <div className="hc-icon"><card.Icon /></div>
        </div>
        {status === 'open' && <button className="hc-close" onMouseDown={close}>✕</button>}
      </div>
    </div>
  );
});

/* ── Calendar Heatmap (Holidays Logic) ── */
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

/* ── Calendar Heatmap ── */
function CalendarHeatmap({ sessions }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [hoverDate, setHoverDate] = useState(null); // String "MM-DD" or null

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Check if today is a holiday
  const todayObj = new Date();
  const todayKey = `${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const currentDisplayDate = hoverDate || todayKey;
  const currentEvent = HOLIDAYS_2026[currentDisplayDate];

  const todayStr = todayObj.toISOString().split('T')[0];

  // Helper: Dates for the current month view
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
  
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1); 

  const sessMap = {};
  sessions.forEach(s => sessMap[s.date] = s.minutes_read);

  const getCol = (min) => {
    if (!min) return "transparent";
    if (min >= 60) return "var(--cal-shade-3)"; // 1h+
    if (min >= 30) return "var(--cal-shade-2)"; // 30m+
    if (min >= 1)  return "var(--cal-shade-1)"; // 1m+
    return "transparent";
  };

  const formatTime = (total) => {
    if (!total) return "No reading recorded";
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0) return `${h}h ${m}m read`;
    return `${m}m read`;
  };

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const weekDays  = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  // Navigation
  const changeMonth = (offset) => setViewDate(new Date(year, month + offset, 1));

  // Generate calendar cells (including leading padding)
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const holidayKey = `${mm}-${dd}`;
    cells.push({ day: d, dateStr, holidayKey, minutes: sessMap[dateStr] || 0 });
  }

  return (
    <div className="cal-monthly-wrap">
      <div className="cal-monthly-header">
        <span className="cal-month-title">{monthName} {year}</span>
        <div className="cal-nav">
          <button onClick={() => changeMonth(-1)}>‹</button>
          <button onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>
      
      <div className="cal-monthly-grid">
        {weekDays.map(d => <span key={d} className="cal-weekday">{d}</span>)}
        {cells.map((cell, i) => {
          const isFuture = cell && cell.dateStr > todayStr;
          return !cell ? <div key={`pad-${i}`} className="cal-day-empty" /> : (
            <div key={i} className="cal-day-cell">
              <div 
                className={`cal-day-circle ${HOLIDAYS_2026[cell.holidayKey] ? "cal-day-holiday" : ""} ${isFuture ? "cal-day-future" : ""}`} 
                style={{ backgroundColor: getCol(cell.minutes) }}
                onMouseEnter={() => !isFuture && setHoverDate(cell.holidayKey)}
                onMouseLeave={() => setHoverDate(null)}
              >
                {cell.day}
                {!isFuture && <div className="cal-tooltip">{formatTime(cell.minutes)}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cal-event-footer">
        {currentEvent ? (
          <span className="cal-event-active">✨ {currentEvent}</span>
        ) : (
          <span className="cal-event-none">Nothing today</span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Dashboard Page
══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { token, logout, username } = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // Decode email from JWT (it's in the payload but not stored separately in context)
  const resolvedEmail = useMemo(() => {
    try {
      const t = sessionStorage.getItem("shelf_token");
      if (!t) return "";
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.email || "";
    } catch { return ""; }
  }, [token]);

  const [activePanel,   setActivePanel]   = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched,      setSearched]      = useState(false);
  const [phIndex,       setPhIndex]       = useState(0);

  const greeting = useMemo(() => getGreeting(username), [username]);
  const [subtitle] = useState(() => SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)]);

  const PLACEHOLDER_WORDS = ["literature","mystery","sci-fi","fantasy","history","philosophy"];

  useEffect(() => {
    const t = setInterval(() => setPhIndex(i => (i + 1) % PLACEHOLDER_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const { data: summary = {}, isLoading: summaryLoading } = useDashboardSummary(token);
  const { data: shelfRows = [], isLoading: rowsLoading } = useShelfRows();

  const counts = useMemo(() => {
    return {
      books : toArray(summary.activity).length,
      marks : toArray(summary.bookmarks).length,
      streak: summary.streak || 0,
      done  : toArray(summary.finished).length,
    };
  }, [summary]);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setSearched(true); setSearchLoading(true);
    try {
      const data = await searchBooks(token, q);
      setSearchResults((data.results || []).map(parseBFFBook));
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }, [token]);

  const clearSearch    = () => { setSearched(false); setSearchQuery(""); setSearchResults([]); };
  const handleExpand   = useCallback((key) => setActivePanel(key), []);
  const handleCollapse = useCallback(()    => setActivePanel(""),  []);
  const handleLogout   = useCallback(() => { queryClient.clear(); logout(); navigate("/"); }, [queryClient, logout, navigate]);

  const getPanelContent = useCallback((key) => {
    const activity = toArray(summary.activity);
    const finished = toArray(summary.finished);
    const marks    = toArray(summary.bookmarks);
    const sessions = toArray(summary.sessions);

    switch (key) {
      case "recent":
        return activity.length > 0
          ? activity.map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra">{ b.progress_percent < 100 && <span style={{color:"#f59e0b", marginLeft: "auto"}}>{parseInt(b.progress_percent)}%</span> }</div>} />)
          : <p className="panel-empty">No recent readings.</p>;
      case "bookmarks":
        return marks.length > 0
          ? marks.map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra"><span>{b.source}</span></div>} />)
          : <p className="panel-empty">No bookmarks saved.</p>;
      case "calendar":
        return <CalendarHeatmap sessions={sessions} />;
      case "history":
        return finished.length > 0
          ? finished.map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra"><span style={{ color: "#999" }}>{timeAgo(b.finished_at || b.last_read_at)}</span></div>} />)
          : <p className="panel-empty">No full history recorded yet.</p>;
      case "previously_read":
        return finished.length > 0
          ? finished.map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra"><span>COMPLETED</span></div>} />)
          : <p className="panel-empty">No books finished yet.</p>;
      default: return null;
    }
  }, [summary]);

  return (
    <div className="dash-root">
      <nav className="dash-navbar">
        <span className="dash-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>SHELF</span>

        <div className="dash-nav-links">
          <span className="dash-nav-link dash-nav-link-active">Library</span>
          <span className="dash-nav-link">Journal</span>
          <span className="dash-nav-link">Store</span>
        </div>

        <div className="dash-nav-search">
          <div className="dash-search-bar">
            <IconSearch />
            <input
              className="dash-search-input"
              placeholder={`Search for ${PLACEHOLDER_WORDS[phIndex]}…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch(searchQuery)}
            />
          </div>
        </div>

        <div className="dash-nav-right">
          <button className="dash-icon-btn"><IconBell /></button>
          <ProfileDropdown
            username={username}
            email={resolvedEmail}
            onLogout={handleLogout}
          />
        </div>
      </nav>

      <main className="dash-main">
        {!searched && (
          <div className="dash-heading-block">
            <h1 className="dash-greeting">{greeting}</h1>
            <p className="dash-subtitle">{subtitle}</p>
          </div>
        )}

        {!searched && (
          summaryLoading ? (
            <SkeletonHeroCard />
          ) : (
            <div className="dash-hero-cards">
              {HERO_CARDS.map(card => (
                <HeroCard
                  key={card.key}
                  card={card}
                  counts={counts}
                  panelContent={getPanelContent(card.key)}
                  onExpand={() => handleExpand(card.key)}
                  onCollapse={handleCollapse}
                />
              ))}
            </div>
          )
        )}

        {searched ? (
          <div className="dash-search-results">
            <div className="dash-results-header">
              <h3>Results for "<strong>{searchQuery}</strong>"</h3>
              <button onClick={clearSearch}>✕ Clear</button>
            </div>
            {searchLoading
              ? <div className="dash-spinner-wrap"><div className="dash-spinner" /></div>
              : <div className="dash-src-grid">
                  {searchResults.map((b, i) => <SearchResultCard key={i} book={b} />)}
                </div>
            }
          </div>
        ) : (
          <div className="dash-shelves">
            {rowsLoading
              ? [1, 2, 3].map(i => <SkeletonShelf key={i} />)
              : shelfRows.map(row => (
                  <div key={row.label} className="dash-shelf">
                    <div className="dash-shelf-header">
                      <h2 className="dash-shelf-label">{row.label}</h2>
                      <span className="dash-shelf-all" onClick={() => { setSearchQuery(row.label); handleSearch(row.label); }}>VIEW ALL</span>
                    </div>
                    <div className="dash-shelf-scroll">
                      {row.books.map((book, i) => <BookCard key={i} book={book} />)}
                    </div>
                  </div>
                ))
            }
          </div>
        )}
      </main>
    </div>
  );
}