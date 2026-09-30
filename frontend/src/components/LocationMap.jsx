import { useState, useMemo } from 'react';
import { Navigation, Layers, MapPin } from 'lucide-react';
import { RiskLevel } from '../types/enums';

export default function LocationMap({
  clusters = [],
  cases = [],
  selectedItem = null,
  onSelectItem = null,
  height = 380,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Compute bounding box and normalizations
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
          title: `Cluster #${c.cluster_id}`,
          disease: c.dominant_disease || 'Outbreak',
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

    const latSpan = Math.max(maxLat - minLat, 0.05);
    const lngSpan = Math.max(maxLng - minLng, 0.05);
    minLat -= latSpan * 0.18;
    maxLat += latSpan * 0.18;
    minLng -= lngSpan * 0.18;
    maxLng += lngSpan * 0.18;

    const width = 640;
    const h = height;
    const padding = 40;

    const transform = (lat, lng) => {
      const x = padding + ((lng - minLng) / (maxLng - minLng)) * (width - padding * 2);
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
        return { fill: 'rgba(239, 68, 68, 0.12)', stroke: '#dc2626', text: '#991b1b', bg: '#fef2f2' };
      case RiskLevel.MEDIUM:
        return { fill: 'rgba(245, 158, 11, 0.14)', stroke: '#d97706', text: '#92400e', bg: '#fffbeb' };
      case RiskLevel.LOW:
      default:
        return { fill: 'rgba(22, 163, 74, 0.12)', stroke: '#16a34a', text: '#166534', bg: '#f0fdf4' };
    }
  };

  return (
    <div className="clean-map-container">
      {/* Map Header / Legend */}
      <div className="clean-map-header">
        <div className="flex-center gap-2">
          <Navigation size={15} className="text-primary" />
          <span className="font-semibold text-sm">Spatial Cluster Map</span>
          <span className="text-muted text-xs">
            ({clusters.length} clusters, {cases.length} cases)
          </span>
        </div>

        <div className="clean-map-legend">
          <span className="legend-chip">
            <span className="legend-swatch swatch-high" /> High Risk
          </span>
          <span className="legend-chip">
            <span className="legend-swatch swatch-medium" /> Medium
          </span>
          <span className="legend-chip">
            <span className="legend-swatch swatch-low" /> Low
          </span>
          <span className="legend-chip">
            <span className="legend-swatch swatch-case" /> Case Pin
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="clean-map-canvas" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 640 ${height}`}
          className="clean-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Geographic outbreak cluster map"
        >
          <defs>
            <pattern id="lightGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Clean Light Background */}
          <rect width="640" height={height} fill="#fcfcfd" />
          <rect width="640" height={height} fill="url(#lightGrid)" />

          {/* Coordinate Axes */}
          <line x1="40" y1={height - 35} x2="600" y2={height - 35} stroke="#e2e8f0" strokeWidth="1" />
          <line x1="40" y1="30" x2="40" y2={height - 35} stroke="#e2e8f0" strokeWidth="1" />

          {/* Coordinate labels */}
          <text x="45" y="24" fill="#94a3b8" fontSize="11" fontFamily="monospace">
            {bounds.maxLat.toFixed(2)}°N, {bounds.minLng.toFixed(2)}°E
          </text>
          <text x="510" y={height - 18} fill="#94a3b8" fontSize="11" fontFamily="monospace">
            {bounds.minLat.toFixed(2)}°N, {bounds.maxLng.toFixed(2)}°E
          </text>

          {/* Empty notice if no data */}
          {points.length === 0 && (
            <g transform={`translate(320, ${height / 2})`}>
              <text textAnchor="middle" y="-6" fill="#64748b" fontSize="14" fontWeight="600">
                No Geographic Clusters Active
              </text>
              <text textAnchor="middle" y="16" fill="#94a3b8" fontSize="12">
                Verify submitted cases to generate DBSCAN spatial clusters
              </text>
            </g>
          )}

          {/* Render Cluster Boundary Circles */}
          {points
            .filter((p) => p.type === 'cluster')
            .map((p) => {
              const { x, y } = viewTransform(p.lat, p.lng);
              const colors = getColorForLevel(p.level);
              const radius = Math.min(54, Math.max(26, (p.cases || 3) * 8));
              const isSelected = selectedItem && selectedItem.cluster_id === p.raw.cluster_id;

              return (
                <g
                  key={p.id}
                  className="cluster-group"
                  onClick={() => onSelectItem && onSelectItem(p.raw, 'cluster')}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <circle cx={x} cy={y} r="4.5" fill={colors.stroke} />
                  <rect
                    x={x - 34}
                    y={y + radius + 4}
                    width="68"
                    height="18"
                    rx="4"
                    fill="#ffffff"
                    stroke={colors.stroke}
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={y + radius + 16}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize="10"
                    fontWeight="700"
                  >
                    Cluster #{p.raw.cluster_id} ({p.cases})
                  </text>
                </g>
              );
            })}

          {/* Render Case Markers */}
          {points
            .filter((p) => p.type === 'case')
            .map((p) => {
              const { x, y } = viewTransform(p.lat, p.lng);
              const isVerified = p.status === 'VERIFIED';
              const pinColor = isVerified ? '#15803d' : '#d97706';

              return (
                <g
                  key={p.id}
                  className="case-pin"
                  onClick={() => onSelectItem && onSelectItem(p.raw, 'case')}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={pinColor}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="clean-map-tooltip">
            <div className="tooltip-title">
              {hoveredPoint.type === 'cluster' ? (
                <Layers size={13} className="text-primary" />
              ) : (
                <MapPin size={13} className="text-primary" />
              )}
              <span>{hoveredPoint.title}</span>
            </div>
            <div className="tooltip-content">
              {hoveredPoint.type === 'cluster' ? (
                <>
                  <div>Pathogen: <strong>{hoveredPoint.disease}</strong></div>
                  <div>Verified Cases: {hoveredPoint.cases}</div>
                  <div>Outbreak Severity: <strong>{hoveredPoint.level}</strong></div>
                </>
              ) : (
                <>
                  <div>Status: {hoveredPoint.status}</div>
                  {hoveredPoint.location && <div>Location: {hoveredPoint.location}</div>}
                </>
              )}
              <div className="text-muted text-xs font-mono mt-1">
                {hoveredPoint.lat.toFixed(4)}°, {hoveredPoint.lng.toFixed(4)}°
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
