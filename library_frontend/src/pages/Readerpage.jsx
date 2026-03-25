import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { fetchGutendexBook, fetchBookText, parsePlainTextUrl, saveBookmark, markFinished } from "../api/shelf";
import "./ReaderPage.css";

export default function ReaderPage() {
  const { gutenbergId } = useParams();
  const { token } = useAuth();

  const [fontSize, setFontSize] = useState(18);
  const [bookMeta, setBookMeta] = useState(null);
  const [bookText, setBookText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [finishedSaved, setFinishedSaved] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Load book meta + text
  useEffect(() => {
    if (!gutenbergId) { setError("No book ID provided."); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError("");
    setBookText("");
    setBookmarkSaved(false);
    setFinishedSaved(false);

    (async () => {
      // Step 1: fetch metadata from Gutendex
      let meta, plainUrl;
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
        meta = {
          title: b.title || "Untitled",
          author: authors[0]?.name || "Unknown",
          cover: fmts["image/jpeg"] || "",
        };
        if (!cancelled) setBookMeta(meta);
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
        return;
      }

      // Step 2: fetch plain text content via backend proxy (avoids CORS block from Gutenberg)
      if (!plainUrl) {
        if (!cancelled) { setError("No plain text version available for this book."); setLoading(false); }
        return;
      }
      try {
        const res = await fetch(
          `http://localhost:8000/api/gutenberg/proxy-text/?url=${encodeURIComponent(plainUrl)}`
        );
        if (!res.ok) {
          // Try to get the actual error from the backend
          let errMsg = `Server error ${res.status}`;
          try {
            const errData = await res.json();
            errMsg = errData.error || errMsg;
          } catch (_) {
            const errText = await res.text();
            if (errText) errMsg = errText;
          }
          throw new Error(errMsg);
        }
        const text = await res.text();
        if (!cancelled) setBookText(text.slice(0, 50000));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [gutenbergId]);

  async function handleBookmark() {
    setBookmarkSaved(false);
    if (!token) { setError("Please log in to bookmark."); return; }
    try {
      await saveBookmark(token, parseInt(gutenbergId), currentPage, `Reading ${bookMeta?.title || ""}`);
      setBookmarkSaved(true);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleMarkFinished() {
    setFinishedSaved(false);
    if (!token) { setError("Please log in to mark as finished."); return; }
    try {
      await markFinished(token, parseInt(gutenbergId));
      setFinishedSaved(true);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="reader-root">
      {/* Toolbar */}
      <div className="reader-toolbar">
        <div className="reader-toolbar-left">
          <Link to="/dashboard" className="reader-back-link">
            ← <span>Dashboard</span>
          </Link>
          {bookMeta && (
            <div className="reader-book-meta">
              <span className="reader-book-title">{bookMeta.title}</span>
              <span className="reader-book-author">{bookMeta.author}</span>
            </div>
          )}
        </div>

        <div className="reader-toolbar-right">
          {/* Font size */}
          <div className="reader-font-controls">
            <button onClick={() => setFontSize((s) => Math.max(12, s - 2))}>A−</button>
            <span>{fontSize}px</span>
            <button onClick={() => setFontSize((s) => Math.min(28, s + 2))}>A+</button>
          </div>

          {/* Bookmark */}
          <button
            className={`reader-btn ${bookmarkSaved ? "reader-btn-green" : "reader-btn-outline"}`}
            onClick={handleBookmark}
          >
            {bookmarkSaved ? "🔖 Saved!" : "🔖 Bookmark"}
          </button>

          {/* Mark finished */}
          <button
            className={`reader-btn ${finishedSaved ? "reader-btn-green" : "reader-btn-orange"}`}
            onClick={handleMarkFinished}
          >
            {finishedSaved ? "✅ Finished!" : "✅ Mark as Finished"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="reader-content">
        {loading ? (
          <div className="reader-center">
            <div className="reader-spinner" />
            <p className="reader-loading-text">Loading book...</p>
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
          <div className="reader-text-wrap">
            <pre className="reader-text" style={{ fontSize: `${fontSize}px` }}>
              {bookText}
            </pre>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && !loading && bookText && (
        <div className="reader-toast">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}