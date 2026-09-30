import { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/common/Toast';

const ToastContext = createContext({
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const success = useCallback(
    (message, duration) => showToast(message, 'success', duration),
    [showToast]
  );
  const error = useCallback(
    (message, duration) => showToast(message, 'error', duration),
    [showToast]
  );
  const info = useCallback(
    (message, duration) => showToast(message, 'info', duration),
    [showToast]
  );
  const warning = useCallback(
    (message, duration) => showToast(message, 'warning', duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Container with accessibility aria-live region */}
      <div
        className="cs-toast-container"
        role="region"
        aria-label="System notifications"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '420px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast
              message={t.message}
              type={t.type}
              duration={t.duration}
              onClose={() => closeToast(t.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }
  return context;
}

export default ToastContext;
