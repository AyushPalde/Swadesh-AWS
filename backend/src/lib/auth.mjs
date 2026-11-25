/**
 * Firebase Authentication token verification for SWADESH.
 * Roles are read only from the server-side users table; client claims are never trusted.
 */
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.mjs';
import { getRepo } from '../data/index.mjs';
import { unauthorized, forbidden } from './errors.mjs';

const googleClient = new OAuth2Client();

function bearerToken(req) {
  const value = req.headers?.authorization || req.headers?.Authorization;
  if (!value || typeof value !== 'string') {
    throw unauthorized('Authorization header with Firebase Bearer token is required');
  }
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) throw unauthorized('Invalid Authorization format. Expected: Bearer <token>');
  return match[1].trim();
}

export async function verifyToken(token) {
  if (!token || typeof token !== 'string') throw unauthorized('Firebase ID token is required');
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.FIREBASE_PROJECT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) throw unauthorized('Firebase token is missing required identity claims');
    return {
      userId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      emailVerified: Boolean(payload.email_verified),
    };
  } catch (error) {
    if (error?.statusCode === 401 || error?.name === 'AppError') throw error;
    throw unauthorized('Invalid or expired Firebase ID token');
  }
}

export async function requireAuth(req) {
  if (req.user) return req.user;
  const identity = await verifyToken(bearerToken(req));
  const repo = getRepo();
  let profile = await repo.getUser(identity.userId);

  // New Firebase accounts receive the least-privileged role by default.
  if (!profile) {
    profile = await repo.upsertUser({
      userId: identity.userId,
      email: identity.email,
      name: identity.name,
      role: 'citizen',
    });
  }

  req.user = {
    userId: identity.userId,
    email: identity.email,
    name: profile.name || identity.name,
    role: profile.role === 'authority' ? 'authority' : 'citizen',
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
