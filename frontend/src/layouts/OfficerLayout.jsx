import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  MapPin,
  Compass,
  Bell,
  SlidersHorizontal,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OfflineIndicator } from '../components/common/OfflineIndicator';
import { useAlerts, useCases } from '../services/queries';
import { CaseStatus } from '../services/api';

export default function OfficerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: alertsData } = useAlerts();
  const { data: casesData } = useCases({ limit: 100 });

  const [readAlertIds, setReadAlertIds] = useState(() => {
    try {
      const saved = localStorage.getItem('cropshield_read_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen for read updates from AlertsPage
  useEffect(() => {
    const handleAlertsRead = () => {
      try {
        const saved = localStorage.getItem('cropshield_read_alerts');
        setReadAlertIds(saved ? JSON.parse(saved) : []);
      } catch {}
    };

    window.addEventListener('cropshield_alerts_read', handleAlertsRead);
    return () => window.removeEventListener('cropshield_alerts_read', handleAlertsRead);
  }, []);

  const allAlerts = alertsData?.alerts || [];
  const unreadAlerts = allAlerts.filter(
    (a) => !readAlertIds.includes(a.warning_id || String(a.cluster_id))
  );
  const unreadCount = unreadAlerts.length;

  const pendingCasesCount = (casesData?.items || []).filter(
    (c) => c.status === CaseStatus.NEEDS_VERIFICATION || c.status === CaseStatus.ANALYZED
  ).length;

  const navLinks = [
    {
      to: '/officer/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/officer/queue',
      label: 'Queue',
      icon: ClipboardList,
      badge: pendingCasesCount > 0 ? pendingCasesCount : null,
      badgeVariant: 'warning',
    },
    {
      to: '/officer/outbreaks',
      label: 'Outbreak Map',
      icon: MapPin,
      badge: null,
    },
    {
      to: '/officer/inspect',
      label: 'Inspect Next',
      icon: Compass,
      badge: null,
    },
    {
      to: '/officer/alerts',
      label: 'Alerts',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeVariant: 'danger',
    },
    {
      to: '/officer/risk-sim',
      label: 'Risk Simulator',
      icon: SlidersHorizontal,
      badge: null,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="officer-layout">
      {/* Desktop-first Top Navigation Bar */}
      <header className="officer-topbar">
        <div className="officer-topbar-inner">
          {/* Brand & Calm Offline Indicator */}
          <div className="officer-brand-group">
            <Link to="/officer/dashboard" className="navbar-brand" style={{ cursor: 'pointer' }}>
              <div className="brand-icon-wrap" aria-hidden="true">
                <Shield size={20} />
              </div>
              <div>
                <span className="brand-name">CropShield</span>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, marginLeft: '6px' }}>
                  HQ
                </span>
              </div>
            </Link>

            <OfflineIndicator />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="officer-nav-links" aria-label="Officer Navigation">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `officer-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className={`nav-badge badge-${item.badgeVariant || 'neutral'}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Officer Verification Badge & Profile */}
          <div className="officer-profile-menu">
            {/* Verified Officer Badge */}
            <div
              className="officer-badge-pill"
              title={`Agricultural Officer: ${user?.name || 'Dr. Suresh Patil'} (${user?.district || 'Karnataka'})`}
            >
              <ShieldCheck size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
              <span>
                <strong>{user?.name || 'Verified Officer'}</strong> &bull; {user?.district || 'Kolar'}
              </span>
            </div>

            {/* Notification Bell with Unread Dot */}
            <Link
              to="/officer/alerts"
              className="btn btn-secondary btn-xs"
              style={{ position: 'relative', padding: '6px 8px' }}
              title={unreadCount > 0 ? `${unreadCount} unread advisories` : 'View outbreak advisories'}
              aria-label={`Alerts (${unreadCount} unread)`}
            >
              <Bell size={15} aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    width: '8px',
                    height: '8px',
                    background: 'var(--severity-high)',
                    borderRadius: '50%',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.4)',
                  }}
                  title={`${unreadCount} unread advisories`}
                />
              )}
            </Link>

            {/* Sign Out */}
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={handleLogout}
              title="Sign out of Officer Portal"
            >
              <LogOut size={13} className="icon-mr" aria-hidden="true" />
              Sign Out
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation for < 1024px */}
        {mobileMenuOpen && (
          <div className="mobile-drawer animate-fade-in">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex-center gap-2">
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`nav-badge badge-${item.badgeVariant || 'neutral'}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* Officer Footer: Simple product line only */}
      <footer className="app-footer">
        <div className="footer-container" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div className="footer-brand" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            CropShield: Agricultural Disease Surveillance &amp; Outbreak Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
}
