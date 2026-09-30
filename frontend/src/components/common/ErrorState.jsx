import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  title = 'Unable to Load Data',
  message = "Can't connect. Check your internet and try again.",
  error = null,
  onRetry = null,
  isRetrying = false,
  className = '',
}) {
  const isDev = import.meta.env.DEV;
  const rawDevMessage = error?.stack || error?.message || (typeof error === 'string' ? error : null);

  return (
    <div className={`cs-error-state ${className}`.trim()} role="alert">
      <div className="cs-error-icon-box" aria-hidden="true">
        <AlertCircle size={24} />
      </div>

      <h3 className="cs-error-title">{title}</h3>
      <p className="cs-error-message">{message}</p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          loading={isRetrying}
          icon={RefreshCw}
        >
          Try Again
        </Button>
      )}

      {isDev && rawDevMessage && (
        <div className="cs-error-dev">
          <strong>Developer Details (DEV only):</strong>
          <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: '11px' }}>
            {rawDevMessage}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
