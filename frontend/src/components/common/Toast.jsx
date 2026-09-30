import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const TOAST_ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  danger: AlertCircle,
  info: Info,
};

export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 4000,
}) {
  const IconComponent = TOAST_ICONS[type] || Info;

  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`toast toast-${type} animate-fade-in`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex-center gap-2">
        <IconComponent size={16} aria-hidden="true" className="flex-shrink-0" />
        <span className="toast-text">{message}</span>
      </div>

      {onClose && (
        <button
          type="button"
          className="toast-close"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default Toast;
