import { useState } from "react";
import { searchOpenLibrary, importBooks } from "../api/shelf";
import { useAuth } from "../context/Authcontext";
import "./DiscoverPage.css";

function ResultCard({ book, onImport, importing }) {
  return (
    <div className="disc-card">
      <div className="disc-card-cover">
        {book.cover
          ? <img src={book.cover} alt="" />
          : <span>📘</span>}
      </div>
      <div className="disc-card-info">
        <span className="disc-card-title">{book.title}</span>
        <span className="disc-card-author">{book.author}</span>
        <span className="disc-card-isbn">{book.isbn}</span>
      </div>
      <div className="disc-card-actions">
        <button
          className="disc-import-btn"
          onClick={() => onImport(book)}
          disabled={importing || book.import_status === "imported"}
        >
          {book.import_status === "imported" ? "✓ Imported" : "Import"}
        </button>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setSelected([]);
    try {
      const data = await searchOpenLibrary(query);
      setResults((data.results || []).map((b) => ({
        title: b.title || "Untitled",
        author: b.author || "Unknown",
        cover: b.cover || "",
        isbn: b.isbn || "",
        import_status: b.import_status || "",
      })));
    } catch (e) {
      showToast(e.message, "error");
    }
    setLoading(false);
  }

  async function handleImportSingle(book) {
    setImporting(true);
    try {
      const data = await importBooks(token, [book]);
      const created = data.created || 0;
      showToast(created > 0 ? "Book imported successfully!" : "Book already exists in library");
      setResults((prev) =>
        prev.map((b) => b.isbn === book.isbn ? { ...b, import_status: "imported" } : b)
      );
    } catch (e) {
      showToast(e.message, "error");
    }
    setImporting(false);
  }

  async function handleImportSelected() {
    if (!selected.length) return;
    setImporting(true);
    const books = results.filter((b) => selected.includes(b.isbn));
    try {
      const data = await importBooks(token, books);
      showToast(`Imported ${data.created || 0} books, ${data.skipped || 0} skipped`);
      setSelected([]);
    } catch (e) {
      showToast(e.message, "error");
    }
    setImporting(false);
  }

  function toggleSelect(isbn) {
    setSelected((prev) =>
      prev.includes(isbn) ? prev.filter((i) => i !== isbn) : [...prev, isbn]
    );
  }

  return (
    <div className="disc-root">
      <div className="disc-toolbar">
        <input
          className="disc-input"
          placeholder="Search books, authors, ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className="disc-search-btn" onClick={handleSearch} disabled={loading}>Search</button>
        <button className="disc-import-sel-btn" onClick={handleImportSelected} disabled={importing || !selected.length}>
          Import Selected
        </button>
        <button className="disc-sel-all-btn" onClick={() => setSelected(results.map((b) => b.isbn).filter(Boolean))}>Select All</button>
        <button className="disc-clear-btn" onClick={() => setSelected([])}>Clear</button>
      </div>

      <hr className="disc-divider" />

      {loading && <div className="disc-spinner-wrap"><div className="disc-spinner" /></div>}

      <div className="disc-results">
        {results.map((book) => (
          <div key={book.isbn} className="disc-result-row">
            <input
              type="checkbox"
              className="disc-checkbox"
              checked={selected.includes(book.isbn)}
              onChange={() => toggleSelect(book.isbn)}
            />
            <ResultCard book={book} onImport={handleImportSingle} importing={importing} />
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`disc-toast disc-toast-${toast.type}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  );
}