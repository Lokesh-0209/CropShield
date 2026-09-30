import { useState } from 'react';
import {
  Upload,
  ArrowRight,
  CheckCircle2,
  Thermometer,
  Droplets,
  CloudRain,
  RotateCcw,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useSubmitCase } from '../services/queries';
import { formatErrorMessage } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';

const PRESET_CASES = [
  {
    name: 'Tomato Early Blight',
    crop: 'Tomato',
    growth_stage: 'Fruiting',
    location_name: 'Kolar Agro Sector 4, Karnataka',
    latitude: 13.1368,
    longitude: 78.1348,
    symptoms:
      'Dark concentric brown lesions on mature lower leaves surrounded by yellow chlorotic margins. Spreading rapidly after rain.',
    image_url:
      'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80',
    temp: 26.5,
    humidity: 78.0,
    rainfall: 12.0,
  },
  {
    name: 'Potato Late Blight',
    crop: 'Potato',
    growth_stage: 'Tuber Growth',
    location_name: 'Hassan Farm 12, Karnataka',
    latitude: 13.0033,
    longitude: 76.1004,
    symptoms:
      'Water-soaked dark lesions on leaf tips with pale borders and wilting during damp morning hours.',
    image_url:
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    temp: 21.0,
    humidity: 88.0,
    rainfall: 24.0,
  },
  {
    name: 'Corn Southern Rust',
    crop: 'Corn (Maize)',
    growth_stage: 'Silking',
    location_name: 'Dharwad Basin Block C',
    latitude: 15.4589,
    longitude: 75.0078,
    symptoms:
      'Dense golden-cinnamon pustules scattered across upper leaf surfaces causing premature drying.',
    image_url:
      'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
    temp: 29.0,
    humidity: 65.0,
    rainfall: 4.5,
  },
];

export default function FarmerSubmissionPage({ onCaseCreated, onNavigateToOfficer }) {
  const [formData, setFormData] = useState({
    crop: 'Tomato',
    growth_stage: 'Flowering',
    location_name: 'Kolar Agro Sector 4',
    latitude: 13.1368,
    longitude: 78.1348,
    symptoms: 'Concentric dark target-spot lesions on mature lower leaves surrounded by yellow chlorotic margins.',
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80',
  });

  const [weatherData, setWeatherData] = useState({
    temperature: 26.5,
    humidity: 78.0,
    rainfall: 12.0,
  });

  const [showEnvironmental, setShowEnvironmental] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('idle'); // 'idle' | 'saving_case' | 'analyzing' | 'done' | 'error'
  const [analyzedCase, setAnalyzedCase] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const submitMutation = useSubmitCase();

  const applyPreset = (preset) => {
    setFormData({
      crop: preset.crop,
      growth_stage: preset.growth_stage,
      location_name: preset.location_name,
      latitude: preset.latitude,
      longitude: preset.longitude,
      symptoms: preset.symptoms,
      image_url: preset.image_url,
    });
    setWeatherData({
      temperature: preset.temp,
      humidity: preset.humidity,
      rainfall: preset.rainfall,
    });
    setAnalyzedCase(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setAnalyzedCase(null);

    try {
      setSubmittingStep('saving_case');
      const casePayload = {
        crop: formData.crop.trim(),
        growth_stage: formData.growth_stage.trim(),
        location_name: formData.location_name.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        symptoms: formData.symptoms.trim(),
        image_url: formData.image_url.trim() ? formData.image_url.trim() : null,
        temperature: parseFloat(weatherData.temperature) || 25.0,
        humidity: parseFloat(weatherData.humidity) || 70.0,
        rainfall: parseFloat(weatherData.rainfall) || 0.0,
      };

      setSubmittingStep('analyzing');
      const fullAnalysisResult = await submitMutation.mutateAsync(casePayload);
      setAnalyzedCase(fullAnalysisResult);
      setSubmittingStep('done');

      if (onCaseCreated) {
        onCaseCreated(fullAnalysisResult);
      }
    } catch (err) {
      setSubmittingStep('error');
      setErrorMessage(formatErrorMessage(err));
    }
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader
        heading="Submit Case"
        lead="Record crop disease symptoms and field photos for AI diagnostics and risk assessment."
        actions={
          <div className="quick-presets">
            <span className="presets-caption">Load sample:</span>
            <div className="presets-pill-group">
              {PRESET_CASES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="preset-chip"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="page-layout-two-col">
        {/* Left Column: Form */}
        <div className="panel form-panel">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="crop" className="field-label">
                  Crop Species <span className="req">*</span>
                </label>
                <input
                  id="crop"
                  type="text"
                  className="field-input"
                  required
                  placeholder="e.g. Tomato, Potato, Corn"
                  value={formData.crop}
                  onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label htmlFor="growth_stage" className="field-label">
                  Growth Stage <span className="req">*</span>
                </label>
                <input
                  id="growth_stage"
                  type="text"
                  className="field-input"
                  required
                  placeholder="e.g. Flowering, Fruiting, Silking"
                  value={formData.growth_stage}
                  onChange={(e) => setFormData({ ...formData, growth_stage: e.target.value })}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="location_name" className="field-label">
                Location Name <span className="req">*</span>
              </label>
              <input
                id="location_name"
                type="text"
                className="field-input"
                required
                placeholder="Village / Sector, District"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              />
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="latitude" className="field-label">
                  Latitude <span className="req">*</span>
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  className="field-input font-mono"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label htmlFor="longitude" className="field-label">
                  Longitude <span className="req">*</span>
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  className="field-input font-mono"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="symptoms" className="field-label">
                Visible Symptoms & Observations <span className="req">*</span>
              </label>
              <textarea
                id="symptoms"
                className="field-textarea"
                rows={3}
                required
                placeholder="Describe leaf lesions, pustules, wilting, color changes..."
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              />
            </div>

            {/* Photo Attachment URL */}
            <div className="field-group">
              <label htmlFor="image_url" className="field-label">
                Field Photo Attachment
              </label>
              <div className="image-upload-wrapper">
                <div className="upload-input-row">
                  <Upload size={16} className="upload-icon-left text-muted" aria-hidden="true" />
                  <input
                    id="image_url"
                    type="url"
                    className="field-input-clean"
                    placeholder="Enter image URL (e.g. https://...)"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                  />
                </div>

                {formData.image_url && (
                  <div className="image-preview-box">
                    <img
                      src={formData.image_url}
                      alt="Crop leaf preview for disease diagnosis"
                      className="image-preview-thumb"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="image-preview-meta">
                      <span className="text-xs text-muted">Field photo attached</span>
                      <button
                        type="button"
                        className="btn-link-xs"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                      >
                        Clear photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Environmental Parameters */}
            <div className="collapsible-section">
              <button
                type="button"
                className="collapsible-toggle"
                onClick={() => setShowEnvironmental(!showEnvironmental)}
                aria-expanded={showEnvironmental}
              >
                <div className="flex-center gap-2">
                  <span className="toggle-title">Environmental Context (Optional)</span>
                  <span className="toggle-badge">Weather & Micro-climate</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`toggle-chevron ${showEnvironmental ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {showEnvironmental && (
                <div className="collapsible-body animate-fade-in">
                  <p className="field-hint mb-3">
                    These parameters are fed into the deterministic risk algorithm along with nearby disease pressure.
                  </p>
                  <div className="form-grid-3">
                    <div className="field-group mb-0">
                      <label htmlFor="temp" className="field-label-sm">
                        <Thermometer size={13} aria-hidden="true" /> Temp (°C)
                      </label>
                      <input
                        id="temp"
                        type="number"
                        step="0.5"
                        min="-50"
                        max="60"
                        className="field-input font-mono"
                        value={weatherData.temperature}
                        onChange={(e) =>
                          setWeatherData({
                            ...weatherData,
                            temperature: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="field-group mb-0">
                      <label htmlFor="humidity" className="field-label-sm">
                        <Droplets size={13} aria-hidden="true" /> Humidity (%)
                      </label>
                      <input
                        id="humidity"
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        className="field-input font-mono"
                        value={weatherData.humidity}
                        onChange={(e) =>
                          setWeatherData({
                            ...weatherData,
                            humidity: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="field-group mb-0">
                      <label htmlFor="rainfall" className="field-label-sm">
                        <CloudRain size={13} aria-hidden="true" /> Rainfall (mm)
                      </label>
                      <input
                        id="rainfall"
                        type="number"
                        step="0.5"
                        min="0"
                        max="1000"
                        className="field-input font-mono"
                        value={weatherData.rainfall}
                        onChange={(e) =>
                          setWeatherData({
                            ...weatherData,
                            rainfall: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-3">
                <ErrorState
                  title="Submission Failed"
                  message={errorMessage}
                  error={submitMutation.error}
                  onRetry={handleSubmit}
                />
              </div>
            )}

            {/* Prominent Primary CTA */}
            <div className="form-submit-row">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                block
                loading={submitMutation.isPending}
              >
                {submittingStep === 'saving_case' && 'Saving Case Report...'}
                {submittingStep === 'analyzing' && 'Running AI Diagnostics & Risk Assessment...'}
                {submittingStep !== 'saving_case' &&
                  submittingStep !== 'analyzing' &&
                  'Submit Case & Run Diagnosis'}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Clean Result Panel */}
        <div className="panel result-panel">
          {analyzedCase ? (
            <div className="result-card-inner animate-fade-in" aria-live="polite">
              <div className="result-badge-top">
                <CheckCircle2 size={16} className="text-primary" aria-hidden="true" />
                <span>Analysis Complete</span>
              </div>

              {/* Pathogen Card */}
              <div className="result-hero-box">
                <span className="result-section-label">Identified Pathogen</span>
                <h2 className="result-disease-heading">
                  {analyzedCase.disease || 'Unspecified Pathogen'}
                </h2>

                {analyzedCase.confidence !== null && (
                  <div className="result-confidence-wrap">
                    <div className="confidence-text-row">
                      <span>Model Confidence</span>
                      <strong>{Math.round(analyzedCase.confidence * 100)}%</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round(analyzedCase.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Evaluation */}
              <div className="result-risk-box">
                <div className="flex-between mb-2">
                  <span className="result-section-label">Outbreak Risk</span>
                  <RiskBadge
                    level={analyzedCase.risk_level}
                    score={analyzedCase.risk_score}
                    size="md"
                  />
                </div>

                <div className="risk-score-row">
                  <div className="score-big">{Math.round(analyzedCase.risk_score ?? 0)}</div>
                  <div className="score-denom">/ 100</div>
                  <span className="text-muted text-sm ml-auto">Composite Risk Score</span>
                </div>
              </div>

              {/* Case Metadata */}
              <div className="result-details-list">
                <div className="detail-item">
                  <span className="detail-key">Case Reference</span>
                  <code className="detail-code">{analyzedCase.id}</code>
                </div>
                <div className="detail-item">
                  <span className="detail-key">Crop & Stage</span>
                  <span className="detail-val">
                    {analyzedCase.crop} &bull; {analyzedCase.growth_stage}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-key">Status</span>
                  <StatusBadge status={analyzedCase.status} size="sm" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="result-actions">
                <Button
                  variant="primary"
                  size="md"
                  block
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={() => onNavigateToOfficer && onNavigateToOfficer(analyzedCase)}
                >
                  Review in Cases
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  block
                  icon={RotateCcw}
                  className="mt-2"
                  onClick={() => {
                    setAnalyzedCase(null);
                    setSubmittingStep('idle');
                  }}
                >
                  Submit Another Case
                </Button>
              </div>
            </div>
          ) : (
            <div className="result-empty-state">
              <div className="empty-icon-circle">
                <Sparkles size={26} className="text-primary" aria-hidden="true" />
              </div>
              <h3 className="empty-heading">Diagnostic Results</h3>
              <p className="empty-body">
                Fill out the case details on the left or click a sample scenario above, then submit to
                receive computer vision pathogen detection and epidemiological risk scoring.
              </p>
              <div className="empty-features-list">
                <div className="feature-row">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" aria-hidden="true" />
                  <span>Real-time computer vision disease inference</span>
                </div>
                <div className="feature-row">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" aria-hidden="true" />
                  <span>Deterministic micro-climate & density risk evaluation</span>
                </div>
                <div className="feature-row">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" aria-hidden="true" />
                  <span>Feeds verified clusters into regional outbreak warnings</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
