import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

/* ── Serene Scene Background ── */
function SceneBackground() {
  return (
    <div className="shelf-scene">
      <div className="scene-grain" />
    </div>
  );
}

/* ─── Main landing page ─── */
export default function HomePage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollRef   = useRef(null);
  const headlineRef = useRef(null);
  const ctaRef      = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Nav: top=20px, height=60px → bottom edge at 80px. Dock pill 10px below → 90px.
    const DOCKED_TOP = 90; 
    const PILL_HEIGHT = 65;

    const updateScroll = () => {
      const scrolled = container.scrollTop;
      const vh = window.innerHeight;

      // progress: 0 at top, 1 when scrolled one full viewport height
      const progress = Math.min(scrolled / vh, 1);

      // 1. Headline: fade out as it scrolls away
      if (headlineRef.current) {
        const opacity = Math.max(0, 1 - progress * 2.5);
        headlineRef.current.style.opacity = opacity;
      }

      // 2. CTA Pill: slide from initial 75vh position up to docking position
      if (ctaRef.current) {
        const scale = 1 - progress * 0.15;
        const scaledHeight = PILL_HEIGHT * scale;
        const targetCenterY = DOCKED_TOP + scaledHeight / 2;
        
        // Match your latest CSS (75% start)
        const startCenterY = vh * 0.75;

        const currentCenterY = startCenterY + (targetCenterY - startCenterY) * progress;

        ctaRef.current.style.top = `${currentCenterY}px`;
        // Ensure centering is maintained
        ctaRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        if (progress > 0.98) {
          ctaRef.current.classList.add("is-docked");
        } else {
          ctaRef.current.classList.remove("is-docked");
        }
      }
    };

    // Initial position
    updateScroll();

    const onScroll = () => requestAnimationFrame(updateScroll);
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateScroll);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  return (
    <div className="shelf-wrapper" data-theme="light">
      <SceneBackground />
      <div 
        className="shelf-root" 
        ref={scrollRef} 
      >

        {/* ── Nav ── */}
        <nav className="shelf-nav fade-nav">
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

          <span className="shelf-nav-logo">Shelf</span>

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

        {/* ── Scroll Container ── */}
        <div className="shelf-hero-scroll-container">

          {/* ── Hero (sticky, fades on scroll) ── */}
          <section className="shelf-hero">
            <div className="shelf-headline-wrap fade-2" ref={headlineRef}>
              <span className="shelf-headline-line">Unlock stories</span>
              <span className="shelf-headline-line">expand minds</span>
              <p className="shelf-subtext fade-3">
                One digital library for every kind of reader.
              </p>
            </div>
          </section>

          {/* ── Second Page ── */}
          <section className="shelf-second-page">
            {/* The BROWSE GENRE pill lands here as a heading */}
          </section>

        </div>

        {/* ── CTA Pill — fixed, animated by JS ──
            Lives outside the scroll container so it's truly viewport-relative.
            z-index 999 keeps it below the nav (1000) once docked. ── */}
        <div
          className="shelf-cta-pill fade-3"
          ref={ctaRef}
          onClick={() => navigate("/dashboard")}
        >
          <div className="shelf-glass-inner">
            <span className="glass-content">BROWSE GENRE</span>
          </div>
        </div>

      </div>
    </div>
  );
}