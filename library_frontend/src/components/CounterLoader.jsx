import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import "./CounterLoader.css";

/**
 * CounterLoader
 * @param {boolean} dataReady - When true, speeds up to 100%
 * @param {function} onComplete - Callback when 100% is reached
 * @param {boolean} overlay - If true, renders as a full-screen portal
 * @param {string} brand - Text shown above the counter
 * @param {string} label - Text shown below the bar
 */
export default function CounterLoader({ 
  dataReady, 
  onComplete, 
  overlay = true, 
  brand = "SHELF", 
  label = "Loading…" 
}) {
  const [count, setCount] = useState(1);
  const [exiting, setExiting] = useState(false);
  const dataReadyRef = useRef(false);
  const exitFiredRef = useRef(false);

  useEffect(() => {
    if (dataReady) dataReadyRef.current = true;
  }, [dataReady]);

  const triggerExit = useCallback(() => {
    if (exitFiredRef.current) return;
    exitFiredRef.current = true;
    setExiting(true);
    // Snappy transition
    setTimeout(() => onComplete(), 550);
  }, [onComplete]);

  useEffect(() => {
    let frame;
    let lastTime = performance.now();
    let currentProgress = 1;
    let velocity = 0.05; // Initial velocity (progress % per frame)

    const tick = (now) => {
      const deltaTime = now - lastTime;
      lastTime = now;
      
      // Target 60fps normalization
      const timeFactor = Math.min(deltaTime / 16.67, 3); // Cap delta to prevent huge jumps

      if (!dataReadyRef.current) {
        /* PHASE 1: Asymptotic crawl towards 99%
           The speed is proportional to the remaining distance to 99.
           This creates a natural "slowing down" effect as we approach the limit.
        */
        const target = 99;
        const remaining = target - currentProgress;
        
        // Dynamic velocity adjustment based on distance
        // We use a small factor to ensure it lasts a while
        velocity = remaining * 0.002 * timeFactor;
        
        // Safety: Ensure a minimum crawl speed so it never looks frozen
        if (velocity < 0.005 * timeFactor) velocity = 0.005 * timeFactor;
      } else {
        /* PHASE 2: Rapid acceleration to 100%
           Once data is ready, we pivot to a much higher velocity.
           We aim slightly past 100 to ensure we hit it decisively.
        */
        const target = 100.5;
        const remaining = target - currentProgress;
        
        // Boost velocity significantly
        // The factor 0.15 ensures we snap to 100 in about 500-800ms
        velocity = Math.max(velocity, remaining * 0.15 * timeFactor);
        
        // Minimum snap speed
        if (velocity < 0.8 * timeFactor) velocity = 0.8 * timeFactor;
      }

      currentProgress += velocity;
      
      // Monotonicity safety
      if (currentProgress > 100) currentProgress = 100;
      
      const displayCount = Math.floor(currentProgress);
      setCount(displayCount);

      if (displayCount < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        triggerExit();
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [triggerExit]);

  const content = (
    <div className={`c-loader ${overlay ? "c-loader--overlay" : "c-loader--inline"} ${exiting ? 'c-loader--exiting' : ''}`}>
      <div className="c-loader-inner">
        {brand && <div className="c-loader-brand">{brand}</div>}
        <div className="c-loader-count-wrap">
          <span className="c-loader-count">{count}</span>
          <span className="c-loader-pct">%</span>
        </div>
        <div className="c-loader-bar-track">
          <div className="c-loader-bar-fill" style={{ width: `${count}%` }} />
        </div>
        {label && <p className="c-loader-label">{label}</p>}
      </div>
    </div>
  );

  if (overlay) {
    return createPortal(content, document.body);
  }

  return content;
}
