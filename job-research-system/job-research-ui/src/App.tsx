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
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />

          {/* Redirect all other routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
