import {
  SEED_CASES,
  SEED_OUTBREAK_CLUSTERS,
  SEED_ALERTS,
  SEED_SURVEILLANCE_QUEUE,
} from './mockData';
import { CaseStatus, RiskLevel, VerificationStatus } from '../types/enums';
import { apiClient, API_BASE_URL, ApiError } from '../api/client';

/**
 * CropShield Central Data Service
 * Toggle mock mode via VITE_USE_MOCK=true in .env
 */
export const IS_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' ||
  import.meta.env.VITE_USE_MOCK === true ||
  String(import.meta.env.VITE_USE_MOCK).toLowerCase() === '1';

const MOCK_FAILURE_RATE = parseFloat(import.meta.env.VITE_MOCK_FAILURE_RATE || '0');

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

// In-memory state for mock mode mutations
let mockCases = [...SEED_CASES];
let mockClusters = [...SEED_OUTBREAK_CLUSTERS];
let mockAlerts = [...SEED_ALERTS];
let mockSurveillance = [...SEED_SURVEILLANCE_QUEUE];

/**
 * Simulate network latency and optional failure
 */
async function simulateLatency(minMs = 300, maxMs = 700) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (MOCK_FAILURE_RATE > 0 && Math.random() < MOCK_FAILURE_RATE) {
    throw new ApiError('Simulated mock network failure', 503, null, true);
  }
}

/**
 * 1. Login user
 * POST /api/auth/login or mock session
 */
export async function login(credentials) {
  if (IS_MOCK) {
    await simulateLatency(300, 600);
    return {
      token: 'cropshield-officer-session-token-998822',
      user: {
        id: 'usr-officer-01',
        name: 'Dr. Suresh Patil',
        role: 'AGRICULTURAL_OFFICER',
        jurisdiction: 'Kolar, Chikkaballapur & Bengaluru Rural',
        email: credentials?.email || 'suresh.patil@agri.kar.gov.in',
      },
    };
  }

  return apiClient.post('/api/auth/login', credentials);
}

/**
 * 2. Get Cases (list with optional status filter, pagination, search)
 * GET /api/cases
 */
export async function getCases(params = {}) {
  if (IS_MOCK) {
    await simulateLatency(300, 650);

    let items = [...mockCases];
    if (params.status && params.status !== 'ALL') {
      items = items.filter((c) => c.status === params.status);
    }
    if (params.crop && params.crop !== 'ALL') {
      items = items.filter((c) => c.crop.toLowerCase() === params.crop.toLowerCase());
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.crop?.toLowerCase().includes(q) ||
          c.disease?.toLowerCase().includes(q) ||
          c.location_name?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const offset = params.offset || 0;
    const limit = params.limit || 100;
    const paginated = items.slice(offset, offset + limit);

    return {
      items: paginated,
      total: items.length,
      limit,
      offset,
    };
  }

  const query = {};
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;
  return apiClient.get('/api/cases', query);
}

/**
 * 3. Get single Case by ID
 * GET /api/cases/{case_id}
 */
export async function getCase(caseId) {
  if (IS_MOCK) {
    await simulateLatency(250, 500);
    const found = mockCases.find((c) => c.id === caseId);
    if (!found) {
      throw new ApiError(`Case ${caseId} not found.`, 404);
    }
    return { ...found };
  }

  return apiClient.get(`/api/cases/${caseId}`);
}

/**
 * Deterministic AI Diagnosis & Risk scoring simulation for new submissions
 */
function simulateAiInference(caseData) {
  const crop = (caseData.crop || 'Tomato').toLowerCase();
  const temp = caseData.temperature ?? 26.5;
  const humidity = caseData.humidity ?? 80.0;
  const rain = caseData.rainfall ?? 12.0;

  let disease = 'Foliar Blight';
  let confidence = 0.88;

  if (crop.includes('tomato')) {
    if (humidity > 85) {
      disease = 'Late Blight';
      confidence = 0.92;
    } else {
      disease = 'Tomato Early Blight';
      confidence = 0.89;
    }
  } else if (crop.includes('potato')) {
    disease = 'Potato Late Blight';
    confidence = 0.94;
  } else if (crop.includes('corn') || crop.includes('maize')) {
    disease = 'Corn Southern Rust';
    confidence = 0.86;
  }

  // Risk Score calculation
  let tempFactor = 0;
  if (temp >= 18 && temp <= 29) tempFactor = 25;
  else if (temp > 29 && temp <= 35) tempFactor = 15;
  else tempFactor = 8;

  const humidityFactor = (Math.min(Math.max(humidity, 40), 100) / 100) * 40;
  const rainFactor = Math.min(rain * 1.5, 20);
  const densityFactor = 15; // default proximity weight

  const rawScore = tempFactor + humidityFactor + rainFactor + densityFactor;
  const risk_score = Math.min(Math.max(Math.round(rawScore * 10) / 10, 15), 98);
  const risk_level =
    risk_score >= 75 ? RiskLevel.HIGH : risk_score >= 45 ? RiskLevel.MEDIUM : RiskLevel.LOW;

  return {
    disease,
    confidence,
    risk_score,
    risk_level,
  };
}

/**
 * 4. Submit new field Case
 * POST /api/cases
 */
export async function submitCase(caseData) {
  if (IS_MOCK) {
    await simulateLatency(450, 850);

    const newId = `CASE-KA-${String(mockCases.length + 1).padStart(3, '0')}`;
    const aiResults = simulateAiInference(caseData);

    const newCase = {
      id: newId,
      crop: caseData.crop || 'Tomato',
      growth_stage: caseData.growth_stage || 'Vegetative',
      location_name: caseData.location_name || 'Kolar Agri Sector',
      latitude: parseFloat(caseData.latitude) || 13.1368,
      longitude: parseFloat(caseData.longitude) || 78.1348,
      symptoms: caseData.symptoms || 'Visible foliar lesions noted during field survey.',
      image_url: caseData.image_url || 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80',
      disease: aiResults.disease,
      confidence: aiResults.confidence,
      risk_score: aiResults.risk_score,
      risk_level: aiResults.risk_level,
      status: CaseStatus.NEEDS_VERIFICATION,
      officer_note: null,
      created_at: new Date().toISOString(),
      verified_at: null,
      environmental_data: {
        temperature: caseData.temperature ?? 26.5,
        humidity: caseData.humidity ?? 80.0,
        rainfall: caseData.rainfall ?? 12.0,
        nearby_verified_cases: 2,
      },
    };

    mockCases.unshift(newCase);
    return newCase;
  }

  // Real backend workflow: POST /api/cases, then trigger /analyze
  const created = await apiClient.post('/api/cases', {
    crop: caseData.crop,
    growth_stage: caseData.growth_stage,
    latitude: caseData.latitude,
    longitude: caseData.longitude,
    location_name: caseData.location_name,
    symptoms: caseData.symptoms,
    image_url: caseData.image_url,
  });

  // Automatically trigger AI analysis
  try {
    const analysisParams = {
      temperature: caseData.temperature,
      humidity: caseData.humidity,
      rainfall: caseData.rainfall,
    };
    const analyzed = await apiClient.post(`/api/cases/${created.id}/analyze`, analysisParams);
    return { ...created, ...analyzed };
  } catch {
    return created;
  }
}

/**
 * 5. Verify Case by agricultural officer
 * PATCH /api/cases/{case_id}/verify
 */
export async function verifyCase(caseId, verification) {
  if (IS_MOCK) {
    await simulateLatency(350, 700);

    const index = mockCases.findIndex((c) => c.id === caseId);
    if (index === -1) {
      throw new ApiError(`Case ${caseId} not found.`, 404);
    }

    const updated = {
      ...mockCases[index],
      status: verification.status || VerificationStatus.VERIFIED,
      officer_note: verification.officer_note || 'Verified in field audit.',
      verified_at: new Date().toISOString(),
    };

    mockCases[index] = updated;

    // If verified, conditionally add to or refresh clusters
    if (updated.status === CaseStatus.VERIFIED) {
      const existingCluster = mockClusters[0];
      if (existingCluster && !existingCluster.case_ids.includes(updated.id)) {
        existingCluster.case_ids.push(updated.id);
        existingCluster.case_count += 1;
      }
    }

    return updated;
  }

  return apiClient.patch(`/api/cases/${caseId}/verify`, {
    status: verification.status,
    officer_note: verification.officer_note,
  });
}

/**
 * 6. Get Outbreak Clusters & Intelligence
 * GET /api/outbreaks/intelligence
 */
export async function getOutbreaks(params = {}) {
  if (IS_MOCK) {
    await simulateLatency(350, 700);
    return {
      clusters: [...mockClusters],
    };
  }

  const query = {};
  if (params.eps_km !== undefined) query.eps_km = params.eps_km;
  if (params.min_samples !== undefined) query.min_samples = params.min_samples;
  return apiClient.get('/api/outbreaks/intelligence', query);
}

/**
 * 7. Recalculate Outbreak Clusters (e.g. tuning eps_km, min_samples)
 * POST /api/outbreaks/recalculate or GET with params
 */
export async function recalculateOutbreaks(params = {}) {
  if (IS_MOCK) {
    await simulateLatency(450, 800);

    const eps = params.eps_km || 2.0;
    const minSamples = params.min_samples || 3;

    // Re-filter clusters based on sensitivity
    const updated = mockClusters.map((cl, idx) => ({
      ...cl,
      radius_km: Math.round(eps * (0.8 + idx * 0.15) * 10) / 10,
      case_count: Math.max(minSamples, cl.case_count),
    }));

    return {
      clusters: updated,
      params: { eps_km: eps, min_samples: minSamples },
    };
  }

  const query = {};
  if (params.eps_km !== undefined) query.eps_km = params.eps_km;
  if (params.min_samples !== undefined) query.min_samples = params.min_samples;
  return apiClient.get('/api/outbreaks/intelligence', query);
}

/**
 * 8. Get Outbreak Alerts & Early Warnings
 * GET /api/alerts
 */
export async function getAlerts(params = {}) {
  if (IS_MOCK) {
    await simulateLatency(300, 650);

    let list = [...mockAlerts];
    if (params.severity && params.severity !== 'ALL') {
      list = list.filter((a) => a.outbreak_level === params.severity);
    }

    return {
      alerts: list,
    };
  }

  const query = {};
  if (params.eps_km !== undefined) query.eps_km = params.eps_km;
  if (params.min_samples !== undefined) query.min_samples = params.min_samples;
  return apiClient.get('/api/alerts', query);
}

/**
 * 9. Run Risk Simulation
 * POST /api/risk/analyze
 */
export async function runRiskSimulation(riskInput) {
  if (IS_MOCK) {
    await simulateLatency(300, 600);

    const crop = (riskInput.crop || 'Tomato').toLowerCase();
    const stage = (riskInput.growth_stage || 'Fruiting').toLowerCase();
    const temp = parseFloat(riskInput.temperature ?? 28);
    const humidity = parseFloat(riskInput.humidity ?? 80);
    const rainfall = parseFloat(riskInput.rainfall ?? 15);
    const nearby = parseInt(riskInput.nearby_verified_cases ?? 3, 10);

    // Pathogen suitability score
    let tempScore = 20;
    if (temp >= 19 && temp <= 27) tempScore = 32;
    else if (temp > 27 && temp <= 32) tempScore = 24;

    const humScore = (humidity / 100) * 35;
    const rainScore = Math.min(rainfall * 0.8, 18);
    const clusterScore = Math.min(nearby * 4, 25);

    // Crop vulnerability factor
    let cropFactor = 0;
    if (crop.includes('tomato') || crop.includes('potato')) cropFactor = 4;

    // Stage vulnerability bonus
    let stageBonus = 0;
    if (stage.includes('fruit') || stage.includes('flower') || stage.includes('tuber')) {
      stageBonus = 5;
    }

    const total = Math.min(
      Math.max(Math.round((tempScore + humScore + rainScore + clusterScore + cropFactor + stageBonus) * 10) / 10, 10),
      99
    );

    const level =
      total >= 75 ? RiskLevel.HIGH : total >= 45 ? RiskLevel.MEDIUM : RiskLevel.LOW;

    return {
      risk_score: total,
      risk_level: level,
      breakdown: {
        thermal_suitability: tempScore,
        canopy_humidity_contribution: Math.round(humScore * 10) / 10,
        precipitation_leaf_wetness: Math.round(rainScore * 10) / 10,
        cluster_proximity_density: clusterScore,
      },
    };
  }

  return apiClient.post('/api/risk/analyze', riskInput);
}

/**
 * 10. Get Active Surveillance Queue
 * Priority ranking for agricultural officers
 */
export async function getSurveillanceQueue(params = {}) {
  if (IS_MOCK) {
    await simulateLatency(250, 550);
    return {
      queue: [...mockSurveillance],
    };
  }

  // Fallback to cases with high risk or alerts
  return apiClient.get('/api/surveillance/queue', params);
}

/**
 * 11. Get localized weather for coordinates
 * Real-time agro-meteorological readings
 */
export async function getWeather(lat = 13.1368, lon = 78.1348) {
  if (IS_MOCK) {
    await simulateLatency(200, 450);
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

  return apiClient.get('/api/weather', { lat, lon });
}

// Re-export core enums and status for ease of consumption
export { CaseStatus, RiskLevel, VerificationStatus };
