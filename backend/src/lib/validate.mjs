/**
 * Hand-Written Request Validators (Zero External Dependencies)
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 2, 3, 6, 8)
 *
 * Each validator evaluates a request body and returns an array of details:
 * [{ field: string, message: string }]
 */

import { badRequest } from './errors.mjs';

// Blueprint Valid Enumerations
export const VALID_ROLES = Object.freeze(['citizen', 'authority']);

export const VALID_STATUSES = Object.freeze([
  'PENDING_VERIFICATION',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
]);

export const VALID_PRIORITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);

export const VALID_CATEGORIES = Object.freeze([
  'POTHOLE',
  'GARBAGE',
  'STREETLIGHT',
  'WATER_LEAKAGE',
  'DRAINAGE',
  'OTHER',
]);

export const VALID_DEPARTMENTS = Object.freeze([
  'ROADS',
  'SANITATION',
  'ELECTRICAL',
  'WATER',
  'PARKS',
]);

export const VALID_IMAGE_CONTENT_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Validates email structure.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const parts = email.trim().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  return parts[1].includes('.') && parts[1].length >= 3;
}

/**
 * Helper that throws a 400 VALIDATION_ERROR AppError if validation details array is non-empty.
 * @param {Array<{ field: string, message: string }>} details
 * @param {string} [message='Input validation failed']
 */
export function assertValid(details, message = 'Input validation failed') {
  if (Array.isArray(details) && details.length > 0) {
    throw badRequest(message, details);
  }
}

/**
 * POST /login validator
 * Body: { name, email, role, passcode? }
 *
 * @param {any} body
 * @returns {Array<{ field: string, message: string }>}
 */
export function validateLogin(body) {
  const details = [];

  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  // name
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    details.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  }

  // email
  if (!isValidEmail(body.email)) {
    details.push({ field: 'email', message: 'A valid email address is required' });
  }

  // role
  if (!body.role || !VALID_ROLES.includes(body.role)) {
    details.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  // passcode (required for authority)
  if (body.role === 'authority') {
    if (!body.passcode || typeof body.passcode !== 'string' || !body.passcode.trim()) {
      details.push({ field: 'passcode', message: 'Authority passcode is required' });
    }
  }

  return details;
}

/**
 * POST /upload-url validator
 * Body: { fileName, contentType }
 *
 * @param {any} body
 * @returns {Array<{ field: string, message: string }>}
 */
export function validateUploadUrl(body) {
  const details = [];

  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  // fileName
  if (!body.fileName || typeof body.fileName !== 'string' || !body.fileName.trim()) {
    details.push({ field: 'fileName', message: 'File name is required' });
  }

  // contentType
  if (!body.contentType || !VALID_IMAGE_CONTENT_TYPES.includes(body.contentType)) {
    details.push({
      field: 'contentType',
      message: `Image contentType must be one of: ${VALID_IMAGE_CONTENT_TYPES.join(', ')}`,
    });
  }

  return details;
}

/**
 * POST /issues validator
 * Body: { title, description, category, location: { address, lat?, lng? }, imageKey? }
 * Rules:
 * - title: 5-100 characters
 * - description: 10-1000 characters
 * - category: valid CATEGORY enum
 * - location.address: required string
 *
 * @param {any} body
 * @returns {Array<{ field: string, message: string }>}
 */
export function validateCreateIssue(body) {
  const details = [];

  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  // title: 5-100 chars
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 5 || title.length > 100) {
    details.push({
      field: 'title',
      message: 'Title must be between 5 and 100 characters long',
    });
  }

  // description: 10-1000 chars
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < 10 || description.length > 1000) {
    details.push({
      field: 'description',
      message: 'Description must be between 10 and 1000 characters long',
    });
  }

  // category
  if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
    details.push({
      field: 'category',
      message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }

  // location
  if (!body.location || typeof body.location !== 'object') {
    details.push({ field: 'location', message: 'Location object is required' });
  } else {
    const address = typeof body.location.address === 'string' ? body.location.address.trim() : '';
    if (!address) {
      details.push({ field: 'location.address', message: 'Physical street address is required' });
    }

    if (body.location.lat !== undefined && typeof body.location.lat !== 'number') {
      details.push({ field: 'location.lat', message: 'Latitude must be a valid number' });
    }

    if (body.location.lng !== undefined && typeof body.location.lng !== 'number') {
      details.push({ field: 'location.lng', message: 'Longitude must be a valid number' });
    }
  }

  // imageKey (optional)
  if (body.imageKey !== undefined && typeof body.imageKey !== 'string') {
    details.push({ field: 'imageKey', message: 'ImageKey must be a string' });
  }

  return details;
}

/**
 * PATCH /issues/{id}/status validator
 * Body: { status, note?, priority? }
 * Rules:
 * - status: one of VERIFIED, IN_PROGRESS, RESOLVED, REJECTED
 * - if status === VERIFIED: priority REQUIRED (LOW, MEDIUM, HIGH)
 * - if status === REJECTED: note REQUIRED
 * - if status === RESOLVED: note REQUIRED
 *
 * @param {any} body
 * @returns {Array<{ field: string, message: string }>}
 */
export function validateStatusUpdate(body) {
  const details = [];

  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  const allowedStatuses = ['VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
  if (!body.status || !allowedStatuses.includes(body.status)) {
    details.push({
      field: 'status',
      message: `Target status must be one of: ${allowedStatuses.join(', ')}`,
    });
  }

  // PENDING_VERIFICATION -> VERIFIED requires priority
  if (body.status === 'VERIFIED') {
    if (!body.priority || !VALID_PRIORITIES.includes(body.priority)) {
      details.push({
        field: 'priority',
        message: `Priority is required when verifying (one of: ${VALID_PRIORITIES.join(', ')})`,
      });
    }
  }

  // Rejection requires note
  if (body.status === 'REJECTED') {
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (!note) {
      details.push({
        field: 'note',
        message: 'A rejection note explaining the reason is required',
      });
    }
  }

  // Resolution requires note
  if (body.status === 'RESOLVED') {
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (!note) {
      details.push({
        field: 'note',
        message: 'A resolution note detailing completed remediation is required',
      });
    }
  }

  return details;
}

/**
 * POST /issues/{id}/assign validator
 * Body: { department, assignedTo }
 * Rules:
 * - department: valid DEPARTMENT enum (ROADS, SANITATION, ELECTRICAL, WATER, PARKS)
 * - assignedTo: string >= 2 chars
 *
 * @param {any} body
 * @returns {Array<{ field: string, message: string }>}
 */
export function validateAssignIssue(body) {
  const details = [];

  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  // department
  if (!body.department || !VALID_DEPARTMENTS.includes(body.department)) {
    details.push({
      field: 'department',
      message: `Department must be one of: ${VALID_DEPARTMENTS.join(', ')}`,
    });
  }

  // assignedTo
  const assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo.trim() : '';
  if (assignedTo.length < 2) {
    details.push({
      field: 'assignedTo',
      message: 'Assigned officer or crew name must be at least 2 characters long',
    });
  }

  return details;
}

export default {
  assertValid,
  validateLogin,
  validateUploadUrl,
  validateCreateIssue,
  validateStatusUpdate,
  validateAssignIssue,
  VALID_ROLES,
  VALID_STATUSES,
  VALID_PRIORITIES,
  VALID_CATEGORIES,
  VALID_DEPARTMENTS,
  VALID_IMAGE_CONTENT_TYPES,
};

