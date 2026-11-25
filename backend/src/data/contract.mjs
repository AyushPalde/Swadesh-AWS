/**
 * SWADESH Data Layer Repository Contract & Type Definitions
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 1-5)
 *
 * This contract defines the interface that both `dynamo.mjs` and `memory.mjs` implement.
 */

/**
 * @typedef {Object} User
 * @property {string} userId - "u_" + first 12 hex chars of sha256(lowercase email)
 * @property {string} name
 * @property {string} email
 * @property {'citizen' | 'authority'} role
 * @property {string} createdAt - ISO-8601 UTC string
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} StatusHistoryItem
 * @property {'PENDING_VERIFICATION' | 'VERIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'} status
 * @property {string} by - Name of the citizen or authority officer
 * @property {string} note - Status narrative or justification
 * @property {string} at - ISO-8601 UTC timestamp
 */

/**
 * @typedef {Object} IssueLocation
 * @property {string} address - Physical street or landmark address
 * @property {number} [lat] - Latitude coordinate
 * @property {number} [lng] - Longitude coordinate
 */

/**
 * @typedef {Object} Issue
 * @property {string} issueId - "iss_" + 12 random hex chars
 * @property {string} title
 * @property {string} description
 * @property {'POTHOLE' | 'GARBAGE' | 'STREETLIGHT' | 'WATER_LEAKAGE' | 'DRAINAGE' | 'OTHER'} category
 * @property {IssueLocation} location
 * @property {string | null} [imageKey]
 * @property {string | null} [imageUrl]
 * @property {'PENDING_VERIFICATION' | 'VERIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'} status
 * @property {'LOW' | 'MEDIUM' | 'HIGH' | null} priority
 * @property {'ROADS' | 'SANITATION' | 'ELECTRICAL' | 'WATER' | 'PARKS' | null} department
 * @property {string | null} assignedTo
 * @property {string} reporterId
 * @property {string} reporterName
 * @property {number} upvoteCount
 * @property {boolean} viewerHasUpvoted
 * @property {StatusHistoryItem[]} statusHistory
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ListIssuesParams
 * @property {string} [status]
 * @property {string} [category]
 * @property {string} [reporterId]
 * @property {'recent' | 'top'} [sort='recent']
 * @property {number} [limit=20]
 * @property {string | null} [cursor=null] - Opaque base64 pagination cursor
 */

/**
 * @typedef {Object} ListIssuesResult
 * @property {Issue[]} items
 * @property {string | null} nextCursor
 */

/**
 * @typedef {Object} StatsResult
 * @property {{
 *   total: number,
 *   pending: number,
 *   verified: number,
 *   assigned: number,
 *   inProgress: number,
 *   resolved: number,
 *   rejected: number,
 *   totalUpvotes: number
 * }} totals
 * @property {Record<string, number>} byStatus
 * @property {Record<string, number>} byCategory
 * @property {Record<string, number>} byDepartment
 */

/**
 * Repository interface contract.
 *
 * @interface IRepository
 * @property {(user: { email: string, name: string, role: string }) => Promise<User>} upsertUser
 * @property {(userId: string) => Promise<User | null>} getUser
 * @property {(issue: Object) => Promise<Issue>} createIssue
 * @property {(issueId: string, currentUserId?: string) => Promise<Issue | null>} getIssue
 * @property {(params: ListIssuesParams, currentUserId?: string) => Promise<ListIssuesResult>} listIssues
 * @property {(issueId: string, userId: string) => Promise<{ upvoteCount: number, upvoted: boolean }>} toggleUpvote
 * @property {(issueId: string, transition: { fromStatus: string, toStatus: string, by: string, note?: string, priority?: string }) => Promise<Issue>} transitionStatus
 * @property {(issueId: string, assignment: { department: string, assignedTo: string, by: string, note?: string }) => Promise<Issue>} assignIssue
 * @property {() => Promise<StatsResult>} getStats
 */

export default {};

