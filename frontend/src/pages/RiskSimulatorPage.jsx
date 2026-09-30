import { useState } from 'react';
import {
  Sliders,
  Thermometer,
  Droplets,
  CloudRain,
  Users,
  Play,
} from 'lucide-react';
import { useRiskSimulation } from '../services/queries';
import { formatErrorMessage } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';

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

  const simulateMutation = useRiskSimulation();

  const handleSimulate = async (e) => {
    if (e) e.preventDefault();

    try {
      const payload = {
        crop: params.crop.trim(),
        growth_stage: params.growth_stage.trim(),
        temperature: parseFloat(params.temperature),
        humidity: parseFloat(params.humidity),
        rainfall: parseFloat(params.rainfall),
        nearby_verified_cases: parseInt(params.nearby_verified_cases, 10),
      };

      const res = await simulateMutation.mutateAsync(payload);
      setResult(res);
    } catch {
      // Handled via simulateMutation.error
    }
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader
        heading="Risk Matrix Simulator"
        lead="Evaluate pathogen vulnerability by simulating weather conditions, crop maturity, and local infection density."
      />

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
                  <Thermometer size={14} className="text-muted" aria-hidden="true" /> Ambient Temperature
                </span>
                <span className="slider-reading">{params.temperature}°C</span>
              </div>
              <input
                id="sim-temp"
                type="range"
                min="-10"
                max="50"
                step="0.5"
                className="range-input"
                value={params.temperature}
                onChange={(e) =>
                  setParams({ ...params, temperature: parseFloat(e.target.value) })
                }
                aria-label="Ambient Temperature in Celsius"
              />
            </div>

            <div className="slider-box mt-3">
              <div className="flex-between mb-2">
                <span className="field-label-sm flex-center gap-1">
                  <Droplets size={14} className="text-muted" aria-hidden="true" /> Relative Humidity
                </span>
                <span className="slider-reading">{params.humidity}%</span>
              </div>
              <input
                id="sim-hum"
                type="range"
                min="0"
                max="100"
                step="1"
                className="range-input"
                value={params.humidity}
                onChange={(e) =>
                  setParams({ ...params, humidity: parseFloat(e.target.value) })
                }
                aria-label="Relative Humidity Percentage"
              />
            </div>

            <div className="slider-box mt-3">
              <div className="flex-between mb-2">
                <span className="field-label-sm flex-center gap-1">
                  <CloudRain size={14} className="text-muted" aria-hidden="true" /> Recent Precipitation
                </span>
                <span className="slider-reading">{params.rainfall} mm</span>
              </div>
              <input
                id="sim-rain"
                type="range"
                min="0"
                max="100"
                step="1"
                className="range-input"
                value={params.rainfall}
                onChange={(e) =>
                  setParams({ ...params, rainfall: parseFloat(e.target.value) })
                }
                aria-label="Recent Precipitation in millimeters"
              />
            </div>

            <div className="slider-box mt-3">
              <div className="flex-between mb-2">
                <span className="field-label-sm flex-center gap-1">
                  <Users size={14} className="text-muted" aria-hidden="true" /> Nearby Verified Cases
                </span>
                <span className="slider-reading">{params.nearby_verified_cases} cases</span>
              </div>
              <input
                id="sim-cases"
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
                aria-label="Nearby Verified Outbreak Cases"
              />
            </div>

            {simulateMutation.isError && (
              <div className="mt-3">
                <ErrorState
                  title="Simulation Error"
                  message={formatErrorMessage(simulateMutation.error)}
                  error={simulateMutation.error}
                  onRetry={handleSimulate}
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={simulateMutation.isPending}
              icon={Play}
              className="mt-4"
            >
              {simulateMutation.isPending ? 'Calculating Risk Model...' : 'Run Risk Model'}
            </Button>
          </form>
        </div>

        {/* Right: Simulation Output */}
        <div className="panel result-panel">
          {result ? (
            <div className="result-card-inner animate-fade-in" aria-live="polite">
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
                  <span className="dot dot-low" /> Low (0-44)
                </div>
                <div className="band-label-item">
                  <span className="dot dot-medium" /> Medium (45-74)
                </div>
                <div className="band-label-item">
                  <span className="dot dot-high" /> High (75-100)
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
                <Sliders size={26} className="text-primary" aria-hidden="true" />
              </div>
              <h3 className="empty-heading">Awaiting Simulation</h3>
              <p className="empty-body">
                Adjust weather parameters and confirmed case density on the left, then click{' '}
                <strong>"Run Risk Model"</strong> to test the deterministic risk assessment engine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
