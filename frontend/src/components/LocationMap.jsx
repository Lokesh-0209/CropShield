import OfficerLeafletMap from './officer/OfficerLeafletMap';

/**
 * Re-export OfficerLeafletMap for backward compatibility.
 * Replaces the blank SVG grid with the real OpenStreetMap Leaflet map.
 */
export default function LocationMap(props) {
  return <OfficerLeafletMap {...props} mode={props.mode || 'outbreaks'} />;
}
