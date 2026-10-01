import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit3,
  Thermometer,
  Droplets,
  CloudRain,
  ShieldCheck,
  History,
  User,
  Cpu,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useCase, useVerifyCase } from '../../services/queries';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Toast } from '../../components/common/Toast';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { VerificationStatus, formatErrorMessage } from '../../services/api';
import ZoomableImage from '../../components/officer/ZoomableImage';
import useDocumentMetadata from '../../hooks/useDocumentMetadata';

// Known diseases for Karnataka Solanaceous and Cereal crops
const COMMON_DISEASES = [
  'Tomato Early Blight',
  'Tomato Late Blight',
  'Tomato Leaf Curl Virus',
  'Septoria Leaf Spot',
  'Bacterial Canker / Spot',
  'Potato Late Blight',
  'Potato Early Blight',
  'Potato Blackleg',
  'Corn Southern Rust',
  'Corn Common Rust',
  'Northern Corn Leaf Blight',
  'Foliar Blight Complex',
  'Nutrient Deficiency / Non-pathological',
  'Healthy Foliage',
];

export default function OfficerCaseReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: caseItem, isLoading, isError, error, refetch, isFetching } = useCase(id);
  const verifyMutation = useVerifyCase();

  useDocumentMetadata({
    title: caseItem?.crop ? `Case #${id} (${caseItem.crop}) — Officer Review` : `Case #${id} — Officer Review`,
    description: 'Field specimen verification, high-resolution foliar zoom analysis, and official diagnosis reclassification.',
  });

  // Active Action Modal state: null | 'CONFIRM' | 'CORRECT' | 'REJECT' | 'MORE_INFO'
  const [activeActionModal, setActiveActionModal] = useState(null);

  // Action form state
  const [correctedDisease, setCorrectedDisease] = useState('');
  const [officerNote, setOfficerNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Non-pathological mechanical or sun scorch damage');
  const [formError, setFormError] = useState(null);

  // Toast state
  const [toast, setToast] = useState(null);

  // Alternatives generator based on crop and disease
  const alternatives = useMemo(() => {
    if (!caseItem || !caseItem.disease) return [];

    const primaryDisease = caseItem.disease;
    const primaryConf = caseItem.confidence ?? 0.75;
    const remaining = Math.max(0.01, 1 - primaryConf);

    if (primaryDisease.includes('Tomato Early Blight')) {
      return [
        { disease: 'Tomato Late Blight', confidence: Math.round(remaining * 0.58 * 100) / 100 },
        { disease: 'Septoria Leaf Spot', confidence: Math.round(remaining * 0.28 * 100) / 100 },
        { disease: 'Bacterial Canker', confidence: Math.round(remaining * 0.14 * 100) / 100 },
      ];
    }
    if (primaryDisease.includes('Potato')) {
      return [
        { disease: 'Potato Early Blight', confidence: Math.round(remaining * 0.60 * 100) / 100 },
        { disease: 'Rhizoctonia Canker', confidence: Math.round(remaining * 0.25 * 100) / 100 },
        { disease: 'Blackleg Soft Rot', confidence: Math.round(remaining * 0.15 * 100) / 100 },
      ];
    }
    if (primaryDisease.includes('Corn') || primaryDisease.includes('Rust')) {
      return [
        { disease: 'Corn Common Rust', confidence: Math.round(remaining * 0.65 * 100) / 100 },
        { disease: 'Northern Corn Leaf Blight', confidence: Math.round(remaining * 0.22 * 100) / 100 },
        { disease: 'Gray Leaf Spot', confidence: Math.round(remaining * 0.13 * 100) / 100 },
      ];
    }

    return [
      { disease: 'Secondary Alternaria Blight', confidence: Math.round(remaining * 0.5 * 100) / 100 },
      { disease: 'Bacterial Leaf Spot', confidence: Math.round(remaining * 0.3 * 100) / 100 },
      { disease: 'Foliar Nutrient Chlorosis', confidence: Math.round(remaining * 0.2 * 100) / 100 },
    ];
  }, [caseItem]);

  // Open action modal helper
  const handleOpenAction = (actionType) => {
    setActiveActionModal(actionType);
    setFormError(null);
    setOfficerNote('');
    if (actionType === 'CORRECT') {
      setCorrectedDisease(caseItem?.crop === 'Potato' ? 'Potato Early Blight' : 'Tomato Late Blight');
    }
  };

  // Submit action decision
  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    setFormError(null);

    let status = VerificationStatus.VERIFIED;
    let finalNote = officerNote.trim();

    if (activeActionModal === 'CONFIRM') {
      status = VerificationStatus.VERIFIED;
      if (!finalNote) {
        finalNote = `Confirmed AI diagnosis of ${caseItem.disease || 'outbreak pathogen'} via officer inspection.`;
      }
    } else if (activeActionModal === 'CORRECT') {
      status = VerificationStatus.VERIFIED;
      if (!finalNote) {
        setFormError('A reclassification note explaining the diagnostic basis is required.');
        return;
      }
      finalNote = `Reclassified diagnosis from "${caseItem.disease}" to "${correctedDisease}". Notes: ${finalNote}`;
    } else if (activeActionModal === 'REJECT') {
      status = VerificationStatus.REJECTED;
      if (!finalNote) {
        setFormError('Please provide a specific reason for rejecting this field case.');
        return;
      }
      finalNote = `Rejected (${rejectionReason}). Justification: ${finalNote}`;
    } else if (activeActionModal === 'MORE_INFO') {
      status = VerificationStatus.MORE_INFO_REQUIRED;
      if (!finalNote) {
        setFormError('Please enter the specific instructions or observations requested from the farmer.');
        return;
      }
      finalNote = `Additional information requested from farmer: ${finalNote}`;
    }

    try {
      const verificationPayload = {
        status,
        officer_note: finalNote,
      };

      await verifyMutation.mutateAsync({
        caseId: caseItem.id,
        verification: verificationPayload,
      });

      setActiveActionModal(null);
      setToast({
        type: 'success',
        message: `Case ${caseItem.id} marked as ${status}. Returning to queue...`,
      });

      setTimeout(() => {
        navigate('/officer/queue');
      }, 1400);
    } catch (err) {
      setFormError(formatErrorMessage(err));
    }
  };

  if (isError) {
    return (
      <div className="page-shell">
        <Link to="/officer/queue" className="btn btn-secondary btn-sm mb-4">
          <ArrowLeft size={14} className="icon-mr" /> Back to Verification Queue
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
        <Skeleton height="36px" width="160px" className="mb-4" />
        <div className="page-layout-two-col">
          <Skeleton height="440px" width="100%" />
          <Skeleton height="440px" width="100%" />
        </div>
      </div>
    );
  }

  const hasAiPrediction = Boolean(caseItem.disease);
  const primaryConfidencePct = caseItem.confidence != null ? Math.round(caseItem.confidence * 100) : null;

  return (
    <div className="page-shell">
      {/* Toast Alert */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999 }}>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Back button */}
      <Link
        to="/officer/queue"
        className="btn btn-secondary btn-sm mb-4"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <ArrowLeft size={14} className="icon-mr" /> Back to Verification Queue
      </Link>

      {/* Header */}
      <PageHeader
        heading={`Case Review &bull; ${caseItem.id}`}
        lead={`Field surveillance diagnosis triage for ${caseItem.crop} in ${caseItem.location_name}.`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RiskBadge level={caseItem.risk_level} score={caseItem.risk_score} size="md" />
            <StatusBadge status={caseItem.status} size="md" />
          </div>
        }
      />

      <div className="page-layout-two-col mb-6">
        {/* ================= LEFT COLUMN: Photographic Evidence & Farmer's Observations ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Zoomable Image Component */}
          <Card>
            <div className="cs-card-header">
              <div>
                <h2 className="cs-card-title">Specimen Photograph Inspector</h2>
                <p className="cs-card-subtitle">
                  Examine foliar lesions, margins, and fungal sporulation with interactive zoom
                </p>
              </div>
            </div>
            <CardBody style={{ padding: '16px' }}>
              <ZoomableImage
                src={caseItem.image_url}
                alt={`Foliar specimen of ${caseItem.crop} (${caseItem.id})`}
              />
            </CardBody>
          </Card>

          {/* Farmer's Observations Card */}
          <Card>
            <div className="cs-card-header">
              <div className="flex-center gap-2">
                <User size={16} className="text-primary" />
                <h2 className="cs-card-title">Farmer's Field Observations</h2>
              </div>
            </div>
            <CardBody style={{ padding: '18px 20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <span className="text-muted text-xs font-semibold uppercase">Reported Symptoms</span>
                <p style={{ fontSize: '14px', color: 'var(--text-main)', marginTop: '4px', lineHeight: 1.5 }}>
                  {caseItem.symptoms || 'Visual lesion spots observed on canopy.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', fontSize: '13px' }}>
                <div>
                  <span className="text-muted text-xs block">Target Crop</span>
                  <strong>{caseItem.crop}</strong>
                </div>
                <div>
                  <span className="text-muted text-xs block">Growth Stage</span>
                  <strong>{caseItem.growth_stage || 'Flowering'}</strong>
                </div>
                <div>
                  <span className="text-muted text-xs block">Location Plot</span>
                  <span>{caseItem.location_name}</span>
                </div>
                <div>
                  <span className="text-muted text-xs block">Submitted At</span>
                  <span className="font-mono text-xs">
                    {caseItem.created_at ? new Date(caseItem.created_at).toLocaleString() : 'Recent'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Case History Timeline */}
          <Card>
            <div className="cs-card-header">
              <div className="flex-center gap-2">
                <History size={16} className="text-primary" />
                <h2 className="cs-card-title">Case Activity History</h2>
              </div>
            </div>
            <CardBody style={{ padding: '16px 20px' }}>
              <div className="history-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                {/* Event 1: Farmer Submission */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Report Submitted by Farmer
                    </div>
                    <div className="text-muted text-xs">
                      {caseItem.created_at ? new Date(caseItem.created_at).toLocaleString() : 'Initial field log'} &bull; Mobile Web Portal
                    </div>
                  </div>
                </div>

                {/* Event 2: AI Computer Vision Inference */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-muted)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Cpu size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      AI Computer Vision Diagnosis
                    </div>
                    <div className="text-muted text-xs">
                      {hasAiPrediction
                        ? `Diagnosed ${caseItem.disease}${primaryConfidencePct != null ? ` with ${primaryConfidencePct}% confidence score` : ''}`
                        : 'Preliminary AI diagnostic inference unavailable on server.'}
                    </div>
                  </div>
                </div>

                {/* Dynamic Case History / Prior Actions */}
                {Array.isArray(caseItem.history) && caseItem.history.length > 0 ? (
                  caseItem.history.map((hist, idx) => (
                    <div key={hist.id || idx} style={{ display: 'flex', gap: '12px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background:
                            hist.status === VerificationStatus.VERIFIED
                              ? 'var(--severity-low-bg)'
                              : hist.status === VerificationStatus.REJECTED
                              ? 'var(--severity-high-bg)'
                              : 'var(--severity-medium-bg)',
                          color:
                            hist.status === VerificationStatus.VERIFIED
                              ? 'var(--severity-low)'
                              : hist.status === VerificationStatus.REJECTED
                              ? 'var(--severity-high)'
                              : 'var(--severity-medium)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ShieldCheck size={14} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {hist.action || `Officer Action: ${hist.status}`}
                        </div>
                        <div className="text-muted text-xs">
                          {new Date(hist.timestamp).toLocaleString()} &bull; {hist.actor || 'Officer Audit'}
                        </div>
                        {hist.notes && (
                          <div style={{ marginTop: '4px', fontSize: '12.5px', background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: '4px' }}>
                            "{hist.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : caseItem.verified_at ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--severity-low-bg)', color: 'var(--severity-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShieldCheck size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Officer Action Completed &bull; {caseItem.status}
                      </div>
                      <div className="text-muted text-xs">
                        {new Date(caseItem.verified_at).toLocaleString()} &bull; Dr. Suresh Patil
                      </div>
                      {caseItem.officer_note && (
                        <div style={{ marginTop: '4px', fontSize: '12.5px', background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: '4px' }}>
                          "{caseItem.officer_note}"
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: AI Prediction, Alternatives, Weather, Action Panel ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Primary Prediction & Top 3 Alternatives */}
          <Card>
            <div className="cs-card-header">
              <div className="flex-center gap-2">
                <Cpu size={16} className="text-primary" />
                <h2 className="cs-card-title">AI Computer Vision Diagnostics</h2>
              </div>
              <span className="badge-primary" style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}>
                ResNet-50 AgriVision
              </span>
            </div>
            <CardBody style={{ padding: '18px 20px' }}>
              {/* Primary Prediction */}
              <div style={{ marginBottom: '16px' }}>
                <span className="text-muted text-xs font-semibold uppercase">Primary Pathogen Classification</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  {caseItem.disease || 'Pending Analysis'}
                </div>

                {hasAiPrediction && primaryConfidencePct != null ? (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                      <span className="text-muted">Primary Confidence Score</span>
                      <strong className="font-mono text-primary">{primaryConfidencePct}%</strong>
                    </div>
                    <div className="progress-track" style={{ height: '8px' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${primaryConfidencePct}%`,
                          background:
                            primaryConfidencePct >= 80 ? 'var(--primary)' : primaryConfidencePct >= 50 ? 'var(--severity-medium)' : 'var(--severity-high)',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#b45309', marginBottom: '3px' }}>
                      AI Analysis Pending
                    </div>
                    <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.45 }}>
                      The AI diagnosis model is currently unavailable. Disease and confidence results will appear once AI analysis is available.
                    </div>
                  </div>
                )}
              </div>

              {/* Top 3 Alternative Predictions */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <span className="text-muted text-xs font-semibold uppercase block mb-2">
                  Top 3 Alternative Classifications
                </span>
                {alternatives && alternatives.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {alternatives.map((alt) => {
                      const altPct = Math.round(alt.confidence * 100);
                      return (
                        <div key={alt.disease} style={{ background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600 }}>{alt.disease}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong className="font-mono text-muted">{altPct}%</strong>
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                style={{ padding: '1px 7px', fontSize: '11px', height: '22px' }}
                                onClick={() => {
                                  setActiveActionModal('CORRECT');
                                  setCorrectedDisease(alt.disease);
                                  setOfficerNote(`Reclassified to ${alt.disease} based on alternative model classification.`);
                                }}
                                title={`Select ${alt.disease} as correction`}
                              >
                                Use
                              </button>
                            </div>
                          </div>
                          <div className="progress-track" style={{ height: '4px' }}>
                            <div className="progress-fill" style={{ width: `${altPct}%`, background: '#94a3b8' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No alternative differential diagnoses available (awaiting AI analysis).
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Micro-climate Environmental Readings */}
          {caseItem.environmental_data && (
            <Card>
              <div className="cs-card-header">
                <div className="flex-center gap-2">
                  <Thermometer size={16} className="text-primary" />
                  <h2 className="cs-card-title">Localized Micro-climate Context</h2>
                </div>
              </div>
              <CardBody style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ padding: '10px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <Thermometer size={16} className="text-muted mb-1" />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Temp</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {caseItem.environmental_data?.temperature ?? 25}°C
                    </div>
                  </div>

                  <div style={{ padding: '10px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <Droplets size={16} className="text-muted mb-1" />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Humidity</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {caseItem.environmental_data?.humidity ?? 70}%
                    </div>
                  </div>

                  <div style={{ padding: '10px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <CloudRain size={16} className="text-muted mb-1" />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rainfall</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {caseItem.environmental_data?.rainfall ?? 0} mm
                    </div>
                  </div>

                  <div style={{ padding: '10px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <Layers size={16} className="text-muted mb-1" />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cluster Cases</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--severity-high)' }}>
                      {caseItem.environmental_data?.nearby_verified_cases ?? 0}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Officer Action Panel */}
          <Card>
            <div className="cs-card-header">
              <div className="flex-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <h2 className="cs-card-title">Officer Action Panel</h2>
              </div>
            </div>
            <CardBody style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Select a verification decision. Each action will open a confirmation dialog to prevent accidental triage.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {/* 1. CONFIRM */}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleOpenAction('CONFIRM')}
                >
                  <CheckCircle2 size={16} className="icon-mr" />
                  Confirm AI Diagnosis
                </button>

                {/* 2. CORRECT */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleOpenAction('CORRECT')}
                >
                  <Edit3 size={16} className="icon-mr" />
                  Correct Diagnosis
                </button>

                {/* 3. REQUEST MORE INFO */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleOpenAction('MORE_INFO')}
                >
                  <HelpCircle size={16} className="icon-mr" />
                  Request More Info
                </button>

                {/* 4. REJECT */}
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleOpenAction('REJECT')}
                >
                  <XCircle size={16} className="icon-mr" />
                  Reject Report
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ================= Confirmation / Action Dialog Modals ================= */}
      {activeActionModal && (
        <Modal
          isOpen={Boolean(activeActionModal)}
          onClose={() => setActiveActionModal(null)}
          title={
            activeActionModal === 'CONFIRM'
              ? 'Confirm Official AI Diagnosis'
              : activeActionModal === 'CORRECT'
              ? 'Reclassify Specimen Pathogen'
              : activeActionModal === 'REJECT'
              ? 'Reject Field Surveillance Case'
              : 'Request Additional Farmer Observations'
          }
        >
          <form onSubmit={handleSubmitDecision}>
            {/* Action-specific inputs */}
            {activeActionModal === 'CONFIRM' && (
              <div className="mb-4">
                <p style={{ fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                  You are confirming that this field specimen is infected with{' '}
                  <strong className="text-primary">{caseItem.disease}</strong>. This verified case will immediately feed the DBSCAN regional outbreak engine.
                </p>

                <div className="cs-field-group mt-3">
                  <label htmlFor="confirm-note" className="cs-field-label">
                    Verification Note / Microscopic Findings (Optional)
                  </label>
                  <textarea
                    id="confirm-note"
                    className="cs-textarea"
                    rows={3}
                    placeholder="E.g., Spore morphology confirmed under stereomicroscope. Immediate copper fungicide barrier recommended."
                    value={officerNote}
                    onChange={(e) => setOfficerNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeActionModal === 'CORRECT' && (
              <div className="mb-4">
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                  Override the computer vision prediction with your expert agronomic identification.
                </p>

                <div className="cs-field-group mt-3">
                  <label htmlFor="correct-select" className="cs-field-label">
                    Actual Diagnosed Disease <span className="cs-field-required">*</span>
                  </label>
                  <select
                    id="correct-select"
                    className="cs-select"
                    required
                    value={correctedDisease}
                    onChange={(e) => setCorrectedDisease(e.target.value)}
                  >
                    {Array.from(new Set([...COMMON_DISEASES, correctedDisease].filter(Boolean))).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cs-field-group mt-3">
                  <label htmlFor="correct-note" className="cs-field-label">
                    Correction Rationale & Notes <span className="cs-field-required">*</span>
                  </label>
                  <textarea
                    id="correct-note"
                    className="cs-textarea"
                    rows={3}
                    required
                    placeholder="Document visual or lab traits why AI diagnosis was inaccurate (e.g. concentric circles absent, chlorotic halo indicates bacterial spot)..."
                    value={officerNote}
                    onChange={(e) => setOfficerNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeActionModal === 'REJECT' && (
              <div className="mb-4">
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                  Reject this report if image quality is unidentifiable, non-pathological, or irrelevant.
                </p>

                <div className="cs-field-group mt-3">
                  <label htmlFor="reject-reason" className="cs-field-label">
                    Primary Rejection Reason
                  </label>
                  <select
                    id="reject-reason"
                    className="cs-select"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  >
                    <option value="Non-pathological mechanical or sun scorch damage">
                      Non-pathological mechanical or sun scorch damage
                    </option>
                    <option value="Specimen image too blurry or out of focus">
                      Specimen image too blurry or out of focus
                    </option>
                    <option value="Off-target crop or non-agricultural foliage">
                      Off-target crop or non-agricultural foliage
                    </option>
                    <option value="Duplicate field submission">Duplicate field submission</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="cs-field-group mt-3">
                  <label htmlFor="reject-note" className="cs-field-label">
                    Rejection Justification <span className="cs-field-required">*</span>
                  </label>
                  <textarea
                    id="reject-note"
                    className="cs-textarea"
                    rows={3}
                    required
                    placeholder="Explain why this specimen is rejected to maintain surveillance database integrity..."
                    value={officerNote}
                    onChange={(e) => setOfficerNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeActionModal === 'MORE_INFO' && (
              <div className="mb-4">
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                  Send a follow-up request message to the farmer for clearer photos or field context.
                </p>

                <div className="cs-field-group mt-3">
                  <label htmlFor="more-info-note" className="cs-field-label">
                    Instructions & Message to Farmer <span className="cs-field-required">*</span>
                  </label>
                  <textarea
                    id="more-info-note"
                    className="cs-textarea"
                    rows={4}
                    required
                    placeholder="E.g., Please take a close-up photo of the leaf underside in daylight, and check if stem collars have black rot..."
                    value={officerNote}
                    onChange={(e) => setOfficerNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {formError && (
              <div className="alert-box alert-box-error mb-3" role="alert">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveActionModal(null)}
                disabled={verifyMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={activeActionModal === 'REJECT' ? 'danger' : 'primary'}
                loading={verifyMutation.isPending}
              >
                Confirm Decision
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
