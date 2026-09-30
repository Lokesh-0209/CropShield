import { useState } from 'react';
import {
  Sprout,
  UploadCloud,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Droplets,
  CloudRain,
  RotateCcw,
} from 'lucide-react';
import { createCase, analyzeCase } from '../api/cases';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';

const PRESET_CASES = [
  {
    name: 'Tomato Early Blight (Kolar Zone)',
    crop: 'Tomato',
    growth_stage: 'Fruiting',
    location_name: 'Kolar Agro Cluster 4, Karnataka',
    latitude: 13.1368,
    longitude: 78.1348,
    symptoms:
      'Dark concentric brown lesions on lower mature leaves with chlorotic yellow halo. Stem lesions developing rapidly after seasonal rain.',
    image_url:
      'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80',
    temp: 26.5,
    humidity: 78.0,
    rainfall: 12.0,
  },
  {
    name: 'Potato Late Blight (Hassan)',
    crop: 'Potato',
    growth_stage: 'Tuber Initiation',
    location_name: 'Hassan Highland Farm 12, Karnataka',
    latitude: 13.0033,
    longitude: 76.1004,
    symptoms:
      'Water-soaked dark lesions on leaf tips with white fuzzy fungal growth on the underside during humid morning hours.',
    image_url:
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    temp: 21.0,
    humidity: 88.0,
    rainfall: 24.0,
  },
  {
    name: 'Corn Southern Rust (Dharwad)',
    crop: 'Corn (Maize)',
    growth_stage: 'Silking',
    location_name: 'Dharwad Agricultural Basin, Block C',
    latitude: 15.4589,
    longitude: 75.0078,
    symptoms:
      'Dense golden-cinnamon pustules scattered across upper leaf surfaces causing premature drying and lodging risk.',
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
    location_name: 'Kolar Agro Surveillance Sector 4',
    latitude: 13.1368,
    longitude: 78.1348,
    symptoms: 'Concentric dark target-spot lesions on mature lower leaves surrounded by yellow chlorotic margins.',
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80',
  });

  // Environmental inputs for the POST /api/cases/{case_id}/analyze step
  const [weatherData, setWeatherData] = useState({
    temperature: 26.5,
    humidity: 78.0,
    rainfall: 12.0,
  });

  const [submittingStep, setSubmittingStep] = useState('idle'); // 'idle' | 'saving_case' | 'analyzing' | 'done' | 'error'
  const [analyzedCase, setAnalyzedCase] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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
      // 1. Submit initial case report: POST /api/cases
      setSubmittingStep('saving_case');
      const casePayload = {
        crop: formData.crop.trim(),
        growth_stage: formData.growth_stage.trim(),
        location_name: formData.location_name.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        symptoms: formData.symptoms.trim(),
        image_url: formData.image_url.trim() ? formData.image_url.trim() : null,
      };

      const createdResponse = await createCase(casePayload);
      const caseId = createdResponse.id;

      // 2. Trigger AI + Risk Analysis: POST /api/cases/{case_id}/analyze
      setSubmittingStep('analyzing');
      const analysisPayload = {
        temperature: parseFloat(weatherData.temperature) || 25.0,
        humidity: parseFloat(weatherData.humidity) || 70.0,
        rainfall: parseFloat(weatherData.rainfall) || 0.0,
      };

      const fullAnalysisResult = await analyzeCase(caseId, analysisPayload);
      setAnalyzedCase(fullAnalysisResult);
      setSubmittingStep('done');

      if (onCaseCreated) {
        onCaseCreated(fullAnalysisResult);
      }
    } catch (err) {
      setSubmittingStep('error');
      setErrorMessage(err.message || 'An error occurred during submission or AI inference.');
    }
  };

  return (
    <div className="page-container">
      {/* Page Title & Intro */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <Sprout className="title-icon text-emerald" />
            Farmer Case Submission
          </h1>
          <p className="page-description">
            Report anomalous crop disease symptoms from the field. CropShield triggers real-time
            computer vision pathogen detection and epidemiological risk scoring.
          </p>
        </div>

        {/* Demo Quick Presets */}
        <div className="presets-box">
          <span className="presets-label">1-Click Hackathon Scenarios:</span>
          <div className="presets-btns">
            {PRESET_CASES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="btn-preset"
                onClick={() => applyPreset(preset)}
                title="Populate form with this realistic field report"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col-layout">
        {/* Left Column: Submission Form */}
        <div className="card form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-section-title">Field Case Particulars</div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="crop" className="form-label">
                  Crop Specie <span className="text-danger">*</span>
                </label>
                <input
                  id="crop"
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Tomato, Potato, Corn"
                  value={formData.crop}
                  onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="growth_stage" className="form-label">
                  Growth Stage <span className="text-danger">*</span>
                </label>
                <input
                  id="growth_stage"
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Flowering, Fruiting, Vegetative"
                  value={formData.growth_stage}
                  onChange={(e) =>
                    setFormData({ ...formData, growth_stage: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location_name" className="form-label">
                Field Location Name <span className="text-danger">*</span>
              </label>
              <input
                id="location_name"
                type="text"
                className="form-input"
                required
                placeholder="e.g. Kolar Farm Zone 4, Plot B"
                value={formData.location_name}
                onChange={(e) =>
                  setFormData({ ...formData, location_name: e.target.value })
                }
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="latitude" className="form-label">
                  Latitude (-90 to 90) <span className="text-danger">*</span>
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="form-input font-mono"
                  required
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="longitude" className="form-label">
                  Longitude (-180 to 180) <span className="text-danger">*</span>
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="form-input font-mono"
                  required
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="symptoms" className="form-label">
                Observed Symptoms <span className="text-danger">*</span>
              </label>
              <textarea
                id="symptoms"
                className="form-textarea"
                rows={3}
                required
                maxLength={3000}
                placeholder="Describe leaf spots, wilting pattern, color discoloration, spread rate..."
                value={formData.symptoms}
                onChange={(e) =>
                  setFormData({ ...formData, symptoms: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="image_url" className="form-label">
                Crop Leaf Photo (Image URL)
              </label>
              <div className="input-with-icon">
                <UploadCloud size={16} className="input-icon text-muted" />
                <input
                  id="image_url"
                  type="url"
                  className="form-input pl-icon"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Environmental Conditions for Analysis */}
            <div className="weather-params-box">
              <div className="weather-title">
                <Sparkles size={14} className="text-emerald" />
                <span>Environmental & Micro-Climate Context (For Risk Model)</span>
              </div>
              <div className="form-row-3">
                <div className="form-group mb-0">
                  <label htmlFor="temp" className="label-xs">
                    <Thermometer size={12} /> Temp (°C)
                  </label>
                  <input
                    id="temp"
                    type="number"
                    step="0.5"
                    min="-50"
                    max="60"
                    className="form-input font-mono"
                    value={weatherData.temperature}
                    onChange={(e) =>
                      setWeatherData({
                        ...weatherData,
                        temperature: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="form-group mb-0">
                  <label htmlFor="humidity" className="label-xs">
                    <Droplets size={12} /> Humidity (%)
                  </label>
                  <input
                    id="humidity"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="form-input font-mono"
                    value={weatherData.humidity}
                    onChange={(e) =>
                      setWeatherData({
                        ...weatherData,
                        humidity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="form-group mb-0">
                  <label htmlFor="rainfall" className="label-xs">
                    <CloudRain size={12} /> Rain (mm)
                  </label>
                  <input
                    id="rainfall"
                    type="number"
                    step="0.5"
                    min="0"
                    max="1000"
                    className="form-input font-mono"
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

            {errorMessage && (
              <div className="form-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-actions mt-4">
              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submittingStep === 'saving_case' || submittingStep === 'analyzing'}
              >
                {submittingStep === 'saving_case' && (
                  <>
                    <span className="spinner-sm" />
                    <span>Step 1/2: Submitting Case...</span>
                  </>
                )}
                {submittingStep === 'analyzing' && (
                  <>
                    <span className="spinner-sm" />
                    <span>Step 2/2: Running AI & Risk Analysis...</span>
                  </>
                )}
                {(submittingStep === 'idle' || submittingStep === 'error' || submittingStep === 'done') && (
                  <>
                    <Sparkles size={18} className="icon-mr" />
                    <span>Submit & Run AI Diagnostic</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: AI Analysis Result Display */}
        <div className="card result-card">
          <div className="card-header-clean">
            <Sparkles size={18} className="text-emerald" />
            <h2 className="card-heading">Automated Diagnostic Output</h2>
          </div>

          {analyzedCase ? (
            <div className="analysis-result-view animate-fade-in">
              <div className="result-success-pill">
                <CheckCircle2 size={16} />
                <span>Inference & Deterministic Risk Completed</span>
              </div>

              {/* Disease Diagnosis Card */}
              <div className="diagnosis-highlight-box">
                <div className="diagnosis-header">
                  <span className="label-sm">Detected Crop Pathogen</span>
                  <StatusBadge status={analyzedCase.status} />
                </div>
                <div className="disease-name-lg">{analyzedCase.disease || 'Undetected'}</div>

                {/* Confidence Bar */}
                {analyzedCase.confidence !== null && (
                  <div className="confidence-meter-group mt-3">
                    <div className="confidence-label-row">
                      <span>Model Confidence Score</span>
                      <strong className="text-emerald">
                        {Math.round(analyzedCase.confidence * 100)}%
                      </strong>
                    </div>
                    <div className="meter-bar">
                      <div
                        className="meter-fill"
                        style={{ width: `${Math.round(analyzedCase.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Assessment Card */}
              <div className="risk-highlight-box">
                <div className="risk-header-row">
                  <span className="label-sm">Epidemiological Risk Evaluation</span>
                  <RiskBadge
                    level={analyzedCase.risk_level}
                    score={analyzedCase.risk_score}
                    size="lg"
                  />
                </div>

                <div className="risk-score-display">
                  <div className="score-num">{Math.round(analyzedCase.risk_score ?? 0)}</div>
                  <div className="score-denominator">/ 100</div>
                  <div className="score-label">Composite Outbreak Vulnerability Score</div>
                </div>

                <div className="meter-bar mt-2">
                  <div
                    className={`meter-fill meter-risk-${(analyzedCase.risk_level || 'low').toLowerCase()}`}
                    style={{ width: `${Math.min(100, Math.round(analyzedCase.risk_score ?? 0))}%` }}
                  />
                </div>
              </div>

              {/* Case Metadata Details */}
              <div className="result-metadata-box">
                <div className="meta-pair">
                  <span className="meta-key">Assigned Case ID:</span>
                  <code className="meta-value-code">{analyzedCase.id}</code>
                </div>
                <div className="meta-pair">
                  <span className="meta-key">Field Location:</span>
                  <span className="meta-val">{analyzedCase.location_name}</span>
                </div>
                <div className="meta-pair">
                  <span className="meta-key">Next Workflow Step:</span>
                  <span className="meta-val text-amber font-medium">
                    Needs Agricultural Officer Verification
                  </span>
                </div>
              </div>

              {/* Primary Call to Action: Proceed to Officer Verification */}
              <div className="result-cta-group">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => onNavigateToOfficer && onNavigateToOfficer(analyzedCase)}
                >
                  <span>Review in Officer Queue</span>
                  <ArrowRight size={16} className="icon-ml" />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-block mt-2"
                  onClick={() => {
                    setAnalyzedCase(null);
                    setSubmittingStep('idle');
                  }}
                >
                  <RotateCcw size={14} className="icon-mr" />
                  Submit Another Case
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-analysis-placeholder">
              <div className="placeholder-icon-circle">
                <Sparkles size={32} className="text-emerald" />
              </div>
              <h3 className="placeholder-title">Awaiting Field Submission</h3>
              <p className="placeholder-text">
                Fill out the case details or select a preset scenario on the left, then click{' '}
                <strong>"Submit & Run AI Diagnostic"</strong> to observe real-time computer vision
                disease classification and environmental risk assessment.
              </p>

              <div className="pipeline-preview-list">
                <div className="pipeline-preview-item">
                  <span className="dot dot-1"></span>
                  <span>1. Registers case in database as <code>PENDING_ANALYSIS</code></span>
                </div>
                <div className="pipeline-preview-item">
                  <span className="dot dot-2"></span>
                  <span>2. Executes neural inference on leaf image</span>
                </div>
                <div className="pipeline-preview-item">
                  <span className="dot dot-3"></span>
                  <span>3. Computes weather & disease pressure risk score (0-100)</span>
                </div>
                <div className="pipeline-preview-item">
                  <span className="dot dot-4"></span>
                  <span>4. Advances case lifecycle to <code>ANALYZED</code></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
