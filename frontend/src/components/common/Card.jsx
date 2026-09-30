export function Card({
  children,
  title,
  subtitle,
  action,
  interactive = false,
  className = '',
  ...props
}) {
  const hasHeader = title || subtitle || action;

  return (
    <div
      className={`cs-card ${interactive ? 'cs-card-interactive' : ''} ${className}`.trim()}
      {...props}
    >
      {hasHeader && (
        <div className="cs-card-header">
          <div>
            {title && <h3 className="cs-card-title">{title}</h3>}
            {subtitle && <p className="cs-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="cs-card-action">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }) {
  return (
    <div className={`cs-card-body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`cs-card-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default Card;
