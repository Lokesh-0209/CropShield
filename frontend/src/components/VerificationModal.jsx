import { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, X, AlertCircle } from 'lucide-react';
import { VerificationStatus, verifyCase, formatErrorMessage } from '../services/api';
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
      setErrorMessage('Officer verification note is required.');
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
      setErrorMessage(formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">Verify Case</h2>
            <p className="modal-subtitle">Case ID: <code>{caseItem.id}</code></p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Case Snapshot */}
            <div className="summary-box">
              <div className="summary-row">
                <span className="summary-label">Crop & Growth Stage</span>
                <span className="summary-val font-semibold">
                  {caseItem.crop} &bull; {caseItem.growth_stage}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Field Location</span>
                <span className="summary-val">{caseItem.location_name}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">AI Diagnosis</span>
                <span className="summary-val">
                  <strong>{caseItem.disease || 'Unspecified'}</strong>
                  {caseItem.confidence && ` (${Math.round(caseItem.confidence * 100)}% conf.)`}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Assessed Risk</span>
                <span className="summary-val">
                  <RiskBadge level={caseItem.risk_level} score={caseItem.risk_score} size="sm" />
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Reported Symptoms</span>
                <span className="summary-val text-muted text-xs summary-symptoms">
                  {caseItem.symptoms}
                </span>
              </div>
            </div>

            {/* Decision Selection */}
            <div className="field-group">
              <label className="field-label">
                Officer Decision <span className="req">*</span>
              </label>
              <div className="decision-cards-stack">
                <button
                  type="button"
                  className={`decision-card ${
                    selectedStatus === VerificationStatus.VERIFIED ? 'decision-card-active' : ''
                  }`}
                  onClick={() => setSelectedStatus(VerificationStatus.VERIFIED)}
                >
                  <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                  <div className="decision-card-text">
                    <span className="decision-card-name">Verify Case</span>
                    <span className="decision-card-desc">
                      Confirmed disease. Case will be aggregated into spatial outbreak clusters.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`decision-card ${
                    selectedStatus === VerificationStatus.REJECTED ? 'decision-card-active active-danger' : ''
                  }`}
                  onClick={() => setSelectedStatus(VerificationStatus.REJECTED)}
                >
                  <XCircle size={18} className="text-danger flex-shrink-0" />
                  <div className="decision-card-text">
                    <span className="decision-card-name">Reject Case</span>
                    <span className="decision-card-desc">
                      Deemed benign, non-pathogenic, or a false alarm.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`decision-card ${
                    selectedStatus === VerificationStatus.MORE_INFO_REQUIRED ? 'decision-card-active active-warning' : ''
                  }`}
                  onClick={() => setSelectedStatus(VerificationStatus.MORE_INFO_REQUIRED)}
                >
                  <HelpCircle size={18} className="text-amber flex-shrink-0" />
                  <div className="decision-card-text">
                    <span className="decision-card-name">Request More Information</span>
                    <span className="decision-card-desc">
                      Request clearer leaf underside images or follow-up inspection.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Officer Note */}
            <div className="field-group">
              <label htmlFor="officer-note" className="field-label">
                Officer Review Notes <span className="req">*</span>
              </label>
              <textarea
                id="officer-note"
                className="field-textarea"
                rows={3}
                maxLength={2000}
                required
                placeholder="Document your observations, diagnosis confirmation, or instructions for the farmer..."
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
              />
              <div className="text-right text-xs text-muted mt-1">
                {officerNote.length} / 2000 characters
              </div>
            </div>

            {errorMessage && (
              <div className="alert-box alert-box-error" role="alert">
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
              {isSubmitting ? 'Saving...' : 'Submit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
