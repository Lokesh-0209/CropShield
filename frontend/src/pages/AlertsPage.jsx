import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { listAlerts } from '../api/alerts';
import { RiskLevel } from '../types/enums';
import RiskBadge from '../components/RiskBadge';

export default function AlertsPage({ onNavigateToOutbreaks }) {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await listAlerts({ eps_km: 2.0, min_samples: 3 });
      setAlerts(res?.alerts || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load outbreak alerts from CropShield API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Filter alerts by outbreak_level
  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'ALL') return alerts;
    return alerts.filter(
      (a) => (a.outbreak_level || '').toUpperCase() === severityFilter
    );
  }, [alerts, severityFilter]);

  // Statistics
  const alertStats = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter(
      (a) => (a.outbreak_level || '').toUpperCase() === RiskLevel.HIGH
    ).length;
    const medium = alerts.filter(
      (a) => (a.outbreak_level || '').toUpperCase() === RiskLevel.MEDIUM
    ).length;
    const low = alerts.filter(
      (a) => (a.outbreak_level || '').toUpperCase() === RiskLevel.LOW
    ).length;
    return { total, high, medium, low };
  }, [alerts]);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <AlertTriangle className="title-icon text-danger" />
            Outbreak Warnings & Phytosanitary Advisories
          </h1>
          <p className="page-description">
            Automated alerts synthesized from active spatial clusters. Dispatched to agricultural
            extension agents and farming communities for prompt quarantine and mitigation.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-refresh"
          onClick={fetchAlerts}
          disabled={isLoading}
        >
          <RefreshCw size={15} className={`icon-mr ${isLoading ? 'spin' : ''}`} />
          Refresh Alerts
        </button>
      </div>

      {/* Severity Metrics Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Active Advisories</div>
          <div className="stat-number">{alertStats.total}</div>
        </div>
        <div className="stat-card stat-card-danger">
          <div className="stat-label">Critical Outbreak Alerts (HIGH)</div>
          <div className="stat-number text-danger">{alertStats.high}</div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-label">Elevated Warnings (MEDIUM)</div>
          <div className="stat-number text-amber">{alertStats.medium}</div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-label">Surveillance Notices (LOW)</div>
          <div className="stat-number text-emerald">{alertStats.low}</div>
        </div>
      </div>

      {/* Severity Filter Toolbar */}
      <div className="table-toolbar">
        <div className="filter-pill-group">
          <Filter size={15} className="filter-icon text-muted" />
          {[
            { id: 'ALL', label: 'All Severities' },
            { id: RiskLevel.HIGH, label: 'High Severity Only' },
            { id: RiskLevel.MEDIUM, label: 'Medium Severity Only' },
            { id: RiskLevel.LOW, label: 'Low Severity Only' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`filter-btn ${severityFilter === item.id ? 'active' : ''}`}
              onClick={() => setSeverityFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="form-error-banner mb-4" role="alert">
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary ml-auto"
            onClick={fetchAlerts}
          >
            Retry
          </button>
        </div>
      )}

      {/* Alerts Feed */}
      {isLoading ? (
        <div className="loading-state card">
          <span className="spinner" />
          <p>Scanning cluster warnings from CropShield API...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card empty-state">
          <ShieldCheck size={42} className="text-emerald" />
          <h3>No Active Warning Alerts</h3>
          <p>
            {alerts.length === 0
              ? 'No active outbreak clusters have triggered warnings. Warnings are automatically generated as verified cases form spatial clusters.'
              : 'No alerts match your selected severity filter.'}
          </p>
        </div>
      ) : (
        <div className="alerts-feed-grid">
          {filteredAlerts.map((alert) => {
            const severity = (alert.outbreak_level || 'LOW').toUpperCase();
            const isHigh = severity === RiskLevel.HIGH;

            return (
              <div
                key={alert.warning_id || alert.cluster_id}
                className={`card alert-card alert-card-${severity.toLowerCase()} ${
                  isHigh ? 'alert-card-pulse' : ''
                }`}
              >
                {/* Alert Card Header */}
                <div className="alert-header">
                  <div className="alert-title-row">
                    {isHigh ? (
                      <Flame size={20} className="alert-icon text-danger" />
                    ) : severity === RiskLevel.MEDIUM ? (
                      <AlertTriangle size={20} className="alert-icon text-amber" />
                    ) : (
                      <ShieldAlert size={20} className="alert-icon text-emerald" />
                    )}
                    <div>
                      <h2 className="alert-title">{alert.title}</h2>
                      <div className="alert-id-tag">
                        Warning Ref: <code>{alert.warning_id}</code> &bull; Cluster #{alert.cluster_id}
                      </div>
                    </div>
                  </div>

                  <RiskBadge
                    level={alert.outbreak_level}
                    score={alert.average_risk_score}
                    size="lg"
                  />
                </div>

                {/* Message Body */}
                <div className="alert-message-box">
                  <p className="alert-message-text">{alert.message}</p>
                </div>

                {/* Alert Metrics Grid */}
                <div className="alert-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-label">Dominant Crop Pathogen</span>
                    <strong className="metric-value font-mono text-emerald">
                      {alert.dominant_disease || 'Unknown'}
                    </strong>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">Confirmed Cases in Cluster</span>
                    <strong className="metric-value">{alert.case_count} Verified</strong>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">Mean Epidemiological Risk</span>
                    <strong className="metric-value font-mono">
                      {typeof alert.average_risk_score === 'number'
                        ? alert.average_risk_score.toFixed(1)
                        : alert.average_risk_score}{' '}
                      / 100
                    </strong>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">Centroid Coordinates</span>
                    <span className="metric-value font-mono text-muted">
                      {typeof alert.center_latitude === 'number'
                        ? alert.center_latitude.toFixed(4)
                        : alert.center_latitude}
                      °N,{' '}
                      {typeof alert.center_longitude === 'number'
                        ? alert.center_longitude.toFixed(4)
                        : alert.center_longitude}
                      °E
                    </span>
                  </div>
                </div>

                {/* Footer with Timestamp and Action */}
                <div className="alert-footer">
                  <div className="alert-timestamp">
                    <Calendar size={13} className="text-muted" />
                    <span>
                      Generated:{' '}
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleString()
                        : 'Active Outbreak Window'}
                    </span>
                  </div>

                  {onNavigateToOutbreaks && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => onNavigateToOutbreaks()}
                    >
                      <Layers size={14} className="icon-mr" />
                      View on Surveillance Map
                      <ArrowRight size={13} className="icon-ml" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
