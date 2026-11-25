/**
 * Mock Issues Service
 * Conforms to docs/BLUEPRINT.md (Sections 3, 5, 6, 8)
 */
import {
  getIssuesStore,
  persistIssuesStore,
  getUpvotesSet,
  persistUpvotesStore,
  getCurrentUser,
  generateIssueId,
  simulateLatency,
} from './mockStore.js';
import { ApiError } from '../api/client.js';
import { STATUS, PRIORITY, CATEGORY, DEPARTMENTS, ROLES } from '../constants.js';

/**
 * GET /issues
 */
export async function listIssues({
  status,
  category,
  mine,
  sort = 'recent',
  limit = 20,
  cursor = null,
} = {}) {
  await simulateLatency();
  const currentUser = getCurrentUser();
  const issues = getIssuesStore();

  let filtered = [...issues];

  // Filter: status
  if (status) {
    filtered = filtered.filter((i) => i.status === status);
  }

  // Filter: category
  if (category) {
    filtered = filtered.filter((i) => i.category === category);
  }

  // Filter: mine
  const isMine = mine === true || mine === 'true';
  if (isMine && currentUser?.userId) {
    filtered = filtered.filter((i) => i.reporterId === currentUser.userId);
  }

  // Sort: 'top' vs 'recent'
  if (sort === 'top') {
    filtered.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
  } else {
    // recent
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Pagination cursor handling (base64 encoded offset index)
  let offset = 0;
  if (cursor) {
    try {
      offset = parseInt(atob(cursor), 10);
      if (isNaN(offset) || offset < 0) offset = 0;
    } catch {
      offset = 0;
    }
  }

  const effectiveLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const pagedItems = filtered.slice(offset, offset + effectiveLimit);

  // Compute viewerHasUpvoted for current user
  const items = pagedItems.map((item) => {
    const upvotes = getUpvotesSet(item.issueId);
    return {
      ...item,
      viewerHasUpvoted: currentUser?.userId ? upvotes.has(currentUser.userId) : false,
    };
  });

  const nextOffset = offset + effectiveLimit;
  const nextCursor = nextOffset < filtered.length ? btoa(String(nextOffset)) : null;

  return {
    items,
    nextCursor,
  };
}

/**
 * GET /issues/{id}
 */
export async function getIssue(id) {
  await simulateLatency();
  const currentUser = getCurrentUser();
  const issues = getIssuesStore();

  const issue = issues.find((i) => i.issueId === id);
  if (!issue) {
    throw new ApiError(404, 'NOT_FOUND', `Issue with ID ${id} was not found`);
  }

  const upvotes = getUpvotesSet(issue.issueId);
  return {
    ...issue,
    viewerHasUpvoted: currentUser?.userId ? upvotes.has(currentUser.userId) : false,
  };
}

/**
 * POST /issues
 */
export async function createIssue({ title, description, category, location, imageKey } = {}) {
  await simulateLatency();
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token required');
  }

  const validationDetails = [];

  // Title: 5-100 chars
  if (!title || typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 100) {
    validationDetails.push({ field: 'title', message: 'Title must be between 5 and 100 characters' });
  }

  // Description: 10-1000 chars
  if (
    !description ||
    typeof description !== 'string' ||
    description.trim().length < 10 ||
    description.trim().length > 1000
  ) {
    validationDetails.push({
      field: 'description',
      message: 'Description must be between 10 and 1000 characters',
    });
  }

  // Location address required
  if (!location || !location.address || typeof location.address !== 'string' || !location.address.trim()) {
    validationDetails.push({ field: 'location.address', message: 'Street address is required' });
  }

  // Category validation
  if (!category || !Object.values(CATEGORY).includes(category)) {
    validationDetails.push({ field: 'category', message: `Category must be one of: ${Object.values(CATEGORY).join(', ')}` });
  }

  if (validationDetails.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Input validation failed', validationDetails);
  }

  const now = new Date().toISOString();
  const issueId = generateIssueId();

  // If mock imageKey was provided, construct simulated display URL
  const imageUrl = imageKey
    ? (imageKey.startsWith('http') || imageKey.startsWith('blob:'))
      ? imageKey
      : `https://picsum.photos/seed/${issueId}/800/600`
    : null;

  const newIssue = {
    issueId,
    title: title.trim(),
    description: description.trim(),
    category,
    location: {
      address: location.address.trim(),
      lat: typeof location.lat === 'number' ? location.lat : 19.076,
      lng: typeof location.lng === 'number' ? location.lng : 72.8777,
    },
    imageKey: imageKey || null,
    imageUrl,
    status: STATUS.PENDING_VERIFICATION,
    priority: null,
    department: null,
    assignedTo: null,
    reporterId: currentUser.userId,
    reporterName: currentUser.name,
    upvoteCount: 0,
    viewerHasUpvoted: false,
    statusHistory: [
      {
        status: STATUS.PENDING_VERIFICATION,
        by: currentUser.name,
        note: 'Issue reported',
        at: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const issues = getIssuesStore();
  issues.unshift(newIssue);
  persistIssuesStore();

  return newIssue;
}

/**
 * POST /issues/{id}/upvote
 */
export async function toggleUpvote(id) {
  await simulateLatency(150, 300);
  const currentUser = getCurrentUser();
  if (!currentUser?.userId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token required to support issue');
  }

  const issues = getIssuesStore();
  const issue = issues.find((i) => i.issueId === id);
  if (!issue) {
    throw new ApiError(404, 'NOT_FOUND', `Issue with ID ${id} not found`);
  }

  const upvotes = getUpvotesSet(id);
  const userId = currentUser.userId;
  let upvoted = false;

  if (upvotes.has(userId)) {
    // Remove upvote
    upvotes.delete(userId);
    issue.upvoteCount = Math.max(0, (issue.upvoteCount || 1) - 1);
    upvoted = false;
  } else {
    // Add upvote
    upvotes.add(userId);
    issue.upvoteCount = (issue.upvoteCount || 0) + 1;
    upvoted = true;
  }

  issue.viewerHasUpvoted = upvoted;
  issue.updatedAt = new Date().toISOString();

  persistIssuesStore();
  persistUpvotesStore();

  return {
    upvoteCount: issue.upvoteCount,
    upvoted,
  };
}

/**
 * PATCH /issues/{id}/status (Authority only)
 * Allowed transitions:
 * - PENDING_VERIFICATION -> VERIFIED (priority REQUIRED)
 * - PENDING_VERIFICATION -> REJECTED (note REQUIRED)
 * - VERIFIED -> ASSIGNED (ONLY via POST /issues/{id}/assign)
 * - ASSIGNED -> IN_PROGRESS (note optional)
 * - IN_PROGRESS -> RESOLVED (note REQUIRED)
 */
export async function updateStatus(id, { status: nextStatus, note, priority } = {}) {
  await simulateLatency();
  const currentUser = getCurrentUser();

  if (!currentUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token required');
  }

  if (currentUser.role !== ROLES.AUTHORITY) {
    throw new ApiError(403, 'FORBIDDEN', 'Authority role required to update grievance status');
  }

  const issues = getIssuesStore();
  const issue = issues.find((i) => i.issueId === id);
  if (!issue) {
    throw new ApiError(404, 'NOT_FOUND', `Issue with ID ${id} not found`);
  }

  const current = issue.status;

  // Terminal states cannot transition
  if (current === STATUS.RESOLVED || current === STATUS.REJECTED) {
    throw new ApiError(409, 'INVALID_TRANSITION', `Issue is already in terminal state ${current} and cannot transition`);
  }

  // VERIFIED -> ASSIGNED can only happen via assignIssue
  if (nextStatus === STATUS.ASSIGNED) {
    throw new ApiError(409, 'INVALID_TRANSITION', 'Status transition to ASSIGNED must be performed via /issues/{id}/assign endpoint');
  }

  // Validate allowed transitions
  if (current === STATUS.PENDING_VERIFICATION) {
    if (nextStatus === STATUS.VERIFIED) {
      if (!priority || !Object.values(PRIORITY).includes(priority)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Priority is required when verifying an issue (LOW, MEDIUM, HIGH)', [
          { field: 'priority', message: 'Priority required' },
        ]);
      }
    } else if (nextStatus === STATUS.REJECTED) {
      if (!note || typeof note !== 'string' || !note.trim()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'A rejection note explaining the reason is required', [
          { field: 'note', message: 'Rejection note is required' },
        ]);
      }
    } else {
      throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition from PENDING_VERIFICATION to ${nextStatus}`);
    }
  } else if (current === STATUS.VERIFIED) {
    throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition from VERIFIED to ${nextStatus}. Must assign first via /issues/{id}/assign`);
  } else if (current === STATUS.ASSIGNED) {
    if (nextStatus !== STATUS.IN_PROGRESS) {
      throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition from ASSIGNED to ${nextStatus}. Allowed: IN_PROGRESS`);
    }
  } else if (current === STATUS.IN_PROGRESS) {
    if (nextStatus !== STATUS.RESOLVED) {
      throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition from IN_PROGRESS to ${nextStatus}. Allowed: RESOLVED`);
    }
    if (!note || typeof note !== 'string' || !note.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Resolution note describing completion is required', [
        { field: 'note', message: 'Resolution note required' },
      ]);
    }
  } else {
    throw new ApiError(409, 'INVALID_TRANSITION', `Invalid transition from ${current} to ${nextStatus}`);
  }

  const now = new Date().toISOString();
  issue.status = nextStatus;

  if (priority) {
    issue.priority = priority;
  }

  const defaultNotes = {
    [STATUS.VERIFIED]: `Issue verified with priority ${priority || issue.priority}`,
    [STATUS.IN_PROGRESS]: 'Field crew commenced work on site',
    [STATUS.RESOLVED]: 'Grievance resolved',
    [STATUS.REJECTED]: 'Issue rejected',
  };

  issue.statusHistory.push({
    status: nextStatus,
    by: currentUser.name,
    note: note && note.trim() ? note.trim() : defaultNotes[nextStatus] || 'Status updated',
    at: now,
  });

  issue.updatedAt = now;
  persistIssuesStore();

  return issue;
}

/**
 * POST /issues/{id}/assign (Authority only)
 * Only allowed when status is VERIFIED. Transitions to ASSIGNED.
 */
export async function assignIssue(id, { department, assignedTo } = {}) {
  await simulateLatency();
  const currentUser = getCurrentUser();

  if (!currentUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token required');
  }

  if (currentUser.role !== ROLES.AUTHORITY) {
    throw new ApiError(403, 'FORBIDDEN', 'Authority role required to assign issue');
  }

  const issues = getIssuesStore();
  const issue = issues.find((i) => i.issueId === id);
  if (!issue) {
    throw new ApiError(404, 'NOT_FOUND', `Issue with ID ${id} not found`);
  }

  if (issue.status !== STATUS.VERIFIED) {
    throw new ApiError(
      409,
      'INVALID_TRANSITION',
      `Issue must be in VERIFIED status to be assigned. Current status is ${issue.status}`
    );
  }

  const validationDetails = [];
  if (!department || !Object.keys(DEPARTMENTS).includes(department)) {
    validationDetails.push({
      field: 'department',
      message: `Department must be one of: ${Object.keys(DEPARTMENTS).join(', ')}`,
    });
  }

  if (!assignedTo || typeof assignedTo !== 'string' || assignedTo.trim().length < 2) {
    validationDetails.push({
      field: 'assignedTo',
      message: 'Designated assignee name or team is required',
    });
  }

  if (validationDetails.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Input validation failed', validationDetails);
  }

  const now = new Date().toISOString();
  issue.status = STATUS.ASSIGNED;
  issue.department = department;
  issue.assignedTo = assignedTo.trim();

  issue.statusHistory.push({
    status: STATUS.ASSIGNED,
    by: currentUser.name,
    note: `Assigned to ${DEPARTMENTS[department] || department} (${assignedTo.trim()})`,
    at: now,
  });

  issue.updatedAt = now;
  persistIssuesStore();

  return issue;
}
