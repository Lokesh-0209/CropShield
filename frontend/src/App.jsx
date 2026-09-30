import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import FarmerSubmissionPage from './pages/FarmerSubmissionPage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import OutbreakIntelligencePage from './pages/OutbreakIntelligencePage';
import AlertsPage from './pages/AlertsPage';
import RiskSimulatorPage from './pages/RiskSimulatorPage';
import { NotFoundPage } from './components/common/NotFoundPage';
import { Toast } from './components/common/Toast';
import { getCases, getAlerts, CaseStatus, IS_MOCK } from './services/api';
import { API_BASE_URL } from './api/client';
import './App.css';

const VALID_TABS = ['farmer', 'officer', 'outbreaks', 'alerts', 'risk-sim'];

function App() {
  const [activeTab, setActiveTab] = useState('farmer');
  const [highlightCaseId, setHighlightCaseId] = useState(null);
  const [needsVerificationCount, setNeedsVerificationCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.id === toast?.id ? null : prev));
    }, 4500);
  };

  // Fetch summary counts for navigation badges
  const fetchBadgeCounts = useCallback(async () => {
    try {
      const [casesRes, alertsRes] = await Promise.allSettled([
        getCases({ limit: 100 }),
        getAlerts({ eps_km: 2.0, min_samples: 3 }),
      ]);

      if (casesRes.status === 'fulfilled') {
        const items = casesRes.value?.items || [];
        const pendingCount = items.filter(
          (c) =>
            c.status === CaseStatus.NEEDS_VERIFICATION ||
            c.status === CaseStatus.ANALYZED
        ).length;
        setNeedsVerificationCount(pendingCount);
      }

      if (alertsRes.status === 'fulfilled') {
        const count = alertsRes.value?.alerts?.length || 0;
        setAlertsCount(count);
      }
    } catch {
      // Non-blocking for UI navigation
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 25000);
    return () => clearInterval(interval);
  }, [fetchBadgeCounts]);

  const handleCaseCreated = (caseItem) => {
    setHighlightCaseId(caseItem.id);
    fetchBadgeCounts();
    showToast(
      `Case submitted: ${caseItem.disease || 'Analyzed'} (${caseItem.risk_level || 'Low'} Risk)`,
      'success'
    );
  };

  const handleNavigateToOfficer = (caseItem) => {
    if (caseItem) {
      setHighlightCaseId(caseItem.id);
    }
    setActiveTab('officer');
  };

  const handleNavigateToOutbreaks = () => {
    setActiveTab('outbreaks');
  };

  const isKnownTab = VALID_TABS.includes(activeTab);

  return (
    <div className="cropshield-app">
      {/* Clean Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        needsVerificationCount={needsVerificationCount}
        alertsCount={alertsCount}
        onBackendStatusChange={(online) => {
          setIsBackendOnline(online);
          if (online) fetchBadgeCounts();
        }}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {activeTab === 'farmer' && (
          <FarmerSubmissionPage
            onCaseCreated={handleCaseCreated}
            onNavigateToOfficer={handleNavigateToOfficer}
          />
        )}

        {activeTab === 'officer' && (
          <OfficerDashboardPage highlightCaseId={highlightCaseId} />
        )}

        {activeTab === 'outbreaks' && <OutbreakIntelligencePage />}

        {activeTab === 'alerts' && (
          <AlertsPage onNavigateToOutbreaks={handleNavigateToOutbreaks} />
        )}

        {activeTab === 'risk-sim' && <RiskSimulatorPage />}

        {!isKnownTab && (
          <NotFoundPage onNavigateHome={(tab) => setActiveTab(tab || 'farmer')} />
        )}
      </main>

      {/* Accessible Toast Notification Feedback */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Clean Light Footer - Dev details only visible in DEV */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <strong>CropShield</strong> &mdash; Agricultural Disease Surveillance & Outbreak Intelligence
          </div>
          {import.meta.env.DEV && (
            <div className="footer-meta">
              <span>
                API: <code>{API_BASE_URL}</code> ({IS_MOCK ? 'Mock Active' : isBackendOnline ? 'Online' : 'Offline'})
              </span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
