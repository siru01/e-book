import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";


import bulbIcon from "../assets/bulb.png";
import bookIcon from "../assets/books.png";

/* ─── Main landing page ─── */
/* ── Canvas Grid Trail Component ── */
function GridTrail({ visible }) {
  const canvasRef = useRef(null);
  const [cells, setCells] = useState({}); // { "col-row": opacity }
  const requestRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellSize = 60;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const onMouseMove = (e) => {
      if (!visible) return;
      const col = Math.floor(e.clientX / cellSize);
      const row = Math.floor(e.clientY / cellSize);
      const key = `${col}-${row}`;
      
      setCells(prev => ({
        ...prev,
        [key]: 1.0
      }));
    };

    window.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      setCells(prev => {
        const next = { ...prev };
        let changed = false;
        
        for (const key in next) {
          next[key] -= 0.02; // Fading speed
          if (next[key] <= 0) {
            delete next[key];
            changed = true;
          } else {
            const [col, row] = key.split('-').map(Number);
            ctx.fillStyle = `rgba(255, 255, 255, ${next[key] * 0.15})`; // Subtle white squares
            ctx.fillRect(col * cellSize + 1, row * cellSize + 1, cellSize - 2, cellSize - 2);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, [visible]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease'
      }} 
    />
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Mouse tracking ────────────────
  const handleMouseMove = useCallback((e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    if (!cursorVisible) setCursorVisible(true);
  }, [cursorVisible]);

  useEffect(() => {
    const handleMouseLeave = () => setCursorVisible(false);
    const handleMouseEnter = () => setCursorVisible(true);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [handleMouseMove]);

  useEffect(() => {
    // Component logic here if needed
  }, []);

  return (
    <div className="shelf-wrapper" data-theme="light">
      <div className="shelf-root shelf-cursor-hidden">
        
        {/* Interactive Grid Trail (MoMoney Style) */}
        <GridTrail visible={cursorVisible} />

        {/* Custom Interactive Cursor */}
        <div
          className="shelf-cursor"
          style={{ 
            transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)`,
            opacity: cursorVisible ? 1 : 0 
          }}
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

          {/* RIGHT — Hamburger for mobile */}
          <div className="shelf-nav-right">
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

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="shelf-mobile-menu">
              <a href="#" onClick={() => setMobileMenuOpen(false)}>Browse</a>
              <a 
                href="/dashboard" 
                onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate("/dashboard"); }}
              >
                My Library
              </a>
              <a href="#" onClick={() => setMobileMenuOpen(false)}>About</a>
            </div>
          )}
        </nav>

        {/* ── Hero ── */}
        <section className="shelf-hero">

          {/* Staggered headline with image sandwiched between line 1 & line 2 */}
          <div className="shelf-headline-wrap fade-2">

            {/* Bulb sticker — bottom-left */}
            <div className="shelf-sticker shelf-sticker--bulb">
              <img src={bulbIcon} alt="Bulb" className="sticker-img" />
            </div>

            {/* Line 1 — z-index below the image */}
            <span className="shelf-headline-line shelf-headline-line--top">
              Unlock stories
            </span>

            {/* ── Placeholder: replace with your own image later ── */}
            <div className="shelf-hero-img-wrap">
              <div className="shelf-hero-placeholder" />
            </div>

            {/* Line 2 — z-index above the image */}
            <span className="shelf-headline-line shelf-headline-line--bottom">
              expand minds
            </span>

            {/* Book sticker — right */}
            <div className="shelf-sticker shelf-sticker--plane">
              <img src={bookIcon} alt="Book" className="sticker-img" />
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