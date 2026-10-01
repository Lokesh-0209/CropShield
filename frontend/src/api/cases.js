/**
 * Cases API Adapter
 * Delegates to centralized data service in src/services/api.js
 * and provides direct apiClient access for FastAPI /api/cases endpoints.
 */
import {
  getCases,
  getCase,
  submitCase,
  verifyCase as verifyCaseService,
  updateCaseStatus as updateCaseStatusService,
} from '../services/api';
import { apiClient } from './client';

export async function createCase(caseData) {
  return submitCase(caseData);
}

export async function listCases(params = {}) {
  return getCases(params);
}

export async function getCaseById(caseId) {
  return getCase(caseId);
}

/**
 * Trigger AI inference on backend for a pending case
 * POST /api/cases/{case_id}/analyze
 */
export async function analyzeCase(caseId, analysisParams = null) {
  const body = {};
  if (analysisParams) {
    if (analysisParams.temperature !== undefined && analysisParams.temperature !== null) {
      body.temperature = parseFloat(analysisParams.temperature);
    }
    if (analysisParams.humidity !== undefined && analysisParams.humidity !== null) {
      body.humidity = parseFloat(analysisParams.humidity);
    }
    if (analysisParams.rainfall !== undefined && analysisParams.rainfall !== null) {
      body.rainfall = parseFloat(analysisParams.rainfall);
    }
    if (analysisParams.nearby_verified_cases !== undefined && analysisParams.nearby_verified_cases !== null) {
      body.nearby_verified_cases = parseInt(analysisParams.nearby_verified_cases, 10);
    }
  }
  return apiClient.post(`/api/cases/${caseId}/analyze`, body);
}

export async function verifyCase(caseId, verification) {
  return verifyCaseService(caseId, verification);
}

export async function updateCaseStatus(caseId, payload) {
  return updateCaseStatusService(caseId, payload);
}
