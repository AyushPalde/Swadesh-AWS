/**
 * Stats API Module
 * Conforms to docs/BLUEPRINT.md (Sections 5 & 6)
 */
import client from './client.js';
import withMock from './adapter.js';
import * as mockStats from '../mock/mockStats.js';

/**
 * GET /stats (authority only)
 * Retrieves totals and breakdowns by status, category, and department.
 *
 * @returns {Promise<{ totals: Object, byStatus: Object, byCategory: Object, byDepartment: Object }>}
 */
export async function getStats() {
  return withMock(
    () => client.get('/stats'),
    () => mockStats.getStats()
  );
}

export default {
  getStats,
};
