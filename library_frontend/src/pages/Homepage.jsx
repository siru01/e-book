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
  const glassInnerRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const subtextRef = useRef(null);
  const actionsRef = useRef(null);
  const fictionTextRef = useRef(null);
  const secondPageRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrolled = container.scrollTop;
      // Total scroll distance for the transition is 1000px
      const progress = Math.min(scrolled / 1000, 1);
      
      if (scrolled > 10) {
        container.classList.add('is-scrolling');
        container.classList.add('has-scrolled-once');
      } else {
        container.classList.remove('is-scrolling');
      }

      // Fades out texts early on in the scroll
      const textOpacity = Math.max(1 - progress * 3, 0); 
      const textTranslate = -progress * 300;

      if (line1Ref.current) {
        line1Ref.current.style.transform = `translateY(${textTranslate}px)`;
        line1Ref.current.style.opacity = textOpacity;
      }
      if (line2Ref.current) {
        line2Ref.current.style.transform = `translateY(${textTranslate}px)`;
        line2Ref.current.style.opacity = textOpacity;
      }
      if (subtextRef.current) {
        subtextRef.current.style.transform = `translateY(${textTranslate}px)`;
        subtextRef.current.style.opacity = textOpacity;
      }
      if (actionsRef.current) {
        actionsRef.current.style.transform = `translateY(${textTranslate}px)`;
        actionsRef.current.style.opacity = textOpacity;
      }

      // Fade stickers
      document.querySelectorAll('.shelf-sticker').forEach(sticker => {
         sticker.style.opacity = textOpacity;
         sticker.style.transform = `translateY(${textTranslate}px)`;
      });

      if (heroImgRef.current) {
        // Zoom the glass container with an accelerating curve
        const cubicProgress = Math.pow(progress, 3);
        const scale = 1 + cubicProgress * 100; // Scale up massively

        // Smoothly rotate from 12deg to 0deg
        // We want it to straighten out relatively early (by 30% progress)
        const rotationProgress = Math.min(progress / 0.3, 1);
        const currentRotation = 12 * (1 - rotationProgress);
        
        heroImgRef.current.style.transform = `scale(${scale}) rotate(${currentRotation}deg)`;
      }

      if (glassInnerRef.current) {
         // Fade out border and shadow so they don't look thick when scaled
         const borderOpacity = Math.max(0.25 - progress * 4, 0);
         const shadowOpacity = Math.max(0.15 - progress * 2, 0);
         glassInnerRef.current.style.borderColor = `rgba(255, 255, 255, ${borderOpacity})`;
         glassInnerRef.current.style.boxShadow = `0 12px 40px rgba(0, 0, 0, ${shadowOpacity}), inset 0 0 0 1px rgba(255, 255, 255, ${borderOpacity})`;
         
         const bgOpacity = Math.min(0.08 + progress * 0.1, 0.2); 
         glassInnerRef.current.style.background = `rgba(255, 255, 255, ${bgOpacity})`;
      }

      if (fictionTextRef.current) {
         // Fade out the 'FICTION' text
         fictionTextRef.current.style.opacity = Math.max(1 - progress * 2.5, 0);
      }

      if (secondPageRef.current) {
        // Fade in the second page content once zoom is mostly done
        const secondPageProgress = Math.max(0, (progress - 0.7) * 3.33); 
        secondPageRef.current.style.opacity = Math.min(secondPageProgress, 1);
        secondPageRef.current.style.transform = `translateY(${40 - Math.min(secondPageProgress, 1) * 40}px)`;
        secondPageRef.current.style.pointerEvents = secondPageProgress > 0.5 ? 'auto' : 'none';
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

        <div className="shelf-hero-scroll-container">
          <section className="shelf-hero">

            {/* Staggered headline with image sandwiched between line 1 & line 2 */}
            <div className="shelf-headline-wrap fade-2">

              {/* Line 1 — z-index below the image */}
              <span className="shelf-headline-line shelf-headline-line--top" ref={line1Ref}>
                Unlock stories
              </span>

              {/* ── Glass Container: Tilted & Floating ── */}
              <div 
                className="shelf-hero-img-wrap" 
                ref={heroImgRef}
              >
                <div className="shelf-glass-inner" ref={glassInnerRef}>
                  <span className="glass-content" ref={fictionTextRef}>
                    FICTION
                  </span>
                </div>
              </div>

              {/* Line 2 — z-index above the image */}
              <span className="shelf-headline-line shelf-headline-line--bottom" ref={line2Ref}>
                expand minds
              </span>

              <p className="shelf-subtext fade-3" ref={subtextRef}>
                One digital library for every kind of reader.
              </p>

              <div className="shelf-actions fade-3" ref={actionsRef}>
                <button className="btn-primary" onClick={() => navigate("/login")}>
                  Get Back To You
                </button>
                <button className="btn-secondary" onClick={() => navigate("/signup")}>
                  First Time? Let's Get Started →
                </button>
              </div>
            </div>

            {/* ── Second Page Content (Fades in over the zoomed glass) ── */}
            <div className="shelf-second-page" ref={secondPageRef}>
              <h2 className="second-page-title">Welcome to the Collection</h2>
              <p className="second-page-text">Explore an endless universe of stories curated just for you.</p>
              <div className="shelf-actions">
                <button className="btn-primary" onClick={() => navigate("/dashboard")}>
                  Browse Library
                </button>
              </div>
            </div>

          </section>
        </div>

      </div>
    </div>        
  );
}