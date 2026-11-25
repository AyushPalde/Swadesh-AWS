/**
 * Mock Stats Service
 * Conforms to docs/BLUEPRINT.md (Sections 5 & 6)
 */
import { getIssuesStore, getCurrentUser, simulateLatency } from './mockStore.js';
import { ApiError } from '../api/client.js';
import { STATUS, CATEGORY, DEPARTMENTS, ROLES } from '../constants.js';

export async function getStats() {
  await simulateLatency();
  const currentUser = getCurrentUser();

  if (!currentUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token required');
  }

  if (currentUser.role !== ROLES.AUTHORITY) {
    throw new ApiError(403, 'FORBIDDEN', 'Authority role required to view analytics');
  }

  const issues = getIssuesStore();

  // Initialize breakdown maps
  const byStatus = Object.values(STATUS).reduce((acc, st) => {
    acc[st] = 0;
    return acc;
  }, {});

  const byCategory = Object.values(CATEGORY).reduce((acc, cat) => {
    acc[cat] = 0;
    return acc;
  }, {});

  const byDepartment = Object.keys(DEPARTMENTS).reduce((acc, dept) => {
    acc[dept] = 0;
    return acc;
  }, {});

  let totalUpvotes = 0;

  issues.forEach((issue) => {
    if (byStatus[issue.status] !== undefined) {
      byStatus[issue.status] += 1;
    }
    if (byCategory[issue.category] !== undefined) {
      byCategory[issue.category] += 1;
    }
    if (issue.department && byDepartment[issue.department] !== undefined) {
      byDepartment[issue.department] += 1;
    }
    totalUpvotes += issue.upvoteCount || 0;
  });

  const totals = {
    total: issues.length,
    pending: byStatus[STATUS.PENDING_VERIFICATION] || 0,
    verified: byStatus[STATUS.VERIFIED] || 0,
    assigned: byStatus[STATUS.ASSIGNED] || 0,
    inProgress: byStatus[STATUS.IN_PROGRESS] || 0,
    resolved: byStatus[STATUS.RESOLVED] || 0,
    rejected: byStatus[STATUS.REJECTED] || 0,
    totalUpvotes,
  };

  return {
    totals,
    byStatus,
    byCategory,
    byDepartment,
  };
}
