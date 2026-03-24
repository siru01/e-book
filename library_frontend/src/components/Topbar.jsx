import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import { searchGutenberg } from "../api/shelf";
import "./Topbar.css";

const PLACEHOLDER_WORDS = ["books", "genres", "mystery", "fantasy", "sci-fi", "biography", "history", "classic literature"];

export default function Topbar({ expanded, onSearch, onClearSearch }) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [phIndex, setPhIndex] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const debounceRef = useRef(null);
  const taskIdRef = useRef(0);

  // Cycle placeholder words
  useEffect(() => {
    const interval = setInterval(() => {
      setPhIndex((i) => (i + 1) % PLACEHOLDER_WORDS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Debounced suggestions — mirrors handle_search_input background task
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
        setSuggestions((data.results || []).slice(0, 6));
      } catch (_) {
        setSuggestions([]);
      }
    }, 1500);
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Enter" && query.trim()) {
      setSuggestions([]);
      onSearch(query.trim());
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className={`topbar ${expanded ? "topbar-expanded" : "topbar-collapsed"}`}>
      {/* Search pill */}
      <div className="topbar-search-wrap">
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
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="topbar-suggestions">
            {suggestions.map((book) => (
              <div
                key={book.id}
                className="topbar-suggestion-item"
                onClick={() => {
                  setSuggestions([]);
                  navigate(`/read/${book.id}`);
                }}
              >
                <div className="topbar-sugg-cover">
                  {book.formats?.["image/jpeg"]
                    ? <img src={book.formats["image/jpeg"]} alt="" />
                    : <span>📖</span>}
                </div>
                <div className="topbar-sugg-info">
                  <span className="topbar-sugg-title">{book.title}</span>
                  <span className="topbar-sugg-author">{book.authors?.[0]?.name || "Unknown"}</span>
                </div>
                <button
                  className="topbar-sugg-btn"
                  onClick={(e) => { e.stopPropagation(); navigate(`/read/${book.id}`); }}
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