import './setup.mjs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { handler, toIssueResponse } from '../src/index.mjs';
import { signToken, verifyToken } from '../src/lib/auth.mjs';
import { resetMemoryStore } from '../src/data/memory.mjs';
import { config } from '../src/config.mjs';

/**
 * Helper to synthesize an Amazon API Gateway HTTP API v2.0 event.
 *
 * @param {Object} options
 * @param {string} options.method - HTTP method
 * @param {string} options.path - Request path
 * @param {Record<string, string>} [options.headers={}]
 * @param {Record<string, string>} [options.query={}]
 * @param {any} [options.body=null]
 * @returns {Object} API Gateway HTTP API v2.0 payload
 */
function makeEvent({ method, path, headers = {}, query = {}, body = null }) {
  return {
    rawPath: path,
    requestContext: {
      http: {
        method: method.toUpperCase(),
        path,
      },
      requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    },
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    queryStringParameters: query,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
    isBase64Encoded: false,
  };
}

describe('SWADESH Citizen Endpoints & Authentication Suite', () => {
  beforeEach(() => {
    // Reset in-memory collections and disable disk writes for isolated tests
    resetMemoryStore(true);
  });

  describe('1. POST /login (Citizen & Authority Authentication)', () => {
    it('successfully logs in a citizen without requiring a passcode', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/login',
        body: {
          name: 'Asha Patil',
          email: 'asha.patil@example.com',
          role: 'citizen',
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 200);

      const parsed = JSON.parse(res.body);
      assert.ok(parsed.token, 'Token must be returned');
      assert.ok(parsed.user, 'User object must be returned');
      assert.match(parsed.user.userId, /^u_[a-f0-9]{12}$/);
      assert.equal(parsed.user.name, 'Asha Patil');
      assert.equal(parsed.user.email, 'asha.patil@example.com');
      assert.equal(parsed.user.role, 'citizen');
      assert.ok(parsed.user.createdAt);

      // Verify returned token is a valid HS256 JWT
      const verified = verifyToken(parsed.token);
      assert.equal(verified.userId, parsed.user.userId);
      assert.equal(verified.role, 'citizen');
      assert.equal(verified.name, 'Asha Patil');
    });

    it('successfully logs in an authority with valid AUTHORITY_PASSCODE', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/login',
        body: {
          name: 'JE Nilesh Sawant',
          email: 'nilesh.sawant@bmc.gov.in',
          role: 'authority',
          passcode: config.AUTHORITY_PASSCODE, // Valid passcode
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 200);

      const parsed = JSON.parse(res.body);
      assert.equal(parsed.user.role, 'authority');
      assert.equal(parsed.user.name, 'JE Nilesh Sawant');

      const verified = verifyToken(parsed.token);
      assert.equal(verified.role, 'authority');
    });

    it('rejects authority login with incorrect passcode with 403 FORBIDDEN', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/login',
        body: {
          name: 'JE Nilesh Sawant',
          email: 'nilesh.sawant@bmc.gov.in',
          role: 'authority',
          passcode: 'wrong-passcode-123',
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 403);

      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'FORBIDDEN');
      assert.equal(parsed.error.message, 'Invalid authority passcode');
    });

    it('rejects authority login missing passcode with 400 VALIDATION_ERROR', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/login',
        body: {
          name: 'JE Nilesh Sawant',
          email: 'nilesh.sawant@bmc.gov.in',
          role: 'authority',
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 400);

      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'VALIDATION_ERROR');
      assert.ok(parsed.error.details.some((d) => d.field === 'passcode'));
    });

    it('rejects invalid email and short name with 400 VALIDATION_ERROR', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/login',
        body: {
          name: 'A', // Too short
          email: 'invalid-email-address',
          role: 'citizen',
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 400);

      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'VALIDATION_ERROR');
      assert.ok(parsed.error.details.some((d) => d.field === 'name'));
      assert.ok(parsed.error.details.some((d) => d.field === 'email'));
    });
  });

  describe('2. Unauthenticated Request Shielding', () => {
    it('returns 401 UNAUTHORIZED when calling POST /issues without token', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/issues',
        body: {
          title: 'Deep crater on road',
          description: 'Water has accumulated inside large pothole',
          category: 'POTHOLE',
          location: { address: 'SV Road' },
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 401);
      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED when calling GET /issues without token', async () => {
      const event = makeEvent({
        method: 'GET',
        path: '/issues',
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 401);
      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED with malformed or tampered token', async () => {
      const event = makeEvent({
        method: 'GET',
        path: '/issues',
        headers: {
          authorization: 'Bearer bad.token.signature',
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 401);
    });
  });

  describe('3. POST /issues Validation & Creation', () => {
    let citizenToken;

    beforeEach(async () => {
      const loginRes = await handler(
        makeEvent({
          method: 'POST',
          path: '/login',
          body: {
            name: 'Asha Patil',
            email: 'asha.patil@example.com',
            role: 'citizen',
          },
        })
      );
      citizenToken = JSON.parse(loginRes.body).token;
    });

    it('validates minimum title (5-100) and description (10-1000) lengths', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/issues',
        headers: { authorization: `Bearer ${citizenToken}` },
        body: {
          title: 'Hole', // < 5 chars
          description: 'Short', // < 10 chars
          category: 'POTHOLE',
          location: { address: 'SV Road' },
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 400);

      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'VALIDATION_ERROR');
      assert.ok(parsed.error.details.some((d) => d.field === 'title'));
      assert.ok(parsed.error.details.some((d) => d.field === 'description'));
    });

    it('creates an issue taking reporter identity strictly from token, initializing correct state', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/issues',
        headers: { authorization: `Bearer ${citizenToken}` },
        body: {
          title: 'Hazardous crater near Link Road Subway',
          description: 'Deep road cavity causing two-wheelers to swerve dangerously during morning traffic.',
          category: 'POTHOLE',
          location: {
            address: 'New Link Road, near Metro Pillar 42, Andheri West',
            lat: 19.1364,
            lng: 72.8296,
          },
          imageKey: 'issues/1a2b3c4d5e6f/pothole.jpg',
          // Malicious client tries to spoof reporter and initial status:
          reporterId: 'u_spoofed_admin',
          reporterName: 'Chief Minister',
          status: 'RESOLVED',
          upvoteCount: 999,
        },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 201);

      const issue = JSON.parse(res.body);
      assert.match(issue.issueId, /^iss_[a-f0-9]{12}$/);
      assert.equal(issue.title, 'Hazardous crater near Link Road Subway');
      assert.equal(issue.category, 'POTHOLE');

      // Crucial: Client spoofing ignored, reporter taken from verified token
      assert.notEqual(issue.reporterId, 'u_spoofed_admin');
      assert.equal(issue.reporterName, 'Asha Patil');

      // Initial state invariants enforced
      assert.equal(issue.status, 'PENDING_VERIFICATION');
      assert.equal(issue.priority, null);
      assert.equal(issue.department, null);
      assert.equal(issue.assignedTo, null);
      assert.equal(issue.upvoteCount, 0);
      assert.equal(issue.viewerHasUpvoted, false);

      // S3 presigned URL generated
      assert.equal(
        issue.imageUrl,
        'http://localhost:3001/local-files/issues/1a2b3c4d5e6f/pothole.jpg'
      );

      // Status history initialized
      assert.equal(issue.statusHistory.length, 1);
      assert.equal(issue.statusHistory[0].status, 'PENDING_VERIFICATION');
      assert.equal(issue.statusHistory[0].by, 'Asha Patil');
      assert.equal(issue.statusHistory[0].note, 'Issue reported');
    });
  });

  describe('4. GET /issues, Query Filters & mine=true', () => {
    let tokenA;
    let tokenB;
    let issueAId;
    let issueBId;

    beforeEach(async () => {
      // Citizen A
      const loginA = await handler(
        makeEvent({
          method: 'POST',
          path: '/login',
          body: { name: 'Asha Patil', email: 'asha@example.com', role: 'citizen' },
        })
      );
      tokenA = JSON.parse(loginA.body).token;

      // Citizen B
      const loginB = await handler(
        makeEvent({
          method: 'POST',
          path: '/login',
          body: { name: 'Rohan Sharma', email: 'rohan@example.com', role: 'citizen' },
        })
      );
      tokenB = JSON.parse(loginB.body).token;

      // Issue A (reported by Citizen A - Pothole)
      const resA = await handler(
        makeEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${tokenA}` },
          body: {
            title: 'Issue by Citizen A',
            description: 'Pothole on 7th Road with deep gravel crater',
            category: 'POTHOLE',
            location: { address: '7th Road' },
          },
        })
      );
      issueAId = JSON.parse(resA.body).issueId;

      // Issue B (reported by Citizen B - Streetlight)
      const resB = await handler(
        makeEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${tokenB}` },
          body: {
            title: 'Issue by Citizen B',
            description: 'Streetlight dark on 14th Cross Road',
            category: 'STREETLIGHT',
            location: { address: '14th Cross Rd' },
          },
        })
      );
      issueBId = JSON.parse(resB.body).issueId;
    });

    it('lists all issues for authenticated viewer without internal upvotedBy set', async () => {
      const event = makeEvent({
        method: 'GET',
        path: '/issues',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 200);

      const parsed = JSON.parse(res.body);
      assert.equal(parsed.items.length, 2);

      // Verifies upvotedBy is never exposed
      assert.ok(parsed.items.every((i) => i.upvotedBy === undefined));
      assert.ok(parsed.items.some((i) => i.issueId === issueAId));
      assert.ok(parsed.items.some((i) => i.issueId === issueBId));
    });

    it('filters strictly by mine=true returning only current user issues', async () => {
      // Citizen A requests mine=true
      const eventA = makeEvent({
        method: 'GET',
        path: '/issues',
        query: { mine: 'true' },
        headers: { authorization: `Bearer ${tokenA}` },
      });

      const resA = await handler(eventA);
      assert.equal(resA.statusCode, 200);

      const parsedA = JSON.parse(resA.body);
      assert.equal(parsedA.items.length, 1);
      assert.equal(parsedA.items[0].issueId, issueAId);
      assert.equal(parsedA.items[0].reporterName, 'Asha Patil');

      // Citizen B requests mine=true
      const eventB = makeEvent({
        method: 'GET',
        path: '/issues',
        query: { mine: 'true' },
        headers: { authorization: `Bearer ${tokenB}` },
      });

      const resB = await handler(eventB);
      assert.equal(resB.statusCode, 200);

      const parsedB = JSON.parse(resB.body);
      assert.equal(parsedB.items.length, 1);
      assert.equal(parsedB.items[0].issueId, issueBId);
      assert.equal(parsedB.items[0].reporterName, 'Rohan Sharma');
    });

    it('filters by category', async () => {
      const event = makeEvent({
        method: 'GET',
        path: '/issues',
        query: { category: 'POTHOLE' },
        headers: { authorization: `Bearer ${tokenA}` },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 200);

      const parsed = JSON.parse(res.body);
      assert.equal(parsed.items.length, 1);
      assert.equal(parsed.items[0].category, 'POTHOLE');
      assert.equal(parsed.items[0].issueId, issueAId);
    });
  });

  describe('5. GET /issues/{id} and POST /issues/{id}/upvote Toggle', () => {
    let tokenA;
    let tokenB;
    let targetIssueId;

    beforeEach(async () => {
      const loginA = await handler(
        makeEvent({
          method: 'POST',
          path: '/login',
          body: { name: 'Asha Patil', email: 'asha@example.com', role: 'citizen' },
        })
      );
      tokenA = JSON.parse(loginA.body).token;

      const loginB = await handler(
        makeEvent({
          method: 'POST',
          path: '/login',
          body: { name: 'Rohan Sharma', email: 'rohan@example.com', role: 'citizen' },
        })
      );
      tokenB = JSON.parse(loginB.body).token;

      const createRes = await handler(
        makeEvent({
          method: 'POST',
          path: '/issues',
          headers: { authorization: `Bearer ${tokenA}` },
          body: {
            title: 'Water accumulation in front of school',
            description: 'Leakage from municipal water pipe flooding school entrance.',
            category: 'WATER_LEAKAGE',
            location: { address: 'SV Road, School Gate' },
          },
        })
      );
      targetIssueId = JSON.parse(createRes.body).issueId;
    });

    it('fetches single issue by ID and calculates viewerHasUpvoted accurately', async () => {
      const event = makeEvent({
        method: 'GET',
        path: `/issues/${targetIssueId}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      const res = await handler(event);
      assert.equal(res.statusCode, 200);

      const issue = JSON.parse(res.body);
      assert.equal(issue.issueId, targetIssueId);
      assert.equal(issue.upvoteCount, 0);
      assert.equal(issue.viewerHasUpvoted, false);
      assert.equal(issue.upvotedBy, undefined);
    });

    it('toggles upvote: first upvote increments count to 1, second upvote returns to 0', async () => {
      // 1. Initial State: upvoteCount === 0
      const initial = await handler(
        makeEvent({
          method: 'GET',
          path: `/issues/${targetIssueId}`,
          headers: { authorization: `Bearer ${tokenA}` },
        })
      );
      assert.equal(JSON.parse(initial.body).upvoteCount, 0);

      // 2. First Upvote by Citizen A -> returns { upvoteCount: 1, upvoted: true }
      const upvote1 = await handler(
        makeEvent({
          method: 'POST',
          path: `/issues/${targetIssueId}/upvote`,
          headers: { authorization: `Bearer ${tokenA}` },
        })
      );
      assert.equal(upvote1.statusCode, 200);
      const res1 = JSON.parse(upvote1.body);
      assert.equal(res1.upvoteCount, 1);
      assert.equal(res1.upvoted, true);

      // Verify GET /issues/{id} for Citizen A reflects upvoted status
      const checkA = await handler(
        makeEvent({
          method: 'GET',
          path: `/issues/${targetIssueId}`,
          headers: { authorization: `Bearer ${tokenA}` },
        })
      );
      const parsedCheckA = JSON.parse(checkA.body);
      assert.equal(parsedCheckA.upvoteCount, 1);
      assert.equal(parsedCheckA.viewerHasUpvoted, true);

      // Verify GET /issues/{id} for Citizen B (viewerHasUpvoted must be false)
      const checkB = await handler(
        makeEvent({
          method: 'GET',
          path: `/issues/${targetIssueId}`,
          headers: { authorization: `Bearer ${tokenB}` },
        })
      );
      assert.equal(JSON.parse(checkB.body).viewerHasUpvoted, false);

      // 3. Second Upvote by Citizen A -> Toggles off: returns { upvoteCount: 0, upvoted: false }
      const upvote2 = await handler(
        makeEvent({
          method: 'POST',
          path: `/issues/${targetIssueId}/upvote`,
          headers: { authorization: `Bearer ${tokenA}` },
        })
      );
      assert.equal(upvote2.statusCode, 200);
      const res2 = JSON.parse(upvote2.body);
      assert.equal(res2.upvoteCount, 0);
      assert.equal(res2.upvoted, false);

      // Verify GET /issues/{id} returns to original state
      const checkA2 = await handler(
        makeEvent({
          method: 'GET',
          path: `/issues/${targetIssueId}`,
          headers: { authorization: `Bearer ${tokenA}` },
        })
      );
      const parsedCheckA2 = JSON.parse(checkA2.body);
      assert.equal(parsedCheckA2.upvoteCount, 0);
      assert.equal(parsedCheckA2.viewerHasUpvoted, false);
    });

    it('returns 404 NOT_FOUND when fetching or upvoting non-existent issue', async () => {
      const getRes = await handler(
        makeEvent({
          method: 'GET',
          path: '/issues/iss_nonexistent',
          headers: { authorization: `Bearer ${tokenA}` },
        })
      );
      assert.equal(getRes.statusCode, 404);

      const upvoteRes = await handler(
        makeEvent({
          method: 'POST',
          path: '/issues/iss_nonexistent/upvote',
          headers: { authorization: `Bearer ${tokenA}` },
        })
      );
      assert.equal(upvoteRes.statusCode, 404);
    });
  });
});

