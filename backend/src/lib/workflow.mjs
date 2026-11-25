/**
 * SWADESH Platform Workflow State Machine
 * Single Source of Truth: docs/BLUEPRINT.md (Section 3)
 *
 * Workflow Rules:
 * - PENDING_VERIFICATION -> VERIFIED   (authority; priority REQUIRED)
 * - PENDING_VERIFICATION -> REJECTED   (authority; note REQUIRED)
 * - VERIFIED             -> ASSIGNED   (ONLY via POST /issues/{id}/assign)
 * - ASSIGNED             -> IN_PROGRESS (authority; note optional)
 * - IN_PROGRESS          -> RESOLVED   (authority; note REQUIRED)
 * - RESOLVED and REJECTED are terminal.
 * - Every transition appends to statusHistory.
 */

export const STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
});

export const STATUS_LABELS = Object.freeze({
  [STATUS.PENDING_VERIFICATION]: 'Pending Verification',
  [STATUS.VERIFIED]: 'Verified',
  [STATUS.ASSIGNED]: 'Assigned',
  [STATUS.IN_PROGRESS]: 'In Progress',
  [STATUS.RESOLVED]: 'Resolved',
  [STATUS.REJECTED]: 'Rejected',
});

export const PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
});

export const DEPARTMENTS = Object.freeze({
  ROADS: 'Roads & Infrastructure',
  SANITATION: 'Sanitation & Waste',
  ELECTRICAL: 'Street Lighting & Electrical',
  WATER: 'Water Supply & Drainage',
  PARKS: 'Parks & Public Spaces',
});

export const ALLOWED_TRANSITIONS = Object.freeze({
  [STATUS.PENDING_VERIFICATION]: Object.freeze([STATUS.VERIFIED, STATUS.REJECTED]),
  [STATUS.VERIFIED]: Object.freeze([STATUS.ASSIGNED]),
  [STATUS.ASSIGNED]: Object.freeze([STATUS.IN_PROGRESS]),
  [STATUS.IN_PROGRESS]: Object.freeze([STATUS.RESOLVED]),
  [STATUS.RESOLVED]: Object.freeze([]),
  [STATUS.REJECTED]: Object.freeze([]),
});

/**
 * Returns an array of valid target statuses for the given source status.
 *
 * @param {string} from - Source status
 * @returns {string[]} Allowed target statuses (empty array if none or invalid)
 */
export function getAllowedTransitions(from) {
  if (!from || typeof from !== 'string' || !ALLOWED_TRANSITIONS[from]) {
    return [];
  }
  return [...ALLOWED_TRANSITIONS[from]];
}

/**
 * Pure function determining whether transition from one status to another is permitted.
 *
 * @param {string} from - Current status
 * @param {string} to - Desired target status
 * @returns {boolean} True if the transition is allowed, false otherwise
 */
export function canTransition(from, to) {
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return false;
  }
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) {
    return false;
  }
  return allowed.includes(to);
}

export default {
  STATUS,
  STATUS_LABELS,
  PRIORITY,
  DEPARTMENTS,
  ALLOWED_TRANSITIONS,
  getAllowedTransitions,
  canTransition,
};

