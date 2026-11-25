/**
 * Frontend API Layer Exports
 * Conforms to docs/BLUEPRINT.md
 */

// Client & Errors
export { default as client, ApiError, getStoredToken, clearSession } from './client.js';
export { withMock } from './adapter.js';

// API Modules
export * as authApi from './auth.js';
export { login } from './auth.js';

export * as issuesApi from './issues.js';
export {
  listIssues,
  getIssue,
  createIssue,
  toggleUpvote,
  updateStatus,
  assignIssue,
} from './issues.js';

export * as statsApi from './stats.js';
export { getStats } from './stats.js';

export * as uploadsApi from './uploads.js';
export { getUploadUrl, uploadImage } from './uploads.js';
