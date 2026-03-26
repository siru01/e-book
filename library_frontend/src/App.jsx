import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/Authcontext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage           from "./pages/Homepage";
import DashboardPage      from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DiscoverPage       from "./pages/DiscoverPage";
import ReaderPage         from "./pages/ReaderPage";
import Login              from "./pages/Login";

// ── React Query client ─────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime          : 5  * 60 * 1000,
      cacheTime          : 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry              : 1,
    },
  },
});

// ── Helpers ────────────────────────────────────────────────────
const isAdmin  = (role) => ["ADMIN", "LIBRARIAN"].includes(role);
const adminHome = "/admin-dashboard";
const userHome  = "/dashboard";

// ── Protected route — blocks unauthenticated users ─────────────
function ProtectedRoute({ children, adminOnly = false }) {
  const { token, userRole } = useAuth();
  if (!token)                          return <Navigate to="/login"   replace />;
  if (adminOnly && !isAdmin(userRole)) return <Navigate to={userHome} replace />;
  return children;
}

// ── Public route — blocks already logged-in users ─────────────
// Prevents back-button returning to /login or / after login
function PublicRoute({ children }) {
  const { token, userRole } = useAuth();
  if (token) {
    return <Navigate to={isAdmin(userRole) ? adminHome : userHome} replace />;
  }
  return children;
}

// ── All routes ─────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public — redirect away if already logged in */}
      <Route path="/"      element={<PublicRoute><HomePage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/admin-dashboard"   element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/read/:gutenbergId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />

      {/* Always public */}
      <Route path="/discover" element={<DiscoverPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}