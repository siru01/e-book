import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

/* ── Serene Scene Background ── */
function SceneBackground({ firstBgRef, secondBgRef }) {
  return (
    <div className="shelf-scene">
      <div className="scene-bg-layer layer-dots" ref={firstBgRef} />
      <div className="scene-bg-layer layer-grid" ref={secondBgRef} />
      <div className="scene-grain" />
    </div>
  );
}

/* ─── Main landing page ─── */
export default function HomePage() {
  const navigate = useNavigate();

  const scrollRef   = useRef(null);
  const headlineRef = useRef(null);
  const ctaRef      = useRef(null);
  const firstBgRef  = useRef(null);
  const secondBgRef = useRef(null);

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

      // 1.5 Background Fade: transition from dots to grid
      // Make dots disappear faster (completely gone at 0.8 progress)
      if (firstBgRef.current) {
        const dotOpacity = Math.max(0, 1 - progress / 0.8);
        firstBgRef.current.style.opacity = dotOpacity;
      }
      // Make grid appear sooner (fully visible at 0.9 progress)
      if (secondBgRef.current) {
        const gridOpacity = Math.min(1, progress / 0.9);
        secondBgRef.current.style.opacity = gridOpacity;
      }

      // 2. CTA Pill: slide from initial 75vh position up to docking position
      if (ctaRef.current) {
        const scale = 1 - progress * 0.15;
        const scaledHeight = PILL_HEIGHT * scale;
        const targetCenterY = DOCKED_TOP + scaledHeight / 2;
        
        // Match your latest CSS (75% start)
        const startCenterY = vh * 0.75;

        let currentCenterY = startCenterY + (targetCenterY - startCenterY) * progress;

        // --- NEW: PUSH LOGIC ---
        // The second page starts at 90vh in the scroll container.
        // We want the windows (inside shelf-second-page) to stay below the pill.
        // Current second page top relative to viewport:
        const secondPageTop = (vh * 0.9) - scrolled;
        // The windows have a padding-top in CSS. Let's account for it.
        const paddingOffset = 120; // We will reduce the CSS padding to this.
        const contentTop = secondPageTop + paddingOffset;
        
        const pillBottom = currentCenterY + (scaledHeight / 2);
        const GAP = 50; // Min gap between pill and windows

        if (contentTop < pillBottom + GAP) {
          // Push the pill up as the content moves up
          currentCenterY -= (pillBottom + GAP - contentTop);
        }
        // -----------------------

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
      <SceneBackground firstBgRef={firstBgRef} secondBgRef={secondBgRef} />
      <div 
        className="shelf-root" 
        ref={scrollRef} 
      >
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

          {/* ── Second Page: Data Dashboard Layout ── */}
          <section className="shelf-second-page">
            <div className="hex-layout-container">
              
              <div className="hex-stack">
                
                {/* Left: Notebook Window */}
                <div className="hex-window window-notebook">
                  <div className="hex-window-header">
                    <div className="hex-window-title">FICTION</div>
                    <div className="hex-window-actions">
                      <button className="hex-btn-small">Notebook</button> 
                    </div>
                  </div>
                  <div className="hex-window-body">
                    <div className="hex-sidebar">
                      <div className="side-icon" />
                      <div className="side-icon" />
                      <div className="side-icon" />
                    </div>
                    <div className="hex-main">
                      <div className="mock-code">
                        import numpy as np<br/>
                        df = load_data("revenue_2026")<br/>
                        df.groupby("sector").sum()
                      </div>
                      <div className="mock-chart">
                        <div className="mock-line" style={{top: '40%', opacity: 0.4}}></div>
                        <div className="mock-line" style={{top: '60%', opacity: 0.1}}></div>
                      </div>
                      <div className="mock-stats">
                        <div className="stat-card">
                          <div className="stat-label">Velocity</div>
                          <div className="stat-value">84.2%</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">Retention</div>
                          <div className="stat-value">12.4k</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center: AI/Chat Window */}
                <div className="hex-window window-chat">
                  <div className="hex-window-header">
                    <div className="hex-window-title">NexaCorp product line performance</div>
                    <div className="hex-window-actions">
                      <button className="hex-btn-small">Share</button>
                    </div>
                  </div>
                  <div className="hex-window-body">
                    <div className="hex-main">
                      <div className="chat-bubble">Can you show me NexaCorp's Q3 sales?</div>
                      <div className="chat-bubble ai">
                        I'll help you analyze NexaCorp's revenue. I've pulled data from Q1-Q3.
                        <div className="mock-chart" style={{height: '100px', marginTop: '12px'}}>
                           <div className="mock-line" style={{top: '30%', backgroundColor: '#000'}}></div>
                        </div>
                      </div>
                      <div className="chat-bubble ai">
                        <strong>NexaCorp revenue trends</strong>
                        <ul style={{fontSize: '0.75rem', paddingLeft: '16px', marginTop: '8px'}}>
                          <li>Teleportation pads — $42.3M</li>
                          <li>Quantum drives — $38.7M</li>
                          <li>Wormhole initiators — $33.1M</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Beautiful Apps Window */}
                <div className="hex-window window-dashboard">
                  <div className="hex-window-header">
                    <div className="hex-window-title">Customer Analytics Dashboard</div>
                    <div className="hex-window-actions">
                      <button className="hex-btn-small">Edit</button>
                      <button className="hex-btn-small">Share</button>
                    </div>
                  </div>
                  <div className="hex-window-body">
                    <div className="hex-main">
                      <div className="mock-stats" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
                        <div className="stat-card"><div className="stat-label">ARR</div><div className="stat-value">$1.2M</div></div>
                        <div className="stat-card"><div className="stat-label">Churn</div><div className="stat-value">2.1%</div></div>
                        <div className="stat-card"><div className="stat-label">Growth</div><div className="stat-value">+14%</div></div>
                      </div>
                      <div className="mock-chart" style={{height: '240px'}}>
                         <div style={{position: 'absolute', bottom: 0, left: '10%', width: '15%', height: '60%', background: '#eee'}}></div>
                         <div style={{position: 'absolute', bottom: 0, left: '30%', width: '15%', height: '80%', background: '#ddd'}}></div>
                         <div style={{position: 'absolute', bottom: 0, left: '50%', width: '15%', height: '40%', background: '#ccc'}}></div>
                         <div style={{position: 'absolute', bottom: 0, left: '70%', width: '15%', height: '90%', background: '#bbb'}}></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

        </div>

        {/* ── CTA Pill — fixed, animated by JS ──
            Lives outside the scroll container so it's truly viewport-relative.
            z-index 999 keeps it below the nav (1000) once docked. ── */}
        <div
          className="shelf-cta-pill fade-center"
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