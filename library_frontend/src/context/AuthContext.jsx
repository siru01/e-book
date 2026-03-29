import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

const AuthContext = createContext(null);

// ── Config ─────────────────────────────────────────────────────
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in ms

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
    inactivityTimer.current = setTimeout(() => {
      logout(); // auto-logout after INACTIVITY_LIMIT of no activity
    }, INACTIVITY_LIMIT);
  }, [logout]);

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
  }, [token, resetInactivityTimer]);

  // ── Login ────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const response = await fetch("http://127.0.0.1:8000/api/token/", {
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

    // Persist to sessionStorage (NOT localStorage)
    sessionStorage.setItem(KEYS.token,    access);
    sessionStorage.setItem(KEYS.username, name);
    sessionStorage.setItem(KEYS.role,     role);
    if (data.refresh) sessionStorage.setItem(KEYS.refresh, data.refresh);

    return role;
  }, []);

  // ── Sign Up ────────────────────────────────────────────────────
  const signup = useCallback(async (username, email, password) => {
    const response = await fetch("http://127.0.0.1:8000/api/register/", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.detail || `Error ${response.status}`);
    }

    const data = await response.json();
    
    // After successful signup, automatically log the user in
    // You can either:
    // Option 1: Call login function with email and password
    const role = await login(email, password);
    return { role, user: data.user };
    
    // Option 2: If your backend returns token directly on signup
    // const access = data.access || "";
    // let role = "STUDENT";
    // let name = username;
    // 
    // try {
    //   const payload = JSON.parse(atob(access.split(".")[1]));
    //   role = payload.role || "STUDENT";
    //   name = payload.full_name || username;
    // } catch (_) {}
    // 
    // setToken(access);
    // setUsername(name);
    // setUserRole(role);
    // 
    // sessionStorage.setItem(KEYS.token, access);
    // sessionStorage.setItem(KEYS.username, name);
    // sessionStorage.setItem(KEYS.role, role);
    // if (data.refresh) sessionStorage.setItem(KEYS.refresh, data.refresh);
    // 
    // return role;
  }, [login]);

  return (
    <AuthContext.Provider value={{ token, username, userRole, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}