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
    title: "BROWSE GENRE",
    sub: "Explore an endless universe of stories curated just for you.",
    cta: "Browse Library",
    route: "/dashboard",
  },
  {
    color1: '#6a0572',
    color2: '#ce93d8',
    title: "Science Fiction",
    sub: "Stories focused on futuristic technology, space exploration, or scientific what-ifs.",
    cta: "Explore Sci-Fi",
    route: "/dashboard",
  },
  {
    color1: '#004d40',
    color2: '#80cbc4',
    title: "Mystery & Crime",
    sub: "Narratives centered around solving a puzzle or a crime.",
    cta: "Explore Mystery",
    route: "/dashboard",
  },
  {
    color1: '#b83b5e',
    color2: '#f08a5d',
    title: "Romance",
    sub: "Stories primarily focused on a central love story.",
    cta: "Explore Romance",
    route: "/dashboard",
  },
  {
    color1: '#0f4c75',
    color2: '#3282b8',
    title: "Join the Community",
    sub: "Share reviews, swap recommendations, and find your next great read together.",
    cta: "Browse Library",
    route: "/dashboard",
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
  const heroSectionRef = useRef(null);
  const morphWrapRef = useRef(null);
  const morphTargetYRef = useRef(null); // cached Y-center of carousel's .lc-title

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let ticking = false;

    // ── Measure the carousel title's center-Y relative to the hero section.
    // Because .shelf-hero is sticky and always at top:0, its child elements'
    // offsetTop values are scroll-position-independent.
    const getMorphTargetY = () => {
      if (morphTargetYRef.current !== null) return;
      if (!secondPageRef.current || !heroSectionRef.current) return;
      const lcTitle = secondPageRef.current.querySelector('.lc-title');
      if (!lcTitle) return;
      
      let offsetY = 0;
      let el = lcTitle;
      while (el && el !== heroSectionRef.current) {
        offsetY += el.offsetTop;
        el = el.offsetParent;
      }
      // Vertical center of the title relative to hero top
      morphTargetYRef.current = offsetY + lcTitle.offsetHeight / 2;
    };

    const updateScroll = () => {
      const scrolled = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const progress = maxScroll > 0 ? Math.min(scrolled / maxScroll, 1) : 0;
      
      if (scrolled > 10) {
        container.classList.add('is-scrolling');
        container.classList.add('has-scrolled-once');
      } else {
        container.classList.remove('is-scrolling');
      }

      // Move texts upwards
      const textTranslate = -progress * 800;
      const headlineTranslate = -progress * 1500;

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

      // Move stickers
      document.querySelectorAll('.shelf-sticker').forEach(sticker => {
         sticker.style.opacity = 1;
         const isBulb = sticker.classList.contains('shelf-sticker--bulb');
         const rot = isBulb ? -12 : 18;
         sticker.style.transform = `translate3d(0, ${textTranslate}px, 0) rotate(${rot}deg)`;
      });

      // ── Morph: glass pill → full-screen carousel (shared-element) ──
      const morphStart = 0.25;
      const morphEnd   = 0.75;
      const morphProgress = Math.max(0, Math.min(1, (progress - morphStart) / (morphEnd - morphStart)));
      const morphEased   = morphProgress * morphProgress * (3.0 - 2.0 * morphProgress);

      getMorphTargetY();

      if (morphWrapRef.current && glassInnerRef.current && fictionTextRef.current) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pillW = 250, pillH = 75;

        // 1. Fixed starting position (no initial slide-up)
        const startCenterY  = (vh / 2 + 177.5);
        const targetCenterY = morphTargetYRef.current !== null ? morphTargetYRef.current : (vh / 2);
        
        // Morph only moves it between start and target
        const centerY = startCenterY + (targetCenterY - startCenterY) * morphEased;

        const w    = pillW + (vw - pillW) * morphEased;
        const h    = pillH + (vh - pillH) * morphEased;
        const left = (vw - w) / 2;
        const top  = centerY - h / 2;

        morphWrapRef.current.style.width   = `${w}px`;
        morphWrapRef.current.style.height  = `${h}px`;
        morphWrapRef.current.style.left    = `${left}px`;
        morphWrapRef.current.style.top     = `${top}px`;

        // Cross-fade window
        const crossFadeProgress = Math.max(0, Math.min(1, (morphProgress - 0.6) / 0.35));
        const overlayOpacity = 1 - crossFadeProgress;
        morphWrapRef.current.style.opacity       = overlayOpacity;
        morphWrapRef.current.style.pointerEvents = overlayOpacity < 0.05 ? 'none' : 'auto';

        // Glass shell dissolves INSTANTLY once morph starts (multiplier of 10x)
        const radius   = Math.max(16 * (1 - morphEased * 5), 0);
        const blurPx   = Math.max(12 * (1 - morphEased * 10), 0);
        const bgAlpha  = Math.max(0.08 * (1 - morphEased * 10), 0);
        const brdAlpha = Math.max(0.25 * (1 - morphEased * 10), 0);
        const shadow   = Math.max(0.15 * (1 - morphEased * 10), 0);

        glassInnerRef.current.style.borderRadius         = `${radius}px`;
        glassInnerRef.current.style.background           = `rgba(255,255,255,${bgAlpha})`;
        glassInnerRef.current.style.backdropFilter       = `blur(${blurPx}px)`;
        glassInnerRef.current.style.WebkitBackdropFilter = `blur(${blurPx}px)`;
        glassInnerRef.current.style.borderColor          = `rgba(255,255,255,${brdAlpha})`;
        glassInnerRef.current.style.boxShadow            = `0 12px 40px rgba(0,0,0,${shadow})`;

        // BROWSE GENRE text: NO FADE — grows to .lc-title size
        const startFs  = 17.6;
        const endFs    = Math.max(40, Math.min(72, vw * 0.06));
        const fontSize = startFs + (endFs - startFs) * morphEased;
        const letterSp = 0.05 + (0.02 - 0.05) * morphEased;

        fictionTextRef.current.style.fontSize      = `${fontSize}px`;
        fictionTextRef.current.style.letterSpacing = `${letterSp}em`;
        fictionTextRef.current.style.fontFamily    = '"Anton", sans-serif';
        fictionTextRef.current.style.fontWeight    = '400';
        fictionTextRef.current.style.textShadow    = `0 10px 30px rgba(0,0,0,${morphEased * 0.3})`;
      }

      // Carousel reveal: Starts only when the morph is nearly complete (0.9 to 1.0)
      if (secondPageRef.current) {
        const carouselReveal = Math.max(0, Math.min(1, (morphProgress - 0.9) / 0.1));
        secondPageRef.current.style.opacity      = carouselReveal;
        secondPageRef.current.style.pointerEvents = carouselReveal > 0.05 ? 'auto' : 'none';
        
        const lcTitle = secondPageRef.current.querySelector('.lc-title');
        if (lcTitle) {
          lcTitle.style.opacity = morphProgress > 0.95 ? '1' : '0';
        }
      }

      // Hero headlines fade out
      const heroOpacity = Math.max(0, 1 - morphProgress * 2.5);
      if (line1Ref.current)   line1Ref.current.style.opacity   = heroOpacity;
      if (line2Ref.current)   line2Ref.current.style.opacity   = heroOpacity;
      if (subtextRef.current) subtextRef.current.style.opacity = heroOpacity;
      if (actionsRef.current) actionsRef.current.style.opacity = heroOpacity;

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
          <section className="shelf-hero" ref={heroSectionRef}>

            {/* ── Layer 1: Carousel (bottom) ── */}
            <div className="shelf-second-page" ref={secondPageRef}>
              <LiquidCarousel />
            </div>

            {/* ── Layer 2: Morphing glass pill (middle)
                 Lives OUTSIDE headline-wrap so clip-path never cuts it.
                 JS controls width / height / left / top directly. ── */}
            <div
              className="shelf-morph-overlay fade-3"
              ref={morphWrapRef}
            >
              <div className="shelf-glass-inner" ref={glassInnerRef}>
                <span className="glass-content" ref={fictionTextRef}>
                  BROWSE GENRE
                </span>
              </div>
            </div>

            {/* ── Layer 3: Hero headlines (top) ── */}
            <div className="shelf-headline-wrap fade-2">
              <span className="shelf-headline-line shelf-headline-line--top" ref={line1Ref}>
                Unlock stories
              </span>
              <span className="shelf-headline-line shelf-headline-line--bottom" ref={line2Ref}>
                expand minds
              </span>
              <p className="shelf-subtext fade-3" ref={subtextRef}>
                One digital library for every kind of reader.
              </p>
            </div>

          </section>
        </div>

      </div>
    </div>        
  );
}