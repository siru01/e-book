import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { searchGutenberg } from "../api/shelf";
import "./DashboardPage.css";
import {
  useMyBooks,
  useMyHistory,
  useMyBookmarks,
  useGutenbergRows,
} from "../hooks/useDashboardData";

const HERO_CARDS = [
  { key: "recent",          label: "Recent Readings", bg: "#eef2ff" },
  { key: "bookmarks",       label: "Bookmarks",       bg: "#fefce8" },
  { key: "calendar",        label: "Calendar",        bg: "#eff6ff" },
  { key: "history",         label: "History",         bg: "#faf5ff" },
  { key: "previously_read", label: "Previously Read", bg: "#f0fdf4" },
];

const PANEL_LABELS = {
  recent:          "Recent Readings",
  bookmarks:       "Bookmarks",
  calendar:        "Calendar",
  history:         "History",
  previously_read: "Previously Read",
};

const PANEL_ACCENTS = {
  recent:          "#f59e0b",
  bookmarks:       "#ec4899",
  calendar:        "#7c3aed",
  history:         "#0284c7",
  previously_read: "#059669",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const stars = (r) => {
  const n = Math.max(0, Math.min(5, r));
  return "★".repeat(n) + "☆".repeat(5 - n);
};

const toArray = (raw) =>
  Array.isArray(raw) ? raw : raw?.results || [];

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

// ── Book card — always opens YOUR reader ──────────────────────────
function BookCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="guten-card">
      <div className="guten-card-cover">
        {book.cover
          ? <img src={book.cover} alt={book.title} loading="lazy" />
          : <span>📖</span>}
        <div className="guten-card-overlay">
          <button
            className="guten-read-btn"
            onClick={() => navigate(`/read/${encodeURIComponent(book.gutenbergId)}`)}
          >
            Read Now
          </button>
        </div>
      </div>
      <div className="guten-card-meta">
        <span className="guten-card-title">{book.title}</span>
        <span className="guten-card-author">{book.author}</span>
        {book.year && <span className="guten-card-year">{book.year}</span>}
      </div>
    </div>
  );
}

// ── Search result card — always opens YOUR reader ─────────────────
function SearchResultCard({ book }) {
  const navigate = useNavigate();
  return (
    <div className="search-result-card">
      <div className="src-cover">
        {book.cover
          ? <img src={book.cover} alt="" loading="lazy" />
          : <span>📖</span>}
      </div>
      <div className="src-info">
        <span className="src-title">{book.title}</span>
        <span className="src-author">{book.author}</span>
        {book.year && <span className="src-year">{book.year}</span>}
        {book.description && (
          <span className="src-desc">{book.description.slice(0, 120)}…</span>
        )}
        <div className="src-footer">
          <button
            className="src-read-btn"
            onClick={() => navigate(`/read/${encodeURIComponent(book.gutenbergId)}`)}
          >
            📖 Read Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [expanded,    setExpanded]    = useState(true);
  const [activePanel, setActivePanel] = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched,      setSearched]      = useState(false);

  const { data: rawBooks      = [] } = useMyBooks(token);
  const { data: rawHistory    = [] } = useMyHistory(token);
  const { data: rawBookmarks  = [] } = useMyBookmarks(token);
  const { data: gutenbergRows = [], isLoading: rowsLoading } = useGutenbergRows();

  const recentReadings = useMemo(() =>
    toArray(rawBooks).map((b) => ({
      cover_url:    b.book_cover || "",
      title:        b.book_title || "Unknown",
      author:       b.book_author || "",
      last_read:    b.last_read || b.last_borrowed || "Recently",
      progress_pct: `${parseInt(b.progress_percent || b.progress || 0)}%`,
    })), [rawBooks]);

  const calendarEvents = useMemo(() => {
    const today = new Date();
    const events = toArray(rawBooks).flatMap((b) => {
      if (!b.due_date) return [];
      const due   = new Date(b.due_date);
      const delta = Math.floor((due - today) / 86_400_000);
      const color = delta < 0 ? "#ef4444" : delta <= 3 ? "#f59e0b" : "#6366f1";
      const type  = delta < 0 ? "overdue" : delta <= 3 ? "due soon" : "return";
      return [{ day_short: DAY_NAMES[due.getDay()], day_num: due.getDate(),
                title: `Return: ${b.book_title}`, type, color }];
    });
    events.push({
      day_short: DAY_NAMES[today.getDay()], day_num: today.getDate(),
      title: "Reading Goal: Keep it up! 📖", type: "goal", color: "#8b5cf6",
    });
    return events;
  }, [rawBooks]);

  const readingHistory = useMemo(() =>
    toArray(rawHistory).map((b) => ({
      cover_url:      b.book_cover || "",
      title:          b.book_title || "Unknown",
      author:         b.book_author || "",
      completed_date: b.finished_at || b.returned_date || "",
      stars:          stars(b.rating || 4),
    })), [rawHistory]);

  const previouslyRead = useMemo(() =>
    toArray(rawHistory).map((b) => ({
      cover_url: b.book_cover || "",
      title:     b.book_title || "Unknown",
      author:    b.book_author || "",
      genre:     b.genre || b.source || "General",
      read_on:   b.finished_at || b.returned_date || "",
      stars:     stars(b.rating || 4),
    })), [rawHistory]);

  const bookmarkedBooks = useMemo(() =>
    toArray(rawBookmarks).map((b) => ({
      cover_url: b.book_cover || "",
      title:     b.book_title || b.title || "Unknown",
      author:    b.book_author || b.author || "",
      source:    b.source || "gutenberg",
      note:      b.note || "",
    })), [rawBookmarks]);

  const handlePanelToggle = useCallback((key) => {
    setActivePanel((p) => (p === key ? "" : key));
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearched(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    setSearched(true);
    setSearchLoading(true);
    try {
      const data = await searchGutenberg(token, q);
      setSearchResults((data.results || []).map((b) => ({
        gutenbergId: b.book_id,
        title:       b.title || "Untitled",
        author:      (b.authors || []).join(", ") || "Unknown",
        cover:       b.cover_url || "",
        source:      b.source || "gutenberg",
        description: b.description || "",
        year:        b.year || null,
      })));
    } catch (_) {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, [token]);

  function renderPanel() {
    switch (activePanel) {
      case "recent":
        return recentReadings.length > 0
          ? recentReadings.map((b, i) => (
              <PanelBookRow key={i} book={b} extra={
                <div className="panel-row-extra">
                  <span>{b.last_read}</span>
                  <span style={{ color: "#f59e0b", fontWeight: 700 }}>{b.progress_pct}</span>
                </div>
              } />
            ))
          : <p className="panel-empty">No recent readings yet.</p>;
      case "bookmarks":
        return bookmarkedBooks.length > 0
          ? bookmarkedBooks.map((b, i) => (
              <PanelBookRow key={i} book={b} extra={
                <div className="panel-row-extra">
                  <span style={{ color: "#ec4899" }}>{b.source}</span>
                  <span style={{ color: "#6b7280", fontStyle: "italic" }}>{b.note}</span>
                </div>
              } />
            ))
          : <p className="panel-empty">No bookmarks yet.</p>;
      case "calendar":
        return calendarEvents.map((ev, i) => (
          <div key={i} className="cal-event">
            <div className="cal-date" style={{ color: ev.color }}>
              <span className="cal-day-short">{ev.day_short}</span>
              <span className="cal-day-num">{ev.day_num}</span>
            </div>
            <div className="cal-bar" style={{ background: ev.color }} />
            <div className="cal-info">
              <span className="cal-title">{ev.title}</span>
              <span className="cal-type" style={{ color: ev.color }}>{ev.type}</span>
            </div>
          </div>
        ));
      case "history":
        return readingHistory.length > 0
          ? readingHistory.map((b, i) => (
              <PanelBookRow key={i} book={b} extra={
                <div className="panel-row-extra">
                  <span style={{ color: "#9ca3af" }}>Completed {b.completed_date}</span>
                  <span style={{ color: "#f59e0b" }}>{b.stars}</span>
                </div>
              } />
            ))
          : <p className="panel-empty">No reading history yet.</p>;
      case "previously_read":
        return previouslyRead.length > 0
          ? previouslyRead.map((b, i) => (
              <PanelBookRow key={i} book={b} extra={
                <div className="panel-row-extra">
                  <span className="genre-badge">{b.genre}</span>
                  <span style={{ color: "#f59e0b" }}>{b.stars}</span>
                </div>
              } />
            ))
          : <p className="panel-empty">Nothing here yet.</p>;
      default:
        return null;
    }
  }

  return (
    <div className="dashboard-root">
      <Sidebar expanded={expanded} onToggle={() => setExpanded((e) => !e)} />
      <Topbar
        expanded={expanded}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
      />
      <div className={`dashboard-content ${
        expanded ? "dashboard-content-expanded" : "dashboard-content-collapsed"
      }`}>
        <div className="dash-topbar-bg">
          <div className="dash-topbar-inner">
            <h2 className="dash-heading">What would you like to read?</h2>
          </div>
        </div>
        <div className="dash-body">
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
          {activePanel && (
            <div className="hero-panel">
              <div className="hero-panel-header">
                <div className="hero-panel-bar" style={{ background: PANEL_ACCENTS[activePanel] }} />
                <span className="hero-panel-title">{PANEL_LABELS[activePanel]}</span>
              </div>
              <div className="hero-panel-content">{renderPanel()}</div>
            </div>
          )}
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
                  {searchResults.map((b, i) => (
                    <SearchResultCard key={`${b.gutenbergId}-${i}`} book={b} />
                  ))}
                </div>
              ) : (
                <p className="no-results">No results found.</p>
              )}
            </div>
          )}
          {!searched && (
            rowsLoading && gutenbergRows.length === 0 ? (
              <div className="dash-spinner-wrap"><div className="dash-spinner" /></div>
            ) : (
              gutenbergRows.map((row) => (
                <div key={row.label} className="shelf-row">
                  <h3 className="shelf-row-label">{row.label}</h3>
                  <div className="shelf-row-scroll">
                    {row.books.map((book, i) => (
                      <BookCard key={`${book.gutenbergId}-${i}`} book={book} />
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