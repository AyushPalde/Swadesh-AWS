/**
 * Unit & Integration Tests for SWADESH Local Dev Server (dev-server.mjs)
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

import './setup.mjs';
import {
  handleRequest,
  setCorsHeaders,
  getMimeType,
  UPLOADS_DIR,
} from '../scripts/dev-server.mjs';

class MockRequest extends EventEmitter {
  constructor(method = 'GET', url = '/', headers = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = {
      host: 'localhost:3001',
      ...headers,
    };
    this.socket = { remoteAddress: '127.0.0.1' };
  }

  pipe(dest) {
    this.on('data', (chunk) => dest.write(chunk));
    this.on('end', () => dest.end());
    return dest;
  }
}

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }

  setHeader(name, val) {
    this.headers[name.toLowerCase()] = val;
  }

  getHeader(name) {
    return this.headers[name.toLowerCase()];
  }

  write(data = '') {
    if (data) this.body += data;
  }

  end(data = '') {
    if (data) this.body += data;
    this.emit('finish');
  }
}

function createMockHttp({
  method = 'GET',
  url = '/',
  headers = {},
  body = null,
} = {}) {
  const req = new MockRequest(method, url, headers);
  const res = new MockResponse();

  req.send = () => {
    process.nextTick(() => {
      if (body !== null && body !== undefined) {
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
        req.emit('data', buf);
      }
      req.emit('end');
    });
  };

  return { req, res };
}

describe('SWADESH Local Dev Server (dev-server.mjs)', () => {
  const testKey = 'issues/test12345678/crater.jpg';
  const testDiskPath = path.resolve(UPLOADS_DIR, testKey);

  after(() => {
    if (fs.existsSync(testDiskPath)) {
      fs.unlinkSync(testDiskPath);
    }
  });

  describe('1. CORS & Preflight Handling', () => {
    it('sets all permissive CORS headers for local Vite dev', () => {
      const res = new MockResponse();
      setCorsHeaders(res, 'http://localhost:5173');

      assert.equal(res.getHeader('access-control-allow-origin'), 'http://localhost:5173');
      assert.ok(res.getHeader('access-control-allow-methods').includes('POST'));
      assert.ok(res.getHeader('access-control-allow-headers').includes('Authorization'));
      assert.equal(res.getHeader('access-control-allow-credentials'), 'true');
    });

    it('OPTIONS preflight returns 204 with CORS headers immediately without invoking Lambda', (t, done) => {
      const { req, res } = createMockHttp({
        method: 'OPTIONS',
        url: '/issues/iss_123/status',
        headers: { origin: 'http://localhost:5173' },
      });

      res.on('finish', () => {
        assert.equal(res.statusCode, 204);
        assert.equal(res.getHeader('access-control-allow-origin'), 'http://localhost:5173');
        done();
      });

      handleRequest(req, res);
      req.send();
    });
  });

  describe('2. Local S3 Upload Simulation (PUT /local-upload/*)', () => {
    it('saves uploaded bytes directly to backend/.local-uploads/<key>', (t, done) => {
      const imagePayload = Buffer.from('FAKE-JPEG-PIXEL-DATA');
      const { req, res } = createMockHttp({
        method: 'PUT',
        url: `/local-upload/${testKey}`,
        headers: {
          'content-type': 'image/jpeg',
          origin: 'http://localhost:5173',
        },
        body: imagePayload,
      });

      res.on('finish', () => {
        assert.equal(res.statusCode, 200);
        const data = JSON.parse(res.body);
        assert.equal(data.ok, true);

        // Verify file persisted on disk
        assert.ok(fs.existsSync(testDiskPath));
        const saved = fs.readFileSync(testDiskPath);
        assert.equal(saved.toString(), imagePayload.toString());
        done();
      });

      handleRequest(req, res);
      req.send();
    });

    it('blocks directory traversal attempts with 403 FORBIDDEN', (t, done) => {
      const { req, res } = createMockHttp({
        method: 'PUT',
        url: '/local-upload/issues%2F..%2F..%2Fetc%2Fpasswd',
        headers: { 'content-type': 'image/jpeg' },
        body: 'malicious',
      });

      res.on('finish', () => {
        assert.equal(res.statusCode, 403);
        const data = JSON.parse(res.body);
        assert.equal(data.error.code, 'FORBIDDEN');
        done();
      });

      handleRequest(req, res);
      req.send();
    });
  });

  describe('3. Local S3 Download Simulation (GET /local-files/*)', () => {
    it('returns 404 NOT_FOUND for non-existent files', (t, done) => {
      const { req, res } = createMockHttp({
        method: 'GET',
        url: '/local-files/issues/nonexistent/missing.jpg',
      });

      res.on('finish', () => {
        assert.equal(res.statusCode, 404);
        const data = JSON.parse(res.body);
        assert.equal(data.error.code, 'NOT_FOUND');
        done();
      });

      handleRequest(req, res);
      req.send();
    });

    it('correctly detects image MIME types', () => {
      assert.equal(getMimeType('photo.jpg'), 'image/jpeg');
      assert.equal(getMimeType('photo.jpeg'), 'image/jpeg');
      assert.equal(getMimeType('photo.png'), 'image/png');
      assert.equal(getMimeType('photo.webp'), 'image/webp');
      assert.equal(getMimeType('doc.pdf'), 'application/octet-stream');
    });
  });

  describe('4. API Gateway HTTP API v2 Event Translation', () => {
    it('translates GET /health into API Gateway v2 event and returns 200', (t, done) => {
      const { req, res } = createMockHttp({
        method: 'GET',
        url: '/health',
      });

      res.on('finish', () => {
        assert.equal(res.statusCode, 200);
        const data = JSON.parse(res.body);
        assert.equal(data.ok, true);
        assert.equal(data.service, 'swadesh-api');
        assert.ok(res.getHeader('access-control-allow-origin'));
        done();
      });

      handleRequest(req, res);
      req.send();
    });

    it('translates POST /login with body and query parameters', (t, done) => {
      const { req, res } = createMockHttp({
        method: 'POST',
        url: '/login?test=1',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:5173',
        },
        body: {
          name: 'Sunita Rao',
          email: 'sunita.rao@example.com',
          role: 'citizen',
        },
      });

      res.on('finish', () => {
        assert.equal(res.statusCode, 200);
        const data = JSON.parse(res.body);
        assert.ok(data.token);
        assert.equal(data.user.email, 'sunita.rao@example.com');
        done();
      });

      handleRequest(req, res);
      req.send();
    });
  });
});
