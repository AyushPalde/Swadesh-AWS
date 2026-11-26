
/**
 * Firebase Authentication token verification for SWADESH.
 * Verifies Firebase ID tokens using Firebase's signing certificates.
 * User roles are read only from the server-side users table.
 */

import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.mjs';
import { getRepo } from '../data/index.mjs';
import { unauthorized, forbidden } from './errors.mjs';

const googleClient = new OAuth2Client();

const FIREBASE_CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts = null;
let certsExpiry = 0;

async function getFirebaseCerts() {
  if (cachedCerts && Date.now() < certsExpiry) {
    return cachedCerts;
  }

  const response = await fetch(FIREBASE_CERT_URL);

  if (!response.ok) {
    throw new Error('Unable to retrieve Firebase signing certificates');
  }

  const certs = await response.json();

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = cacheControl.match(/max-age=(\d+)/);
  const cacheDuration = maxAge
    ? Number(maxAge[1]) * 1000
    : 3600000;

  cachedCerts = certs;
  certsExpiry = Date.now() + cacheDuration;

  return cachedCerts;
}

function bearerToken(req) {
  const value =
    req.headers?.authorization ||
    req.headers?.Authorization;

  if (!value || typeof value !== 'string') {
    throw unauthorized(
      'Authorization header with Firebase Bearer token is required'
    );
  }

  const match = value.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw unauthorized('Invalid Authorization format');
  }

  return match[1].trim();
}

export async function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw unauthorized('Firebase ID token is required');
  }

  const projectId = config.FIREBASE_PROJECT_ID;

  let ticket;

  try {
    const certs = await getFirebaseCerts();

    ticket = await googleClient.verifySignedJwtWithCertsAsync(
      token,
      certs,
      projectId,
      [`https://securetoken.google.com/${projectId}`]
    );
  } catch (error) {
    if (error?.name === 'AppError') throw error;

    throw unauthorized('Invalid or expired Firebase ID token');
  }

  const payload = ticket.getPayload();

  if (
    !payload?.sub ||
    !payload?.email ||
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}`
  ) {
    throw unauthorized('Firebase token identity is invalid');
  }

  return {
    userId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    emailVerified: Boolean(payload.email_verified),
  };
}

export async function requireAuth(req) {
  if (req.user) return req.user;

  const identity = await verifyToken(bearerToken(req));
  const repo = getRepo();

  let profile = await repo.getUser(identity.userId);

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
    throw forbidden(
      `Access forbidden: '${expectedRole}' role required`
    );
  }

  return user;
}

export default {
  verifyToken,
  requireAuth,
  requireRole,
};
