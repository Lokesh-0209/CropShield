import { AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { RiskLevel, RISK_LEVEL_META } from '../types/enums';

const RISK_ICONS = {
  [RiskLevel.LOW]: ShieldCheck,
  [RiskLevel.MEDIUM]: AlertTriangle,
  [RiskLevel.HIGH]: Flame,
};

export default function RiskBadge({ level, score = null, showScore = true, size = 'md' }) {
  const normalizedLevel = (level || '').toUpperCase();
  const meta = RISK_LEVEL_META[normalizedLevel] || {
    label: level || 'N/A',
    variant: 'low',
    badgeClass: 'risk-pill-low',
    description: 'Risk assessment pending',
  };

  const IconComponent = RISK_ICONS[normalizedLevel] || ShieldCheck;

  return (
    <span
      className={`risk-badge ${meta.badgeClass} risk-size-${size}`}
      title={`${meta.label}${score !== null ? ` (Score: ${score}/100)` : ''} - ${meta.description || ''}`}
    >
      <IconComponent className="risk-icon" aria-hidden="true" />
      <span className="risk-label">{meta.label}</span>
      {showScore && score !== null && (
        <span className="risk-score-pill">{Math.round(score)}</span>
      )}
    </span>
  );
}
