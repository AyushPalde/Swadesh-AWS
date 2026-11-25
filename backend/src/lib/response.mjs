/**
 * API Gateway HTTP API (Payload v2.0) Response Utility
 * Single Source of Truth: docs/BLUEPRINT.md (Section 6)
 *
 * NOTE: CORS is managed at the API Gateway level per project architecture.
 * Keep this module as the single point of contact for response structuring.
 */

/**
 * Creates a JSON response conforming to API Gateway HTTP API payload v2.0 format.
 *
 * @param {number} statusCode - HTTP status code
 * @param {any} body - Response payload (serialized to JSON string)
 * @param {Record<string, string>} [headers={}] - Optional additional headers
 * @returns {{ statusCode: number, headers: Record<string, string>, body: string }}
 */
export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export default {
  json,
};

