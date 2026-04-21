import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";


/* ─── Main landing page ─── */
export default function HomePage() {
  const navigate = useNavigate();
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [trail, setTrail] = useState([]);
  const trailId = useRef(0);
  const lastTrail = useRef(0);

  // ── Mouse tracking: cursor + trail squares ────────────────
  const handleMouseMove = useCallback((e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });

    const now = Date.now();
    if (now - lastTrail.current < 60) return;   // throttle ~16fps
    lastTrail.current = now;

    const id = ++trailId.current;
    setTrail((prev) => [
      ...prev.slice(-12),   // keep last 12 squares
      { id, x: e.clientX, y: e.clientY },
    ]);
    // remove square after 600ms
    setTimeout(() => {
      setTrail((prev) => prev.filter((t) => t.id !== id));
    }, 600);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    // Component logic here if needed
  }, []);

  return (
    <div className="shelf-wrapper" data-theme="light">
      <div className="shelf-root shelf-cursor-hidden">

        <div
          className="shelf-cursor"
          style={{ transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)` }}
        >
          <svg width="32" height="36" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 4 L20 12 C22 13 22 15 20 16 L13 18 L10 24 C9 26 7 26 6 24 Z"
              fill="#111"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ── Grid overlay — revealed only near cursor ── */}
        <div
          className="shelf-grid-overlay"
          style={{
            maskImage: `radial-gradient(circle 250px at ${cursorPos.x}px ${cursorPos.y}px, black 0%, transparent 80%)`,
            WebkitMaskImage: `radial-gradient(circle 250px at ${cursorPos.x}px ${cursorPos.y}px, black 0%, transparent 80%)`,
          }}
        />

        {/* ── Trail squares ── */}
        {trail.map((t) => (
          <div
            key={t.id}
            className="shelf-trail-sq"
            style={{ left: t.x - 10, top: t.y - 10 }}
          />
        ))}
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

          {/* RIGHT — (Theme toggle removed) */}
          <div className="shelf-nav-right-placeholder" />
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