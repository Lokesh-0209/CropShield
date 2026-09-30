import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
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

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'ALL') return alerts;
    return alerts.filter(
      (a) => (a.outbreak_level || '').toUpperCase() === severityFilter
    );
  }, [alerts, severityFilter]);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-heading">Alerts & Advisories</h1>
          <p className="page-lead">
            Regional outbreak incident advisories generated automatically from confirmed disease clusters.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchAlerts}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={`icon-mr ${isLoading ? 'spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Chips */}
      <div className="filter-bar mb-4">
        <div className="filter-chips">
          {[
            { id: 'ALL', label: `All Alerts (${alerts.length})` },
            { id: RiskLevel.HIGH, label: 'High Severity' },
            { id: RiskLevel.MEDIUM, label: 'Medium Severity' },
            { id: RiskLevel.LOW, label: 'Low Severity' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${severityFilter === item.id ? 'chip-active' : ''}`}
              onClick={() => setSeverityFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="alert-box alert-box-error mb-4" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-xs btn-secondary ml-auto"
            onClick={fetchAlerts}
          >
            Retry
          </button>
        </div>
      )}

      {/* Alerts Feed */}
      {isLoading ? (
        <div className="panel panel-loading">
          <span className="spinner" />
          <p>Scanning active outbreak warnings...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="panel panel-empty">
          <ShieldCheck size={40} className="text-primary mb-2" />
          <h3 className="empty-heading">No Active Warnings</h3>
          <p className="empty-body">
            {alerts.length === 0
              ? 'No active outbreak alerts in your monitoring zones. Alerts are dispatched once verified cases form geographic clusters.'
              : 'No alerts match your selected severity level.'}
          </p>
        </div>
      ) : (
        <div className="incident-feed-stack">
          {filteredAlerts.map((alert) => {
            const severity = (alert.outbreak_level || 'LOW').toUpperCase();

            return (
              <div
                key={alert.warning_id || alert.cluster_id}
                className={`incident-card severity-${severity.toLowerCase()}`}
              >
                {/* Header Row */}
                <div className="incident-top">
                  <div className="incident-title-row">
                    <span className={`severity-stripe severity-${severity.toLowerCase()}`} />
                    <div>
                      <h3 className="incident-title">{alert.title}</h3>
                      <span className="incident-ref">
                        Ref: {alert.warning_id} &bull; Cluster #{alert.cluster_id}
                      </span>
                    </div>
                  </div>

                  <RiskBadge
                    level={alert.outbreak_level}
                    score={alert.average_risk_score}
                    size="sm"
                  />
                </div>

                {/* Message text */}
                <p className="incident-message">{alert.message}</p>

                {/* Metadata Row */}
                <div className="incident-meta-grid">
                  <div className="incident-meta-item">
                    <span className="meta-k">Dominant Pathogen</span>
                    <strong className="meta-v text-primary">
                      {alert.dominant_disease || 'Unknown'}
                    </strong>
                  </div>

                  <div className="incident-meta-item">
                    <span className="meta-k">Affected Cases</span>
                    <strong className="meta-v">{alert.case_count} confirmed</strong>
                  </div>

                  <div className="incident-meta-item">
                    <span className="meta-k">Mean Risk</span>
                    <strong className="meta-v font-mono">
                      {typeof alert.average_risk_score === 'number'
                        ? alert.average_risk_score.toFixed(1)
                        : alert.average_risk_score}{' '}
                      / 100
                    </strong>
                  </div>

                  <div className="incident-meta-item">
                    <span className="meta-k">Cluster Coordinates</span>
                    <span className="meta-v font-mono text-muted">
                      {typeof alert.center_latitude === 'number'
                        ? alert.center_latitude.toFixed(3)
                        : alert.center_latitude}
                      °,{' '}
                      {typeof alert.center_longitude === 'number'
                        ? alert.center_longitude.toFixed(3)
                        : alert.center_longitude}
                      °
                    </span>
                  </div>
                </div>

                {/* Footer with timestamp & navigation */}
                <div className="incident-footer">
                  <span className="incident-timestamp">
                    <Calendar size={13} className="text-muted" />
                    <span>
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleString()
                        : 'Active Advisory'}
                    </span>
                  </span>

                  {onNavigateToOutbreaks && (
                    <button
                      type="button"
                      className="btn-link-sm"
                      onClick={() => onNavigateToOutbreaks()}
                    >
                      <Layers size={13} className="icon-mr" />
                      View on Outbreak Map
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
