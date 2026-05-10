import { useEffect, useRef } from "react";

export default function GlobalMouseEffect() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cursorRef.current) {
        // High performance direct DOM manipulation
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        cursorRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '1';
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.body.classList.add('shelf-cursor-hidden');

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.body.classList.remove('shelf-cursor-hidden');
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="shelf-cursor"
      style={{ 
        opacity: 0,
        willChange: 'transform',
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999
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
  );
}
