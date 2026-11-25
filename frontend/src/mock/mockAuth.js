/**
 * Mock Auth Service
 * Conforms to docs/BLUEPRINT.md (Sections 6 & 7)
 */
import { simulateLatency, generateUserId, setCurrentUser } from './mockStore.js';
import { ApiError } from '../api/client.js';
import { ROLES } from '../constants.js';

const VALID_PASSCODES = ['swadesh-demo', 'SWADESH-OFFICER-2026'];

export async function login({ name, email, role = ROLES.CITIZEN, passcode } = {}) {
  await simulateLatency();

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'A valid email address is required', [
      { field: 'email', message: 'Valid email required' },
    ]);
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Name must be at least 2 characters', [
      { field: 'name', message: 'Name must be at least 2 characters' },
    ]);
  }

  const selectedRole = role === ROLES.AUTHORITY ? ROLES.AUTHORITY : ROLES.CITIZEN;

  // Authority passcode enforcement (Blueprint Section 7 + mock "swadesh-demo")
  if (selectedRole === ROLES.AUTHORITY) {
    const entered = (passcode || '').trim().toLowerCase();
    const isValid = VALID_PASSCODES.some((p) => p.toLowerCase() === entered);
    if (!isValid) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid authority passcode. For mock demo, use "swadesh-demo".', [
        { field: 'passcode', message: 'Invalid passcode' },
      ]);
    }
  }

  const userId = generateUserId(email);
  const now = new Date().toISOString();

  const user = {
    userId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: selectedRole,
    createdAt: now,
  };

  // Mock JWT Token representation
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 24 * 3600,
    })
  );
  const signature = btoa('mock_signature');
  const token = `${header}.${payload}.${signature}`;

  // Persist session
  setCurrentUser(user, token);

  return {
    token,
    user,
  };
}
