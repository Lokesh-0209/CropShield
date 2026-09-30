import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import DemoFlowStepper from './components/DemoFlowStepper';
import FarmerSubmissionPage from './pages/FarmerSubmissionPage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import OutbreakIntelligencePage from './pages/OutbreakIntelligencePage';
import AlertsPage from './pages/AlertsPage';
import RiskSimulatorPage from './pages/RiskSimulatorPage';
import { listCases } from './api/cases';
import { listAlerts } from './api/alerts';
import { CaseStatus } from './types/enums';
import { API_BASE_URL } from './api/client';
import './App.css';

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
        listCases({ limit: 100 }),
        listAlerts({ eps_km: 2.0, min_samples: 3 }),
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
      // Non-blocking for UI
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 15000);
    return () => clearInterval(interval);
  }, [fetchBadgeCounts]);

  const handleCaseCreated = (caseItem) => {
    setHighlightCaseId(caseItem.id);
    fetchBadgeCounts();
    showToast(
      `Case #${caseItem.id.substring(0, 8)} created & analyzed: ${caseItem.disease || 'Analyzed'} (${caseItem.risk_level} Risk)`,
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

  return (
    <div className="cropshield-app">
      {/* Top Navigation */}
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

      {/* Interactive Hackathon Demo Stepper */}
      <DemoFlowStepper
        currentTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="app-main-content">
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
      </main>

      {/* Toast Feedback */}
      {toast && (
        <div className={`toast toast-${toast.type} animate-slide-up`} role="alert">
          <div className="toast-text">{toast.message}</div>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Dismiss alert"
          >
            &times;
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <strong>CropShield</strong> &bull; Autonomous Crop Disease Surveillance & Outbreak Detection
          </div>
          <div className="footer-right">
            <span>
              Connected API Target: <code>{API_BASE_URL}</code> ({isBackendOnline ? 'Online' : 'Offline'})
            </span>
            <span className="footer-dot">&bull;</span>
            <span>Vite + React 19 Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
