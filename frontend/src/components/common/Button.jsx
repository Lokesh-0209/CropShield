import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    icon = null,
    iconPosition = 'left',
    block = false,
    className = '',
    ...props
  },
  ref
) {
  const IconComponent = icon;
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={`cs-btn cs-btn-${variant} cs-btn-${size} ${block ? 'cs-btn-block' : ''} ${
        loading ? 'is-loading' : ''
      } ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="spin" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {IconComponent && iconPosition === 'left' && (
            <IconComponent size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} aria-hidden="true" />
          )}
          {children}
          {IconComponent && iconPosition === 'right' && (
            <IconComponent size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
});

export default Button;
