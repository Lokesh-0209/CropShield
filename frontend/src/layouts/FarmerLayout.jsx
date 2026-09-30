import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, ClipboardList, Bell, Globe, LogOut, Shield, Check, CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { OfflineIndicator } from '../components/common/OfflineIndicator';
import { useAlerts } from '../services/queries';
import { getQueuedReports } from '../services/offlineQueue';
import { setLanguage } from '../i18n/config';

export default function FarmerLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: alertsData } = useAlerts();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  const alertsCount = alertsData?.alerts?.length || 0;
  const currentLang = i18n.language || 'en';

  useEffect(() => {
    const updateOfflineCount = async () => {
      const queued = await getQueuedReports();
      setOfflineCount(queued.length);
    };

    updateOfflineCount();

    const handleQueueChange = () => updateOfflineCount();
    window.addEventListener('cropshield:offline-queue-changed', handleQueueChange);
    window.addEventListener('cropshield:sync-complete', handleQueueChange);

    return () => {
      window.removeEventListener('cropshield:offline-queue-changed', handleQueueChange);
      window.removeEventListener('cropshield:sync-complete', handleQueueChange);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSelectLang = (code) => {
    setLanguage(code);
    setShowLangMenu(false);
  };

  return (
    <div className="farmer-layout">
      {/* Slim Mobile-First Top Bar */}
      <header className="farmer-topbar">
        <div className="farmer-brand">
          <div className="brand-icon-wrap" style={{ width: '32px', height: '32px' }} aria-hidden="true">
            <Shield size={17} />
          </div>
          <div>
            <div className="farmer-brand-title">{t('common.appName', 'CropShield Kisan')}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user?.name || 'Farmer'} &bull; {user?.district || 'Kolar'}
            </div>
          </div>
        </div>

        <div className="farmer-top-actions">
          {/* Calm Offline Pill */}
          <OfflineIndicator />

          {/* Pending Offline Sync Badge */}
          {offlineCount > 0 && (
            <div
              className="farmer-offline-sync-badge"
              title={`${offlineCount} report(s) waiting to sync`}
              aria-label={`${offlineCount} report(s) waiting to sync`}
            >
              <CloudOff size={12} />
              <span>{offlineCount}</span>
            </div>
          )}

          {/* Working Language Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="farmer-lang-btn"
              title="Language selector (English, ಕನ್ನಡ, हिन्दी, తెలుగు)"
              aria-label="Language selector"
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-expanded={showLangMenu}
            >
              <Globe size={14} aria-hidden="true" />
              <span>
                {currentLang === 'kn'
                  ? 'ಕನ್ನಡ'
                  : currentLang === 'hi'
                  ? 'हिन्दी'
                  : currentLang === 'te'
                  ? 'తెలుగు'
                  : 'English'}
              </span>
            </button>

            {showLangMenu && (
              <div className="farmer-lang-dropdown">
                {[
                  { code: 'en', label: 'English (EN)' },
                  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
                  { code: 'hi', label: 'हिन्दी (Hindi)' },
                  { code: 'te', label: 'తెలుగు (Telugu)' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={`farmer-lang-option ${currentLang === item.code ? 'is-active' : ''}`}
                    onClick={() => handleSelectLang(item.code)}
                  >
                    <span>{item.label}</span>
                    {currentLang === item.code && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout Action */}
          <button
            type="button"
            className="farmer-logout-btn"
            onClick={handleLogout}
            title="Sign out of CropShield"
            aria-label="Log out"
          >
            <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <main style={{ flex: 1, padding: '16px 12px 16px' }}>
        <Outlet />
        <footer style={{ textAlign: 'center', padding: '28px 8px 16px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          CropShield: Agricultural Disease Surveillance &amp; Outbreak Intelligence
        </footer>
      </main>

      {/* Fixed Bottom Tab Bar - strictly >= 48px touch targets */}
      <nav className="farmer-bottom-nav" aria-label="Farmer Navigation">
        <NavLink
          to="/farmer/home"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <Home size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>{t('nav.home', 'Home')}</span>
        </NavLink>

        <NavLink
          to="/farmer/report"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>{t('nav.report', 'Report')}</span>
        </NavLink>

        <NavLink
          to="/farmer/reports"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>{t('nav.myReports', 'My Reports')}</span>
          {offlineCount > 0 && (
            <span className="farmer-tab-badge" style={{ background: '#f59e0b' }} aria-label={`${offlineCount} offline reports`}>
              {offlineCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/farmer/alerts"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <Bell size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>{t('nav.alerts', 'Alerts')}</span>
          {alertsCount > 0 && (
            <span className="farmer-tab-badge" aria-label={`${alertsCount} active alerts`}>
              {alertsCount}
            </span>
          )}
        </NavLink>
      </nav>
    </div>
  );
}
