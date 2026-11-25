/**
 * Application Error Model & Factory Helpers
 * Single Source of Truth: docs/BLUEPRINT.md (Section 8)
 *
 * Blueprint Error Codes & HTTP Status Mapping:
 * - VALIDATION_ERROR:  400
 * - UNAUTHORIZED:      401
 * - FORBIDDEN:         403
 * - NOT_FOUND:         404
 * - INVALID_TRANSITION: 409
 * - INTERNAL_ERROR:    500
 */

export class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Blueprint error code string
   * @param {string} message - Human-readable error message
   * @param {Array<{ field: string, message: string }> | null} [details=null] - Validation error details
   */
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) && details.length > 0 ? details : null;
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Converts error into Blueprint JSON response format.
   * @returns {{ error: { code: string, message: string, details?: Array<{ field: string, message: string }> } }}
   */
  toBlueprintJson() {
    const errorObject = {
      code: this.code,
      message: this.message,
    };

    if (this.details) {
      errorObject.details = this.details;
    }

    return { error: errorObject };
  }
}

/**
 * 400 VALIDATION_ERROR
 * @param {string} [message='Validation error']
 * @param {Array<{ field: string, message: string }> | null} [details=null]
 */
export function badRequest(message = 'Validation error', details = null) {
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}

/**
 * 401 UNAUTHORIZED
 * @param {string} [message='Authentication token required']
 */
export function unauthorized(message = 'Authentication token required') {
  return new AppError(401, 'UNAUTHORIZED', message);
}

/**
 * 403 FORBIDDEN
 * @param {string} [message='Access forbidden']
 */
export function forbidden(message = 'Access forbidden') {
  return new AppError(403, 'FORBIDDEN', message);
}

/**
 * 404 NOT_FOUND
 * @param {string} [message='Resource not found']
 */
export function notFound(message = 'Resource not found') {
  return new AppError(404, 'NOT_FOUND', message);
}

/**
 * 409 INVALID_TRANSITION
 * @param {string} [message='Invalid status transition']
 * @param {string} [code='INVALID_TRANSITION']
 */
export function conflict(message = 'Invalid status transition', code = 'INVALID_TRANSITION') {
  return new AppError(409, code, message);
}

/**
 * 500 INTERNAL_ERROR
 * @param {string} [message='Internal server error']
 */
export function internalError(message = 'Internal server error') {
  return new AppError(500, 'INTERNAL_ERROR', message);
}

export default {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
};

