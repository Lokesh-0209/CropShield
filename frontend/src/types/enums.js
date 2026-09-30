/**
 * CropShield Domain Enums
 * EXACT match to backend domain models (app.models.case and app.models.risk)
 */

export const CaseStatus = Object.freeze({
  PENDING_ANALYSIS: 'PENDING_ANALYSIS',
  ANALYZED: 'ANALYZED',
  NEEDS_VERIFICATION: 'NEEDS_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  MORE_INFO_REQUIRED: 'MORE_INFO_REQUIRED',
});

export const RiskLevel = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
});

export const VerificationStatus = Object.freeze({
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  MORE_INFO_REQUIRED: 'MORE_INFO_REQUIRED',
});

export const CASE_STATUS_META = {
  [CaseStatus.PENDING_ANALYSIS]: {
    label: 'Pending Analysis',
    variant: 'neutral',
    description: 'Fresh field report awaiting AI computer vision & risk scoring',
  },
  [CaseStatus.ANALYZED]: {
    label: 'Analyzed',
    variant: 'info',
    description: 'AI inference complete, awaiting verification or triage',
  },
  [CaseStatus.NEEDS_VERIFICATION]: {
    label: 'Needs Verification',
    variant: 'warning',
    description: 'Flagged for agricultural officer review and field confirmation',
  },
  [CaseStatus.VERIFIED]: {
    label: 'Verified',
    variant: 'success',
    description: 'Confirmed disease outbreak case included in DBSCAN clusters',
  },
  [CaseStatus.REJECTED]: {
    label: 'Rejected',
    variant: 'danger',
    description: 'Dismissed by officer as false alarm or non-pathogenic',
  },
  [CaseStatus.MORE_INFO_REQUIRED]: {
    label: 'More Info Required',
    variant: 'warning',
    description: 'Officer requested clearer photos or additional field samples',
  },
};

export const RISK_LEVEL_META = {
  [RiskLevel.LOW]: {
    label: 'Low Risk',
    variant: 'low',
    bg: '#064e3b',
    color: '#34d399',
    badgeClass: 'risk-pill-low',
    description: 'Local containment stable; standard cultural practices',
  },
  [RiskLevel.MEDIUM]: {
    label: 'Medium Risk',
    variant: 'medium',
    bg: '#78350f',
    color: '#fbbf24',
    badgeClass: 'risk-pill-medium',
    description: 'Elevated pathogen pressure; active surveillance advised',
  },
  [RiskLevel.HIGH]: {
    label: 'High Risk',
    variant: 'high',
    bg: '#7f1d1d',
    color: '#f87171',
    badgeClass: 'risk-pill-high',
    description: 'Critical outbreak threshold; immediate phytosanitary action',
  },
};
