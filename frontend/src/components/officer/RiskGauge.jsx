import { Thermometer, Droplets, CloudRain, Users, Info, Sprout, CloudSun } from 'lucide-react';
import RiskBadge from '../RiskBadge';

/**
 * Semi-circular Risk Gauge & Pathogen Factor Contribution Breakdown.
 * Explicitly groups contributing factors into: Weather, Crop Stage, and Local Density.
 */
export default function RiskGauge({ score = 50, level = 'MEDIUM', breakdown = null, inputParams = {} }) {
  // Clamp score between 0 and 100
  const clampedScore = Math.min(Math.max(score, 0), 100);

  // Angle from -90 to +90 degrees for semi-circle
  const angle = -90 + (clampedScore / 100) * 180;

  // Contributing factor weights
  const thermalScore = breakdown?.thermal_suitability ?? Math.round(score * 0.32);
  const humidityScore = breakdown?.canopy_humidity_contribution ?? Math.round(score * 0.35);
  const rainScore = breakdown?.precipitation_leaf_wetness ?? Math.round(score * 0.18);
  const weatherTotal = breakdown?.weather_total ?? Math.round((thermalScore + humidityScore + rainScore) * 10) / 10;

  const cropStageScore =
    breakdown?.crop_stage_vulnerability ??
    (inputParams.growth_stage?.toLowerCase().includes('fruit') ||
    inputParams.growth_stage?.toLowerCase().includes('flower') ||
    inputParams.growth_stage?.toLowerCase().includes('tuber')
      ? 9
      : 4);

  const densityScore = breakdown?.cluster_proximity_density ?? Math.round(score * 0.15);

  const getBarColor = (val, max) => {
    const ratio = val / max;
    if (ratio >= 0.75) return 'var(--severity-high)';
    if (ratio >= 0.45) return 'var(--severity-medium)';
    return 'var(--severity-low)';
  };

  return (
    <div className="risk-gauge-card">
      <div className="gauge-header">
        <span className="gauge-label">Deterministic Risk Assessment</span>
        <RiskBadge level={level} size="md" />
      </div>

      {/* Semi-circular Gauge Graphic */}
      <div className="gauge-svg-wrapper">
        <svg viewBox="0 0 240 135" className="gauge-svg" role="img" aria-label={`Risk gauge score ${clampedScore} of 100`}>
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            <filter id="gaugeShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Background Arc Track */}
          <path
            d="M 25 120 A 95 95 0 0 1 215 120"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Color Gradient Arc */}
          <path
            d="M 25 120 A 95 95 0 0 1 215 120"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Needle Pointer */}
          <g transform={`translate(120, 120) rotate(${angle})`} filter="url(#gaugeShadow)">
            <line x1="0" y1="0" x2="0" y2="-82" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="7" fill="#0f172a" />
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </g>

          {/* Scale Labels */}
          <text x="24" y="132" fill="#64748b" fontSize="10" fontFamily="var(--font-mono)">0</text>
          <text x="120" y="24" fill="#64748b" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">50</text>
          <text x="216" y="132" fill="#64748b" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">100</text>
        </svg>

        {/* Center Score Readout */}
        <div className="gauge-score-readout">
          <div className="gauge-score-num">{clampedScore}</div>
          <div className="gauge-score-sub">Outbreak Risk Score</div>
        </div>
      </div>

      {/* Severity Band Labels */}
      <div className="risk-bands-row mt-2">
        <div className="band-label-item">
          <span className="dot dot-low" /> Low (0–44)
        </div>
        <div className="band-label-item">
          <span className="dot dot-medium" /> Medium (45–74)
        </div>
        <div className="band-label-item">
          <span className="dot dot-high" /> High (75–100)
        </div>
      </div>

      {/* Contributing Factors Breakdown Grouped into Weather, Crop Stage, Local Density */}
      <div className="factors-breakdown mt-5">
        <div className="factors-title flex-center gap-2 mb-3">
          <Info size={15} className="text-primary" />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            Contributing Factors Breakdown
          </h4>
        </div>

        {/* ================= 1. WEATHER FACTORS ================= */}
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
              <CloudSun size={15} className="text-primary" /> Weather & Micro-climate
            </span>
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)', background: 'var(--primary-100)', padding: '2px 6px', borderRadius: '4px' }}>
              {weatherTotal} pts
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 1.1 Thermal */}
            <div className="factor-item">
              <div className="factor-header">
                <span className="factor-name flex-center gap-1">
                  <Thermometer size={13} className="text-muted" /> Temperature Suitability
                </span>
                <span className="factor-val font-mono">{thermalScore} pts</span>
              </div>
              <div className="factor-bar-track">
                <div
                  className="factor-bar-fill"
                  style={{ width: `${Math.min(100, (thermalScore / 32) * 100)}%`, background: getBarColor(thermalScore, 32) }}
                />
              </div>
              <span className="factor-desc text-xs text-muted">
                {inputParams.temperature ?? 28}°C favors fungal & bacterial incubation kinetics
              </span>
            </div>

            {/* 1.2 Humidity */}
            <div className="factor-item">
              <div className="factor-header">
                <span className="factor-name flex-center gap-1">
                  <Droplets size={13} className="text-muted" /> Canopy Relative Humidity
                </span>
                <span className="factor-val font-mono">{humidityScore} pts</span>
              </div>
              <div className="factor-bar-track">
                <div
                  className="factor-bar-fill"
                  style={{ width: `${Math.min(100, (humidityScore / 35) * 100)}%`, background: getBarColor(humidityScore, 35) }}
                />
              </div>
              <span className="factor-desc text-xs text-muted">
                {inputParams.humidity ?? 82}% relative humidity sustains free surface moisture
              </span>
            </div>

            {/* 1.3 Precipitation */}
            <div className="factor-item">
              <div className="factor-header">
                <span className="factor-name flex-center gap-1">
                  <CloudRain size={13} className="text-muted" /> Precipitation & Leaf Wetness
                </span>
                <span className="factor-val font-mono">{rainScore} pts</span>
              </div>
              <div className="factor-bar-track">
                <div
                  className="factor-bar-fill"
                  style={{ width: `${Math.min(100, (rainScore / 18) * 100)}%`, background: getBarColor(rainScore, 18) }}
                />
              </div>
              <span className="factor-desc text-xs text-muted">
                {inputParams.rainfall ?? 15} mm precipitation dislodges sporangia for splash dispersal
              </span>
            </div>
          </div>
        </div>

        {/* ================= 2. CROP STAGE VULNERABILITY ================= */}
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
              <Sprout size={15} className="text-primary" /> Crop Stage Vulnerability
            </span>
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)', background: 'var(--primary-100)', padding: '2px 6px', borderRadius: '4px' }}>
              {cropStageScore} pts
            </span>
          </div>

          <div className="factor-item">
            <div className="factor-header">
              <span className="factor-name flex-center gap-1">
                Phenological Maturity Sensitivity
              </span>
              <span className="factor-val font-mono">{cropStageScore} / 15 pts</span>
            </div>
            <div className="factor-bar-track">
              <div
                className="factor-bar-fill"
                style={{ width: `${Math.min(100, (cropStageScore / 15) * 100)}%`, background: getBarColor(cropStageScore, 15) }}
              />
            </div>
            <span className="factor-desc text-xs text-muted">
              {inputParams.crop || 'Crop'} during the {inputParams.growth_stage || 'Flowering'} phase exhibits accelerated leaf cuticle permeability and vascular sink susceptibility
            </span>
          </div>
        </div>

        {/* ================= 3. LOCAL DENSITY & INFECTION PRESSURE ================= */}
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
              <Users size={15} className="text-primary" /> Local Infection Density
            </span>
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)', background: 'var(--primary-100)', padding: '2px 6px', borderRadius: '4px' }}>
              {densityScore} pts
            </span>
          </div>

          <div className="factor-item">
            <div className="factor-header">
              <span className="factor-name flex-center gap-1">
                Cluster Proximity & Active Cases
              </span>
              <span className="factor-val font-mono">{densityScore} / 25 pts</span>
            </div>
            <div className="factor-bar-track">
              <div
                className="factor-bar-fill"
                style={{ width: `${Math.min(100, (densityScore / 25) * 100)}%`, background: getBarColor(densityScore, 25) }}
              />
            </div>
            <span className="factor-desc text-xs text-muted">
              {inputParams.nearby_verified_cases ?? 4} nearby verified field infection(s) heighten airborne sporangial spore concentration
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
