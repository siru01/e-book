import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";


import bulbIcon from "../assets/bulb.png";
import bookIcon from "../assets/books.png";

/* ── Serene Scene Background (Pure JSX/CSS) ── */
function SceneBackground() {
  return (
    <div className="shelf-scene">
      <div className="scene-ambient" />
      <div className="scene-sun" />
      <div className="scene-layer scene-layer--back" />
      <div className="scene-layer scene-layer--mid" />
      <div className="scene-layer scene-layer--front" />
      <div className="scene-grain" />
    </div>
  );
}

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

    let ticking = false;

    const updateScroll = () => {
      const scrolled = container.scrollTop;
      // Total scroll distance for the transition is dynamically calculated
      const maxScroll = container.scrollHeight - container.clientHeight;
      const progress = maxScroll > 0 ? Math.min(scrolled / maxScroll, 1) : 0;
      
      if (scrolled > 10) {
        container.classList.add('is-scrolling');
        container.classList.add('has-scrolled-once');
      } else {
        container.classList.remove('is-scrolling');
      }

      // Move texts and stickers upwards faster, without fading
      const textTranslate = -progress * 800;
      const headlineTranslate = -progress * 1500; // Even faster for headlines

      if (line1Ref.current) {
        line1Ref.current.style.transform = `translate3d(0, ${headlineTranslate}px, 0)`;
        line1Ref.current.style.opacity = 1;
      }
      if (line2Ref.current) {
        line2Ref.current.style.transform = `translate3d(0, ${headlineTranslate}px, 0)`;
        line2Ref.current.style.opacity = 1;
      }
      if (subtextRef.current) {
        subtextRef.current.style.transform = `translate3d(0, ${-textTranslate}px, 0)`;
        subtextRef.current.style.opacity = 1;
      }
      if (actionsRef.current) {
        actionsRef.current.style.transform = `translate3d(0, ${-textTranslate}px, 0)`;
        actionsRef.current.style.opacity = 1;
      }

      // Move stickers without fading
      document.querySelectorAll('.shelf-sticker').forEach(sticker => {
         sticker.style.opacity = 1;
         const isBulb = sticker.classList.contains('shelf-sticker--bulb');
         const rot = isBulb ? -12 : 18;
         sticker.style.transform = `translate3d(0, ${textTranslate}px, 0) rotate(${rot}deg)`;
      });

      // Calculate scale globally with a smoother Quintic curve for that 'infinite' zoom feel
      const quinticProgress = Math.pow(progress, 5);
      const scale = 1 + quinticProgress * 120; // Slightly more zoom, much smoother end

      if (heroImgRef.current) {
        const rotationProgress = Math.min(progress / 0.35, 1);
        const currentRotation = 12 * (1 - rotationProgress);
        
        // Use translateZ(0) to force GPU layer for extra smoothness
        heroImgRef.current.style.transform = `scale3d(${scale}, ${scale}, 1) rotate(${currentRotation}deg) translateZ(0)`;
      }

      if (glassInnerRef.current) {
         const borderOpacity = Math.max(0.25 - progress * 4, 0);
         const shadowOpacity = Math.max(0.15 - progress * 2, 0);
         glassInnerRef.current.style.borderColor = `rgba(255, 255, 255, ${borderOpacity})`;
         glassInnerRef.current.style.boxShadow = `0 12px 40px rgba(0, 0, 0, ${shadowOpacity}), inset 0 0 0 1px rgba(255, 255, 255, ${borderOpacity})`;
         glassInnerRef.current.style.background = `rgba(255, 255, 255, 0.08)`;
         
         // Counteract blur magnification, but cap at 0.5px to avoid sub-pixel jitter in some browsers
         const blurRadius = Math.max(12 / scale, 0.5);
         glassInnerRef.current.style.backdropFilter = `blur(${blurRadius}px)`;
         glassInnerRef.current.style.WebkitBackdropFilter = `blur(${blurRadius}px)`;
         glassInnerRef.current.style.opacity = 1;
      }

      if (fictionTextRef.current) {
         fictionTextRef.current.style.opacity = Math.max(1 - progress * 6, 0);
      }

      if (secondPageRef.current) {
        // More gradual fade-in starting from 75% scroll
        const secondPageProgress = Math.max(0, (progress - 0.75) * 4); 
        const opacity = Math.min(Math.pow(secondPageProgress, 2), 1); // Quadratic fade for smoothness
        secondPageRef.current.style.opacity = opacity;
        secondPageRef.current.style.transform = `translate3d(0, 0, 0)`;
        secondPageRef.current.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="shelf-wrapper" data-theme="light">
      <SceneBackground />
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