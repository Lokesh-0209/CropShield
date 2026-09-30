/**
 * Alerts API Adapter
 * Delegates to centralized data service in src/services/api.js
 */
import { getAlerts } from '../services/api';

export async function listAlerts(params = {}) {
  return getAlerts(params);
}

export async function getAlertByCluster(clusterId, params = {}) {
  const res = await getAlerts(params);
  const found = (res?.alerts || []).find((a) => String(a.cluster_id) === String(clusterId));
  return found || null;
}
