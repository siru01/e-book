import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { searchGutenberg } from "../api/shelf";
import { useQueryClient } from "@tanstack/react-query";
import "./Topbar.css";

const PLACEHOLDER_WORDS = ["books", "genres", "mystery", "fantasy", "sci-fi", "biography", "history", "classic literature"];

export default function Topbar({ expanded, onSearch, onClearSearch }) {
  const { username, logout } = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [phIndex,     setPhIndex]     = useState(0);
  const [phVisible,   setPhVisible]   = useState(true);

  const debounceRef  = useRef(null);
  const taskIdRef    = useRef(0);
  const wrapperRef   = useRef(null);   // ← ref for click-outside detection

  // ── Close dropdown helper ──────────────────────────────────
  const closeDropdown = useCallback(() => setSuggestions([]), []);

  // ── 1. Click outside to close ──────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown]);

  // ── 2. Scroll anywhere to close ───────────────────────────
  useEffect(() => {
    function handleScroll() { closeDropdown(); }
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Also listen on the main content div which may scroll instead of window
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [closeDropdown]);

  // ── 3. ESC key to close ────────────────────────────────────
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") closeDropdown();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [closeDropdown]);

  // ── Cycle placeholder words ────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setPhIndex((i) => (i + 1) % PLACEHOLDER_WORDS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // ── Debounced suggestions ──────────────────────────────────
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    setPhVisible(val.length === 0);

    clearTimeout(debounceRef.current);
    taskIdRef.current += 1;
    const myId = taskIdRef.current;

    if (!val.trim() || val.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (taskIdRef.current !== myId) return;
      try {
        const data = await searchGutenberg(null, val.trim());
        if (taskIdRef.current !== myId) return;
        // Normalise BFF response — each item has book_id, title, authors, cover_url
        setSuggestions((data.results || []).slice(0, 6));
      } catch (_) {
        setSuggestions([]);
      }
    }, 1500);
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Enter" && query.trim()) {
      closeDropdown();
      onSearch(query.trim());
    }
  }

  function handleLogout() {
    queryClient.clear();
    logout();
    navigate("/");
  }

  // ── Navigate to reader from suggestion ────────────────────
  function handleSuggestionClick(book) {
    closeDropdown();
    // book_id e.g. "archive:xyz" or "google:abc" or "openlibrary:OL123W"
    const source  = book.source || "gutenberg";
    const bookId  = book.book_id || "";

    if (source === "gutenberg") {
      const numId = bookId.replace("gutenberg:", "");
      navigate(`/read/${numId}`);
    } else {
      // For non-Gutenberg, navigate with encoded full book_id
      navigate(`/read/${encodeURIComponent(bookId)}`);
    }
  }

  return (
    <header className={`topbar ${expanded ? "topbar-expanded" : "topbar-collapsed"}`}>

      {/* Search pill — wrapperRef catches clicks inside/outside */}
      <div className="topbar-search-wrap" ref={wrapperRef}>
        <div className="topbar-search-pill">
          <svg className="topbar-search-icon" width="18" height="18" viewBox="0 0 64 64" fill="none">
            <circle cx="26" cy="26" r="16" stroke="#888" strokeWidth="5" fill="none" strokeLinecap="round"/>
            <line x1="38" y1="38" x2="56" y2="56" stroke="#888" strokeWidth="5.5" strokeLinecap="round"/>
          </svg>
          <div className="topbar-input-wrap">
            <input
              className="topbar-input"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
            {phVisible && (
              <span className="topbar-ph">
                Search for <strong key={phIndex} className="topbar-ph-word">{PLACEHOLDER_WORDS[phIndex]}</strong>
              </span>
            )}
          </div>
          {/* Clear button — shown when query has text */}
          {query && (
            <button
              className="topbar-clear-btn"
              onClick={() => {
                setQuery("");
                setPhVisible(true);
                closeDropdown();
                onClearSearch?.();
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="topbar-suggestions">
            {suggestions.map((book, i) => (
              <div
                key={`${book.book_id}-${i}`}
                className="topbar-suggestion-item"
                onClick={() => handleSuggestionClick(book)}
              >
                <div className="topbar-sugg-cover">
                  {book.cover_url
                    ? <img src={book.cover_url} alt="" />
                    : <span>📖</span>}
                </div>
                <div className="topbar-sugg-info">
                  <span className="topbar-sugg-title">{book.title}</span>
                  <span className="topbar-sugg-author">
                    {(book.authors || []).join(", ") || "Unknown"}
                  </span>
                </div>
                <button
                  className="topbar-sugg-btn"
                  onClick={(e) => { e.stopPropagation(); handleSuggestionClick(book); }}
                >
                  Read
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User info */}
      <div className="topbar-user">
        <div className="topbar-avatar">👤</div>
        <span className="topbar-username">{username}</span>
        <button className="topbar-logout" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}