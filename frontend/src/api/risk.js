import { apiClient } from './client';

/**
 * Risk Assessment API Service
 */

/**
 * Compute deterministic crop disease risk
 * POST /api/risk/analyze
 * @param {object} riskInput - { temperature: float, humidity: float, rainfall: float, crop: string, growth_stage: string, nearby_verified_cases: int }
 * @returns {Promise<{ risk_score: number, risk_level: 'LOW' | 'MEDIUM' | 'HIGH' }>}
 */
export async function calculateRisk(riskInput) {
  return apiClient.post('/api/risk/analyze', riskInput);
}
