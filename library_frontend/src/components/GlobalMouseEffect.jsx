import { useEffect, useRef, useState, useCallback } from "react";

/* ── Canvas Grid Trail Component ── */
function GridTrail({ visible }) {
  const canvasRef = useRef(null);
  const [cells, setCells] = useState({}); // { "col-row": opacity }
  const requestRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellSize = 60;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const onMouseMove = (e) => {
      if (!visible) return;
      const col = Math.floor(e.clientX / cellSize);
      const row = Math.floor(e.clientY / cellSize);
      const key = `${col}-${row}`;
      
      setCells(prev => ({
        ...prev,
        [key]: 1.0
      }));
    };

    window.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      setCells(prev => {
        const next = { ...prev };
        let changed = false;
        
        for (const key in next) {
          next[key] -= 0.02; // Fading speed
          if (next[key] <= 0) {
            delete next[key];
            changed = true;
          } else {
            const [col, row] = key.split('-').map(Number);
            ctx.fillStyle = `rgba(255, 255, 255, ${next[key] * 0.4})`; // Subtle squares
            ctx.fillRect(col * cellSize + 1, row * cellSize + 1, cellSize - 2, cellSize - 2);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, [visible]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        mixBlendMode: 'difference'
      }} 
    />
  );
}

export default function GlobalMouseEffect() {
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorVisible, setCursorVisible] = useState(false);

  // ── Mouse tracking ────────────────
  const handleMouseMove = useCallback((e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    if (!cursorVisible) setCursorVisible(true);
  }, [cursorVisible]);

  useEffect(() => {
    const handleMouseLeave = () => setCursorVisible(false);
    const handleMouseEnter = () => setCursorVisible(true);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    // Apply global cursor hidden class to body
    document.body.classList.add('shelf-cursor-hidden');

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.body.classList.remove('shelf-cursor-hidden');
    };
  }, [handleMouseMove]);

  return (
    <>
      <GridTrail visible={cursorVisible} />
      <div
        className="shelf-cursor"
        style={{ 
          transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)`,
          opacity: cursorVisible ? 1 : 0 
        }}
      >
        <svg width="32" height="36" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 4 L20 12 C22 13 22 15 20 16 L13 18 L10 24 C9 26 7 26 6 24 Z"
            fill="#111"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </>
  );
}
