/**
 * SWADESH JWT Authentication & Verification Utility
 * Single Source of Truth: docs/BLUEPRINT.md (Section 7)
 *
 * Header: "Authorization: Bearer <token>"
 * Token: HS256 JWT { sub: userId, name: string, role: 'citizen' | 'authority', exp: number }
 *
 * Zero external dependencies: uses Node.js 22 native crypto module.
 */

import crypto from 'node:crypto';
import { config } from '../config.mjs';
import { unauthorized, forbidden } from './errors.mjs';

/**
 * Base64URL encoder (RFC 7515)
 * @param {string | Buffer} input
 * @returns {string}
 */
export function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf-8');
  return buf.toString('base64url');
}

/**
 * Base64URL decoder
 * @param {string} input
 * @returns {string}
 */
export function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

/**
 * Signs a payload into an HS256 JWT token valid for 24 hours.
 *
 * @param {{ userId: string, name: string, role: string }} user
 * @param {string} [secret=config.JWT_SECRET]
 * @param {number} [expiresInSeconds=86400] - 24 hours default
 * @returns {string} Encoded JWT token
 */
export function signToken(user, secret = config.JWT_SECRET, expiresInSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    sub: user.userId,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
}

/**
 * Verifies and decodes an HS256 JWT token.
 * Throws 401 UNAUTHORIZED if invalid or expired.
 *
 * @param {string} token
 * @param {string} [secret=config.JWT_SECRET]
 * @returns {{ userId: string, name: string, role: string, exp: number, iat: number }}
 */
export function verifyToken(token, secret = config.JWT_SECRET) {
  if (!token || typeof token !== 'string') {
    throw unauthorized('Authentication token is required');
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw unauthorized('Malformed authentication token');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Recalculate signature and compare timing-safely
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw unauthorized('Invalid token signature');
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw unauthorized('Malformed token payload');
  }

  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw unauthorized('Authentication token has expired');
  }

  return {
    userId: payload.sub,
    name: payload.name,
    role: payload.role,
    exp: payload.exp,
    iat: payload.iat,
  };
}

/**
 * Extracts and verifies JWT from the `Authorization: Bearer <token>` header on `req`.
 * Attaches the authenticated user object to `req.user`.
 *
 * @param {Object} req - Router request object
 * @returns {{ userId: string, name: string, role: string }}
 */
export function requireAuth(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    throw unauthorized('Authorization header with Bearer token is required');
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw unauthorized('Invalid Authorization format. Expected: Bearer <token>');
  }

  const token = match[1].trim();
  const user = verifyToken(token);

  req.user = user;
  return user;
}

/**
 * Enforces role-based access control.
 *
 * @param {Object} req
 * @param {'citizen' | 'authority'} [expectedRole='authority']
 * @returns {{ userId: string, name: string, role: string }}
 */
export function requireRole(req, expectedRole = 'authority') {
  const user = requireAuth(req);
  if (user.role !== expectedRole) {
    throw forbidden(`Access forbidden: '${expectedRole}' role required`);
  }
  return user;
}

export default {
  signToken,
  verifyToken,
  requireAuth,
  requireRole,
  base64UrlEncode,
  base64UrlDecode,
};

