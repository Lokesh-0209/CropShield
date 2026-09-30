import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Sliders,
  AlertCircle,
  Layers,
  MapPin,
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
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-heading">Outbreak Intelligence</h1>
          <p className="page-lead">
            Spatial disease clusters identified by DBSCAN density analysis over confirmed field cases.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchOutbreakData}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={`icon-mr ${isLoading ? 'spin' : ''}`} />
          Recalculate
        </button>
      </div>

      {/* DBSCAN Parameters Bar */}
      <div className="parameters-card">
        <div className="parameters-title">
          <Sliders size={15} className="text-muted" />
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

          <button
            type="button"
            className="btn btn-xs btn-primary ml-auto"
            onClick={fetchOutbreakData}
            disabled={isLoading}
          >
            Apply
          </button>
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
            onClick={fetchOutbreakData}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Grid: Map + Clusters */}
      <div className="outbreak-grid">
        {/* Geographic Map */}
        <div className="panel outbreak-map-panel">
          <LocationMap
            clusters={intelligence}
            cases={cases}
            selectedItem={selectedCluster}
            onSelectItem={(item, type) => {
              if (type === 'cluster') setSelectedCluster(item);
            }}
            height={400}
          />
        </div>

        {/* Cluster Information List */}
        <div className="panel outbreak-list-panel">
          <div className="panel-header-clean">
            <div className="flex-center gap-2">
              <Layers size={17} className="text-primary" />
              <h2 className="panel-title">Active Clusters</h2>
            </div>
            <span className="count-badge">{intelligence.length} detected</span>
          </div>

          {isLoading ? (
            <div className="panel-loading">
              <span className="spinner" />
              <p>Analyzing spatial clusters...</p>
            </div>
          ) : intelligence.length === 0 ? (
            <div className="panel-empty p-6">
              <MapPin size={36} className="text-muted mb-2" />
              <h3 className="empty-heading">No Outbreak Clusters</h3>
              <p className="empty-body">
                DBSCAN groups cases requiring at least {minSamples} verified cases within {epsKm} km.
                Verify reported cases in the <strong>Cases</strong> queue to initiate cluster formation.
              </p>
            </div>
          ) : (
            <div className="cluster-card-stack">
              {intelligence.map((cluster) => {
                const isSelected =
                  selectedCluster && selectedCluster.cluster_id === cluster.cluster_id;

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
                          {cluster.center_latitude.toFixed(4)}°N,{' '}
                          {cluster.center_longitude.toFixed(4)}°E
                        </span>
                      </div>

                      <div className="cluster-row">
                        <span className="text-muted text-xs">Average Risk Score:</span>
                        <span className="font-mono text-xs font-semibold">
                          {cluster.average_risk_score.toFixed(1)} / 100
                        </span>
                      </div>

                      {cluster.case_ids && cluster.case_ids.length > 0 && (
                        <div className="cluster-cases-preview">
                          <span className="text-muted text-xs">Case IDs:</span>
                          <div className="cluster-tags">
                            {cluster.case_ids.slice(0, 4).map((id) => (
                              <code key={id} className="case-mini-tag">
                                {id.substring(0, 8)}
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
    </div>
  );
}
