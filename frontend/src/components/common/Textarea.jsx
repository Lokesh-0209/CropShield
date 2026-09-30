import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export const Textarea = forwardRef(function Textarea(
  {
    id,
    label,
    error,
    helperText,
    required = false,
    optional = false,
    rows = 3,
    className = '',
    ...props
  },
  ref
) {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId = textareaId ? `${textareaId}-error` : undefined;
  const helperId = textareaId ? `${textareaId}-helper` : undefined;

  return (
    <div className={`cs-field-group ${className}`.trim()}>
      {label && (
        <label htmlFor={textareaId} className="cs-field-label">
          <span>{label}</span>
          {required && <span className="cs-field-required" aria-hidden="true">*</span>}
          {optional && <span className="cs-field-optional">(optional)</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`cs-textarea ${error ? 'has-error' : ''}`}
        {...props}
      />

      {error ? (
        <div id={errorId} className="cs-field-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <div id={helperId} className="cs-field-helper">
          {helperText}
        </div>
      ) : null}
    </div>
  );
});

export default Textarea;
