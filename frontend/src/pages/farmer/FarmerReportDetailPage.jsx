import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, CheckCircle2, ShieldCheck, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useCase } from '../../services/queries';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { Card, CardBody } from '../../components/common/Card';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';

export default function FarmerReportDetailPage() {
  const { id } = useParams();
  const { data: caseItem, isLoading, isError, error, refetch, isFetching } = useCase(id);

  if (isError) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link to="/farmer/reports" className="btn btn-secondary btn-sm mb-3">
          <ArrowLeft size={14} className="icon-mr" /> Back to My Reports
        </Link>
        <ErrorState
          title="Could not load report details"
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  if (isLoading || !caseItem) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Skeleton height="36px" width="120px" className="mb-3" />
        <Skeleton height="220px" width="100%" className="mb-3" />
        <Skeleton height="140px" width="100%" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Back button */}
      <Link
        to="/farmer/reports"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-body)',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: '16px',
          minHeight: '44px',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to My Reports</span>
      </Link>

      {/* Main Report Card */}
      <Card className="mb-4">
        <CardBody style={{ padding: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {caseItem.id}
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {caseItem.crop} &bull; {caseItem.growth_stage}
              </h1>
            </div>
            <StatusBadge status={caseItem.status} size="md" />
          </div>

          {/* Photo */}
          {caseItem.image_url ? (
            <div
              style={{
                width: '100%',
                maxHeight: '260px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                marginTop: '16px',
                background: 'var(--bg-subtle)',
              }}
            >
              <img
                src={caseItem.image_url}
                alt={caseItem.crop}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                marginTop: '16px',
              }}
            >
              <ImageIcon size={32} className="text-muted mb-2" />
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No photo uploaded</div>
            </div>
          )}

          {/* AI Diagnosis Result */}
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
              Identified Pathogen
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {caseItem.disease || 'Pending Analysis'}
            </div>
            {caseItem.confidence && (
              <div style={{ fontSize: '13px', color: 'var(--text-body)', marginTop: '4px' }}>
                AI Confidence: <strong>{Math.round(caseItem.confidence * 100)}%</strong>
              </div>
            )}
            <div style={{ marginTop: '10px' }}>
              <RiskBadge level={caseItem.risk_level} score={caseItem.risk_score} size="md" />
            </div>
          </div>

          {/* Officer Verification Note */}
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
                <span>Agricultural Officer Feedback</span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-body)', marginTop: '6px', lineHeight: 1.5 }}>
                {caseItem.officer_note}
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Awaiting inspection by district agricultural officer.
            </div>
          )}

          {/* Metadata */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-body)' }}>
              <MapPin size={15} className="text-muted flex-shrink-0" />
              <span>{caseItem.location_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Calendar size={15} className="flex-shrink-0" />
              <span>Reported: {new Date(caseItem.created_at).toLocaleString()}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Next Phase Placeholder Note */}
      <div
        style={{
          padding: '12px 14px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Sparkles size={14} className="text-primary flex-shrink-0" />
        <span>
          <strong>Coming in next phase:</strong> Direct audio message response from your local officer.
        </span>
      </div>
    </div>
  );
}
