import { useState } from 'react';
import {
  Shield,
  PlusCircle,
  ClipboardList,
  MapPin,
  Bell,
  SlidersHorizontal,
  Menu,
  X,
} from 'lucide-react';
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
      label: 'Submit Case',
      icon: PlusCircle,
      badge: null,
    },
    {
      id: 'officer',
      label: 'Cases',
      icon: ClipboardList,
      badge: needsVerificationCount > 0 ? needsVerificationCount : null,
      badgeVariant: 'warning',
    },
    {
      id: 'outbreaks',
      label: 'Outbreaks',
      icon: MapPin,
      badge: null,
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: alertsCount > 0 ? alertsCount : null,
      badgeVariant: 'danger',
    },
    {
      id: 'risk-sim',
      label: 'Risk Simulator',
      icon: SlidersHorizontal,
      badge: null,
    },
  ];

  const handleSelect = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <div className="navbar-brand" onClick={() => handleSelect('farmer')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-wrap">
            <Shield size={20} className="brand-icon" />
          </div>
          <span className="brand-name">CropShield</span>
        </div>

        {/* Clean Desktop Navigation Links */}
        <nav className="navbar-nav" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => handleSelect(item.id)}
              >
                <Icon size={16} className="nav-item-icon" />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className={`nav-badge badge-${item.badgeVariant || 'neutral'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side: Compact Health Status */}
        <div className="navbar-right">
          <BackendStatusBanner onStatusChange={onBackendStatusChange} />

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(item.id)}
              >
                <div className="flex-center gap-2">
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className={`nav-badge badge-${item.badgeVariant || 'neutral'}`}>
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
