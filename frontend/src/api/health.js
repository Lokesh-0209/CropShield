import { apiClient } from './client';

/**
 * Health check endpoint: GET /api/health
 * @returns {Promise<{ status: string, service?: string }>}
 */
export async function getHealthStatus() {
  return apiClient.get('/api/health', null, { timeoutMs: 4000 });
}
