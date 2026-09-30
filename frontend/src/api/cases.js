/**
 * Cases API Adapter
 * Delegates to centralized data service in src/services/api.js
 */
import {
  getCases,
  getCase,
  submitCase,
  verifyCase as verifyCaseService,
} from '../services/api';

export async function createCase(caseData) {
  return submitCase(caseData);
}

export async function listCases(params = {}) {
  return getCases(params);
}

export async function getCaseById(caseId) {
  return getCase(caseId);
}

export async function analyzeCase(caseId, _analysisParams = null) {
  // In mock mode or real backend, verify or get updated case details
  return getCase(caseId);
}

export async function verifyCase(caseId, verification) {
  return verifyCaseService(caseId, verification);
}

export async function updateCaseStatus(caseId, payload) {
  return verifyCaseService(caseId, payload);
}
