import { useState, useMemo } from 'react';
import {
  Sliders,
  Thermometer,
  Droplets,
  CloudRain,
  Users,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Sprout,
  HelpCircle,
} from 'lucide-react';
import { useRiskSimulation } from '../services/queries';
import { formatErrorMessage } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import RiskGauge from '../components/officer/RiskGauge';

const CROPS = ['Tomato', 'Potato', 'Corn', 'Chili', 'Capsicum'];
const GROWTH_STAGES = [
  'Nursery / Seedling',
  'Vegetative',
  'Flowering',
  'Fruit Set / Tuber Initiation',
  'Fruiting / Maturation',
  'Harvest',
];

export default function RiskSimulatorPage() {
  const [params, setParams] = useState({
    crop: 'Tomato',
    growth_stage: 'Flowering',
    temperature: 28.0,
    humidity: 82.0,
    rainfall: 15.0,
    nearby_verified_cases: 4,
  });

  const [result, setResult] = useState(() => {
    // Initial deterministic baseline evaluation
    return {
      risk_score: 84.5,
      risk_level: 'HIGH',
      breakdown: {
        thermal_suitability: 26.5,
        canopy_humidity_contribution: 28.7,
        precipitation_leaf_wetness: 12.0,
        weather_total: 67.2,
        crop_stage_vulnerability: 9.0,
        cluster_proximity_density: 16.0,
      },
    };
  });

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

  const handleReset = () => {
    setParams({
      crop: 'Tomato',
      growth_stage: 'Flowering',
      temperature: 28.0,
      humidity: 82.0,
      rainfall: 15.0,
      nearby_verified_cases: 4,
    });
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader
        heading="Outbreak Risk Simulator & Matrix Engine"
        lead="Evaluate pathogen vulnerability by simulating weather conditions, crop maturity stages, and local infection density."
      />

      <div className="page-layout-two-col mb-6">
        {/* ================= LEFT: Input Form with Full Width Sliders & Numeric Inputs ================= */}
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div className="flex-center gap-2">
              <Sliders size={16} className="text-primary" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Field & Meteorological Parameters
              </h2>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={handleReset}
              title="Reset parameters to baseline"
            >
              <RotateCcw size={13} className="icon-mr" /> Reset
            </button>
          </div>

          <form onSubmit={handleSimulate}>
            {/* Target Crop & Growth Stage Dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              <div className="cs-field-group">
                <label htmlFor="sim-crop" className="cs-field-label">
                  Target Host Crop
                </label>
                <select
                  id="sim-crop"
                  className="cs-select"
                  value={params.crop}
                  onChange={(e) => setParams({ ...params, crop: e.target.value })}
                >
                  {CROPS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="cs-field-group">
                <label htmlFor="sim-growth" className="cs-field-label">
                  Crop Growth Stage
                </label>
                <select
                  id="sim-growth"
                  className="cs-select"
                  value={params.growth_stage}
                  onChange={(e) => setParams({ ...params, growth_stage: e.target.value })}
                >
                  {GROWTH_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slider 1: Ambient Temperature */}
            <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Thermometer size={15} className="text-muted" aria-hidden="true" />
                  Ambient Temperature
                </span>

                {/* Uncropped Numeric Input Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="-10"
                    max="50"
                    step="0.5"
                    className="cs-input"
                    style={{ width: '70px', height: '30px', padding: '2px 8px', fontSize: '13px', textAlign: 'center', fontWeight: 700 }}
                    value={params.temperature}
                    onChange={(e) =>
                      setParams({ ...params, temperature: parseFloat(e.target.value) || 0 })
                    }
                    aria-label="Ambient Temperature in Celsius exact value"
                  />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>°C</span>
                </div>
              </div>

              {/* FULL WIDTH SLIDER */}
              <input
                id="sim-temp"
                type="range"
                min="-10"
                max="50"
                step="0.5"
                className="range-input"
                style={{ width: '100%' }}
                value={params.temperature}
                onChange={(e) =>
                  setParams({ ...params, temperature: parseFloat(e.target.value) })
                }
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>-10°C (Frost)</span>
                <span>25°C (Optimum Pathogen)</span>
                <span>50°C (Extreme Heat)</span>
              </div>
            </div>

            {/* Slider 2: Relative Humidity */}
            <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplets size={15} className="text-muted" aria-hidden="true" />
                  Relative Humidity
                </span>

                {/* Uncropped Numeric Input Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="cs-input"
                    style={{ width: '70px', height: '30px', padding: '2px 8px', fontSize: '13px', textAlign: 'center', fontWeight: 700 }}
                    value={params.humidity}
                    onChange={(e) =>
                      setParams({ ...params, humidity: parseFloat(e.target.value) || 0 })
                    }
                    aria-label="Relative Humidity exact percentage"
                  />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>%</span>
                </div>
              </div>

              {/* FULL WIDTH SLIDER */}
              <input
                id="sim-hum"
                type="range"
                min="0"
                max="100"
                step="1"
                className="range-input"
                style={{ width: '100%' }}
                value={params.humidity}
                onChange={(e) =>
                  setParams({ ...params, humidity: parseFloat(e.target.value) })
                }
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>0% (Arid)</span>
                <span>75% (Critical Spore Threshold)</span>
                <span>100% (Saturated)</span>
              </div>
            </div>

            {/* Slider 3: Recent Precipitation */}
            <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CloudRain size={15} className="text-muted" aria-hidden="true" />
                  Recent Precipitation (Rainfall)
                </span>

                {/* Uncropped Numeric Input Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="cs-input"
                    style={{ width: '70px', height: '30px', padding: '2px 8px', fontSize: '13px', textAlign: 'center', fontWeight: 700 }}
                    value={params.rainfall}
                    onChange={(e) =>
                      setParams({ ...params, rainfall: parseFloat(e.target.value) || 0 })
                    }
                    aria-label="Precipitation exact millimeters"
                  />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>mm</span>
                </div>
              </div>

              {/* FULL WIDTH SLIDER */}
              <input
                id="sim-rain"
                type="range"
                min="0"
                max="100"
                step="1"
                className="range-input"
                style={{ width: '100%' }}
                value={params.rainfall}
                onChange={(e) =>
                  setParams({ ...params, rainfall: parseFloat(e.target.value) })
                }
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>0 mm (Dry)</span>
                <span>15 mm (Moderate Splash)</span>
                <span>100 mm (Flood / Washout)</span>
              </div>
            </div>

            {/* Slider 4: Nearby Verified Cases */}
            <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} className="text-muted" aria-hidden="true" />
                  Nearby Verified Cases
                </span>

                {/* Fixed Uncropped Value Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="1"
                    className="cs-input"
                    style={{ width: '70px', height: '30px', padding: '2px 8px', fontSize: '13px', textAlign: 'center', fontWeight: 700 }}
                    value={params.nearby_verified_cases}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        nearby_verified_cases: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    aria-label="Nearby verified cases exact count"
                  />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>cases</span>
                </div>
              </div>

              {/* FULL WIDTH SLIDER */}
              <input
                id="sim-cases"
                type="range"
                min="0"
                max="25"
                step="1"
                className="range-input"
                style={{ width: '100%' }}
                value={params.nearby_verified_cases}
                onChange={(e) =>
                  setParams({
                    ...params,
                    nearby_verified_cases: parseInt(e.target.value, 10),
                  })
                }
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>0 cases (Isolated plot)</span>
                <span>5 cases (Active cluster)</span>
                <span>25 cases (Epidemic core)</span>
              </div>
            </div>

            {simulateMutation.isError && (
              <div className="mb-3">
                <ErrorState
                  title="Simulation Engine Error"
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
            >
              {simulateMutation.isPending ? 'Calculating Pathogen Risk Model...' : 'Calculate Pathogen Risk Model'}
            </Button>
          </form>
        </div>

        {/* ================= RIGHT: Risk Gauge & Contributing Factors Breakdown ================= */}
        <div className="panel" style={{ padding: '24px' }}>
          {result ? (
            <div className="animate-fade-in">
              <RiskGauge
                score={result.risk_score}
                level={result.risk_level}
                breakdown={result.breakdown}
                inputParams={params}
              />

              {/* Model Context Card */}
              <div className="insight-card mt-4">
                <h4 className="insight-title">Epidemiological Assessment Summary</h4>
                <ul className="insight-bullets">
                  <li>
                    High canopy moisture (<strong>{params.humidity}%</strong>) combined with temperature (<strong>{params.temperature}°C</strong>) accelerates <em>Alternaria</em> and <em>Phytophthora</em> spore germ-tube elongation within 4–6 hours.
                  </li>
                  <li>
                    The <strong>{params.growth_stage}</strong> growth stage of <strong>{params.crop}</strong> presents heightened foliar and vascular tissue vulnerability.
                  </li>
                  <li>
                    {params.nearby_verified_cases > 0
                      ? `${params.nearby_verified_cases} verified field infection(s) within the transmission buffer impose elevated regional inoculum pressure.`
                      : 'Absence of adjacent confirmed infection foci minimizes immediate downwind spore propagation.'}
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="result-empty-state">
              <div className="empty-icon-circle">
                <Sliders size={26} className="text-primary" aria-hidden="true" />
              </div>
              <h3 className="empty-heading">Awaiting Simulation Input</h3>
              <p className="empty-body">
                Adjust weather parameters and confirmed case density on the left, then click{' '}
                <strong>"Calculate Pathogen Risk Model"</strong> to test the deterministic risk assessment engine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
