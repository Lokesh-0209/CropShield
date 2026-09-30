import { ShieldCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const VARIANT_ICONS = {
  low: ShieldCheck,
  success: ShieldCheck,
  medium: AlertTriangle,
  warning: AlertTriangle,
  high: AlertCircle,
  danger: AlertCircle,
  primary: Info,
  neutral: null,
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon: CustomIcon,
  showIcon = true,
  className = '',
  ...props
}) {
  const normalizedVariant = variant.toLowerCase();
  const DefaultIcon = VARIANT_ICONS[normalizedVariant];
  const IconComponent = CustomIcon !== undefined ? CustomIcon : DefaultIcon;

  return (
    <span
      className={`cs-badge cs-badge-${normalizedVariant} cs-badge-${size} ${className}`.trim()}
      {...props}
    >
      {showIcon && IconComponent && (
        <IconComponent
          size={size === 'sm' ? 12 : 14}
          aria-hidden="true"
          className="flex-shrink-0"
        />
      )}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
