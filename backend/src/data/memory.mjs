/**
 * SWADESH In-Memory Data Store Implementation
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 4 & 5)
 *
 * Implements the exact same interface and behavior as `dynamo.mjs`.
 * Used for fast unit testing and offline local development without AWS credentials.
 * Optionally persists state to `backend/.local-data.json`.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { notFound, conflict } from '../lib/errors.mjs';
import { DEPARTMENTS } from '../lib/workflow.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DATA_PATH = path.resolve(__dirname, '../../.local-data.json');

// In-Memory Collections (Map-based)
const usersStore = new Map();
const issuesStore = new Map();
// Internal upvotes set: issueId -> Set<userId>
const upvotesStore = new Map();

let persistenceEnabled = true;

/**
 * Computes deterministic Blueprint userId:
 * "u_" + first 12 hex chars of sha256(lowercase email)
 * @param {string} email
 * @returns {string}
 */
export function generateUserId(email) {
  const normalized = (email || '').trim().toLowerCase();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return `u_${hash.substring(0, 12)}`;
}

/**
 * Strips internal attributes and computes viewerHasUpvoted.
 * @param {Object} issue
 * @param {string} [currentUserId]
 * @returns {Object}
 */
function sanitizeIssue(issue, currentUserId) {
  if (!issue) return null;
  const { upvotedBy, ...rest } = issue;
  const upvotedUsers = upvotesStore.get(issue.issueId) || new Set();

  return {
    ...rest,
    viewerHasUpvoted: Boolean(currentUserId && upvotedUsers.has(currentUserId)),
  };
}

/**
 * Saves in-memory state to disk if local file path exists or persistence is enabled.
 */
function persistToDisk() {
  if (!persistenceEnabled) return;

  try {
    const data = {
      users: Array.from(usersStore.values()),
      issues: Array.from(issuesStore.values()),
      upvotes: Array.from(upvotesStore.entries()).map(([issueId, userSet]) => [
        issueId,
        Array.from(userSet),
      ]),
    };
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore disk write errors in ephemeral/sandbox test environments
  }
}

/**
 * Loads persisted data from disk if file exists.
 */
function loadFromDisk() {
  if (!fs.existsSync(LOCAL_DATA_PATH)) return;

  try {
    const raw = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8');
    const data = JSON.parse(raw);

    if (Array.isArray(data.users)) {
      usersStore.clear();
      data.users.forEach((u) => usersStore.set(u.userId, u));
    }

    if (Array.isArray(data.issues)) {
      issuesStore.clear();
      data.issues.forEach((i) => issuesStore.set(i.issueId, i));
    }

    if (Array.isArray(data.upvotes)) {
      upvotesStore.clear();
      data.upvotes.forEach(([id, uids]) => upvotesStore.set(id, new Set(uids)));
    }
  } catch {
    // Fall back to clean memory
  }
}

// Attempt initial load on import
loadFromDisk();

/**
 * Clears in-memory maps (useful for isolated unit testing).
 * @param {boolean} [disableDiskPersistence=false]
 */
export function resetMemoryStore(disableDiskPersistence = false) {
  usersStore.clear();
  issuesStore.clear();
  upvotesStore.clear();
  if (disableDiskPersistence) {
    persistenceEnabled = false;
  }
}

// =========================================================================================
// USERS REPOSITORY (MEMORY)
// =========================================================================================

/**
 * Upserts a user in memory.
 * @param {{ email: string, name: string, role: string }} userData
 * @returns {Promise<Object>}
 */
export async function upsertUser({ email, name, role }) {
  const userId = generateUserId(email);
  const now = new Date().toISOString();

  const existing = usersStore.get(userId);
  const user = {
    userId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  usersStore.set(userId, user);
  persistToDisk();
  return { ...user };
}

/**
 * Fetches user profile from memory.
 * @param {string} userId
 * @returns {Promise<Object | null>}
 */
export async function getUser(userId) {
  const user = usersStore.get(userId);
  return user ? { ...user } : null;
}

// =========================================================================================
// ISSUES REPOSITORY (MEMORY)
// =========================================================================================

/**
 * Stores a new civic grievance issue in memory.
 * @param {Object} issue
 * @returns {Promise<Object>}
 */
export async function createIssue(issue) {
  const now = new Date().toISOString();
  const item = {
    ...issue,
    upvoteCount: typeof issue.upvoteCount === 'number' ? issue.upvoteCount : 0,
    statusHistory: issue.statusHistory || [],
    createdAt: issue.createdAt || now,
    updatedAt: issue.updatedAt || now,
  };

  issuesStore.set(item.issueId, item);
  upvotesStore.set(item.issueId, new Set());
  persistToDisk();

  return sanitizeIssue(item);
}

/**
 * Retrieves a single issue from memory by `issueId`.
 * @param {string} issueId
 * @param {string} [currentUserId]
 * @returns {Promise<Object | null>}
 */
export async function getIssue(issueId, currentUserId) {
  const item = issuesStore.get(issueId);
  if (!item) return null;
  return sanitizeIssue(item, currentUserId);
}

/**
 * Lists issues from memory with pagination, sorting, and filters.
 *
 * @param {Object} params
 * @param {string} [currentUserId]
 * @returns {Promise<{ items: Object[], nextCursor: string | null }>}
 */
export async function listIssues(
  { status, category, reporterId, sort = 'recent', limit = 20, cursor = null } = {},
  currentUserId
) {
  let items = Array.from(issuesStore.values());

  // Filter: reporterId
  if (reporterId) {
    items = items.filter((i) => i.reporterId === reporterId);
  }

  // Filter: status
  if (status) {
    items = items.filter((i) => i.status === status);
  }

  // Filter: category
  if (category) {
    items = items.filter((i) => i.category === category);
  }

  // Sort
  if (sort === 'top') {
    items.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
  } else {
    // recent
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Pagination (Cursor is an opaque base64 offset index string)
  let offset = 0;
  if (cursor) {
    try {
      const decoded = parseInt(Buffer.from(cursor, 'base64').toString('utf-8'), 10);
      if (!isNaN(decoded) && decoded >= 0) offset = decoded;
    } catch {
      offset = 0;
    }
  }

  const effectiveLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const paged = items.slice(offset, offset + effectiveLimit);
  const nextOffset = offset + effectiveLimit;
  const nextCursor =
    nextOffset < items.length
      ? Buffer.from(String(nextOffset), 'utf-8').toString('base64')
      : null;

  return {
    items: paged.map((i) => sanitizeIssue(i, currentUserId)),
    nextCursor,
  };
}

/**
 * Toggles civic support in memory, strictly enforcing Set uniqueness.
 *
 * @param {string} issueId
 * @param {string} userId
 * @returns {Promise<{ upvoteCount: number, upvoted: boolean }>}
 */
export async function toggleUpvote(issueId, userId) {
  const issue = issuesStore.get(issueId);
  if (!issue) {
    throw notFound(`Issue with ID ${issueId} not found`);
  }

  let userSet = upvotesStore.get(issueId);
  if (!userSet) {
    userSet = new Set();
    upvotesStore.set(issueId, userSet);
  }

  let upvoted = false;
  if (userSet.has(userId)) {
    // Remove upvote
    userSet.delete(userId);
    issue.upvoteCount = Math.max(0, (issue.upvoteCount || 1) - 1);
    upvoted = false;
  } else {
    // Add upvote
    userSet.add(userId);
    issue.upvoteCount = (issue.upvoteCount || 0) + 1;
    upvoted = true;
  }

  issue.updatedAt = new Date().toISOString();
  persistToDisk();

  return {
    upvoteCount: issue.upvoteCount,
    upvoted,
  };
}

/**
 * Simulates DynamoDB conditional write: checks `status === fromStatus`.
 * Throws conflict if another update intervened.
 *
 * @param {string} issueId
 * @param {{ fromStatus: string, toStatus: string, by: string, note?: string, priority?: string }} transition
 * @returns {Promise<Object>}
 */
export async function transitionStatus(
  issueId,
  { fromStatus, toStatus, by, note = '', priority }
) {
  const issue = issuesStore.get(issueId);
  if (!issue) {
    throw notFound(`Issue with ID ${issueId} not found`);
  }

  if (issue.status !== fromStatus) {
    throw conflict(
      `Status transition conflict: issue is in status '${issue.status}', expected '${fromStatus}'`
    );
  }

  const now = new Date().toISOString();
  const historyEntry = {
    status: toStatus,
    by,
    note: note && note.trim() ? note.trim() : `Status changed to ${toStatus}`,
    at: now,
  };

  issue.status = toStatus;
  if (priority) {
    issue.priority = priority;
  }
  issue.statusHistory = issue.statusHistory || [];
  issue.statusHistory.push(historyEntry);
  issue.updatedAt = now;

  persistToDisk();
  return sanitizeIssue(issue);
}

/**
 * Simulates DynamoDB conditional assignment: requires status === 'VERIFIED'.
 *
 * @param {string} issueId
 * @param {{ department: string, assignedTo: string, by: string }} assignment
 * @returns {Promise<Object>}
 */
export async function assignIssue(issueId, { department, assignedTo, by, note }) {
  const issue = issuesStore.get(issueId);
  if (!issue) {
    throw notFound(`Issue with ID ${issueId} not found`);
  }

  if (issue.status !== 'VERIFIED') {
    throw conflict(
      `Assignment conflict: issue must be in VERIFIED status, but is currently '${issue.status}'`
    );
  }

  const now = new Date().toISOString();
  const deptLabel = DEPARTMENTS[department] || department;
  const historyEntry = {
    status: 'ASSIGNED',
    by,
    note: note && note.trim() ? note.trim() : `Assigned to ${deptLabel} (${assignedTo.trim()})`,
    at: now,
  };

  issue.status = 'ASSIGNED';
  issue.department = department;
  issue.assignedTo = assignedTo.trim();
  issue.statusHistory = issue.statusHistory || [];
  issue.statusHistory.push(historyEntry);
  issue.updatedAt = now;

  persistToDisk();
  return sanitizeIssue(issue);
}

/**
 * Computes administrative KPI metrics in memory.
 * @returns {Promise<Object>}
 */
export async function getStats() {
  const byStatus = {
    PENDING_VERIFICATION: 0,
    VERIFIED: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    REJECTED: 0,
  };

  const byCategory = {
    POTHOLE: 0,
    GARBAGE: 0,
    STREETLIGHT: 0,
    WATER_LEAKAGE: 0,
    DRAINAGE: 0,
    OTHER: 0,
  };

  const byDepartment = {
    ROADS: 0,
    SANITATION: 0,
    ELECTRICAL: 0,
    WATER: 0,
    PARKS: 0,
  };

  let totalUpvotes = 0;
  const issues = Array.from(issuesStore.values());

  for (const issue of issues) {
    totalUpvotes += issue.upvoteCount || 0;

    if (byStatus[issue.status] !== undefined) {
      byStatus[issue.status]++;
    }
    if (byCategory[issue.category] !== undefined) {
      byCategory[issue.category]++;
    }
    if (issue.department && byDepartment[issue.department] !== undefined) {
      byDepartment[issue.department]++;
    }
  }

  return {
    totals: {
      total: issues.length,
      pending: byStatus.PENDING_VERIFICATION,
      verified: byStatus.VERIFIED,
      assigned: byStatus.ASSIGNED,
      inProgress: byStatus.IN_PROGRESS,
      resolved: byStatus.RESOLVED,
      rejected: byStatus.REJECTED,
      totalUpvotes,
    },
    byStatus,
    byCategory,
    byDepartment,
  };
}

export default {
  upsertUser,
  getUser,
  createIssue,
  getIssue,
  listIssues,
  toggleUpvote,
  transitionStatus,
  assignIssue,
  getStats,
  generateUserId,
  resetMemoryStore,
};
