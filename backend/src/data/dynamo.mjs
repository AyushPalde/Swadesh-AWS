/**
 * SWADESH DynamoDB Repository Implementation
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 4 & 5)
 *
 * =========================================================================================
 * DYNAMODB CORE ARCHITECTURE CONCEPTS EXPLAINED:
 * =========================================================================================
 * 1. PARTITION KEY (PK):
 *    DynamoDB partitions data across physical storage nodes. The Partition Key (e.g. `issueId`
 *    or `userId`) is run through an internal hash function to route reads and writes directly
 *    to the responsible storage partition, giving consistent sub-10ms O(1) key lookups.
 *
 * 2. GLOBAL SECONDARY INDEX (GSI):
 *    Tables can only be directly queried by their primary key. A Global Secondary Index (GSI)
 *    creates an asynchronous, secondary projection of the data with a different partition key
 *    and sort key (e.g. `gsi_status_createdAt` uses `status` as PK and `createdAt` as SK).
 *    GSIs enable fast, sorted range queries across all table partitions without expensive full table scans.
 *
 * 3. CONDITIONAL WRITES (ConditionExpression):
 *    Enables optimistic concurrency control. DynamoDB verifies that an item matches a specific
 *    state condition (e.g. `status = :fromStatus` or `not(contains(upvotedBy, :uid))`) AT THE EXACT
 *    MOMENT of the write. If another authority or concurrent request modified the record, DynamoDB
 *    aborts the write and throws `ConditionalCheckFailedException`, preventing dirty overwrites.
 *
 * 4. STRING SET (SS):
 *    DynamoDB provides native Set types (`SS`) containing unique string values. `ADD` inserts
 *    a value, and `DELETE` removes it atomically.
 *    CRITICAL NUANCE: DynamoDB Sets CANNOT BE EMPTY. When `DELETE` removes the last remaining
 *    item from a set, DynamoDB automatically removes the attribute from the item completely.
 * =========================================================================================
 */

import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

import { config } from '../config.mjs';
import { notFound, conflict } from '../lib/errors.mjs';
import { DEPARTMENTS } from '../lib/workflow.mjs';

// Lazily initialized DynamoDB Document Client
let docClient = null;

export function getDocClient() {
  if (!docClient) {
    const rawClient = new DynamoDBClient({
      region: config.AWS_REGION || 'us-east-1',
    });

    // Wrap with Document Client: automatically marshalls JS types <-> DynamoDB attribute types
    // and cleans up undefined values so queries don't fail.
    docClient = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });
  }
  return docClient;
}

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
 * Sanitizes internal attributes (such as upvotedBy String Set) before sending response.
 * @param {Object} item
 * @param {string} [currentUserId]
 * @returns {Object}
 */
function sanitizeIssue(item, currentUserId) {
  if (!item) return null;
  const { upvotedBy, ...rest } = item;

  let viewerHasUpvoted = false;
  if (currentUserId && upvotedBy) {
    if (upvotedBy instanceof Set) {
      viewerHasUpvoted = upvotedBy.has(currentUserId);
    } else if (Array.isArray(upvotedBy)) {
      viewerHasUpvoted = upvotedBy.includes(currentUserId);
    }
  }

  return {
    ...rest,
    viewerHasUpvoted,
  };
}

/**
 * Encodes DynamoDB LastEvaluatedKey to an opaque base64 string cursor.
 * @param {Object | null} key
 * @returns {string | null}
 */
function encodeCursor(key) {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key), 'utf-8').toString('base64');
}

/**
 * Decodes base64 string cursor into a DynamoDB ExclusiveStartKey.
 * @param {string | null} cursor
 * @returns {Object | null}
 */
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

// =========================================================================================
// USERS REPOSITORY
// =========================================================================================

/**
 * Upserts a citizen or authority user record.
 * PK: userId
 *
 * @param {{ email: string, name: string, role: string }} userData
 * @returns {Promise<Object>}
 */
export async function upsertUser({ userId: suppliedUserId, email, name, role }) {
  const userId = suppliedUserId || generateUserId(email);
  const now = new Date().toISOString();

  // Try to preserve existing createdAt if user already exists
  const existing = await getUser(userId);
  const user = {
    userId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await getDocClient().send(
    new PutCommand({
      TableName: config.USERS_TABLE,
      Item: user,
    })
  );

  return user;
}

/**
 * Fetches user profile by partition key `userId`.
 * @param {string} userId
 * @returns {Promise<Object | null>}
 */
export async function getUser(userId) {
  const response = await getDocClient().send(
    new GetCommand({
      TableName: config.USERS_TABLE,
      Key: { userId },
    })
  );
  return response.Item || null;
}

// =========================================================================================
// ISSUES REPOSITORY
// =========================================================================================

/**
 * Stores a new civic grievance issue.
 * PK: issueId
 *
 * @param {Object} issue
 * @returns {Promise<Object>}
 */
export async function createIssue(issue) {
  const item = {
    ...issue,
    upvoteCount: typeof issue.upvoteCount === 'number' ? issue.upvoteCount : 0,
    statusHistory: issue.statusHistory || [],
    createdAt: issue.createdAt || new Date().toISOString(),
    updatedAt: issue.updatedAt || new Date().toISOString(),
  };

  await getDocClient().send(
    new PutCommand({
      TableName: config.ISSUES_TABLE,
      Item: item,
    })
  );

  return sanitizeIssue(item);
}

/**
 * Retrieves a single issue by Partition Key `issueId`.
 *
 * @param {string} issueId
 * @param {string} [currentUserId]
 * @returns {Promise<Object | null>}
 */
export async function getIssue(issueId, currentUserId) {
  const response = await getDocClient().send(
    new GetCommand({
      TableName: config.ISSUES_TABLE,
      Key: { issueId },
    })
  );

  if (!response.Item) return null;
  return sanitizeIssue(response.Item, currentUserId);
}

/**
 * Lists issues with pagination and filters.
 *
 * DynamoDB Query Plan:
 * 1. If `reporterId` is provided -> Query GSI `gsi_reporter_createdAt` (descending by createdAt).
 * 2. Else if `status` is provided -> Query GSI `gsi_status_createdAt` (descending by createdAt).
 * 3. Else -> Scan table with Limit.
 *    // NOTE: Scan is acceptable for a mini project but does not scale in high-volume production.
 *
 * @param {Object} params
 * @param {string} [currentUserId]
 * @returns {Promise<{ items: Object[], nextCursor: string | null }>}
 */
export async function listIssues(
  { status, category, reporterId, sort = 'recent', limit = 20, cursor = null } = {},
  currentUserId
) {
  const effectiveLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const exclusiveStartKey = decodeCursor(cursor);

  let command;
  const filterExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Category filter is applied as FilterExpression
  if (category) {
    filterExpressions.push('#cat = :category');
    expressionAttributeNames['#cat'] = 'category';
    expressionAttributeValues[':category'] = category;
  }

  if (reporterId) {
    // 1. Query GSI: gsi_reporter_createdAt
    expressionAttributeNames['#repId'] = 'reporterId';
    expressionAttributeValues[':repId'] = reporterId;

    command = new QueryCommand({
      TableName: config.ISSUES_TABLE,
      IndexName: 'gsi_reporter_createdAt',
      KeyConditionExpression: '#repId = :repId',
      ScanIndexForward: false, // Descending by sort key `createdAt`
      Limit: effectiveLimit,
      ExclusiveStartKey: exclusiveStartKey || undefined,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
    });
  } else if (status) {
    // 2. Query GSI: gsi_status_createdAt
    expressionAttributeNames['#st'] = 'status';
    expressionAttributeValues[':st'] = status;

    command = new QueryCommand({
      TableName: config.ISSUES_TABLE,
      IndexName: 'gsi_status_createdAt',
      KeyConditionExpression: '#st = :st',
      ScanIndexForward: false, // Descending by sort key `createdAt`
      Limit: effectiveLimit,
      ExclusiveStartKey: exclusiveStartKey || undefined,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
    });
  } else {
    // 3. Scan with Limit
    // NOTE: Full-table Scan is acceptable for a college mini project demo, but in production
    // a primary partition strategy or partitioned date GSI should be used.
    command = new ScanCommand({
      TableName: config.ISSUES_TABLE,
      Limit: effectiveLimit,
      ExclusiveStartKey: exclusiveStartKey || undefined,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
      FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
    });
  }

  const response = await getDocClient().send(command);
  let items = (response.Items || []).map((item) => sanitizeIssue(item, currentUserId));

  // If sort="top", sort by upvoteCount descending after fetching
  if (sort === 'top') {
    items.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
  } else if (!reporterId && !status) {
    // Recent fallback for scan
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return {
    items,
    nextCursor: encodeCursor(response.LastEvaluatedKey),
  };
}

/**
 * Toggles civic support upvote using DynamoDB atomic operations and String Sets.
 *
 * HOW IT WORKS ATOMICALLY:
 * Phase 1: Try to ADD user to the `upvotedBy` String Set with condition `not(contains(upvotedBy, :uid))`.
 * Phase 2: If condition check fails (user already upvoted), execute DELETE from `upvotedBy` set.
 *
 * This eliminates double voting and guarantees thread-safe tallying.
 *
 * @param {string} issueId
 * @param {string} userId
 * @returns {Promise<{ upvoteCount: number, upvoted: boolean }>}
 */
export async function toggleUpvote(issueId, userId) {
  const now = new Date().toISOString();

  // Phase 1: Attempt to add upvote
  try {
    const addResult = await getDocClient().send(
      new UpdateCommand({
        TableName: config.ISSUES_TABLE,
        Key: { issueId },
        ConditionExpression:
          'attribute_exists(issueId) AND (attribute_not_exists(upvotedBy) OR NOT contains(upvotedBy, :uid))',
        UpdateExpression:
          'ADD upvotedBy :uidSet, upvoteCount :inc SET updatedAt = :now',
        ExpressionAttributeValues: {
          ':uid': userId,
          ':uidSet': new Set([userId]),
          ':inc': 1,
          ':now': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return {
      upvoteCount: addResult.Attributes.upvoteCount,
      upvoted: true,
    };
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') {
      throw err;
    }

    // Phase 2: User already upvoted -> Remove upvote
    // Note: When removing the last element of a Set, DynamoDB removes the attribute automatically.
    try {
      const deleteResult = await getDocClient().send(
        new UpdateCommand({
          TableName: config.ISSUES_TABLE,
          Key: { issueId },
          ConditionExpression:
            'attribute_exists(issueId) AND contains(upvotedBy, :uid)',
          UpdateExpression:
            'DELETE upvotedBy :uidSet ADD upvoteCount :dec SET updatedAt = :now',
          ExpressionAttributeValues: {
            ':uid': userId,
            ':uidSet': new Set([userId]),
            ':dec': -1,
            ':now': now,
          },
          ReturnValues: 'ALL_NEW',
        })
      );

      return {
        upvoteCount: Math.max(0, deleteResult.Attributes.upvoteCount || 0),
        upvoted: false,
      };
    } catch (removeErr) {
      if (removeErr.name === 'ConditionalCheckFailedException') {
        // If neither condition matched, the issue does not exist
        const check = await getIssue(issueId);
        if (!check) {
          throw notFound(`Issue with ID ${issueId} not found`);
        }
      }
      throw removeErr;
    }
  }
}

/**
 * Transitions issue status with optimistic locking.
 * Condition: status = :fromStatus (prevents race conditions between authorities).
 * Appends to `statusHistory` via DynamoDB `list_append`.
 *
 * @param {string} issueId
 * @param {{ fromStatus: string, toStatus: string, by: string, note?: string, priority?: string }} transition
 * @returns {Promise<Object>}
 */
export async function transitionStatus(
  issueId,
  { fromStatus, toStatus, by, note = '', priority }
) {
  const now = new Date().toISOString();
  const historyEntry = {
    status: toStatus,
    by,
    note: note && note.trim() ? note.trim() : `Status changed to ${toStatus}`,
    at: now,
  };

  const updateExpressions = [
    '#st = :toStatus',
    '#hist = list_append(if_not_exists(#hist, :emptyList), :newEntry)',
    '#upd = :now',
  ];
  const expressionAttributeNames = {
    '#st': 'status',
    '#hist': 'statusHistory',
    '#upd': 'updatedAt',
  };
  const expressionAttributeValues = {
    ':fromStatus': fromStatus,
    ':toStatus': toStatus,
    ':newEntry': [historyEntry],
    ':emptyList': [],
    ':now': now,
  };

  if (priority) {
    updateExpressions.push('#prio = :priority');
    expressionAttributeNames['#prio'] = 'priority';
    expressionAttributeValues[':priority'] = priority;
  }

  try {
    const result = await getDocClient().send(
      new UpdateCommand({
        TableName: config.ISSUES_TABLE,
        Key: { issueId },
        ConditionExpression: 'attribute_exists(issueId) AND #st = :fromStatus',
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return sanitizeIssue(result.Attributes);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      const current = await getIssue(issueId);
      if (!current) {
        throw notFound(`Issue with ID ${issueId} not found`);
      }
      throw conflict(
        `Status transition conflict: issue is in status '${current.status}', expected '${fromStatus}'`
      );
    }
    throw err;
  }
}

/**
 * Assigns a verified issue to a municipal department and repair crew.
 * Condition: status = 'VERIFIED' -> 'ASSIGNED'.
 *
 * @param {string} issueId
 * @param {{ department: string, assignedTo: string, by: string }} assignment
 * @returns {Promise<Object>}
 */
export async function assignIssue(issueId, { department, assignedTo, by, note }) {
  const now = new Date().toISOString();
  const deptLabel = DEPARTMENTS[department] || department;
  const historyEntry = {
    status: 'ASSIGNED',
    by,
    note: note && note.trim() ? note.trim() : `Assigned to ${deptLabel} (${assignedTo.trim()})`,
    at: now,
  };

  try {
    const result = await getDocClient().send(
      new UpdateCommand({
        TableName: config.ISSUES_TABLE,
        Key: { issueId },
        ConditionExpression: 'attribute_exists(issueId) AND #st = :verified',
        UpdateExpression:
          'SET #st = :assigned, #dept = :dept, #assignee = :assignedTo, #hist = list_append(if_not_exists(#hist, :emptyList), :newEntry), #upd = :now',
        ExpressionAttributeNames: {
          '#st': 'status',
          '#dept': 'department',
          '#assignee': 'assignedTo',
          '#hist': 'statusHistory',
          '#upd': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':verified': 'VERIFIED',
          ':assigned': 'ASSIGNED',
          ':dept': department,
          ':assignedTo': assignedTo.trim(),
          ':newEntry': [historyEntry],
          ':emptyList': [],
          ':now': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return sanitizeIssue(result.Attributes);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      const current = await getIssue(issueId);
      if (!current) {
        throw notFound(`Issue with ID ${issueId} not found`);
      }
      throw conflict(
        `Assignment conflict: issue must be in VERIFIED status, but is currently '${current.status}'`
      );
    }
    throw err;
  }
}

/**
 * Computes administrative dashboard metrics across all issues.
 * Uses a thin Scan with ProjectionExpression, paginating until finished.
 *
 * @returns {Promise<Object>} Blueprint Stats shape
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

  let totalCount = 0;
  let totalUpvotes = 0;
  let exclusiveStartKey = null;

  // Paginate through full table with thin projection to conserve RCU and memory
  do {
    const response = await getDocClient().send(
      new ScanCommand({
        TableName: config.ISSUES_TABLE,
        ProjectionExpression: '#st, #cat, #dept, #upvotes',
        ExpressionAttributeNames: {
          '#st': 'status',
          '#cat': 'category',
          '#dept': 'department',
          '#upvotes': 'upvoteCount',
        },
        ExclusiveStartKey: exclusiveStartKey || undefined,
      })
    );

    const items = response.Items || [];
    for (const item of items) {
      totalCount++;
      totalUpvotes += item.upvoteCount || 0;

      if (item.status && byStatus[item.status] !== undefined) {
        byStatus[item.status]++;
      }
      if (item.category && byCategory[item.category] !== undefined) {
        byCategory[item.category]++;
      }
      if (item.department && byDepartment[item.department] !== undefined) {
        byDepartment[item.department]++;
      }
    }

    exclusiveStartKey = response.LastEvaluatedKey || null;
  } while (exclusiveStartKey);

  return {
    totals: {
      total: totalCount,
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
};
