export function PageHeader({
  heading,
  lead,
  actions = null,
  children = null,
  className = '',
}) {
  return (
    <div className={`cs-page-header ${className}`.trim()}>
      <div className="cs-page-header-text">
        <h1 className="cs-page-heading">{heading}</h1>
        {lead && <p className="cs-page-lead">{lead}</p>}
      </div>

      {(actions || children) && (
        <div className="cs-page-actions">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
