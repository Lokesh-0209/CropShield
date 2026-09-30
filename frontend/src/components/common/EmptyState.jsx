import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: CustomIcon = Inbox,
  title = 'No records found',
  description = 'There is currently no data available to display.',
  action = null,
  className = '',
}) {
  return (
    <div className={`cs-empty-state ${className}`.trim()}>
      <div className="cs-empty-icon" aria-hidden="true">
        <CustomIcon size={24} />
      </div>
      <h3 className="cs-empty-title">{title}</h3>
      <p className="cs-empty-desc">{description}</p>
      {action && <div className="cs-empty-action">{action}</div>}
    </div>
  );
}

export default EmptyState;
