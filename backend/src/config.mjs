/**
 * SWADESH Backend Configuration & Environment Validator
 * Single Source of Truth: docs/BLUEPRINT.md (Section 9)
 *
 * Validates and freezes runtime environment configuration.
 * Fails fast with descriptive error messages if required variables are absent or invalid.
 */

export const REQUIRED_CONFIG_KEYS = Object.freeze([
  'ISSUES_TABLE',
  'USERS_TABLE',
  'IMAGE_BUCKET',
  'JWT_SECRET',
  'AUTHORITY_PASSCODE',
  'DATA_STORE',
  'S3_MODE',
  'LOG_LEVEL',
]);

export const VALID_DATA_STORES = Object.freeze(['dynamo', 'memory']);
export const VALID_S3_MODES = Object.freeze(['aws', 'local']);
export const VALID_LOG_LEVELS = Object.freeze(['DEBUG', 'INFO', 'WARN', 'ERROR']);

/**
 * Validates the provided environment map and returns a frozen configuration object.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {Readonly<{
 *   ISSUES_TABLE: string,
 *   USERS_TABLE: string,
 *   IMAGE_BUCKET: string,
 *   JWT_SECRET: string,
 *   AUTHORITY_PASSCODE: string,
 *   DATA_STORE: 'dynamo' | 'memory',
 *   S3_MODE: 'aws' | 'local',
 *   LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
 *   AWS_REGION: string
 * }>}
 */
export function validateConfig(env = process.env) {
  const missing = [];

  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!env[key] || typeof env[key] !== 'string' || !env[key].trim()) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Configuration error: Missing required environment variable(s): ${missing.join(', ')}`
    );
  }

  const dataStore = env.DATA_STORE.trim().toLowerCase();
  if (!VALID_DATA_STORES.includes(dataStore)) {
    throw new Error(
      `Configuration error: Invalid DATA_STORE '${env.DATA_STORE}'. Expected one of: ${VALID_DATA_STORES.join(', ')}`
    );
  }

  const s3Mode = env.S3_MODE.trim().toLowerCase();
  if (!VALID_S3_MODES.includes(s3Mode)) {
    throw new Error(
      `Configuration error: Invalid S3_MODE '${env.S3_MODE}'. Expected one of: ${VALID_S3_MODES.join(', ')}`
    );
  }

  const logLevel = env.LOG_LEVEL.trim().toUpperCase();
  if (!VALID_LOG_LEVELS.includes(logLevel)) {
    throw new Error(
      `Configuration error: Invalid LOG_LEVEL '${env.LOG_LEVEL}'. Expected one of: ${VALID_LOG_LEVELS.join(', ')}`
    );
  }

  return Object.freeze({
    ISSUES_TABLE: env.ISSUES_TABLE.trim(),
    USERS_TABLE: env.USERS_TABLE.trim(),
    IMAGE_BUCKET: env.IMAGE_BUCKET.trim(),
    JWT_SECRET: env.JWT_SECRET.trim(),
    AUTHORITY_PASSCODE: env.AUTHORITY_PASSCODE.trim(),
    DATA_STORE: dataStore,
    S3_MODE: s3Mode,
    LOG_LEVEL: logLevel,
    AWS_REGION: env.AWS_REGION || 'us-east-1',
  });
}

/**
 * Evaluates configuration. In production / AWS Lambda, env is present at load time.
 * If imported in testing before process.env is populated, creates a Proxy that triggers
 * fail-fast validation with the exact error upon property access.
 */
let resolvedConfig = null;

try {
  resolvedConfig = validateConfig(process.env);
} catch {
  resolvedConfig = new Proxy({}, {
    get(_, prop) {
      const active = validateConfig(process.env);
      return active[prop];
    },
    ownKeys() {
      return Reflect.ownKeys(validateConfig(process.env));
    },
    getOwnPropertyDescriptor(_, prop) {
      return Reflect.getOwnPropertyDescriptor(validateConfig(process.env), prop);
    },
  });
}

export const config = resolvedConfig;
export default config;
