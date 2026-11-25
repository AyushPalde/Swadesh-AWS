/**
 * Issues API Module
 * Conforms to docs/BLUEPRINT.md (Sections 3, 5, 6)
 */
import client from './client.js';
import withMock from './adapter.js';
import * as mockIssues from '../mock/mockIssues.js';

/**
 * GET /issues (auth)
 * Query params: ?status&category&mine=true&sort=recent|top&limit&cursor
 *
 * @param {Object} [params]
 * @param {string} [params.status]
 * @param {string} [params.category]
 * @param {boolean|string} [params.mine]
 * @param {'recent' | 'top'} [params.sort]
 * @param {number} [params.limit]
 * @param {string} [params.cursor]
 * @returns {Promise<{ items: Array<Object>, nextCursor: string|null }>}
 */
export async function listIssues(params = {}) {
  return withMock(
    () => client.get('/issues', { params }),
    () => mockIssues.listIssues(params)
  );
}

/**
 * GET /issues/{id} (auth)
 *
 * @param {string} id
 * @returns {Promise<Object>} Issue
 */
export async function getIssue(id) {
  if (!id) throw new Error('Issue ID is required');
  return withMock(
    () => client.get(`/issues/${id}`),
    () => mockIssues.getIssue(id)
  );
}

/**
 * POST /issues (auth)
 *
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.description
 * @param {string} payload.category
 * @param {{ address: string, lat?: number, lng?: number }} payload.location
 * @param {string} [payload.imageKey]
 * @returns {Promise<Object>} Created Issue (201)
 */
export async function createIssue(payload) {
  return withMock(
    () => client.post('/issues', payload),
    () => mockIssues.createIssue(payload)
  );
}

/**
 * POST /issues/{id}/upvote (auth)
 * Toggles civic support
 *
 * @param {string} id
 * @returns {Promise<{ upvoteCount: number, upvoted: boolean }>}
 */
export async function toggleUpvote(id) {
  if (!id) throw new Error('Issue ID is required');
  return withMock(
    () => client.post(`/issues/${id}/upvote`),
    () => mockIssues.toggleUpvote(id)
  );
}

/**
 * PATCH /issues/{id}/status (authority only)
 *
 * @param {string} id
 * @param {Object} payload
 * @param {string} payload.status
 * @param {string} [payload.note]
 * @param {string} [payload.priority]
 * @returns {Promise<Object>} Updated Issue
 */
export async function updateStatus(id, payload) {
  if (!id) throw new Error('Issue ID is required');
  return withMock(
    () => client.patch(`/issues/${id}/status`, payload),
    () => mockIssues.updateStatus(id, payload)
  );
}

/**
 * POST /issues/{id}/assign (authority only)
 *
 * @param {string} id
 * @param {Object} payload
 * @param {string} payload.department
 * @param {string} payload.assignedTo
 * @returns {Promise<Object>} Assigned Issue
 */
export async function assignIssue(id, payload) {
  if (!id) throw new Error('Issue ID is required');
  return withMock(
    () => client.post(`/issues/${id}/assign`, payload),
    () => mockIssues.assignIssue(id, payload)
  );
}

export default {
  listIssues,
  getIssue,
  createIssue,
  toggleUpvote,
  updateStatus,
  assignIssue,
};
