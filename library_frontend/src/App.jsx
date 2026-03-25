import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/Authcontext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage from "./pages/Homepage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DiscoverPage from "./pages/DiscoverPage";
import ReaderPage from "./pages/ReaderPage";
import Login from "./pages/Login";

// ── React Query client ─────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime          : 5  * 60 * 1000, // cache fresh for 5 mins
      cacheTime          : 10 * 60 * 1000, // keep in memory for 10 mins
      refetchOnWindowFocus: false,          // no re-fetch on tab switch
      retry              : 1,
    },
  },
});

// ── Route guard ────────────────────────────────────────────────
function ProtectedRoute({ children, adminOnly = false }) {
  const { token, userRole } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (adminOnly && !["ADMIN", "LIBRARIAN"].includes(userRole))
    return <Navigate to="/dashboard" replace />;
  return children;
}

// ── All routes ─────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route
        path="/read/:gutenbergId"
        element={
          <ProtectedRoute>
            <ReaderPage />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Root App — single export, no duplicates ────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>  {/* ✅ wraps everything */}
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}