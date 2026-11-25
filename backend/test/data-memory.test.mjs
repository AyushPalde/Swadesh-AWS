import './setup.mjs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { getRepo, memoryRepo, dynamoRepo } from '../src/data/index.mjs';
import { generateUserId, resetMemoryStore } from '../src/data/memory.mjs';
import { AppError } from '../src/lib/errors.mjs';

describe('SWADESH Data Layer: In-Memory Implementation & Factory', () => {
  const repo = getRepo('memory');

  beforeEach(() => {
    // Isolate memory store between tests without writing to disk
    resetMemoryStore(true);
  });

  describe('1. Factory getRepo()', () => {
    it('returns memory repository when storeType is "memory"', () => {
      const active = getRepo('memory');
      assert.equal(active, memoryRepo);
    });

    it('returns dynamo repository when storeType is "dynamo"', () => {
      const active = getRepo('dynamo');
      assert.equal(active, dynamoRepo);
    });
  });

  describe('2. User Repository (upsertUser & getUser)', () => {
    it('generates deterministic userId conforming to Blueprint rule', () => {
      // u_ + first 12 hex chars of sha256(lowercase email)
      const userId1 = generateUserId('Asha.Patil@Example.com');
      const userId2 = generateUserId('asha.patil@example.com');
      assert.equal(userId1, userId2);
      assert.match(userId1, /^u_[0-9a-f]{12}$/);
    });

    it('upserts a user and retrieves it by userId', async () => {
      const user = await repo.upsertUser({
        name: 'Asha Patil',
        email: 'asha.patil@example.com',
        role: 'citizen',
      });

      assert.equal(user.name, 'Asha Patil');
      assert.equal(user.email, 'asha.patil@example.com');
      assert.equal(user.role, 'citizen');
      assert.ok(user.createdAt);

      const fetched = await repo.getUser(user.userId);
      assert.deepEqual(fetched, user);
    });

    it('preserves original createdAt when updating an existing user', async () => {
      const original = await repo.upsertUser({
        name: 'Asha Patil',
        email: 'asha.patil@example.com',
        role: 'citizen',
      });

      // Small delay
      const updated = await repo.upsertUser({
        name: 'Asha Patil Updated',
        email: 'asha.patil@example.com',
        role: 'authority',
      });

      assert.equal(updated.userId, original.userId);
      assert.equal(updated.name, 'Asha Patil Updated');
      assert.equal(updated.role, 'authority');
      assert.equal(updated.createdAt, original.createdAt);
    });

    it('returns null for non-existent userId', async () => {
      const user = await repo.getUser('u_nonexistent12');
      assert.equal(user, null);
    });
  });

  describe('3. Issue Repository (createIssue & getIssue)', () => {
    it('creates an issue with upvoteCount: 0 and sanitized fields', async () => {
      const created = await repo.createIssue({
        issueId: 'iss_8f3a1c2b9d04',
        title: 'Deep pothole near Subway',
        description: 'Dangerous road hole on SV Road',
        category: 'POTHOLE',
        location: { address: 'SV Road, Andheri West', lat: 19.1197, lng: 72.8468 },
        status: 'PENDING_VERIFICATION',
        priority: null,
        department: null,
        assignedTo: null,
        reporterId: 'u_1a2b3c4d5e6f',
        reporterName: 'Asha Patil',
        statusHistory: [
          {
            status: 'PENDING_VERIFICATION',
            by: 'Asha Patil',
            note: 'Issue reported',
            at: new Date().toISOString(),
          },
        ],
      });

      assert.equal(created.issueId, 'iss_8f3a1c2b9d04');
      assert.equal(created.upvoteCount, 0);
      assert.equal(created.viewerHasUpvoted, false);
      assert.equal(created.upvotedBy, undefined, 'Internal upvotedBy set is never exposed');

      const fetched = await repo.getIssue('iss_8f3a1c2b9d04', 'u_someone_else');
      assert.equal(fetched.title, 'Deep pothole near Subway');
      assert.equal(fetched.viewerHasUpvoted, false);
    });

    it('returns null for non-existent issueId', async () => {
      const issue = await repo.getIssue('iss_nonexistent');
      assert.equal(issue, null);
    });
  });

  describe('4. Upvote Toggle (toggleUpvote)', () => {
    const issueId = 'iss_upvote_test';
    const userA = 'u_user_aaa111';
    const userB = 'u_user_bbb222';

    beforeEach(async () => {
      await repo.createIssue({
        issueId,
        title: 'Broken streetlight',
        description: 'Dark corner at Juhu beach',
        category: 'STREETLIGHT',
        location: { address: 'Juhu Beach' },
        status: 'PENDING_VERIFICATION',
        reporterId: 'u_reporter1',
        reporterName: 'Citizen',
      });
    });

    it('increments upvoteCount on first call and decrements on second call for same user', async () => {
      // First upvote by User A
      const first = await repo.toggleUpvote(issueId, userA);
      assert.equal(first.upvoteCount, 1);
      assert.equal(first.upvoted, true);

      // Verify viewerHasUpvoted reflects User A's upvote
      const checkA1 = await repo.getIssue(issueId, userA);
      assert.equal(checkA1.viewerHasUpvoted, true);
      assert.equal(checkA1.upvoteCount, 1);

      // User B viewer check (has not upvoted yet)
      const checkB1 = await repo.getIssue(issueId, userB);
      assert.equal(checkB1.viewerHasUpvoted, false);

      // Second toggle by User A -> Removes upvote
      const second = await repo.toggleUpvote(issueId, userA);
      assert.equal(second.upvoteCount, 0);
      assert.equal(second.upvoted, false);

      // Verify viewerHasUpvoted is now false for User A
      const checkA2 = await repo.getIssue(issueId, userA);
      assert.equal(checkA2.viewerHasUpvoted, false);
      assert.equal(checkA2.upvoteCount, 0);
    });

    it('accurately counts upvotes across multiple independent users', async () => {
      // User A upvotes
      await repo.toggleUpvote(issueId, userA);
      // User B upvotes
      const resB = await repo.toggleUpvote(issueId, userB);
      assert.equal(resB.upvoteCount, 2);
      assert.equal(resB.upvoted, true);

      // User A removes upvote
      const resA2 = await repo.toggleUpvote(issueId, userA);
      assert.equal(resA2.upvoteCount, 1);
      assert.equal(resA2.upvoted, false);

      // User B is still upvoted
      const checkB = await repo.getIssue(issueId, userB);
      assert.equal(checkB.viewerHasUpvoted, true);
    });

    it('throws 404 NOT_FOUND when toggling non-existent issue', async () => {
      await assert.rejects(
        () => repo.toggleUpvote('iss_does_not_exist', userA),
        (err) => err instanceof AppError && err.statusCode === 404
      );
    });
  });

  describe('5. Status Transition & Conditional Concurrency (transitionStatus)', () => {
    const issueId = 'iss_transition_test';

    beforeEach(async () => {
      await repo.createIssue({
        issueId,
        title: 'Garbage dump near station',
        description: 'Large waste accumulation blocking road',
        category: 'GARBAGE',
        location: { address: 'Station Rd' },
        status: 'PENDING_VERIFICATION',
        reporterId: 'u_rep1',
        reporterName: 'Reporter 1',
        statusHistory: [
          { status: 'PENDING_VERIFICATION', by: 'Reporter 1', note: 'Reported', at: new Date().toISOString() },
        ],
      });
    });

    it('successfully transitions when fromStatus matches current status', async () => {
      const verified = await repo.transitionStatus(issueId, {
        fromStatus: 'PENDING_VERIFICATION',
        toStatus: 'VERIFIED',
        by: 'JE Nilesh Sawant',
        priority: 'HIGH',
        note: 'Inspected and verified as high priority hazard',
      });

      assert.equal(verified.status, 'VERIFIED');
      assert.equal(verified.priority, 'HIGH');
      assert.equal(verified.statusHistory.length, 2);
      assert.equal(verified.statusHistory[1].status, 'VERIFIED');
      assert.equal(verified.statusHistory[1].by, 'JE Nilesh Sawant');
    });

    it('throws 409 INVALID_TRANSITION when fromStatus does not match (optimistic lock collision)', async () => {
      // 1. Advance issue to VERIFIED
      await repo.transitionStatus(issueId, {
        fromStatus: 'PENDING_VERIFICATION',
        toStatus: 'VERIFIED',
        by: 'Officer 1',
        priority: 'HIGH',
      });

      // 2. Second concurrent authority tries to reject from PENDING_VERIFICATION
      await assert.rejects(
        () =>
          repo.transitionStatus(issueId, {
            fromStatus: 'PENDING_VERIFICATION', // Stale! Current status is already VERIFIED
            toStatus: 'REJECTED',
            by: 'Officer 2',
            note: 'Late rejection attempt',
          }),
        (err) =>
          err instanceof AppError &&
          err.statusCode === 409 &&
          err.code === 'INVALID_TRANSITION' &&
          err.message.includes("expected 'PENDING_VERIFICATION'")
      );
    });

    it('throws 404 NOT_FOUND for non-existent issueId', async () => {
      await assert.rejects(
        () =>
          repo.transitionStatus('iss_missing', {
            fromStatus: 'PENDING_VERIFICATION',
            toStatus: 'VERIFIED',
            by: 'Officer',
          }),
        (err) => err instanceof AppError && err.statusCode === 404
      );
    });
  });

  describe('6. Department Assignment (assignIssue)', () => {
    const issueId = 'iss_assign_test';

    beforeEach(async () => {
      await repo.createIssue({
        issueId,
        title: 'Leaking pipe on Link Rd',
        description: 'Potable water leaking',
        category: 'WATER_LEAKAGE',
        location: { address: 'Link Rd' },
        status: 'PENDING_VERIFICATION',
        reporterId: 'u_rep1',
        reporterName: 'Citizen',
      });
    });

    it('assigns issue only when status is VERIFIED', async () => {
      // Trying to assign while still PENDING_VERIFICATION fails with 409
      await assert.rejects(
        () =>
          repo.assignIssue(issueId, {
            department: 'WATER',
            assignedTo: 'Hydraulics Gangman Team-1',
            by: 'JE Sawant',
          }),
        (err) =>
          err instanceof AppError &&
          err.statusCode === 409 &&
          err.message.includes('must be in VERIFIED status')
      );

      // Verify the issue first
      await repo.transitionStatus(issueId, {
        fromStatus: 'PENDING_VERIFICATION',
        toStatus: 'VERIFIED',
        by: 'JE Sawant',
        priority: 'MEDIUM',
      });

      // Now assignment succeeds
      const assigned = await repo.assignIssue(issueId, {
        department: 'WATER',
        assignedTo: 'Hydraulics Gangman Team-1',
        by: 'JE Sawant',
      });

      assert.equal(assigned.status, 'ASSIGNED');
      assert.equal(assigned.department, 'WATER');
      assert.equal(assigned.assignedTo, 'Hydraulics Gangman Team-1');
      assert.equal(assigned.statusHistory.length, 2);
      assert.equal(assigned.statusHistory[1].status, 'ASSIGNED');
    });
  });

  describe('7. Querying, Filtering & Pagination (listIssues)', () => {
    beforeEach(async () => {
      // Seed 5 test issues with different timestamps and categories
      const issues = [
        {
          issueId: 'iss_1',
          title: 'Pothole 1',
          category: 'POTHOLE',
          status: 'PENDING_VERIFICATION',
          reporterId: 'u_user_1',
          createdAt: '2026-10-28T10:00:00Z',
          upvoteCount: 5,
        },
        {
          issueId: 'iss_2',
          title: 'Pothole 2',
          category: 'POTHOLE',
          status: 'VERIFIED',
          reporterId: 'u_user_1',
          createdAt: '2026-10-28T11:00:00Z',
          upvoteCount: 15,
        },
        {
          issueId: 'iss_3',
          title: 'Garbage 1',
          category: 'GARBAGE',
          status: 'PENDING_VERIFICATION',
          reporterId: 'u_user_2',
          createdAt: '2026-10-28T12:00:00Z',
          upvoteCount: 2,
        },
        {
          issueId: 'iss_4',
          title: 'Streetlight 1',
          category: 'STREETLIGHT',
          status: 'RESOLVED',
          reporterId: 'u_user_2',
          createdAt: '2026-10-28T13:00:00Z',
          upvoteCount: 20,
        },
      ];

      for (const i of issues) {
        await repo.createIssue({
          ...i,
          description: 'Test description long enough',
          location: { address: 'Test address' },
          reporterName: 'Reporter',
        });
      }
    });

    it('filters by status', async () => {
      const res = await repo.listIssues({ status: 'PENDING_VERIFICATION' });
      assert.equal(res.items.length, 2);
      assert.ok(res.items.every((i) => i.status === 'PENDING_VERIFICATION'));
    });

    it('filters by category', async () => {
      const res = await repo.listIssues({ category: 'POTHOLE' });
      assert.equal(res.items.length, 2);
      assert.ok(res.items.every((i) => i.category === 'POTHOLE'));
    });

    it('filters by reporterId', async () => {
      const res = await repo.listIssues({ reporterId: 'u_user_1' });
      assert.equal(res.items.length, 2);
      assert.ok(res.items.every((i) => i.reporterId === 'u_user_1'));
    });

    it('sorts by top (highest upvoteCount first)', async () => {
      const res = await repo.listIssues({ sort: 'top' });
      assert.equal(res.items[0].issueId, 'iss_4'); // 20 upvotes
      assert.equal(res.items[1].issueId, 'iss_2'); // 15 upvotes
      assert.equal(res.items[2].issueId, 'iss_1'); // 5 upvotes
      assert.equal(res.items[3].issueId, 'iss_3'); // 2 upvotes
    });

    it('paginates using limit and cursor', async () => {
      const page1 = await repo.listIssues({ limit: 2 });
      assert.equal(page1.items.length, 2);
      assert.ok(page1.nextCursor);

      const page2 = await repo.listIssues({ limit: 2, cursor: page1.nextCursor });
      assert.equal(page2.items.length, 2);
      assert.notEqual(page1.items[0].issueId, page2.items[0].issueId);
    });
  });

  describe('8. Administrative Metrics (getStats)', () => {
    it('computes complete Blueprint stats shape', async () => {
      await repo.createIssue({
        issueId: 'iss_stat_1',
        title: 'Pothole A',
        description: 'Test pothole',
        category: 'POTHOLE',
        status: 'PENDING_VERIFICATION',
        location: { address: 'SV Rd' },
      });

      await repo.createIssue({
        issueId: 'iss_stat_2',
        title: 'Garbage B',
        description: 'Test garbage',
        category: 'GARBAGE',
        status: 'RESOLVED',
        department: 'SANITATION',
        location: { address: 'Link Rd' },
      });

      const stats = await repo.getStats();
      assert.equal(stats.totals.total, 2);
      assert.equal(stats.totals.pending, 1);
      assert.equal(stats.totals.resolved, 1);
      assert.equal(stats.byCategory.POTHOLE, 1);
      assert.equal(stats.byCategory.GARBAGE, 1);
      assert.equal(stats.byDepartment.SANITATION, 1);
    });
  });
});
