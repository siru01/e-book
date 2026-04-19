import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  if (hour >= 5 && hour < 12) return `Good Morning ${name}`;
  if (hour >= 12 && hour < 17) return `Good Afternoon ${name}`;
  if (hour >= 17 && hour < 21) return `Good Evening ${name}`;
  return `Night Owl ${name}`;
};

const SUBTITLES = [
"What's next?",
"Reading now?",
"Pick a book.",
"Current list?",
"What's the mood?",
"Today's pick?",
"Start reading.",
"Explore what?",
"Next read?",
"Pick a story?",
"Any materials to examine?",
"Topic you would like to explore?",
"Preference for current literature?",
];

/* ── Icons ── */
const IconBook = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
const IconBookmark = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
const IconCal = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconHistory = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" /></svg>;
const IconCheck = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const IconSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconBell = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
const IconLogout = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
const IconMail = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;

const HERO_CARDS = [
  { key: "recent", label: "RECENT READINGS", sub: "Continue", Icon: IconBook, stat: (c) => `${c.books} BOOKS` },
  { key: "bookmarks", label: "BOOKMARKS", sub: "Saved", Icon: IconBookmark, stat: (c) => `${c.marks} MARKS` },
  { key: "calendar", label: "CALENDAR", sub: "Routine", Icon: IconCal, stat: (c) => `STREAK ${c.streak}` },
  { key: "history", label: "HISTORY", sub: "Journey", Icon: IconHistory, stat: () => "FULL LOG" },
  { key: "previously_read", label: "FINISHED", sub: "Completed", Icon: IconCheck, stat: (c) => `${c.done} DONE` },
];

/* ══════════════════════════════════════════════════════════════════
   Profile Dropdown
 ══════════════════════════════════════════════════════════════════ */
function ProfileDropdown({ username, email, onLogout, onChangeEmail }) {
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

          <button className="profile-dropdown-logout" onClick={() => { setOpen(false); onChangeEmail(); }}>
            <IconMail />
            Change Email
          </button>

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
  const handleImgError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  return (
    <div className="book-card" onClick={() => navigate(`/book/${encodeURIComponent(book.bookId)}`)}>
      <div className="book-card-cover">
        {book.cover && (
          <img 
            src={book.cover} 
            alt={book.title} 
            loading="lazy" 
            referrerPolicy="no-referrer"
            onError={handleImgError}
          />
        )}
        <div className="book-card-placeholder" style={{ display: book.cover ? 'none' : 'flex' }}>
          <div className="placeholder-content">
            <span className="placeholder-title">{book.title}</span>
            <span className="placeholder-icon">📖</span>
          </div>
        </div>
        <div className="book-card-hover"><span>Read Now</span></div>
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
  const handleImgError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  return (
    <div className="src-card" onClick={() => navigate(`/book/${encodeURIComponent(book.bookId)}`)}>
      <div className="src-card-cover">
        {book.cover && (
          <img 
            src={book.cover} 
            alt={book.title} 
            loading="lazy" 
            referrerPolicy="no-referrer"
            onError={handleImgError}
          />
        )}
        <div className="src-card-placeholder" style={{ display: book.cover ? 'none' : 'flex' }}>
          <div className="placeholder-content">
            <span className="placeholder-title">{book.title}</span>
            <span className="placeholder-icon">📖</span>
          </div>
        </div>
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

  const [status, setStatus] = useState('idle');
  const [cardStyle, setCardStyle] = useState({});
  const [wrapperStyle, setWrapperStyle] = useState({});

  const isActive = status !== 'idle';
  const isExpanded = status === 'open' || status === 'closing' || status === 'opening';

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isExpanded]);

  const open = useCallback(() => {
    if (isActive) return;
    setStatus('opening');

    const rect = containerRef.current.getBoundingClientRect();
    setWrapperStyle({
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      flex: 'none',
      zIndex: 500
    });

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
      <div
        className={`hero-card ${status !== 'idle' ? "hero-card--ghost" : ""}`}
        onClick={status === 'idle' ? open : undefined}
      >
        <div className="hc-top">
          <span className="hc-label">{card.label}</span>
          <span className="hc-stat">{card.stat(counts)}</span>
        </div>
        <div className="hc-bottom">
          <span className="hc-sub">{card.sub}</span>
          <div className="hc-icon"><card.Icon /></div>
        </div>
      </div>

      {status !== 'idle' && createPortal(
        <div className="hc-portal-root">
          <div
            className="hc-backdrop"
            onMouseDown={close}
            style={{ opacity: status === 'open' ? 1 : 0 }}
          />
          <div
            className={`hero-card ${status === 'open' ? "hero-card--expanded" : "hero-card--animating"}`}
            style={cardStyle}
          >
            <div className="hc-top">
              <span className="hc-label">{card.label}</span>
              <span className="hc-stat">{card.stat(counts)}</span>
            </div>

            <div className="hc-content">
              {panelContent}
            </div>

            <div className="hc-bottom">
              <span className="hc-sub">{card.sub}</span>
              <div className="hc-icon"><card.Icon /></div>
            </div>
            {status === 'open' && <button className="hc-close" onMouseDown={close}>✕</button>}
          </div>
        </div>,
        document.body
      )}
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
  const [hoverDate, setHoverDate] = useState(null); 

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); 

  const todayObj = new Date();
  const todayKey = `${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const currentDisplayDate = hoverDate || todayKey;
  const currentEvent = HOLIDAYS_2026[currentDisplayDate];

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
  const changeMonth = (offset) => setViewDate(new Date(year, month + offset, 1));

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const holidayKey = `${mm}-${dd}`;
    cells.push({ day: d, dateStr, holidayKey, minutes: sessMap[dateStr] || 0 });
  }
  while (cells.length < 42) cells.push(null);

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

      <div className="cal-event-footer-mini">
        {currentEvent ? (
          <span className="cal-event-msg active">✨ {currentEvent}</span>
        ) : (
          <span className="cal-event-msg">Hover a date with a • for info</span>
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const resolvedEmail = useMemo(() => {
    try {
      const t = sessionStorage.getItem("shelf_token");
      if (!t) return "";
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.email || "";
    } catch { return ""; }
  }, [token]);

  const [activePanel, setActivePanel] = useState("");
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(() => !!new URLSearchParams(window.location.search).get("q"));
  const [phIndex, setPhIndex] = useState(0);

  const greeting = useMemo(() => getGreeting(username), [username]);
  const [subtitle] = useState(() => {
    const saved = sessionStorage.getItem("shelf_dashboard_subtitle");
    if (saved) return saved;
    const picked = SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)];
    sessionStorage.setItem("shelf_dashboard_subtitle", picked);
    return picked;
  });

  const PLACEHOLDER_WORDS = ["literature", "mystery", "sci-fi", "fantasy", "history", "philosophy"];

  useEffect(() => {
    const t = setInterval(() => setPhIndex(i => (i + 1) % PLACEHOLDER_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const { data: summary = {}, isLoading: summaryLoading } = useDashboardSummary(token);
  const { data: shelfRows = [], isLoading: rowsLoading } = useShelfRows();

  // Combine loading states for simultaneous rendering
  const pageLoading = (summaryLoading || rowsLoading) && !searched;

  const counts = useMemo(() => {
    return {
      books: toArray(summary.activity).length,
      marks: toArray(summary.bookmarks).length,
      streak: summary.streak || 0,
      done: toArray(summary.finished).length,
    };
  }, [summary]);

  const handleSearch = useCallback((q) => {
    if (!q || !q.trim()) return;
    setSearchParams({ q }, { replace: true });
  }, [setSearchParams]);

  // Unified Search Logic: React to URL changes
  useEffect(() => {
    const qParam = searchParams.get("q");
    
    if (qParam) {
      const performSearch = async () => {
        setSearched(true);
        setSearchLoading(true);
        setSearchQuery(qParam);
        try {
          const data = await searchBooks(token, qParam);
          setSearchResults((data.results || []).map(parseBFFBook));
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      };
      performSearch();
    } else {
      setSearched(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchParams, token]);

  const clearSearch = () => { 
    setSearchParams({}, { replace: true });
  };
  const handleExpand = useCallback((key) => setActivePanel(key), []);
  const handleCollapse = useCallback(() => setActivePanel(""), []);
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("shelf_dashboard_subtitle");
    queryClient.clear();
    logout();
    navigate("/");
  }, [queryClient, logout, navigate]);

  const getPanelContent = useCallback((key) => {
    const activity = toArray(summary.activity);
    const finished = toArray(summary.finished);
    const marks = toArray(summary.bookmarks);
    const sessions = toArray(summary.sessions);

    switch (key) {
      case "recent": {
        const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
        const filteredRecent = activity.filter(b => new Date(b.last_read_at).getTime() > fortyEightHoursAgo);
        return filteredRecent.length > 0
          ? filteredRecent.slice(0, 6).map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra">{b.progress_percent < 100 && <span style={{ color: "#f59e0b", marginLeft: "auto" }}>{parseInt(b.progress_percent)}%</span>}</div>} />)
          : <p className="panel-empty">No readings in the last 48 hours.</p>;
      }
      case "bookmarks":
        return marks.length > 0
          ? marks.map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra"><span>{b.source}</span></div>} />)
          : <p className="panel-empty">No bookmarks saved.</p>;
      case "calendar":
        return <CalendarHeatmap sessions={sessions} />;
      case "history":
        return activity.length > 0
          ? activity.map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra"><span style={{ color: "#999" }}>{timeAgo(b.last_read_at)}</span></div>} />)
          : <p className="panel-empty">No reading history recorded yet.</p>;
      case "previously_read":
        return finished.length > 0
          ? finished.map((b, i) => <PanelBookRow key={i} book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }} extra={<div className="panel-row-extra"><span>COMPLETED</span></div>} />)
          : <p className="panel-empty">No books finished yet.</p>;
      default: return null;
    }
  }, [summary]);

  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailOtp, setNewEmailOtp] = useState("");
  const [oldEmailOtp, setOldEmailOtp] = useState("");
  const [showEmailOtpStep, setShowEmailOtpStep] = useState(false);
  const [emailChangeStatus, setEmailChangeStatus] = useState({ loading: false, error: "" });

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setEmailChangeStatus({ loading: true, error: "" });
    try {
      const resp = await fetch(`/api/request-email-change/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ new_email: newEmail }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to send code.");
      setShowEmailOtpStep(true);
    } catch (err) {
      setEmailChangeStatus({ loading: false, error: err.message });
    } finally {
      setEmailChangeStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    setEmailChangeStatus({ loading: true, error: "" });
    try {
      const resp = await fetch(`/api/confirm-email-change/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          new_email: newEmail, 
          old_otp: oldEmailOtp, 
          new_otp: newEmailOtp 
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Verification failed.");
      
      // Success - Automatic Logout
      alert("Email changed successfully. Please log in with your new email.");
      handleLogout();
    } catch (err) {
      setEmailChangeStatus({ loading: false, error: err.message });
    } finally {
      setEmailChangeStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const closeEmailModal = () => {
    setIsChangeEmailOpen(false);
    setShowEmailOtpStep(false);
    setNewEmail("");
    setNewEmailOtp("");
    setOldEmailOtp("");
    setEmailChangeStatus({ loading: false, error: "" });
  };

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
            onChangeEmail={() => setIsChangeEmailOpen(true)}
          />
        </div>
      </nav>

      <main className="dash-main">
        {!searched && (
          <div className="dash-heading-block">
            <h1 className="dash-greeting">{greeting}</h1>
            <p className="dash-subtitle">{subtitle} </p>
          </div>
        )}

        {!searched && (
          pageLoading ? (
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
              ? (
                <div className="dash-search-loading-hero">
                  <div className="dash-search-spinner" />
                  <p className="dash-loading-wait-msg">PLEASE WAIT PATIENTLY </p>
                  <p className="dash-loading-detail">TILL YOU PREFERENCE IS BEING SEARCHED</p>
                </div>
              )
              : <div className="dash-src-grid">
                {searchResults.map((b, i) => <SearchResultCard key={i} book={b} />)}
              </div>
            }
          </div>
        ) : (
          <div className="dash-shelves">
            {pageLoading
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

      {/* ── Email Change Modal ── */}
      {isChangeEmailOpen && createPortal(
        <div className="email-modal-overlay">
          <div className="email-modal-card" onClick={e => e.stopPropagation()}>
            <button className="email-modal-close" onClick={closeEmailModal}>✕</button>
            <div className="email-modal-header">
              <h2>{showEmailOtpStep ? "Final Verification" : "Change Email"}</h2>
              <p>{showEmailOtpStep ? "We've sent codes to both your current and new inbox." : "Enter your new email address below."}</p>
            </div>

            <form className="email-modal-form" onSubmit={showEmailOtpStep ? handleConfirmEmailChange : handleRequestEmailChange}>
              {emailChangeStatus.error && <div className="email-modal-err">{emailChangeStatus.error}</div>}
              
              {!showEmailOtpStep ? (
                <div className="email-input-group">
                  <label>NEW EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    disabled={emailChangeStatus.loading}
                  />
                </div>
              ) : (
                <div className="email-dual-otp-container">
                  <div className="email-input-group">
                    <label>CODE SENT TO {resolvedEmail.toUpperCase()}</label>
                    <input 
                      type="text" 
                      maxLength="6"
                      placeholder="000000"
                      required
                      value={oldEmailOtp}
                      onChange={e => setOldEmailOtp(e.target.value.replace(/\D/g, ''))}
                      disabled={emailChangeStatus.loading}
                    />
                  </div>

                  <div className="email-input-group">
                    <label>CODE SENT TO {newEmail.toUpperCase()}</label>
                    <input 
                      type="text" 
                      maxLength="6"
                      placeholder="000000"
                      required
                      value={newEmailOtp}
                      onChange={e => setNewEmailOtp(e.target.value.replace(/\D/g, ''))}
                      disabled={emailChangeStatus.loading}
                    />
                  </div>
                </div>
              )}

              <button className="email-modal-submit" type="submit" disabled={emailChangeStatus.loading}>
                {emailChangeStatus.loading ? "PROCESSING..." : (showEmailOtpStep ? "CONFIRM CHANGE" : "SEND CODE")}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}