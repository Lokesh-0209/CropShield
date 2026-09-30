export function Skeleton({
  variant = 'text', // 'text' | 'circular' | 'rectangular' | 'stat' | 'card'
  width,
  height,
  className = '',
  style = {},
  ...props
}) {
  const inlineStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  if (variant === 'stat') {
    return (
      <div
        className={`cs-skeleton cs-skeleton-stat ${className}`.trim()}
        style={inlineStyles}
        aria-hidden="true"
        {...props}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`cs-skeleton ${className}`.trim()}
        style={{ height: height || '180px', borderRadius: 'var(--radius-lg)', ...inlineStyles }}
        aria-hidden="true"
        {...props}
      />
    );
  }

  const variantClass =
    variant === 'circular'
      ? 'cs-skeleton-circle'
      : variant === 'text'
      ? 'cs-skeleton-text'
      : '';

  return (
    <div
      className={`cs-skeleton ${variantClass} ${className}`.trim()}
      style={inlineStyles}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonRows({ count = 3, height = '20px', className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} width={i === count - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export default Skeleton;
