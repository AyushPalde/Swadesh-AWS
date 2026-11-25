/**
 * Adapter Helper: Chooses between Mock and Real API implementation.
 * Ensures caller pages and components never need to know which layer is active.
 */
import config from '../config.js';

/**
 * Directs execution to mock implementation when VITE_USE_MOCK is true,
 * or real backend fetch client when false.
 *
 * @template T
 * @param {() => Promise<T>} realFn
 * @param {() => Promise<T>} mockFn
 * @returns {Promise<T>}
 */
export async function withMock(realFn, mockFn) {
  if (config.useMock) {
    return await mockFn();
  }
  return await realFn();
}

export default withMock;
