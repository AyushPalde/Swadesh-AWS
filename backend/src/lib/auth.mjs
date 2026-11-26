/**
 * SWADESH demonstration identity provider.
 * DEMO ONLY: enable DEMO_MODE=true in Lambda for classroom demonstrations.
 * Never use this header-based identity mechanism in production.
 */
import { config } from '../config.mjs';
import { getRepo } from '../data/index.mjs';
import { unauthorized, forbidden } from './errors.mjs';

const DEMO_USERS = Object.freeze({
  citizen: Object.freeze({
    userId: 'demo-citizen-001',
    email: 'citizen@swadesh.demo',
    name: 'Demo Citizen',
    role: 'citizen',
  }),
  authority: Object.freeze({
    userId: 'demo-authority-001',
    email: 'authority@swadesh.demo',
    name: 'Demo Authority',
    role: 'authority',
  }),
});

export async function verifyToken() {
  throw unauthorized('Firebase authentication is disabled in demo mode');
}

export async function requireAuth(req) {
  if (req.user) return req.user;
  if (String(config.DEMO_MODE).toLowerCase() !== 'true') {
    throw unauthorized('Demo mode is disabled');
  }

  const requestedRole = String(
    req.headers?.['x-demo-user'] || req.headers?.['X-Demo-User'] || ''
  ).toLowerCase();
  const identity = DEMO_USERS[requestedRole];
  if (!identity) {
    throw unauthorized('Select a valid SWADESH demo account');
  }

  // Ensure a matching user profile exists in the real DynamoDB users table.
  const repo = getRepo();
  const existing = await repo.getUser(identity.userId);
  const profile = await repo.upsertUser({
    ...identity,
    // Keep the fixed demo role; do not accept a role from the request body.
    role: identity.role,
    name: existing?.name || identity.name,
  });

  req.user = {
    userId: identity.userId,
    email: identity.email,
    name: profile.name || identity.name,
    role: identity.role,
  };
  return req.user;
}

export async function requireRole(req, expectedRole = 'authority') {
  const user = await requireAuth(req);
  if (user.role !== expectedRole) {
    throw forbidden(`Access forbidden: '${expectedRole}' role required`);
  }
  return user;
}

export default { verifyToken, requireAuth, requireRole };
