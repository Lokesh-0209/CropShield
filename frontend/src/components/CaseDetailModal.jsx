import {
  X,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileText,
  Layers,
  CheckCircle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import RiskBadge from './RiskBadge';

export default function CaseDetailModal({ caseItem, onClose, onVerifyClick }) {
  if (!caseItem) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="case-modal-title">
      <div className="modal-card modal-card-wide">
        <div className="modal-header">
          <div className="modal-title-group">
            <Layers className="modal-icon text-emerald" />
            <div>
              <h2 id="case-modal-title" className="modal-title">
                {caseItem.crop} &bull; Case Details
              </h2>
              <p className="modal-subtitle">ID: <code>{caseItem.id}</code></p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-grid">
            {/* Left Column: Image & Location */}
            <div className="detail-col-media">
              {caseItem.image_url ? (
                <div className="detail-image-box">
                  <img
                    src={caseItem.image_url}
                    alt={`Affected ${caseItem.crop}`}
                    className="detail-case-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML =
                        '<div class="image-fallback"><span>Image could not be loaded</span></div>';
                    }}
                  />
                </div>
              ) : (
                <div className="image-fallback">
                  <Sparkles size={28} className="text-muted" />
                  <span>No field photo attached</span>
                </div>
              )}

              <div className="detail-meta-box">
                <div className="meta-item">
                  <MapPin size={15} className="meta-icon text-muted" />
                  <div>
                    <div className="meta-label">Location</div>
                    <div className="meta-val">{caseItem.location_name}</div>
                    <div className="meta-sub font-mono">
                      {caseItem.latitude.toFixed(4)}°N, {caseItem.longitude.toFixed(4)}°E
                    </div>
                  </div>
                </div>

                <div className="meta-item">
                  <Calendar size={15} className="meta-icon text-muted" />
                  <div>
                    <div className="meta-label">Submitted At</div>
                    <div className="meta-val font-mono">
                      {caseItem.created_at
                        ? new Date(caseItem.created_at).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {caseItem.verified_at && (
                  <div className="meta-item">
                    <CheckCircle size={15} className="meta-icon text-emerald" />
                    <div>
                      <div className="meta-label">Verified At</div>
                      <div className="meta-val font-mono">
                        {new Date(caseItem.verified_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: AI Analysis & Lifecycle */}
            <div className="detail-col-info">
              <div className="status-banner-card">
                <div>
                  <div className="label-sm">Current Status</div>
                  <div className="mt-1">
                    <StatusBadge status={caseItem.status} size="lg" />
                  </div>
                </div>
                <div>
                  <div className="label-sm">Risk Classification</div>
                  <div className="mt-1">
                    <RiskBadge
                      level={caseItem.risk_level}
                      score={caseItem.risk_score}
                      size="lg"
                    />
                  </div>
                </div>
              </div>

              {/* AI Diagnosis Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <Sparkles size={16} className="text-emerald" />
                  <span>AI Computer Vision Inference</span>
                </div>
                <div className="info-card-content">
                  <div className="ai-diagnosis-row">
                    <span className="ai-label">Detected Pathogen:</span>
                    <strong className="ai-disease-name">
                      {caseItem.disease || 'Pending Analysis'}
                    </strong>
                  </div>
                  {caseItem.confidence !== null && caseItem.confidence !== undefined && (
                    <div className="confidence-meter-group">
                      <div className="confidence-label-row">
                        <span>Confidence Score</span>
                        <span>{Math.round(caseItem.confidence * 100)}%</span>
                      </div>
                      <div className="meter-bar">
                        <div
                          className="meter-fill"
                          style={{ width: `${Math.round(caseItem.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {caseItem.risk_score !== null && caseItem.risk_score !== undefined && (
                    <div className="confidence-meter-group mt-2">
                      <div className="confidence-label-row">
                        <span>Composite Outbreak Risk Score</span>
                        <span>{Math.round(caseItem.risk_score)} / 100</span>
                      </div>
                      <div className="meter-bar">
                        <div
                          className={`meter-fill meter-risk-${(caseItem.risk_level || 'low').toLowerCase()}`}
                          style={{ width: `${Math.min(100, Math.round(caseItem.risk_score))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Symptoms */}
              <div className="info-card">
                <div className="info-card-header">
                  <FileText size={16} className="text-muted" />
                  <span>Reported Symptoms</span>
                </div>
                <div className="info-card-content symptoms-text">
                  {caseItem.symptoms}
                </div>
              </div>

              {/* Officer Note */}
              {caseItem.officer_note && (
                <div className="info-card officer-note-card">
                  <div className="info-card-header">
                    <ShieldCheck size={16} className="text-amber" />
                    <span>Officer Verification Note</span>
                  </div>
                  <div className="info-card-content">
                    <p className="officer-note-text">{caseItem.officer_note}</p>
                  </div>
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
              <ShieldCheck size={16} className="icon-mr" />
              Review / Change Verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
