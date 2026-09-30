import { useState } from 'react';
import {
  Sliders,
  Thermometer,
  Droplets,
  CloudRain,
  Users,
  AlertCircle,
  Play,
} from 'lucide-react';
import { calculateRisk } from '../api/risk';
import RiskBadge from '../components/RiskBadge';

export default function RiskSimulatorPage() {
  const [params, setParams] = useState({
    crop: 'Tomato',
    growth_stage: 'Flowering',
    temperature: 28.0,
    humidity: 82.0,
    rainfall: 15.0,
    nearby_verified_cases: 4,
  });

  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSimulate = async (e) => {
    if (e) e.preventDefault();
    setIsCalculating(true);
    setErrorMessage(null);

    try {
      const payload = {
        crop: params.crop.trim(),
        growth_stage: params.growth_stage.trim(),
        temperature: parseFloat(params.temperature),
        humidity: parseFloat(params.humidity),
        rainfall: parseFloat(params.rainfall),
        nearby_verified_cases: parseInt(params.nearby_verified_cases, 10),
      };

      const res = await calculateRisk(payload);
      setResult(res);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to compute risk score from CropShield API.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-heading">Risk Matrix Simulator</h1>
          <p className="page-lead">
            Evaluate pathogen vulnerability by simulating weather conditions, crop maturity, and local infection density.
          </p>
        </div>
      </div>

      <div className="page-layout-two-col">
        {/* Left: Input Form */}
        <div className="panel form-panel">
          <form onSubmit={handleSimulate}>
            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="sim-crop" className="field-label">
                  Target Crop
                </label>
                <input
                  id="sim-crop"
                  type="text"
                  className="field-input"
                  required
                  value={params.crop}
                  onChange={(e) => setParams({ ...params, crop: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label htmlFor="sim-growth" className="field-label">
                  Growth Stage
                </label>
                <input
                  id="sim-growth"
                  type="text"
                  className="field-input"
                  required
                  value={params.growth_stage}
                  onChange={(e) => setParams({ ...params, growth_stage: e.target.value })}
                />
              </div>
            </div>

            {/* Range Sliders */}
            <div className="slider-box">
              <div className="flex-between mb-2">
                <span className="field-label-sm flex-center gap-1">
                  <Thermometer size={14} className="text-muted" /> Ambient Temperature
                </span>
                <span className="slider-reading">{params.temperature}°C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="50"
                step="0.5"
                className="range-input"
                value={params.temperature}
                onChange={(e) =>
                  setParams({ ...params, temperature: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="slider-box mt-3">
              <div className="flex-between mb-2">
                <span className="field-label-sm flex-center gap-1">
                  <Droplets size={14} className="text-muted" /> Relative Humidity
                </span>
                <span className="slider-reading">{params.humidity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                className="range-input"
                value={params.humidity}
                onChange={(e) =>
                  setParams({ ...params, humidity: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="slider-box mt-3">
              <div className="flex-between mb-2">
                <span className="field-label-sm flex-center gap-1">
                  <CloudRain size={14} className="text-muted" /> Recent Precipitation
                </span>
                <span className="slider-reading">{params.rainfall} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                className="range-input"
                value={params.rainfall}
                onChange={(e) =>
                  setParams({ ...params, rainfall: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="slider-box mt-3">
              <div className="flex-between mb-2">
                <span className="field-label-sm flex-center gap-1">
                  <Users size={14} className="text-muted" /> Nearby Verified Cases
                </span>
                <span className="slider-reading">{params.nearby_verified_cases} cases</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                className="range-input"
                value={params.nearby_verified_cases}
                onChange={(e) =>
                  setParams({
                    ...params,
                    nearby_verified_cases: parseInt(e.target.value, 10),
                  })
                }
              />
            </div>

            {errorMessage && (
              <div className="alert-box alert-box-error mt-3" role="alert">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg mt-4"
              disabled={isCalculating}
            >
              {isCalculating ? (
                'Calculating Risk Model...'
              ) : (
                <>
                  <Play size={16} className="icon-mr" />
                  <span>Run Risk Model</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Simulation Output */}
        <div className="panel result-panel">
          {result ? (
            <div className="result-card-inner animate-fade-in">
              <div className="result-badge-top">
                <span>Deterministic Model Output</span>
              </div>

              <div className="result-hero-box text-center py-6">
                <span className="result-section-label">Calculated Outbreak Risk Score</span>
                <div className="score-hero-val">{result.risk_score}</div>
                <div className="text-xs text-muted mb-3">Scale 0 &ndash; 100</div>
                <RiskBadge level={result.risk_level} score={result.risk_score} size="lg" />
              </div>

              {/* Progress bar */}
              <div className="progress-track mt-3">
                <div
                  className={`progress-fill progress-${(result.risk_level || 'low').toLowerCase()}`}
                  style={{ width: `${Math.min(100, result.risk_score)}%` }}
                />
              </div>

              <div className="risk-bands-row mt-4">
                <div className="band-label-item">
                  <span className="dot dot-low" /> Low (0-39)
                </div>
                <div className="band-label-item">
                  <span className="dot dot-medium" /> Medium (40-69)
                </div>
                <div className="band-label-item">
                  <span className="dot dot-high" /> High (70-100)
                </div>
              </div>

              <div className="insight-card mt-4">
                <h4 className="insight-title">Model Findings</h4>
                <ul className="insight-bullets">
                  <li>
                    Humidity ({params.humidity}%) and rainfall ({params.rainfall} mm) promote fungal
                    spore dissemination across {params.crop}.
                  </li>
                  <li>
                    {params.nearby_verified_cases > 0
                      ? `${params.nearby_verified_cases} active verified case(s) elevate nearby spore pressure.`
                      : 'No nearby verified cases reduces local contagion potential.'}
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="result-empty-state">
              <div className="empty-icon-circle">
                <Sliders size={26} className="text-primary" />
              </div>
              <h3 className="empty-heading">Awaiting Simulation</h3>
              <p className="empty-body">
                Adjust weather parameters and confirmed case density on the left, then click{' '}
                <strong>"Run Risk Model"</strong> to test the deterministic backend endpoint.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
