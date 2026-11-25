/**
 * Application Runtime Configuration
 * Reads from Vite environment variables (import.meta.env) with Node fallback
 * Reference: docs/BLUEPRINT.md (Section 9)
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});

export const config = {
  // Base URL for API Gateway / local mock backend
  apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:3001',

  // Toggle in-memory/browser mock API adapter
  useMock: env.VITE_USE_MOCK === 'true' || env.VITE_USE_MOCK === true || env.VITE_USE_MOCK === undefined,

  // App details
  appName: 'SWADESH',
  version: '0.1.0',
};

export default config;
