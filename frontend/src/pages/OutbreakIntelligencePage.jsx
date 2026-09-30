import { useState, useMemo } from 'react';
import {
  RefreshCw,
  Sliders,
  Layers,
  MapPin,
  Calendar,
  HelpCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { useOutbreaks, useCases, useRecalculateOutbreaks } from '../services/queries';
import { formatErrorMessage } from '../services/api';
import OfficerLeafletMap from '../components/officer/OfficerLeafletMap';
import RiskBadge from '../components/RiskBadge';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';

export default function OutbreakIntelligencePage() {
  // Human-friendly clustering parameter names
  const [clusterRadiusKm, setClusterRadiusKm] = useState(2.0); // was eps_km
  const [minCasesPerCluster, setMinCasesPerCluster] = useState(3); // was min_samples

  // Selections & sync state
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [highlightedClusterId, setHighlightedClusterId] = useState(null);

  // Time range filter (days: 7, 14, 30, 0 = All)
  const [timeFilterDays, setTimeFilterDays] = useState(30);

  // Crop & Disease filters
  const [selectedCrop, setSelectedCrop] = useState('ALL');
  const [selectedDisease, setSelectedDisease] = useState('ALL');

  // TanStack Queries
  const {
    data: outbreakData,
    isLoading: isOutbreakLoading,
    isError: isOutbreakError,
    error: outbreakError,
    refetch: refetchOutbreaks,
    isFetching: isOutbreakFetching,
  } = useOutbreaks({ eps_km: clusterRadiusKm, min_samples: minCasesPerCluster });

  const {
    data: caseData,
    isLoading: isCasesLoading,
    isError: isCasesError,
    error: casesError,
    refetch: refetchCases,
  } = useCases({ limit: 150 });

  const recalculateMutation = useRecalculateOutbreaks();

  const rawClusters = useMemo(() => {
    return outbreakData?.clusters || [];
  }, [outbreakData]);

  const rawCases = useMemo(() => {
    return caseData?.items || (Array.isArray(caseData) ? caseData : []);
  }, [caseData]);

  // Available crops and diseases for filters
  const { availableCrops, availableDiseases } = useMemo(() => {
    const crops = new Set();
    const diseases = new Set();

    rawCases.forEach((c) => {
      if (c.crop) crops.add(c.crop);
      if (c.disease) diseases.add(c.disease);
    });

    rawClusters.forEach((cl) => {
      if (cl.dominant_disease) diseases.add(cl.dominant_disease);
    });

    return {
      availableCrops: Array.from(crops).sort(),
      availableDiseases: Array.from(diseases).sort(),
    };
  }, [rawCases, rawClusters]);

  // Filter cases by time, crop, disease
  const filteredCases = useMemo(() => {
    const cutoffTime = timeFilterDays > 0 ? Date.now() - timeFilterDays * 86400000 : 0;

    return rawCases.filter((c) => {
      if (timeFilterDays > 0 && c.created_at) {
        const time = new Date(c.created_at).getTime();
        if (time < cutoffTime) return false;
      }
      if (selectedCrop !== 'ALL' && c.crop !== selectedCrop) {
        return false;
      }
      if (selectedDisease !== 'ALL' && c.disease !== selectedDisease) {
        return false;
      }
      return true;
    });
  }, [rawCases, timeFilterDays, selectedCrop, selectedDisease]);

  // Filter clusters by crop and disease
  const filteredClusters = useMemo(() => {
    return rawClusters.filter((cl) => {
      if (selectedDisease !== 'ALL' && cl.dominant_disease !== selectedDisease) {
        return false;
      }
      if (selectedCrop !== 'ALL') {
        const hasMatchingCase = rawCases.some(
          (c) => cl.case_ids?.includes(c.id) && c.crop === selectedCrop
        );
        if (!hasMatchingCase) return false;
      }
      return true;
    });
  }, [rawClusters, rawCases, selectedCrop, selectedDisease]);

  const isError = isOutbreakError || isCasesError;
  const combinedError = outbreakError || casesError;
  const isLoading = isOutbreakLoading || isCasesLoading;
  const isRefreshing = isOutbreakFetching || recalculateMutation.isPending;

  // Single primary action: Recalculate (merged with Apply)
  const handleRecalculate = () => {
    recalculateMutation.mutate({
      eps_km: clusterRadiusKm,
      min_samples: minCasesPerCluster,
    });
    refetchOutbreaks();
    refetchCases();
  };

  return (
    <div className="page-shell">
      {/* Page Header */}
      <PageHeader
        heading="Outbreak Intelligence Map"
        lead="Spatial disease clusters identified by DBSCAN density clustering over verified field specimens with localized transmission perimeters."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleRecalculate}
            loading={isRefreshing}
            icon={RefreshCw}
          >
            Recalculate Clusters
          </Button>
        }
      />

      {/* Human-language Clustering Controls & Temporal / Crop Filters */}
      <div className="panel mb-4" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div className="flex-center gap-2">
            <Sliders size={16} className="text-primary" aria-hidden="true" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Clustering & Spatial Filtering Engine
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            DBSCAN density algorithm runs live on validated specimens
          </span>
        </div>

        {/* Full-width Sliders Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '18px' }}>
          {/* 1. Cluster Radius (km) */}
          <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="cluster-radius-slider" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Cluster radius (km)
                <span
                  title="Maximum distance between verified cases to consider them part of the same outbreak cluster (DBSCAN epsilon)."
                  style={{ cursor: 'help', color: 'var(--text-muted)' }}
                >
                  <HelpCircle size={13} />
                </span>
              </label>

              {/* Exact Numeric Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="0.5"
                  max="20.0"
                  step="0.5"
                  className="cs-input"
                  style={{ width: '64px', height: '28px', padding: '2px 6px', fontSize: '12.5px', textAlign: 'center' }}
                  value={clusterRadiusKm}
                  onChange={(e) => setClusterRadiusKm(parseFloat(e.target.value) || 0.5)}
                  aria-label="Cluster radius in kilometers exact numeric value"
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>km</span>
              </div>
            </div>

            {/* FULL WIDTH SLIDER */}
            <input
              id="cluster-radius-slider"
              type="range"
              min="0.5"
              max="20.0"
              step="0.5"
              className="range-input"
              style={{ width: '100%' }}
              value={clusterRadiusKm}
              onChange={(e) => setClusterRadiusKm(parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>0.5 km (High precision)</span>
              <span>20.0 km (Regional basin)</span>
            </div>
          </div>

          {/* 2. Minimum cases per cluster */}
          <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="min-cases-slider" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Minimum cases per cluster
                <span
                  title="Minimum number of verified cases required within the radius to declare an active outbreak cluster (DBSCAN min_samples)."
                  style={{ cursor: 'help', color: 'var(--text-muted)' }}
                >
                  <HelpCircle size={13} />
                </span>
              </label>

              {/* Exact Numeric Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="1"
                  className="cs-input"
                  style={{ width: '60px', height: '28px', padding: '2px 6px', fontSize: '12.5px', textAlign: 'center' }}
                  value={minCasesPerCluster}
                  onChange={(e) => setMinCasesPerCluster(parseInt(e.target.value, 10) || 1)}
                  aria-label="Minimum cases per cluster exact numeric value"
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>cases</span>
              </div>
            </div>

            {/* FULL WIDTH SLIDER */}
            <input
              id="min-cases-slider"
              type="range"
              min="1"
              max="15"
              step="1"
              className="range-input"
              style={{ width: '100%' }}
              value={minCasesPerCluster}
              onChange={(e) => setMinCasesPerCluster(parseInt(e.target.value, 10))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>1 case (Sensitive)</span>
              <span>15 cases (High threshold)</span>
            </div>
          </div>
        </div>

        {/* Date Range / Time Slider & Crop/Disease Filters */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px', marginBottom: '8px' }}>
            {/* 3. Time Slider (Date Range Filter) */}
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label htmlFor="time-window-slider" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} className="text-muted" />
                  <span>Time Window Slider</span>
                </label>
                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                  {timeFilterDays === 0 ? 'All Time (Full History)' : `Past ${timeFilterDays} Days`}
                </span>
              </div>
              <input
                id="time-window-slider"
                type="range"
                min="1"
                max="60"
                step="1"
                className="range-input"
                style={{ width: '100%' }}
                value={timeFilterDays === 0 ? 60 : timeFilterDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTimeFilterDays(val === 60 ? 0 : val);
                }}
                aria-label="Filter surveillance cases and clusters by time range in days"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>1 Day</span>
                <span>14 Days</span>
                <span>30 Days</span>
                <span>60 Days (All)</span>
              </div>
            </div>

            {/* Presets and Dropdown Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Presets:</span>
                {[
                  { label: '7 Days', days: 7 },
                  { label: '14 Days', days: 14 },
                  { label: '30 Days', days: 30 },
                  { label: 'All Time', days: 0 },
                ].map((tf) => (
                  <button
                    key={tf.days}
                    type="button"
                    className={`chip ${timeFilterDays === tf.days ? 'chip-active' : ''}`}
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={() => setTimeFilterDays(tf.days)}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Crop Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="filter-map-crop" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Crop:
                  </label>
                  <select
                    id="filter-map-crop"
                    className="cs-select"
                    style={{ padding: '3px 8px', fontSize: '12px', height: '30px' }}
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                  >
                    <option value="ALL">All Crops</option>
                    {availableCrops.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Disease Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="filter-map-disease" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Disease:
                  </label>
                  <select
                    id="filter-map-disease"
                    className="cs-select"
                    style={{ padding: '3px 8px', fontSize: '12px', height: '30px' }}
                    value={selectedDisease}
                    onChange={(e) => setSelectedDisease(e.target.value)}
                  >
                    <option value="ALL">All Diseases</option>
                    {availableDiseases.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="xs"
              onClick={handleRecalculate}
              loading={isRefreshing}
              icon={RefreshCw}
            >
              Recalculate
            </Button>
          </div>
        </div>
      </div>

      {/* Main Outbreak Grid: Real Leaflet Map + Synced Clusters List */}
      {isError ? (
        <ErrorState
          title="Unable to calculate outbreak clusters"
          message={formatErrorMessage(combinedError)}
          error={combinedError}
          onRetry={handleRecalculate}
          isRetrying={isRefreshing}
        />
      ) : (
        <div className="outbreak-grid">
          {/* Real Leaflet Map Viewport with OpenStreetMap */}
          <div className="panel outbreak-map-panel">
            {isLoading ? (
              <Skeleton height="460px" width="100%" />
            ) : (
              <OfficerLeafletMap
                clusters={filteredClusters}
                cases={filteredCases}
                selectedItem={selectedCluster}
                highlightedId={highlightedClusterId}
                onSelectItem={(item, type) => {
                  if (type === 'cluster') setSelectedCluster(item);
                }}
                height={460}
                mode="outbreaks"
              />
            )}
          </div>

          {/* Right-hand "Active Clusters" list synced with the map */}
          <div className="panel outbreak-list-panel">
            <div className="panel-header-clean">
              <div className="flex-center gap-2">
                <Layers size={17} className="text-primary" aria-hidden="true" />
                <h2 className="panel-title">Active Clusters</h2>
              </div>
              <span className="count-badge">
                {filteredClusters.length} detected &bull; {filteredCases.length} cases
              </span>
            </div>

            {isLoading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Skeleton height="85px" width="100%" />
                <Skeleton height="85px" width="100%" />
                <Skeleton height="85px" width="100%" />
              </div>
            ) : filteredClusters.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No Outbreak Clusters"
                description={`No clusters match your active filters (radius ${clusterRadiusKm} km, min ${minCasesPerCluster} cases). Adjust clustering controls or verify cases in the queue.`}
              />
            ) : (
              <div className="cluster-card-stack" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {filteredClusters.map((cluster) => {
                  const isSelected =
                    (selectedCluster && selectedCluster.cluster_id === cluster.cluster_id) ||
                    (!selectedCluster && filteredClusters[0]?.cluster_id === cluster.cluster_id);

                  // Extract first & last reported dates for this cluster
                  const clusterCases = rawCases.filter((c) =>
                    cluster.case_ids?.includes(c.id)
                  );
                  const timestamps = clusterCases
                    .map((c) => new Date(c.created_at).getTime())
                    .filter((t) => !isNaN(t));
                  const firstDate = timestamps.length ? new Date(Math.min(...timestamps)).toLocaleDateString() : 'N/A';
                  const lastDate = timestamps.length ? new Date(Math.max(...timestamps)).toLocaleDateString() : 'N/A';

                  return (
                    <div
                      key={cluster.cluster_id}
                      className={`cluster-item-card ${isSelected ? 'cluster-selected' : ''}`}
                      onClick={() => setSelectedCluster(cluster)}
                      onMouseEnter={() => setHighlightedClusterId(cluster.cluster_id)}
                      onMouseLeave={() => setHighlightedClusterId(null)}
                      title="Click to zoom map to cluster centroid"
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
                          <span className="text-muted text-xs">Zone Radius:</span>
                          <span className="font-mono text-xs text-body font-semibold">
                            {cluster.radius_km || 1.8} km perimeter
                          </span>
                        </div>

                        <div className="cluster-row">
                          <span className="text-muted text-xs">Reported Window:</span>
                          <span className="font-mono text-xs text-muted">
                            {firstDate} &ndash; {lastDate}
                          </span>
                        </div>

                        <div className="cluster-row">
                          <span className="text-muted text-xs">Centroid Coordinates:</span>
                          <span className="font-mono text-xs text-muted">
                            {typeof cluster.center_latitude === 'number'
                              ? cluster.center_latitude.toFixed(4)
                              : cluster.center_latitude}
                            °N,{' '}
                            {typeof cluster.center_longitude === 'number'
                              ? cluster.center_longitude.toFixed(4)
                              : cluster.center_longitude}
                            °E
                          </span>
                        </div>
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
