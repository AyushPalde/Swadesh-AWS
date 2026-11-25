/**
 * In-Memory & LocalStorage Mock State Store
 * Persists issues, user sessions, and upvote sets.
 * Conforms to docs/BLUEPRINT.md (Sections 4 & 5)
 */
import { SEED_ISSUES } from './seedData.js';
import { ROLES } from '../constants.js';

const STORAGE_KEY_ISSUES = 'swadesh_mock_issues';
const STORAGE_KEY_UPVOTES = 'swadesh_mock_upvotes';
const STORAGE_KEY_USER = 'swadesh_user';
const STORAGE_KEY_TOKEN = 'swadesh_token';

// In-memory cache
let memoryIssues = null;
let memoryUpvotes = null; // Map of issueId -> Set of userIds
let memoryUser = null;
let memoryToken = null;

/**
 * Simulates network latency (300ms - 600ms)
 */
export async function simulateLatency(min = 300, max = 600) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates Blueprint compliant deterministic userId:
 * "u_" + first 12 hex chars of sha256(lowercase email)
 * Simple fallback hash that produces 12 hex chars.
 */
export function generateUserId(email) {
  const normalized = (email || '').trim().toLowerCase();
  let hash1 = 0x811c9dc5;
  let hash2 = 0x27d4eb2f;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ char, 0x01000193);
    hash2 = Math.imul(hash2 ^ char, 0x5bd1e995);
  }

  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `u_${(hex1 + hex2).substring(0, 12)}`;
}

/**
 * Generates Blueprint compliant issueId:
 * "iss_" + 12 random hex chars
 */
export function generateIssueId() {
  const chars = '0123456789abcdef';
  let rand = '';
  for (let i = 0; i < 12; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `iss_${rand}`;
}

/**
 * Initializes and retrieves issues from memory / localStorage
 */
export function getIssuesStore() {
  if (memoryIssues !== null) {
    return memoryIssues;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ISSUES);
      if (stored) {
        memoryIssues = JSON.parse(stored);
        initUpvotesStore();
        return memoryIssues;
      }
    } catch (e) {
      console.warn('Failed to load mock issues from localStorage, using seeds:', e);
    }
  }

  // Clone seed issues
  memoryIssues = JSON.parse(JSON.stringify(SEED_ISSUES));
  persistIssuesStore();
  initUpvotesStore();
  return memoryIssues;
}

/**
 * Saves issues to localStorage
 */
export function persistIssuesStore() {
  if (typeof window !== 'undefined' && memoryIssues) {
    try {
      localStorage.setItem(STORAGE_KEY_ISSUES, JSON.stringify(memoryIssues));
    } catch (e) {
      console.warn('Failed to persist mock issues to localStorage:', e);
    }
  }
}

/**
 * Initializes upvotes map
 */
function initUpvotesStore() {
  memoryUpvotes = new Map();

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UPVOTES);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([issueId, userIds]) => {
          memoryUpvotes.set(issueId, new Set(userIds));
        });
        return;
      }
    } catch {
      // Fallback
    }
  }

  // Seed default upvotes
  if (memoryIssues) {
    memoryIssues.forEach((issue) => {
      const userSet = new Set();
      if (issue.viewerHasUpvoted) {
        userSet.add('u_1a2b3c4d5e01'); // Default test user Asha Patil
      }
      memoryUpvotes.set(issue.issueId, userSet);
    });
    persistUpvotesStore();
  }
}

export function persistUpvotesStore() {
  if (typeof window !== 'undefined' && memoryUpvotes) {
    try {
      const obj = {};
      memoryUpvotes.forEach((set, issueId) => {
        obj[issueId] = Array.from(set);
      });
      localStorage.setItem(STORAGE_KEY_UPVOTES, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to persist mock upvotes:', e);
    }
  }
}

export function getUpvotesSet(issueId) {
  if (!memoryUpvotes) initUpvotesStore();
  if (!memoryUpvotes.has(issueId)) {
    memoryUpvotes.set(issueId, new Set());
  }
  return memoryUpvotes.get(issueId);
}

/**
 * Gets currently logged-in user or returns default citizen persona
 */
export function getCurrentUser() {
  if (memoryUser) return memoryUser;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        memoryUser = JSON.parse(stored);
        return memoryUser;
      }
    } catch {
      // Ignore
    }
  }

  return {
    userId: 'u_1a2b3c4d5e01',
    name: 'Asha Patil',
    email: 'asha.patil@swadesh.gov.in',
    role: ROLES.CITIZEN,
    createdAt: '2026-10-20T10:00:00Z',
  };
}

/**
 * Sets current user in localStorage and mock store
 */
export function setCurrentUser(user, token) {
  memoryUser = user || null;
  memoryToken = token || null;

  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  }
}
