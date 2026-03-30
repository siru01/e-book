import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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

/* ── Icons ── */
const IconBook     = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const IconBookmark = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconCal      = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconHistory  = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>;
const IconCheck    = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconSearch   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconBell     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconUser     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

const HERO_CARDS = [
  { key: "recent",          label: "RECENT READINGS", sub: "Continue where you left", Icon: IconBook,     stat: (c) => `${c.books} BOOKS`   },
  { key: "bookmarks",       label: "BOOKMARKS",        sub: "Your saved excerpts",    Icon: IconBookmark, stat: (c) => `${c.marks} MARKS`   },
  { key: "calendar",        label: "CALENDAR",         sub: "Daily reading schedule", Icon: IconCal,      stat: (c) => `STREAK ${c.streak}` },
  { key: "history",         label: "HISTORY",          sub: "Review your journey",    Icon: IconHistory,  stat: ()  => "FULL LOG"            },
  { key: "previously_read", label: "FINISHED",         sub: "Your completed library", Icon: IconCheck,    stat: (c) => `${c.done} DONE`      },
];

/* ── UI Components ── */
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
        {book.cover ? <img src={book.cover} alt={book.title} loading="lazy" /> : <div className="book-card-placeholder">📖</div>}
        <div className="book-card-hover"><span>Read Now</span></div>
      </div>
      <div className="book-card-meta">
        <span className="book-card-title">{book.title}</span>
        <span className="book-card-author">{book.author}</span>
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
        <button className="src-card-btn">Read Now</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HeroCard — Handing Container Transform (FLIP)
══════════════════════════════════════════════════════════════════ */
function HeroCard({ card, counts, panelContent, onExpand, onCollapse, isOtherActive }) {
  const cardRef = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | expanding | open | closing
  const [flipStyles, setFlipStyles] = useState({});
  const [originRect, setOriginRect] = useState(null);

  const open = () => {
    if (phase !== "idle") return;

    // 1. Record where we are starting from
    const rect = cardRef.current.getBoundingClientRect();
    setOriginRect(rect);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetW = Math.min(560, vw * 0.92);
    const targetH = Math.min(540, vh * 0.82);

    // 2. Initial "Inverted" state (Matches small card exactly)
    const scaleX = rect.width / targetW;
    const scaleY = rect.height / targetH;
    const translateX = (rect.left + rect.width / 2) - (vw / 2);
    const translateY = (rect.top + rect.height / 2) - (vh / 2);

    setPhase("expanding");
    onExpand();

    setFlipStyles({
      transition: 'none',
      transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scaleX}, ${scaleY})`,
    });

    // 3. Play the animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase("open");
        setFlipStyles({
          transition: 'transform 0.5s cubic-bezier(0.2, 0, 0, 1), opacity 0.4s ease',
          transform: `translate(-50%, -50%) scale(1)`,
        });
      });
    });
  };

  const close = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!originRect) return;

    setPhase("closing");

    // 4. Calculate the reverse trip back to the EXACT origin rect
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetW = Math.min(560, vw * 0.92);
    const targetH = Math.min(540, vh * 0.82);

    const scaleX = originRect.width / targetW;
    const scaleY = originRect.height / targetH;
    const translateX = (originRect.left + originRect.width / 2) - (vw / 2);
    const translateY = (originRect.top + originRect.height / 2) - (vh / 2);

    setFlipStyles({
      transition: 'transform 0.45s cubic-bezier(0.2, 0, 0, 1), opacity 0.4s ease',
      transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scaleX}, ${scaleY})`,
      opacity: 0,
    });

    setTimeout(() => {
      setPhase("idle");
      setFlipStyles({});
      onCollapse();
    }, 450);
  }, [onCollapse, originRect]);

  const isExpanded = phase !== "idle";
  const isOpen = phase === "open";

  return (
    <div className="hero-card-wrapper" style={{ flex: 1, minWidth: '190px', position: 'relative' }}>
      {/* ── GHOST PLACEHOLDER: This holds the space in the flex row so cards don't jump ── */}
      {isExpanded && <div className="hero-card-ghost" style={{ width: '100%', height: '110px', visibility: 'hidden' }} />}

      {isExpanded && <div className={`hc-backdrop ${isOpen ? "hc-backdrop--on" : ""}`} onMouseDown={close} />}

      <div
        ref={cardRef}
        className={[
          "hero-card",
          isExpanded ? "hero-card--expanded" : "",
          isOtherActive ? "hero-card--dimmed" : "",
        ].join(" ")}
        style={flipStyles}
        onClick={!isExpanded ? open : undefined}
      >
        <div className="hc-top">
          <span className="hc-label">{card.label}</span>
          <span className="hc-stat">{card.stat(counts)}</span>
        </div>

        <div className={`hc-content ${isOpen ? "hc-content--visible" : ""}`}>
          {panelContent}
        </div>

        <div className="hc-bottom">
          <span className="hc-sub">{card.sub}</span>
          <div className="hc-icon"><card.Icon /></div>
        </div>

        {isExpanded && <button className="hc-close" onMouseDown={close}>✕</button>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Dashboard Page
══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { token, username, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activePanel, setActivePanel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [phIndex, setPhIndex] = useState(0);

  const PLACEHOLDER_WORDS = ["literature","mystery","sci-fi","fantasy","history","philosophy"];

  useEffect(() => {
    const t = setInterval(() => setPhIndex(i => (i + 1) % PLACEHOLDER_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const { data: rawBooks = [] } = useMyBooks(token);
  const { data: rawHistory = [] } = useMyHistory(token);
  const { data: rawBookmarks = [] } = useMyBookmarks(token);
  const { data: gutenbergRows = [], isLoading: rowsLoading } = useGutenbergRows();

  const counts = useMemo(() => ({
    books: toArray(rawBooks).length,
    marks: toArray(rawBookmarks).length,
    streak: 12,
    done: toArray(rawHistory).length,
  }), [rawBooks, rawBookmarks, rawHistory]);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setSearched(true); setSearchLoading(true);
    try {
      const data = await searchGutenberg(token, q);
      setSearchResults((data.results || []).map(b => ({
        gutenbergId: b.book_id, title: b.title, author: (b.authors || []).join(", "),
        cover: b.cover_url, description: b.description, year: b.year,
      })));
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }, [token]);

  const clearSearch = () => { setSearched(false); setSearchQuery(""); setSearchResults([]); };

  function getPanelContent(key) {
    const readings = toArray(rawBooks);
    const history = toArray(rawHistory);
    const marks = toArray(rawBookmarks);

    switch (key) {
      case "recent":
        return readings.length > 0
          ? readings.map((b, i) => <PanelBookRow key={i} book={{title: b.book_title, author: b.book_author, cover_url: b.book_cover}} extra={<div className="panel-row-extra"><span>{b.last_read}</span><span style={{color:"#f59e0b"}}>{parseInt(b.progress_percent)}%</span></div>}/>)
          : <p className="panel-empty">No recent readings.</p>;
      case "bookmarks":
        return marks.length > 0
          ? marks.map((b, i) => <PanelBookRow key={i} book={{title: b.book_title, author: b.book_author, cover_url: b.book_cover}} extra={<div className="panel-row-extra"><span>{b.source}</span></div>}/>)
          : <p className="panel-empty">No bookmarks saved.</p>;
      case "history":
        return history.length > 0
          ? history.map((b, i) => <PanelBookRow key={i} book={{title: b.book_title, author: b.book_author, cover_url: b.book_cover}} extra={<div className="panel-row-extra"><span>{b.finished_at}</span><span>{stars(b.rating)}</span></div>}/>)
          : <p className="panel-empty">No history recorded.</p>;
      default: return null;
    }
  }

  return (
    <div className="dash-root">
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
          <button className="dash-logout-btn" onClick={() => { queryClient.clear(); logout(); navigate("/"); }}>Logout</button>
        </div>
      </nav>

      <main className="dash-main">
        <div className="dash-search-bar-wrap">
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

        <h1 className="dash-heading">What would you like to read?</h1>

        <div className="dash-hero-cards">
          {HERO_CARDS.map(card => (
            <HeroCard
              key={card.key}
              card={card}
              counts={counts}
              panelContent={getPanelContent(card.key)}
              isOtherActive={activePanel !== "" && activePanel !== card.key}
              onExpand={() => setActivePanel(card.key)}
              onCollapse={() => setActivePanel("")}
            />
          ))}
        </div>

        {searched ? (
          <div className="dash-search-results">
            <div className="dash-results-header">
              <h3>Results for "<strong>{searchQuery}</strong>"</h3>
              <button onClick={clearSearch}>✕ Clear</button>
            </div>
            {searchLoading ? <div className="dash-spinner-wrap"><div className="dash-spinner"/></div> : (
              <div className="dash-src-grid">{searchResults.map((b, i) => <SearchResultCard key={i} book={b}/>)}</div>
            )}
          </div>
        ) : (
          <div className="dash-shelves">
            {rowsLoading ? <div className="dash-spinner-wrap"><div className="dash-spinner"/></div> : (
              gutenbergRows.map(row => (
                <div key={row.label} className="dash-shelf">
                  <div className="dash-shelf-header">
                    <h2 className="dash-shelf-label">{row.label}</h2>
                    <span className="dash-shelf-all">VIEW ALL</span>
                  </div>
                  <div className="dash-shelf-scroll">
                    {row.books.map((book, i) => <BookCard key={i} book={book}/>)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}