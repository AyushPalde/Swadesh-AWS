/**
 * SWADESH AWS Lambda Entrypoint (HTTP API v2.0)
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 6 & 8)
 *
 * Implements:
 * - API Gateway HTTP API v2.0 event parsing
 * - Execution duration profiling
 * - Routing & path param extraction
 * - AppError -> Blueprint error JSON conversion
 * - Unexpected exception shielding (500 INTERNAL_ERROR without leaking internals)
 * - Structured CloudWatch summary logging (exactly 1 line per invocation)
 * - Public & Authenticated Citizen Endpoints:
 *     - GET  /health
 *     - POST /login
 *     - POST /upload-url
 *     - POST /issues
 *     - GET  /issues
 *     - GET  /issues/{id}
 *     - POST /issues/{id}/upvote
 */

import crypto from 'node:crypto';

import { router } from './router.mjs';
import { config } from './config.mjs';
import { getRepo } from './data/index.mjs';
import { AppError, badRequest, forbidden, notFound, conflict, internalError } from './lib/errors.mjs';
import { json } from './lib/response.mjs';
import { logger } from './lib/logger.mjs';
import { requireAuth, requireRole } from './lib/auth.mjs';
import {
  validateCreateIssue,
  validateUploadUrl,
  validateStatusUpdate,
  validateAssignIssue,
  VALID_STATUSES,
  VALID_CATEGORIES,
  assertValid,
} from './lib/validate.mjs';
import { createUploadUrl, getImageUrl } from './lib/storage.mjs';
import { canTransition, DEPARTMENTS } from './lib/workflow.mjs';

/**
 * Single serialization function for issue objects per Blueprint Section 5.
 * - Resolves `imageUrl` via storage.getImageUrl
 * - Calculates `viewerHasUpvoted` for the active viewer
 * - REMOVES the internal `upvotedBy` set from the returned object
 *
 * @param {Object} issue
 * @param {Object | null} [viewer=null]
 * @returns {Promise<Object>} Blueprint Issue representation
 */
export async function toIssueResponse(issue, viewer = null) {
  if (!issue) return null;

  // 1. Remove the internal upvotedBy set
  const { upvotedBy, ...rest } = issue;

  // 2. Compute viewerHasUpvoted
  let viewerHasUpvoted = false;
  const viewerId = viewer?.userId || viewer?.sub;
  if (viewerId) {
    if (upvotedBy instanceof Set) {
      viewerHasUpvoted = upvotedBy.has(viewerId);
    } else if (Array.isArray(upvotedBy)) {
      viewerHasUpvoted = upvotedBy.includes(viewerId);
    } else if (typeof rest.viewerHasUpvoted === 'boolean') {
      viewerHasUpvoted = rest.viewerHasUpvoted;
    }
  }

  // 3. Resolve presigned GET imageUrl
  const imageUrl = await getImageUrl(rest.imageKey);

  return {
    issueId: rest.issueId,
    title: rest.title,
    description: rest.description,
    category: rest.category,
    location: rest.location,
    imageKey: rest.imageKey || null,
    imageUrl: imageUrl || null,
    status: rest.status,
    priority: rest.priority ?? null,
    department: rest.department ?? null,
    assignedTo: rest.assignedTo ?? null,
    reporterId: rest.reporterId,
    reporterName: rest.reporterName,
    upvoteCount: rest.upvoteCount || 0,
    viewerHasUpvoted,
    statusHistory: rest.statusHistory || [],
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
  };
}

// =========================================================================================
// ROUTE REGISTRATIONS
// =========================================================================================

/**
 * GET /health (public)
 * Healthcheck route returning service status and UTC timestamp.
 */
router.get('/health', async () => {
  return json(200, {
    ok: true,
    service: 'swadesh-api',
    time: new Date().toISOString(),
  });
});

/**
 * GET /me (Firebase authenticated)
 * Returns the server-controlled profile for the signed-in Firebase account.
 */
router.get('/me', async (req) => {
  const user = await requireAuth(req);
  return json(200, { user });
});

/**
 * POST /register (Firebase authenticated)
 * Creates a citizen profile. The client cannot choose or elevate its role.
 */
router.post('/register', async (req) => {
  const identity = await requireAuth(req);
  const name = typeof req.body?.name === 'string' && req.body.name.trim()
    ? req.body.name.trim()
    : identity.name;
  const repo = getRepo();
  const existing = await repo.getUser(identity.userId);
  const user = await repo.upsertUser({
    userId: identity.userId,
    email: identity.email,
    name,
    role: existing?.role || 'citizen',
  });
  return json(201, {
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role === 'authority' ? 'authority' : 'citizen',
      createdAt: user.createdAt,
    },
  });
});

/**
 * POST /upload-url (auth)
 * Body: { fileName, contentType }
 * Returns: { uploadUrl, imageKey }
 */
router.post('/upload-url', async (req) => {
  const user = await requireAuth(req);
  const details = validateUploadUrl(req.body);
  assertValid(details, 'Invalid upload-url request body');

  const { uploadUrl, imageKey } = await createUploadUrl({
    userId: user.userId,
    fileName: req.body.fileName,
    contentType: req.body.contentType,
  });

  return json(200, {
    uploadUrl,
    imageKey,
  });
});

/**
 * POST /issues (auth)
 * Body: { title, description, category, location, imageKey? }
 * Reporter information is ALWAYS derived from the verified token (never trusted from body).
 * Returns: Issue (201 Created)
 */
router.post('/issues', async (req) => {
  const user = await requireAuth(req);
  const details = validateCreateIssue(req.body);
  assertValid(details, 'Invalid issue creation payload');

  const issueId = 'iss_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  const newIssue = {
    issueId,
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    category: req.body.category,
    location: {
      address: req.body.location.address.trim(),
      ...(typeof req.body.location.lat === 'number' ? { lat: req.body.location.lat } : {}),
      ...(typeof req.body.location.lng === 'number' ? { lng: req.body.location.lng } : {}),
    },
    imageKey: req.body.imageKey || null,
    status: 'PENDING_VERIFICATION',
    priority: null,
    department: null,
    assignedTo: null,
    reporterId: user.userId,
    reporterName: user.name,
    upvoteCount: 0,
    statusHistory: [
      {
        status: 'PENDING_VERIFICATION',
        by: user.name,
        note: 'Issue reported',
        at: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const repo = getRepo();
  const saved = await repo.createIssue(newIssue);
  const formatted = await toIssueResponse(saved, user);

  return json(201, formatted);
});

/**
 * GET /issues (auth)
 * Query: ?status&category&mine=true&sort=recent|top&limit&cursor
 * Returns: { items: Issue[], nextCursor: string | null }
 */
router.get('/issues', async (req) => {
  const user = await requireAuth(req);

  const status = req.query?.status && VALID_STATUSES.includes(req.query.status) ? req.query.status : undefined;
  const category = req.query?.category && VALID_CATEGORIES.includes(req.query.category) ? req.query.category : undefined;
  const isMine = req.query?.mine === 'true' || req.query?.mine === true;
  const reporterId = isMine ? user.userId : undefined;
  const sort = req.query?.sort === 'top' ? 'top' : 'recent';
  const rawLimit = parseInt(req.query?.limit, 10);
  const limit = !isNaN(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
  const cursor = req.query?.cursor || null;

  const repo = getRepo();
  const result = await repo.listIssues(
    { status, category, reporterId, sort, limit, cursor },
    user.userId
  );

  const items = await Promise.all(
    result.items.map((issue) => toIssueResponse(issue, user))
  );

  return json(200, {
    items,
    nextCursor: result.nextCursor,
  });
});

/**
 * GET /issues/{id} (auth)
 * Returns: Single Issue object
 */
router.get('/issues/{id}', async (req) => {
  const user = await requireAuth(req);
  const repo = getRepo();
  const issue = await repo.getIssue(req.params.id, user.userId);

  if (!issue) {
    throw notFound(`Issue with ID ${req.params.id} not found`);
  }

  const formatted = await toIssueResponse(issue, user);
  return json(200, formatted);
});

/**
 * POST /issues/{id}/upvote (auth)
 * Toggles civic backing support on an issue.
 * Returns: { upvoteCount: number, upvoted: boolean }
 */
router.post('/issues/{id}/upvote', async (req) => {
  const user = await requireAuth(req);
  const repo = getRepo();
  const result = await repo.toggleUpvote(req.params.id, user.userId);

  return json(200, {
    upvoteCount: result.upvoteCount,
    upvoted: result.upvoted,
  });
});

/**
 * PATCH /issues/{id}/status (authority only)
 * Body: { status, note?, priority? }
 * Rules:
 * - Requires authority role
 * - Validates status, priority (required for VERIFIED), note (required for REJECTED/RESOLVED)
 * - Disallows setting ASSIGNED here (must use POST /issues/{id}/assign)
 * - Verifies allowed transition via canTransition
 * - Uses conditional transitionStatus so concurrent edits fail with 409 INVALID_TRANSITION
 * - Records "by" as the authority's name
 * - Emits structured INFO log with { action, issueId, from, to, userId }
 * Returns: Updated Issue (200)
 */
router.patch('/issues/{id}/status', async (req) => {
  const user = await requireRole(req, 'authority');
  const details = validateStatusUpdate(req.body);
  assertValid(details, 'Invalid status transition request');

  const { status, note, priority } = req.body;
  if (status === 'ASSIGNED') {
    throw badRequest('ASSIGNED status cannot be set via status patch. Use POST /issues/{id}/assign');
  }

  const repo = getRepo();
  const current = await repo.getIssue(req.params.id, user.userId);
  if (!current) {
    throw notFound(`Issue with ID ${req.params.id} not found`);
  }

  if (!canTransition(current.status, status)) {
    throw conflict(`Cannot transition issue from '${current.status}' to '${status}'`);
  }

  const updated = await repo.transitionStatus(req.params.id, {
    fromStatus: current.status,
    toStatus: status,
    by: user.name,
    note,
    priority,
  });

  logger.info(`Status transitioned: ${current.status} -> ${status}`, {
    action: 'transitionStatus',
    issueId: req.params.id,
    from: current.status,
    to: status,
    userId: user.userId,
  });

  const formatted = await toIssueResponse(updated, user);
  return json(200, formatted);
});

/**
 * POST /issues/{id}/assign (authority only)
 * Body: { department, assignedTo }
 * Rules:
 * - Requires authority role
 * - Department must be one of the blueprint DEPARTMENT keys
 * - Issue must currently be in VERIFIED status (fails with 409 otherwise)
 * - Sets status ASSIGNED, stores department + assignedTo
 * - Appends statusHistory with note such as "Assigned to Roads & Infrastructure (Officer: R. Kulkarni)"
 * - Emits structured INFO log with { action, issueId, from, to, userId }
 * Returns: Updated Issue (200)
 */
router.post('/issues/{id}/assign', async (req) => {
  const user = await requireRole(req, 'authority');
  const details = validateAssignIssue(req.body);
  assertValid(details, 'Invalid issue assignment payload');

  const { department, assignedTo } = req.body;
  const repo = getRepo();
  const current = await repo.getIssue(req.params.id, user.userId);
  if (!current) {
    throw notFound(`Issue with ID ${req.params.id} not found`);
  }

  if (current.status !== 'VERIFIED') {
    throw conflict(`Issue must be in VERIFIED status to be assigned (currently '${current.status}')`);
  }

  const deptName = DEPARTMENTS[department] || department;
  const note = `Assigned to ${deptName} (${assignedTo.trim()})`;

  const updated = await repo.assignIssue(req.params.id, {
    department,
    assignedTo: assignedTo.trim(),
    by: user.name,
    note,
  });

  logger.info(`Issue assigned to ${deptName}`, {
    action: 'assignIssue',
    issueId: req.params.id,
    from: current.status,
    to: 'ASSIGNED',
    userId: user.userId,
  });

  const formatted = await toIssueResponse(updated, user);
  return json(200, formatted);
});

/**
 * GET /stats (authority only)
 * Returns: Blueprint Stats shape { totals, byStatus, byCategory, byDepartment }
 */
router.get('/stats', async (req) => {
  await requireRole(req, 'authority');
  const repo = getRepo();
  const stats = await repo.getStats();

  return json(200, stats);
});

// =========================================================================================
// LAMBDA HANDLER & REQUEST LIFECYCLE
// =========================================================================================

/**
 * Parses and normalizes incoming HTTP API v2.0 event body.
 * Handles base64 decode and JSON deserialization.
 *
 * @param {string | undefined} rawBody
 * @param {boolean} [isBase64Encoded=false]
 * @param {Record<string, string>} [headers={}]
 * @returns {any}
 */
function parseRequestBody(rawBody, isBase64Encoded = false, headers = {}) {
  if (!rawBody) return null;

  let text = rawBody;
  if (isBase64Encoded) {
    try {
      text = Buffer.from(rawBody, 'base64').toString('utf-8');
    } catch {
      throw badRequest('Malformed base64 request payload');
    }
  }

  const contentType = (headers['content-type'] || '').toLowerCase();
  const trimmed = text.trim();

  // If content-type is json or body appears to be JSON
  if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      throw badRequest('Malformed JSON in request body');
    }
  }

  return text;
}

/**
 * Normalizes HTTP headers keys to lowercase.
 *
 * @param {Record<string, string>} [headers={}]
 * @returns {Record<string, string>}
 */
function normalizeHeaders(headers = {}) {
  if (!headers || typeof headers !== 'object') return {};
  const lowercased = {};
  for (const [key, value] of Object.entries(headers)) {
    lowercased[key.toLowerCase()] = value;
  }
  return lowercased;
}

/**
 * AWS Lambda Handler for API Gateway HTTP API (payload format v2.0)
 *
 * @param {Object} event - API Gateway HTTP API v2.0 payload
 * @param {Object} context - Lambda runtime context
 * @returns {Promise<{ statusCode: number, headers: Record<string, string>, body: string }>}
 */
export async function handler(event, context = {}) {
  const startTime = performance.now();

  // Extract core event fields from HTTP API format 2.0
  const rawPath = event?.rawPath || event?.requestContext?.http?.path || '/';
  const method = (event?.requestContext?.http?.method || 'GET').toUpperCase();
  const requestId = event?.requestContext?.requestId || context?.awsRequestId || 'req-local';
  const headers = normalizeHeaders(event?.headers);
  const query = event?.queryStringParameters || {};
  const origin = headers.origin || '';
  const allowedOrigins = ['https://swadesh-aws.vercel.app', 'http://localhost:5173'];
  const corsHeaders = {
    'access-control-allow-origin': allowedOrigins.includes(origin) ? origin : 'https://swadesh-aws.vercel.app',
    'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, X-Demo-User, Authorization',
    'access-control-max-age': '3000',
    'vary': 'Origin',
  };
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  let statusCode = 200;
  let response = null;
  let matchedRoute = rawPath;
  let userId = null;

  try {
    // 1. Parse body
    const body = parseRequestBody(event?.body, Boolean(event?.isBase64Encoded), headers);

    const reqContext = {
      method,
      path: rawPath,
      query,
      body,
      headers,
      user: null,
      requestId,
    };

    // 2. Route request
    const result = await router.handle(reqContext);
    userId = reqContext.user?.userId || null;

    // 3. Format response
    if (result && typeof result === 'object' && typeof result.statusCode === 'number') {
      response = result;
      statusCode = result.statusCode;
    } else {
      response = json(200, result);
      statusCode = 200;
    }

    // Inspect matched pattern for log grouping if available
    const matched = router.match(method, rawPath);
    if (matched) {
      matchedRoute = matched.route.pattern;
    }
  } catch (err) {
    if (err instanceof AppError || err.name === 'AppError') {
      // Known Blueprint operational error
      statusCode = err.statusCode || 400;
      response = json(statusCode, err.toBlueprintJson ? err.toBlueprintJson() : {
        error: {
          code: err.code || 'VALIDATION_ERROR',
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      });

      // Warning log for client / operational errors (passwords and tokens omitted)
      logger.warn(`Operational request failure: ${err.message}`, {
        requestId,
        route: matchedRoute,
        method,
        statusCode,
        code: err.code,
      });
    } else {
      // Unexpected crash / internal failure - shield internals
      statusCode = 500;
      response = json(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });

      // Full stack trace recorded in CloudWatch
      logger.error('Unhandled server exception during request processing', {
        requestId,
        route: matchedRoute,
        method,
        statusCode: 500,
        stack: err?.stack || String(err),
        extra: {
          errorMessage: err?.message,
          errorName: err?.name,
        },
      });
    }
  } finally {
    // ALWAYS write one structured summary log line per request for CloudWatch Logs Insights
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    logger.requestSummary({
      requestId,
      route: matchedRoute,
      method,
      statusCode,
      durationMs,
      userId,
    });
  }

  return {
    ...response,
    headers: { ...(response?.headers || {}), ...corsHeaders },
  };
}

export { router };
export default handler;
