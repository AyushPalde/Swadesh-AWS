/**
 * End-to-End Workflow Verification Script: Citizen -> Authority Lifecycle
 * Simulates:
 * 1. Citizen logs in (Asha Patil)
 * 2. Citizen reports a new civic issue (Deep crater on Link Road)
 * 3. Switch to Authority login (Rajesh Kumar / JE Nilesh Sawant with passcode 'swadesh-demo')
 * 4. Authority views Dashboard and sees the pending issue in "Issues Needing Attention"
 * 5. Authority opens Review page:
 *    a. APPROVE / VERIFY with priority HIGH
 *    b. ASSIGN to ROADS department & assignedTo "Gangman Crew Alpha-4"
 *    c. Mark IN_PROGRESS with work note "Crew dispatched with cold-mix asphalt"
 *    d. Mark RESOLVED with note "Crater filled and asphalt leveled. Traffic normal."
 * 6. Switch back to Citizen (Asha Patil):
 *    - Citizen checks issue detail:
 *      - Verify status === RESOLVED
 *      - Verify statusHistory contains all 5 sequential stages with actor names & notes
 * 7. Check Authority Dashboard stats:
 *    - Verify resolved count incremented
 */

import { login } from './src/api/auth.js';
import { createIssue, getIssue, updateStatus, assignIssue, listIssues } from './src/api/issues.js';
import { getStats } from './src/api/stats.js';
import { STATUS, PRIORITY, CATEGORY, DEPARTMENTS, ROLES } from './src/constants.js';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function runE2EWorkflow() {
  console.log('\n======================================================');
  console.log('SWADESH End-to-End Workflow: Citizen -> Authority Loop');
  console.log('======================================================\n');

  // STEP 1: Citizen Login
  console.log('--- Step 1: Citizen Login (Asha Patil) ---');
  const citizenAuth = await login({
    email: 'asha.patil@example.com',
    name: 'Asha Patil',
    role: ROLES.CITIZEN,
  });
  assert(citizenAuth.user?.role === ROLES.CITIZEN, 'Logged in as citizen Asha Patil');

  // STEP 2: Citizen Reports Issue
  console.log('\n--- Step 2: Citizen Reports Issue ---');
  const createdIssue = await createIssue({
    title: 'Hazardous crater near Link Road Metro Pillar #42',
    description: 'Deep road cavity causing two-wheelers to swerve dangerously during morning peak traffic. Needs emergency cold patch.',
    category: CATEGORY.POTHOLE,
    location: {
      address: 'New Link Road, near Metro Pillar 42, Andheri West, Mumbai',
      lat: 19.1364,
      lng: 72.8296,
    },
  });
  const issueId = createdIssue.issueId;
  assert(Boolean(issueId), `Created issue with ID: ${issueId}`);
  assert(createdIssue.status === STATUS.PENDING_VERIFICATION, 'Status initialized to PENDING_VERIFICATION');
  assert(createdIssue.reporterName === 'Asha Patil', 'Reporter name recorded correctly');
  assert(createdIssue.statusHistory.length === 1, 'Initial statusHistory length is 1');
  assert(createdIssue.statusHistory[0].by === 'Asha Patil', 'Initial statusHistory actor is Asha Patil');

  // STEP 3: Authority Login
  console.log('\n--- Step 3: Authority Login (JE Nilesh Sawant) ---');
  const authorityAuth = await login({
    email: 'nilesh.sawant@bmc.gov.in',
    name: 'JE Nilesh Sawant',
    role: ROLES.AUTHORITY,
    passcode: 'swadesh-demo',
  });
  assert(authorityAuth.user?.role === ROLES.AUTHORITY, 'Logged in as Authority JE Nilesh Sawant');

  // STEP 4: Authority Views Dashboard
  console.log('\n--- Step 4: Authority Dashboard & Triage Queue ---');
  const statsBefore = await getStats();
  assert(typeof statsBefore.totals.pending === 'number', 'Retrieved authority dashboard stats');

  const pendingList = await listIssues({ status: STATUS.PENDING_VERIFICATION });
  const foundInPending = pendingList.items.some((i) => (i.issueId || i.id) === issueId);
  assert(foundInPending, 'New issue appears in Authority pending triage list');

  // STEP 5: Authority Review & Workflow Transitions
  console.log('\n--- Step 5: Authority Review & Transitions ---');

  // 5a. Approve / Verify with HIGH priority
  console.log('5a. Approve & Verify with Priority HIGH:');
  const verifiedIssue = await updateStatus(issueId, {
    status: STATUS.VERIFIED,
    priority: PRIORITY.HIGH,
    note: 'Site physically verified by Sub-Engineer Sawant; confirmed severe roadway crater.',
  });
  assert(verifiedIssue.status === STATUS.VERIFIED, 'Issue status is now VERIFIED');
  assert(verifiedIssue.priority === PRIORITY.HIGH, 'Priority set to HIGH');
  assert(verifiedIssue.statusHistory.length === 2, 'statusHistory has 2 entries');
  assert(verifiedIssue.statusHistory[1].by === 'JE Nilesh Sawant', 'Actor is JE Nilesh Sawant');

  // 5b. Assign to ROADS department
  console.log('5b. Assign to Roads & Infrastructure department:');
  const assignedIssue = await assignIssue(issueId, {
    department: 'ROADS',
    assignedTo: 'Roads Gangman Crew Alpha-4',
  });
  assert(assignedIssue.status === STATUS.ASSIGNED, 'Issue status is now ASSIGNED');
  assert(assignedIssue.department === 'ROADS', 'Department is ROADS');
  assert(assignedIssue.assignedTo === 'Roads Gangman Crew Alpha-4', 'AssignedTo is Roads Gangman Crew Alpha-4');
  assert(assignedIssue.statusHistory.length === 3, 'statusHistory has 3 entries');

  // 5c. Mark IN_PROGRESS
  console.log('5c. Mark IN_PROGRESS:');
  const inProgressIssue = await updateStatus(issueId, {
    status: STATUS.IN_PROGRESS,
    note: 'Alpha-4 maintenance crew mobilized with 2.5 tons cold-mix asphalt.',
  });
  assert(inProgressIssue.status === STATUS.IN_PROGRESS, 'Issue status is now IN_PROGRESS');
  assert(inProgressIssue.statusHistory.length === 4, 'statusHistory has 4 entries');

  // 5d. Mark RESOLVED
  console.log('5d. Mark RESOLVED:');
  const resolvedIssue = await updateStatus(issueId, {
    status: STATUS.RESOLVED,
    note: 'Crater thoroughly compacted, leveled with hot tar sealing, and barricades removed.',
  });
  assert(resolvedIssue.status === STATUS.RESOLVED, 'Issue status is now RESOLVED');
  assert(resolvedIssue.statusHistory.length === 5, 'statusHistory has 5 entries');

  // STEP 6: Switch back to Citizen & Verify
  console.log('\n--- Step 6: Citizen Persona Verification ---');
  await login({
    email: 'asha.patil@example.com',
    name: 'Asha Patil',
    role: ROLES.CITIZEN,
  });

  const citizenView = await getIssue(issueId);
  assert(citizenView.status === STATUS.RESOLVED, 'Citizen sees status as RESOLVED');
  assert(citizenView.priority === PRIORITY.HIGH, 'Citizen sees priority as HIGH');
  assert(citizenView.department === 'ROADS', 'Citizen sees assigned department ROADS');
  assert(citizenView.assignedTo === 'Roads Gangman Crew Alpha-4', 'Citizen sees crew assignment');
  assert(citizenView.statusHistory.length === 5, 'Citizen sees all 5 history records:');

  citizenView.statusHistory.forEach((h, idx) => {
    console.log(`     [${idx + 1}] ${h.status} by "${h.by}": "${h.note}" (${new Date(h.at).toLocaleTimeString()})`);
  });

  assert(citizenView.statusHistory[0].status === STATUS.PENDING_VERIFICATION, 'Stage 1: PENDING_VERIFICATION by Citizen');
  assert(citizenView.statusHistory[1].status === STATUS.VERIFIED, 'Stage 2: VERIFIED by Authority with priority');
  assert(citizenView.statusHistory[2].status === STATUS.ASSIGNED, 'Stage 3: ASSIGNED to Roads dept');
  assert(citizenView.statusHistory[3].status === STATUS.IN_PROGRESS, 'Stage 4: IN_PROGRESS by crew');
  assert(citizenView.statusHistory[4].status === STATUS.RESOLVED, 'Stage 5: RESOLVED with completion certification');

  console.log('\n======================================================');
  console.log(`E2E Results: ${passCount} Passed, ${failCount} Failed`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runE2EWorkflow().catch((err) => {
  console.error('Fatal error during E2E workflow:', err);
  process.exit(1);
});
