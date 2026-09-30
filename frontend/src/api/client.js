/**
 * Centralized API Client for CropShield
 * Uses environment variable VITE_API_BASE_URL with fallback to http://localhost:8000
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, data = null, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Perform an HTTP request to the CropShield backend API.
 * @param {string} endpoint - API path (e.g. '/api/cases')
 * @param {object} options - Fetch options (method, headers, body, queryParams, timeout)
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    params = null,
    timeoutMs = 15000,
  } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    signal: controller.signal,
  };

  if (body !== null && body !== undefined) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    let responseData = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      if (responseData && typeof responseData === 'object') {
        if (typeof responseData.detail === 'string') {
          errorMessage = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          // FastAPI validation errors
          errorMessage = responseData.detail
            .map((err) => `${err.loc?.slice(1)?.join('.') || 'field'}: ${err.msg}`)
            .join('; ');
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      }
      throw new ApiError(errorMessage, response.status, responseData, false);
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(
        `Request timed out after ${timeoutMs / 1000}s while connecting to ${API_BASE_URL}`,
        408,
        null,
        true
      );
    }

    // Network / CORS / Backend unavailable
    throw new ApiError(
      `Cannot connect to CropShield backend at ${API_BASE_URL}. Ensure the backend service is running.`,
      0,
      null,
      true
    );
  }
}

export const apiClient = {
  get: (endpoint, params, options) =>
    apiRequest(endpoint, { method: 'GET', params, ...options }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, { method: 'POST', body, ...options }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, { method: 'PATCH', body, ...options }),
  put: (endpoint, body, options) =>
    apiRequest(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) =>
    apiRequest(endpoint, { method: 'DELETE', ...options }),
};
