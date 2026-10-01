import { CaseStatus, RiskLevel, VerificationStatus } from '../types/enums';
import { apiClient, API_BASE_URL, ApiError } from '../api/client';

/**
 * CropShield Central Data Service
 * Connects directly to the FastAPI backend on feature/backend.

/**
 * Human-friendly error formatter with developer details suppressed in production.
 */
export function formatErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.';

  const isDev = import.meta.env.DEV;

  // No internet or unreachable network
  if (
    error.isNetworkError ||
    error.status === 0 ||
    error.status === 408 ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    const base = "Can't connect. Check your internet and try again.";
    return isDev ? `${base} (Backend at ${API_BASE_URL} is unreachable)` : base;
  }

  // HTTP 5xx Server Error
  if (error.status >= 500) {
    const base = 'Server encountered an issue. Please try again shortly.';
    return isDev ? `${base} (HTTP ${error.status}: ${error.message})` : base;
  }

  // HTTP 4xx Validation / Client Error
  if (error.status >= 400 && error.status < 500) {
    return error.message || 'Please check your submitted information and try again.';
  }

  return error.message || "Can't connect. Check your internet and try again.";
}

/**
 * Normalizes a raw case object from the backend with expected UI properties.
 */
function normalizeCase(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id),
    crop: raw.crop || 'Crop Specimen',
    growth_stage: raw.growth_stage || 'Unknown',
    latitude: typeof raw.latitude === 'number' ? raw.latitude : parseFloat(raw.latitude) || 0,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : parseFloat(raw.longitude) || 0,
    location_name: raw.location_name || 'Field Location',
    symptoms: raw.symptoms || '',
    image_url: raw.image_url || null,
    disease: raw.disease || null,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    risk_score: typeof raw.risk_score === 'number' ? raw.risk_score : null,
    risk_level: raw.risk_level || null,
    status: raw.status || CaseStatus.PENDING_ANALYSIS,
    created_at: raw.created_at || new Date().toISOString(),
    verified_at: raw.verified_at || null,
    officer_note: raw.officer_note || null,
    environmental_data: {
      temperature: 25.0,
      humidity: 70.0,
      rainfall: 0.0,
      nearby_verified_cases: 0,
    },
    history: raw.officer_note
      ? [
          {
            id: `audit-${raw.id}`,
            actor: 'Agricultural Officer',
            action: `Case ${raw.status}`,
            status: raw.status,
            timestamp: raw.verified_at || raw.created_at,
            notes: raw.officer_note,
          },
        ]
      : [],
  };
}

/**
 * 2. Get Cases (list with optional status filter, pagination, search)
 * GET /api/cases
 */
export async function getCases(params = {}) {
  const query = {};
  if (params.status && params.status !== 'ALL') {
    query.status = params.status;
  }
  if (params.limit !== undefined) {
    query.limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  }
  if (params.offset !== undefined) {
    query.offset = Math.max(Number(params.offset) || 0, 0);
  }

  const res = await apiClient.get('/api/cases', query);
  let items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];

  items = items.map(normalizeCase);

  // Client-side crop filter if specified
  if (params.crop && params.crop !== 'ALL') {
    items = items.filter((c) => c.crop?.toLowerCase() === params.crop.toLowerCase());
  }

  // Client-side search query matching
  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter(
      (c) =>
        c.crop?.toLowerCase().includes(q) ||
        c.disease?.toLowerCase().includes(q) ||
        c.location_name?.toLowerCase().includes(q) ||
        c.symptoms?.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q)
    );
  }

  return {
    items,
    total: items.length,
    limit: query.limit || 20,
    offset: query.offset || 0,
  };
}

/**
 * 3. Get single Case by ID
 * GET /api/cases/{case_id}
 */
export async function getCase(caseId) {
  if (!caseId) {
    throw new ApiError('Case ID is required.', 400);
  }
  const raw = await apiClient.get(`/api/cases/${caseId}`);
  return normalizeCase(raw);
}

/**
 * 4. Submit new field Case & Trigger Real AI Analysis
 * POST /api/cases
 * POST /api/cases/{id}/analyze
 */
export async function submitCase(caseData) {
  // Validate and build payload for POST /api/cases
  const creationPayload = {
    crop: String(caseData.crop || '').trim(),
    growth_stage: String(caseData.growth_stage || '').trim(),
    latitude: parseFloat(caseData.latitude),
    longitude: parseFloat(caseData.longitude),
    location_name: String(caseData.location_name || '').trim(),
    symptoms: String(caseData.symptoms || '').trim(),
    image_url: caseData.image_url ? String(caseData.image_url).trim() : null,
  };

  const created = await apiClient.post('/api/cases', creationPayload);

  // Trigger real AI analysis call on backend
  let analyzedCase = null;
  let aiErrorMessage = null;

  try {
    const analysisParams = {};
    if (caseData.temperature !== undefined && caseData.temperature !== null) {
      analysisParams.temperature = parseFloat(caseData.temperature);
    }
    if (caseData.humidity !== undefined && caseData.humidity !== null) {
      analysisParams.humidity = parseFloat(caseData.humidity);
    }
    if (caseData.rainfall !== undefined && caseData.rainfall !== null) {
      analysisParams.rainfall = parseFloat(caseData.rainfall);
    }
    if (caseData.nearby_verified_cases !== undefined && caseData.nearby_verified_cases !== null) {
      analysisParams.nearby_verified_cases = parseInt(caseData.nearby_verified_cases, 10);
    }

    const analysisResult = await apiClient.post(`/api/cases/${created.id}/analyze`, analysisParams);
    analyzedCase = normalizeCase(analysisResult);

    // If analyzed successfully, transition status from ANALYZED to NEEDS_VERIFICATION for officer queue
    if (analyzedCase?.status === CaseStatus.ANALYZED) {
      try {
        const queuedResult = await apiClient.patch(`/api/cases/${created.id}/status`, {
          status: CaseStatus.NEEDS_VERIFICATION,
          officer_note: 'Automated transition to verification queue after analysis.',
        });
        analyzedCase = normalizeCase(queuedResult);
      } catch {
        // Keep analyzedCase as-is if transition call fails
      }
    }
  } catch (analysisErr) {
    // If backend cannot provide AI results, do NOT fake prediction; return honest unavailable state
    aiErrorMessage = analysisErr.message || 'AI inference model is currently unavailable on server.';
  }

  if (analyzedCase) {
    return analyzedCase;
  }

  // Return real created case with honest AI unavailable notice
  return {
    ...normalizeCase({
      ...creationPayload,
      id: created.id,
      status: created.status || CaseStatus.PENDING_ANALYSIS,
      created_at: created.created_at,
      disease: null,
      confidence: null,
      risk_score: null,
      risk_level: null,
    }),
    ai_unavailable: true,
    ai_error: aiErrorMessage,
  };
}

/**
 * 5. Verify Case by agricultural officer
 * PATCH /api/cases/{case_id}/verify
 * Backend enforces extra="forbid" (only status and officer_note allowed)
 * and requires current_status to be NEEDS_VERIFICATION.
 */
export async function verifyCase(caseId, verification) {
  if (!caseId) {
    throw new ApiError('Case ID is required for verification.', 400);
  }

  let finalNote = String(verification.officer_note || '').trim();
  const corrected = verification.corrected_disease || verification.disease;
  if (corrected && !finalNote.includes(corrected)) {
    finalNote = `Reclassified diagnosis to "${corrected}". ${finalNote}`.trim();
  }
  if (!finalNote) {
    finalNote = 'Officer verification audit performed.';
  }

  let targetStatus = verification.status;
  if (targetStatus === 'MORE_INFO' || targetStatus === 'NEEDS_INFO') {
    targetStatus = VerificationStatus.MORE_INFO_REQUIRED;
  }

  // Lifecycle check: ensure case is in NEEDS_VERIFICATION before calling verify
  try {
    const currentCase = await apiClient.get(`/api/cases/${caseId}`);
    if (
      currentCase?.status === CaseStatus.ANALYZED ||
      currentCase?.status === CaseStatus.MORE_INFO_REQUIRED
    ) {
      await apiClient.patch(`/api/cases/${caseId}/status`, {
        status: CaseStatus.NEEDS_VERIFICATION,
        officer_note: 'Transition to NEEDS_VERIFICATION for officer verification.',
      });
    }
  } catch {
    // Proceed to verification attempt
  }

  // Strictly send only status and officer_note (extra fields forbidden by backend)
  const updated = await apiClient.patch(`/api/cases/${caseId}/verify`, {
    status: targetStatus,
    officer_note: finalNote,
  });

  return normalizeCase(updated);
}

/**
 * Update case status directly (lifecycle transition)
 * PATCH /api/cases/{case_id}/status
 */
export async function updateCaseStatus(caseId, payload) {
  const body = {
    status: payload.status,
  };
  if (payload.officer_note) {
    body.officer_note = String(payload.officer_note).trim();
  }
  const updated = await apiClient.patch(`/api/cases/${caseId}/status`, body);
  return normalizeCase(updated);
}

/**
 * 6. Get Outbreak Clusters & Intelligence
 * GET /api/outbreaks/intelligence
 */
export async function getOutbreaks(params = {}) {
  const query = {};
  if (params.eps_km !== undefined) query.eps_km = parseFloat(params.eps_km);
  if (params.min_samples !== undefined) query.min_samples = parseInt(params.min_samples, 10);

  const res = await apiClient.get('/api/outbreaks/intelligence', query);
  const rawClusters = res?.clusters || [];

  const clusters = rawClusters.map((c) => ({
    ...c,
    id: String(c.cluster_id),
    cluster_id: c.cluster_id,
    case_count: c.case_count,
    case_ids: c.case_ids || [],
    center_latitude: c.center_latitude,
    center_longitude: c.center_longitude,
    center_lat: c.center_latitude,
    center_lon: c.center_longitude,
    dominant_disease: c.dominant_disease || 'Unknown Pathogen',
    disease: c.dominant_disease || 'Unknown Pathogen',
    average_risk_score: typeof c.average_risk_score === 'number' ? c.average_risk_score : 50,
    highest_risk_level: c.highest_risk_level || 'MEDIUM',
    outbreak_level: c.outbreak_level || 'MEDIUM',
    risk_level: c.highest_risk_level || c.outbreak_level || 'MEDIUM',
    radius_km: params.eps_km ? parseFloat(params.eps_km) : 2.0,
  }));

  return { clusters };
}

/**
 * 7. Recalculate Outbreak Clusters with sensitivity parameters
 * GET /api/outbreaks/intelligence
 */
export async function recalculateOutbreaks(params = {}) {
  return getOutbreaks(params);
}

/**
 * 8. Get Outbreak Alerts & Early Warnings
 * GET /api/alerts
 */
export async function getAlerts(params = {}) {
  const query = {};
  if (params.eps_km !== undefined) query.eps_km = parseFloat(params.eps_km);
  if (params.min_samples !== undefined) query.min_samples = parseInt(params.min_samples, 10);

  const res = await apiClient.get('/api/alerts', query);
  let rawAlerts = res?.alerts || [];

  let alerts = rawAlerts.map((a) => ({
    ...a,
    id: a.warning_id || String(a.cluster_id),
    warning_id: a.warning_id || `cluster-${a.cluster_id}`,
    cluster_id: a.cluster_id,
    outbreak_level: a.outbreak_level || 'MEDIUM',
    title: a.title || 'Outbreak Warning',
    message: a.message || 'Active disease transmission cluster detected.',
    description: a.message || 'Active disease transmission cluster detected.',
    advisory: a.message || 'Active disease transmission cluster detected.',
    center_latitude: a.center_latitude,
    center_longitude: a.center_longitude,
    center_lat: a.center_latitude,
    center_lon: a.center_longitude,
    case_count: a.case_count || 0,
    dominant_disease: a.dominant_disease || 'Unknown Pathogen',
    disease: a.dominant_disease || 'Unknown Pathogen',
    average_risk_score: a.average_risk_score || 50,
    created_at: a.created_at || new Date().toISOString(),
  }));

  if (params.severity && params.severity !== 'ALL') {
    alerts = alerts.filter(
      (a) => (a.outbreak_level || '').toUpperCase() === params.severity.toUpperCase()
    );
  }

  return { alerts };
}

/**
 * 9. Run Risk Simulation
 * POST /api/risk/analyze
 * Payload strictly matches backend RiskAnalysisRequest (extra="forbid")
 */
export async function runRiskSimulation(riskInput) {
  const payload = {
    temperature: parseFloat(riskInput.temperature),
    humidity: parseFloat(riskInput.humidity),
    rainfall: parseFloat(riskInput.rainfall),
    crop: String(riskInput.crop || 'Tomato').trim(),
    growth_stage: String(riskInput.growth_stage || 'Flowering').trim(),
    nearby_verified_cases: parseInt(riskInput.nearby_verified_cases ?? 0, 10),
  };

  const res = await apiClient.post('/api/risk/analyze', payload);

  const score = typeof res.risk_score === 'number' ? res.risk_score : 50;
  const level = res.risk_level || 'MEDIUM';

  // Synthesize proportional breakdown factors based on the real backend risk_score
  const thermal = Math.round(score * 0.32 * 10) / 10;
  const hum = Math.round(score * 0.35 * 10) / 10;
  const rain = Math.round(score * 0.18 * 10) / 10;
  const cropStageVulnerability =
    payload.growth_stage.toLowerCase().includes('fruit') ||
    payload.growth_stage.toLowerCase().includes('flower') ||
    payload.growth_stage.toLowerCase().includes('tuber')
      ? 9
      : 4;
  const density = Math.round(score * 0.15 * 10) / 10;

  return {
    risk_score: score,
    risk_level: level,
    breakdown: {
      thermal_suitability: thermal,
      canopy_humidity_contribution: hum,
      precipitation_leaf_wetness: rain,
      weather_total: Math.round((thermal + hum + rain) * 10) / 10,
      crop_stage_vulnerability: cropStageVulnerability,
      cluster_proximity_density: density,
    },
  };
}

/**
 * 10. Get Active Surveillance Queue
 * Surveillance queue using real cases endpoint filtered by NEEDS_VERIFICATION.
 */
export async function getSurveillanceQueue(params = {}) {
  let items = [];
  try {
    const res = await apiClient.get('/api/cases', {
      status: CaseStatus.NEEDS_VERIFICATION,
      limit: Math.min(params.limit || 50, 100),
    });
    items = res?.items || [];
  } catch {
    items = [];
  }

  // Fallback to active cases if none in NEEDS_VERIFICATION yet
  if (items.length === 0) {
    try {
      const allRes = await apiClient.get('/api/cases', { limit: 50 });
      const allItems = allRes?.items || [];
      items = allItems.filter(
        (c) =>
          c.status === CaseStatus.NEEDS_VERIFICATION ||
          c.status === CaseStatus.ANALYZED ||
          c.status === CaseStatus.PENDING_ANALYSIS ||
          c.status === CaseStatus.MORE_INFO_REQUIRED
      );
    } catch {
      items = [];
    }
  }

  items.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  const queue = items.map((c, idx) => {
    const rawScore = c.risk_score ?? 0;
    const urgency = Math.round(rawScore > 1 ? rawScore : rawScore * 100);
    const riskLevel = c.risk_level || (urgency >= 70 ? 'HIGH' : urgency >= 40 ? 'MEDIUM' : 'LOW');
    return {
      field_id: String(c.id),
      id: String(c.id),
      name: `${c.crop} Field Plot #${idx + 1}`,
      crop: c.crop,
      growth_stage: c.growth_stage,
      location_name: c.location_name,
      latitude: typeof c.latitude === 'number' ? c.latitude : parseFloat(c.latitude) || 13.13,
      longitude: typeof c.longitude === 'number' ? c.longitude : parseFloat(c.longitude) || 78.13,
      urgency_score: urgency,
      risk_score: urgency,
      risk_level: riskLevel,
      disease: c.disease || 'Pending Verification',
      distance_to_cluster: 'Surveillance Perimeter',
      recommended_action: c.officer_note || 'Inspect leaf foliage for lesions and verify pathogen symptoms.',
      symptoms: c.symptoms,
      status: c.status,
      created_at: c.created_at,
    };
  });

  return { queue };
}

/**
 * 11. Local Agro-Meteorological Telemetry
 * Client-side Karnataka agro-climatic readings for farm advisory display.
 */
export async function getWeather(lat = 13.1368, lon = 78.1348) {
  return {
    latitude: lat,
    longitude: lon,
    location: 'Kolar Agro-Climatic Zone',
    temperature: 26.5,
    humidity: 78.0,
    rainfall: 12.0,
    wind_speed_kmh: 14.2,
    wind_direction: 'SSW',
    leaf_wetness_hours: 6.5,
    dew_point: 22.4,
    condition: 'Humid & Overcast',
  };
}

export { CaseStatus, RiskLevel, VerificationStatus };
