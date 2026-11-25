/**
 * SWADESH Public API Seeder Script
 *
 * Populates realistic sample data across Mumbai municipal wards.
 * Uses ONLY the public REST HTTP API (no AWS credentials or internal imports required),
 * making it 100% compatible with both local development servers (http://localhost:3001)
 * and deployed cloud AWS API Gateway endpoints.
 *
 * Config:
 * - API_BASE_URL: Target endpoint (defaults to http://localhost:3001)
 * - AUTHORITY_PASSCODE: Passcode for authority accounts (defaults to 'swadesh-demo')
 *
 * Usage:
 *   node scripts/seed.mjs
 *   API_BASE_URL=https://api.example.com AUTHORITY_PASSCODE=prod-pass node scripts/seed.mjs
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const AUTHORITY_PASSCODE = process.env.AUTHORITY_PASSCODE || 'swadesh-demo';

/**
 * Generic JSON API caller wrapper.
 *
 * @param {string} endpoint
 * @param {'GET' | 'POST' | 'PATCH'} method
 * @param {Object} [body]
 * @param {string} [token]
 * @returns {Promise<any>}
 */
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const errorMsg = json?.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`${method} ${endpoint} failed (${response.status}): ${errorMsg}`);
  }

  return json;
}

// Persona Definitions
const CITIZENS = [
  { name: 'Asha Patil', email: 'asha.patil@example.com', role: 'citizen' },
  { name: 'Rahul Sharma', email: 'rahul.sharma@example.com', role: 'citizen' },
  { name: 'Priya Nair', email: 'priya.nair@example.com', role: 'citizen' },
  { name: 'Amit Verma', email: 'amit.verma@example.com', role: 'citizen' },
  { name: 'Vikram Deshmukh', email: 'vikram.d@example.com', role: 'citizen' },
  { name: 'Sunita Rao', email: 'sunita.rao@example.com', role: 'citizen' },
];

const AUTHORITIES = [
  {
    name: 'JE Nilesh Sawant',
    email: 'nilesh.sawant@mcgm.gov.in',
    role: 'authority',
    passcode: AUTHORITY_PASSCODE,
  },
  {
    name: 'EE Rajesh Kulkarni',
    email: 'rajesh.kulkarni@mcgm.gov.in',
    role: 'authority',
    passcode: AUTHORITY_PASSCODE,
  },
];

// 20 Realistic Civic Grievances across Mumbai Municipal Wards
const SEED_ISSUES = [
  {
    title: 'Deep crater outside Andheri Subway entrance',
    description:
      'Continuous monsoon seepage has carved a 4-foot wide crater right at the subway descent. Two two-wheelers have skidded here during peak evening hours.',
    category: 'POTHOLE',
    location: { address: 'SV Road near Andheri Subway, Andheri West, Mumbai', lat: 19.1197, lng: 72.8464 },
    reporterIndex: 0,
    targetWorkflow: 'RESOLVED',
    priority: 'HIGH',
    department: 'ROADS',
    assignedTo: 'Roads Gangman Crew Alpha-4',
    progressNote: 'Cold-mix asphalt batch dispatched with vibrating plate compactor.',
    resolveNote: 'Crater thoroughly filled with hot bitumen mix, compacted to road grade, and barricades cleared.',
    upvoters: [1, 2, 3, 4, 5],
  },
  {
    title: 'Overflowing community dumpster near Dadar vegetable market',
    description:
      'Refuse container overflowing onto the public walkway for 3 days. Rotting organic garbage is causing acute stench and attracting stray cattle.',
    category: 'GARBAGE',
    location: { address: 'Senapati Bapat Marg opposite Phool Galli, Dadar West', lat: 19.0178, lng: 72.8428 },
    reporterIndex: 1,
    targetWorkflow: 'IN_PROGRESS',
    priority: 'HIGH',
    department: 'SANITATION',
    assignedTo: 'Ward G-North Solid Waste Team-2',
    progressNote: 'Mechanical refuse compactor truck deployed for perimeter clearing.',
    upvoters: [0, 2, 3],
  },
  {
    title: 'Dysfunctional high-mast streetlights on promenade',
    description:
      'A continuous 300-meter stretch of the seaside promenade has been pitch dark since Tuesday due to a burnt junction box.',
    category: 'STREETLIGHT',
    location: { address: 'Carter Road Promenade, Bandra West, Mumbai', lat: 19.0667, lng: 72.8258 },
    reporterIndex: 2,
    targetWorkflow: 'ASSIGNED',
    priority: 'MEDIUM',
    department: 'ELECTRICAL',
    assignedTo: 'Lineman Unit 3 (BEST)',
    upvoters: [0, 1, 4],
  },
  {
    title: 'Potable water main fracture flooding service carriageway',
    description:
      'Treated drinking water pipeline rupture gushing gallons across the northbound service road. Clean drinking water being wasted.',
    category: 'WATER_LEAKAGE',
    location: { address: 'Western Express Highway near Domestic Airport, Vile Parle East', lat: 19.0998, lng: 72.8532 },
    reporterIndex: 3,
    targetWorkflow: 'IN_PROGRESS',
    priority: 'HIGH',
    department: 'WATER',
    assignedTo: 'Hydraulic Rapid Response Crew',
    progressNote: 'Main isolation valve turned off; trench excavation underway to clamp rupture.',
    upvoters: [0, 1, 2, 4, 5],
  },
  {
    title: 'Knee-deep waterlogging due to choked stormwater drain',
    description:
      'Accumulated plastic packaging and heavy silt clogging stormwater grating, submerging bus stop walkway under 1.5 feet of stagnant water.',
    category: 'DRAINAGE',
    location: { address: 'Hindmata Cinema Junction, Dadar / Parel, Mumbai', lat: 19.0062, lng: 72.8415 },
    reporterIndex: 4,
    targetWorkflow: 'RESOLVED',
    priority: 'HIGH',
    department: 'WATER',
    assignedTo: 'Stormwater Maintenance Gang-7',
    progressNote: 'Suction jetting machine mobilized to dislodge plastic blockages.',
    resolveNote: 'Grates completely cleared, silt dredged, and stormwater gravity flow restored.',
    upvoters: [0, 1, 3],
  },
  {
    title: 'Open telecom duct inspection chamber without cover',
    description:
      'Uncovered 5-foot concrete telecom duct left gaping directly on busy pedestrian route. Extreme hazard for school children and senior citizens.',
    category: 'OTHER',
    location: { address: 'Linking Road near Khar Telephone Exchange, Khar West', lat: 19.0688, lng: 72.8339 },
    reporterIndex: 5,
    targetWorkflow: 'VERIFIED',
    priority: 'HIGH',
    upvoters: [0, 1, 2],
  },
  {
    title: 'Severe road surface disintegration near railway station',
    description:
      'Top asphalt layer completely washed out, exposing jagged ballast stones that pierce tire tubes during auto-rickshaw transit.',
    category: 'POTHOLE',
    location: { address: 'Station Road outside Kurla West Railway Station', lat: 19.0657, lng: 72.8793 },
    reporterIndex: 0,
    targetWorkflow: 'ASSIGNED',
    priority: 'MEDIUM',
    department: 'ROADS',
    assignedTo: 'Kurla Ward Road Patch Gang-1',
    upvoters: [2, 3, 4],
  },
  {
    title: 'Accumulated plastic litter choking mangrove coastline',
    description:
      'Large quantities of single-use bottles and thermocol packing stranded in coastal mangrove roots following high tide.',
    category: 'GARBAGE',
    location: { address: 'Mahim Bay shoreline near Mahim Fort, Mahim', lat: 19.0435, lng: 72.8406 },
    reporterIndex: 1,
    targetWorkflow: 'PENDING_VERIFICATION',
    upvoters: [0, 2],
  },
  {
    title: 'Completely unlit pedestrian foot-overbridge staircase',
    description:
      'Stairwell light fixtures shattered, leaving railway overbridge descent in total darkness at night. Safety concern for women commuters.',
    category: 'STREETLIGHT',
    location: { address: 'Marine Lines Station South Foot-Overbridge, Marine Lines', lat: 18.9442, lng: 72.8256 },
    reporterIndex: 2,
    targetWorkflow: 'RESOLVED',
    priority: 'HIGH',
    department: 'ELECTRICAL',
    assignedTo: 'C-Ward Electrical Maintenance Crew',
    progressNote: 'Vandal-proof polycarbonate LED fittings brought to site.',
    resolveNote: 'Fittings installed, tested, and stairwell brightness brought to standard lux.',
    upvoters: [0, 1, 3, 4],
  },
  {
    title: 'Underground domestic water line emitting sewage odor',
    description:
      'Tap water received in residential building has brownish discoloration and foul smell, indicating cross-contamination from adjacent sewer.',
    category: 'WATER_LEAKAGE',
    location: { address: 'Sector 17 Market Colony, Vashi, Navi Mumbai', lat: 19.0771, lng: 72.9986 },
    reporterIndex: 3,
    targetWorkflow: 'IN_PROGRESS',
    priority: 'HIGH',
    department: 'WATER',
    assignedTo: 'Water Quality Inspection Team Alpha',
    progressNote: 'Water samples sent to municipal lab; pressure testing feeder pipeline.',
    upvoters: [1, 4, 5],
  },
  {
    title: 'Gutter silt overflow blocking building entrance driveway',
    description:
      'Black sludge from pre-monsoon gutter desilting dumped onto footpath and left baking under sun, now blocking residential entry.',
    category: 'DRAINAGE',
    location: { address: 'LBS Marg near Ghatkopar Fire Station, Ghatkopar West', lat: 19.0860, lng: 72.9090 },
    reporterIndex: 4,
    targetWorkflow: 'ASSIGNED',
    priority: 'LOW',
    department: 'WATER',
    assignedTo: 'N-Ward Desilting Contractor Crew',
    upvoters: [0],
  },
  {
    title: 'Heavy banyan tree branch cracked and dangling over road',
    description:
      'Severe monsoon thunderstorm cracked large upper banyan bough. It is hanging by fibers over active vehicular traffic.',
    category: 'OTHER',
    location: { address: 'Shivaji Park Outer Ring Road, Dadar West', lat: 19.0270, lng: 72.8385 },
    reporterIndex: 5,
    targetWorkflow: 'IN_PROGRESS',
    priority: 'HIGH',
    department: 'PARKS',
    assignedTo: 'Garden Dept Emergency Tree Pruning Unit',
    progressNote: 'Hydraulic cherry picker and chainsaw team on site with traffic wardens.',
    upvoters: [0, 1, 2, 3],
  },
  {
    title: 'Multiple deep potholes on flyover descent curve',
    description:
      'Series of 3 deep potholes on the sharp curve descending towards Sion Circle. Bumping vehicles dangerously near the concrete crash barrier.',
    category: 'POTHOLE',
    location: { address: 'Sion Flyover Southbound Ramp, Sion, Mumbai', lat: 19.0402, lng: 72.8634 },
    reporterIndex: 0,
    targetWorkflow: 'VERIFIED',
    priority: 'HIGH',
    upvoters: [1, 2, 4],
  },
  {
    title: 'Demolition rubble and concrete debris dumped on green verge',
    description:
      'Commercial dumpers dumping plaster rubble and brick fragments overnight along highway median divider.',
    category: 'GARBAGE',
    location: { address: 'Eastern Express Highway near Amar Mahal Junction, Chembur', lat: 19.0622, lng: 72.8994 },
    reporterIndex: 1,
    targetWorkflow: 'PENDING_VERIFICATION',
    upvoters: [0, 3],
  },
  {
    title: 'Flickering sodium street lamp strobing erratically',
    description:
      'High-pressure sodium lamp cycling on and off every 10 seconds, causing disorientation for drivers approaching intersection.',
    category: 'STREETLIGHT',
    location: { address: 'Juhu Tara Road near Sea Princess Hotel, Juhu', lat: 19.0988, lng: 72.8267 },
    reporterIndex: 2,
    targetWorkflow: 'PENDING_VERIFICATION',
    upvoters: [4],
  },
  {
    title: 'Roadside water pipeline spurting fountain onto footpath',
    description:
      'Perforated pipeline pipe joint spraying a continuous 2-foot fountain across the pavement outside grocery store.',
    category: 'WATER_LEAKAGE',
    location: { address: 'Hill Road near Mehboob Studio, Bandra West', lat: 19.0510, lng: 72.8290 },
    reporterIndex: 3,
    targetWorkflow: 'ASSIGNED',
    priority: 'MEDIUM',
    department: 'WATER',
    assignedTo: 'Bandra Pipeline Repair Gang-2',
    upvoters: [0, 2],
  },
  {
    title: 'Broken concrete storm drain cover caved inwards',
    description:
      'Heavy vehicle cracked precast concrete slab cover over drainage line; broken halves have collapsed into the water channel.',
    category: 'DRAINAGE',
    location: { address: 'Goregaon Sports Club Link Road, Malad West', lat: 19.1760, lng: 72.8420 },
    reporterIndex: 4,
    targetWorkflow: 'VERIFIED',
    priority: 'MEDIUM',
    upvoters: [1, 3],
  },
  {
    title: 'Broken children park swings and corroded slide ladder',
    description:
      'Rusted swing chain snapped with sharp exposed metal edges in public children play area. Needs replacement.',
    category: 'OTHER',
    location: { address: 'Five Gardens Children Play Park, Matunga East', lat: 19.0222, lng: 72.8550 },
    reporterIndex: 5,
    targetWorkflow: 'PENDING_VERIFICATION',
    upvoters: [0, 1],
  },
  {
    title: 'Uneven gravel and asphalt sinkhole near industrial estate',
    description:
      'Sub-base sinkhole under asphalt causing deep ruts. Monsoons have filled depression with muddy water hiding true depth.',
    category: 'POTHOLE',
    location: { address: 'Saki Naka Metro Junction, Andheri East', lat: 19.1065, lng: 72.8833 },
    reporterIndex: 0,
    targetWorkflow: 'PENDING_VERIFICATION',
    upvoters: [2, 3],
  },
  {
    title: 'Garbage dump on private residential colony terrace',
    description:
      'Tenant storing scrap furniture and boxes on apartment terrace building roof.',
    category: 'GARBAGE',
    location: { address: 'Colaba Causeway near Regal Cinema, Colaba', lat: 18.9150, lng: 72.8258 },
    reporterIndex: 1,
    targetWorkflow: 'REJECTED',
    rejectNote: 'Rejected: Private residential housing society property outside municipal jurisdiction.',
    upvoters: [],
  },
];

async function seed() {
  console.log('================================================================');
  console.log('🌱 SWADESH Civic Issue Platform Database Seeder');
  console.log(`🎯 Target API Base URL : ${API_BASE_URL}`);
  console.log('================================================================\n');

  // 1. Healthcheck
  try {
    const health = await apiCall('/health');
    console.log(`✅ Target API is healthy: ${health.service} (${health.time})`);
  } catch (err) {
    console.error(`❌ Target API is unreachable at ${API_BASE_URL}. Is dev server running?`);
    console.error(`   Error details: ${err.message}`);
    process.exit(1);
  }

  // 2. Authenticate Citizen Personas
  console.log('\n--- Step 1: Logging in Citizen Personas ---');
  const citizenTokens = [];
  for (const c of CITIZENS) {
    const res = await apiCall('/login', 'POST', c);
    citizenTokens.push({ user: res.user, token: res.token });
    console.log(`   👤 Citizen logged in: ${res.user.name} (${res.user.userId})`);
  }

  // 3. Authenticate Authority Personas
  console.log('\n--- Step 2: Logging in Municipal Authorities ---');
  const authorityTokens = [];
  for (const a of AUTHORITIES) {
    const res = await apiCall('/login', 'POST', a);
    authorityTokens.push({ user: res.user, token: res.token });
    console.log(`   👮 Authority logged in: ${res.user.name} (${res.user.userId})`);
  }

  const primaryAuthority = authorityTokens[0];

  // 4. Create Issues & Execute Lifecycle Workflows
  console.log(`\n--- Step 3: Seeding ${SEED_ISSUES.length} Realistic Issues & Lifecycle Transitions ---`);

  const createdIssues = [];

  for (let i = 0; i < SEED_ISSUES.length; i++) {
    const item = SEED_ISSUES[i];
    const citizen = citizenTokens[item.reporterIndex];

    // Create Issue
    const created = await apiCall(
      '/issues',
      'POST',
      {
        title: item.title,
        description: item.description,
        category: item.category,
        location: item.location,
      },
      citizen.token
    );

    const issueId = created.issueId;
    let currentStatus = created.status;

    // Apply Upvotes
    if (item.upvoters && item.upvoters.length > 0) {
      for (const upvoterIndex of item.upvoters) {
        if (citizenTokens[upvoterIndex]) {
          await apiCall(`/issues/${issueId}/upvote`, 'POST', {}, citizenTokens[upvoterIndex].token);
        }
      }
    }

    // Progress Workflow State Machine
    if (item.targetWorkflow === 'REJECTED') {
      await apiCall(
        `/issues/${issueId}/status`,
        'PATCH',
        { status: 'REJECTED', note: item.rejectNote || 'Ticket rejected upon physical triage.' },
        primaryAuthority.token
      );
      currentStatus = 'REJECTED';
    } else if (
      item.targetWorkflow === 'VERIFIED' ||
      item.targetWorkflow === 'ASSIGNED' ||
      item.targetWorkflow === 'IN_PROGRESS' ||
      item.targetWorkflow === 'RESOLVED'
    ) {
      // Step: VERIFIED
      await apiCall(
        `/issues/${issueId}/status`,
        'PATCH',
        { status: 'VERIFIED', priority: item.priority || 'MEDIUM', note: 'Site inspection verified by ward engineer.' },
        primaryAuthority.token
      );
      currentStatus = 'VERIFIED';

      if (
        item.targetWorkflow === 'ASSIGNED' ||
        item.targetWorkflow === 'IN_PROGRESS' ||
        item.targetWorkflow === 'RESOLVED'
      ) {
        // Step: ASSIGNED
        await apiCall(
          `/issues/${issueId}/assign`,
          'POST',
          { department: item.department, assignedTo: item.assignedTo },
          primaryAuthority.token
        );
        currentStatus = 'ASSIGNED';

        if (item.targetWorkflow === 'IN_PROGRESS' || item.targetWorkflow === 'RESOLVED') {
          // Step: IN_PROGRESS
          await apiCall(
            `/issues/${issueId}/status`,
            'PATCH',
            { status: 'IN_PROGRESS', note: item.progressNote || 'Repair operations mobilized.' },
            primaryAuthority.token
          );
          currentStatus = 'IN_PROGRESS';

          if (item.targetWorkflow === 'RESOLVED') {
            // Step: RESOLVED
            await apiCall(
              `/issues/${issueId}/status`,
              'PATCH',
              { status: 'RESOLVED', note: item.resolveNote || 'Remediation completed and verified.' },
              primaryAuthority.token
            );
            currentStatus = 'RESOLVED';
          }
        }
      }
    }

    createdIssues.push({
      id: issueId,
      title: item.title,
      category: item.category,
      status: currentStatus,
      priority: item.priority || '-',
    });

    console.log(
      `   [#${(i + 1).toString().padStart(2, '0')}] ${issueId}: [${item.category.padEnd(13)}] -> ${currentStatus.padEnd(20)} (${item.title.substring(0, 36)}...)`
    );
  }

  // 5. Query Stats to Verify Resulting Database State
  console.log('\n--- Step 4: Administrative Dashboard KPI Summary ---');
  const stats = await apiCall('/stats', 'GET', null, primaryAuthority.token);

  console.log('\nTotals:');
  console.table(stats.totals);

  console.log('\nBy Status:');
  console.table(stats.byStatus);

  console.log('\nBy Category:');
  console.table(stats.byCategory);

  console.log('\nBy Department:');
  console.table(stats.byDepartment);

  console.log('\n================================================================');
  console.log('✨ Seeding complete! The database now has 20 realistic issues.');
  console.log('================================================================\n');
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectExecution) {
  seed().catch((err) => {
    console.error('\n❌ Seeding encountered an error:', err);
    process.exit(1);
  });
}

export { seed };
export default seed;
