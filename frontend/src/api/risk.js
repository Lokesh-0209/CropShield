/**
 * Risk Assessment API Adapter
 * Delegates to centralized data service in src/services/api.js
 */
import { runRiskSimulation } from '../services/api';

export async function calculateRisk(riskInput) {
  return runRiskSimulation(riskInput);
}
