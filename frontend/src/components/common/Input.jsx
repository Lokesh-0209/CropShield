import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export const Input = forwardRef(function Input(
  {
    id,
    label,
    error,
    helperText,
    required = false,
    optional = false,
    className = '',
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className={`cs-field-group ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="cs-field-label">
          <span>{label}</span>
          {required && <span className="cs-field-required" aria-hidden="true">*</span>}
          {optional && <span className="cs-field-optional">(optional)</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`cs-input ${error ? 'has-error' : ''}`}
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

export default Input;
