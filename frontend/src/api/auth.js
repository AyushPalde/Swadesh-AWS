/**
 * Auth API Module
 * Conforms to docs/BLUEPRINT.md (Sections 6 & 7)
 */
import client, { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './client.js';
import withMock from './adapter.js';
import * as mockAuth from '../mock/mockAuth.js';

/**
 * POST /login (public)
 * Authenticates citizen or authority and stores session credentials.
 *
 * @param {Object} credentials
 * @param {string} credentials.name
 * @param {string} credentials.email
 * @param {'citizen' | 'authority'} credentials.role
 * @param {string} [credentials.passcode]
 * @returns {Promise<{ token: string, user: { userId: string, name: string, email: string, role: string, createdAt: string } }>}
 */
export async function login(credentials) {
  return withMock(
    async () => {
      const response = await client.post('/login', credentials, { skipAuth: true });
      if (response?.token && typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        if (response.user) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
        }
      }
      return response;
    },
    () => mockAuth.login(credentials)
  );
}

export default {
  login,
};
