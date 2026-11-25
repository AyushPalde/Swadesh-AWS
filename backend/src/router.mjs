/**
 * Minimalist Zero-Dependency Path Router
 * Matches HTTP method & URI path templates (e.g. "/issues/{id}/upvote").
 * Extracts path parameters and delivers a clean, normalized `req` object to handlers.
 */

import { notFound } from './lib/errors.mjs';

/**
 * Normalizes a URL path by removing redundant and trailing slashes.
 * @param {string} path
 * @returns {string}
 */
export function normalizePath(path = '/') {
  if (!path || typeof path !== 'string') return '/';
  const clean = path.replace(/\/+/g, '/');
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean.startsWith('/') ? clean : `/${clean}`;
}

/**
 * Converts a blueprint path pattern like "/issues/{id}/upvote" into a RegExp.
 *
 * @param {string} pattern
 * @returns {{ regex: RegExp, paramNames: string[] }}
 */
function compilePattern(pattern) {
  const normalized = normalizePath(pattern);
  const paramNames = [];

  // Match {paramName}
  const regexStr = normalized.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });

  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
  };
}

export class Router {
  constructor() {
    /** @type {Array<{ method: string, pattern: string, regex: RegExp, paramNames: string[], handler: Function }>} */
    this.routes = [];
  }

  /**
   * Registers a route handler for a given HTTP method and path pattern.
   *
   * @param {string} method - HTTP method (GET, POST, PATCH, PUT, DELETE, etc.)
   * @param {string} pattern - Path pattern (e.g. "/issues/{id}/upvote")
   * @param {Function} handler - Handler function receiving `req`
   */
  register(method, pattern, handler) {
    if (!method || !pattern || typeof handler !== 'function') {
      throw new Error(`Invalid route registration: method=${method}, pattern=${pattern}`);
    }

    const { regex, paramNames } = compilePattern(pattern);

    this.routes.push({
      method: method.trim().toUpperCase(),
      pattern: normalizePath(pattern),
      regex,
      paramNames,
      handler,
    });
  }

  // Convenience shorthand methods
  get(pattern, handler) {
    this.register('GET', pattern, handler);
  }

  post(pattern, handler) {
    this.register('POST', pattern, handler);
  }

  patch(pattern, handler) {
    this.register('PATCH', pattern, handler);
  }

  delete(pattern, handler) {
    this.register('DELETE', pattern, handler);
  }

  /**
   * Matches an incoming HTTP request against registered routes.
   *
   * @param {string} method
   * @param {string} rawPath
   * @returns {{ route: Object, params: Record<string, string> } | null}
   */
  match(method, rawPath) {
    const normalizedMethod = (method || 'GET').trim().toUpperCase();
    const cleanPath = normalizePath(rawPath);

    for (const route of this.routes) {
      if (route.method !== normalizedMethod) {
        continue;
      }

      const match = cleanPath.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });

        return { route, params };
      }
    }

    return null;
  }

  /**
   * Dispatches an incoming request through the router.
   *
   * @param {Object} context
   * @param {string} context.method
   * @param {string} context.path
   * @param {Object} [context.query={}]
   * @param {any} [context.body=null]
   * @param {Record<string, string>} [context.headers={}]
   * @param {Object | null} [context.user=null]
   * @param {string} context.requestId
   * @returns {Promise<any>} Handler response
   */
  async handle(context) {
    const { method, path, query = {}, body = null, headers = {}, user = null, requestId } = context;
    const matched = this.match(method, path);

    if (!matched) {
      throw notFound(`Route not found: ${method.toUpperCase()} ${path}`);
    }

    const { route, params } = matched;

    /**
     * Clean `req` object provided to handlers
     */
    const req = {
      method: route.method,
      path: normalizePath(path),
      routePattern: route.pattern,
      params,
      query: query || {},
      body,
      headers: headers || {},
      user: user || null,
      requestId,
    };

    context.req = req;
    const result = await route.handler(req);
    context.user = req.user;
    return result;
  }
}

// Global default router instance
export const router = new Router();

export default router;

