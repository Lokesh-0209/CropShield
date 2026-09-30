import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import FarmerLayout from './layouts/FarmerLayout';
import OfficerLayout from './layouts/OfficerLayout';

// Pages
import LoginPage from './pages/LoginPage';
import FarmerHomePage from './pages/farmer/FarmerHomePage';
import FarmerReportsPage from './pages/farmer/FarmerReportsPage';
import FarmerReportDetailPage from './pages/farmer/FarmerReportDetailPage';
import FarmerAlertsPage from './pages/farmer/FarmerAlertsPage';
import FarmerSubmissionPage from './pages/FarmerSubmissionPage';

import OfficerDashboardSummaryPage from './pages/officer/OfficerDashboardSummaryPage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import OfficerCaseReviewPage from './pages/officer/OfficerCaseReviewPage';
import OutbreakIntelligencePage from './pages/OutbreakIntelligencePage';
import OfficerInspectNextPage from './pages/officer/OfficerInspectNextPage';
import AlertsPage from './pages/AlertsPage';
import RiskSimulatorPage from './pages/RiskSimulatorPage';

import { NotFoundPage } from './components/common/NotFoundPage';
import './App.css';

/**
 * Root "/" redirect based on user authentication state and role
 */
function RootRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'farmer') {
    return <Navigate to="/farmer/home" replace />;
  }

  return <Navigate to="/officer/dashboard" replace />;
}

/**
 * 404 handler that navigates back to user's role-appropriate home
 */
function RoleAwareNotFound() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user?.role === 'farmer') {
      navigate('/farmer/home');
    } else {
      navigate('/officer/dashboard');
    }
  };

  return <NotFoundPage onNavigateHome={handleReturnHome} />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Farmer Routes: Mobile-first Layout */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute allowedRole="farmer">
            <FarmerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<FarmerHomePage />} />
        <Route path="report" element={<FarmerSubmissionPage />} />
        <Route path="reports" element={<FarmerReportsPage />} />
        <Route path="reports/:id" element={<FarmerReportDetailPage />} />
        <Route path="alerts" element={<FarmerAlertsPage />} />
      </Route>

      {/* Officer Routes: Desktop-first Layout */}
      <Route
        path="/officer"
        element={
          <ProtectedRoute allowedRole="officer">
            <OfficerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OfficerDashboardSummaryPage />} />
        <Route path="queue" element={<OfficerDashboardPage />} />
        <Route path="cases/:id" element={<OfficerCaseReviewPage />} />
        <Route path="outbreaks" element={<OutbreakIntelligencePage />} />
        <Route path="inspect" element={<OfficerInspectNextPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="risk-sim" element={<RiskSimulatorPage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<RoleAwareNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="cropshield-app">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
