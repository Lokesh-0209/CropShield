import { useMemo } from 'react';
import { ShieldAlert, Calendar, MapPin, Sparkles } from 'lucide-react';
import { useAlerts } from '../../services/queries';
import RiskBadge from '../../components/RiskBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';

export default function FarmerAlertsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAlerts({ eps_km: 2.0, min_samples: 3 });

  const alerts = useMemo(() => {
    return data?.alerts || [];
  }, [data]);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
          Regional Outbreak Warnings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Active alerts and preventive advisories for your crops
        </p>
      </div>

      {/* Alerts list */}
      {isError ? (
        <ErrorState
          title="Could not load outbreak alerts"
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton height="110px" width="100%" />
          <Skeleton height="110px" width="100%" />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No Active Alerts"
          description="Your monitoring zones have no active disease outbreak warnings at this time."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {alerts.map((alert) => {
            const severity = (alert.outbreak_level || 'LOW').toLowerCase();

            return (
              <div
                key={alert.warning_id || alert.cluster_id}
                style={{
                  background: '#ffffff',
                  border: `1px solid ${
                    severity === 'high'
                      ? 'var(--severity-high-border)'
                      : severity === 'medium'
                      ? 'var(--severity-medium-border)'
                      : 'var(--border-card)'
                  }`,
                  borderLeft: `5px solid ${
                    severity === 'high'
                      ? 'var(--severity-high)'
                      : severity === 'medium'
                      ? 'var(--severity-medium)'
                      : 'var(--severity-low)'
                  }`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                    {alert.title}
                  </h2>
                  <RiskBadge level={alert.outbreak_level} size="sm" showScore={false} />
                </div>

                <p style={{ fontSize: '13.5px', color: 'var(--text-body)', marginTop: '8px', lineHeight: 1.5 }}>
                  {alert.message}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '12px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} />
                    <span>Cluster #{alert.cluster_id} &bull; {alert.dominant_disease}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Next Phase Placeholder Note */}
      <div
        className="mt-4"
        style={{
          padding: '12px 14px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Sparkles size={14} className="text-primary flex-shrink-0" />
        <span>
          <strong>Coming in next phase:</strong> Automated SMS and WhatsApp regional outbreak broadcast alerts.
        </span>
      </div>
    </div>
  );
}
