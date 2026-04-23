import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";


import bulbIcon from "../assets/bulb.png";
import bookIcon from "../assets/books.png";

/* ─── Main landing page ─── */
/* ── Canvas Grid Trail Component ── */
export default function HomePage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Component logic here if needed
  }, []);

  return (
    <div className="shelf-wrapper" data-theme="light">
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