import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, X } from 'lucide-react';
import { getHealthStatus } from '../api/health';
import { API_BASE_URL } from '../api/client';

export default function BackendStatusBanner({ onStatusChange }) {
  const [status, setStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [serviceInfo, setServiceInfo] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const checkConnection = useCallback(async () => {
    setStatus('checking');
    try {
      const res = await getHealthStatus();
      if (res && (res.status === 'ok' || res.status === 'healthy')) {
        setStatus('online');
        setServiceInfo(res.service || 'CropShield API');
        if (onStatusChange) onStatusChange(true);
      } else {
        setStatus('offline');
        if (onStatusChange) onStatusChange(false);
      }
    } catch {
      setStatus('offline');
      if (onStatusChange) onStatusChange(false);
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, [onStatusChange]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 25000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <div className="health-indicator-wrap">
      {status === 'online' && (
        <button
          type="button"
          className="health-status-btn status-online"
          onClick={checkConnection}
          title={`Connected to ${API_BASE_URL} (${serviceInfo}). Last checked: ${lastChecked}. Click to refresh.`}
        >
          <span className="status-dot dot-online" />
          <span className="status-text">API Online</span>
        </button>
      )}

      {status === 'checking' && (
        <div className="health-status-btn status-checking" title="Connecting to backend API...">
          <RefreshCw size={12} className="spin text-muted" />
          <span className="status-text">Connecting...</span>
        </div>
      )}

      {status === 'offline' && (
        <div className="health-status-group">
          <button
            type="button"
            className="health-status-btn status-offline"
            onClick={() => setShowHelp(!showHelp)}
            title="Backend disconnected. Click for instructions."
          >
            <span className="status-dot dot-offline" />
            <span className="status-text">API Offline</span>
          </button>

          {showHelp && (
            <div className="health-help-popover">
              <div className="help-popover-header">
                <div className="help-popover-title">
                  <AlertCircle size={15} className="text-danger" />
                  <span>Backend Unreachable</span>
                </div>
                <button
                  type="button"
                  className="help-popover-close"
                  onClick={() => setShowHelp(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="help-popover-desc">
                Cannot reach API at <code>{API_BASE_URL}</code>.
              </p>
              <div className="help-code-box">
                <code>uvicorn app.main:app --reload</code>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary btn-block mt-2"
                onClick={() => {
                  checkConnection();
                }}
              >
                <RefreshCw size={12} className="icon-mr" />
                Retry Ping
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
