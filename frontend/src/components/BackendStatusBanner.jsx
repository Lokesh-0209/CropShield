import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertOctagon, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getHealthStatus } from '../api/health';
import { API_BASE_URL } from '../api/client';

export default function BackendStatusBanner({ onStatusChange }) {
  const [status, setStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [serviceInfo, setServiceInfo] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

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
    const interval = setInterval(checkConnection, 20000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  if (status === 'online') {
    return (
      <div className="health-pill health-pill-online" title={`Connected to ${API_BASE_URL} (${serviceInfo})`}>
        <span className="pulse-dot pulse-green"></span>
        <CheckCircle2 size={13} className="health-icon" />
        <span className="health-text">API Online ({serviceInfo})</span>
        <button
          type="button"
          onClick={checkConnection}
          className="health-refresh-btn"
          aria-label="Refresh backend status"
          title={`Last checked: ${lastChecked}. Click to ping again.`}
        >
          <RefreshCw size={11} />
        </button>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="health-pill health-pill-checking" title="Pinging backend...">
        <span className="pulse-dot pulse-amber"></span>
        <Activity size={13} className="health-icon spin" />
        <span className="health-text">Connecting to backend...</span>
      </div>
    );
  }

  return (
    <div className="health-wrapper">
      <div className="health-pill health-pill-offline" title={`Cannot connect to ${API_BASE_URL}`}>
        <span className="pulse-dot pulse-red"></span>
        <AlertOctagon size={13} className="health-icon" />
        <span className="health-text">API Offline ({API_BASE_URL})</span>
        <button
          type="button"
          onClick={checkConnection}
          className="health-refresh-btn"
          title="Retry connecting to backend"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {!isDismissed && (
        <div className="backend-offline-banner">
          <div className="offline-content">
            <AlertOctagon className="offline-icon" size={20} />
            <div className="offline-text">
              <strong>Backend Disconnected:</strong> Cannot reach CropShield API at <code>{API_BASE_URL}</code>.
              To start the backend, run: <code>uvicorn app.main:app --reload</code> in the <code>backend/</code> directory.
            </div>
          </div>
          <div className="offline-actions">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={checkConnection}
            >
              <RefreshCw size={14} className="icon-mr" />
              Retry Connection
            </button>
            <button
              type="button"
              className="btn-link-dismiss"
              onClick={() => setIsDismissed(true)}
            >
              Dismiss Notice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
