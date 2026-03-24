import { useEffect, useRef } from "react";

/* ─── Particle canvas (scattered blue dots) ─── */
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // generate particles once
    const TOTAL = 260;
    const particles = Array.from({ length: TOTAL }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.2 + 0.5,
      dx: (Math.random() - 0.5) * 0.18,
      dy: (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.55 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60, 80, 160, ${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/* ─── Main landing page ─── */
export default function ShelfLanding() {


  return (
    <>
      {/* Google font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          height: 100%;
          overflow: hidden;
          background: #f9f9f6;
        }

        .shelf-root {
          font-family: 'DM Sans', sans-serif;
          height: 100vh;
          background: #f9f9f6;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* ── Nav ── */
        .shelf-nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 48px;
        }
        .shelf-nav-logo {
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 1.1rem;
          letter-spacing: 0.12em;
          color: #111;
          text-transform: uppercase;
        }
        .shelf-nav-links {
          display: flex;
          gap: 36px;
          list-style: none;
        }
        .shelf-nav-links a {
          color: #333;
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 400;
          transition: color 0.2s;
        }
        .shelf-nav-links a:hover { color: #000; }
        .shelf-nav-cta {
          background: #111;
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s, transform 0.15s;
        }
        .shelf-nav-cta:hover { background: #222; transform: translateY(-1px); }

        /* ── Hero ── */
        .shelf-hero {
          position: relative;
          z-index: 5;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 24px 40px;
        }
        .shelf-eyebrow {
          font-size: 0.78rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .shelf-eyebrow::before {
          content: '';
          display: inline-block;
          width: 14px;
          height: 1px;
          background: #555;
        }
        .shelf-headline {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(2.6rem, 6vw, 5rem);
          font-weight: 600;
          line-height: 1.08;
          color: #111;
          max-width: 740px;
          letter-spacing: -0.02em;
          margin-bottom: 44px;
        }
        .shelf-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 0;
        }
        .btn-primary {
          background: #111;
          color: #fff;
          border: none;
          padding: 16px 32px;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .btn-primary:hover {
          background: #222;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .btn-secondary {
          background: #ebebea;
          color: #444;
          border: none;
          padding: 16px 32px;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
          font-weight: 400;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .btn-secondary:hover { background: #e0e0de; transform: translateY(-2px); }

        /* ── Fade-in animation ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-1 { animation: fadeUp 0.7s ease both 0.1s; }
        .fade-2 { animation: fadeUp 0.7s ease both 0.25s; }
        .fade-3 { animation: fadeUp 0.7s ease both 0.4s; }
        .fade-4 { animation: fadeUp 0.7s ease both 0.55s; }

        @media (max-width: 640px) {
          .shelf-nav { padding: 18px 20px; }
          .shelf-nav-links { display: none; }
          .shelf-hero { padding: 60px 16px 40px; }
        }
      `}</style>

      <div className="shelf-root">
        <ParticleCanvas />

        {/* Nav */}
        <nav className="shelf-nav fade-1">
          <span className="shelf-nav-logo">Shelf</span>
          <ul className="shelf-nav-links">
            <li><a href="#">Browse</a></li>
            <li><a href="#">My Library</a></li>
            <li><a href="#">About</a></li>
          </ul>
          <button className="shelf-nav-cta">
            Download ↓
          </button>
        </nav>

        {/* Hero */}
        <section className="shelf-hero">
          <p className="shelf-eyebrow fade-1">Shelf</p>
          <h1 className="shelf-headline fade-2">
            Explore Unlimited Stories in One Digital Library
          </h1>
          <div className="shelf-actions fade-3">
            <button className="btn-primary">Get Back To You</button>
            <button className="btn-secondary">First Time? Let's Get Started</button>
          </div>

        </section>
      </div>
    </>
  );
}