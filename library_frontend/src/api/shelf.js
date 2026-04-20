const BASE = "/api";

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



// ── Dashboard stats ──────────────────────────────────────────────

export const fetchMyActivity  = (token) => apiFetch("/my-activity/",  token);
export const fetchMyFinished  = (token) => apiFetch("/my-finished/",  token);
export const fetchMyBookmarks = (token) => apiFetch("/my-bookmarks/", token);
export const fetchMySessions  = (token) => apiFetch("/my-sessions/",  token);
export const fetchMySummary   = (token) => apiFetch("/my-activity-summary/", token);

// ── Borrow ───────────────────────────────────────────────────────
export const borrowBook = (token, bookId) =>
  apiFetch("/borrow/", token, {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });

// ── Search — BFF aggregator (Open Library + Google Books via Django)
export const searchBooks = (token, q) =>
  apiFetch(`/books/search/?q=${encodeURIComponent(q)}`, token);

// Streaming Search: Yields chunks of {source, books}
export async function* searchBooksStream(token, q) {
  const url = `${BASE}/books/search-stream/?q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) throw new Error("Stream failed");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop(); // Keep the last incomplete line

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const chunk = JSON.parse(line.slice(6));
          yield chunk;
        } catch (e) {
          console.error("JSON parse failed", e);
        }
      }
    }
  }
}

// Helper to reliably retrieve cached cover
export function getCoverUrl(originalUrl) {
  if (!originalUrl) return "";
  return `${BASE}/books/cover/?url=${encodeURIComponent(originalUrl)}`;
}

// ── Shelf genres ─────────────────────────────────────────────────
// ── Shelf genres (Gutenberg Focus) ─────────────────────────────
const SHELF_GENRES = [
  { label: "Trending Classics",   endpoint: "/books/trending/" },
  { label: "Classic Literature",  endpoint: "/books/category/?genre=literature" },
  { label: "Science Fiction",     endpoint: "/books/category/?genre=science+fiction" },
  { label: "Mystery & Ghost",     endpoint: "/books/category/?genre=mystery" },
  { label: "Philosophy & Zen",    endpoint: "/books/category/?genre=philosophy" },
];

// ── Normalise a BFF book into the shape the UI expects ───────────
export function parseBFFBook(b) {
  return {
    bookId:      b.book_id,
    title:       b.title                      || "Untitled",
    author:      (b.authors || []).join(", ") || "Unknown",
    cover:       getCoverUrl(b.cover_url)     || "",
    readUrl:     b.read_url                   || "",
    source:      b.source                     || "openlibrary",
    description: b.description                || "",
    year:        b.year                       || null,
  };
}

export async function fetchShelfRows() {
  try {
    const res = await fetch(`${BASE}/books/shelf-rows/`);
    if (!res.ok) throw new Error();
    const rows = await res.json();
    return rows.map(row => ({
      ...row,
      books: row.books.map(parseBFFBook)
    }));
  } catch (_) {
    return [];
  }
}

export async function fetchBookOverview(bookId) {
  const res  = await fetch(`${BASE}/books/read/?book_id=${encodeURIComponent(bookId)}`);
  const data = await res.json();
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

export async function fetchBookContent(bookId) {
  const res = await fetch(`${BASE}/books/read/?book_id=${encodeURIComponent(bookId)}`);
  if (!res.ok) throw new Error("Book not found");
  return res.json();
}

export async function* streamBookContent(bookId) {
  const res = await fetch(`${BASE}/books/read-stream/?book_id=${encodeURIComponent(bookId)}`);
  if (!res.ok) throw new Error("Could not load book content");
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

export async function fetchBookText(readUrl) {
  const res = await fetch(readUrl);
  if (!res.ok) throw new Error("Could not load book content");
  const text = await res.text();
  return text.slice(0, 50000);
}


// ── Bookmarks & History saves ─────────────────────────────────────
export const saveBookmark = (token, bookData) =>
  apiFetch("/my-bookmarks/", token, {
    method: "POST",
    body:   JSON.stringify(bookData),
  });

export const unbookmark = (token, bookId) =>
  apiFetch("/my-bookmarks/", token, {
    method: "DELETE",
    body:   JSON.stringify({ book_id: bookId }),
  });

export const saveReadingActivity = (token, activityData) =>
  apiFetch("/my-activity/", token, {
    method: "POST",
    body:   JSON.stringify(activityData),
  });

export const recordSession = (token, minutes = 1) =>
  apiFetch("/my-sessions/", token, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });


// ── Open Library search & import ─────────────────────────────────
export const searchOpenLibrary = (q) =>
  apiFetch(`/openlibrary/search/?q=${encodeURIComponent(q)}`, null);



