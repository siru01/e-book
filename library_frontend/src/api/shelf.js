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

// ── Search — BFF aggregator (Open Library + Google Books via Django)
export const searchBooks = (token, q) =>
  apiFetch(`/books/search/?q=${encodeURIComponent(q)}`, token);

// ── Shelf genres ─────────────────────────────────────────────────
const SHELF_GENRES = [
  { label: "Trending Now",        endpoint: "/books/trending/" },
  { label: "New Arrivals",        endpoint: "/books/new-arrivals/" },
  { label: "Science Fiction",     endpoint: "/books/category/?genre=science+fiction" },
  { label: "Mystery & Detective", endpoint: "/books/category/?genre=mystery" },
];

// ── Normalise a BFF book into the shape the UI expects ───────────
function parseBFFBook(b) {
  return {
    bookId:      b.book_id,
    title:       b.title                      || "Untitled",
    author:      (b.authors || []).join(", ") || "Unknown",
    cover:       b.cover_url                  || "",
    readUrl:     b.read_url                   || "",
    source:      b.source                     || "openlibrary",
    description: b.description                || "",
    year:        b.year                       || null,
  };
}

// ✦ RENAMED: fetchGutendexRows → fetchShelfRows
// Fetches the 4 dashboard shelf rows from our Django BFF.
// Sources: Open Library + Google Books (no Gutendex).
// Redis caches each endpoint for 24h on the backend.
export async function fetchShelfRows() {
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

// fetchBookOverview — Used by BookOverviewPage.
// Calls the BFF read endpoint which returns metadata + text.
// We only use the metadata fields here (no full text download displayed).
export async function fetchBookOverview(bookId) {
  const res  = await fetch(`${BASE}/books/read/?book_id=${encodeURIComponent(bookId)}`);
  const data = await res.json();
  // Even a 404 may carry partial metadata (title/author/cover) — still render overview.
  return {
    title      : data.title        || "Untitled",
    author     : data.author       || "Unknown",
    cover_url  : data.cover_url    || "",
    description: data.description  || (data.text ? data.text.slice(0, 700) + "\u2026" : ""),
    source     : data.source       || bookId.split(":")[0] || "openlibrary",
    year       : data.year         || null,
    read_url   : data.read_url     || null,
    subjects   : data.subjects     || [],
    bookshelves: data.bookshelves  || [],
  };
}

// ✦ RENAMED: fetchGutendexBook → fetchBookContent
// Used by ReaderPage — fetches full book text from Django BFF.
// Django routes to the correct source based on book_id prefix:
// e.g. "google:abc", "openlibrary:OL123W", "archive:xyz"
export async function fetchBookContent(bookId) {
  const res = await fetch(`${BASE}/books/read/?book_id=${encodeURIComponent(bookId)}`);
  if (!res.ok) throw new Error("Book not found");
  return res.json(); // { title, author, cover_url, text, source }
}

// ── Book text fetch (for direct URL reads) ────────────────────────
export async function fetchBookText(readUrl) {
  const res = await fetch(readUrl);
  if (!res.ok) throw new Error("Could not load book content");
  const text = await res.text();
  return text.slice(0, 50000);
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