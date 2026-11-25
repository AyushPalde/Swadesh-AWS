/**
 * Verification Test Suite for SWADESH Mock Backend Layer
 * Validates Blueprint status transitions, auth, validation, and upvoting rules.
 * Run with: node test-mock-api.js
 */

import {
  listIssues,
  getIssue,
  createIssue,
  toggleUpvote,
  updateStatus,
  assignIssue,
} from './src/mock/mockIssues.js';
import { login } from './src/mock/mockAuth.js';
import { getStats } from './src/mock/mockStats.js';
import { setCurrentUser } from './src/mock/mockStore.js';
import { STATUS, PRIORITY, CATEGORY, DEPARTMENTS, ROLES } from './src/constants.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAILED: ${message}`);
  }
}

async function assertThrows(fn, expectedCode, expectedStatus, message) {
  try {
    await fn();
    failed++;
    console.error(`  ✗ FAILED: Expected error [${expectedCode}], but function succeeded: ${message}`);
  } catch (err) {
    if (err.code === expectedCode && (!expectedStatus || err.status === expectedStatus)) {
      passed++;
      console.log(`  ✓ Threw expected [${err.code} ${err.status}]: ${message}`);
    } else {
      failed++;
      console.error(
        `  ✗ FAILED: Expected [${expectedCode} ${expectedStatus}], got [${err.code} ${err.status}]: ${err.message}`
      );
    }
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('SWADESH Mock API & State Machine Verification Suite');
  console.log('Single Source of Truth: docs/BLUEPRINT.md');
  console.log('======================================================\n');

  // Test 1: Seed Issues & Listing
  console.log('1. Issues Listing & Querying:');
  const initial = await listIssues({ limit: 50 });
  assert(initial.items.length >= 14, `Initial seed issues loaded: ${initial.items.length} issues`);

  const potholes = await listIssues({ category: CATEGORY.POTHOLE });
  assert(potholes.items.every((i) => i.category === CATEGORY.POTHOLE), 'Category filtering by POTHOLE works');

  // Test 2: Auth & Role Validation
  console.log('\n2. Authentication & Passcode Enforcement:');
  const citizenLogin = await login({
    name: 'Ramesh Citizen',
    email: 'ramesh.citizen@example.in',
    role: ROLES.CITIZEN,
  });
  assert(citizenLogin.user.role === ROLES.CITIZEN, 'Citizen login succeeds without passcode');
  assert(citizenLogin.user.userId.startsWith('u_'), `Generated deterministic userId: ${citizenLogin.user.userId}`);

  await assertThrows(
    () =>
      login({
        name: 'Impostor Officer',
        email: 'fake.officer@mumbai.gov.in',
        role: ROLES.AUTHORITY,
        passcode: 'WRONG-PASSCODE',
      }),
    'UNAUTHORIZED',
    401,
    'Authority login fails with invalid passcode'
  );

  const authorityLogin = await login({
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@swadesh.gov.in',
    role: ROLES.AUTHORITY,
    passcode: 'SWADESH-OFFICER-2026',
  });
  assert(authorityLogin.user.role === ROLES.AUTHORITY, 'Authority login succeeds with valid passcode');

  // Test 3: Issue Creation Validation
  console.log('\n3. Issue Creation Validation (Citizen Persona):');
  setCurrentUser(citizenLogin.user, citizenLogin.token);

  await assertThrows(
    () => createIssue({ title: 'Bad', description: 'Too short', category: CATEGORY.POTHOLE, location: {} }),
    'VALIDATION_ERROR',
    400,
    'createIssue validates minimum title length (5 chars) and description length (10 chars)'
  );

  const newIssue = await createIssue({
    title: 'Damaged storm drain cover on 100 Feet Road',
    description: 'Pedestrians can fall into the opening during rainstorms.',
    category: CATEGORY.DRAINAGE,
    location: { address: '100 Feet Road, Indiranagar, Bengaluru', lat: 12.9716, lng: 77.6412 },
  });
  assert(newIssue.status === STATUS.PENDING_VERIFICATION, 'New issue is initialized with PENDING_VERIFICATION');
  assert(newIssue.priority === null, 'New issue has null priority');
  assert(newIssue.reporterName === 'Ramesh Citizen', 'New issue stores reporter name');
  assert(newIssue.statusHistory.length === 1, 'Initial statusHistory entry created');

  // Test 4: Upvote Toggling
  console.log('\n4. Upvote Toggle Logic:');
  const upvoteRes1 = await toggleUpvote(newIssue.issueId);
  assert(upvoteRes1.upvoted === true && upvoteRes1.upvoteCount === 1, 'First upvote increments counter to 1 and upvoted=true');

  const upvoteRes2 = await toggleUpvote(newIssue.issueId);
  assert(upvoteRes2.upvoted === false && upvoteRes2.upvoteCount === 0, 'Second upvote toggles off counter to 0 and upvoted=false');

  // Test 5: Role-based Access for Authority Endpoints
  console.log('\n5. Role-based Access Control:');
  setCurrentUser(citizenLogin.user, citizenLogin.token); // Still Citizen

  await assertThrows(
    () => updateStatus(newIssue.issueId, { status: STATUS.VERIFIED, priority: PRIORITY.HIGH }),
    'FORBIDDEN',
    403,
    'Citizen cannot call updateStatus (requires authority role)'
  );

  await assertThrows(
    () => assignIssue(newIssue.issueId, { department: 'ROADS', assignedTo: 'Team A' }),
    'FORBIDDEN',
    403,
    'Citizen cannot call assignIssue (requires authority role)'
  );

  await assertThrows(
    () => getStats(),
    'FORBIDDEN',
    403,
    'Citizen cannot call getStats (requires authority role)'
  );

  // Switch to Authority Officer
  setCurrentUser(authorityLogin.user, authorityLogin.token);

  // Test 6: Workflow Transitions State Machine (BLUEPRINT.md Section 3)
  console.log('\n6. Workflow Status Transition Rules (Authority Persona):');

  // Rule 6.1: PENDING_VERIFICATION -> VERIFIED requires priority
  await assertThrows(
    () => updateStatus(newIssue.issueId, { status: STATUS.VERIFIED }),
    'VALIDATION_ERROR',
    400,
    'PENDING_VERIFICATION -> VERIFIED requires priority'
  );

  // Rule 6.2: Invalid skip PENDING_VERIFICATION -> RESOLVED
  await assertThrows(
    () => updateStatus(newIssue.issueId, { status: STATUS.RESOLVED, note: 'Skipping steps' }),
    'INVALID_TRANSITION',
    409,
    'PENDING_VERIFICATION -> RESOLVED is disallowed'
  );

  // Rule 6.3: Valid PENDING_VERIFICATION -> VERIFIED
  const verified = await updateStatus(newIssue.issueId, {
    status: STATUS.VERIFIED,
    priority: PRIORITY.HIGH,
  });
  assert(verified.status === STATUS.VERIFIED && verified.priority === PRIORITY.HIGH, 'PENDING_VERIFICATION -> VERIFIED succeeds with priority');

  // Rule 6.4: VERIFIED -> ASSIGNED is ONLY allowed via POST /issues/{id}/assign
  await assertThrows(
    () => updateStatus(newIssue.issueId, { status: STATUS.ASSIGNED }),
    'INVALID_TRANSITION',
    409,
    'Direct status transition to ASSIGNED via updateStatus is blocked (must use assignIssue)'
  );

  // Rule 6.5: assignIssue validates department and assignedTo
  await assertThrows(
    () => assignIssue(newIssue.issueId, { department: 'INVALID_DEPT', assignedTo: 'Team' }),
    'VALIDATION_ERROR',
    400,
    'assignIssue validates valid department enum'
  );

  // Rule 6.6: Valid assignIssue
  const assigned = await assignIssue(newIssue.issueId, {
    department: 'WATER',
    assignedTo: 'Bengaluru BWSSB Drainage Crew 12',
  });
  assert(assigned.status === STATUS.ASSIGNED, 'assignIssue transitions issue to ASSIGNED');
  assert(assigned.department === 'WATER', 'Department set to WATER');
  assert(assigned.assignedTo === 'Bengaluru BWSSB Drainage Crew 12', 'AssignedTo field updated');

  // Rule 6.7: ASSIGNED -> IN_PROGRESS
  const inProgress = await updateStatus(newIssue.issueId, {
    status: STATUS.IN_PROGRESS,
    note: 'Crew arrived at Indiranagar with suction machine',
  });
  assert(inProgress.status === STATUS.IN_PROGRESS, 'ASSIGNED -> IN_PROGRESS succeeds');

  // Rule 6.8: IN_PROGRESS -> RESOLVED requires a note
  await assertThrows(
    () => updateStatus(newIssue.issueId, { status: STATUS.RESOLVED }),
    'VALIDATION_ERROR',
    400,
    'IN_PROGRESS -> RESOLVED requires a resolution note'
  );

  // Rule 6.9: Valid IN_PROGRESS -> RESOLVED
  const resolved = await updateStatus(newIssue.issueId, {
    status: STATUS.RESOLVED,
    note: 'New cast-iron drain grill anchored with concrete surround. Tested and cleared.',
  });
  assert(resolved.status === STATUS.RESOLVED, 'IN_PROGRESS -> RESOLVED succeeds with resolution note');
  assert(resolved.statusHistory.length === 5, 'Every transition appended to statusHistory (length 5)');

  // Rule 6.10: RESOLVED is final (terminal state)
  await assertThrows(
    () => updateStatus(newIssue.issueId, { status: STATUS.IN_PROGRESS, note: 'Reopen' }),
    'INVALID_TRANSITION',
    409,
    'Terminal RESOLVED state cannot transition'
  );

  // Test 7: PENDING_VERIFICATION -> REJECTED requires note & is final
  console.log('\n7. Rejection Flow Validation:');
  const rejectableIssue = await createIssue({
    title: 'Private building lobby painting request',
    description: 'Please paint our society building staircase.',
    category: CATEGORY.OTHER,
    location: { address: 'Private Society, Mumbai', lat: 19.0, lng: 72.8 },
  });

  await assertThrows(
    () => updateStatus(rejectableIssue.issueId, { status: STATUS.REJECTED }),
    'VALIDATION_ERROR',
    400,
    'PENDING_VERIFICATION -> REJECTED requires a rejection note'
  );

  const rejected = await updateStatus(rejectableIssue.issueId, {
    status: STATUS.REJECTED,
    note: 'Private residential property outside municipal jurisdiction.',
  });
  assert(rejected.status === STATUS.REJECTED, 'PENDING_VERIFICATION -> REJECTED succeeds with note');

  await assertThrows(
    () => updateStatus(rejectableIssue.issueId, { status: STATUS.VERIFIED, priority: PRIORITY.LOW }),
    'INVALID_TRANSITION',
    409,
    'Terminal REJECTED state cannot transition'
  );

  // Test 8: Authority Stats API
  console.log('\n8. Authority Dashboard Stats API:');
  const stats = await getStats();
  assert(typeof stats.totals.total === 'number' && stats.totals.total >= 15, `getStats returns valid totals (count: ${stats.totals.total})`);
  assert(typeof stats.byStatus[STATUS.RESOLVED] === 'number', 'byStatus contains RESOLVED count');
  assert(typeof stats.byCategory[CATEGORY.POTHOLE] === 'number', 'byCategory contains POTHOLE count');
  assert(typeof stats.byDepartment.ROADS === 'number', 'byDepartment contains ROADS count');

  console.log('\n======================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

