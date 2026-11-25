
import config from '../config.js';
import { auth } from '../firebase.js';

export const TOKEN_STORAGE_KEY = 'swadesh_firebase_token';
export const USER_STORAGE_KEY = 'swadesh_user';

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message || code || `Request failed: ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
  }
}

export function getStoredToken() {
  return null;
}

export function clearSession() {
  // Firebase manages the authentication session.
}

export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    params,
  } = options;

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${baseUrl}${cleanEndpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    if (query.toString()) url += `?${query}`;
  }

  const token = await auth.currentUser?.getIdToken();

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      ...(body !== undefined
        ? { body: typeof body === 'string' ? body : JSON.stringify(body) }
        : {}),
    });
  } catch (error) {
    throw new ApiError(0, 'NETWORK_ERROR', error.message);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = data?.error || {};
    throw new ApiError(
      response.status,
      error.code || 'REQUEST_FAILED',
      error.message || data?.message || 'Request failed',
      error.details || []
    );
  }

  return data;
}

const client = {
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body }),
  patch: (url, body, options = {}) => request(url, { ...options, method: 'PATCH', body }),
  put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body }),
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
};

export { client };
export default client;
