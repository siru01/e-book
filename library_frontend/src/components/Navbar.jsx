import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import './Navbar.css';

/* ── Icons ── */
const IconSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconBell = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
const IconBookmark = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconLogout = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
const IconMail = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;

const capitalizeFirst = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

/* ── Profile Dropdown ── */
function ProfileDropdown({ username, email, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const initials = username
    ? username.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="profile-wrap" ref={ref}>
      <button
        className="profile-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Profile menu"
      >
        <span className="avatar-initials">{initials}</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-avatar">{initials}</div>
            <div className="profile-dropdown-info">
              <span className="profile-dropdown-name">{capitalizeFirst(username) || "User"}</span>
              <span className="profile-dropdown-email">{email || "—"}</span>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          <button className="profile-dropdown-logout" onClick={() => { setOpen(false); onLogout(); }}>
            <IconLogout />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, logout, username } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [phIndex, setPhIndex] = useState(0);
  const PLACEHOLDER_WORDS = ["literature", "mystery", "sci-fi", "fantasy", "history", "philosophy"];

  useEffect(() => {
    const t = setInterval(() => setPhIndex(i => (i + 1) % PLACEHOLDER_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const isDashboard = location.pathname === '/dashboard';
  const isInsights = location.pathname === '/insights';
  const isBookOverview = location.pathname.startsWith('/book/');
  const isReader = location.pathname.startsWith('/read/');
  const isDashboardArea = isDashboard || isInsights || isBookOverview || isReader;
  
  const showSubNav = isDashboard || isInsights; // Keep sub-nav only for search-centric pages

  const handleSearch = (q) => {
    if (!q || !q.trim()) return;
    setSearchParams({ q }, { replace: true });
    if (!isDashboard) navigate("/dashboard?q=" + encodeURIComponent(q));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const resolvedEmail = useMemo(() => {
    try {
      const t = sessionStorage.getItem("shelf_token") || token;
      if (!t) return "";
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.email || "";
    } catch { return ""; }
  }, [token]);

  return (
    <>
      <nav className="shelf-nav">
        {/* ── Left Side ── */}
        <div className="shelf-nav-left">
          {isDashboardArea ? (
          <div className="dash-nav-links">
            <span 
              className={`dash-nav-link ${isDashboard ? 'dash-nav-link-active' : ''}`}
              onClick={() => navigate("/dashboard")}
            >
              Library
            </span>
            <span className="dash-nav-link">Journal</span>
            <span 
              className={`dash-nav-link ${isInsights ? 'dash-nav-link-active' : ''}`}
              onClick={() => navigate("/insights")}
            >
              Insights
            </span>
          </div>
        ) : isReader ? (
          <ul className="shelf-nav-links">
            <li><a href="/insights" onClick={(e) => { e.preventDefault(); navigate("/insights"); }}>Insights</a></li>
            <li>
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                window.dispatchEvent(new CustomEvent('shelf-toggle-appearance'));
              }}>Appearance</a>
            </li>
          </ul>
        ) : (
          <ul className="shelf-nav-links">
            <li><a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Browse</a></li>
            <li><a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}>My Library</a></li>
            <li><a href="#">About</a></li>
          </ul>
        )}
        </div>

        {/* ── Center Logo ── */}
        {!isDashboardArea && <span className="shelf-nav-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Shelf</span>}
        {isDashboardArea && <span className="dash-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Shelf</span>}

        {/* ── Right Side ── */}
        <div className="shelf-nav-right">
          {isDashboardArea ? (
            <div className="dash-nav-right-inner">
              {isReader ? (
                <button 
                  className="dash-icon-btn" 
                  title="Save Bookmark"
                  onClick={() => window.dispatchEvent(new CustomEvent('shelf-save-bookmark'))}
                >
                  <IconBookmark />
                </button>
              ) : (
                <button className="dash-icon-btn"><IconBell /></button>
              )}
              <ProfileDropdown
                username={username}
                email={resolvedEmail}
                onLogout={handleLogout}
              />
            </div>
          ) : (
            <div className="landing-nav-actions">
              <span className="nav-action-link" onClick={() => navigate("/login")}>Log In</span>
              <button className="nav-action-btn" onClick={() => navigate("/signup")}>Create Account</button>
              <button
                className="shelf-hamburger"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <div className={`ham-bar ${mobileMenuOpen ? 'ham-bar--open' : ''}`} />
                <div className={`ham-bar ${mobileMenuOpen ? 'ham-bar--open' : ''}`} />
                <div className={`ham-bar ${mobileMenuOpen ? 'ham-bar--open' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* ── Mobile Menu (Landing Only) ── */}
        {!isDashboardArea && mobileMenuOpen && (
          <div className="shelf-mobile-menu">
            <a href="/" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate("/"); }}>Browse</a>
            <a href="/dashboard" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate("/dashboard"); }}>My Library</a>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>About</a>
          </div>
        )}
      </nav>

      {/* ── Sub-Nav Search Row (Dashboard & Insights Only) ── */}
      {showSubNav && (
        <div className="shelf-sub-nav">
          <div className="dash-search-bar">
            <IconSearch />
            <input
              className="dash-search-input"
              placeholder={`Search for ${PLACEHOLDER_WORDS[phIndex]}…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch(searchQuery)}
            />
          </div>
        </div>
      )}
    </>
  );
}
