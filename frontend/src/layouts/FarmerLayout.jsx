import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, ClipboardList, Bell, Globe, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OfflineIndicator } from '../components/common/OfflineIndicator';
import { useAlerts } from '../services/queries';

export default function FarmerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: alertsData } = useAlerts();

  const alertsCount = alertsData?.alerts?.length || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="farmer-layout">
      {/* Slim Mobile-First Top Bar */}
      <header className="farmer-topbar">
        <div className="farmer-brand">
          <div className="brand-icon-wrap" style={{ width: '30px', height: '30px' }} aria-hidden="true">
            <Shield size={16} />
          </div>
          <div>
            <div className="farmer-brand-title">CropShield Kisan</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user?.name || 'Farmer'} &bull; {user?.district || 'Karnataka'}
            </div>
          </div>
        </div>

        <div className="farmer-top-actions">
          {/* Calm Offline Pill */}
          <OfflineIndicator />

          {/* Language Switcher Placeholder */}
          <button
            type="button"
            className="farmer-lang-btn"
            title="Language selector (English / Kannada)"
            aria-label="Language selector"
            onClick={() => alert('Language selection: English (Active), ಕನ್ನಡ (Coming in next release)')}
          >
            <Globe size={13} aria-hidden="true" />
            <span>ಕನ್ನಡ / EN</span>
          </button>

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
      <main style={{ flex: 1, padding: '16px 12px 24px' }}>
        <Outlet />
      </main>

      {/* Fixed Bottom Tab Bar - strictly >= 48px touch targets */}
      <nav className="farmer-bottom-nav" aria-label="Farmer Navigation">
        <NavLink
          to="/farmer/home"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <Home size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/farmer/report"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>Report</span>
        </NavLink>

        <NavLink
          to="/farmer/reports"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>My Reports</span>
        </NavLink>

        <NavLink
          to="/farmer/alerts"
          className={({ isActive }) => `farmer-tab-item ${isActive ? 'active' : ''}`}
        >
          <Bell size={22} className="farmer-tab-icon" aria-hidden="true" />
          <span>Alerts</span>
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
