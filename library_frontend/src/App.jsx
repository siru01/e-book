import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/Authcontext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage           from "./pages/HomePage";
import DashboardPage      from "./pages/Dashboardpage";

import ReaderPage         from "./pages/Readerpage";
import Login              from "./pages/Login";
import SignUp             from "./pages/SignUp";
import BookOverviewPage   from "./pages/BookOverviewPage";
import "./App.css";
import ForgotPasswordPage from './pages/Forgotpasswordpage';
import GlobalMouseEffect from "./components/GlobalMouseEffect";



// ── React Query client ────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           5  * 60 * 1000,
      gcTime:              10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry:               1,
    },
  },
});

// ── Helpers ───────────────────────────────────────────────────────
const isAdmin  = (role) => ["ADMIN", "LIBRARIAN"].includes(role);
const adminHome = "/dashboard";
const userHome  = "/dashboard";

// ── Protected route ───────────────────────────────────────────────
function ProtectedRoute({ children, adminOnly = false }) {
  const { token, userRole } = useAuth();
  if (!token)                          return <Navigate to="/login"   replace />;
  if (adminOnly && !isAdmin(userRole)) return <Navigate to={userHome} replace />;
  return children;
}

// ── Public route ──────────────────────────────────────────────────
function PublicRoute({ children }) {
  const { token, userRole } = useAuth();
  if (token) return <Navigate to={isAdmin(userRole) ? adminHome : userHome} replace />;
  return children;
}

// ── Routes ────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes - accessible without login */}
      <Route path="/"      element={<PublicRoute><HomePage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} /> 
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Routes - require login */}
      <Route path="/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      <Route path="/read/:bookId"       element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />

      {/* Public but requires no auth protection */}

      <Route path="/book/:bookId" element={<BookOverviewPage />} />
      {/* Catch all - redirect to home */}
      <Route path="*"         element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Root App ──────────────────────────────────────────────────────
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