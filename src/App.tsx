import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, authError } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Show auth error with option to retry
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">Authentication Error</h2>
          <p className="text-gray-400">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Refresh Page
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, authError } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // If there's an auth error on public route, just show the login page
  if (authError) {
    return <>{children}</>;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

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
