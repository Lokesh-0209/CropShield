import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Image as ImageIcon,
  AlertTriangle,
  CloudOff,
} from 'lucide-react';

import { useCase } from '../../services/queries';
import { getQueuedReports } from '../../services/offlineQueue';
import { getTreatmentAdvice } from '../../services/diseaseTreatments';
import RiskBadge from '../../components/RiskBadge';
import { Card, CardBody } from '../../components/common/Card';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';
import useDocumentMetadata from '../../hooks/useDocumentMetadata';

/**
 * Visual status timeline for Report Detail
 */
function StatusTimeline({ status }) {
  const { t } = useTranslation();
  const currentStep = (() => {
    if (status === 'VERIFIED') return 4;
    if (status === 'NEEDS_VERIFICATION' || status === 'PENDING') return 3;
    if (status === 'ANALYZED') return 2;
    if (status === 'WAITING_SYNC') return 0;
    return 1; // Submitted
  })();

  const steps = [
    { label: t('reports.timelineSubmitted', 'Submitted'), desc: t('reports.timelineSubmittedDesc', 'Case received'), step: 1 },
    { label: t('reports.timelineAiChecked', 'AI Checked'), desc: t('reports.timelineAiCheckedDesc', 'Pathogen detected'), step: 2 },
    { label: t('reports.timelineOfficerReview', 'Officer Reviewing'), desc: t('reports.timelineOfficerReviewDesc', 'Extension audit'), step: 3 },
    { label: t('reports.timelineVerified', 'Verified'), desc: t('reports.timelineVerifiedDesc', 'Official diagnosis'), step: 4 },
  ];

  if (status === 'WAITING_SYNC') {
    return (
      <div className="farmer-detail-timeline-box mb-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700 }}>
          <CloudOff size={18} />
          <span>{t('reports.waitingForInternetDesc', 'Waiting for internet to upload to central system')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-detail-timeline-box mb-4">
      <div className="farmer-detail-timeline-track">
        {steps.map((st) => {
          const isDone = st.step <= currentStep;
          const isCurrent = st.step === currentStep;

          return (
            <div key={st.label} className="detail-timeline-node">
              <div className={`detail-timeline-dot ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}>
                {isDone ? <CheckCircle2 size={14} /> : <span>{st.step}</span>}
              </div>
              <div className="detail-timeline-meta">
                <div className={`detail-timeline-title ${isDone ? 'is-done' : ''}`}>{st.label}</div>
                <div className="detail-timeline-desc">{st.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FarmerReportDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const isOfflineId = Boolean(id && id.startsWith('offline-'));

  const [offlineItem, setOfflineItem] = useState(null);
  const [offlineLoading, setOfflineLoading] = useState(isOfflineId);

  const { data: serverCase, isLoading, isError, error, refetch, isFetching } = useCase(
    isOfflineId ? null : id
  );

  const caseItem = isOfflineId ? offlineItem : serverCase;

  useDocumentMetadata({
    title: caseItem?.crop ? `Report #${id} (${caseItem.crop}) — CropShield Kisan` : `Report #${id} — CropShield Kisan`,
    description: 'Farmer surveillance diagnosis, officer notes, and agrochemical treatment guidance.',
  });

  useEffect(() => {
    if (isOfflineId) {
      setOfflineLoading(true);
      getQueuedReports().then((items) => {
        const found = items.find((c) => c.id === id);
        setOfflineItem(found || null);
        setOfflineLoading(false);
      });
    }
  }, [id, isOfflineId]);

  if (isError && !caseItem) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <Link to="/farmer/reports" className="cs-btn cs-btn-secondary cs-btn-sm mb-3">
          <ArrowLeft size={14} className="icon-mr" />
          <span>{t('reports.backToReports', 'Back to My Reports')}</span>
        </Link>
        <ErrorState
          title={t('reports.detailErrorTitle', 'Could not load report details')}
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  if ((isLoading || offlineLoading) && !caseItem) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <Skeleton height="36px" width="140px" className="mb-3" />
        <Skeleton height="240px" width="100%" className="mb-3" />
        <Skeleton height="160px" width="100%" />
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <Link to="/farmer/reports" className="cs-btn cs-btn-secondary cs-btn-sm mb-3">
          <ArrowLeft size={14} className="icon-mr" />
          <span>{t('reports.backToReports', 'Back to My Reports')}</span>
        </Link>
        <Card>
          <CardBody style={{ textAlign: 'center', padding: '30px' }}>
            <p>{t('reports.notFound', 'Report not found.')}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isVerified = caseItem.status === 'VERIFIED';
  const confidenceScore = Math.round((caseItem.confidence || 0.85) * 100);
  const confidenceLabel =
    confidenceScore >= 85
      ? t('results.confidenceLikely', 'Likely')
      : confidenceScore >= 60
      ? t('results.confidencePossible', 'Possible')
      : t('results.confidenceUnsure', 'Not sure, sent to an officer for checking');

  const treatmentAdvice = getTreatmentAdvice(caseItem.disease);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Back button */}
      <Link
        to="/farmer/reports"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-body)',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: '16px',
          minHeight: '48px',
        }}
      >
        <ArrowLeft size={18} />
        <span>{t('reports.backToReports', 'Back to My Reports')}</span>
      </Link>

      <Card className="mb-4">
        <CardBody style={{ padding: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {caseItem.id}
              </span>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', letterSpacing: '-0.3px' }}>
                {caseItem.crop} &bull; {caseItem.growth_stage}
              </h1>
            </div>

            {/* Distinct Badges */}
            {isVerified ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={13} />
                <span>{t('common.verified', 'Verified')}</span>
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fffbeb',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <AlertTriangle size={13} />
                <span>{t('common.suspected', 'Suspected')}</span>
              </span>
            )}
          </div>

          {/* Photo */}
          {caseItem.image_url ? (
            <div
              style={{
                width: '100%',
                maxHeight: '280px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                marginTop: '16px',
                background: 'var(--bg-subtle)',
              }}
            >
              <img
                src={caseItem.image_url}
                alt={`Photo of affected ${caseItem.crop}`}
                width="600"
                height="280"
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                marginTop: '16px',
              }}
            >
              <ImageIcon size={32} className="text-muted mb-2" />
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {t('photo.noPhotoUploaded', 'No photo uploaded')}
              </div>
            </div>
          )}

          {/* Diagnosis & Plain Language Confidence Banner */}
          <div
            style={{
              marginTop: '18px',
              padding: '16px',
              background: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              {t('results.identifiedPathogen', 'Identified Pathogen / Disease')}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {caseItem.disease || t('reports.pendingDiagnosis', 'Pending Analysis')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '13.5px', color: 'var(--text-body)', fontWeight: 600 }}>
                {t('results.confidenceText', 'Confidence')}: <strong>{confidenceLabel}</strong> ({confidenceScore}%)
              </span>
              <RiskBadge level={caseItem.risk_level || 'MEDIUM'} score={caseItem.risk_score} size="sm" />
            </div>
          </div>

          {/* Status Timeline */}
          <div className="mt-4">
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              {t('reports.verificationProgress', 'Verification Progress')}
            </h3>
            <StatusTimeline status={caseItem.status} />
          </div>

          {/* Officer Verification Notes if available */}
          {caseItem.officer_note ? (
            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                <ShieldCheck size={16} className="text-primary" />
                <span>{t('reports.officerInspectionNote', 'Agricultural Officer Inspection Note')}</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-body)', marginTop: '6px', lineHeight: 1.5 }}>
                {caseItem.officer_note}
              </p>
              {caseItem.verified_at && (
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {t('reports.auditedOn', 'Audited on')}: {new Date(caseItem.verified_at).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}
            >
              {t('reports.awaitingOfficerInspection', 'Awaiting on-site confirmation by your district agricultural extension officer.')}
            </div>
          )}

          {/* Curated Expert Treatment Advice */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShieldCheck size={18} className="text-primary" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                {t('results.treatmentTitle', 'Recommended Action & Treatment')}
              </h2>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--primary)',
                fontWeight: 600,
                background: 'var(--primary-light)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px',
              }}
            >
              {t('results.treatmentNotice', 'Advice is curated by agricultural experts. Follow the label instructions for dosage.')}
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.5, marginBottom: '12px' }}>
              <strong>{t('results.immediateAction', 'Immediate Action')}: </strong>
              {treatmentAdvice.immediateAction}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {treatmentAdvice.recommendedSpray.map((spray, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {spray.type}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {spray.dosage}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {spray.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {spray.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location & Metadata */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-body)' }}>
              <MapPin size={15} className="text-muted flex-shrink-0" />
              <span>{caseItem.location_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Calendar size={15} className="flex-shrink-0" />
              <span>{t('reports.reportedDate', 'Reported')}: {new Date(caseItem.created_at).toLocaleString()}</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
