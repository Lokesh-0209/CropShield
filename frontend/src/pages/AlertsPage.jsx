import { useState, useMemo } from 'react';
import {
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAlerts } from '../services/queries';
import { RiskLevel, formatErrorMessage } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';

export default function AlertsPage({ onNavigateToOutbreaks }) {
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // TanStack Query for alerts
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAlerts({ eps_km: 2.0, min_samples: 3 });

  const alerts = useMemo(() => {
    return data?.alerts || [];
  }, [data]);

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'ALL') return alerts;
    return alerts.filter(
      (a) => (a.outbreak_level || '').toUpperCase() === severityFilter
    );
  }, [alerts, severityFilter]);

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader
        heading="Alerts & Advisories"
        lead="Regional outbreak incident advisories generated automatically from confirmed disease clusters."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        }
      />

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

      {/* Alerts Feed: Distinct states for Error, Loading, Empty, and Content */}
      {isError ? (
        <ErrorState
          title="Unable to load outbreak alerts"
          message={formatErrorMessage(error)}
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton height="150px" width="100%" className="mb-3" />
          <Skeleton height="150px" width="100%" className="mb-3" />
          <Skeleton height="150px" width="100%" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Active Warnings"
          description={
            alerts.length === 0
              ? 'No active outbreak alerts in your monitoring zones. Alerts are dispatched once verified cases form geographic clusters.'
              : 'No alerts match your selected severity level.'
          }
        />
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
                    <Calendar size={13} className="text-muted" aria-hidden="true" />
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
                      <Layers size={13} className="icon-mr" aria-hidden="true" />
                      View on Outbreak Map
                      <ArrowRight size={13} className="icon-ml" aria-hidden="true" />
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
