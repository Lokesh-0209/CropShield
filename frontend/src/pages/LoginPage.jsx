import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Smartphone, Briefcase, KeyRound, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ErrorState } from '../components/common/ErrorState';
import { formatErrorMessage } from '../services/api';
import useDocumentMetadata from '../hooks/useDocumentMetadata';

export default function LoginPage() {
  useDocumentMetadata({
    title: 'Sign In — CropShield',
    description: 'Secure role-based authentication for farmers and agricultural surveillance officers.',
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [activeRole, setActiveRole] = useState('farmer'); // 'farmer' | 'officer'
  const [phone, setPhone] = useState('9845012345');
  const [otp, setOtp] = useState('123456');
  const [officerId, setOfficerId] = useState('KA-AGRI-042');
  const [password, setPassword] = useState('officer@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

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

  const handleFarmerSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({
        role: 'farmer',
        phone: phone.trim(),
        otp: otp.trim(),
      });
      redirectAfterLogin('farmer');
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfficerSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({
        role: 'officer',
        officerId: officerId.trim(),
        password: password.trim(),
      });
      redirectAfterLogin('officer');
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Dev quick login triggers
  const handleQuickLogin = async (role) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (role === 'farmer') {
        await login({ role: 'farmer', phone: '9845012345', otp: '123456' });
        redirectAfterLogin('farmer');
      } else {
        await login({ role: 'officer', officerId: 'KA-AGRI-042', password: 'demo' });
        redirectAfterLogin('officer');
      }
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-shell">
      <div className="login-card">
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

        {/* Role Selector */}
        <div className="role-switcher-box" role="tablist" aria-label="Select User Role">
          <button
            type="button"
            role="tab"
            aria-selected={activeRole === 'farmer'}
            className={`role-btn ${activeRole === 'farmer' ? 'active' : ''}`}
            onClick={() => {
              setActiveRole('farmer');
              setErrorMessage(null);
            }}
          >
            <Smartphone size={16} aria-hidden="true" />
            <span>Farmer</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeRole === 'officer'}
            className={`role-btn ${activeRole === 'officer' ? 'active' : ''}`}
            onClick={() => {
              setActiveRole('officer');
              setErrorMessage(null);
            }}
          >
            <Briefcase size={16} aria-hidden="true" />
            <span>Verified Officer</span>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4">
            <ErrorState
              title="Authentication Failed"
              message={errorMessage}
              onRetry={() => setErrorMessage(null)}
            />
          </div>
        )}

        {/* Farmer Login Form (Phone + OTP) */}
        {activeRole === 'farmer' && (
          <form onSubmit={handleFarmerSubmit} className="flex flex-col gap-3">
            <Input
              id="farmer-phone"
              label="Mobile Number"
              type="tel"
              required
              placeholder="e.g. 98450 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Any 10-digit number accepted in mock mode"
            />

            <Input
              id="farmer-otp"
              label="6-Digit OTP"
              type="text"
              required
              maxLength={6}
              placeholder="Enter OTP (Mock: 123456)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              helperText="Test OTP is 123456"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={isLoading}
              className="mt-2"
            >
              Login as Farmer
            </Button>
          </form>
        )}

        {/* Officer Login Form (Officer ID + Password) */}
        {activeRole === 'officer' && (
          <form onSubmit={handleOfficerSubmit} className="flex flex-col gap-3">
            <Input
              id="officer-id"
              label="Agricultural Officer ID"
              type="text"
              required
              placeholder="e.g. KA-AGRI-042"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              helperText="Government or Department Issued Officer Code"
            />

            <Input
              id="officer-password"
              label="Password"
              type="password"
              required
              placeholder="Enter officer password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={isLoading}
              icon={KeyRound}
              className="mt-2"
            >
              Sign In as Officer
            </Button>
          </form>
        )}

        {/* Dev Quick Login Buttons (Visible only in DEV mode) */}
        {import.meta.env.DEV && (
          <div className="dev-quick-login-box">
            <div className="dev-quick-title">
              <Wrench size={14} aria-hidden="true" />
              <span>Dev: Quick Login (Bypass form)</span>
            </div>
            <div className="dev-quick-btns">
              <Button
                variant="secondary"
                size="xs"
                block
                disabled={isLoading}
                onClick={() => handleQuickLogin('farmer')}
              >
                Farmer (Ramesh)
              </Button>
              <Button
                variant="secondary"
                size="xs"
                block
                disabled={isLoading}
                onClick={() => handleQuickLogin('officer')}
              >
                Officer (Dr. Suresh)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
