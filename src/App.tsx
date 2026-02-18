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
import { SubcontractorsPage } from './pages/Subcontractors';
import { OperationsPage } from './pages/Operations/OperationsPage';

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
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthenticatedRoutes() {
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
        <Route path="/subcontractors" element={<SubcontractorsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Operations Center - Public route (no auth required for visualization) */}
        <Route path="/operations/*" element={<OperationsPage />} />
        
        {/* All other routes require auth */}
        <Route
          path="*"
          element={
            <AuthProvider>
              <AuthenticatedRoutes />
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
