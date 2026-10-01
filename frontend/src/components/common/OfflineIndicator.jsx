import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { getHealthStatus } from '../../api/health';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isApiReachable, setIsApiReachable] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkHealth = async () => {
      try {
        const res = await getHealthStatus();
        setIsApiReachable(Boolean(res && (res.status === 'ok' || res.status === 'healthy')));
      } catch {
        setIsApiReachable(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const shouldShow = !isOnline || !isApiReachable;

  if (!shouldShow) return null;

  return (
    <div
      className="cs-calm-offline-pill animate-fade-in"
      role="status"
      aria-live="polite"
      title="You are currently offline. Field observations will be saved and synchronized once connectivity resumes."
    >
      <WifiOff size={13} className="text-muted flex-shrink-0" aria-hidden="true" />
      <span>Offline &bull; reports will sync later</span>
    </div>
  );
}

export default OfflineIndicator;
