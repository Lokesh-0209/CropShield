import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export const Select = forwardRef(function Select(
  {
    id,
    label,
    options = [],
    error,
    helperText,
    required = false,
    optional = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId = selectId ? `${selectId}-error` : undefined;
  const helperId = selectId ? `${selectId}-helper` : undefined;

  return (
    <div className={`cs-field-group ${className}`.trim()}>
      {label && (
        <label htmlFor={selectId} className="cs-field-label">
          <span>{label}</span>
          {required && <span className="cs-field-required" aria-hidden="true">*</span>}
          {optional && <span className="cs-field-optional">(optional)</span>}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`cs-select ${error ? 'has-error' : ''}`}
        {...props}
      >
        {children ||
          options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const text = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {text}
              </option>
            );
          })}
      </select>

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

export default Select;
