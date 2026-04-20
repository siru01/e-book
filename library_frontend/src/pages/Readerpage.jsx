import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { useQueryClient } from "@tanstack/react-query";
import { saveBookmark, saveReadingActivity, recordSession, fetchBookContent, streamBookContent } from "../api/shelf";
import "./ReaderPage.css";

const CHARS_PER_PAGE = 1200;

function splitIntoPages(text) {
  let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let paragraphs = t.split(/\n{2,}/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
  if (paragraphs.length < 10) {
    paragraphs = t.split(/\n/).map(p => p.trim()).filter(Boolean);
  }
  const pages = [];
  let current = "";
  for (const para of paragraphs) {
    const candidate = current ? current + "\n\n" + para : para;
    if (current && candidate.length > CHARS_PER_PAGE) {
      pages.push(current.trim());
      current = para;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages;
}

/* ── useMediaQuery hook ── ✦ NEW */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/* ── Icons ── */
const IconAppearance = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);
const IconTypography = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 7 4 4 20 4 20 7"/>
    <line x1="9" y1="20" x2="15" y2="20"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
  </svg>
);
const IconBookmark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconArrowLeft  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;
const IconArrowRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
const IconLogout     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

/* ── Helpers ── */
const capitalizeFirst = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

/* ══════════════════════════════════════════════════════
   Profile Dropdown
══════════════════════════════════════════════════════ */
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

/* ── Vertical side label ── */
function VerticalSideLabel({ text, position }) {
  return (
    <div className={`side-label side-label--${position}`}>
      {text.split("").map((char, i) => <span key={i}>{char}</span>)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function ReaderPage() {
  const { bookId: rawBookId } = useParams();
  const { token, username, logout } = useAuth();
  const navigate = useNavigate();

  /* ✦ NEW — detect mobile */
  const isMobile = useMediaQuery("(max-width: 768px)");

  const resolvedEmail = useMemo(() => {
    try {
      const t = sessionStorage.getItem("shelf_token");
      if (!t) return "";
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.email || "";
    } catch { return ""; }
  }, [token]);

  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);

  const [fontSize,      setFontSize]      = useState(16);
  const [showTypo,      setShowTypo]      = useState(false);
  const [bookMeta,      setBookMeta]      = useState(null);
  const [pages,         setPages]         = useState([]);
  const [spreadIndex,   setSpreadIndex]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [finishedSaved, setFinishedSaved] = useState(false);
  const [sliding,       setSliding]       = useState(null);
  const [jumpValue,     setJumpValue]     = useState("");

  const totalPages  = pages.length;

  /* ✦ CHANGED — mobile shows 1 page, desktop shows 2 (spread) */
  const step        = isMobile ? 1 : 2;
  const leftPage    = pages[spreadIndex]     || "";
  const rightPage   = pages[spreadIndex + 1] || "";
  const leftPageNum = spreadIndex + 1;
  const rightPageNum = spreadIndex + 2;

  const bookId     = rawBookId ? decodeURIComponent(rawBookId) : "";
  const source     = bookId.split(":")[0] || "openlibrary";
  const chapterNum = Math.ceil((spreadIndex + 1) / 20);

  /* ── Fetch book ── */
  useEffect(() => {
    if (!bookId) { setError("No book ID provided."); setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(""); setPages([]); setSpreadIndex(0);

    (async () => {
      try {
        const data = await fetchBookContent(bookId);
        if (cancelled) return;
        setBookMeta({
          title:     data.title     || "Untitled",
          author:    data.author    || "Unknown",
          cover_url: data.cover_url || "",
          source:    data.source    || source,
          user_progress: data.user_progress || 0,
          is_bookmarked: data.is_bookmarked || false,
          is_finished:   data.is_finished   || false,
        });
        setBookmarkSaved(data.is_bookmarked || false);
        setFinishedSaved(data.is_finished   || false);
        
        let textBuffer = "";
        let isFirstSet = true;

        for await (const chunk of streamBookContent(bookId)) {
          if (cancelled) return;
          textBuffer += chunk;
          
          let processedText = textBuffer;
          const startMarker = processedText.indexOf("*** START OF");
          if (startMarker !== -1) processedText = processedText.slice(processedText.indexOf("\n", startMarker) + 1);
          const endMarker = processedText.indexOf("*** END OF");
          if (endMarker !== -1) processedText = processedText.slice(0, endMarker);

          const newPages = splitIntoPages(processedText);
          setPages(newPages);

          if (isFirstSet && newPages.length > 3) {
            setLoading(false);
            isFirstSet = false;
            
            // set target index based on progress
            if (data.user_progress > 0) {
              const targetIdx = Math.floor((data.user_progress / 100) * newPages.length);
              setSpreadIndex(targetIdx % 2 === 0 ? targetIdx : Math.max(0, targetIdx - 1));
            }
          }
        }
        
        if (isFirstSet) {
          setLoading(false);
          // if very small book, apply progress here
          if (data.user_progress > 0 && splitIntoPages(textBuffer).length > 0) {
             const newPages = splitIntoPages(textBuffer);
             const targetIdx = Math.floor((data.user_progress / 100) * newPages.length);
             setSpreadIndex(targetIdx % 2 === 0 ? targetIdx : Math.max(0, targetIdx - 1));
          }
        }

      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [bookId]);

  /* ── Navigation ✦ CHANGED — uses step ── */
  function goNext() {
    if (spreadIndex + step >= pages.length || sliding) return;
    setSliding("left");
    setTimeout(() => { setSpreadIndex(s => s + step); setSliding(null); }, 350);
  }

  function goPrev() {
    if (spreadIndex <= 0 || sliding) return;
    setSliding("right");
    setTimeout(() => { setSpreadIndex(s => Math.max(0, s - step)); setSliding(null); }, 350);
  }

  function handleJump(e) {
    if (e.key !== "Enter") return;
    const target = parseInt(jumpValue, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      const idx = isMobile
        ? target - 1                                          // ✦ mobile: go to exact page
        : (target % 2 === 0 ? target - 2 : target - 1);     // desktop: land on spread start
      setSpreadIndex(Math.max(0, idx));
    }
    setJumpValue("");
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spreadIndex, pages.length, sliding, isMobile]);

  /* ── Touch swipe support ✦ NEW — swipe left/right on mobile ── */
  const touchStartX = useRef(null);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }

  /* ── Actions ── */
  async function handleBookmark() {
    if (!token || !bookMeta) return;
    try {
      await saveBookmark(token, {
        book_id: bookId,
        source: source,
        book_title: bookMeta.title,
        book_author: bookMeta.author,
        book_cover: bookMeta.cover_url
      });
      setBookmarkSaved(true);
      setTimeout(() => setBookmarkSaved(false), 2000);
    } catch {}
  }

  async function handleMarkFinished() {
    if (!token || !bookMeta) return;
    const nextFinished = !finishedSaved;
    try {
      await saveReadingActivity(token, {
        book_id: bookId,
        source: source,
        book_title: bookMeta.title,
        book_author: bookMeta.author,
        book_cover: bookMeta.cover_url,
        progress_percent: nextFinished ? 100 : progressPct,
        is_finished: nextFinished
      });
      setFinishedSaved(nextFinished);
    } catch {}
  }

  /* ✦ CHANGED — progress uses step */
  const progressPct = pages.length > 0
    ? Math.min(100, ((spreadIndex + step) / pages.length) * 100)
    : 0;

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !bookMeta || pages.length === 0) return;
    saveReadingActivity(token, {
      book_id: bookId,
      source: source,
      book_title: bookMeta.title,
      book_author: bookMeta.author,
      book_cover: bookMeta.cover_url,
      progress_percent: progressPct,
      is_finished: finishedSaved
    })
    .then(() => {
      queryClient.invalidateQueries({ queryKey: ["myActivity"] });
      queryClient.invalidateQueries({ queryKey: ["myFinished"] });
    })
    .catch(() => {});
  }, [spreadIndex, pages.length, bookMeta, token, bookId, source, progressPct, queryClient]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      recordSession(token, 1).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="shelf-reader-page">

      {/* ── Toolbar ── */}
      <header className="reader-toolbar">
        <div className="toolbar-left">
          <Link to="/dashboard" className="reader-brand">Shelf</Link>
          <div className="toolbar-divider" />
          <div style={{ position: "relative" }}>
            <button className="toolbar-btn" onClick={() => setShowTypo(v => !v)}>
              <IconAppearance /> Appearance
            </button>
          </div>
          <button className="toolbar-btn" onClick={() => setShowTypo(v => !v)}>
            <IconTypography /> Typography
          </button>
          {showTypo && (
            <div className="typo-popover">
              <span className="typo-label">Font size</span>
              <div className="typo-controls">
                <button onClick={() => setFontSize(s => Math.max(12, s - 2))}>A−</button>
                <span>{fontSize}px</span>
                <button onClick={() => setFontSize(s => Math.min(28, s + 2))}>A+</button>
              </div>
            </div>
          )}
        </div>
        <div className="toolbar-right">
          <button
            className={`toolbar-icon-btn ${bookmarkSaved ? "toolbar-icon-btn--saved" : ""}`}
            onClick={handleBookmark}
            title={bookmarkSaved ? "Saved!" : "Bookmark this book"}
          >
            <IconBookmark />
          </button>
          <ProfileDropdown
            username={username}
            email={resolvedEmail}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* ── Progress bar ── */}
      {pages.length > 0 && (
        <div className="reader-progress-bar">
          <div className="reader-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* ── Main ── */}
      <main
        className="reader-main-wrapper"
        onTouchStart={handleTouchStart}   /* ✦ NEW */
        onTouchEnd={handleTouchEnd}       /* ✦ NEW */
      >
        {loading ? (
          <div className="reader-center">
            <div className="reader-spinner" />
            <p className="reader-status-text">Opening book…</p>
          </div>
        ) : error ? (
          <div className="reader-center">
            <p style={{ fontSize: "2.5em" }}>📚</p>
            <p className="reader-status-text">
              {error === "Book not found" || error.includes("Unknown source")
                ? "This edition is no longer available. Try searching for another edition."
                : error}
            </p>
            <Link to="/dashboard">
              <button className="reader-back-btn">← Back to Library</button>
            </Link>
          </div>
        ) : (
          <>
            <VerticalSideLabel
              text={`ESTABLISHED ${new Date().getFullYear()}`}
              position="left-top"
            />
            <VerticalSideLabel
              text={`${source.toUpperCase()} ACCESS`}
              position="left-bottom"
            />

            <button
              className={`reader-nav-arrow reader-nav-arrow--left ${spreadIndex <= 0 ? "hidden" : ""}`}
              onClick={goPrev}
            ><IconArrowLeft /></button>

            <div className={`reading-content-columns ${
              sliding === "left"  ? "slide-out-left"  :
              sliding === "right" ? "slide-out-right" : ""
            }`}>
              {/* Left column — always visible */}
              <div className="reading-column reading-column--left">
                <header className="column-header">
                  <span className="chapter-label">CHAPTER {chapterNum}</span>
                  <span className="vol-label">VOL. {Math.ceil(chapterNum / 5)}</span>
                </header>
                <div className="column-body" style={{ fontSize: `${fontSize}px` }}>
                  {leftPage.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                <div className="column-footer">
                  <span className="page-num-bottom">{leftPageNum}</span>
                </div>
              </div>

              {/* Right column — ✦ hidden on mobile */}
              {!isMobile && (
                <div className="reading-column reading-column--right">
                  <header className="column-header">
                    <span className="liquid-label">{bookMeta?.title?.toUpperCase()}</span>
                    <span className="page-num">{rightPage ? rightPageNum : ""}</span>
                  </header>
                  <div className="column-body" style={{ fontSize: `${fontSize}px` }}>
                    {rightPage
                      ? rightPage.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
                      : <p className="reader-end-text">~ End ~</p>
                    }
                  </div>
                  <div className="column-footer" />
                </div>
              )}
            </div>

            <button
              className={`reader-nav-arrow reader-nav-arrow--right ${spreadIndex + step >= pages.length ? "hidden" : ""}`}
              onClick={goNext}
            ><IconArrowRight /></button>
          </>
        )}
      </main>

      {/* ── Pagination footer ── */}
      {pages.length > 0 && !loading && !error && (
        <footer className="reader-pagination">
          <div className="pagination-left">
            <button className="nav-arrow-btn" onClick={goPrev} disabled={spreadIndex <= 0}>
              <IconArrowLeft />
            </button>
            <span className="page-range">Page {leftPageNum} of {totalPages}</span>
            <button className="nav-arrow-btn" onClick={goNext} disabled={spreadIndex + step >= pages.length}>
              <IconArrowRight />
            </button>
          </div>
          <div className="pagination-right">
            <div className="jump-to-box">
              <label htmlFor="jumpToInput">JUMP TO</label>
              <input
                id="jumpToInput"
                type="number"
                min={1}
                max={totalPages}
                value={jumpValue}
                onChange={e => setJumpValue(e.target.value)}
                onKeyDown={handleJump}
                placeholder={String(leftPageNum)}
              />
            </div>
            <button
              className={`action-btn-dark ${finishedSaved ? "action-btn-done" : ""}`}
              onClick={handleMarkFinished}
            >
              {finishedSaved ? "✅ Finished!" : "Mark as Finished"}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}