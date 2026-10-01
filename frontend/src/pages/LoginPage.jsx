import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Smartphone, Briefcase, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import useDocumentMetadata from '../hooks/useDocumentMetadata';

export default function LoginPage() {
  useDocumentMetadata({
    title: 'Select Role — CropShield',
    description: 'Direct role selection for farmers and agricultural surveillance officers.',
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { selectRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState('farmer');

  const redirectAfterLogin = (role) => {
    const from = location.state?.from?.pathname;
    if (from && !from.includes('/login')) {
      navigate(from, { replace: true });
    } else if (role === 'farmer') {
      navigate('/farmer/home', { replace: true });
    } else {
      navigate('/officer/dashboard', { replace: true });
    }
  };

  const handleLaunch = (role) => {
    selectRole(role);
    redirectAfterLogin(role);
  };

  return (
    <div className="login-page-shell">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-brand-icon" aria-hidden="true">
            <Shield size={28} />
          </div>
          <h1 className="login-title">CropShield Access</h1>
          <p className="login-subtitle">
            Smart Crop Outbreak Surveillance & Early Warning System
          </p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Select your portal to explore the system:
          </p>
        </div>

        {/* Role Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          {/* Farmer Option Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedRole('farmer')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedRole('farmer');
              }
            }}
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-lg)',
              border: `2px solid ${selectedRole === 'farmer' ? 'var(--primary)' : 'var(--border-card)'}`,
              background: selectedRole === 'farmer' ? 'var(--primary-50, #f0fdf4)' : 'var(--bg-card, #ffffff)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: selectedRole === 'farmer' ? 'var(--primary)' : 'var(--bg-subtle)',
                color: selectedRole === 'farmer' ? '#ffffff' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Smartphone size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Farmer Experience
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary-100, #dcfce7)',
                    color: 'var(--primary, #15803d)',
                  }}
                >
                  Mobile-First &bull; Vernacular
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                Submit disease observations, capture leaf photos, get instant diagnostic advice, and view regional alerts in Kannada, Hindi, Telugu, or English.
              </p>
            </div>
          </div>

          {/* Officer Option Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedRole('officer')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedRole('officer');
              }
            }}
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-lg)',
              border: `2px solid ${selectedRole === 'officer' ? 'var(--primary)' : 'var(--border-card)'}`,
              background: selectedRole === 'officer' ? 'var(--primary-50, #f0fdf4)' : 'var(--bg-card, #ffffff)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: selectedRole === 'officer' ? 'var(--primary)' : 'var(--bg-subtle)',
                color: selectedRole === 'officer' ? '#ffffff' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Briefcase size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Agricultural Officer
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary-100, #dcfce7)',
                    color: 'var(--primary, #15803d)',
                  }}
                >
                  Surveillance Command
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                Review incoming cases, inspect specimen images, verify diagnoses, monitor DBSCAN outbreak density clusters, and run environmental risk simulations.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Launch Action */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          block
          icon={ArrowRight}
          onClick={() => handleLaunch(selectedRole)}
        >
          {selectedRole === 'farmer' ? 'Launch Farmer Portal' : 'Launch Officer Command Center'}
        </Button>
      </div>
    </div>
  );
}

