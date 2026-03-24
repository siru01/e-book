import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  fetchMyBooks, fetchMyHistory, fetchMyBookmarks,
  fetchGutendexRows, searchGutenberg, parseGutendexBook,
} from "../api/shelf";
import "./DashboardPage.css";

// ── Hero panel cards ──
const HERO_CARDS = [
  { key: "recent",          label: "Recent Readings",  bg: "#eef2ff" },
  { key: "bookmarks",       label: "Bookmarks",        bg: "#fefce8" },
  { key: "calendar",        label: "Calendar",         bg: "#eff6ff" },
  { key: "history",         label: "History",          bg: "#faf5ff" },
  { key: "previously_read", label: "Previously Read",  bg: "#f0fdf4" },
];

function HeroCard({ panelKey, label, bg, active, onClick }) {
  return (
    <div
      className={`hero-card ${active ? "hero-card-active" : ""}`}
      style={{ background: bg }}
      onClick={() => onClick(panelKey)}
    >
      <span className="hero-card-label">{label}</span>
      <div className="hero-card-img">📚</div>
    </div>
  );
}

function PanelBookRow({ book, extra }) {
  return (
    <div className="panel-book-row">
      <div className="panel-book-cover">
        {book.cover_url
          ? <img src={book.cover_url} alt="" />
          : <span>📚</span>}
      </div>
      <div className="panel-book-info">
        <span className="panel-book-title">{book.title}</span>
        <span className="panel-book-author">{book.author}</span>
        {extra}
      </div>
    </div>
  );
}

function GutenbergBookCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="guten-card">
      <div className="guten-card-cover">
        {book.cover ? <img src={book.cover} alt="" /> : <span>📖</span>}
        <div className="guten-card-overlay">
          <button className="guten-read-btn" onClick={() => navigate(`/read/${book.gutenbergId}`)}>
            Read Now
          </button>
        </div>
      </div>
      <div className="guten-card-meta">
        <span className="guten-card-title">{book.title}</span>
        <span className="guten-card-author">{book.author}</span>
      </div>
    </div>
  );
}

function SearchResultCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="search-result-card">
      <div className="src-cover">
        {book.cover ? <img src={book.cover} alt="" /> : <span>📖</span>}
      </div>
      <div className="src-info">
        <span className="src-title">{book.title}</span>
        <span className="src-author">{book.author}</span>
        <button className="src-read-btn" onClick={() => navigate(`/read/${book.gutenbergId}`)}>
          📖 Read Now
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState("");

  // Dashboard data
  const [recentReadings, setRecentReadings] = useState([]);
  const [bookmarkedBooks, setBookmarkedBooks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);
  const [previouslyRead, setPreviouslyRead] = useState([]);

  // Gutenberg rows
  const [gutenbergRows, setGutenbergRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Load dashboard stats on mount
  useEffect(() => {
    async function load() {
      try {
        const raw = await fetchMyBooks(token);
        const books = Array.isArray(raw) ? raw : raw.results || [];
        setRecentReadings(books.map((b) => ({
          cover_url: b.book_cover || "",
          title: b.book_title || "Unknown",
          author: b.book_author || "",
          last_read: b.last_read || b.last_borrowed || "Recently",
          progress_pct: `${parseInt(b.progress_percent || b.progress || 0)}%`,
        })));

        // Calendar events
        const today = new Date();
        const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const events = books.flatMap((b) => {
          if (!b.due_date) return [];
          const due = new Date(b.due_date);
          const delta = Math.floor((due - today) / 86400000);
          const color = delta < 0 ? "#ef4444" : delta <= 3 ? "#f59e0b" : "#6366f1";
          const type = delta < 0 ? "overdue" : delta <= 3 ? "due soon" : "return";
          return [{ day_short: dayNames[due.getDay()], day_num: due.getDate(), title: `Return: ${b.book_title}`, type, color }];
        });
        events.push({ day_short: dayNames[today.getDay()], day_num: today.getDate(), title: "Reading Goal: Keep it up! 📖", type: "goal", color: "#8b5cf6" });
        setCalendarEvents(events);
      } catch (_) {}

      try {
        const raw = await fetchMyHistory(token);
        const hist = Array.isArray(raw) ? raw : raw.results || [];
        const stars = (r) => "★".repeat(Math.max(0,Math.min(5,r))) + "☆".repeat(5 - Math.max(0,Math.min(5,r)));
        setReadingHistory(hist.map((b) => ({ cover_url: b.book_cover||"", title: b.book_title||"Unknown", author: b.book_author||"", completed_date: b.returned_date||b.due_date||"", stars: stars(b.rating||4) })));
        setPreviouslyRead(hist.map((b) => ({ cover_url: b.book_cover||"", title: b.book_title||"Unknown", author: b.book_author||"", genre: b.genre||b.category||"General", read_on: b.returned_date||b.due_date||"", stars: stars(b.rating||4) })));
      } catch (_) {}

      try {
        const raw = await fetchMyBookmarks(token);
        const bm = Array.isArray(raw) ? raw : raw.results || [];
        setBookmarkedBooks(bm.map((b) => ({ cover_url: b.book_cover||"", title: b.book_title||b.title||"Unknown", author: b.book_author||b.author||"", page: String(b.page_number||b.page||"—"), note: b.note||b.description||"" })));
      } catch (_) {}
    }
    load();
  }, [token]);

  // Load gutenberg rows
  useEffect(() => {
    fetchGutendexRows().then((rows) => {
      setGutenbergRows(rows);
      setRowsLoading(false);
    });
  }, []);

  function handlePanelToggle(key) {
    setActivePanel((p) => (p === key ? "" : key));
  }

  async function handleSearch(q) {
    setSearchQuery(q);
    setSearched(true);
    setSearchLoading(true);
    try {
      const data = await searchGutenberg(token, q);
      setSearchResults((data.results || []).map(parseGutendexBook));
    } catch (_) {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }

  function handleClearSearch() {
    setSearched(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  function renderPanel() {
    switch (activePanel) {
      case "recent":
        return recentReadings.map((b, i) => (
          <PanelBookRow key={i} book={b} extra={
            <div className="panel-row-extra">
              <span>{b.last_read}</span>
              <span style={{color:"#f59e0b",fontWeight:700}}>{b.progress_pct}</span>
            </div>
          } />
        ));
      case "bookmarks":
        return bookmarkedBooks.map((b, i) => (
          <PanelBookRow key={i} book={b} extra={
            <div className="panel-row-extra">
              <span style={{color:"#ec4899"}}>Page {b.page}</span>
              <span style={{color:"#6b7280",fontStyle:"italic"}}>{b.note}</span>
            </div>
          } />
        ));
      case "calendar":
        return calendarEvents.map((ev, i) => (
          <div key={i} className="cal-event">
            <div className="cal-date" style={{color:ev.color}}>
              <span className="cal-day-short">{ev.day_short}</span>
              <span className="cal-day-num">{ev.day_num}</span>
            </div>
            <div className="cal-bar" style={{background:ev.color}} />
            <div className="cal-info">
              <span className="cal-title">{ev.title}</span>
              <span className="cal-type" style={{color:ev.color}}>{ev.type}</span>
            </div>
          </div>
        ));
      case "history":
        return readingHistory.map((b, i) => (
          <PanelBookRow key={i} book={b} extra={
            <div className="panel-row-extra">
              <span style={{color:"#9ca3af"}}>Completed {b.completed_date}</span>
              <span style={{color:"#f59e0b"}}>{b.stars}</span>
            </div>
          } />
        ));
      case "previously_read":
        return previouslyRead.map((b, i) => (
          <PanelBookRow key={i} book={b} extra={
            <div className="panel-row-extra">
              <span className="genre-badge">{b.genre}</span>
              <span style={{color:"#f59e0b"}}>{b.stars}</span>
            </div>
          } />
        ));
      default:
        return null;
    }
  }

  const panelLabels = { recent: "Recent Readings", bookmarks: "Bookmarks", calendar: "Calendar", history: "History", previously_read: "Previously Read" };
  const panelAccents = { recent: "#f59e0b", bookmarks: "#ec4899", calendar: "#7c3aed", history: "#0284c7", previously_read: "#059669" };

  return (
    <div className="dashboard-root">
      <Sidebar expanded={expanded} onToggle={() => setExpanded((e) => !e)} />
      <Topbar expanded={expanded} onSearch={handleSearch} onClearSearch={handleClearSearch} />

      <div className={`dashboard-content ${expanded ? "dashboard-content-expanded" : "dashboard-content-collapsed"}`}>
        {/* Topbar */}
        <div className="dash-topbar-bg">
          <div className="dash-topbar-inner">
            <h2 className="dash-heading">What would you like to read?</h2>
          </div>
        </div>

        <div className="dash-body">
          {/* Hero cards */}
          <div className="hero-cards-row">
            {HERO_CARDS.map((c) => (
              <HeroCard
                key={c.key}
                panelKey={c.key}
                label={c.label}
                bg={c.bg}
                active={activePanel === c.key}
                onClick={handlePanelToggle}
              />
            ))}
          </div>

          {/* Hero panel */}
          {activePanel && (
            <div className="hero-panel">
              <div className="hero-panel-header">
                <div className="hero-panel-bar" style={{background: panelAccents[activePanel]}} />
                <span className="hero-panel-title">{panelLabels[activePanel]}</span>
              </div>
              <div className="hero-panel-content">
                {renderPanel()}
              </div>
            </div>
          )}

          {/* Search results */}
          {searched && (
            <div className="search-section">
              <div className="search-section-header">
                <h3>Results for "{searchQuery}"</h3>
                <button className="clear-search-btn" onClick={handleClearSearch}>✕ Clear</button>
              </div>
              {searchLoading ? (
                <div className="dash-spinner-wrap"><div className="dash-spinner" /></div>
              ) : searchResults.length > 0 ? (
                <div className="search-results-grid">
                  {searchResults.map((b) => <SearchResultCard key={b.gutenbergId} book={b} />)}
                </div>
              ) : (
                <p className="no-results">No results found.</p>
              )}
            </div>
          )}

          {/* Shelf rows */}
          {!searched && (
            rowsLoading && gutenbergRows.length === 0 ? (
              <div className="dash-spinner-wrap"><div className="dash-spinner" /></div>
            ) : (
              gutenbergRows.map((row) => (
                <div key={row.label} className="shelf-row">
                  <h3 className="shelf-row-label">{row.label}</h3>
                  <div className="shelf-row-scroll">
                    {row.books.map((book) => (
                      <GutenbergBookCard key={book.gutenbergId} book={book} />
                    ))}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}