import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Navigation, Flame, AlertTriangle, ShieldCheck } from 'lucide-react';
import { RiskLevel } from '../../types/enums';

// Helper for severity styling and icons
function getSeverityProps(level) {
  switch ((level || '').toUpperCase()) {
    case RiskLevel.HIGH:
      return {
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.18,
        label: 'High Risk',
        iconSymbol: '🔥',
        border: '#b91c1c',
      };
    case RiskLevel.MEDIUM:
      return {
        color: '#d97706',
        fillColor: '#f59e0b',
        fillOpacity: 0.18,
        label: 'Medium Risk',
        iconSymbol: '⚠️',
        border: '#b45309',
      };
    case RiskLevel.LOW:
    default:
      return {
        color: '#16a34a',
        fillColor: '#22c55e',
        fillOpacity: 0.18,
        label: 'Low Risk',
        iconSymbol: '🛡️',
        border: '#15803d',
      };
  }
}

/**
 * Real Leaflet Outbreak & Active Surveillance Map.
 * Renders OpenStreetMap tiles, severity cluster circles, case pins, numbered markers,
 * and handles bidirectional sync with lists.
 */
export default function OfficerLeafletMap({
  clusters = [],
  cases = [],
  surveillanceFields = [],
  mode = 'outbreaks', // 'outbreaks' | 'inspect'
  selectedItem = null,
  highlightedId = null,
  onSelectItem = null,
  height = 420,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const clusterMarkersRef = useRef({});

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered around Karnataka agro-belt (Kolar / Chikkaballapur)
    const map = L.map(mapContainerRef.current, {
      center: [13.25, 77.9],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Attribution
    L.control
      .attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('&copy; OpenStreetMap contributors &bull; CropShield HQ')
      .addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Layers whenever data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    clusterMarkersRef.current = {};

    const allBounds = [];

    if (mode === 'outbreaks') {
      // 1. Render Cluster Circles & Center Badges
      clusters.forEach((cluster) => {
        const lat = cluster.center_latitude;
        const lng = cluster.center_longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        allBounds.push([lat, lng]);
        const severity = getSeverityProps(cluster.outbreak_level);
        const radiusMeters = (cluster.radius_km || 1.8) * 1000;
        const isSelected = selectedItem && selectedItem.cluster_id === cluster.cluster_id;

        // Visual Circle Perimeter
        const circle = L.circle([lat, lng], {
          radius: radiusMeters,
          color: severity.color,
          weight: isSelected ? 3 : 2,
          opacity: 0.9,
          fillColor: severity.fillColor,
          fillOpacity: isSelected ? 0.3 : 0.16,
          dashArray: isSelected ? undefined : '5, 5',
        });

        // First and last case reported dates
        const clusterCases = cases.filter((c) =>
          cluster.case_ids?.includes(c.id)
        );
        const dates = clusterCases
          .map((c) => new Date(c.created_at).getTime())
          .filter((t) => !isNaN(t));
        const firstReport = dates.length ? new Date(Math.min(...dates)).toLocaleDateString() : 'Recent';
        const lastReport = dates.length ? new Date(Math.max(...dates)).toLocaleDateString() : 'Recent';

        // Rich Outbreak Popup
        const popupHtml = `
          <div class="cs-map-popup">
            <div class="cs-map-popup-badge" style="background:${severity.fillColor}; color:#fff;">
              ${severity.iconSymbol} ${severity.label} &bull; Cluster #${cluster.cluster_id}
            </div>
            <div class="cs-map-popup-title">${cluster.dominant_disease || 'Pathogen Outbreak'}</div>
            <div class="cs-map-popup-rows">
              <div class="cs-popup-row"><span>Verified Cases:</span> <strong>${cluster.case_count} cases</strong></div>
              <div class="cs-popup-row"><span>Cluster Radius:</span> <strong>${cluster.radius_km || 1.8} km</strong></div>
              <div class="cs-popup-row"><span>Mean Risk Score:</span> <strong>${cluster.average_risk_score} / 100</strong></div>
              <div class="cs-popup-row"><span>First Case:</span> <strong>${firstReport}</strong></div>
              <div class="cs-popup-row"><span>Last Case:</span> <strong>${lastReport}</strong></div>
            </div>
          </div>
        `;

        circle.bindPopup(popupHtml, { maxWidth: 260, className: 'cs-leaflet-popup' });
        circle.on('click', () => {
          if (onSelectItem) onSelectItem(cluster, 'cluster');
        });

        layerGroup.addLayer(circle);

        // Center Marker with Badge & Severity Icon
        const centerIcon = L.divIcon({
          className: 'cs-cluster-center-icon',
          html: `
            <div class="cs-cluster-node ${isSelected ? 'is-selected' : ''}" style="border-color:${severity.border};">
              <span class="cs-cluster-symbol">${severity.iconSymbol}</span>
              <span class="cs-cluster-count">${cluster.case_count}</span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const centerMarker = L.marker([lat, lng], { icon: centerIcon });
        centerMarker.bindPopup(popupHtml, { maxWidth: 260, className: 'cs-leaflet-popup' });
        centerMarker.on('click', () => {
          if (onSelectItem) onSelectItem(cluster, 'cluster');
        });

        layerGroup.addLayer(centerMarker);
        clusterMarkersRef.current[cluster.cluster_id] = { circle, marker: centerMarker, lat, lng };
      });

      // 2. Render Verified & Pending Case Pins
      cases.forEach((c) => {
        const lat = c.latitude;
        const lng = c.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        allBounds.push([lat, lng]);
        const isVerified = c.status === 'VERIFIED';
        const pinBg = isVerified ? '#15803d' : '#d97706';

        const caseIcon = L.divIcon({
          className: 'cs-case-pin-icon',
          html: `
            <div class="cs-case-pin ${isVerified ? 'verified' : 'pending'}" style="background:${pinBg};" title="${c.crop} - ${c.disease || c.status}">
              <div class="cs-case-pin-inner"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([lat, lng], { icon: caseIcon });
        const caseDate = c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A';

        const casePopup = `
          <div class="cs-map-popup">
            <div class="cs-map-popup-badge" style="background:${isVerified ? '#15803d' : '#d97706'}; color:#fff;">
              ${isVerified ? '✓ Verified Specimen' : '⏳ Needs Verification'}
            </div>
            <div class="cs-map-popup-title">${c.crop} &bull; ${c.disease || 'Analyzed'}</div>
            <div class="cs-map-popup-rows">
              <div class="cs-popup-row"><span>Location:</span> <strong>${c.location_name}</strong></div>
              <div class="cs-popup-row"><span>Reported Date:</span> <strong>${caseDate}</strong></div>
              <div class="cs-popup-row"><span>Risk Score:</span> <strong>${c.risk_score || '-'} / 100</strong></div>
            </div>
          </div>
        `;

        marker.bindPopup(casePopup, { maxWidth: 240, className: 'cs-leaflet-popup' });
        marker.on('click', () => {
          if (onSelectItem) onSelectItem(c, 'case');
        });

        layerGroup.addLayer(marker);
      });
    } else if (mode === 'inspect') {
      // 3. Render Numbered Surveillance Markers for Inspect Next (#1, #2, #3...)
      surveillanceFields.forEach((field) => {
        const lat = field.latitude;
        const lng = field.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        allBounds.push([lat, lng]);
        const isHigh = (field.risk_level || '').toUpperCase() === 'HIGH';
        const isSelected = selectedItem && selectedItem.field_id === field.field_id;

        const numberedIcon = L.divIcon({
          className: 'cs-numbered-pin-icon',
          html: `
            <div class="cs-numbered-pin ${isHigh ? 'pin-high' : 'pin-medium'} ${isSelected ? 'pin-selected' : ''}">
              <span class="cs-pin-number">#${field.rank}</span>
            </div>
          `,
          iconSize: [34, 42],
          iconAnchor: [17, 42],
        });

        const marker = L.marker([lat, lng], { icon: numberedIcon });
        const popupHtml = `
          <div class="cs-map-popup">
            <div class="cs-map-popup-badge" style="background:${isHigh ? 'var(--severity-high)' : 'var(--severity-medium)'}; color:#fff;">
              Priority Rank #${field.rank} &bull; Urgency ${field.urgency_score}/100
            </div>
            <div class="cs-map-popup-title">${field.name}</div>
            <div class="cs-map-popup-rows">
              <div class="cs-popup-row"><span>Crop:</span> <strong>${field.crop}</strong></div>
              <div class="cs-popup-row"><span>Location:</span> <strong>${field.location_name}</strong></div>
              <div class="cs-popup-row"><span>Buffer Distance:</span> <strong>${field.distance_to_cluster}</strong></div>
              <div class="cs-popup-row"><span>Suspected Pathogen:</span> <strong>${field.suspected_pathogen || 'Early Blight'}</strong></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 260, className: 'cs-leaflet-popup' });
        marker.on('click', () => {
          if (onSelectItem) onSelectItem(field, 'field');
        });

        layerGroup.addLayer(marker);
      });
    }

    // Auto-fit bounds if points exist
    if (allBounds.length > 0) {
      try {
        map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 12 });
      } catch {
        // fallback center
      }
    }
  }, [clusters, cases, surveillanceFields, mode, selectedItem, onSelectItem]);

  // Pan / Zoom smoothly when selectedItem or highlightedId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedItem) return;

    let targetLat = null;
    let targetLng = null;

    if (selectedItem.center_latitude) {
      targetLat = selectedItem.center_latitude;
      targetLng = selectedItem.center_longitude;
    } else if (selectedItem.latitude) {
      targetLat = selectedItem.latitude;
      targetLng = selectedItem.longitude;
    }

    if (typeof targetLat === 'number' && typeof targetLng === 'number') {
      map.flyTo([targetLat, targetLng], Math.max(map.getZoom(), 12), { duration: 0.8 });
    }
  }, [selectedItem]);

  // Hover sync: open popup or highlight circle
  useEffect(() => {
    if (!highlightedId) return;
    const entry = clusterMarkersRef.current[highlightedId];
    if (entry && entry.marker) {
      entry.marker.openPopup();
    }
  }, [highlightedId]);

  return (
    <div className="cs-leaflet-container">
      {/* Map Control Overlay / Legend */}
      <div className="cs-map-overlay-bar">
        <div className="flex-center gap-2">
          <Navigation size={14} className="text-primary flex-shrink-0" />
          <span className="cs-map-overlay-title">
            {mode === 'outbreaks' ? 'Spatial Outbreak Cluster Map' : 'Surveillance Priority Field Map'}
          </span>
          <span className="cs-map-overlay-sub">
            {mode === 'outbreaks'
              ? `(${clusters.length} active clusters, ${cases.length} cases)`
              : `(${surveillanceFields.length} sentinel targets)`}
          </span>
        </div>

        {/* Legend */}
        <div className="cs-map-legend">
          {mode === 'outbreaks' ? (
            <>
              <span className="legend-chip">
                <span className="legend-swatch" style={{ background: '#ef4444' }} /> High Risk
              </span>
              <span className="legend-chip">
                <span className="legend-swatch" style={{ background: '#f59e0b' }} /> Medium
              </span>
              <span className="legend-chip">
                <span className="legend-swatch" style={{ background: '#22c55e' }} /> Low
              </span>
              <span className="legend-chip">
                <span className="legend-swatch" style={{ background: '#15803d', borderRadius: '50%' }} /> Verified Pin
              </span>
              <span className="legend-chip">
                <span className="legend-swatch" style={{ background: '#d97706', borderRadius: '50%' }} /> Pending Pin
              </span>
            </>
          ) : (
            <>
              <span className="legend-chip">
                <span className="legend-swatch" style={{ background: '#dc2626' }} /> #1 Urgent
              </span>
              <span className="legend-chip">
                <span className="legend-swatch" style={{ background: '#d97706' }} /> Elevated Priority
              </span>
            </>
          )}
        </div>
      </div>

      {/* Real Map Viewport */}
      <div
        ref={mapContainerRef}
        className="cs-leaflet-viewport"
        style={{ height: `${height}px`, width: '100%' }}
      />
    </div>
  );
}
