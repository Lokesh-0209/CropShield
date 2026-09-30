import { lazy, Suspense } from 'react';
import { Skeleton } from './common/Skeleton';

const OfficerLeafletMap = lazy(() => import('./officer/OfficerLeafletMap'));

/**
 * Re-export OfficerLeafletMap for backward compatibility.
 * Replaces the blank SVG grid with the real OpenStreetMap Leaflet map.
 */
export default function LocationMap(props) {
  return (
    <Suspense fallback={<Skeleton height={props.height || '360px'} width="100%" />}>
      <OfficerLeafletMap {...props} mode={props.mode || 'outbreaks'} />
    </Suspense>
  );
}

