/**
 * HTTP Client Fetch Wrapper
 * Conforms to docs/BLUEPRINT.md (Sections 6, 7, 8)
 */
import config from '../config.js';

export const TOKEN_STORAGE_KEY = 'swadesh_token';
export const USER_STORAGE_KEY = 'swadesh_user';

/**
 * Standard Blueprint ApiError
 * Contains status (HTTP code), code (Blueprint enum string), message, and field details.
 */
export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message || code || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'INTERNAL_ERROR';
    this.details = Array.isArray(details) ? details : [];
  }
}

/**
 * Retrieves the stored auth token
 */
export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Clears authentication session data
 */
export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Core fetch wrapper with JSON serialization, JWT auth, and Blueprint error normalization.
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    params,
    skipAuth = false,
    ...customConfig
  } = options;

  // Build full URL
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${baseUrl}${cleanEndpoint}`;

  // Append query parameters if provided
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Set up headers
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Attach JWT Bearer token if present
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
    ...customConfig,
  };

  if (body !== undefined) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr) {
    throw new ApiError(0, 'NETWORK_ERROR', netErr.message || 'Network request failed');
  }

  // Handle 401 Unauthorized: clear session and redirect to /login
  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Parse response body
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  // If HTTP status is not ok (2xx), normalize error
  if (!response.ok) {
    const errorPayload = data && typeof data === 'object' && data.error ? data.error : {};
    const code = errorPayload.code || getDefaultErrorCode(response.status);
    const message = errorPayload.message || data?.message || response.statusText || 'Request failed';
    const details = errorPayload.details || [];

    throw new ApiError(response.status, code, message, details);
  }

  return data;
}

function getDefaultErrorCode(status) {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'INVALID_TRANSITION';
    default:
      return 'INTERNAL_ERROR';
  }
}

export const client = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default client;
