import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
// ✦ CHANGED: added fetchBookContent import — replaces the local function below
import { saveBookmark, markFinished, fetchBookContent } from "../api/shelf";
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

// ✦ REMOVED: local fetchBookContent function — now imported from ../api/shelf
// (was: async function fetchBookContent(bookId) { ... })

export default function ReaderPage() {
  const { bookId: rawBookId } = useParams();
  const { token } = useAuth();

  const [fontSize,      setFontSize]      = useState(16);
  const [bookMeta,      setBookMeta]      = useState(null);
  const [pages,         setPages]         = useState([]);
  const [spreadIndex,   setSpreadIndex]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [finishedSaved, setFinishedSaved] = useState(false);
  const [sliding,       setSliding]       = useState(null);

  const totalSpreads = Math.ceil(pages.length / 2);
  const leftPage     = pages[spreadIndex]     || "";
  const rightPage    = pages[spreadIndex + 1] || "";
  const leftPageNum  = spreadIndex + 1;
  const rightPageNum = spreadIndex + 2;

  // bookId is always a prefixed string e.g. "openlibrary:OL123W", "google:abc"
  const bookId = rawBookId ? decodeURIComponent(rawBookId) : "";

  const source = bookId.split(":")[0] || "openlibrary";

  useEffect(() => {
    if (!bookId) { setError("No book ID provided."); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError("");
    setPages([]);
    setSpreadIndex(0);

    (async () => {
      try {
        // ✦ now calls imported fetchBookContent from shelf.js
        const data = await fetchBookContent(bookId);

        if (cancelled) return;

        setBookMeta({
          title:     data.title     || "Untitled",
          author:    data.author    || "Unknown",
          cover_url: data.cover_url || "",
          source:    data.source    || source,
        });

        if (!data.text || data.text.trim().length === 0) {
          setError("No readable text available for this book.");
          setLoading(false);
          return;
        }

        // Strip archive.org / plain-text preamble markers if present
        let text = data.text;
        const startMarker = text.indexOf("*** START OF");
        if (startMarker !== -1) {
          text = text.slice(text.indexOf("\n", startMarker) + 1);
        }
        const endMarker = text.indexOf("*** END OF");
        if (endMarker !== -1) {
          text = text.slice(0, endMarker);
        }

        setPages(splitIntoPages(text));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [bookId]);

  function goNext() {
    if (spreadIndex + 2 >= pages.length || sliding) return;
    setSliding("left");
    setTimeout(() => { setSpreadIndex((s) => s + 2); setSliding(null); }, 350);
  }

  function goPrev() {
    if (spreadIndex <= 0 || sliding) return;
    setSliding("right");
    setTimeout(() => { setSpreadIndex((s) => Math.max(0, s - 2)); setSliding(null); }, 350);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spreadIndex, pages.length, sliding]);

  async function handleBookmark() {
    if (!token) return;
    try {
      await saveBookmark(token, bookId, source);
      setBookmarkSaved(true);
      setTimeout(() => setBookmarkSaved(false), 2000);
    } catch (e) {}
  }

  async function handleMarkFinished() {
    if (!token) return;
    try {
      await markFinished(token, bookId, source);
      setFinishedSaved(true);
    } catch (e) {}
  }

  const progressPct = pages.length > 0
    ? Math.min(100, ((spreadIndex + 2) / pages.length) * 100)
    : 0;

  return (
    <div className="reader-root">
      {/* Toolbar */}
      <div className="reader-toolbar">
        <div className="reader-toolbar-left">
          <Link to="/dashboard" className="reader-back-link">
            ← <span>Dashboard</span>
          </Link>
        </div>

        {bookMeta && (
          <div className="reader-toolbar-center">
            <span className="reader-book-title">{bookMeta.title}</span>
            <span className="reader-book-author">{bookMeta.author}</span>
          </div>
        )}

        <div className="reader-toolbar-right">
          <div className="reader-font-controls">
            <button onClick={() => setFontSize((s) => Math.max(12, s - 2))}>A−</button>
            <span>{fontSize}px</span>
            <button onClick={() => setFontSize((s) => Math.min(28, s + 2))}>A+</button>
          </div>
          <button
            className={`reader-btn ${bookmarkSaved ? "reader-btn-green" : "reader-btn-outline"}`}
            onClick={handleBookmark}
          >
            {bookmarkSaved ? "🔖 Saved!" : "🔖 Bookmark"}
          </button>
          <button
            className={`reader-btn ${finishedSaved ? "reader-btn-green" : "reader-btn-orange"}`}
            onClick={handleMarkFinished}
          >
            {finishedSaved ? "✅ Finished!" : "✅ Mark as Finished"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {pages.length > 0 && (
        <div className="reader-progress-bar">
          <div className="reader-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* Stage */}
      <div className="reader-stage">
        {loading ? (
          <div className="reader-center">
            <div className="reader-spinner" />
            <p className="reader-loading-text">Loading book…</p>
          </div>
        ) : error ? (
          <div className="reader-center">
            <p style={{ fontSize: "3em" }}>📚</p>
            <p className="reader-error-text">
              {error === "Book not found" || error.includes("Unknown source") ?
                "This book edition is no longer available in the archive. Please try searching for a newer edition." :
                error}
            </p>
            <Link to="/dashboard">
              <button className="reader-back-btn">← Back to Dashboard</button>
            </Link>
          </div>
        ) : (
          <>
            <button
              className={`reader-arrow reader-arrow-left ${spreadIndex <= 0 ? "reader-arrow-hidden" : ""}`}
              onClick={goPrev}
              aria-label="Previous pages"
            >‹</button>

            <div className={`reader-book-wrap ${
              sliding === "left"  ? "slide-out-left"  :
              sliding === "right" ? "slide-out-right" : ""
            }`}>
              <div className="reader-book">
                {/* Left page */}
                <div className="reader-page reader-page-left">
                  <div className="reader-page-inner" style={{ fontSize: `${fontSize}px` }}>
                    {leftPage.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  <div className="reader-page-number">{leftPageNum}</div>
                </div>

                <div className="reader-spine" />

                {/* Right page */}
                <div className="reader-page reader-page-right">
                  <div className="reader-page-inner" style={{ fontSize: `${fontSize}px` }}>
                    {rightPage
                      ? rightPage.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
                      : <p className="reader-end-text">~ End ~</p>
                    }
                  </div>
                  <div className="reader-page-number">{rightPage ? rightPageNum : ""}</div>
                </div>
              </div>
            </div>

            <button
              className={`reader-arrow reader-arrow-right ${spreadIndex + 2 >= pages.length ? "reader-arrow-hidden" : ""}`}
              onClick={goNext}
              aria-label="Next pages"
            >›</button>
          </>
        )}
      </div>

      {/* Footer */}
      {pages.length > 0 && !loading && !error && (
        <div className="reader-footer">
          <span>Page {leftPageNum}–{Math.min(rightPageNum, pages.length)} of {pages.length}</span>
          <span>← → arrow keys to turn pages</span>
        </div>
      )}
    </div>
  );
}