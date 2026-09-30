import { apiClient } from './client';

/**
 * Outbreak Surveillance API Service
 */

/**
 * Discovers spatial clusters among verified cases using DBSCAN
 * GET /api/outbreaks/clusters
 * @param {object} params - { eps_km?: number, min_samples?: number }
 * @returns {Promise<{ clusters: Array<{ cluster_id: number, case_count: number, case_ids: string[], center_latitude: number, center_longitude: number }> }>}
 */
export async function getOutbreakClusters(params = {}) {
  const query = {};
  if (params.eps_km !== undefined) query.eps_km = params.eps_km;
  if (params.min_samples !== undefined) query.min_samples = params.min_samples;
  return apiClient.get('/api/outbreaks/clusters', query);
}

/**
 * Synthesizes outbreak intelligence across verified DBSCAN clusters
 * GET /api/outbreaks/intelligence
 * @param {object} params - { eps_km?: number, min_samples?: number }
 * @returns {Promise<{ clusters: Array<{ cluster_id: number, case_count: number, case_ids: string[], center_latitude: number, center_longitude: number, dominant_disease: string, average_risk_score: number, highest_risk_level: string, outbreak_level: string }> }>}
 */
export async function getOutbreakIntelligence(params = {}) {
  const query = {};
  if (params.eps_km !== undefined) query.eps_km = params.eps_km;
  if (params.min_samples !== undefined) query.min_samples = params.min_samples;
  return apiClient.get('/api/outbreaks/intelligence', query);
}
