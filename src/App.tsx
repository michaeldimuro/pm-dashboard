import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { MainLayout } from './components/Layout';
import { LoginPage } from './pages/Auth';
import { DashboardPage } from './pages/Dashboard';
import { KanbanBoard, DoneTasksPage } from './pages/Kanban';
import { CalendarPage } from './pages/Calendar';
import { NotesPage } from './pages/Notes';
import { LeadsPage } from './pages/Leads';
import { WebhooksPage } from './pages/Webhooks';
import { SettingsPage } from './pages/Settings';

// Maximum time to wait for auth loading before showing content
const MAX_LOADING_TIME_MS = 10000;

function LoadingScreen({ message = 'Loading Mission Control...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <span className="text-gray-400 text-sm">{message}</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, user, loading, checkSession } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Prevent infinite loading with a timeout
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('[ProtectedRoute] Loading timeout reached');
        setLoadingTimedOut(true);
      }, MAX_LOADING_TIME_MS);
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimedOut(false);
    }
  }, [loading]);

  // Check session validity on route changes
  const verifySession = useCallback(async () => {
    if (session && !loading) {
      setIsChecking(true);
      try {
        const isValid = await checkSession();
        if (!isValid) {
          console.log('[ProtectedRoute] Session invalid, will redirect to login');
        }
      } finally {
        setIsChecking(false);
      }
    }
  }, [session, loading, checkSession]);

  // Verify session on mount and route changes
  useEffect(() => {
    verifySession();
  }, [location.pathname]); // Re-check when route changes

  // Still loading initial auth state
  if (loading && !loadingTimedOut) {
    return <LoadingScreen />;
  }

  // Loading timed out - redirect to login to avoid infinite loading
  if (loadingTimedOut) {
    console.log('[ProtectedRoute] Loading timed out, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // No session means not authenticated
  if (!session) {
    console.log('[ProtectedRoute] No session, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Session exists but user profile not loaded yet - show brief loading
  // This handles the case where session is valid but profile fetch is slow
  if (!user && isChecking) {
    return <LoadingScreen message="Verifying credentials..." />;
  }

  // No user profile but have session - still allow access
  // (user profile might fail to load but auth is still valid)
  if (!user && !isChecking) {
    console.log('[ProtectedRoute] Session valid but no user profile - allowing access');
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Prevent infinite loading with a timeout
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('[PublicRoute] Loading timeout reached');
        setLoadingTimedOut(true);
      }, MAX_LOADING_TIME_MS);
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimedOut(false);
    }
  }, [loading]);

  // Still loading - show loading screen
  if (loading && !loadingTimedOut) {
    return <LoadingScreen />;
  }

  // If loading timed out, show the public route (login page)
  // This prevents infinite loading on the login page
  if (loadingTimedOut) {
    console.log('[PublicRoute] Loading timed out, showing login page');
    return <>{children}</>;
  }

  // Already authenticated - redirect to dashboard
  if (session) {
    console.log('[PublicRoute] Session exists, redirecting to dashboard');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes - Login only (no signup) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <BusinessProvider>
              <MainLayout />
            </BusinessProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/kanban/done" element={<DoneTasksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
