/**
 * Integration Test for scripts/seed.mjs
 * Runs the complete seeding script against dev-server in-memory (no TCP sockets needed).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import './setup.mjs';
import { handleRequest } from '../scripts/dev-server.mjs';
import { getRepo } from '../src/data/index.mjs';

class MockRequest extends EventEmitter {
  constructor(method, url, headers) {
    super();
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.socket = { remoteAddress: '127.0.0.1' };
  }
}

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }
  setHeader(k, v) {
    this.headers[k.toLowerCase()] = v;
  }
  getHeader(k) {
    return this.headers[k.toLowerCase()];
  }
  write(data = '') {
    this.body += data;
  }
  end(data = '') {
    if (data) this.body += data;
    this.emit('finish');
  }
}

/**
 * In-memory fetch mock that delivers requests directly to `handleRequest`.
 */
async function inMemoryFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const parsedUrl = new URL(url);
  const pathWithQuery = parsedUrl.pathname + parsedUrl.search;
  const headers = {};
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers[k.toLowerCase()] = v;
    }
  }

  return new Promise((resolve) => {
    const req = new MockRequest(method, pathWithQuery, headers);
    const res = new MockResponse();

    res.on('finish', () => {
      resolve(
        new Response(res.body, {
          status: res.statusCode,
          headers: res.headers,
        })
      );
    });

    handleRequest(req, res);

    process.nextTick(() => {
      if (options.body) {
        req.emit('data', Buffer.from(options.body));
      }
      req.emit('end');
    });
  });
}

describe('SWADESH Seeder Script (scripts/seed.mjs)', () => {
  it('successfully seeds 20 realistic issues and validates stats', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = inMemoryFetch;

    try {
      const repo = getRepo();
      if (typeof repo.resetMemoryStore === 'function') {
        repo.resetMemoryStore();
      }

      // Run seeder script
      const { seed } = await import('../../scripts/seed.mjs');
      await seed();

      // Verify stats directly from repo
      const stats = await repo.getStats();
      assert.equal(stats.totals.total, 20);
      assert.equal(stats.totals.resolved, 3);
      assert.equal(stats.totals.rejected, 1);
      assert.equal(stats.totals.inProgress, 4);
      assert.equal(stats.totals.assigned, 4);
      assert.equal(stats.totals.verified, 3);
      assert.equal(stats.totals.pending, 5);
      assert.ok(stats.totals.totalUpvotes > 20);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
