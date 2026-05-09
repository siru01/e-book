import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

/* ── Serene Scene Background (Pure JSX/CSS) ── */
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

  const scrollRef = useRef(null);
  const heroContentRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateScroll = () => {
      const scrolled = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const progress = maxScroll > 0 ? Math.min(scrolled / maxScroll, 1) : 0;
      
      // Simple fade out of the entire hero content as we scroll to the blank page
      if (heroContentRef.current) {
        const opacity = Math.max(0, 1 - progress * 2.5);
        const translateY = -progress * 500;
        heroContentRef.current.style.opacity = opacity;
        heroContentRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
      }
    };

    const handleScroll = () => {
      window.requestAnimationFrame(updateScroll);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="shelf-wrapper" data-theme="light">
      <SceneBackground />
      <div className="shelf-root" ref={scrollRef}>

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

        <div className="shelf-hero-scroll-container">
          <section className="shelf-hero">
            
            <div className="shelf-hero-content-reveal" ref={heroContentRef}>
              {/* ── Hero headlines ── */}
              <div className="shelf-headline-wrap fade-2">
                <span className="shelf-headline-line">
                  Unlock stories
                </span>
                <span className="shelf-headline-line">
                  expand minds
                </span>
                <p className="shelf-subtext fade-3">
                  One digital library for every kind of reader.
                </p>

                {/* Technical CTA Pill */}
                <div 
                  className="shelf-cta-pill fade-3"
                  onClick={() => navigate("/dashboard")}
                >
                  <div className="shelf-glass-inner">
                    <span className="glass-content">
                      BROWSE GENRE
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </section>
        </div>

      </div>
    </div>        
  );
}