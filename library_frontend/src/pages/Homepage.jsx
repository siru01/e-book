import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";


/* ─── Main landing page ─── */
export default function HomePage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);

  const toggleDarkMode = () => setIsDark((prev) => !prev);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === "d") toggleDarkMode();
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <div className="shelf-wrapper" data-theme={isDark ? "dark" : "light"}>
      <div className="shelf-root">
        {/* ── Nav: [links left] [brand center] [toggle right] ── */}
        <nav className="shelf-nav fade-1">
          {/* LEFT */}
          <ul className="shelf-nav-links">
            <li><a href="#">Browse</a></li>
            <li>
              <a
                href="/dashboard"
                onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}
              >
                My Library
              </a>
            </li>
            <li><a href="#">About</a></li>
          </ul>

          {/* CENTER */}
          <span className="shelf-nav-logo">Shelf</span>

          {/* RIGHT */}
          <button
            className="shelf-nav-cta"
            onClick={toggleDarkMode}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </nav>

        {/* ── Hero ── */}
        <section className="shelf-hero">

          {/* Staggered headline with image sandwiched between line 1 & line 2 */}
          <div className="shelf-headline-wrap fade-2">

            {/* Pink bulb sticker — bottom-left */}
            <div className="shelf-sticker shelf-sticker--bulb">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="42" r="22" fill="#ff4dba" stroke="#111" strokeWidth="3.5"/>
                <rect x="38" y="62" width="24" height="7" rx="3" fill="#ff4dba" stroke="#111" strokeWidth="3"/>
                <rect x="40" y="68" width="20" height="7" rx="3" fill="#ff4dba" stroke="#111" strokeWidth="3"/>
                <line x1="50" y1="20" x2="50" y2="14" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                <line x1="30" y1="27" x2="25" y2="22" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                <line x1="70" y1="27" x2="75" y2="22" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                <line x1="23" y1="42" x2="17" y2="42" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                <line x1="77" y1="42" x2="83" y2="42" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                <path d="M43 42 Q50 34 57 42" stroke="#111" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <line x1="50" y1="35" x2="50" y2="50" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Line 1 — z-index below the image */}
            <span className="shelf-headline-line shelf-headline-line--top">
              Explore Unlimited
            </span>

            {/* ── Placeholder: replace with your own image later ── */}
            <div className="shelf-hero-img-wrap">
              <div className="shelf-hero-placeholder" />
            </div>

            {/* Line 2 — z-index above the image */}
            <span className="shelf-headline-line shelf-headline-line--bottom">
              Stories
            </span>

            {/* Pink paper plane sticker — right */}
            <div className="shelf-sticker shelf-sticker--plane">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 50 L90 15 L55 85 L45 58 Z" fill="#ff4dba" stroke="#111" strokeWidth="3.5" strokeLinejoin="round"/>
                <path d="M45 58 L90 15" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                <path d="M55 68 Q52 76 48 82" stroke="#111" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>

          </div>

          <p className="shelf-subtext fade-3">
            One digital library for every kind of reader.
          </p>

          <div className="shelf-actions fade-3">
            <button className="btn-primary" onClick={() => navigate("/login")}>
              Get Back To You
            </button>
            <button className="btn-secondary" onClick={() => navigate("/signup")}>
              First Time? Let's Get Started →
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}