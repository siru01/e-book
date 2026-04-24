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

  const scrollRef = useRef(null);
  const heroImgRef = useRef(null);
  const headlineRef = useRef(null);
  const subtextRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrolled = container.scrollTop;
      // Revert to simpler 600px progress for a more direct scroll feel
      const progress = Math.min(scrolled / 600, 1);
      
      if (heroImgRef.current) {
        // Zoom the glass container
        heroImgRef.current.style.transform = `scale(${1 + progress * 0.45})`;
        heroImgRef.current.style.opacity = `${1 - progress * 0.5}`;
      }

      if (headlineRef.current) {
        headlineRef.current.style.transform = `translateY(${-progress * 120}px)`;
        headlineRef.current.style.opacity = `${1 - progress * 0.8}`;
      }

      if (subtextRef.current) {
        subtextRef.current.style.transform = `translateY(${-progress * 60}px)`;
        subtextRef.current.style.opacity = `${1 - progress * 0.9}`;
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="shelf-wrapper" data-theme="light">
      <div className="shelf-root" ref={scrollRef}>

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

        <section className="shelf-hero">

          {/* Staggered headline with image sandwiched between line 1 & line 2 */}
          <div className="shelf-headline-wrap fade-2" ref={headlineRef}>

            {/* Line 1 — z-index below the image */}
            <span className="shelf-headline-line shelf-headline-line--top">
              Unlock stories
            </span>

            {/* ── Glass Container: Tilted & Floating ── */}
            <div 
              className="shelf-hero-img-wrap" 
              ref={heroImgRef}
            >
              <div className="shelf-glass-inner">
                {/* Content will be added later */}
              </div>
            </div>

            {/* Line 2 — z-index above the image */}
            <span className="shelf-headline-line shelf-headline-line--bottom">
              expand minds
            </span>

            <p className="shelf-subtext fade-3" ref={subtextRef}>
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
          </div>
        </section>

      </div>
    </div>        
  );
}