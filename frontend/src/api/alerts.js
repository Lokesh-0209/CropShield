import { apiClient } from './client';

/**
 * Alerts & Warnings API Service
 */

/**
 * List outbreak warning alerts
 * GET /api/alerts
 * @param {object} params - { eps_km?: number, min_samples?: number }
 * @returns {Promise<{ alerts: Array<{ warning_id: string, cluster_id: number, outbreak_level: string, title: string, message: string, center_latitude: number, center_longitude: number, case_count: number, dominant_disease: string, average_risk_score: number, created_at: string }> }>}
 */
export async function listAlerts(params = {}) {
  const query = {};
  if (params.eps_km !== undefined) query.eps_km = params.eps_km;
  if (params.min_samples !== undefined) query.min_samples = params.min_samples;
  return apiClient.get('/api/alerts', query);
}

/**
 * Get outbreak warning for a specific cluster
 * GET /api/alerts/{cluster_id}
 * @param {number|string} clusterId
 * @param {object} params - { eps_km?: number, min_samples?: number }
 * @returns {Promise<object>}
 */
export async function getAlertByCluster(clusterId, params = {}) {
  const query = {};
  if (params.eps_km !== undefined) query.eps_km = params.eps_km;
  if (params.min_samples !== undefined) query.min_samples = params.min_samples;
  return apiClient.get(`/api/alerts/${clusterId}`, query);
}
