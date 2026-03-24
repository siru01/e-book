const BASE = "http://127.0.0.1:8000/api";
const GUTENDEX = "https://gutendex.com";

// ── Generic authenticated fetch ──
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

// ── Books ──
export const fetchBooks = (token) => apiFetch("/books/", token);
export const addBook = (token, body) =>
  apiFetch("/books/", token, { method: "POST", body: JSON.stringify(body) });
export const deleteBook = (token, id) =>
  apiFetch(`/books/${id}/`, token, { method: "DELETE" });

// ── Dashboard stats ──
export const fetchAdminDashboard = (token) => apiFetch("/dashboard/", token);
export const fetchMyBooks = (token) => apiFetch("/my-books/", token);
export const fetchMyHistory = (token) => apiFetch("/my-history/", token);
export const fetchMyBookmarks = (token) => apiFetch("/my-bookmarks/", token);

// ── Borrow ──
export const borrowBook = (token, bookId) =>
  apiFetch("/borrow/", token, {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });

// ── Gutenberg search (via Django proxy) ──
export const searchGutenberg = (token, q) =>
  apiFetch(`/gutenberg/search/?q=${encodeURIComponent(q)}`, token);

// ── Gutendex direct ──
export async function fetchGutendexRows() {
  const GENRES = [
    { label: "Classic Literature", topic: "" },
    { label: "Science & Education", topic: "science" },
    { label: "History", topic: "history" },
    { label: "Philosophy", topic: "philosophy" },
    { label: "Children's Books", topic: "children" },
    { label: "Mystery & Detective", topic: "mystery" },
    { label: "Fantasy & Adventure", topic: "adventure" },
  ];

  const rows = await Promise.all(
    GENRES.map(async ({ label, topic }) => {
      try {
        const url = topic
          ? `${GUTENDEX}/books/?topic=${topic}`
          : `${GUTENDEX}/books/`;
        const res = await fetch(url);
        const data = await res.json();
        const books = (data.results || []).slice(0, 12).map(parseGutendexBook);
        return { label, books };
      } catch (_) {
        return { label, books: [] };
      }
    })
  );
  return rows;
}

export async function fetchGutendexBook(gutId) {
  const res = await fetch(`${GUTENDEX}/books/${gutId}`);
  if (!res.ok) throw new Error("Book not found");
  return parseGutendexBook(await res.json());
}

export async function fetchBookText(readUrl) {
  const res = await fetch(readUrl);
  if (!res.ok) throw new Error("Could not load book content");
  const text = await res.text();
  return text.slice(0, 50000);
}

export function parseGutendexBook(b) {
  const fmts = b.formats || {};
  const readUrl =
    fmts["text/html"] ||
    fmts["text/html; charset=utf-8"] ||
    fmts["text/html; charset=us-ascii"] ||
    fmts["text/plain; charset=utf-8"] ||
    fmts["text/plain"] ||
    "";
  const cover = fmts["image/jpeg"] || "";
  const authors = b.authors || [];
  const author = authors[0]?.name || "Unknown";
  return {
    gutenbergId: b.id,
    title: b.title || "Untitled",
    author,
    cover,
    readUrl,
  };
}

export function parsePlainTextUrl(b) {
  const fmts = b.formats || {};
  return (
    fmts["text/plain; charset=utf-8"] ||
    fmts["text/plain; charset=us-ascii"] ||
    fmts["text/plain"] ||
    ""
  );
}

// ── Bookmarks & History saves ──
export const saveBookmark = (token, gutenbergId, page, note) =>
  apiFetch("/my-bookmarks/", token, {
    method: "POST",
    body: JSON.stringify({ gutenberg_id: gutenbergId, page, note }),
  });

export const markFinished = (token, gutenbergId) =>
  apiFetch("/my-history/", token, {
    method: "POST",
    body: JSON.stringify({ gutenberg_id: gutenbergId, rating: 4 }),
  });

// ── Open Library search & import ──
export const searchOpenLibrary = (q) =>
  apiFetch(`/openlibrary/search/?q=${encodeURIComponent(q)}`, null);

export const importBooks = (token, books) =>
  apiFetch("/openlibrary/import/", token, {
    method: "POST",
    body: JSON.stringify({ books }),
  });