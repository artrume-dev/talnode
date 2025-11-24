/**
 * App Component
 *
 * Main application router with authentication
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainApp } from './components/MainApp';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CVUploader } from './components/CVUploader';
import { useUserStore } from './store/userStore';
import { Dashboard } from './pages/Dashboard';
import { DashboardOverview } from './pages/DashboardOverview';
import { CVManagement } from './pages/CVManagement';
import { OptimizationsView } from './pages/OptimizationsView';
import { ApplicationsView } from './pages/ApplicationsView';

function OnboardingPage() {
  const { setOnboarded } = useUserStore();

  return (
    <div className="h-screen bg-gray-50">
      <OnboardingWizard
        onComplete={() => {
          setOnboarded(true);
          window.location.href = '/';
        }}
      />
      {/* Include CVUploader modal for onboarding */}
      <CVUploader />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="cvs" element={<CVManagement />} />
            <Route path="optimizations" element={<OptimizationsView />} />
            <Route path="applications" element={<ApplicationsView />} />
            <Route path="analytics" element={<div className="p-6">Analytics Page - Coming Soon</div>} />
          </Route>

          {/* Job Search (MainApp) */}
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />

          {/* Default redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
