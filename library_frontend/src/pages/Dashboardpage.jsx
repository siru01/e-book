import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { useQueryClient } from "@tanstack/react-query";
import { searchGutenberg } from "../api/shelf";
import "./DashboardPage.css";
import {
  useMyBooks,
  useMyHistory,
  useMyBookmarks,
  useGutenbergRows,
} from "../hooks/useDashboardData";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toArray = (raw) => Array.isArray(raw) ? raw : raw?.results || [];
const stars = (r) => { const n = Math.max(0, Math.min(5, r)); return "★".repeat(n) + "☆".repeat(5 - n); };

// ── SVG Icons ──────────────────────────────────────────────────────
const IconBook     = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const IconBookmark = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconCal      = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconHistory  = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>;
const IconCheck    = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconSearch   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconBell     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconUser     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

const HERO_CARDS = [
  { key: "recent",          label: "RECENT READINGS", sub: "Continue where you left", icon: <IconBook />,     stat: (c) => `${c.books} BOOKS`  },
  { key: "bookmarks",       label: "BOOKMARKS",        sub: "Your saved excerpts",    icon: <IconBookmark />, stat: (c) => `${c.marks} MARKS`  },
  { key: "calendar",        label: "CALENDAR",         sub: "Daily reading schedule", icon: <IconCal />,      stat: (c) => `STREAK ${c.streak}`},
  { key: "history",         label: "HISTORY",          sub: "Review your journey",    icon: <IconHistory />,  stat: ()  => "FULL LOG"           },
  { key: "previously_read", label: "FINISHED",         sub: "Your completed library", icon: <IconCheck />,   stat: (c) => `${c.done} DONE`     },
];

function HeroCard({ card, active, onClick, counts }) {
  return (
    <div className={`hero-card ${active ? "hero-card-active" : ""}`} onClick={() => onClick(card.key)}>
      <div className="hero-card-top">
        <span className="hero-card-label">{card.label}</span>
        <span className="hero-card-stat">{card.stat(counts)}</span>
      </div>
      <div className="hero-card-icon">{card.icon}</div>
      <span className="hero-card-sub">{card.sub}</span>
    </div>
  );
}

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

function BookCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="book-card" onClick={() => navigate(`/read/${encodeURIComponent(book.gutenbergId)}`)}>
      <div className="book-card-cover">
        {book.cover
          ? <img src={book.cover} alt={book.title} loading="lazy" />
          : <div className="book-card-placeholder">📖</div>}
        <div className="book-card-hover"><span>Read Now</span></div>
      </div>
      <div className="book-card-meta">
        <span className="book-card-title">{book.title}</span>
        <span className="book-card-author">{book.author}</span>
        {book.year && <span className="book-card-year">{book.year}</span>}
      </div>
    </div>
  );
}

function SearchResultCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="src-card" onClick={() => navigate(`/read/${encodeURIComponent(book.gutenbergId)}`)}>
      <div className="src-card-cover">
        {book.cover ? <img src={book.cover} alt="" loading="lazy" /> : <span>📖</span>}
      </div>
      <div className="src-card-info">
        <span className="src-card-title">{book.title}</span>
        <span className="src-card-author">{book.author}</span>
        {book.year && <span className="src-card-year">{book.year}</span>}
        {book.description && <span className="src-card-desc">{book.description.slice(0, 100)}…</span>}
        <button className="src-card-btn" onClick={(e) => { e.stopPropagation(); navigate(`/read/${encodeURIComponent(book.gutenbergId)}`); }}>
          Read Now
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token, username, logout } = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [activePanel,   setActivePanel]   = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched,      setSearched]      = useState(false);
  const PLACEHOLDER_WORDS = ["literature", "mystery", "sci-fi", "fantasy", "history", "philosophy", "biography", "classics"];
  const [phIndex, setPhIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhIndex((i) => (i + 1) % PLACEHOLDER_WORDS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const { data: rawBooks     = [] } = useMyBooks(token);
  const { data: rawHistory   = [] } = useMyHistory(token);
  const { data: rawBookmarks = [] } = useMyBookmarks(token);
  const { data: gutenbergRows = [], isLoading: rowsLoading } = useGutenbergRows();

  const counts = useMemo(() => ({
    books:  toArray(rawBooks).length,
    marks:  toArray(rawBookmarks).length,
    streak: 12,
    done:   toArray(rawHistory).length,
  }), [rawBooks, rawBookmarks, rawHistory]);

  const recentReadings = useMemo(() => toArray(rawBooks).map((b) => ({
    cover_url: b.book_cover || "", title: b.book_title || "Unknown",
    author: b.book_author || "", last_read: b.last_read || "Recently",
    progress_pct: `${parseInt(b.progress_percent || 0)}%`,
  })), [rawBooks]);

  const calendarEvents = useMemo(() => {
    const today = new Date();
    const events = toArray(rawBooks).flatMap((b) => {
      if (!b.due_date) return [];
      const due = new Date(b.due_date);
      const delta = Math.floor((due - today) / 86_400_000);
      const color = delta < 0 ? "#ef4444" : delta <= 3 ? "#f59e0b" : "#6366f1";
      return [{ day_short: DAY_NAMES[due.getDay()], day_num: due.getDate(),
                title: `Return: ${b.book_title}`, type: delta < 0 ? "overdue" : "return", color }];
    });
    events.push({ day_short: DAY_NAMES[today.getDay()], day_num: today.getDate(),
                  title: "Reading Goal: Keep it up! 📖", type: "goal", color: "#8b5cf6" });
    return events;
  }, [rawBooks]);

  const readingHistory   = useMemo(() => toArray(rawHistory).map((b) => ({ cover_url: b.book_cover || "", title: b.book_title || "Unknown", author: b.book_author || "", completed_date: b.finished_at || "", stars: stars(b.rating || 4) })), [rawHistory]);
  const bookmarkedBooks  = useMemo(() => toArray(rawBookmarks).map((b) => ({ cover_url: b.book_cover || "", title: b.book_title || "Unknown", author: b.book_author || "", source: b.source || "" })), [rawBookmarks]);
  const previouslyRead   = useMemo(() => toArray(rawHistory).map((b) => ({ cover_url: b.book_cover || "", title: b.book_title || "Unknown", author: b.book_author || "", genre: b.source || "General", stars: stars(b.rating || 4) })), [rawHistory]);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setSearched(true); setSearchLoading(true);
    try {
      const data = await searchGutenberg(token, q);
      setSearchResults((data.results || []).map((b) => ({
        gutenbergId: b.book_id, title: b.title || "Untitled",
        author: (b.authors || []).join(", ") || "Unknown",
        cover: b.cover_url || "", description: b.description || "", year: b.year || null,
      })));
    } catch (_) { setSearchResults([]); }
    setSearchLoading(false);
  }, [token]);

  const clearSearch = () => { setSearched(false); setSearchQuery(""); setSearchResults([]); };
  const handleLogout = () => { queryClient.clear(); logout(); navigate("/"); };

  function renderPanel() {
    switch (activePanel) {
      case "recent":        return recentReadings.length   > 0 ? recentReadings.map((b,i)   => <PanelBookRow key={i} book={b} extra={<div className="panel-row-extra"><span>{b.last_read}</span><span style={{color:"#f59e0b"}}>{b.progress_pct}</span></div>}/>) : <p className="panel-empty">No recent readings yet.</p>;
      case "bookmarks":     return bookmarkedBooks.length  > 0 ? bookmarkedBooks.map((b,i)  => <PanelBookRow key={i} book={b} extra={<div className="panel-row-extra"><span style={{color:"#6b7280"}}>{b.source}</span></div>}/>) : <p className="panel-empty">No bookmarks yet.</p>;
      case "history":       return readingHistory.length   > 0 ? readingHistory.map((b,i)   => <PanelBookRow key={i} book={b} extra={<div className="panel-row-extra"><span style={{color:"#9ca3af"}}>{b.completed_date}</span><span style={{color:"#f59e0b"}}>{b.stars}</span></div>}/>) : <p className="panel-empty">No reading history yet.</p>;
      case "previously_read": return previouslyRead.length > 0 ? previouslyRead.map((b,i)  => <PanelBookRow key={i} book={b} extra={<div className="panel-row-extra"><span className="genre-badge">{b.genre}</span><span style={{color:"#f59e0b"}}>{b.stars}</span></div>}/>) : <p className="panel-empty">Nothing here yet.</p>;
      case "calendar":      return calendarEvents.map((ev,i) => (
        <div key={i} className="cal-event">
          <div className="cal-date" style={{color:ev.color}}><span className="cal-day-short">{ev.day_short}</span><span className="cal-day-num">{ev.day_num}</span></div>
          <div className="cal-bar" style={{background:ev.color}}/>
          <div className="cal-info"><span className="cal-title">{ev.title}</span><span className="cal-type" style={{color:ev.color}}>{ev.type}</span></div>
        </div>));
      default: return null;
    }
  }

  return (
    <div className="dash-root">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="dash-navbar">
        <span className="dash-brand">SHELF</span>
        <div className="dash-nav-links">
          <span className="dash-nav-link dash-nav-link-active">Library</span>
          <span className="dash-nav-link">Journal</span>
          <span className="dash-nav-link">Store</span>
        </div>
        <div className="dash-nav-right">
          <button className="dash-icon-btn"><IconBell /></button>
          <div className="dash-avatar"><IconUser /></div>
          <span className="dash-nav-username">{username}</span>
          <button className="dash-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="dash-main">

        {/* Search bar */}
        <div className="dash-search-bar-wrap">
          <div className="dash-search-bar">
            <IconSearch />
            <input
              className="dash-search-input"
              placeholder={`Search for ${PLACEHOLDER_WORDS[phIndex]}…`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(searchQuery); if (e.key === "Escape") clearSearch(); }}
            />
            {searchQuery && <button className="dash-search-clear" onClick={clearSearch}>✕</button>}
          </div>
        </div>

        <h1 className="dash-heading">What would you like to read?</h1>

        {/* Hero cards */}
        <div className="dash-hero-cards">
          {HERO_CARDS.map((card) => (
            <HeroCard key={card.key} card={card} active={activePanel === card.key}
              onClick={(k) => setActivePanel((p) => p === k ? "" : k)} counts={counts} />
          ))}
        </div>

        {/* Active panel */}
        {activePanel && (
          <div className="dash-panel">
            <div className="dash-panel-header">
              <span className="dash-panel-title">{HERO_CARDS.find(c => c.key === activePanel)?.label}</span>
              <button className="dash-panel-close" onClick={() => setActivePanel("")}>✕</button>
            </div>
            <div className="dash-panel-content">{renderPanel()}</div>
          </div>
        )}

        {/* Search results */}
        {searched && (
          <div className="dash-search-results">
            <div className="dash-results-header">
              <h3>Results for "<strong>{searchQuery}</strong>"</h3>
              <button onClick={clearSearch}>✕ Clear</button>
            </div>
            {searchLoading
              ? <div className="dash-spinner-wrap"><div className="dash-spinner" /></div>
              : searchResults.length > 0
                ? <div className="dash-src-grid">{searchResults.map((b,i) => <SearchResultCard key={`${b.gutenbergId}-${i}`} book={b} />)}</div>
                : <p className="dash-no-results">No results found.</p>}
          </div>
        )}

        {/* Shelf rows */}
        {!searched && (rowsLoading && gutenbergRows.length === 0
          ? <div className="dash-spinner-wrap"><div className="dash-spinner" /></div>
          : gutenbergRows.map((row) => (
            <div key={row.label} className="dash-shelf">
              <div className="dash-shelf-header">
                <h2 className="dash-shelf-label">{row.label}</h2>
                <span className="dash-shelf-all">VIEW ALL COLLECTION</span>
              </div>
              <div className="dash-shelf-scroll">
                {row.books.map((book, i) => <BookCard key={`${book.gutenbergId}-${i}`} book={book} />)}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}