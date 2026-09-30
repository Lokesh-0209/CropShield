import {
  ShieldCheck,
  Sprout,
  Users,
  Radar,
  AlertTriangle,
  Sliders,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import BackendStatusBanner from './BackendStatusBanner';

export default function Navbar({
  activeTab,
  onSelectTab,
  needsVerificationCount = 0,
  alertsCount = 0,
  onBackendStatusChange,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'farmer',
      label: 'Farmer Submission',
      icon: Sprout,
      badge: null,
    },
    {
      id: 'officer',
      label: 'Officer Queue',
      icon: Users,
      badge: needsVerificationCount > 0 ? needsVerificationCount : null,
      badgeVariant: 'warning',
    },
    {
      id: 'outbreaks',
      label: 'Outbreak Intelligence',
      icon: Radar,
      badge: null,
    },
    {
      id: 'alerts',
      label: 'Warning Alerts',
      icon: AlertTriangle,
      badge: alertsCount > 0 ? alertsCount : null,
      badgeVariant: 'danger',
    },
    {
      id: 'risk-sim',
      label: 'Risk Simulator',
      icon: Sliders,
      badge: null,
    },
  ];

  const handleSelect = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="brand-group" onClick={() => handleSelect('farmer')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-glow">
            <ShieldCheck size={26} className="brand-icon" />
          </div>
          <div className="brand-text-col">
            <span className="brand-title">CropShield</span>
            <span className="brand-subtitle">Disease Intelligence & Outbreak Prevention</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                onClick={() => handleSelect(item.id)}
              >
                <Icon size={16} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className={`nav-pill nav-pill-${item.badgeVariant || 'default'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Health status & Mobile Toggle */}
        <div className="nav-right">
          <BackendStatusBanner onStatusChange={onBackendStatusChange} />

          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className={`nav-pill nav-pill-${item.badgeVariant || 'default'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
