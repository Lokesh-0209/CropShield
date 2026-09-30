import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Thermometer,
  Droplets,
  CloudRain,
  Image as ImageIcon,
} from 'lucide-react';
import { useCase, useVerifyCase } from '../../services/queries';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { VerificationStatus, formatErrorMessage } from '../../services/api';

export default function OfficerCaseReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: caseItem, isLoading, isError, error, refetch, isFetching } = useCase(id);
  const verifyMutation = useVerifyCase();

  const [selectedStatus, setSelectedStatus] = useState(VerificationStatus.VERIFIED);
  const [officerNote, setOfficerNote] = useState('');
  const [actionError, setActionError] = useState(null);

  if (isError) {
    return (
      <div className="page-shell">
        <Link to="/officer/queue" className="btn btn-secondary btn-sm mb-4">
          <ArrowLeft size={14} className="icon-mr" /> Back to Queue
        </Link>
        <ErrorState
          title="Could not load case review"
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  if (isLoading || !caseItem) {
    return (
      <div className="page-shell">
        <Skeleton height="36px" width="140px" className="mb-4" />
        <div className="page-layout-two-col">
          <Skeleton height="380px" width="100%" />
          <Skeleton height="380px" width="100%" />
        </div>
      </div>
    );
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!officerNote.trim()) {
      setActionError('Officer verification note is required.');
      return;
    }

    setActionError(null);
    try {
      await verifyMutation.mutateAsync({
        caseId: caseItem.id,
        verification: {
          status: selectedStatus,
          officer_note: officerNote.trim(),
        },
      });
      alert(`Case ${caseItem.id} marked as ${selectedStatus}!`);
      navigate('/officer/queue');
    } catch (err) {
      setActionError(formatErrorMessage(err));
    }
  };

  return (
    <div className="page-shell">
      {/* Back button */}
      <Link
        to="/officer/queue"
        className="btn btn-secondary btn-sm mb-4"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <ArrowLeft size={14} className="icon-mr" /> Back to Queue
      </Link>

      <PageHeader
        heading={`Case Review &bull; ${caseItem.id}`}
        lead={`Field investigation report submitted for ${caseItem.crop} in ${caseItem.location_name}.`}
        actions={<StatusBadge status={caseItem.status} size="md" />}
      />

      <div className="page-layout-two-col">
        {/* Left: Photographic & Epidemiological Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <CardBody style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-main)' }}>
                Field Specimen Photograph
              </h2>

              {caseItem.image_url ? (
                <div style={{ width: '100%', height: '320px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000000' }}>
                  <img
                    src={caseItem.image_url}
                    alt={`Affected specimen of ${caseItem.crop}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)' }}>
                  <ImageIcon size={36} className="text-muted mb-2" />
                  <p className="text-muted text-sm">No photo was uploaded with this field case.</p>
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Reported Symptoms
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-body)', marginTop: '4px', lineHeight: 1.5 }}>
                  {caseItem.symptoms}
                </p>
              </div>

              {/* Environmental Metrics */}
              {caseItem.environmental_data && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Micro-climate Readings
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <Thermometer size={14} className="text-muted mb-1" />
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Temp</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {caseItem.environmental_data.temperature}°C
                      </div>
                    </div>

                    <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <Droplets size={14} className="text-muted mb-1" />
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Humidity</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {caseItem.environmental_data.humidity}%
                      </div>
                    </div>

                    <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <CloudRain size={14} className="text-muted mb-1" />
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rainfall</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {caseItem.environmental_data.rainfall} mm
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right: AI Computer Vision Assessment & Verification Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Inference Card */}
          <Card>
            <CardBody style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Computer Vision Diagnostics
                </span>
                <RiskBadge level={caseItem.risk_level} score={caseItem.risk_score} size="sm" />
              </div>

              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>
                {caseItem.disease || 'Pending Analysis'}
              </div>

              {caseItem.confidence && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span>Inference Confidence</span>
                    <strong>{Math.round(caseItem.confidence * 100)}%</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.round(caseItem.confidence * 100)}%` }} />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Verification Form */}
          <Card>
            <CardBody style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-main)' }}>
                Officer Verification Decision
              </h2>

              <form onSubmit={handleVerify}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedStatus === VerificationStatus.VERIFIED ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setSelectedStatus(VerificationStatus.VERIFIED)}
                  >
                    <CheckCircle2 size={14} className="icon-mr" />
                    Verify Case
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${selectedStatus === VerificationStatus.MORE_INFO_REQUIRED ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setSelectedStatus(VerificationStatus.MORE_INFO_REQUIRED)}
                  >
                    <HelpCircle size={14} className="icon-mr" />
                    More Info
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${selectedStatus === VerificationStatus.REJECTED ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setSelectedStatus(VerificationStatus.REJECTED)}
                  >
                    <XCircle size={14} className="icon-mr" />
                    Reject
                  </button>
                </div>

                <div className="cs-field-group mb-3">
                  <label htmlFor="officer-notes" className="cs-field-label">
                    Inspection Notes & Recommendations <span className="cs-field-required">*</span>
                  </label>
                  <textarea
                    id="officer-notes"
                    className="cs-textarea"
                    rows={4}
                    required
                    placeholder="Document microscopic assay confirmation, recommended foliar spray, or reason for rejection..."
                    value={officerNote}
                    onChange={(e) => setOfficerNote(e.target.value)}
                  />
                </div>

                {actionError && (
                  <div className="alert-box alert-box-error mb-3" role="alert">
                    <span>{actionError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  block
                  loading={verifyMutation.isPending}
                >
                  Submit Official Verification
                </Button>
              </form>
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
              <strong>Coming in next phase:</strong> Automated Grad-CAM heatmaps overlay on infected leaf images.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
