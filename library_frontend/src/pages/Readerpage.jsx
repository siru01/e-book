import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { saveBookmark, markFinished } from "../api/shelf";
import "./ReaderPage.css";

const CHARS_PER_PAGE = 1200;

function splitIntoPages(text) {
  let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Try double-newline paragraph split first
  let paragraphs = t.split(/\n{2,}/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);

  // If too few paragraphs, the book uses single newlines — treat each line as a unit
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

export default function ReaderPage() {
  const { gutenbergId } = useParams();
  const { token } = useAuth();

  const [fontSize, setFontSize] = useState(16);
  const [bookMeta, setBookMeta] = useState(null);
  const [pages, setPages] = useState([]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [finishedSaved, setFinishedSaved] = useState(false);
  const [sliding, setSliding] = useState(null);

  const totalSpreads = Math.ceil(pages.length / 2);
  const currentSpread = Math.floor(spreadIndex / 2);
  const leftPage = pages[spreadIndex] || "";
  const rightPage = pages[spreadIndex + 1] || "";
  const leftPageNum = spreadIndex + 1;
  const rightPageNum = spreadIndex + 2;

  useEffect(() => {
    if (!gutenbergId) { setError("No book ID provided."); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError("");
    setPages([]);
    setSpreadIndex(0);

    (async () => {
      let plainUrl;
      try {
        const res = await fetch(`https://gutendex.com/books/${gutenbergId}`);
        if (!res.ok) throw new Error("Could not fetch book details.");
        const b = await res.json();
        const fmts = b.formats || {};
        plainUrl =
          fmts["text/plain; charset=utf-8"] ||
          fmts["text/plain; charset=us-ascii"] ||
          fmts["text/plain"] || "";
        const authors = b.authors || [];
        if (!cancelled) setBookMeta({
          title: b.title || "Untitled",
          author: authors[0]?.name || "Unknown",
          cover: fmts["image/jpeg"] || "",
        });
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
        return;
      }

      if (!plainUrl) {
        if (!cancelled) { setError("No plain text version available."); setLoading(false); }
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:8000/api/gutenberg/proxy-text/?url=${encodeURIComponent(plainUrl)}`
        );
        if (!res.ok) {
          let errMsg = `Server error ${res.status}`;
          try { const d = await res.json(); errMsg = d.error || errMsg; } catch (_) {}
          throw new Error(errMsg);
        }
        const text = await res.text();
        const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        // Strip Gutenberg header
        const startMarker = normalized.indexOf("*** START OF");
        const afterHeader = startMarker !== -1
          ? normalized.slice(normalized.indexOf("\n", startMarker) + 1)
          : normalized;

        // Strip Gutenberg footer
        const endMarker = afterHeader.indexOf("*** END OF");
        const finalText = endMarker !== -1 ? afterHeader.slice(0, endMarker) : afterHeader;

        if (!cancelled) setPages(splitIntoPages(finalText));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [gutenbergId]);

  function goNext() {
    if (spreadIndex + 2 >= pages.length || sliding) return;
    setSliding("left");
    setTimeout(() => {
      setSpreadIndex((s) => s + 2);
      setSliding(null);
    }, 350);
  }

  function goPrev() {
    if (spreadIndex <= 0 || sliding) return;
    setSliding("right");
    setTimeout(() => {
      setSpreadIndex((s) => Math.max(0, s - 2));
      setSliding(null);
    }, 350);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spreadIndex, pages.length, sliding]);

  async function handleBookmark() {
    if (!token) return;
    try {
      await saveBookmark(token, parseInt(gutenbergId), leftPageNum, `Reading ${bookMeta?.title || ""}`);
      setBookmarkSaved(true);
      setTimeout(() => setBookmarkSaved(false), 2000);
    } catch (e) {}
  }

  async function handleMarkFinished() {
    if (!token) return;
    try {
      await markFinished(token, parseInt(gutenbergId));
      setFinishedSaved(true);
    } catch (e) {}
  }

  const progressPct = pages.length > 0 ? Math.min(100, ((spreadIndex + 2) / pages.length) * 100) : 0;

  return (
    <div className="reader-root">
      {/* Toolbar */}
      <div className="reader-toolbar">

        {/* LEFT: back link only */}
        <div className="reader-toolbar-left">
          <Link to="/dashboard" className="reader-back-link">
            ← <span>Dashboard</span>
          </Link>
        </div>

        {/* CENTER: book title + author — absolutely centered in toolbar */}
        {bookMeta && (
          <div className="reader-toolbar-center">
            <span className="reader-book-title">{bookMeta.title}</span>
            <span className="reader-book-author">{bookMeta.author}</span>
          </div>
        )}

        {/* RIGHT: font controls + buttons */}
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
            <p className="reader-error-text">{error}</p>
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

            <div className={`reader-book-wrap ${sliding === "left" ? "slide-out-left" : sliding === "right" ? "slide-out-right" : ""}`}>
              <div className="reader-book">

                {/* Left page */}
                <div className="reader-page reader-page-left">
                  <div className="reader-page-inner" style={{ fontSize: `${fontSize}px` }}>
                    {leftPage.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  {/* Page number — bottom RIGHT corner */}
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
                  {/* Page number — bottom RIGHT corner */}
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