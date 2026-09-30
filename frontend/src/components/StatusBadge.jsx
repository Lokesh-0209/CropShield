import {
  Clock,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { CaseStatus, CASE_STATUS_META } from '../types/enums';

const STATUS_ICONS = {
  [CaseStatus.PENDING_ANALYSIS]: Clock,
  [CaseStatus.ANALYZED]: Sparkles,
  [CaseStatus.NEEDS_VERIFICATION]: ShieldAlert,
  [CaseStatus.VERIFIED]: CheckCircle2,
  [CaseStatus.REJECTED]: XCircle,
  [CaseStatus.MORE_INFO_REQUIRED]: HelpCircle,
};

export default function StatusBadge({ status, size = 'md' }) {
  const meta = CASE_STATUS_META[status] || {
    label: status || 'Unknown',
    variant: 'neutral',
  };
  const IconComponent = STATUS_ICONS[status] || Clock;

  return (
    <span
      className={`status-badge status-${meta.variant} status-size-${size}`}
      title={meta.description || meta.label}
    >
      <IconComponent className="badge-icon" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}
