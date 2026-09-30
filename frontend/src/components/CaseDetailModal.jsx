import {
  X,
  MapPin,
  Calendar,
  CheckCircle,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import RiskBadge from './RiskBadge';

export default function CaseDetailModal({ caseItem, onClose, onVerifyClick }) {
  if (!caseItem) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="case-modal-title">
      <div className="modal-dialog modal-dialog-lg">
        <div className="modal-header">
          <div>
            <h2 id="case-modal-title" className="modal-title">
              {caseItem.crop} &mdash; Investigation Details
            </h2>
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

        <div className="modal-body">
          <div className="detail-two-col">
            {/* Left: Media & Location */}
            <div className="detail-media-pane">
              {caseItem.image_url ? (
                <div className="detail-photo-frame">
                  <img
                    src={caseItem.image_url}
                    alt={`Affected ${caseItem.crop}`}
                    className="detail-photo-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML =
                        '<div class="photo-placeholder"><span class="text-sm text-muted">Image unavailable</span></div>';
                    }}
                  />
                </div>
              ) : (
                <div className="photo-placeholder">
                  <ImageIcon size={32} className="text-muted mb-2" />
                  <span className="text-sm text-muted">No photo uploaded</span>
                </div>
              )}

              <div className="meta-card-clean">
                <div className="meta-row">
                  <MapPin size={15} className="text-muted flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted block">Location</span>
                    <strong className="text-sm text-main">{caseItem.location_name}</strong>
                    <div className="text-xs font-mono text-muted">
                      {caseItem.latitude.toFixed(4)}°N, {caseItem.longitude.toFixed(4)}°E
                    </div>
                  </div>
                </div>

                <div className="meta-row">
                  <Calendar size={15} className="text-muted flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted block">Submitted</span>
                    <span className="text-sm font-mono">
                      {caseItem.created_at ? new Date(caseItem.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {caseItem.verified_at && (
                  <div className="meta-row">
                    <CheckCircle size={15} className="text-primary flex-shrink-0" />
                    <div>
                      <span className="text-xs text-muted block">Verified</span>
                      <span className="text-sm font-mono">
                        {new Date(caseItem.verified_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: AI Analysis & Lifecycle */}
            <div className="detail-info-pane">
              <div className="status-summary-strip">
                <div>
                  <span className="text-xs text-muted block mb-1">Status</span>
                  <StatusBadge status={caseItem.status} size="md" />
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Risk</span>
                  <RiskBadge level={caseItem.risk_level} score={caseItem.risk_score} size="md" />
                </div>
              </div>

              {/* AI Inference Card */}
              <div className="clean-section-card">
                <div className="section-card-title">AI Diagnostics</div>
                <div className="text-lg font-bold text-main mt-1">
                  {caseItem.disease || 'Pending Analysis'}
                </div>

                {caseItem.confidence !== null && caseItem.confidence !== undefined && (
                  <div className="mt-2">
                    <div className="flex-between text-xs text-muted mb-1">
                      <span>Confidence</span>
                      <strong>{Math.round(caseItem.confidence * 100)}%</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round(caseItem.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {caseItem.risk_score !== null && caseItem.risk_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex-between text-xs text-muted mb-1">
                      <span>Outbreak Vulnerability Score</span>
                      <strong>{Math.round(caseItem.risk_score)} / 100</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill progress-${(caseItem.risk_level || 'low').toLowerCase()}`}
                        style={{ width: `${Math.min(100, Math.round(caseItem.risk_score))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Symptoms */}
              <div className="clean-section-card">
                <div className="section-card-title flex-center gap-1">
                  <FileText size={14} className="text-muted" />
                  <span>Reported Symptoms</span>
                </div>
                <p className="symptoms-body mt-1">{caseItem.symptoms}</p>
              </div>

              {/* Officer Note */}
              {caseItem.officer_note && (
                <div className="clean-section-card officer-note-highlight">
                  <div className="section-card-title text-amber">Officer Verification Note</div>
                  <p className="symptoms-body mt-1 italic">{caseItem.officer_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {onVerifyClick && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onVerifyClick(caseItem);
              }}
            >
              Verify / Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
