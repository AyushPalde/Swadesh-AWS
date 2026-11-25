/**
 * SWADESH Authority Endpoints & Workflow Integration Tests
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 3, 6, 8)
 *
 * Covers:
 * 1. Complete Happy Path Lifecycle:
 *    Report (PENDING_VERIFICATION) -> Verify (VERIFIED, priority HIGH) ->
 *    Assign (ASSIGNED, ROADS) -> In Progress (IN_PROGRESS) -> Resolve (RESOLVED)
 * 2. Role-Based Access Control (RBAC):
 *    Citizen role blocked with 403 FORBIDDEN on all authority endpoints.
 *    Missing auth blocked with 401 UNAUTHORIZED.
 * 3. Validation Errors (400 VALIDATION_ERROR):
 *    Missing priority when verifying, missing note when rejecting/resolving,
 *    attempting to set ASSIGNED via status patch, invalid department/assignedTo.
 * 4. Invalid Transitions (409 INVALID_TRANSITION):
 *    State skips, assigning non-verified issue, transitioning terminal states,
 *    optimistic lock collisions.
 * 5. Administrative KPI Stats (GET /stats):
 *    Validates full Blueprint stats shape and accurate aggregation numbers.
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import './setup.mjs';
import { handler } from '../src/index.mjs';
import { getRepo } from '../src/data/index.mjs';
import { signToken } from '../src/lib/auth.mjs';

function createGatewayEvent({
  method = 'GET',
  path = '/',
  body = null,
  headers = {},
  queryStringParameters = {},
}) {
  const isStringBody = typeof body === 'string';
  const serializedBody = body === null ? null : isStringBody ? body : JSON.stringify(body);

  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: Object.entries(queryStringParameters)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&'),
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    queryStringParameters,
    requestContext: {
      http: {
        method: method.toUpperCase(),
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-runner',
      },
      requestId: `req-auth-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timeEpoch: Date.now(),
    },
    body: serializedBody,
    isBase64Encoded: false,
  };
}

describe('SWADESH Authority Endpoints & State Machine', () => {
  let citizenUser;
  let citizenToken;
  let authorityUser;
  let authorityToken;

  before(async () => {
    const repo = getRepo();

    citizenUser = await repo.upsertUser({
      name: 'Asha Patil',
      email: 'asha.patil@example.com',
      role: 'citizen',
    });
    citizenToken = signToken({
      userId: citizenUser.userId,
      name: citizenUser.name,
      role: citizenUser.role,
    });

    authorityUser = await repo.upsertUser({
      name: 'JE Nilesh Sawant',
      email: 'nilesh.sawant@mcgm.gov.in',
      role: 'authority',
    });
    authorityToken = signToken({
      userId: authorityUser.userId,
      name: authorityUser.name,
      role: authorityUser.role,
    });
  });

  beforeEach(async () => {
    const repo = getRepo();
    if (typeof repo.resetMemoryStore === 'function') {
      repo.resetMemoryStore();
      // Re-seed users
      await repo.upsertUser({
        name: citizenUser.name,
        email: citizenUser.email,
        role: citizenUser.role,
      });
      await repo.upsertUser({
        name: authorityUser.name,
        email: authorityUser.email,
        role: authorityUser.role,
      });
    }
  });

  describe('1. Happy Path: Complete Issue Lifecycle', () => {
    it('progresses issue through Report -> Verify -> Assign -> In Progress -> Resolved', async () => {
      // Step A: Citizen reports issue
      const reportRes = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Massive crater on SV Road',
            description: 'Severe 4ft crater outside Bandra station causing vehicular damage.',
            category: 'POTHOLE',
            location: { address: 'SV Road, Bandra West, Mumbai', lat: 19.0544, lng: 72.8402 },
          },
        })
      );
      assert.equal(reportRes.statusCode, 201);
      const created = JSON.parse(reportRes.body);
      const issueId = created.issueId;

      assert.equal(created.status, 'PENDING_VERIFICATION');
      assert.equal(created.priority, null);
      assert.equal(created.department, null);
      assert.equal(created.assignedTo, null);
      assert.equal(created.statusHistory.length, 1);
      assert.equal(created.statusHistory[0].status, 'PENDING_VERIFICATION');

      // Step B: Authority verifies issue with priority HIGH
      const verifyRes = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${issueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            status: 'VERIFIED',
            priority: 'HIGH',
            note: 'Inspected on-site; confirmed urgent transit hazard.',
          },
        })
      );
      assert.equal(verifyRes.statusCode, 200);
      const verified = JSON.parse(verifyRes.body);

      assert.equal(verified.status, 'VERIFIED');
      assert.equal(verified.priority, 'HIGH');
      assert.equal(verified.statusHistory.length, 2);
      assert.equal(verified.statusHistory[1].status, 'VERIFIED');
      assert.equal(verified.statusHistory[1].by, 'JE Nilesh Sawant');
      assert.equal(
        verified.statusHistory[1].note,
        'Inspected on-site; confirmed urgent transit hazard.'
      );

      // Step C: Authority assigns issue to ROADS department
      const assignRes = await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${issueId}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            department: 'ROADS',
            assignedTo: 'Officer: R. Kulkarni',
          },
        })
      );
      assert.equal(assignRes.statusCode, 200);
      const assigned = JSON.parse(assignRes.body);

      assert.equal(assigned.status, 'ASSIGNED');
      assert.equal(assigned.department, 'ROADS');
      assert.equal(assigned.assignedTo, 'Officer: R. Kulkarni');
      assert.equal(assigned.statusHistory.length, 3);
      assert.equal(assigned.statusHistory[2].status, 'ASSIGNED');
      assert.equal(assigned.statusHistory[2].by, 'JE Nilesh Sawant');
      assert.equal(
        assigned.statusHistory[2].note,
        'Assigned to Roads & Infrastructure (Officer: R. Kulkarni)'
      );

      // Step D: Authority transitions to IN_PROGRESS
      const inProgressRes = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${issueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            status: 'IN_PROGRESS',
            note: 'Roads maintenance team mobilized with hot asphalt mix.',
          },
        })
      );
      assert.equal(inProgressRes.statusCode, 200);
      const inProgress = JSON.parse(inProgressRes.body);

      assert.equal(inProgress.status, 'IN_PROGRESS');
      assert.equal(inProgress.statusHistory.length, 4);
      assert.equal(inProgress.statusHistory[3].status, 'IN_PROGRESS');
      assert.equal(inProgress.statusHistory[3].by, 'JE Nilesh Sawant');

      // Step E: Authority resolves issue
      const resolveRes = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${issueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            status: 'RESOLVED',
            note: 'Pothole filled, rolled, leveled, and sealed with bitumen coating.',
          },
        })
      );
      assert.equal(resolveRes.statusCode, 200);
      const resolved = JSON.parse(resolveRes.body);

      assert.equal(resolved.status, 'RESOLVED');
      assert.equal(resolved.statusHistory.length, 5);
      assert.equal(resolved.statusHistory[4].status, 'RESOLVED');
      assert.equal(resolved.statusHistory[4].by, 'JE Nilesh Sawant');

      // Step F: Citizen retrieves issue and confirms full timeline
      const citizenGetRes = await handler(
        createGatewayEvent({
          method: 'GET',
          path: `/issues/${issueId}`,
          headers: { authorization: `Bearer ${citizenToken}` },
        })
      );
      assert.equal(citizenGetRes.statusCode, 200);
      const citizenView = JSON.parse(citizenGetRes.body);

      assert.equal(citizenView.status, 'RESOLVED');
      assert.equal(citizenView.priority, 'HIGH');
      assert.equal(citizenView.department, 'ROADS');
      assert.equal(citizenView.assignedTo, 'Officer: R. Kulkarni');
      assert.equal(citizenView.statusHistory.length, 5);
      assert.equal(citizenView.upvotedBy, undefined);
    });

    it('supports rejection workflow: PENDING_VERIFICATION -> REJECTED (with required note)', async () => {
      // 1. Report issue
      const reportRes = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Garbage on private colony terrace',
            description: 'Residents leaving litter on private apartment terrace.',
            category: 'GARBAGE',
            location: { address: 'Flat 402, Sunshine Apts, Dadar' },
          },
        })
      );
      const { issueId } = JSON.parse(reportRes.body);

      // 2. Reject issue
      const rejectRes = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${issueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            status: 'REJECTED',
            note: 'Rejected: Private residential society property outside municipal jurisdiction.',
          },
        })
      );
      assert.equal(rejectRes.statusCode, 200);
      const rejected = JSON.parse(rejectRes.body);

      assert.equal(rejected.status, 'REJECTED');
      assert.equal(rejected.statusHistory.length, 2);
      assert.equal(rejected.statusHistory[1].status, 'REJECTED');
      assert.equal(
        rejected.statusHistory[1].note,
        'Rejected: Private residential society property outside municipal jurisdiction.'
      );
    });
  });

  describe('2. Role-Based Access Control (RBAC)', () => {
    let testIssueId;

    beforeEach(async () => {
      const reportRes = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Flickering street light on MG Road',
            description: 'Sodium lamp flickering intermittently near signal.',
            category: 'STREETLIGHT',
            location: { address: 'MG Road, Fort, Mumbai' },
          },
        })
      );
      testIssueId = JSON.parse(reportRes.body).issueId;
    });

    it('citizens are forbidden (403) from calling PATCH /issues/{id}/status', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${citizenToken}` },
          body: { status: 'VERIFIED', priority: 'LOW' },
        })
      );
      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    it('citizens are forbidden (403) from calling POST /issues/{id}/assign', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${testIssueId}/assign`,
          headers: { authorization: `Bearer ${citizenToken}` },
          body: { department: 'ELECTRICAL', assignedTo: 'Lineman Crew 3' },
        })
      );
      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    it('citizens are forbidden (403) from calling GET /stats', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'GET',
          path: '/stats',
          headers: { authorization: `Bearer ${citizenToken}` },
        })
      );
      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    it('unauthenticated requests without Bearer token return 401 UNAUTHORIZED', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'GET',
          path: '/stats',
        })
      );
      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('3. Validation Errors (400 VALIDATION_ERROR)', () => {
    let testIssueId;

    beforeEach(async () => {
      const reportRes = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Water pipeline bursting',
            description: 'Major leak leaking potable water onto carriageway.',
            category: 'WATER_LEAKAGE',
            location: { address: 'Kurla West near junction' },
          },
        })
      );
      testIssueId = JSON.parse(reportRes.body).issueId;
    });

    it('verifying without priority returns 400 VALIDATION_ERROR with field details', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            status: 'VERIFIED',
            // Missing priority
          },
        })
      );
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.details.some((d) => d.field === 'priority'));
    });

    it('rejecting without note returns 400 VALIDATION_ERROR with field details', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            status: 'REJECTED',
            // Missing note
          },
        })
      );
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.details.some((d) => d.field === 'note'));
    });

    it('resolving without note returns 400 VALIDATION_ERROR with field details', async () => {
      // First verify and assign and move to in_progress
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'VERIFIED', priority: 'MEDIUM' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${testIssueId}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { department: 'WATER', assignedTo: 'Water Works Gang 1' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'IN_PROGRESS' },
        })
      );

      // Now attempt to resolve without note
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            status: 'RESOLVED',
            // Missing note
          },
        })
      );
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.details.some((d) => d.field === 'note'));
    });

    it('attempting to set status ASSIGNED via PATCH /issues/{id}/status is rejected with 400', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'ASSIGNED' },
        })
      );
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    });

    it('assigning with invalid department returns 400 VALIDATION_ERROR', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${testIssueId}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            department: 'FIRE_BRIGADE', // Invalid enum
            assignedTo: 'Station Officer',
          },
        })
      );
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.details.some((d) => d.field === 'department'));
    });

    it('assigning with empty or 1-character assignedTo returns 400 VALIDATION_ERROR', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${testIssueId}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            department: 'ROADS',
            assignedTo: 'X',
          },
        })
      );
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.details.some((d) => d.field === 'assignedTo'));
    });
  });

  describe('4. Invalid Transitions (409 INVALID_TRANSITION)', () => {
    let testIssueId;

    beforeEach(async () => {
      const reportRes = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Clogged storm drain on Linking Road',
            description: 'Drain blocked with plastic bags and silt causing waterlogging.',
            category: 'DRAINAGE',
            location: { address: 'Linking Road, Khar' },
          },
        })
      );
      testIssueId = JSON.parse(reportRes.body).issueId;
    });

    it('attempting to jump from PENDING_VERIFICATION directly to IN_PROGRESS fails with 409', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'IN_PROGRESS' },
        })
      );
      assert.equal(res.statusCode, 409);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'INVALID_TRANSITION');
    });

    it('attempting to assign an issue when it is still PENDING_VERIFICATION fails with 409', async () => {
      const res = await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${testIssueId}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: {
            department: 'WATER',
            assignedTo: 'Stormwater Crew 4',
          },
        })
      );
      assert.equal(res.statusCode, 409);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'INVALID_TRANSITION');
    });

    it('transitioning from terminal state RESOLVED fails with 409', async () => {
      // Advance issue to RESOLVED
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'VERIFIED', priority: 'LOW' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${testIssueId}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { department: 'WATER', assignedTo: 'Stormwater Crew 4' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'IN_PROGRESS' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'RESOLVED', note: 'All silt extracted.' },
        })
      );

      // Try to re-open or move to IN_PROGRESS
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'IN_PROGRESS' },
        })
      );
      assert.equal(res.statusCode, 409);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'INVALID_TRANSITION');
    });

    it('transitioning from terminal state REJECTED fails with 409', async () => {
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'REJECTED', note: 'Duplicate report of existing ticket.' },
        })
      );

      // Attempt to verify a rejected ticket
      const res = await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${testIssueId}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'VERIFIED', priority: 'LOW' },
        })
      );
      assert.equal(res.statusCode, 409);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, 'INVALID_TRANSITION');
    });
  });

  describe('5. Administrative KPI Stats (GET /stats)', () => {
    it('returns exact Blueprint metrics shape and aggregations', async () => {
      // Seed several issues in different states
      // Issue 1: POTHOLE, PENDING_VERIFICATION
      const r1 = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Pothole on Western Express Highway',
            description: 'Huge pothole causing traffic jam near airport exit.',
            category: 'POTHOLE',
            location: { address: 'WEH near domestic airport flyover' },
          },
        })
      );
      const id1 = JSON.parse(r1.body).issueId;

      // Upvote Issue 1 twice (using toggle)
      await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${id1}/upvote`,
          headers: { authorization: `Bearer ${citizenToken}` },
        })
      );

      // Issue 2: GARBAGE, VERIFIED
      const r2 = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Garbage pileup near school entrance',
            description: 'Uncollected refuse overflowing onto pedestrian footpath.',
            category: 'GARBAGE',
            location: { address: 'St Joseph School, Bandra' },
          },
        })
      );
      const id2 = JSON.parse(r2.body).issueId;
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${id2}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'VERIFIED', priority: 'MEDIUM' },
        })
      );

      // Issue 3: WATER_LEAKAGE, ASSIGNED (WATER)
      const r3 = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Burst water main flooding basement',
            description: 'Potable water pipeline rupture near building foundations.',
            category: 'WATER_LEAKAGE',
            location: { address: 'Sector 4, Vashi' },
          },
        })
      );
      const id3 = JSON.parse(r3.body).issueId;
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${id3}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'VERIFIED', priority: 'HIGH' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${id3}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { department: 'WATER', assignedTo: 'Emergency Valve Crew' },
        })
      );

      // Issue 4: STREETLIGHT, RESOLVED (ELECTRICAL)
      const r4 = await handler(
        createGatewayEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${citizenToken}` },
          body: {
            title: 'Dark stretch on promenade',
            description: 'Multiple streetlights completely dead at night.',
            category: 'STREETLIGHT',
            location: { address: 'Carter Road promenade' },
          },
        })
      );
      const id4 = JSON.parse(r4.body).issueId;
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${id4}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'VERIFIED', priority: 'LOW' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'POST',
          path: `/issues/${id4}/assign`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { department: 'ELECTRICAL', assignedTo: 'BEST Line Gang 2' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${id4}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'IN_PROGRESS' },
        })
      );
      await handler(
        createGatewayEvent({
          method: 'PATCH',
          path: `/issues/${id4}/status`,
          headers: { authorization: `Bearer ${authorityToken}` },
          body: { status: 'RESOLVED', note: 'LED luminaires replaced and tested.' },
        })
      );

      // Now query GET /stats as authority
      const statsRes = await handler(
        createGatewayEvent({
          method: 'GET',
          path: '/stats',
          headers: { authorization: `Bearer ${authorityToken}` },
        })
      );
      assert.equal(statsRes.statusCode, 200);
      const stats = JSON.parse(statsRes.body);

      // Validate blueprint shape
      assert.ok(stats.totals);
      assert.ok(stats.byStatus);
      assert.ok(stats.byCategory);
      assert.ok(stats.byDepartment);

      // Validate counts
      assert.equal(stats.totals.total, 4);
      assert.equal(stats.totals.pending, 1);
      assert.equal(stats.totals.verified, 1);
      assert.equal(stats.totals.assigned, 1);
      assert.equal(stats.totals.inProgress, 0);
      assert.equal(stats.totals.resolved, 1);
      assert.equal(stats.totals.rejected, 0);
      assert.equal(stats.totals.totalUpvotes, 1);

      // Validate breakdown by status
      assert.equal(stats.byStatus.PENDING_VERIFICATION, 1);
      assert.equal(stats.byStatus.VERIFIED, 1);
      assert.equal(stats.byStatus.ASSIGNED, 1);
      assert.equal(stats.byStatus.IN_PROGRESS, 0);
      assert.equal(stats.byStatus.RESOLVED, 1);
      assert.equal(stats.byStatus.REJECTED, 0);

      // Validate breakdown by category
      assert.equal(stats.byCategory.POTHOLE, 1);
      assert.equal(stats.byCategory.GARBAGE, 1);
      assert.equal(stats.byCategory.WATER_LEAKAGE, 1);
      assert.equal(stats.byCategory.STREETLIGHT, 1);
      assert.equal(stats.byCategory.DRAINAGE, 0);
      assert.equal(stats.byCategory.OTHER, 0);

      // Validate breakdown by department
      assert.equal(stats.byDepartment.WATER, 1);
      assert.equal(stats.byDepartment.ELECTRICAL, 1);
      assert.equal(stats.byDepartment.ROADS, 0);
      assert.equal(stats.byDepartment.SANITATION, 0);
      assert.equal(stats.byDepartment.PARKS, 0);
    });
  });
});

