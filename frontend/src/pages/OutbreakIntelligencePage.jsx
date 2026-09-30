import { useState, useMemo } from 'react';
import {
  RefreshCw,
  Sliders,
  Layers,
  MapPin,
} from 'lucide-react';
import { useOutbreaks, useCases, useRecalculateOutbreaks } from '../services/queries';
import { formatErrorMessage } from '../services/api';
import LocationMap from '../components/LocationMap';
import RiskBadge from '../components/RiskBadge';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';

export default function OutbreakIntelligencePage() {
  // DBSCAN tuning parameters
  const [epsKm, setEpsKm] = useState(2.0);
  const [minSamples, setMinSamples] = useState(3);
  const [selectedCluster, setSelectedCluster] = useState(null);

  // TanStack Queries
  const {
    data: outbreakData,
    isLoading: isOutbreakLoading,
    isError: isOutbreakError,
    error: outbreakError,
    refetch: refetchOutbreaks,
    isFetching: isOutbreakFetching,
  } = useOutbreaks({ eps_km: epsKm, min_samples: minSamples });

  const {
    data: caseData,
    isLoading: isCasesLoading,
    isError: isCasesError,
    error: casesError,
    refetch: refetchCases,
  } = useCases({ limit: 100 });

  const recalculateMutation = useRecalculateOutbreaks();

  const intelligence = useMemo(() => {
    return outbreakData?.clusters || [];
  }, [outbreakData]);

  const cases = useMemo(() => {
    return caseData?.items || (Array.isArray(caseData) ? caseData : []);
  }, [caseData]);

  const isError = isOutbreakError || isCasesError;
  const combinedError = outbreakError || casesError;
  const isLoading = isOutbreakLoading || isCasesLoading;
  const isRefreshing = isOutbreakFetching || recalculateMutation.isPending;

  const handleApplyParams = () => {
    recalculateMutation.mutate({ eps_km: epsKm, min_samples: minSamples });
  };

  const handleRefresh = () => {
    refetchOutbreaks();
    refetchCases();
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader
        heading="Outbreak Intelligence"
        lead="Spatial disease clusters identified by DBSCAN density analysis over confirmed field cases."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            icon={RefreshCw}
          >
            Recalculate
          </Button>
        }
      />

      {/* DBSCAN Parameters Bar */}
      <div className="parameters-card">
        <div className="parameters-title">
          <Sliders size={15} className="text-muted" aria-hidden="true" />
          <span className="font-semibold text-sm">Clustering Parameters:</span>
        </div>

        <div className="parameters-controls">
          <div className="param-item">
            <label htmlFor="eps-km" className="param-label">
              Radius (<code>eps_km</code>): <strong>{epsKm} km</strong>
            </label>
            <input
              id="eps-km"
              type="range"
              min="0.5"
              max="20.0"
              step="0.5"
              className="range-input"
              value={epsKm}
              onChange={(e) => setEpsKm(parseFloat(e.target.value))}
            />
          </div>

          <div className="param-item">
            <label htmlFor="min-samples" className="param-label">
              Min Cases (<code>min_samples</code>): <strong>{minSamples}</strong>
            </label>
            <input
              id="min-samples"
              type="range"
              min="1"
              max="10"
              step="1"
              className="range-input"
              value={minSamples}
              onChange={(e) => setMinSamples(parseInt(e.target.value, 10))}
            />
          </div>

          <Button
            variant="primary"
            size="xs"
            onClick={handleApplyParams}
            loading={recalculateMutation.isPending}
            className="ml-auto"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* Distinct Error State: Never show empty state and error together */}
      {isError ? (
        <ErrorState
          title="Unable to calculate outbreak clusters"
          message={formatErrorMessage(combinedError)}
          error={combinedError}
          onRetry={handleRefresh}
          isRetrying={isRefreshing}
        />
      ) : (
        /* Main Grid: Map + Clusters */
        <div className="outbreak-grid">
          {/* Geographic Map */}
          <div className="panel outbreak-map-panel">
            {isLoading ? (
              <Skeleton height="400px" width="100%" />
            ) : (
              <LocationMap
                clusters={intelligence}
                cases={cases}
                selectedItem={selectedCluster || (intelligence.length > 0 ? intelligence[0] : null)}
                onSelectItem={(item, type) => {
                  if (type === 'cluster') setSelectedCluster(item);
                }}
                height={400}
              />
            )}
          </div>

          {/* Cluster Information List */}
          <div className="panel outbreak-list-panel">
            <div className="panel-header-clean">
              <div className="flex-center gap-2">
                <Layers size={17} className="text-primary" aria-hidden="true" />
                <h2 className="panel-title">Active Clusters</h2>
              </div>
              <span className="count-badge">{intelligence.length} detected</span>
            </div>

            {isLoading ? (
              <div className="p-4 flex flex-col gap-3">
                <Skeleton height="80px" width="100%" />
                <Skeleton height="80px" width="100%" />
                <Skeleton height="80px" width="100%" />
              </div>
            ) : intelligence.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No Outbreak Clusters"
                description={`DBSCAN groups cases requiring at least ${minSamples} verified cases within ${epsKm} km. Verify reported cases in the Cases queue to initiate cluster formation.`}
              />
            ) : (
              <div className="cluster-card-stack">
                {intelligence.map((cluster) => {
                  const isSelected =
                    (selectedCluster && selectedCluster.cluster_id === cluster.cluster_id) ||
                    (!selectedCluster && intelligence[0]?.cluster_id === cluster.cluster_id);

                  return (
                    <div
                      key={cluster.cluster_id}
                      className={`cluster-item-card ${isSelected ? 'cluster-selected' : ''}`}
                      onClick={() => setSelectedCluster(cluster)}
                    >
                      <div className="cluster-item-top">
                        <div className="cluster-id-wrap">
                          <span className="cluster-id-text">Cluster #{cluster.cluster_id}</span>
                          <span className="cluster-case-count">
                            {cluster.case_count} case{cluster.case_count !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <RiskBadge
                          level={cluster.outbreak_level}
                          score={cluster.average_risk_score}
                          size="sm"
                        />
                      </div>

                      <div className="cluster-item-body">
                        <div className="cluster-row">
                          <span className="text-muted text-xs">Dominant Pathogen:</span>
                          <strong className="text-main text-sm">
                            {cluster.dominant_disease || 'Unknown'}
                          </strong>
                        </div>

                        <div className="cluster-row">
                          <span className="text-muted text-xs">Centroid Coordinates:</span>
                          <span className="font-mono text-xs text-body">
                            {typeof cluster.center_latitude === 'number' ? cluster.center_latitude.toFixed(4) : cluster.center_latitude}°N,{' '}
                            {typeof cluster.center_longitude === 'number' ? cluster.center_longitude.toFixed(4) : cluster.center_longitude}°E
                          </span>
                        </div>

                        <div className="cluster-row">
                          <span className="text-muted text-xs">Average Risk Score:</span>
                          <span className="font-mono text-xs font-semibold">
                            {typeof cluster.average_risk_score === 'number' ? cluster.average_risk_score.toFixed(1) : cluster.average_risk_score} / 100
                          </span>
                        </div>

                        {cluster.case_ids && cluster.case_ids.length > 0 && (
                          <div className="cluster-cases-preview">
                            <span className="text-muted text-xs">Case IDs:</span>
                            <div className="cluster-tags">
                              {cluster.case_ids.slice(0, 4).map((id) => (
                                <code key={id} className="case-mini-tag">
                                  {id.substring(0, 11)}
                                </code>
                              ))}
                              {cluster.case_ids.length > 4 && (
                                <span className="text-xs text-muted">
                                  +{cluster.case_ids.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
