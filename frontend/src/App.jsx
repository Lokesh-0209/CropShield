import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RouteLoadingFallback from './components/common/RouteLoadingFallback';

// Code-split Layouts
const FarmerLayout = lazy(() => import('./layouts/FarmerLayout'));
const OfficerLayout = lazy(() => import('./layouts/OfficerLayout'));

// Code-split Public Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Code-split Farmer Pages (Mobile-first bundle)
const FarmerHomePage = lazy(() => import('./pages/farmer/FarmerHomePage'));
const FarmerReportsPage = lazy(() => import('./pages/farmer/FarmerReportsPage'));
const FarmerReportDetailPage = lazy(() => import('./pages/farmer/FarmerReportDetailPage'));
const FarmerAlertsPage = lazy(() => import('./pages/farmer/FarmerAlertsPage'));
const FarmerSubmissionPage = lazy(() => import('./pages/FarmerSubmissionPage'));

// Code-split Officer Pages (Desktop-first surveillance bundle)
const OfficerDashboardSummaryPage = lazy(() => import('./pages/officer/OfficerDashboardSummaryPage'));
const OfficerDashboardPage = lazy(() => import('./pages/OfficerDashboardPage'));
const OfficerCaseReviewPage = lazy(() => import('./pages/officer/OfficerCaseReviewPage'));
const OutbreakIntelligencePage = lazy(() => import('./pages/OutbreakIntelligencePage'));
const OfficerInspectNextPage = lazy(() => import('./pages/officer/OfficerInspectNextPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const RiskSimulatorPage = lazy(() => import('./pages/RiskSimulatorPage'));

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
    <Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="cropshield-app">
            <AppRoutes />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
