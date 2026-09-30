import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md', // 'md' | 'lg'
  ariaLabelledBy = 'cs-modal-title',
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="cs-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? ariaLabelledBy : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`cs-modal-dialog ${size === 'lg' ? 'cs-modal-dialog-lg' : ''}`}
      >
        <div className="cs-modal-header">
          <div>
            {title && (
              <h2 id={ariaLabelledBy} className="cs-modal-title">
                {title}
              </h2>
            )}
            {subtitle && <p className="cs-modal-subtitle">{subtitle}</p>}
          </div>

          <button
            type="button"
            className="cs-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="cs-modal-body">{children}</div>

        {footer && <div className="cs-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
