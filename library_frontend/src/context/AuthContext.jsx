import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("shelf_token") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("shelf_username") || "User");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("shelf_role") || "");

  const login = useCallback(async (email, password) => {
    const response = await fetch("http://127.0.0.1:8000/api/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${response.status}`);
    }
    const data = await response.json();
    const access = data.access || "";
    let role = "STUDENT";
    let name = email;
    try {
      const payload = JSON.parse(atob(access.split(".")[1]));
      role = payload.role || "STUDENT";
      name = payload.full_name || payload.email || email;
    } catch (_) {}
    setToken(access);
    setUsername(name);
    setUserRole(role);
    localStorage.setItem("shelf_token", access);
    localStorage.setItem("shelf_username", name);
    localStorage.setItem("shelf_role", role);
    if (data.refresh) localStorage.setItem("shelf_refresh", data.refresh);
    return role;
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUsername("User");
    setUserRole("");
    localStorage.removeItem("shelf_token");
    localStorage.removeItem("shelf_username");
    localStorage.removeItem("shelf_role");
    localStorage.removeItem("shelf_refresh");
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}