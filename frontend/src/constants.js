/**
 * SWADESH Platform Constants & Workflow State Machine
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 2 & 3)
 */

// 1. Roles
export const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  AUTHORITY: 'authority',
});

// 2. Issue Statuses
export const STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
});

// User-facing labels for each status
export const STATUS_LABELS = Object.freeze({
  [STATUS.PENDING_VERIFICATION]: 'Pending Verification',
  [STATUS.VERIFIED]: 'Verified',
  [STATUS.ASSIGNED]: 'Assigned',
  [STATUS.IN_PROGRESS]: 'In Progress',
  [STATUS.RESOLVED]: 'Resolved',
  [STATUS.REJECTED]: 'Rejected',
});

// Allowed status transitions as defined in BLUEPRINT.md (Section 3)
// PENDING_VERIFICATION -> VERIFIED (authority; priority REQUIRED)
// PENDING_VERIFICATION -> REJECTED (authority; note REQUIRED)
// VERIFIED             -> ASSIGNED (ONLY via POST /issues/{id}/assign)
// ASSIGNED             -> IN_PROGRESS (authority; note optional)
// IN_PROGRESS          -> RESOLVED (authority; note REQUIRED)
// RESOLVED and REJECTED are final.
export const STATUS_FLOW = Object.freeze({
  [STATUS.PENDING_VERIFICATION]: [STATUS.VERIFIED, STATUS.REJECTED],
  [STATUS.VERIFIED]: [STATUS.ASSIGNED],
  [STATUS.ASSIGNED]: [STATUS.IN_PROGRESS],
  [STATUS.IN_PROGRESS]: [STATUS.RESOLVED],
  [STATUS.RESOLVED]: [],
  [STATUS.REJECTED]: [],
});

/**
 * Returns the list of permitted next statuses for a given status.
 * @param {string} currentStatus
 * @returns {string[]} Allowed target statuses
 */
export function getNextStatuses(currentStatus) {
  if (!currentStatus || !STATUS_FLOW[currentStatus]) {
    return [];
  }
  return STATUS_FLOW[currentStatus];
}

// 3. Priorities
export const PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
});

export const PRIORITY_LABELS = Object.freeze({
  [PRIORITY.LOW]: 'Low Priority',
  [PRIORITY.MEDIUM]: 'Medium Priority',
  [PRIORITY.HIGH]: 'High Priority',
});

// 4. Categories
export const CATEGORY = Object.freeze({
  POTHOLE: 'POTHOLE',
  GARBAGE: 'GARBAGE',
  STREETLIGHT: 'STREETLIGHT',
  WATER_LEAKAGE: 'WATER_LEAKAGE',
  DRAINAGE: 'DRAINAGE',
  OTHER: 'OTHER',
});

export const CATEGORY_LABELS = Object.freeze({
  [CATEGORY.POTHOLE]: 'Pothole & Road Hazard',
  [CATEGORY.GARBAGE]: 'Garbage & Waste Accumulation',
  [CATEGORY.STREETLIGHT]: 'Street Lighting & Electrical',
  [CATEGORY.WATER_LEAKAGE]: 'Water Supply & Leakage',
  [CATEGORY.DRAINAGE]: 'Drainage & Sewage Overflow',
  [CATEGORY.OTHER]: 'Other Civic Issue',
});

// 5. Municipal Departments
export const DEPARTMENTS = Object.freeze({
  ROADS: 'Roads & Infrastructure',
  SANITATION: 'Sanitation & Waste',
  ELECTRICAL: 'Street Lighting & Electrical',
  WATER: 'Water Supply & Drainage',
  PARKS: 'Parks & Public Spaces',
});

