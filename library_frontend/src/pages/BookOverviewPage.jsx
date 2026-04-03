import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { fetchBookOverview, searchBooks, saveBookmark } from "../api/shelf";
import "./BookOverviewPage.css";

/* ── Helpers ─────────────────────────────────────────────────── */
function cleanLabel(str = "") {
  return str
    .replace(/^(Browsing|Browse|Fiction|Nonfiction)\s*/i, "")
    .replace(/\s*--\s*/g, " · ")
    .trim();
}

function buildSynopsis(description = "", title = "", author = "") {
  if (description && description.length > 80) {
    return description.length > 600
      ? description.slice(0, 580) + "…"
      : description;
  }
  return (
    `"${title}" is a celebrated work by ${author}. ` +
    `This title has been preserved in the Open Library digital archive and continues to find ` +
    `new readers who discover its timeless relevance and enduring craft.`
  );
}

/* ── Star Rating ─────────────────────────────────────────────── */
function StarRating({ value = 4.2 }) {
  const full  = Math.floor(value);
  const half  = value - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="bop-stars" aria-label={`${value} stars`}>
      {"★".repeat(full)}
      {half && <span className="bop-star-half">★</span>}
      {"☆".repeat(empty)}
    </span>
  );
}

/* ── Skeleton ────────────────────────────────────────────────── */
function Skeleton({ w = "100%", h = "20px", r = "6px" }) {
  return (
    <div
      className="bop-skeleton"
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function BookOverviewPage() {
  const { bookId: rawBookId } = useParams();
  const navigate              = useNavigate();
  const { token, logout }     = useAuth();

  const bookId = rawBookId ? decodeURIComponent(rawBookId) : "";

  // Derive source prefix (e.g. "openlibrary", "google", "archive")
  const source = bookId.includes(":") ? bookId.split(":")[0] : "openlibrary";

  const [book,    setBook]    = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    setError(null);
    setBook(null);
    setSimilar([]);

    fetchBookOverview(bookId)
      .then((data) => {
        const category = cleanLabel(
          (data.subjects?.[0]) ||
          (data.bookshelves?.[0]) ||
          "Literature"
        );
        const subCategory = cleanLabel(
          data.subjects?.[1] || data.bookshelves?.[1] || ""
        );

        setBook({
          id:           bookId,
          title:        data.title,
          author:       data.author,
          coverUrl:     data.cover_url,
          description:  data.description,
          source:       data.source || source,
          year:         data.year,
          category,
          subCategory,
          synopsis:     buildSynopsis(data.description, data.title, data.author),
          readUrl:      data.read_url || null,
          subjects:     data.subjects || [],
          bookshelves:  data.bookshelves || [],
        });

        // Fetch related books using the first subject keyword
        const searchTerm =
          data.subjects?.[0]?.split("·")[0].trim() ||
          data.bookshelves?.[0] ||
          data.title?.split(" ")[0] ||
          "";

        if (searchTerm) {
          searchBooks(null, searchTerm)
            .then((d) => {
              const filtered = (d.results || [])
                .filter((b) => b.book_id !== bookId && b.cover_url)
                .slice(0, 3);
              setSimilar(
                filtered.map((b, i) => ({
                  id:     b.book_id,
                  volume: `VOLUME ${String(i + 1).padStart(2, "0")}`,
                  title:  b.title.length > 36 ? b.title.slice(0, 34) + "…" : b.title,
                  author: (b.authors || []).join(", ") || "Unknown",
                  year:   b.year || "",
                  cover:  b.cover_url,
                }))
              );
            })
            .catch(() => {});
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookId]);

  const handleSave = async () => {
    if (!token) { navigate("/login"); return; }
    setSaving(true);
    try {
      await saveBookmark(token, bookId, source);
      setSaved(true);
    } catch (_) {
      setSaved((s) => !s); // toggle optimistically if API fails
    }
    setSaving(false);
  };

  /* ── Shared Nav ── */
  const Nav = () => (
    <nav className="bop-nav">
      <span className="bop-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>SHELF</span>
      <div className="bop-nav-center">
        <button className="bop-nav-link bop-nav-active" onClick={() => navigate("/dashboard")}>Browse</button>
        <button className="bop-nav-link" onClick={() => navigate("/discover")}>Collections</button>
        <button className="bop-nav-link">Exhibits</button>
        <button className="bop-nav-link">Archive</button>
      </div>
      <div className="bop-nav-right">
        <button className="bop-icon-btn" aria-label="notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button className="bop-icon-btn" aria-label="profile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
        <button className="bop-logout" onClick={() => { logout(); navigate("/"); }}>Logout</button>
      </div>
    </nav>
  );

  /* ── Loading ── */
  if (loading) return (
    <div className="bop-root">
      <Nav />
      <main className="bop-main">
        <div className="bop-layout">
          <div className="bop-left">
            <Skeleton w="220px" h="320px" r="12px" />
            <Skeleton w="220px" h="48px" r="100px" />
            <Skeleton w="220px" h="48px" r="100px" />
          </div>
          <div className="bop-right">
            <Skeleton w="200px" h="14px" />
            <Skeleton w="80%" h="52px" r="4px" />
            <Skeleton w="220px" h="20px" />
            <Skeleton w="340px" h="20px" />
            <Skeleton w="100%" h="130px" r="8px" />
          </div>
        </div>
      </main>
    </div>
  );

  /* ── Error ── */
  if (error || !book) return (
    <div className="bop-root">
      <Nav />
      <main className="bop-main bop-error-state">
        <span className="bop-error-emoji">📚</span>
        <h2 className="bop-error-heading">Book not found</h2>
        <p className="bop-error-msg">{error || "This title doesn't exist in the archive."}</p>
        <button className="bop-btn-read" onClick={() => navigate(-1)}>← Go Back</button>
      </main>
    </div>
  );

  /* ── Source label for specs card ── */
  const sourceLabel = {
    openlibrary: "Open Library",
    google:      "Google Books",
    archive:     "Internet Archive",
  }[book.source] || "Open Library";

  const sourceUrl = {
    openlibrary: `https://openlibrary.org/works/${bookId.replace("openlibrary:", "")}`,
    google:      `https://books.google.com/books?id=${bookId.replace("google:", "")}`,
    archive:     `https://archive.org/details/${bookId.replace("archive:", "")}`,
  }[book.source] || "#";

  return (
    <div className="bop-root">
      <Nav />

      <main className="bop-main">

        {/* ── Hero: Cover + Info ── */}
        <div className="bop-layout">

          {/* ── Left col ── */}
          <div className="bop-left">
            <div className="bop-cover-frame">
              {book.coverUrl
                ? <img className="bop-cover" src={book.coverUrl} alt={book.title} />
                : (
                  <div className="bop-cover-placeholder">
                    <span>📖</span>
                    <span className="bop-cover-placeholder-title">{book.title?.slice(0, 40)}</span>
                  </div>
                )
              }
            </div>

            <button
              id="bop-resume-btn"
              className="bop-btn-read"
              onClick={() => navigate(`/read/${encodeURIComponent(bookId)}`)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Read Now
            </button>

            <button
              id="bop-source-btn"
              className="bop-btn-download"
              onClick={() => window.open(sourceUrl, "_blank")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              View on {sourceLabel}
            </button>
          </div>

          {/* ── Right col ── */}
          <div className="bop-right">
            {/* Breadcrumb */}
            <div className="bop-breadcrumb">
              <span>ARCHIVE</span>
              <span className="bop-crumb-sep">›</span>
              <span>{book.category.toUpperCase()}</span>
              {book.subCategory && (
                <>
                  <span className="bop-crumb-sep">›</span>
                  <span>{book.subCategory.toUpperCase()}</span>
                </>
              )}
            </div>

            <h1 className="bop-title">{book.title}</h1>
            <p className="bop-author-line">{book.author}{book.year ? `, ${book.year}` : ""}</p>

            {/* Stats row */}
            <div className="bop-stats-row">
              <StarRating value={4.2} />
              <span className="bop-rating-num">4.2</span>
              <span className="bop-stat-divider" />
              <span className="bop-stat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {sourceLabel.toUpperCase()}
              </span>
              <span className="bop-stat-divider" />
              <button
                id="bop-save-btn"
                className={`bop-stat bop-save-btn ${saved ? "bop-save-btn--saved" : ""}`}
                onClick={handleSave}
                disabled={saving}
              >
                <svg width="13" height="13" viewBox="0 0 24 24"
                     fill={saved ? "currentColor" : "none"}
                     stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                {saved ? "SAVED TO LIBRARY" : "SAVE TO LIBRARY"}
              </button>
            </div>

            {/* Synopsis + Librarian's note */}
            <div className="bop-content-cols">
              <div className="bop-synopsis-col">
                <h3 className="bop-section-label">SYNOPSIS</h3>
                <p className="bop-synopsis-text">{book.synopsis}</p>
              </div>

              <div className="bop-note-card">
                <div className="bop-note-card-header">
                  <span className="bop-note-dot">✦</span>
                  <span className="bop-note-card-label">LIBRARIAN'S NOTE</span>
                  <span className="bop-note-bigquote">"</span>
                </div>
                <p className="bop-note-text">
                  "A work of considerable depth and enduring relevance. Available through {sourceLabel} — one of the world's leading open digital archives. The digital edition faithfully preserves the original source."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Archival Specifications ── */}
        <section className="bop-specs-section">
          <div className="bop-specs-heading-row">
            <h2 className="bop-specs-heading">Archival Specifications</h2>
            <span className="bop-specs-ver">METADATA V.4.2</span>
          </div>
          <div className="bop-specs-card">
            <div className="bop-spec">
              <span className="bop-spec-label">PUBLISHER</span>
              <span className="bop-spec-value">{sourceLabel}</span>
            </div>
            <div className="bop-spec-divider" />
            <div className="bop-spec">
              <span className="bop-spec-label">RELEASE DATE</span>
              <span className="bop-spec-value">{book.year ? `${book.year}` : "Public Domain"}</span>
            </div>
            <div className="bop-spec-divider" />
            <div className="bop-spec">
              <span className="bop-spec-label">SOURCE ID</span>
              <span className="bop-spec-value" style={{ fontSize: "0.78rem", wordBreak: "break-all" }}>
                {bookId}
              </span>
            </div>
            <div className="bop-spec-divider" />
            <div className="bop-spec">
              <span className="bop-spec-label">AUTHOR</span>
              <span className="bop-spec-value">{book.author}</span>
            </div>
            <div className="bop-spec-divider" />
            <div className="bop-spec">
              <span className="bop-spec-label">FORMAT</span>
              <span className="bop-spec-value">Digital / ePub / HTML</span>
            </div>
          </div>
        </section>

        {/* ── Similar Archives ── */}
        {similar.length > 0 && (
          <section className="bop-similar-section">
            <div className="bop-similar-heading-row">
              <h2 className="bop-similar-heading">Similar Archives</h2>
              <button className="bop-view-all" onClick={() => navigate("/discover")}>
                View Full Collection →
              </button>
            </div>
            <div className="bop-similar-grid">
              {similar.map((s) => (
                <div
                  key={s.id}
                  className="bop-similar-card"
                  onClick={() => navigate(`/book/${encodeURIComponent(s.id)}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/book/${encodeURIComponent(s.id)}`)}
                >
                  <div className="bop-similar-img-wrap">
                    {s.cover
                      ? <img src={s.cover} alt={s.title} className="bop-similar-img" />
                      : <div className="bop-similar-placeholder">📖</div>
                    }
                  </div>
                  <span className="bop-similar-vol">{s.volume}</span>
                  <h3 className="bop-similar-title">{s.title}</h3>
                  <p className="bop-similar-byline">{s.author}{s.year ? `, ${s.year}` : ""}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
