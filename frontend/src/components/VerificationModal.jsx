import { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, X, ShieldAlert, AlertCircle } from 'lucide-react';
import { VerificationStatus } from '../types/enums';
import { verifyCase } from '../api/cases';
import RiskBadge from './RiskBadge';

export default function VerificationModal({ caseItem, onClose, onVerified }) {
  const [selectedStatus, setSelectedStatus] = useState(VerificationStatus.VERIFIED);
  const [officerNote, setOfficerNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!caseItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!officerNote.trim()) {
      setErrorMessage('Officer review note is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updatedCase = await verifyCase(caseItem.id, {
        status: selectedStatus,
        officer_note: officerNote.trim(),
      });
      if (onVerified) {
        onVerified(updatedCase);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit verification review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldAlert className="modal-icon text-amber" />
            <div>
              <h2 id="modal-title" className="modal-title">Officer Verification Review</h2>
              <p className="modal-subtitle">Case ID: <code>{caseItem.id}</code></p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Case Snapshot */}
            <div className="case-snapshot-box">
              <div className="snapshot-row">
                <span className="snapshot-label">Crop & Stage:</span>
                <span className="snapshot-value">
                  <strong>{caseItem.crop}</strong> &bull; {caseItem.growth_stage}
                </span>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-label">Location:</span>
                <span className="snapshot-value">{caseItem.location_name}</span>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-label">AI Diagnosis:</span>
                <span className="snapshot-value font-mono">
                  {caseItem.disease || 'Pending analysis'}
                  {caseItem.confidence && ` (${Math.round(caseItem.confidence * 100)}% conf.)`}
                </span>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-label">Risk Assessment:</span>
                <span className="snapshot-value">
                  <RiskBadge level={caseItem.risk_level} score={caseItem.risk_score} size="sm" />
                </span>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-label">Reported Symptoms:</span>
                <span className="snapshot-value snapshot-symptoms">{caseItem.symptoms}</span>
              </div>
            </div>

            {/* Verification Decision Radios / Buttons */}
            <div className="form-group">
              <label className="form-label">
                Verification Decision <span className="text-danger">*</span>
              </label>
              <div className="decision-grid">
                <button
                  type="button"
                  className={`decision-option decision-verify ${
                    selectedStatus === VerificationStatus.VERIFIED ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedStatus(VerificationStatus.VERIFIED)}
                >
                  <CheckCircle2 size={18} />
                  <div className="decision-text">
                    <span className="decision-heading">Verify Outbreak</span>
                    <span className="decision-sub">Confirmed pathogen; contributes to DBSCAN cluster</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`decision-option decision-reject ${
                    selectedStatus === VerificationStatus.REJECTED ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedStatus(VerificationStatus.REJECTED)}
                >
                  <XCircle size={18} />
                  <div className="decision-text">
                    <span className="decision-heading">Reject Case</span>
                    <span className="decision-sub">Benign damage, nutrient deficiency, or false alarm</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`decision-option decision-info ${
                    selectedStatus === VerificationStatus.MORE_INFO_REQUIRED ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedStatus(VerificationStatus.MORE_INFO_REQUIRED)}
                >
                  <HelpCircle size={18} />
                  <div className="decision-text">
                    <span className="decision-heading">More Info Required</span>
                    <span className="decision-sub">Request leaf underside photo or sample lab testing</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Officer Note */}
            <div className="form-group">
              <label htmlFor="officer-note" className="form-label">
                Officer Notes & Justification <span className="text-danger">*</span>
              </label>
              <textarea
                id="officer-note"
                className="form-textarea"
                rows={3}
                maxLength={2000}
                required
                placeholder="Detail observations, microscopic confirmation, fungicide recommendation, or reasons for rejection..."
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
              />
              <div className="char-count">
                {officerNote.length} / 2000 characters (min 1 required)
              </div>
            </div>

            {errorMessage && (
              <div className="form-error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !officerNote.trim()}
            >
              {isSubmitting ? 'Submitting Review...' : `Submit as ${selectedStatus}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
