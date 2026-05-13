import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { useQueryClient } from "@tanstack/react-query";
import { saveBookmark, saveReadingActivity, recordSession, fetchBookOverview, fetchBookContent, streamBookContent, getPreloadedContent } from "../api/shelf";
import "./Readerpage.css";
import CounterLoader from "../components/CounterLoader";

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

/* ── useMediaQuery hook ── */
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
  const isMobile = useMediaQuery("(max-width: 768px)");

  const resolvedEmail = useMemo(() => {
    try {
      const t = sessionStorage.getItem("shelf_token");
      if (!t) return "";
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.email || "";
    } catch { return ""; }
  }, [token]);

  const queryClient = useQueryClient();
  const location = useLocation();
  
  const [fontSize,      setFontSize]      = useState(16);
  const [showTypo,      setShowTypo]      = useState(false);
  const [bookMeta,      setBookMeta]      = useState(null);
  const [pages,         setPages]         = useState([]);
  const [spreadIndex,   setSpreadIndex]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [dataIsReady,   setDataIsReady]   = useState(false);
  const [error,         setError]         = useState("");
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [finishedSaved, setFinishedSaved] = useState(false);
  const [sliding,       setSliding]       = useState(null);
  const [jumpValue,     setJumpValue]     = useState("");
  const [hasInitialJump, setHasInitialJump] = useState(false);

  const totalPages  = pages.length;
  const step        = isMobile ? 1 : 2;
  const leftPage    = pages[spreadIndex]     || "";
  const rightPage   = pages[spreadIndex + 1] || "";
  const leftPageNum = spreadIndex + 1;
  const rightPageNum = spreadIndex + 2;

  const bookId     = rawBookId ? decodeURIComponent(rawBookId) : "";
  const source     = bookId.split(":")[0] || "openlibrary";

  /* ── Fetch book ── */
  useEffect(() => {
    // Force white background for the reader to prevent gradient glimpse
    const originalBg = document.body.style.background;
    document.body.style.background = "#ffffff";
    
    if (!bookId) { setError("No book ID provided."); setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(""); setPages([]); setSpreadIndex(0);

    (async () => {
      try {
        const data = await fetchBookOverview(bookId);
        if (cancelled) return;
        setBookMeta({
          title:     data.title     || "Untitled",
          author:    data.author    || "Unknown",
          cover_url: data.cover_url || "",
          source:    data.source    || source,
          user_progress: data.user_progress || 0,
        });
        setBookmarkSaved(data.is_bookmarked || false);
        setFinishedSaved(data.is_finished   || false);
        
        const preloaded = getPreloadedContent(bookId);
        let textBuffer = "";
        let isFirstSet = true;

        if (preloaded) {
          setPages(splitIntoPages(preloaded));
          setDataIsReady(true);
          isFirstSet = false;
        }

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

          // 1. Reveal as soon as we have data (or if not already revealed by preloaded)
          if (isFirstSet && newPages.length >= 1) {
            setDataIsReady(true);
            isFirstSet = false;
          }

          // 2. PERSISTENCE: Jump logic
          if (!hasInitialJump && newPages.length > 0) {
            const savedValue = localStorage.getItem(`shelf_last_page_${bookId}`);
            const savedPage = savedValue !== null ? parseInt(savedValue, 10) : null;
            
            if (savedPage !== null && savedPage > 0 && newPages.length > savedPage) {
              setSpreadIndex(savedPage % 2 === 0 ? savedPage : savedPage - 1);
              setHasInitialJump(true);
            } else if (data.user_progress > 0 && newPages.length > 15) {
              // Fallback to percentage if no local storage but we have server progress
              const targetIdx = Math.floor((data.user_progress / 100) * newPages.length);
              if (targetIdx > 0 && newPages.length > targetIdx) {
                setSpreadIndex(targetIdx % 2 === 0 ? targetIdx : Math.max(0, targetIdx - 1));
                setHasInitialJump(true);
              }
            }
          }
        }
        
        if (isFirstSet) {
          setDataIsReady(true);
        }

      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setDataIsReady(true);
    })();

    return () => { 
      cancelled = true;
      document.body.style.background = originalBg; 
    };
  }, [bookId]);

  /* ── Navigation ── */
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
      const idx = isMobile ? target - 1 : (target % 2 === 0 ? target - 2 : target - 1);
      setSpreadIndex(Math.max(0, idx));
    }
    setJumpValue("");
  }

  useEffect(() => {
    const toggle = () => setShowTypo(v => !v);
    const save = async () => {
      if (!token || !bookMeta) return;
      try {
        await saveBookmark(token, { 
          book_id: bookId, 
          source, 
          book_title: bookMeta.title, 
          book_author: bookMeta.author, 
          book_cover: bookMeta.cover_url,
          last_page: leftPageNum // Including the page number as requested
        });
        alert(`Bookmarked: ${bookMeta.title} at page ${leftPageNum}`);
      } catch (e) {
        console.error("Failed to save bookmark", e);
      }
    };
    window.addEventListener('shelf-toggle-appearance', toggle);
    window.addEventListener('shelf-save-bookmark', save);
    return () => {
      window.removeEventListener('shelf-toggle-appearance', toggle);
      window.removeEventListener('shelf-save-bookmark', save);
    };
  }, [token, bookMeta, bookId, source, leftPageNum]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spreadIndex, pages.length, sliding, isMobile]);

  /* ── Progress ── */
  const progressPct = pages.length > 0 ? Math.min(100, ((spreadIndex + step) / pages.length) * 100) : 0;

  // Sync spreadIndex to localStorage immediately for rock-solid reload persistence
  useEffect(() => {
    if (bookId && spreadIndex >= 0) {
      localStorage.setItem(`shelf_last_page_${bookId}`, spreadIndex);
    }
  }, [spreadIndex, bookId]);

  // Debounced progress save to server
  useEffect(() => {
    if (!token || !bookMeta || pages.length === 0) return;

    const timeout = setTimeout(() => {
      saveReadingActivity(token, {
        book_id: bookId, 
        source, 
        book_title: bookMeta.title, 
        book_author: bookMeta.author, 
        book_cover: bookMeta.cover_url,
        progress_percent: progressPct, 
        is_finished: finishedSaved
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["myActivity"] });
        queryClient.invalidateQueries({ queryKey: ["myFinished"] });
      }).catch(() => {});
    }, 5000); // 5s debounce for faster server sync

    return () => clearTimeout(timeout);
  }, [spreadIndex, finishedSaved, token, bookId, pages.length]);

  useEffect(() => {
    if (!token || !bookId) return;
    const interval = setInterval(() => { recordSession(token, 1, bookId).catch(() => {}); }, 60000);
    return () => clearInterval(interval);
  }, [token, bookId]);

  if (error) {
    return (
      <div className="reader-center reader-error-wrap">
        <p className="error-icon">📚</p>
        <p className="reader-status-text">{error}</p>
        <Link to="/dashboard"><button className="reader-back-btn">← Back to Library</button></Link>
      </div>
    );
  }

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <CounterLoader 
        key={`loader-${bookId}`}
        dataReady={dataIsReady} 
        onComplete={handleLoadingComplete} 
        brand="SHELF"
        label="Opening your book…"
      />
    );
  }

  return (
    <div className="shelf-reader-page">
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

      <div className="reader-progress-bar">
        <div className="reader-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <main className="reader-main-wrapper">
        <VerticalSideLabel text={`ESTABLISHED ${new Date().getFullYear()}`} position="left-top" />
        <VerticalSideLabel text={`${source.toUpperCase()} ACCESS`} position="left-bottom" />

        <button className={`reader-nav-arrow reader-nav-arrow--left ${spreadIndex <= 0 ? "hidden" : ""}`} onClick={goPrev}><IconArrowLeft /></button>

        <div className={`reading-content-columns ${sliding === "left" ? "slide-out-left" : sliding === "right" ? "slide-out-right" : ""}`}>
          <div className="reading-column reading-column--left">
            <header className="column-header">
              <span className="chapter-label">PROGRESS</span>
            </header>
            <div className="column-body" style={{ fontSize: `${fontSize}px` }}>
              {pages.length === 0 ? (
                <div className="reader-stream-loading">
                  <div className="spinner-mini"></div>
                  <span>Fetching text from archive…</span>
                </div>
              ) : (
                leftPage.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
              )}
            </div>
            <div className="column-footer"><span className="page-num-bottom">{leftPageNum}</span></div>
          </div>

          {!isMobile && (
            <div className="reading-column reading-column--right">
              <header className="column-header">
                <span className="liquid-label">{bookMeta?.title?.toUpperCase()}</span>
                <span className="page-num">{rightPageNum <= totalPages ? rightPageNum : ""}</span>
              </header>
              <div className="column-body" style={{ fontSize: `${fontSize}px` }}>
                {rightPage ? rightPage.split("\n\n").map((para, i) => <p key={i}>{para}</p>) : <p className="reader-end-text">~ End ~</p>}
              </div>
              <div className="column-footer" />
            </div>
          )}
        </div>

        <button className={`reader-nav-arrow reader-nav-arrow--right ${spreadIndex + step >= pages.length ? "hidden" : ""}`} onClick={goNext}><IconArrowRight /></button>
      </main>

      <footer className="reader-pagination">
        <div className="pagination-left">
          <button className="nav-arrow-btn" onClick={goPrev} disabled={spreadIndex <= 0}><IconArrowLeft /></button>
          <span className="page-range">Page {leftPageNum} of {totalPages}</span>
          <button className="nav-arrow-btn" onClick={goNext} disabled={spreadIndex + step >= pages.length}><IconArrowRight /></button>
        </div>
        <div className="pagination-right">
          <div className="jump-to-box">
            <label htmlFor="jumpToInput">JUMP TO</label>
            <div className="jump-to-input-wrap">
              <input id="jumpToInput" type="number" min={1} max={totalPages} value={jumpValue} onChange={e => setJumpValue(e.target.value)} onKeyDown={handleJump} placeholder={String(leftPageNum)} />
            </div>
          </div>
          <button className={`action-btn-dark ${finishedSaved ? "action-btn-done" : ""}`} onClick={() => {
            const next = !finishedSaved;
            saveReadingActivity(token, { book_id: bookId, source, book_title: bookMeta.title, book_author: bookMeta.author, book_cover: bookMeta.cover_url, progress_percent: next ? 100 : progressPct, is_finished: next });
            setFinishedSaved(next);
          }}>{finishedSaved ? "✅ Finished!" : "FINISHED"}</button>
        </div>
      </footer>
    </div>
  );
}