/**
 * Structured JSON Logger for CloudWatch Logs Insights
 *
 * Guaranteed schema for CloudWatch Logs Insights queries:
 * {
 *   level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
 *   msg: string,
 *   requestId: string | null,
 *   route: string | null,
 *   method: string | null,
 *   statusCode: number | null,
 *   durationMs: number | null,
 *   userId: string | null,
 *   ...extra
 * }
 */

const LOG_LEVELS = Object.freeze({
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
});

/**
 * Determines whether a log entry at `level` should be output based on active `LOG_LEVEL`.
 * @param {string} level
 * @returns {boolean}
 */
function shouldLog(level) {
  const configured = (process.env.LOG_LEVEL || 'INFO').trim().toUpperCase();
  const currentThreshold = LOG_LEVELS[configured] ?? LOG_LEVELS.INFO;
  const targetSeverity = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  return targetSeverity >= currentThreshold;
}

/**
 * Deeply redacts sensitive keys (passwords, tokens, passcodes, secrets).
 * Defense-in-depth against accidental logging of sensitive credentials.
 *
 * @param {Record<string, any>} obj
 * @returns {Record<string, any>}
 */
function redactSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (/token|passcode|secret|authorization|password/i.test(key)) {
      cleaned[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Error)) {
      cleaned[key] = redactSensitiveFields(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Emits a structured JSON log line to stdout.
 *
 * @param {'DEBUG' | 'INFO' | 'WARN' | 'ERROR'} level
 * @param {string} msg
 * @param {Object} [fields={}]
 */
function emit(level, msg, fields = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const {
    requestId = null,
    route = null,
    method = null,
    statusCode = null,
    durationMs = null,
    userId = null,
    stack = undefined,
    ...extra
  } = fields;

  const entry = {
    level,
    msg,
    requestId,
    route,
    method,
    statusCode,
    durationMs,
    userId,
    ...redactSensitiveFields(extra),
  };

  if (stack) {
    entry.stack = stack;
  }

  // CloudWatch expects single-line JSON on stdout
  console.log(JSON.stringify(entry));
}

export const logger = {
  /**
   * @param {string} msg
   * @param {Object} [fields]
   */
  debug(msg, fields = {}) {
    emit('DEBUG', msg, fields);
  },

  /**
   * @param {string} msg
   * @param {Object} [fields]
   */
  info(msg, fields = {}) {
    emit('INFO', msg, fields);
  },

  /**
   * @param {string} msg
   * @param {Object} [fields]
   */
  warn(msg, fields = {}) {
    emit('WARN', msg, fields);
  },

  /**
   * @param {string} msg
   * @param {Object} [fields]
   */
  error(msg, fields = {}) {
    emit('ERROR', msg, fields);
  },

  /**
   * Dedicated structured summary log written once per request.
   * Automatically sets level: ERROR for 5xx, WARN for 4xx, INFO for 2xx/3xx.
   *
   * @param {Object} summary
   * @param {string | null} summary.requestId
   * @param {string | null} summary.route
   * @param {string | null} summary.method
   * @param {number} summary.statusCode
   * @param {number} summary.durationMs
   * @param {string | null} [summary.userId]
   */
  requestSummary(summary) {
    const status = summary.statusCode || 200;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const msg = `HTTP ${summary.method || 'REQUEST'} ${summary.route || '/'} -> ${status} (${summary.durationMs}ms)`;
    emit(level, msg, summary);
  },
};

export default logger;

