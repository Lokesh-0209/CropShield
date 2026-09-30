import { Skeleton } from './Skeleton';

export function StatCard({
  title,
  value,
  icon: IconComponent = null,
  subtext = null,
  variant = 'neutral', // 'neutral' | 'low' | 'medium' | 'high' | 'primary'
  loading = false,
  error = false,
  className = '',
}) {
  if (loading) {
    return <Skeleton variant="stat" className={className} />;
  }

  // On error, show "—" instead of a misleading "0"
  const displayValue = error ? '—' : value !== undefined && value !== null ? value : '—';

  return (
    <div className={`cs-stat-card ${className}`.trim()}>
      <div className="cs-stat-top">
        <span className="cs-stat-title">{title}</span>
        {IconComponent && (
          <IconComponent size={16} className="cs-stat-icon" aria-hidden="true" />
        )}
      </div>

      <div className={`cs-stat-value cs-stat-val-${variant} ${variant === 'high' ? 'text-high' : variant === 'medium' ? 'text-medium' : variant === 'low' ? 'text-low' : ''}`}>
        {displayValue}
      </div>

      {subtext && <div className="cs-stat-subtext">{subtext}</div>}
    </div>
  );
}

export default StatCard;
