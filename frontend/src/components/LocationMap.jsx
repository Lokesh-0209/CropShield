import { useState, useMemo } from 'react';
import { Navigation, Layers, MapPin } from 'lucide-react';
import { RiskLevel } from '../types/enums';

export default function LocationMap({
  clusters = [],
  cases = [],
  selectedItem = null,
  onSelectItem = null,
  height = 360,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Compute bounding box
  const { points, bounds, viewTransform } = useMemo(() => {
    const allPts = [];

    clusters.forEach((c) => {
      if (typeof c.center_latitude === 'number' && typeof c.center_longitude === 'number') {
        allPts.push({
          type: 'cluster',
          id: `cluster-${c.cluster_id}`,
          raw: c,
          lat: c.center_latitude,
          lng: c.center_longitude,
          title: `Cluster #${c.cluster_id} (${c.dominant_disease || 'Outbreak'})`,
          cases: c.case_count,
          level: c.outbreak_level || c.highest_risk_level || 'MEDIUM',
        });
      }
    });

    cases.forEach((k) => {
      if (typeof k.latitude === 'number' && typeof k.longitude === 'number') {
        allPts.push({
          type: 'case',
          id: `case-${k.id}`,
          raw: k,
          lat: k.latitude,
          lng: k.longitude,
          title: `${k.crop} (${k.disease || k.status})`,
          status: k.status,
          riskLevel: k.risk_level,
          location: k.location_name,
        });
      }
    });

    if (allPts.length === 0) {
      // Default to standard agricultural coordinates (e.g. Bangalore / Kolar region: 12.97, 77.59)
      return {
        points: [],
        bounds: { minLat: 12.8, maxLat: 13.2, minLng: 77.4, maxLng: 77.8 },
        viewTransform: () => ({ x: 200, y: 150 }),
      };
    }

    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;

    allPts.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    // Add padding to bounds
    const latSpan = Math.max(maxLat - minLat, 0.05);
    const lngSpan = Math.max(maxLng - minLng, 0.05);
    minLat -= latSpan * 0.2;
    maxLat += latSpan * 0.2;
    minLng -= lngSpan * 0.2;
    maxLng += lngSpan * 0.2;

    const width = 600;
    const h = height;
    const padding = 45;

    const transform = (lat, lng) => {
      const x = padding + ((lng - minLng) / (maxLng - minLng)) * (width - padding * 2);
      // Invert Y because latitude goes north/up
      const y = h - padding - ((lat - minLat) / (maxLat - minLat)) * (h - padding * 2);
      return { x, y };
    };

    return {
      points: allPts,
      bounds: { minLat, maxLat, minLng, maxLng },
      viewTransform: transform,
    };
  }, [clusters, cases, height]);

  const getColorForLevel = (level) => {
    switch ((level || '').toUpperCase()) {
      case RiskLevel.HIGH:
        return { fill: 'rgba(239, 68, 68, 0.25)', stroke: '#ef4444', text: '#fca5a5' };
      case RiskLevel.MEDIUM:
        return { fill: 'rgba(245, 158, 11, 0.25)', stroke: '#f59e0b', text: '#fde68a' };
      case RiskLevel.LOW:
      default:
        return { fill: 'rgba(16, 185, 129, 0.25)', stroke: '#10b981', text: '#6ee7b7' };
    }
  };

  return (
    <div className="location-map-card">
      <div className="map-toolbar">
        <div className="map-title-row">
          <Navigation size={16} className="map-title-icon" />
          <span className="map-title-text">Spatial Surveillance Radar</span>
          <span className="map-count-badge">
            {clusters.length} Cluster{clusters.length !== 1 ? 's' : ''} &bull; {cases.length} Case
            {cases.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="map-legend">
          <span className="legend-item">
            <span className="legend-dot dot-high"></span> High Outbreak
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-medium"></span> Medium
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-low"></span> Low
          </span>
          <span className="legend-item">
            <span className="legend-pin"></span> Field Case
          </span>
        </div>
      </div>

      <div className="map-canvas-container" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 600 ${height}`}
          className="map-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Geographic outbreak cluster radar"
        >
          <defs>
            <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
              <stop offset="80%" stopColor="#10b981" stopOpacity="0.03" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width="600" height={height} fill="#0d1424" />
          <rect width="600" height={height} fill="url(#mapGrid)" />

          {/* Radar Circles */}
          <circle cx="300" cy={height / 2} r={Math.min(220, height * 0.42)} fill="url(#radarSweep)" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="300" cy={height / 2} r={Math.min(130, height * 0.25)} fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />

          {/* Crosshairs */}
          <line x1="300" y1="20" x2="300" y2={height - 20} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
          <line x1="30" y1={height / 2} x2="570" y2={height / 2} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />

          {/* Coordinate Marks */}
          <text x="35" y="30" fill="rgba(255, 255, 255, 0.35)" fontSize="10" fontFamily="monospace">
            {bounds.maxLat.toFixed(3)}°N, {bounds.minLng.toFixed(3)}°E
          </text>
          <text x="440" y={height - 20} fill="rgba(255, 255, 255, 0.35)" fontSize="10" fontFamily="monospace">
            {bounds.minLat.toFixed(3)}°N, {bounds.maxLng.toFixed(3)}°E
          </text>

          {/* Empty State message inside SVG if no data */}
          {points.length === 0 && (
            <g transform={`translate(300, ${height / 2})`}>
              <text textAnchor="middle" y="-10" fill="#94a3b8" fontSize="13" fontWeight="500">
                Awaiting Verified Disease Clusters
              </text>
              <text textAnchor="middle" y="14" fill="#64748b" fontSize="11">
                Submit cases & verify them to generate DBSCAN spatial clusters
              </text>
            </g>
          )}

          {/* Render Cluster Zones */}
          {points
            .filter((p) => p.type === 'cluster')
            .map((p) => {
              const { x, y } = viewTransform(p.lat, p.lng);
              const colors = getColorForLevel(p.level);
              const radius = Math.min(50, Math.max(24, (p.cases || 3) * 7));
              const isSelected = selectedItem && selectedItem.cluster_id === p.raw.cluster_id;

              return (
                <g
                  key={p.id}
                  className="cluster-svg-group"
                  onClick={() => onSelectItem && onSelectItem(p.raw, 'cluster')}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer pulse */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="cluster-radar-pulse"
                  />
                  {/* Center Dot */}
                  <circle cx={x} cy={y} r="5" fill={colors.stroke} />
                  {/* Cluster Label */}
                  <rect
                    x={x - 30}
                    y={y + radius + 3}
                    width="60"
                    height="18"
                    rx="9"
                    fill="#0f172a"
                    stroke={colors.stroke}
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={y + radius + 15}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    Cluster #{p.raw.cluster_id} ({p.cases})
                  </text>
                </g>
              );
            })}

          {/* Render Individual Case Markers */}
          {points
            .filter((p) => p.type === 'case')
            .map((p) => {
              const { x, y } = viewTransform(p.lat, p.lng);
              const isVerified = p.status === 'VERIFIED';
              const strokeColor = isVerified ? '#10b981' : '#f59e0b';

              return (
                <g
                  key={p.id}
                  className="case-svg-pin"
                  onClick={() => onSelectItem && onSelectItem(p.raw, 'case')}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              );
            })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="map-tooltip">
            <div className="tooltip-header">
              {hoveredPoint.type === 'cluster' ? (
                <Layers size={13} className="tooltip-icon" />
              ) : (
                <MapPin size={13} className="tooltip-icon" />
              )}
              <strong>{hoveredPoint.title}</strong>
            </div>
            <div className="tooltip-body">
              <div>Coords: {hoveredPoint.lat.toFixed(4)}, {hoveredPoint.lng.toFixed(4)}</div>
              {hoveredPoint.type === 'cluster' ? (
                <>
                  <div>Verified Cases: {hoveredPoint.cases}</div>
                  <div>Outbreak Severity: <strong>{hoveredPoint.level}</strong></div>
                </>
              ) : (
                <>
                  <div>Status: {hoveredPoint.status}</div>
                  {hoveredPoint.location && <div>Location: {hoveredPoint.location}</div>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
