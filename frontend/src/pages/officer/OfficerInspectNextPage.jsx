import { useMemo } from 'react';
import { Compass, MapPin, AlertTriangle, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { useSurveillanceQueue } from '../../services/queries';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import RiskBadge from '../../components/RiskBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';

export default function OfficerInspectNextPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useSurveillanceQueue();

  const queue = useMemo(() => {
    return data?.queue || [];
  }, [data]);

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader
        heading="Inspect Next &bull; Active Surveillance Queue"
        lead="Priority-ranked fields and sentinel buffer plots requiring agricultural officer inspection to preemptively contain outbreak spread."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={refetch}
            loading={isFetching}
            icon={RefreshCw}
          >
            Refresh Queue
          </Button>
        }
      />

      {/* Main Queue List */}
      {isError ? (
        <ErrorState
          title="Could not load surveillance queue"
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Skeleton height="110px" width="100%" />
          <Skeleton height="110px" width="100%" />
          <Skeleton height="110px" width="100%" />
        </div>
      ) : queue.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No Fields in Surveillance Queue"
          description="All surrounding buffer perimeters have been audited or no high-density clusters are expanding."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {queue.map((item) => {
            const isHigh = (item.risk_level || '').toUpperCase() === 'HIGH';

            return (
              <Card key={item.field_id}>
                <CardBody style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                    {/* Rank & Field Title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: 'var(--radius-lg)',
                          background: isHigh ? 'var(--severity-high-bg)' : 'var(--severity-medium-bg)',
                          color: isHigh ? 'var(--severity-high-text)' : 'var(--severity-medium-text)',
                          border: `1px solid ${isHigh ? 'var(--severity-high-border)' : 'var(--severity-medium-border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          flexShrink: 0,
                        }}
                      >
                        #{item.rank}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            {item.name}
                          </h2>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-subtle)', color: 'var(--text-body)' }}>
                            {item.crop}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} />
                            {item.location_name}
                          </span>
                          <span>&bull;</span>
                          <span style={{ fontWeight: 600, color: isHigh ? 'var(--severity-high-text)' : 'var(--severity-medium-text)' }}>
                            {item.distance_to_cluster}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Urgency Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                          Urgency Score
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isHigh ? 'var(--severity-high-text)' : 'var(--severity-medium-text)' }}>
                          {item.urgency_score} / 100
                        </div>
                      </div>
                      <RiskBadge level={item.risk_level} size="md" showScore={false} />
                    </div>
                  </div>

                  {/* Recommendation action */}
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      color: 'var(--text-body)',
                      lineHeight: 1.45,
                    }}
                  >
                    <strong>Recommended Officer Action:</strong> {item.recommended_action}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Next Phase Placeholder Note */}
      <div
        className="mt-6"
        style={{
          padding: '14px 18px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Sparkles size={16} className="text-primary flex-shrink-0" />
        <span>
          <strong>Coming in next phase:</strong> Route-optimized turn-by-turn field inspection dispatch and offline spore-trap barcode logging.
        </span>
      </div>
    </div>
  );
}
