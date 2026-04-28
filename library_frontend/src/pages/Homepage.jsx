import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
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

/* ── WebGL Liquid Transition Carousel ── */
const SLIDES = [
  {
    color1: '#1a1a2e',
    color2: '#0f3460',
    title: "Welcome to the Collection",
    sub: "Explore an endless universe of stories curated just for you.",
    cta: "Browse Library",
    route: "/dashboard",
  },
  {
    color1: '#6a0572',
    color2: '#ce93d8',
    title: "Track Every Page",
    sub: "Log your reading, set goals, and watch your library grow.",
    cta: "Start Tracking",
    route: "/signup",
  },
  {
    color1: '#004d40',
    color2: '#80cbc4',
    title: "Discover Hidden Gems",
    sub: "Our algorithm finds books you didn't know you needed.",
    cta: "Explore Now",
    route: "/dashboard",
  },
  {
    color1: '#b83b5e',
    color2: '#f08a5d',
    title: "Read Anywhere",
    sub: "Your entire collection, synced across every device.",
    cta: "Get Started",
    route: "/signup",
  },
  {
    color1: '#0f4c75',
    color2: '#3282b8',
    title: "Join the Community",
    sub: "Share reviews, swap recommendations, and find your next great read together.",
    cta: "Join Now",
    route: "/signup",
  },
];

const LiquidMaterial = shaderMaterial(
  {
    uProgress: 0,
    uTime: 0,
    uColor1A: new THREE.Color(SLIDES[0].color1),
    uColor1B: new THREE.Color(SLIDES[0].color2),
    uColor2A: new THREE.Color(SLIDES[0].color1),
    uColor2B: new THREE.Color(SLIDES[0].color2),
    uSwipeDir: 1.0,
  },
  // vertex shader
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // fragment shader
  `
  uniform float uProgress;
  uniform float uTime;
  uniform vec3 uColor1A;
  uniform vec3 uColor1B;
  uniform vec3 uColor2A;
  uniform vec3 uColor2B;
  uniform float uSwipeDir;
  
  varying vec2 vUv;

  // Stable 2D Random
  float random(in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  // Smooth Value Noise
  float noise(in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(a, b, u.x) +
              (c - a) * u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
  }

  void main() {
    vec2 p = vUv;
    
    // Liquid displacement using noise
    float disp = noise(p * 4.0 + uTime * 0.4);
    float disp2 = noise(p * 8.0 - uTime * 0.2);
    float totalDisp = disp * 0.6 + disp2 * 0.4; // 0.0 to 1.0
    
    // Swipe direction (1 for next, -1 for prev)
    float edge = uSwipeDir > 0.0 ? 1.0 - p.x : p.x;
    
    // Strong distortion for clear liquid wave (-0.6 to 0.6)
    float distortion = totalDisp * 1.2 - 0.6;
    float distortedEdge = edge + distortion;
    
    // Boundary moves from -0.75 to 1.75 to guarantee full clearance
    float b = uProgress * 2.5 - 0.75;
    
    // Narrow band (0.2 width) for a distinct wave edge instead of a muddy fade
    float mixVal = smoothstep(b - 0.1, b + 0.1, distortedEdge);
    
    // Edge glow (foam)
    float edgeDist = abs(distortedEdge - b);
    float glow = smoothstep(0.05, 0.0, edgeDist);
    
    // Render current and next gradients
    vec3 grad1 = mix(uColor1B, uColor1A, p.y * 0.8 + p.x * 0.2);
    vec3 grad2 = mix(uColor2B, uColor2A, p.y * 0.8 + p.x * 0.2);
    
    // Mix them based on the liquid wipe
    vec3 finalColor = mix(grad2, grad1, mixVal);
    
    // Add subtle bright glow at the boundary
    finalColor += vec3(glow * 0.25);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
  `
);

extend({ LiquidMaterial });

function WebGLBackground({ slideIndex, swipeDir }) {
  const materialRef = useRef();
  const [transitioning, setTransitioning] = useState(false);
  const prevSlideIndex = useRef(slideIndex);
  
  useEffect(() => {
    if (slideIndex !== prevSlideIndex.current) {
      setTransitioning(true);
      if (materialRef.current) {
        materialRef.current.uProgress = 0;
        materialRef.current.userData.rawProgress = 0; // Reset raw progress
        const prevSlide = SLIDES[prevSlideIndex.current];
        const nextSlide = SLIDES[slideIndex];
        
        materialRef.current.uColor1A = new THREE.Color(prevSlide.color1);
        materialRef.current.uColor1B = new THREE.Color(prevSlide.color2);
        materialRef.current.uColor2A = new THREE.Color(nextSlide.color1);
        materialRef.current.uColor2B = new THREE.Color(nextSlide.color2);
        materialRef.current.uSwipeDir = swipeDir;
      }
      prevSlideIndex.current = slideIndex;
    }
  }, [slideIndex, swipeDir]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      // Cap delta to prevent large jumps if the React main thread blocks during DOM updates
      const dt = Math.min(delta, 0.04); 
      materialRef.current.uTime += dt;
      
      if (transitioning) {
        let raw = materialRef.current.userData.rawProgress || 0;
        raw += dt * 1.8; // Animation speed increased for a snappier wave
        
        if (raw >= 1.0) {
          raw = 1.0;
          setTransitioning(false);
          const curSlide = SLIDES[slideIndex];
          materialRef.current.uColor1A = new THREE.Color(curSlide.color1);
          materialRef.current.uColor1B = new THREE.Color(curSlide.color2);
          materialRef.current.uColor2A = new THREE.Color(curSlide.color1);
          materialRef.current.uColor2B = new THREE.Color(curSlide.color2);
          materialRef.current.uProgress = 0.0;
        } else {
          // Smoothstep easing for a fluid, non-linear wipe
          materialRef.current.uProgress = raw * raw * (3.0 - 2.0 * raw);
        }
        materialRef.current.userData.rawProgress = raw;
      }
    }
  });

  return (
    <mesh>
      {/* Plane spanning the full orthographic camera view (-1 to 1) */}
      <planeGeometry args={[2, 2]} />
      <liquidMaterial ref={materialRef} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

function LiquidCarousel() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [swipeDir, setSwipeDir] = useState(1);
  const [contentKey, setContentKey] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const nextIdxRef = useRef(null);
  
  const currentRef = useRef(current);
  useEffect(() => { currentRef.current = current; }, [current]);
  
  const goTo = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(idx, SLIDES.length - 1));
    if (clamped === currentRef.current || isExiting) return;
    
    setSwipeDir(clamped > currentRef.current ? 1 : -1);
    setIsExiting(true);
    nextIdxRef.current = clamped;
    
    // Wait for exit transition (blur/fade backwards) before updating content
    setTimeout(() => {
      setCurrent(nextIdxRef.current);
      setContentKey(k => k + 1); // trigger CSS staggered entrance animations
      setIsExiting(false);
    }, 400); // 400ms matches CSS transition
  }, [isExiting]);
  
  const isDragging = useRef(false);
  const startX = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  
  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    setDragOffset(0);
  }, []);
  
  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    setDragOffset(e.clientX - startX.current);
  }, []);
  
  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragOffset((prev) => {
      if (prev < -60) goTo(currentRef.current + 1);
      else if (prev > 60) goTo(currentRef.current - 1);
      return 0;
    });
  }, [goTo]);

  const onTouchStart = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.touches[0].clientX;
    setDragOffset(0);
  }, []);
  
  const onTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    setDragOffset(e.touches[0].clientX - startX.current);
  }, []);
  
  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragOffset((prev) => {
      if (prev < -60) goTo(currentRef.current + 1);
      else if (prev > 60) goTo(currentRef.current - 1);
      return 0;
    });
  }, [goTo]);

  return (
    <div className="lcarousel-container" 
         onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
         onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      <div className="lcarousel-bg">
        <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1, left: -1, right: 1, top: 1, bottom: -1 }}>
          <WebGLBackground slideIndex={isExiting ? nextIdxRef.current : current} swipeDir={swipeDir} />
        </Canvas>
      </div>
      
      <div className="lcarousel-overlay">
        <div key={contentKey} className={`lcarousel-content-animate ${isExiting ? 'is-exiting' : ''}`} style={{ transform: `translateX(${dragOffset * 0.5}px)` }}>
           <p className="lc-eyebrow">0{current + 1} / 0{SLIDES.length}</p>
           <h2 className="lc-title">{SLIDES[current].title}</h2>
           <p className="lc-sub">{SLIDES[current].sub}</p>
           <button className="lc-btn" onClick={(e) => { e.stopPropagation(); navigate(SLIDES[current].route); }}>
             {SLIDES[current].cta} <span className="lc-arrow-btn">→</span>
           </button>
        </div>
        
        {current > 0 && (
          <button className="lc-nav lc-nav-left" onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}>‹</button>
        )}
        {current < SLIDES.length - 1 && (
          <button className="lc-nav lc-nav-right" onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}>›</button>
        )}
        
        <div className="lc-dots">
          {SLIDES.map((_, i) => (
            <button key={i} className={`lc-dot ${i === current ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); goTo(i); }} />
          ))}
        </div>
      </div>
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

            {/* ── WebGL Liquid Carousel Page ── */}
            <div className="shelf-second-page" ref={secondPageRef}>
              <LiquidCarousel />
            </div>

          </section>
        </div>

      </div>
    </div>        
  );
}