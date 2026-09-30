import { apiClient } from './client';
import { IS_MOCK } from '../services/api';

/**
 * Health check endpoint: GET /api/health or Mock Health
 * @returns {Promise<{ status: string, service?: string, isMock?: boolean }>}
 */
export async function getHealthStatus() {
  if (IS_MOCK) {
    return {
      status: 'ok',
      service: 'CropShield Mock Engine (Active Karnataka Surveillance)',
      isMock: true,
    };
  }
  return apiClient.get('/api/health', null, { timeoutMs: 4000 });
}
