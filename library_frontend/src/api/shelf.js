const BASE = "http://127.0.0.1:8000/api";

// ── Generic authenticated fetch ──────────────────────────────────
async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Books ────────────────────────────────────────────────────────
export const fetchBooks = (token) => apiFetch("/books/", token);
export const addBook = (token, body) =>
  apiFetch("/books/", token, { method: "POST", body: JSON.stringify(body) });
export const deleteBook = (token, id) =>
  apiFetch(`/books/${id}/`, token, { method: "DELETE" });

// ── Dashboard stats ──────────────────────────────────────────────
export const fetchAdminDashboard = (token) => apiFetch("/dashboard/", token);
export const fetchMyBooks     = (token) => apiFetch("/my-books/",     token);
export const fetchMyHistory   = (token) => apiFetch("/my-history/",   token);
export const fetchMyBookmarks = (token) => apiFetch("/my-bookmarks/", token);

// ── Borrow ───────────────────────────────────────────────────────
export const borrowBook = (token, bookId) =>
  apiFetch("/borrow/", token, {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });

// ── Search — BFF aggregator (all sources + Redis cache) ──────────
export const searchGutenberg = (token, q) =>
  apiFetch(`/books/search/?q=${encodeURIComponent(q)}`, token);

// ── ONLY 4 shelf rows — avoids unnecessary API calls on every login
// Sources: Open Library + Google Books (no Gutendex)
const SHELF_GENRES = [
  { label: "Trending Now",        endpoint: "/books/trending/" },
  { label: "New Arrivals",        endpoint: "/books/new-arrivals/" },
  { label: "Science Fiction",     endpoint: "/books/category/?genre=science+fiction" },
  { label: "Mystery & Detective", endpoint: "/books/category/?genre=mystery" },
];

// ── Normalise a BFF book into the shape the UI expects ───────────
function parseBFFBook(b) {
  return {
    gutenbergId: b.book_id,
    title:       b.title                      || "Untitled",
    author:      (b.authors || []).join(", ") || "Unknown",
    cover:       b.cover_url                  || "",
    readUrl:     b.read_url                   || "",
    source:      b.source                     || "openlibrary",
    description: b.description                || "",
    year:        b.year                       || null,
  };
}

// ── Main shelf rows fetcher ───────────────────────────────────────
// Only 4 parallel calls. Redis caches each for 24h on the backend,
// so after the very first load every subsequent login is instant.
export async function fetchGutendexRows() {
  const rows = await Promise.all(
    SHELF_GENRES.map(async ({ label, endpoint }) => {
      try {
        const res   = await fetch(`${BASE}${endpoint}`);
        const data  = await res.json();
        const books = (data.results || []).slice(0, 12).map(parseBFFBook);
        return { label, books };
      } catch (_) {
        return { label, books: [] };
      }
    })
  );
  return rows.filter((r) => r.books.length > 0);
}

// ── Single book fetch (reader page) ──────────────────────────────
export async function fetchGutendexBook(bookId) {
  const res = await fetch(`${BASE}/books/read/?book_id=${encodeURIComponent(bookId)}`);
  if (!res.ok) throw new Error("Book not found");
  return res.json();
}

// ── Book text fetch ───────────────────────────────────────────────
export async function fetchBookText(readUrl) {
  const res = await fetch(readUrl);
  if (!res.ok) throw new Error("Could not load book content");
  const text = await res.text();
  return text.slice(0, 50000);
}

// ── Parse a raw Gutendex book object (legacy, kept for reader page)
export function parseGutendexBook(b) {
  const fmts = b.formats || {};
  const readUrl =
    fmts["text/html"] ||
    fmts["text/html; charset=utf-8"] ||
    fmts["text/html; charset=us-ascii"] ||
    fmts["text/plain; charset=utf-8"] ||
    fmts["text/plain"] ||
    "";
  const cover   = fmts["image/jpeg"] || "";
  const authors = b.authors || [];
  const author  = authors[0]?.name || "Unknown";
  return {
    gutenbergId: b.id,
    title:       b.title || "Untitled",
    author,
    cover,
    readUrl,
  };
}

// ── Parse plain text URL from a Gutendex book ─────────────────────
export function parsePlainTextUrl(b) {
  const fmts = b.formats || {};
  return (
    fmts["text/plain; charset=utf-8"] ||
    fmts["text/plain; charset=us-ascii"] ||
    fmts["text/plain"] ||
    ""
  );
}

// ── Bookmarks & History saves ─────────────────────────────────────
export const saveBookmark = (token, bookId, source = "openlibrary") =>
  apiFetch("/my-bookmarks/", token, {
    method: "POST",
    body:   JSON.stringify({ book_id: bookId, source }),
  });

export const markFinished = (token, bookId, source = "openlibrary") =>
  apiFetch("/my-history/", token, {
    method: "POST",
    body:   JSON.stringify({ book_id: bookId, source }),
  });

// ── Open Library search & import ─────────────────────────────────
export const searchOpenLibrary = (q) =>
  apiFetch(`/openlibrary/search/?q=${encodeURIComponent(q)}`, null);

export const importBooks = (token, books) =>
  apiFetch("/openlibrary/import/", token, {
    method: "POST",
    body:   JSON.stringify({ books }),
  });