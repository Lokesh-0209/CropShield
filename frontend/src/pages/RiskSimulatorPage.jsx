import { useState } from 'react';
import {
  Sliders,
  Thermometer,
  Droplets,
  CloudRain,
  Users,
  Flame,
  AlertCircle,
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
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <Sliders className="title-icon text-emerald" />
            Epidemiological Risk Simulator
          </h1>
          <p className="page-description">
            Directly test the deterministic backend algorithm (<code>POST /api/risk/analyze</code>)
            combining micro-climate indices with local verified infection density.
          </p>
        </div>
      </div>

      <div className="two-col-layout">
        {/* Left: Interactive Controls */}
        <div className="card form-card">
          <form onSubmit={handleSimulate}>
            <div className="form-section-title">Environmental & Crop Variables</div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="sim-crop" className="form-label">
                  Target Crop
                </label>
                <input
                  id="sim-crop"
                  type="text"
                  className="form-input"
                  required
                  value={params.crop}
                  onChange={(e) => setParams({ ...params, crop: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sim-growth" className="form-label">
                  Growth Stage
                </label>
                <input
                  id="sim-growth"
                  type="text"
                  className="form-input"
                  required
                  value={params.growth_stage}
                  onChange={(e) => setParams({ ...params, growth_stage: e.target.value })}
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="slider-group-card">
              <div className="slider-header-row">
                <span className="slider-title">
                  <Thermometer size={14} className="text-amber" /> Ambient Temperature
                </span>
                <span className="slider-val-badge font-mono">{params.temperature}°C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="50"
                step="0.5"
                className="param-slider"
                value={params.temperature}
                onChange={(e) =>
                  setParams({ ...params, temperature: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="slider-group-card mt-3">
              <div className="slider-header-row">
                <span className="slider-title">
                  <Droplets size={14} className="text-emerald" /> Relative Humidity
                </span>
                <span className="slider-val-badge font-mono">{params.humidity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                className="param-slider"
                value={params.humidity}
                onChange={(e) =>
                  setParams({ ...params, humidity: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="slider-group-card mt-3">
              <div className="slider-header-row">
                <span className="slider-title">
                  <CloudRain size={14} className="text-info" /> Recent Precipitation (Rainfall)
                </span>
                <span className="slider-val-badge font-mono">{params.rainfall} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                className="param-slider"
                value={params.rainfall}
                onChange={(e) =>
                  setParams({ ...params, rainfall: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="slider-group-card mt-3">
              <div className="slider-header-row">
                <span className="slider-title">
                  <Users size={14} className="text-danger" /> Nearby Verified Cases in Zone
                </span>
                <span className="slider-val-badge font-mono">
                  {params.nearby_verified_cases} cases
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                className="param-slider"
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
              <div className="form-error-banner mt-3" role="alert">
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
                <>
                  <span className="spinner-sm" />
                  <span>Computing Risk Matrix...</span>
                </>
              ) : (
                <>
                  <Flame size={18} className="icon-mr" />
                  <span>Simulate Risk Assessment</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Simulation Output */}
        <div className="card result-card">
          <div className="card-header-clean">
            <Flame size={18} className="text-amber" />
            <h2 className="card-heading">Risk Matrix Simulation Output</h2>
          </div>

          {result ? (
            <div className="simulation-result-view animate-fade-in">
              <div className="result-score-hero">
                <div className="score-hero-label">Computed Composite Vulnerability</div>
                <div className="score-hero-number font-mono">{result.risk_score}</div>
                <div className="score-hero-denom">/ 100 Scale</div>
                <div className="mt-3">
                  <RiskBadge level={result.risk_level} score={result.risk_score} size="lg" />
                </div>
              </div>

              {/* Meter */}
              <div className="meter-bar-lg mt-4">
                <div
                  className={`meter-fill meter-risk-${(result.risk_level || 'low').toLowerCase()}`}
                  style={{ width: `${Math.min(100, result.risk_score)}%` }}
                />
              </div>

              <div className="bands-legend mt-4">
                <div className="band-col">
                  <span className="band-dot bg-emerald"></span>
                  <span className="band-name">Low (0-39)</span>
                </div>
                <div className="band-col">
                  <span className="band-dot bg-amber"></span>
                  <span className="band-name">Medium (40-69)</span>
                </div>
                <div className="band-col">
                  <span className="band-dot bg-danger"></span>
                  <span className="band-name">High (70-100)</span>
                </div>
              </div>

              <div className="simulation-breakdown-card mt-4">
                <div className="breakdown-title">Vulnerability Drivers</div>
                <ul className="breakdown-list">
                  <li>
                    High humidity ({params.humidity}%) & precipitation ({params.rainfall} mm)
                    foster fungal sporulation and spore motility.
                  </li>
                  <li>
                    {params.nearby_verified_cases > 0
                      ? `${params.nearby_verified_cases} active verified case(s) contribute elevated pathogen inoculum pressure.`
                      : 'Zero nearby confirmed cases minimize community contagion.'}
                  </li>
                  <li>
                    Crop physiological stage (<code>{params.growth_stage}</code>) influences canopy
                    density and micro-climate shading.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="empty-analysis-placeholder">
              <div className="placeholder-icon-circle">
                <Sliders size={32} className="text-emerald" />
              </div>
              <h3 className="placeholder-title">Ready for Simulation</h3>
              <p className="placeholder-text">
                Adjust weather parameters and local infection density on the left, then click{' '}
                <strong>"Simulate Risk Assessment"</strong> to invoke the backend model.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
