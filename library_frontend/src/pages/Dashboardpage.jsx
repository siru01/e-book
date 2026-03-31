import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
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

const toArray = (raw) => Array.isArray(raw) ? raw : raw?.results || [];
const stars   = (r)   => { const n = Math.max(0, Math.min(5, r)); return "★".repeat(n) + "☆".repeat(5 - n); };

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
      </div>
    </div>
  );
}

/* ── Search Result Card ── */
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
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HeroCard — Pure CSS transition approach (like the yellow box)

   SAME element expands. No portal. No FLIP math.
   
   How it works:
   - Card is position:fixed when open, position:static when closed
   - CSS transitions width, height, top, left, border-radius smoothly
   - We snapshot the card's rect BEFORE opening, apply it as inline
     style (so the fixed card starts at the exact same visual position),
     then on next frame switch to the "open" styles → CSS does the rest
   - On close: reverse inline styles back to card position → CSS animates
     back, then remove fixed positioning
   - Siblings never re-render (memo + CSS dimming via data-active)
══════════════════════════════════════════════════════════════════ */
const HeroCard = memo(function HeroCard({ card, counts, panelContent, onExpand, onCollapse }) {
  const cardRef          = useRef(null);
  const [isOpen,         setIsOpen]         = useState(false);
  const [isAnimating,    setIsAnimating]    = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [cardStyle,      setCardStyle]      = useState({});

  const open = useCallback(() => {
    if (isOpen || isAnimating) return;
    const rect = cardRef.current.getBoundingClientRect();

    // Step 1: pin card to its current exact screen position using fixed
    setCardStyle({
      position  : "fixed",
      top       : `${rect.top}px`,
      left      : `${rect.left}px`,
      width     : `${rect.width}px`,
      height    : `${rect.height}px`,
      margin    : 0,
      zIndex    : 400,
      transition: "none",           // no transition yet — just teleport into place
    });

    setIsAnimating(true);
    onExpand();

    // Step 2: next frame → switch to open dimensions with transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const openW = Math.min(560, vw * 0.92);
        const openH = Math.min(540, vh * 0.85);
        setCardStyle({
          position    : "fixed",
          top         : `${(vh - openH) / 2}px`,
          left        : `${(vw - openW) / 2}px`,
          width       : `${openW}px`,
          height      : `${openH}px`,
          margin      : 0,
          zIndex      : 400,
          borderRadius: "28px",
          boxShadow   : "0 32px 80px rgba(0,0,0,0.22)",
          // CSS transition-property: top, left, width, height, border-radius
          transition  : [
            "top 0.55s cubic-bezier(0.32, 0.72, 0, 1)",
            "left 0.55s cubic-bezier(0.32, 0.72, 0, 1)",
            "width 0.55s cubic-bezier(0.32, 0.72, 0, 1)",
            "height 0.55s cubic-bezier(0.32, 0.72, 0, 1)",
            "border-radius 0.55s ease",
            "box-shadow 0.55s ease",
          ].join(", "),
        });
        setIsOpen(true);
        setTimeout(() => {
          setContentVisible(true);
          setIsAnimating(false);
        }, 360);
      });
    });
  }, [isOpen, isAnimating, onExpand]);

  const close = useCallback(() => {
    if (!isOpen || isAnimating) return;
    const rect = cardRef.current.getBoundingClientRect();

    setContentVisible(false);
    setIsAnimating(true);

    // Find where the card SHOULD be in the layout (its placeholder position)
    // The card is currently fixed so we read the ghost placeholder
    const ghost = cardRef.current.parentElement.querySelector(".hc-ghost");
    const ghostRect = ghost ? ghost.getBoundingClientRect() : rect;

    // Animate back to original card position
    setCardStyle(prev => ({
      ...prev,
      top         : `${ghostRect.top}px`,
      left        : `${ghostRect.left}px`,
      width       : `${ghostRect.width}px`,
      height      : `${ghostRect.height}px`,
      borderRadius: "20px",
      boxShadow   : "none",
      transition  : [
        "top 0.48s cubic-bezier(0.32, 0.72, 0, 1)",
        "left 0.48s cubic-bezier(0.32, 0.72, 0, 1)",
        "width 0.48s cubic-bezier(0.32, 0.72, 0, 1)",
        "height 0.48s cubic-bezier(0.32, 0.72, 0, 1)",
        "border-radius 0.48s ease",
        "box-shadow 0.48s ease",
        "opacity 0.15s ease 0.32s",
      ].join(", "),
      opacity: 0,
    }));

    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
      setCardStyle({});
      onCollapse();
    }, 500);
  }, [isOpen, isAnimating, onCollapse]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const isExpanded = isOpen || isAnimating;

  return (
    <div className="hero-card-wrapper">
      {/* Ghost placeholder — keeps layout space while card is fixed */}
      {isExpanded && <div className="hc-ghost" />}

      {/* Backdrop */}
      {isExpanded && (
        <div
          className={`hc-backdrop ${isOpen ? "hc-backdrop--on" : ""}`}
          onMouseDown={close}
        />
      )}

      {/* THE CARD — same element, transitions via CSS */}
      <div
        ref={cardRef}
        className={[
          "hero-card",
          isExpanded ? "hero-card--expanded" : "",
        ].filter(Boolean).join(" ")}
        style={cardStyle}
        onClick={!isExpanded ? open : undefined}
      >
        {/* Header — always visible */}
        <div className="hc-top">
          <span className="hc-label">{card.label}</span>
          <span className="hc-stat">{card.stat(counts)}</span>
        </div>

        {/* Content — only visible when open */}
        {isExpanded && (
          <div className={`hc-content ${contentVisible ? "hc-content--visible" : ""}`}>
            {panelContent}
          </div>
        )}

        {/* Footer */}
        <div className="hc-bottom">
          <span className="hc-sub">{card.sub}</span>
          <div className="hc-icon"><card.Icon /></div>
        </div>

        {/* Close button — only when open */}
        {isExpanded && (
          <button className="hc-close" onMouseDown={close}>✕</button>
        )}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════
   Dashboard Page
══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { token, logout } = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [activePanel,   setActivePanel]   = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched,      setSearched]      = useState(false);
  const [phIndex,       setPhIndex]       = useState(0);

  const PLACEHOLDER_WORDS = ["literature","mystery","sci-fi","fantasy","history","philosophy"];

  useEffect(() => {
    const t = setInterval(() => setPhIndex(i => (i + 1) % PLACEHOLDER_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const { data: rawBooks      = [] } = useMyBooks(token);
  const { data: rawHistory    = [] } = useMyHistory(token);
  const { data: rawBookmarks  = [] } = useMyBookmarks(token);
  const { data: gutenbergRows = [], isLoading: rowsLoading } = useGutenbergRows();

  const counts = useMemo(() => ({
    books : toArray(rawBooks).length,
    marks : toArray(rawBookmarks).length,
    streak: 12,
    done  : toArray(rawHistory).length,
  }), [rawBooks, rawBookmarks, rawHistory]);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setSearched(true); setSearchLoading(true);
    try {
      const data = await searchGutenberg(token, q);
      setSearchResults((data.results || []).map(b => ({
        gutenbergId: b.book_id, title: b.title,
        author: (b.authors || []).join(", "), cover: b.cover_url,
      })));
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }, [token]);

  const clearSearch = () => { setSearched(false); setSearchQuery(""); setSearchResults([]); };

  const handleExpand   = useCallback((key) => setActivePanel(key), []);
  const handleCollapse = useCallback(()    => setActivePanel(""),  []);

  const getPanelContent = useCallback((key) => {
    const readings = toArray(rawBooks);
    const history  = toArray(rawHistory);
    const marks    = toArray(rawBookmarks);
    switch (key) {
      case "recent":
        return readings.length > 0
          ? readings.map((b, i) => (
              <PanelBookRow key={i}
                book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }}
                extra={<div className="panel-row-extra"><span>{b.last_read}</span><span style={{color:"#f59e0b"}}>{parseInt(b.progress_percent)}%</span></div>}
              />))
          : <p className="panel-empty">No recent readings.</p>;
      case "bookmarks":
        return marks.length > 0
          ? marks.map((b, i) => (
              <PanelBookRow key={i}
                book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }}
                extra={<div className="panel-row-extra"><span>{b.source}</span></div>}
              />))
          : <p className="panel-empty">No bookmarks saved.</p>;
      case "history":
        return history.length > 0
          ? history.map((b, i) => (
              <PanelBookRow key={i}
                book={{ title: b.book_title, author: b.book_author, cover_url: b.book_cover }}
                extra={<div className="panel-row-extra"><span>{b.finished_at}</span><span>{stars(b.rating)}</span></div>}
              />))
          : <p className="panel-empty">No history recorded.</p>;
      default: return null;
    }
  }, [rawBooks, rawHistory, rawBookmarks]);

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
          <button className="dash-logout-btn" onClick={() => { queryClient.clear(); logout(); navigate("/"); }}>
            Logout
          </button>
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

        {!searched && <h1 className="dash-heading">What would you like to read?</h1>}

        {!searched && (
          <div className="dash-hero-cards" data-active={activePanel || undefined}>
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
              ? <div className="dash-spinner-wrap"><div className="dash-spinner" /></div>
              : gutenbergRows.map(row => (
                  <div key={row.label} className="dash-shelf">
                    <div className="dash-shelf-header">
                      <h2 className="dash-shelf-label">{row.label}</h2>
                      <span className="dash-shelf-all">VIEW ALL</span>
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