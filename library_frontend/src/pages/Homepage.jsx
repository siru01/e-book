import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./HomePage.css";

// Typing effect hook — mirrors Reflex start_typing background event
function useTypingEffect() {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [showButtons, setShowButtons] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const L1 = "Explore Unlimited Stories ";
    const L2 = "in One Digital Library";
    const total = L1.length + L2.length;
    const triggerAt = Math.floor(total * 0.7);
    let count = 0;
    let cancelled = false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      for (const ch of L1) {
        if (cancelled) return;
        await sleep(50);
        setLine1((p) => p + ch);
        count++;
        if (count === triggerAt) setShowButtons(true);
      }
      for (const ch of L2) {
        if (cancelled) return;
        await sleep(50);
        setLine2((p) => p + ch);
        count++;
        if (count === triggerAt) setShowButtons(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { line1, line2, showButtons };
}

export default function HomePage() {
  const { login, token, userRole } = useAuth();
  const navigate = useNavigate();
  const { line1, line2, showButtons } = useTypingEffect();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (token) {
      navigate(["ADMIN", "LIBRARIAN"].includes(userRole) ? "/admin-dashboard" : "/dashboard");
    }
  }, [token, userRole, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password.trim()) { setError("Password is required"); return; }

    setLoading(true);
    try {
      const role = await login(email, password);
      navigate(["ADMIN", "LIBRARIAN"].includes(role) ? "/admin-dashboard" : "/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hp-root">
      <div className="hp-bg">
        <div className="hp-glow hp-glow-1" />
        <div className="hp-glow hp-glow-2" />
        <div className="hp-grain" />
      </div>

      <main className="hp-main">
        {/* Hero text */}
        <div className="hp-hero">
          <div className="hp-brand">
            <span className="hp-brand-hex">⬡</span>
            <span className="hp-brand-name">SHELF</span>
          </div>
          <h1 className="hp-headline">
            <span className="hp-line1">{line1}<span className="hp-cursor" /></span>
            <span className="hp-line2">{line2}</span>
          </h1>
          <p className="hp-sub">Your personal digital library, powered by Project Gutenberg.</p>
        </div>

        {/* Login card */}
        <div className={`hp-card ${showButtons ? "hp-card-visible" : ""}`}>
          <h2 className="hp-card-title">Sign in</h2>

          <form className="hp-form" onSubmit={handleLogin}>
            <div className="hp-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="hp-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="hp-error">{error}</p>}

            <button className="hp-btn" type="submit" disabled={loading}>
              {loading ? <span className="hp-spinner" /> : "Enter the library →"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}