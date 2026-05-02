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
    title: "Science Fiction ",   
    sub: "Stories focused on futuristic technology, space exploration, or scientific what ifs.",
    cta: "Start Tracking",
    route: "/signup",
  },
  {
    color1: '#004d40',
    color2: '#80cbc4',
    title: "Mystery & Crime",
    sub: "Narratives centered around solving a puzzle or a crime.",
    cta: "Explore Now",
    route: "/dashboard",
  },
  {
    color1: '#b83b5e',
    color2: '#f08a5d',
    title: "Romance",
    sub: "Stories primarily focused on a central love story.", 
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
    gl_Position = vec4(position, 1.0);
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

  // Faster, more stable simplex-like noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 p = vUv;
    
    // Liquid displacement using more stable noise
    float noiseVal = snoise(p * 2.5 + uTime * 0.2);
    float noiseVal2 = snoise(p * 5.0 - uTime * 0.1);
    float totalDisp = (noiseVal + noiseVal2 * 0.5) * 0.3;
    
    // Swipe direction (1 for next, -1 for prev)
    float edge = uSwipeDir > 0.0 ? 1.0 - p.x : p.x;
    
    // Distorted edge for liquid wave
    float distortedEdge = edge + totalDisp;
    
    // Boundary movement: -1.0 to 2.0 ensures full clearance across the plane
    float b = uProgress * 3.0 - 1.0;
    
    // Narrow mix band for a sharp but fluid edge
    float mixVal = smoothstep(b - 0.15, b + 0.15, distortedEdge);
    
    // Gradients for current and next slide
    vec3 grad1 = mix(uColor1B, uColor1A, p.y);
    vec3 grad2 = mix(uColor2B, uColor2A, p.y);
    
    // Mix based on the wipe progress
    vec3 finalColor = mix(grad2, grad1, mixVal);
    
    // Subtle edge glow
    float glow = smoothstep(0.1, 0.0, abs(distortedEdge - b)) * 0.15;
    finalColor += vec3(glow);
    
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
      // Smooth out delta to prevent jittering on frame drops
      const dt = Math.min(delta, 0.032); 
      materialRef.current.uTime += dt;
      
      if (transitioning) {
        let raw = materialRef.current.userData.rawProgress || 0;
        raw += dt * 1.5; // Slightly slower for more controlled liquid feel
        
        if (raw >= 1.0) {
          raw = 1.0;
          setTransitioning(false);
          const curSlide = SLIDES[slideIndex];
          // After transition, sync uColor1 to current so it becomes the base for next transition
          materialRef.current.uColor1A.set(curSlide.color1);
          materialRef.current.uColor1B.set(curSlide.color2);
          materialRef.current.uColor2A.set(curSlide.color1);
          materialRef.current.uColor2B.set(curSlide.color2);
          materialRef.current.uProgress = 0.0;
        } else {
          // Cubic easing for smoother start/stop of the wave
          materialRef.current.uProgress = raw * raw * (3.0 - 2.0 * raw); // Keep smoothstep or cubic
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
    if (isExiting) return;
    
    let nextIdx = idx;
    let dir = idx > currentRef.current ? 1 : -1;
    
    // Circular logic
    if (idx < 0) {
      nextIdx = SLIDES.length - 1;
      dir = -1; // Going "back" to the end
    } else if (idx >= SLIDES.length) {
      nextIdx = 0;
      dir = 1; // Going "forward" to the start
    }
    
    if (nextIdx === currentRef.current) return;
    
    setSwipeDir(dir);
    setIsExiting(true);
    nextIdxRef.current = nextIdx;
    
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
           <h2 className="lc-title">{SLIDES[current].title}</h2>
           <p className="lc-sub">{SLIDES[current].sub}</p>
           <button className="lc-btn" onClick={(e) => { e.stopPropagation(); navigate(SLIDES[current].route); }}>
             {SLIDES[current].cta}
           </button>
        </div>
        
        <div className="lc-nav-area lc-nav-area-left" 
             onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}
             onMouseDown={(e) => e.stopPropagation()}
        >
          <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M370 40 L130 256 L370 472" stroke="white" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="lc-nav-area lc-nav-area-right" 
             onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
             onMouseDown={(e) => e.stopPropagation()}
        >
          <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M142 40 L382 256 L142 472" stroke="white" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <div className="lc-dots" onMouseDown={(e) => e.stopPropagation()}>
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
        // More gradual fade-in starting from 80% scroll to ensure hero content is clear
        const revealThreshold = 0.8;
        const secondPageProgress = Math.max(0, (progress - revealThreshold) / (1 - revealThreshold)); 
        const opacity = Math.min(secondPageProgress * 1.5, 1); // Linear with slight boost for responsiveness
        
        secondPageRef.current.style.opacity = opacity;
        secondPageRef.current.style.transform = `translate3d(0, 0, 0)`;
        secondPageRef.current.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
        
        // Hide hero elements completely when second page is fully visible to prevent overlap jitter
        const heroOpacity = Math.max(0, 1 - secondPageProgress * 4);
        if (line1Ref.current) line1Ref.current.style.opacity = heroOpacity;
        if (line2Ref.current) line2Ref.current.style.opacity = heroOpacity;
        if (subtextRef.current) subtextRef.current.style.opacity = heroOpacity;
        if (actionsRef.current) actionsRef.current.style.opacity = heroOpacity;
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
                    BROWSE COLLECTIONS
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
                  First Time? Let's Get Started
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