import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";

const AuthContext = createContext(null);

// ── Config ─────────────────────────────────────────────────────
const DEFAULT_LIMIT = 5  * 60 * 1000; // 5 minutes
const READER_LIMIT  = 20 * 60 * 1000; // 20 minutes

// ── Storage keys ───────────────────────────────────────────────
// Using sessionStorage instead of localStorage so everything is
// automatically wiped when the browser tab / window is closed.
const KEYS = {
  token   : "shelf_token",
  username: "shelf_username",
  role    : "shelf_role",
  refresh : "shelf_refresh",
};

// ── Wipe all auth data ─────────────────────────────────────────
function clearStorage() {
  Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k));
}

// ── Validate stored token ONCE, return all three auth values ───
function loadAuthState() {
  const token = sessionStorage.getItem(KEYS.token);
  if (!token) return { token: "", username: "User", userRole: "" };

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now     = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp < now) {
      clearStorage();
      return { token: "", username: "User", userRole: "" };
    }

    return {
      token,
      username: sessionStorage.getItem(KEYS.username) || "User",
      userRole: sessionStorage.getItem(KEYS.role)     || "",
    };
  } catch (_) {
    clearStorage();
    return { token: "", username: "User", userRole: "" };
  }
}

// ── Initialise once at module level ────────────────────────────
const initialAuth = loadAuthState();

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(initialAuth.token);
  const [username, setUsername] = useState(initialAuth.username);
  const [userRole, setUserRole] = useState(initialAuth.userRole);
  const location = useLocation();

  // ── Inactivity timer ref ─────────────────────────────────────
  const inactivityTimer = useRef(null);

  // ── Logout ───────────────────────────────────────────────────
  const logout = useCallback(() => {
    setToken("");
    setUsername("User");
    setUserRole("");
    clearStorage();
    // Clear the inactivity timer on logout
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, []);

  // ── Reset inactivity timer on any user activity ──────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    
    // Dynamic limit: 20m for Reader, 5m for others
    const limit = location.pathname.startsWith("/read/") ? READER_LIMIT : DEFAULT_LIMIT;

    inactivityTimer.current = setTimeout(() => {
      logout(); // auto-logout after limit of no activity
    }, limit);
  }, [logout, location.pathname]);

  // ── Attach / detach activity listeners whenever token changes ─
  useEffect(() => {
    // No token = user is not logged in, no timer needed
    if (!token) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }

    // Events that count as "activity"
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer(); // start the timer immediately on login

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [token, resetInactivityTimer, location.pathname]);

  // ── Login ────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const response = await fetch("/api/token/", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${response.status}`);
    }

    const data   = await response.json();
    const access = data.access || "";
    let role = "STUDENT";
    let name = email;

    try {
      const payload = JSON.parse(atob(access.split(".")[1]));
      role = payload.role                          || "STUDENT";
      name = payload.full_name || payload.email    || email;
    } catch (_) {}

    // Update state
    setToken(access);
    setUsername(name);
    setUserRole(role);

    // Persist to sessionStorage
    sessionStorage.setItem(KEYS.token,    access);
    sessionStorage.setItem(KEYS.username, name);
    sessionStorage.setItem(KEYS.role,     role);
    if (data.refresh) sessionStorage.setItem(KEYS.refresh, data.refresh);

    return role;
  }, []);

  // ── Send OTP ──
  const sendOtp = useCallback(async (email) => {
    const response = await fetch("/api/send-otp/", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ email }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.detail || `Error ${response.status}`);
    }

    return true;
  }, []);

  // ── Sign Up ──
  const signup = useCallback(async (username, email, password, otp) => {
    const response = await fetch("/api/register/", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ 
        full_name: username,  // Map to Django's field
        email: email, 
        password: password,
        phone: "",
        otp: otp,
        role: "STUDENT"
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Handle different error formats
      if (err.email) throw new Error(err.email[0]);
      if (err.full_name) throw new Error(err.full_name[0]);
      if (err.password) throw new Error(err.password[0]);
      throw new Error(err.message || err.detail || `Error ${response.status}`);
    }

    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, userRole, login, signup, logout, sendOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}