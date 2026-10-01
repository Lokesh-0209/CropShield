import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Edit2, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Default Karnataka / Kolar coordinates
const DEFAULT_LAT = 13.1368;
const DEFAULT_LNG = 78.1348;

/**
 * Format human-readable location label based on coordinates
 */
function formatLocationLabel(lat, lng) {
  const roundLat = Math.round(lat * 100) / 100;
  const roundLng = Math.round(lng * 100) / 100;

  if (Math.abs(lat - 13.13) < 0.2 && Math.abs(lng - 78.13) < 0.2) {
    return `Kolar Agro Sector (Plot ${Math.abs(Math.round(lat * 1000) % 50) + 1}), Karnataka`;
  }
  if (Math.abs(lat - 13.0) < 0.3 && Math.abs(lng - 76.1) < 0.3) {
    return `Hassan Farm Sector, Karnataka`;
  }
  if (Math.abs(lat - 15.4) < 0.4 && Math.abs(lng - 75.0) < 0.4) {
    return `Dharwad Agricultural Belt, Karnataka`;
  }
  return `Field Plot at ${roundLat}°N, ${roundLng}°E`;
}

// Custom crisp SVG pin icon for Leaflet (avoids bundler image asset 404s)
function createCustomPinIcon() {
  return L.divIcon({
    className: 'cs-custom-map-pin',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 32px;
          height: 32px;
          background: #15803d;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

export default function LocationPicker({
  latitude,
  longitude,
  locationName,
  onChange,
  error,
}) {
  const { t } = useTranslation();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isLocating, setIsLocating] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [manualLat, setManualLat] = useState(latitude ? String(latitude) : String(DEFAULT_LAT));
  const [manualLng, setManualLng] = useState(longitude ? String(longitude) : String(DEFAULT_LNG));
  const [geoError, setGeoError] = useState('');

  const isPinned = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  const currentLat = isPinned ? Number(latitude) : DEFAULT_LAT;
  const currentLng = isPinned ? Number(longitude) : DEFAULT_LNG;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: isPinned ? 14 : 11,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      let marker = null;
      if (isPinned) {
        marker = L.marker([currentLat, currentLng], {
          draggable: true,
          icon: createCustomPinIcon(),
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const lat = Math.round(pos.lat * 10000) / 10000;
          const lng = Math.round(pos.lng * 10000) / 10000;
          setManualLat(String(lat));
          setManualLng(String(lng));
          setGeoError('');
          const suggestedName = locationName || formatLocationLabel(lat, lng);
          onChangeRef.current?.({ latitude: lat, longitude: lng, locationName: suggestedName });
        });
      }

      map.on('click', (e) => {
        const lat = Math.round(e.latlng.lat * 10000) / 10000;
        const lng = Math.round(e.latlng.lng * 10000) / 10000;

        if (!markerRef.current) {
          const newMarker = L.marker([lat, lng], {
            draggable: true,
            icon: createCustomPinIcon(),
          }).addTo(map);

          newMarker.on('dragend', () => {
            const pos = newMarker.getLatLng();
            const pLat = Math.round(pos.lat * 10000) / 10000;
            const pLng = Math.round(pos.lng * 10000) / 10000;
            setManualLat(String(pLat));
            setManualLng(String(pLng));
            setGeoError('');
            const suggestedName = locationName || formatLocationLabel(pLat, pLng);
            onChangeRef.current?.({ latitude: pLat, longitude: pLng, locationName: suggestedName });
          });

          markerRef.current = newMarker;
        } else {
          markerRef.current.setLatLng(e.latlng);
        }

        setManualLat(String(lat));
        setManualLng(String(lng));
        setGeoError('');
        const suggestedName = locationName || formatLocationLabel(lat, lng);
        onChangeRef.current?.({ latitude: lat, longitude: lng, locationName: suggestedName });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map view if external latitude/longitude changes
  useEffect(() => {
    if (mapInstanceRef.current && isPinned) {
      if (!markerRef.current) {
        const newMarker = L.marker([currentLat, currentLng], {
          draggable: true,
          icon: createCustomPinIcon(),
        }).addTo(mapInstanceRef.current);

        newMarker.on('dragend', () => {
          const pos = newMarker.getLatLng();
          const lat = Math.round(pos.lat * 10000) / 10000;
          const lng = Math.round(pos.lng * 10000) / 10000;
          setManualLat(String(lat));
          setManualLng(String(lng));
          setGeoError('');
          const suggestedName = locationName || formatLocationLabel(lat, lng);
          onChangeRef.current?.({ latitude: lat, longitude: lng, locationName: suggestedName });
        });

        markerRef.current = newMarker;
      } else {
        const markerPos = markerRef.current.getLatLng();
        if (
          Math.abs(markerPos.lat - currentLat) > 0.0001 ||
          Math.abs(markerPos.lng - currentLng) > 0.0001
        ) {
          markerRef.current.setLatLng([currentLat, currentLng]);
          mapInstanceRef.current.panTo([currentLat, currentLng]);
        }
      }
    }
    if (isPinned) {
      setManualLat(String(currentLat));
      setManualLng(String(currentLng));
    }
  }, [currentLat, currentLng, isPinned, locationName]);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoError(t('locationStep.gpsUnsupported', 'GPS location is not supported by your browser.'));
      return;
    }

    setIsLocating(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        const roundedLat = Math.round(lat * 10000) / 10000;
        const roundedLng = Math.round(lng * 10000) / 10000;

        if (mapInstanceRef.current) {
          if (!markerRef.current) {
            const newMarker = L.marker([roundedLat, roundedLng], {
              draggable: true,
              icon: createCustomPinIcon(),
            }).addTo(mapInstanceRef.current);
            markerRef.current = newMarker;
          } else {
            markerRef.current.setLatLng([roundedLat, roundedLng]);
          }
          mapInstanceRef.current.setView([roundedLat, roundedLng], 15);
        }

        setManualLat(String(roundedLat));
        setManualLng(String(roundedLng));
        const suggestedName = locationName || formatLocationLabel(roundedLat, roundedLng);
        onChangeRef.current?.({
          latitude: roundedLat,
          longitude: roundedLng,
          locationName: suggestedName,
        });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setGeoError(t('locationStep.gpsError', 'Could not get your exact GPS location. Please tap the map to mark your field.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  function applyManualCoordinates() {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGeoError(t('locationStep.invalidCoords', 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180).'));
      return;
    }

    if (mapInstanceRef.current) {
      if (!markerRef.current) {
        const newMarker = L.marker([lat, lng], {
          draggable: true,
          icon: createCustomPinIcon(),
        }).addTo(mapInstanceRef.current);
        markerRef.current = newMarker;
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }
      mapInstanceRef.current.setView([lat, lng], 14);
    }

    const suggestedName = locationName || formatLocationLabel(lat, lng);
    onChangeRef.current?.({
      latitude: lat,
      longitude: lng,
      locationName: suggestedName,
    });
    setShowManualEdit(false);
  }

  return (
    <div className="cs-location-picker">
      {/* 1. Quick Location Action */}
      <div className="cs-location-header-action mb-3">
        <button
          type="button"
          className="cs-btn cs-btn-primary cs-btn-block"
          style={{ minHeight: '48px', fontSize: '15px', fontWeight: 700 }}
          onClick={handleUseMyLocation}
          disabled={isLocating}
        >
          <Navigation size={18} className={`icon-mr ${isLocating ? 'spin' : ''}`} />
          <span>
            {isLocating
              ? t('locationStep.gettingLocation', 'Detecting GPS location...')
              : t('locationStep.useLocation', 'Use my current GPS location')}
          </span>
        </button>
      </div>

      {geoError && (
        <div className="cs-input-error-banner mb-3" role="alert">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* 2. Interactive Leaflet Map */}
      <div className="cs-map-card">
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '240px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-xs)',
          }}
          aria-label="Interactive map for selecting crop field location"
        />
        <div className="cs-map-caption">
          <MapPin size={14} className="text-primary flex-shrink-0" />
          <span>{t('locationStep.pinNotice', 'Tap or drag the pin to mark your exact field location.')}</span>
        </div>
      </div>

      {/* 3. Small Read-only Coordinates & Manual Edit Toggle */}
      <div className="cs-coords-row mt-3">
        <div className="cs-coords-text">
          <span className="text-muted">{t('locationStep.coordinates', 'Coordinates')}:</span>{' '}
          {isPinned ? (
            <strong>
              {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
            </strong>
          ) : (
            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
              {t('locationStep.notPinnedPrompt', 'Not pinned yet • tap map or GPS')}
            </span>
          )}
        </div>

        <button
          type="button"
          className="cs-btn-text"
          onClick={() => setShowManualEdit(!showManualEdit)}
          style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', minHeight: '44px' }}
        >
          <Edit2 size={13} />
          <span>{showManualEdit ? t('locationStep.hideManual', 'Hide manual') : t('locationStep.editManually', 'Edit manually')}</span>
        </button>
      </div>

      {/* Collapsible Manual Coordinates Entry */}
      {showManualEdit && (
        <div className="cs-manual-coords-box mt-2 p-3" style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('locationStep.latitude', 'Latitude')}
              </label>
              <input
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="cs-input"
                style={{ minHeight: '40px', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('locationStep.longitude', 'Longitude')}
              </label>
              <input
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="cs-input"
                style={{ minHeight: '40px', fontSize: '13px' }}
              />
            </div>
          </div>
          <button
            type="button"
            className="cs-btn cs-btn-secondary cs-btn-sm mt-2"
            style={{ minHeight: '44px', padding: '0 16px', fontWeight: 600 }}
            onClick={applyManualCoordinates}
          >
            <Check size={14} className="icon-mr" />
            {t('locationStep.applyCoords', 'Apply Coordinates')}
          </button>
        </div>
      )}

      {/* 4. Editable Field / Location Name */}
      <div className="cs-field-group mt-3">
        <label className="cs-field-label">
          <span>{t('locationStep.fieldNameLabel', 'Field / Location name')}</span>
          <span className="cs-field-required">*</span>
        </label>
        <input
          type="text"
          value={locationName || ''}
          placeholder={t('locationStep.fieldNamePlaceholder', 'e.g. South Borewell Field, Kolar')}
          onChange={(e) => {
            onChange?.({
              latitude: currentLat,
              longitude: currentLng,
              locationName: e.target.value,
            });
          }}
          className={`cs-input ${error ? 'has-error' : ''}`}
          style={{ minHeight: '48px', fontSize: '15px' }}
        />
        {error && <span className="cs-field-error">{error}</span>}
      </div>
    </div>
  );
}
