import { useState, useEffect, useCallback } from 'react';
import {
  Radar,
  RefreshCw,
  Layers,
  AlertOctagon,
  Sliders,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { getOutbreakIntelligence } from '../api/outbreaks';
import { listCases } from '../api/cases';
import LocationMap from '../components/LocationMap';
import RiskBadge from '../components/RiskBadge';

export default function OutbreakIntelligencePage() {
  const [intelligence, setIntelligence] = useState([]);
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // DBSCAN tuning parameters
  const [epsKm, setEpsKm] = useState(2.0);
  const [minSamples, setMinSamples] = useState(3);
  const [selectedCluster, setSelectedCluster] = useState(null);

  const fetchOutbreakData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch synthesized intelligence: GET /api/outbreaks/intelligence
      // 2. Fetch cases to render pins on the radar map
      const [intelRes, caseListRes] = await Promise.allSettled([
        getOutbreakIntelligence({ eps_km: epsKm, min_samples: minSamples }),
        listCases({ limit: 100 }),
      ]);

      if (intelRes.status === 'fulfilled') {
        const intelList = intelRes.value?.clusters || [];
        setIntelligence(intelList);
        if (intelList.length > 0 && !selectedCluster) {
          setSelectedCluster(intelList[0]);
        }
      } else {
        throw intelRes.reason;
      }

      if (caseListRes.status === 'fulfilled') {
        setCases(caseListRes.value?.items || []);
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Failed to load outbreak intelligence from CropShield API.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [epsKm, minSamples, selectedCluster]);

  useEffect(() => {
    fetchOutbreakData();
  }, [fetchOutbreakData]);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <Radar className="title-icon text-emerald" />
            Outbreak Intelligence & Spatial Clustering
          </h1>
          <p className="page-description">
            Spatial epidemiology engine applying DBSCAN with Haversine spherical distance over confirmed
            VERIFIED crop cases to isolate active contagion vectors.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-refresh"
          onClick={fetchOutbreakData}
          disabled={isLoading}
        >
          <RefreshCw size={15} className={`icon-mr ${isLoading ? 'spin' : ''}`} />
          Recalculate Clusters
        </button>
      </div>

      {/* DBSCAN Parameter Tuning Toolbar */}
      <div className="dbscan-controls-bar">
        <div className="dbscan-controls-title">
          <Sliders size={16} className="text-emerald" />
          <span>DBSCAN Clustering Hyperparameters:</span>
        </div>

        <div className="dbscan-inputs-row">
          <div className="dbscan-param">
            <label htmlFor="eps-km" className="param-label">
              Neighborhood Radius (<code>eps_km</code>): <strong>{epsKm} km</strong>
            </label>
            <input
              id="eps-km"
              type="range"
              min="0.5"
              max="20.0"
              step="0.5"
              className="param-slider"
              value={epsKm}
              onChange={(e) => setEpsKm(parseFloat(e.target.value))}
            />
          </div>

          <div className="dbscan-param">
            <label htmlFor="min-samples" className="param-label">
              Density Threshold (<code>min_samples</code>): <strong>{minSamples} cases</strong>
            </label>
            <input
              id="min-samples"
              type="range"
              min="1"
              max="10"
              step="1"
              className="param-slider"
              value={minSamples}
              onChange={(e) => setMinSamples(parseInt(e.target.value, 10))}
            />
          </div>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={fetchOutbreakData}
            disabled={isLoading}
          >
            Apply Parameters
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="form-error-banner mb-4" role="alert">
          <AlertOctagon size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary ml-auto"
            onClick={fetchOutbreakData}
          >
            Retry
          </button>
        </div>
      )}

      {/* Spatial Visualization + Cluster Cards Layout */}
      <div className="intel-layout-grid">
        {/* Geographic / Radar Map Component */}
        <div className="intel-map-section">
          <LocationMap
            clusters={intelligence}
            cases={cases}
            selectedItem={selectedCluster}
            onSelectItem={(item, type) => {
              if (type === 'cluster') setSelectedCluster(item);
            }}
            height={420}
          />

          <div className="map-footnote">
            <Info size={14} className="text-muted" />
            <span>
              Centroids are computed from verified case coordinates using Haversine spherical metrics.
              Hover over circles to view spatial coordinates.
            </span>
          </div>
        </div>

        {/* Intelligence Cards Section */}
        <div className="intel-clusters-section">
          <div className="section-subtitle-row">
            <Layers size={18} className="text-emerald" />
            <h2 className="section-heading">Synthesized Outbreak Clusters</h2>
            <span className="count-tag">{intelligence.length} Active Hotspot(s)</span>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <span className="spinner" />
              <p>Computing DBSCAN spatial clusters...</p>
            </div>
          ) : intelligence.length === 0 ? (
            <div className="empty-state-card">
              <ShieldAlert size={36} className="text-amber" />
              <h3>No Outbreak Clusters Detected</h3>
              <p>
                DBSCAN requires at least <strong>{minSamples} verified cases</strong> within a{' '}
                <strong>{epsKm} km radius</strong>.
              </p>
              <div className="empty-help-box">
                <strong>Next Step:</strong> Ensure cases are in <code>VERIFIED</code> status in the{' '}
                <strong>Officer Queue</strong> and lie in geographic proximity. You can also lower{' '}
                <code>min_samples</code> to <code>1</code> or <code>2</code> above to inspect isolated points.
              </div>
            </div>
          ) : (
            <div className="clusters-list">
              {intelligence.map((cluster) => {
                const isSelected =
                  selectedCluster && selectedCluster.cluster_id === cluster.cluster_id;

                return (
                  <div
                    key={cluster.cluster_id}
                    className={`card cluster-card ${isSelected ? 'cluster-card-selected' : ''}`}
                    onClick={() => setSelectedCluster(cluster)}
                  >
                    <div className="cluster-header">
                      <div className="cluster-badge-group">
                        <span className="cluster-id-badge">
                          Cluster #{cluster.cluster_id}
                        </span>
                        <span className="cluster-count-badge">
                          {cluster.case_count} Verified Case{cluster.case_count !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <RiskBadge
                        level={cluster.outbreak_level}
                        score={cluster.average_risk_score}
                        size="md"
                      />
                    </div>

                    <div className="cluster-body">
                      <div className="cluster-stat-row">
                        <span className="stat-label">Dominant Crop Pathogen:</span>
                        <strong className="dominant-disease-name">
                          {cluster.dominant_disease || 'Unknown'}
                        </strong>
                      </div>

                      <div className="cluster-stat-row">
                        <span className="stat-label">Cluster Center Coordinates:</span>
                        <span className="font-mono text-muted">
                          {cluster.center_latitude.toFixed(4)}°N,{' '}
                          {cluster.center_longitude.toFixed(4)}°E
                        </span>
                      </div>

                      <div className="cluster-stat-row">
                        <span className="stat-label">Highest Case Risk Level:</span>
                        <span className="font-medium">{cluster.highest_risk_level}</span>
                      </div>

                      <div className="cluster-stat-row">
                        <span className="stat-label">Mean Outbreak Risk Score:</span>
                        <div className="score-meter-wrap">
                          <span className="score-num font-mono">
                            {cluster.average_risk_score.toFixed(1)} / 100
                          </span>
                          <div className="meter-bar">
                            <div
                              className={`meter-fill meter-risk-${(cluster.outbreak_level || 'low').toLowerCase()}`}
                              style={{
                                width: `${Math.min(100, cluster.average_risk_score)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {cluster.case_ids && cluster.case_ids.length > 0 && (
                        <div className="case-ids-row">
                          <span className="label-xs">Associated Case IDs:</span>
                          <div className="case-id-tags">
                            {cluster.case_ids.slice(0, 5).map((id) => (
                              <code key={id} className="case-id-tag">
                                {id.substring(0, 8)}...
                              </code>
                            ))}
                            {cluster.case_ids.length > 5 && (
                              <span className="text-muted text-xs">
                                +{cluster.case_ids.length - 5} more
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
    </div>
  );
}
