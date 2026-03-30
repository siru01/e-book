import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
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
   HeroCard — iOS-style expand animation

   KEY INSIGHT: The overlay is a separate DOM node rendered via portal.
   It starts positioned/scaled to look exactly like the source card,
   then transitions to full size. The source card becomes invisible
   (visibility:hidden) so layout is preserved — no reflow, no jitter.

   Other cards are memoized and only receive stable props so they
   NEVER re-render when a card opens/closes.
══════════════════════════════════════════════════════════════════ */

/* Stable child — memo prevents re-render when activePanel changes */
const HeroCard = memo(function HeroCard({ card, counts, panelContent, isActive, onExpand, onCollapse }) {
  const cardRef            = useRef(null);
  const phaseRef           = useRef("idle");
  const [phase,            setPhase]           = useState("idle");
  const [overlayStyle,     setOverlayStyle]    = useState({});
  const [contentVisible,   setContentVisible]  = useState(false);

  const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p); };

  /* Build transform that maps the centered overlay onto the card's screen rect */
  const buildTransform = useCallback((rect) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ow = Math.min(560, vw * 0.92);   // overlay natural width
    const oh = Math.min(540, vh * 0.85);   // overlay natural height

    // Card center (viewport coords)
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;

    // Overlay center when sitting at top:50% left:50% translate(-50%,-50%)
    const ocx = vw / 2;
    const ocy = vh / 2;

    const tx = cx - ocx;
    const ty = cy - ocy;
    const sx = rect.width  / ow;
    const sy = rect.height / oh;

    return `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${sx}, ${sy})`;
  }, []);

  const open = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    const rect = cardRef.current.getBoundingClientRect();

    onExpand();
    setContentVisible(false);
    setPhaseSync("opening");

    // Frame 0: overlay is hidden at its natural size, no transition yet
    setOverlayStyle({
      transition  : "none",
      transform   : buildTransform(rect),
      borderRadius: getComputedStyle(cardRef.current).borderRadius,
      opacity     : 1,
    });

    // Frame 1+: let go → CSS transition animates to center
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhaseSync("open");
        setOverlayStyle({
          transition  : "transform 0.58s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.58s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.58s ease",
          transform   : "translate(-50%, -50%) scale(1)",
          borderRadius: "28px",
          opacity     : 1,
        });
        setTimeout(() => setContentVisible(true), 360);
      });
    });
  }, [buildTransform, onExpand]);

  const close = useCallback((e) => {
    if (e) e.stopPropagation();
    if (phaseRef.current === "idle" || phaseRef.current === "closing") return;

    setContentVisible(false);
    setPhaseSync("closing");

    const rect = cardRef.current.getBoundingClientRect();

    setTimeout(() => {
      setOverlayStyle({
        transition  : "transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.5s ease, opacity 0.12s ease 0.36s",
        transform   : buildTransform(rect),
        borderRadius: getComputedStyle(cardRef.current).borderRadius,
        opacity     : 0,
      });
      setTimeout(() => {
        setPhaseSync("idle");
        setOverlayStyle({});
        onCollapse();
      }, 520);
    }, 40);
  }, [buildTransform, onCollapse]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const isExpanded = phase !== "idle";
  const isOpen     = phase === "open" || phase === "opening";

  return (
    <div className="hero-card-wrapper">
      <div
        ref={cardRef}
        className={[
          "hero-card",
          isExpanded ? "hero-card--ghost"  : "",
          /* NOTE: we do NOT pass isOtherActive here — that caused re-renders
             on every other card each time activePanel changed.
             Instead we use CSS :has() on the parent or handle via backdrop. */
        ].filter(Boolean).join(" ")}
        onClick={!isExpanded ? open : undefined}
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

      {isExpanded && createPortal(
        <>
          {/* Backdrop — clicking closes */}
          <div
            className={`hc-backdrop ${isOpen ? "hc-backdrop--on" : ""}`}
            onMouseDown={close}
          />
          {/* Expanding overlay */}
          <div className="hc-overlay" style={overlayStyle}>
            <div className="hc-top hc-overlay-tp">
              <span className="hc-label">{card.label}</span>
              <span className="hc-stat">{card.stat(counts)}</span>
            </div>
            <div className={`hc-content ${contentVisible ? "hc-content--visible" : ""}`}>
              {panelContent}
            </div>
            <div className="hc-bottom hc-overlay-bt">
              <span className="hc-sub">{card.sub}</span>
              <div className="hc-icon hc-overlay-icon"><card.Icon /></div>
            </div>
            <button className="hc-close" onMouseDown={close}>✕</button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
});

/* ── Panel Book Row ── */
function PanelBookRowMemo({ book, extra }) {
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

  /* Stable callbacks — won't cause HeroCard re-renders */
  const handleExpand   = useCallback((key) => setActivePanel(key),  []);
  const handleCollapse = useCallback(()    => setActivePanel(""),   []);

  /* Panel content — memoized per key so content doesn't rebuild on unrelated renders */
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
          /* data-has-active lets CSS dim non-active cards without JS re-renders */
          <div className="dash-hero-cards" data-active={activePanel || undefined}>
            {HERO_CARDS.map(card => (
              <HeroCard
                key={card.key}
                card={card}
                counts={counts}
                panelContent={getPanelContent(card.key)}
                isActive={activePanel === card.key}
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