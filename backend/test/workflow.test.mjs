/**
 * Exhaustive Unit Tests for SWADESH Workflow State Machine (workflow.mjs)
 * Single Source of Truth: docs/BLUEPRINT.md (Section 3)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS,
  STATUS_LABELS,
  PRIORITY,
  DEPARTMENTS,
  ALLOWED_TRANSITIONS,
  getAllowedTransitions,
  canTransition,
} from '../src/lib/workflow.mjs';

describe('SWADESH Workflow State Machine (workflow.mjs)', () => {
  const ALL_STATUSES = [
    STATUS.PENDING_VERIFICATION,
    STATUS.VERIFIED,
    STATUS.ASSIGNED,
    STATUS.IN_PROGRESS,
    STATUS.RESOLVED,
    STATUS.REJECTED,
  ];

  describe('1. Constants and Enums', () => {
    it('defines all 6 statuses from Blueprint', () => {
      assert.deepEqual(Object.keys(STATUS), [
        'PENDING_VERIFICATION',
        'VERIFIED',
        'ASSIGNED',
        'IN_PROGRESS',
        'RESOLVED',
        'REJECTED',
      ]);
    });

    it('defines user-friendly labels for each status', () => {
      for (const s of ALL_STATUSES) {
        assert.ok(STATUS_LABELS[s], `Missing label for ${s}`);
      }
    });

    it('defines priorities (LOW, MEDIUM, HIGH)', () => {
      assert.deepEqual(PRIORITY, {
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
      });
    });

    it('defines all 5 Blueprint municipal departments', () => {
      assert.equal(DEPARTMENTS.ROADS, 'Roads & Infrastructure');
      assert.equal(DEPARTMENTS.SANITATION, 'Sanitation & Waste');
      assert.equal(DEPARTMENTS.ELECTRICAL, 'Street Lighting & Electrical');
      assert.equal(DEPARTMENTS.WATER, 'Water Supply & Drainage');
      assert.equal(DEPARTMENTS.PARKS, 'Parks & Public Spaces');
    });
  });

  describe('2. getAllowedTransitions(from)', () => {
    it('PENDING_VERIFICATION allows transition to VERIFIED and REJECTED', () => {
      const allowed = getAllowedTransitions(STATUS.PENDING_VERIFICATION);
      assert.deepEqual(allowed, [STATUS.VERIFIED, STATUS.REJECTED]);
    });

    it('VERIFIED allows transition ONLY to ASSIGNED', () => {
      const allowed = getAllowedTransitions(STATUS.VERIFIED);
      assert.deepEqual(allowed, [STATUS.ASSIGNED]);
    });

    it('ASSIGNED allows transition ONLY to IN_PROGRESS', () => {
      const allowed = getAllowedTransitions(STATUS.ASSIGNED);
      assert.deepEqual(allowed, [STATUS.IN_PROGRESS]);
    });

    it('IN_PROGRESS allows transition ONLY to RESOLVED', () => {
      const allowed = getAllowedTransitions(STATUS.IN_PROGRESS);
      assert.deepEqual(allowed, [STATUS.RESOLVED]);
    });

    it('RESOLVED is terminal (returns empty array)', () => {
      const allowed = getAllowedTransitions(STATUS.RESOLVED);
      assert.deepEqual(allowed, []);
    });

    it('REJECTED is terminal (returns empty array)', () => {
      const allowed = getAllowedTransitions(STATUS.REJECTED);
      assert.deepEqual(allowed, []);
    });

    it('returns empty array for invalid, missing, or unknown status strings', () => {
      assert.deepEqual(getAllowedTransitions('UNKNOWN_STATUS'), []);
      assert.deepEqual(getAllowedTransitions(null), []);
      assert.deepEqual(getAllowedTransitions(undefined), []);
      assert.deepEqual(getAllowedTransitions(123), []);
      assert.deepEqual(getAllowedTransitions({}), []);
    });

    it('returns a fresh copy of the array so caller mutations do not alter internal state', () => {
      const allowed1 = getAllowedTransitions(STATUS.PENDING_VERIFICATION);
      allowed1.push('HACKED');
      const allowed2 = getAllowedTransitions(STATUS.PENDING_VERIFICATION);
      assert.deepEqual(allowed2, [STATUS.VERIFIED, STATUS.REJECTED]);
    });
  });

  describe('3. canTransition(from, to) - Exhaustive 6x6 State Matrix', () => {
    // Blueprint allowed transitions:
    // PENDING_VERIFICATION -> VERIFIED
    // PENDING_VERIFICATION -> REJECTED
    // VERIFIED             -> ASSIGNED
    // ASSIGNED             -> IN_PROGRESS
    // IN_PROGRESS          -> RESOLVED

    const validPairs = new Set([
      `${STATUS.PENDING_VERIFICATION}->${STATUS.VERIFIED}`,
      `${STATUS.PENDING_VERIFICATION}->${STATUS.REJECTED}`,
      `${STATUS.VERIFIED}->${STATUS.ASSIGNED}`,
      `${STATUS.ASSIGNED}->${STATUS.IN_PROGRESS}`,
      `${STATUS.IN_PROGRESS}->${STATUS.RESOLVED}`,
    ]);

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const pair = `${from}->${to}`;
        const shouldBeAllowed = validPairs.has(pair);

        it(`transition ${pair} -> ${shouldBeAllowed}`, () => {
          assert.equal(
            canTransition(from, to),
            shouldBeAllowed,
            `Expected canTransition(${from}, ${to}) to be ${shouldBeAllowed}`
          );
        });
      }
    }
  });

  describe('4. canTransition(from, to) - Edge Cases & Malicious Inputs', () => {
    it('rejects self-transitions (e.g. VERIFIED -> VERIFIED)', () => {
      for (const s of ALL_STATUSES) {
        assert.equal(canTransition(s, s), false, `Self transition for ${s} should be false`);
      }
    });

    it('rejects backwards transitions (e.g. RESOLVED -> IN_PROGRESS)', () => {
      assert.equal(canTransition(STATUS.RESOLVED, STATUS.IN_PROGRESS), false);
      assert.equal(canTransition(STATUS.IN_PROGRESS, STATUS.ASSIGNED), false);
      assert.equal(canTransition(STATUS.ASSIGNED, STATUS.VERIFIED), false);
      assert.equal(canTransition(STATUS.VERIFIED, STATUS.PENDING_VERIFICATION), false);
    });

    it('rejects skip transitions (e.g. PENDING_VERIFICATION -> RESOLVED)', () => {
      assert.equal(canTransition(STATUS.PENDING_VERIFICATION, STATUS.IN_PROGRESS), false);
      assert.equal(canTransition(STATUS.PENDING_VERIFICATION, STATUS.RESOLVED), false);
      assert.equal(canTransition(STATUS.VERIFIED, STATUS.RESOLVED), false);
    });

    it('rejects any transition from terminal states', () => {
      for (const s of ALL_STATUSES) {
        assert.equal(canTransition(STATUS.RESOLVED, s), false);
        assert.equal(canTransition(STATUS.REJECTED, s), false);
      }
    });

    it('rejects null, undefined, non-string, or unknown values', () => {
      assert.equal(canTransition(null, STATUS.VERIFIED), false);
      assert.equal(canTransition(STATUS.PENDING_VERIFICATION, null), false);
      assert.equal(canTransition(undefined, undefined), false);
      assert.equal(canTransition('', STATUS.VERIFIED), false);
      assert.equal(canTransition(STATUS.PENDING_VERIFICATION, ''), false);
      assert.equal(canTransition('UNKNOWN', STATUS.VERIFIED), false);
      assert.equal(canTransition(STATUS.PENDING_VERIFICATION, 'UNKNOWN'), false);
      assert.equal(canTransition(123, 456), false);
      assert.equal(canTransition({}, {}), false);
    });
  });
});

