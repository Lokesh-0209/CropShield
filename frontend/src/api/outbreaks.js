/**
 * Outbreaks API Adapter
 * Delegates to centralized data service in src/services/api.js
 */
import { getOutbreaks, recalculateOutbreaks } from '../services/api';

export async function getOutbreakClusters(params = {}) {
  const res = await getOutbreaks(params);
  return {
    clusters: (res?.clusters || []).map((c) => ({
      cluster_id: c.cluster_id,
      case_count: c.case_count,
      case_ids: c.case_ids,
      center_latitude: c.center_latitude,
      center_longitude: c.center_longitude,
    })),
  };
}

export async function getOutbreakIntelligence(params = {}) {
  return getOutbreaks(params);
}

export async function triggerOutbreakRecalculation(params = {}) {
  return recalculateOutbreaks(params);
}
