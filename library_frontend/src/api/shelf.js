const BASE = "http://127.0.0.1:8000/api";
const GUTENDEX = "https://gutendex.com";
const OPEN_LIBRARY = "https://openlibrary.org";

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
export const fetchMyBooks = (token) => apiFetch("/my-books/", token);
export const fetchMyHistory = (token) => apiFetch("/my-history/", token);
export const fetchMyBookmarks = (token) => apiFetch("/my-bookmarks/", token);

// ── Borrow ───────────────────────────────────────────────────────
export const borrowBook = (token, bookId) =>
  apiFetch("/borrow/", token, {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });

// ── Gutenberg search (via Django proxy) ─────────────────────────
export const searchGutenberg = (token, q) =>
  apiFetch(`/gutenberg/search/?q=${encodeURIComponent(q)}`, token);

// ── Shelf row definitions ────────────────────────────────────────
// Mix of Option 2 (Open Library subject pages for clean categories)
// and Option 3 (hardcoded Gutendex queries for reliable results).
//
// source: "gutendex" → hits Gutendex directly with a curated query
// source: "openlibrary" → hits Open Library subject API for richer metadata,
//         then resolves each book's gutenberg_id via a Gutendex title search
//         so the "Read Now" button still works.
//
const SHELF_ROWS = [
  // ── Gutendex rows (fast, reliable for these specific queries) ──
  {
    label  : "Classic Literature",
    source : "gutendex",
    params : "search=dickens+austen+tolstoy&languages=en",
  },
  {
    label  : "Mystery & Detective",
    source : "gutendex",
    params : "search=sherlock+holmes+poirot&languages=en",
  },
  {
    label  : "Science Fiction",
    source : "gutendex",
    params : "search=wells+verne+frankenstein&languages=en",
  },
  {
    label  : "Fantasy & Adventure",
    source : "gutendex",
    params : "search=treasure+island+arabian+nights&languages=en",
  },
  {
    label  : "Horror & Gothic",
    source : "gutendex",
    params : "search=dracula+poe+frankenstein&languages=en",
  },

  // ── Open Library rows (cleaner subject metadata) ──────────────
  {
    label  : "Philosophy & Thought",
    source : "openlibrary",
    subject: "philosophy",
  },
  {
    label  : "History & Civilization",
    source : "openlibrary",
    subject: "history",
  },
  {
    label  : "Children's Classics",
    source : "openlibrary",
    subject: "children_s_literature",
  },
];

// ── Fetch a single Gutendex row ───────────────────────────────────
async function fetchGutendexRow({ label, params }) {
  try {
    const res  = await fetch(`${GUTENDEX}/books/?${params}`);
    const data = await res.json();
    const books = (data.results || []).slice(0, 12).map(parseGutendexBook);
    return { label, books };
  } catch (_) {
    return { label, books: [] };
  }
}

// ── Fetch an Open Library subject row ────────────────────────────
// Open Library gives us clean, curated book lists per subject.
// We then try to match each book to a Gutenberg ID via a Gutendex
// title search so the reader still works. Books without a match
// are shown with cover/metadata but no Read Now button.
async function fetchOpenLibraryRow({ label, subject }) {
  try {
    const res  = await fetch(
      `${OPEN_LIBRARY}/subjects/${subject}.json?limit=16&ebooks=true`
    );
    const data = await res.json();
    const works = (data.works || []).slice(0, 12);

    // Resolve each work to a Gutenberg ID in parallel (best-effort)
    const books = await Promise.all(
      works.map(async (w) => {
        const title  = w.title || "Untitled";
        const author = w.authors?.[0]?.name || "Unknown";
        const coverId = w.cover_id || w.cover_edition_key;
        const cover  = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : "";

        // Try to find this book on Gutenberg for the readUrl
        let gutenbergId = null;
        let readUrl     = "";
        try {
          const gRes  = await fetch(
            `${GUTENDEX}/books/?search=${encodeURIComponent(title)}&languages=en`
          );
          const gData = await gRes.json();
          const match = (gData.results || []).find((g) =>
            g.title.toLowerCase().includes(title.toLowerCase().slice(0, 15))
          );
          if (match) {
            gutenbergId = match.id;
            const parsed = parseGutendexBook(match);
            readUrl      = parsed.readUrl;
            // Prefer Gutenberg cover if Open Library cover is missing
            if (!cover && parsed.cover) return { ...parsed, cover: parsed.cover };
          }
        } catch (_) { /* best-effort — skip silently */ }

        return { gutenbergId, title, author, cover, readUrl };
      })
    );

    // Filter out books with no useful data
    return {
      label,
      books: books.filter((b) => b.title && b.title !== "Untitled"),
    };
  } catch (_) {
    return { label, books: [] };
  }
}

// ── Main shelf rows fetcher ───────────────────────────────────────
// Fires all rows in parallel. Gutendex rows are fast.
// Open Library rows do extra Gutendex lookups but are also parallel.
export async function fetchGutendexRows() {
  const rows = await Promise.all(
    SHELF_ROWS.map((row) =>
      row.source === "openlibrary"
        ? fetchOpenLibraryRow(row)
        : fetchGutendexRow(row)
    )
  );
  // Drop any rows that came back completely empty
  return rows.filter((r) => r.books.length > 0);
}

// ── Single book fetch ─────────────────────────────────────────────
export async function fetchGutendexBook(gutId) {
  const res = await fetch(`${GUTENDEX}/books/${gutId}`);
  if (!res.ok) throw new Error("Book not found");
  return parseGutendexBook(await res.json());
}

// ── Book text fetch ───────────────────────────────────────────────
export async function fetchBookText(readUrl) {
  const res = await fetch(readUrl);
  if (!res.ok) throw new Error("Could not load book content");
  const text = await res.text();
  return text.slice(0, 50000);
}

// ── Parse a Gutendex book object ──────────────────────────────────
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
    title      : b.title || "Untitled",
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
export const saveBookmark = (token, gutenbergId, page, note) =>
  apiFetch("/my-bookmarks/", token, {
    method: "POST",
    body  : JSON.stringify({ gutenberg_id: gutenbergId, page, note }),
  });

export const markFinished = (token, gutenbergId) =>
  apiFetch("/my-history/", token, {
    method: "POST",
    body  : JSON.stringify({ gutenberg_id: gutenbergId, rating: 4 }),
  });

// ── Open Library search & import ─────────────────────────────────
export const searchOpenLibrary = (q) =>
  apiFetch(`/openlibrary/search/?q=${encodeURIComponent(q)}`, null);

export const importBooks = (token, books) =>
  apiFetch("/openlibrary/import/", token, {
    method: "POST",
    body  : JSON.stringify({ books }),
  });