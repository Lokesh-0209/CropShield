import { apiClient } from './client';

/**
 * Cases API Service
 * Interacts directly with /api/cases endpoints
 */

/**
 * Create a new field case report
 * POST /api/cases
 * @param {object} caseData - { crop, growth_stage, latitude, longitude, location_name, symptoms, image_url? }
 * @returns {Promise<{ id: string, status: string, created_at: string }>}
 */
export async function createCase(caseData) {
  return apiClient.post('/api/cases', caseData);
}

/**
 * List cases with optional filtering and pagination
 * GET /api/cases
 * @param {object} params - { status?: string, limit?: number, offset?: number }
 * @returns {Promise<{ items: Array, limit: number, offset: number }>}
 */
export async function listCases(params = {}) {
  const query = {};
  if (params.status && params.status !== 'ALL') {
    query.status = params.status;
  }
  if (params.limit !== undefined) {
    query.limit = params.limit;
  }
  if (params.offset !== undefined) {
    query.offset = params.offset;
  }
  return apiClient.get('/api/cases', query);
}

/**
 * Retrieve complete details of a single case
 * GET /api/cases/{case_id}
 * @param {string} caseId
 * @returns {Promise<object>}
 */
export async function getCaseById(caseId) {
  return apiClient.get(`/api/cases/${caseId}`);
}

/**
 * Trigger AI inference and risk assessment for a pending case
 * POST /api/cases/{case_id}/analyze
 * @param {string} caseId
 * @param {object} [analysisParams] - { temperature?: number, humidity?: number, rainfall?: number, nearby_verified_cases?: number }
 * @returns {Promise<object>} Updated case details with disease, confidence, risk_score, risk_level, status
 */
export async function analyzeCase(caseId, analysisParams = null) {
  const body = analysisParams && Object.keys(analysisParams).length > 0
    ? analysisParams
    : {};
  return apiClient.post(`/api/cases/${caseId}/analyze`, body);
}

/**
 * Officer verification review for a case
 * PATCH /api/cases/{case_id}/verify
 * @param {string} caseId
 * @param {object} verification - { status: 'VERIFIED' | 'REJECTED' | 'MORE_INFO_REQUIRED', officer_note: string }
 * @returns {Promise<object>}
 */
export async function verifyCase(caseId, verification) {
  return apiClient.patch(`/api/cases/${caseId}/verify`, {
    status: verification.status,
    officer_note: verification.officer_note,
  });
}

/**
 * Update case status directly (lifecycle update)
 * PATCH /api/cases/{case_id}/status
 * @param {string} caseId
 * @param {object} payload - { status: string, officer_note?: string }
 * @returns {Promise<object>}
 */
export async function updateCaseStatus(caseId, payload) {
  return apiClient.patch(`/api/cases/${caseId}/status`, payload);
}
