import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { RiskLevel, RISK_LEVEL_META } from '../types/enums';

const RISK_ICONS = {
  [RiskLevel.LOW]: ShieldCheck,
  [RiskLevel.MEDIUM]: AlertTriangle,
  [RiskLevel.HIGH]: AlertCircle,
};

export default function RiskBadge({ level, score = null, showScore = true, size = 'md' }) {
  const normalizedLevel = (level || '').toUpperCase();
  const meta = RISK_LEVEL_META[normalizedLevel] || {
    label: level || 'N/A',
    variant: 'low',
  };

  const IconComponent = RISK_ICONS[normalizedLevel] || ShieldCheck;

  return (
    <span
      className={`risk-pill risk-${(meta.variant || 'low').toLowerCase()} size-${size}`}
      title={`${meta.label}${score !== null ? ` (Score: ${Math.round(score)}/100)` : ''}`}
    >
      <IconComponent size={size === 'sm' ? 12 : 14} className="pill-icon" />
      <span className="risk-text">{meta.label}</span>
      {showScore && score !== null && (
        <span className="risk-score-tag">{Math.round(score)}</span>
      )}
    </span>
  );
}
