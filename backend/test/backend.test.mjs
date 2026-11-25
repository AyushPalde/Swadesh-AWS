import './setup.mjs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { validateConfig } from '../src/config.mjs';
import { AppError, badRequest, unauthorized, forbidden, notFound, conflict, internalError } from '../src/lib/errors.mjs';
import { json } from '../src/lib/response.mjs';
import { logger } from '../src/lib/logger.mjs';
import {
  validateLogin,
  validateUploadUrl,
  validateCreateIssue,
  validateStatusUpdate,
  validateAssignIssue,
  assertValid,
} from '../src/lib/validate.mjs';
import { Router, router } from '../src/router.mjs';
import { handler } from '../src/index.mjs';

describe('1. Configuration & Environment Validator (config.mjs)', () => {
  it('successfully validates complete and valid environment variables', () => {
    const validEnv = {
      ISSUES_TABLE: 'swadesh-issues-prod',
      USERS_TABLE: 'swadesh-users-prod',
      IMAGE_BUCKET: 'swadesh-images-prod',
      JWT_SECRET: 'super-secret-jwt-token-key',
      AUTHORITY_PASSCODE: 'swadesh-officer-2026',
      DATA_STORE: 'dynamo',
      S3_MODE: 'aws',
      LOG_LEVEL: 'DEBUG',
    };

    const cfg = validateConfig(validEnv);
    assert.equal(cfg.ISSUES_TABLE, 'swadesh-issues-prod');
    assert.equal(cfg.USERS_TABLE, 'swadesh-users-prod');
    assert.equal(cfg.DATA_STORE, 'dynamo');
    assert.equal(cfg.S3_MODE, 'aws');
    assert.equal(cfg.LOG_LEVEL, 'DEBUG');
    assert.equal(cfg.AWS_REGION, 'us-east-1');
  });

  it('fails fast when required environment variables are missing', () => {
    assert.throws(
      () => validateConfig({}),
      /Configuration error: Missing required environment variable\(s\): ISSUES_TABLE, USERS_TABLE/
    );
  });

  it('fails fast when DATA_STORE has an invalid value', () => {
    const invalidEnv = {
      ISSUES_TABLE: 'tbl',
      USERS_TABLE: 'tbl',
      IMAGE_BUCKET: 'bkt',
      JWT_SECRET: 'sec',
      AUTHORITY_PASSCODE: 'pass',
      DATA_STORE: 'redis', // invalid
      S3_MODE: 'aws',
      LOG_LEVEL: 'INFO',
    };

    assert.throws(
      () => validateConfig(invalidEnv),
      /Configuration error: Invalid DATA_STORE 'redis'/
    );
  });

  it('fails fast when S3_MODE has an invalid value', () => {
    const invalidEnv = {
      ISSUES_TABLE: 'tbl',
      USERS_TABLE: 'tbl',
      IMAGE_BUCKET: 'bkt',
      JWT_SECRET: 'sec',
      AUTHORITY_PASSCODE: 'pass',
      DATA_STORE: 'dynamo',
      S3_MODE: 'azure-blob', // invalid
      LOG_LEVEL: 'INFO',
    };

    assert.throws(
      () => validateConfig(invalidEnv),
      /Configuration error: Invalid S3_MODE 'azure-blob'/
    );
  });

  it('fails fast when LOG_LEVEL has an invalid value', () => {
    const invalidEnv = {
      ISSUES_TABLE: 'tbl',
      USERS_TABLE: 'tbl',
      IMAGE_BUCKET: 'bkt',
      JWT_SECRET: 'sec',
      AUTHORITY_PASSCODE: 'pass',
      DATA_STORE: 'memory',
      S3_MODE: 'local',
      LOG_LEVEL: 'VERBOSE', // invalid
    };

    assert.throws(
      () => validateConfig(invalidEnv),
      /Configuration error: Invalid LOG_LEVEL 'VERBOSE'/
    );
  });
});

describe('2. Error Models & Response Helpers (errors.mjs & response.mjs)', () => {
  it('creates AppError with correct status codes and Blueprint shapes', () => {
    const err = badRequest('Invalid title', [{ field: 'title', message: 'Too short' }]);
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'VALIDATION_ERROR');
    assert.deepEqual(err.details, [{ field: 'title', message: 'Too short' }]);

    const jsonFormat = err.toBlueprintJson();
    assert.deepEqual(jsonFormat, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid title',
        details: [{ field: 'title', message: 'Too short' }],
      },
    });

    assert.equal(unauthorized().statusCode, 401);
    assert.equal(unauthorized().code, 'UNAUTHORIZED');

    assert.equal(forbidden().statusCode, 403);
    assert.equal(forbidden().code, 'FORBIDDEN');

    assert.equal(notFound().statusCode, 404);
    assert.equal(notFound().code, 'NOT_FOUND');

    assert.equal(conflict().statusCode, 409);
    assert.equal(conflict().code, 'INVALID_TRANSITION');

    assert.equal(internalError().statusCode, 500);
    assert.equal(internalError().code, 'INTERNAL_ERROR');
  });

  it('json() produces HTTP API v2 response envelope', () => {
    const res = json(201, { issueId: 'iss_123' });
    assert.equal(res.statusCode, 201);
    assert.equal(res.headers['content-type'], 'application/json');
    assert.equal(res.body, JSON.stringify({ issueId: 'iss_123' }));
  });
});

describe('3. Hand-written Validators (validate.mjs)', () => {
  it('validates POST /login body', () => {
    const badLogin = validateLogin({});
    assert.ok(badLogin.some((d) => d.field === 'name'));
    assert.ok(badLogin.some((d) => d.field === 'email'));
    assert.ok(badLogin.some((d) => d.field === 'role'));

    const authorityMissingPass = validateLogin({
      name: 'JE Nilesh',
      email: 'nilesh@bmc.gov.in',
      role: 'authority',
    });
    assert.ok(authorityMissingPass.some((d) => d.field === 'passcode'));

    const goodCitizen = validateLogin({
      name: 'Asha Patil',
      email: 'asha@example.com',
      role: 'citizen',
    });
    assert.equal(goodCitizen.length, 0);
  });

  it('validates POST /upload-url body', () => {
    const badUpload = validateUploadUrl({ fileName: '', contentType: 'image/gif' });
    assert.ok(badUpload.some((d) => d.field === 'fileName'));
    assert.ok(badUpload.some((d) => d.field === 'contentType'));

    const goodUpload = validateUploadUrl({ fileName: 'pothole.jpg', contentType: 'image/jpeg' });
    assert.equal(goodUpload.length, 0);
  });

  it('validates POST /issues body (title 5-100, description 10-1000, address required)', () => {
    const badIssue = validateCreateIssue({
      title: 'Poth', // too short (<5)
      description: 'Short', // too short (<10)
      category: 'INVALID_CAT',
      location: {}, // missing address
    });

    assert.ok(badIssue.some((d) => d.field === 'title'));
    assert.ok(badIssue.some((d) => d.field === 'description'));
    assert.ok(badIssue.some((d) => d.field === 'category'));
    assert.ok(badIssue.some((d) => d.field === 'location.address'));

    const goodIssue = validateCreateIssue({
      title: 'Deep crater on SV Road',
      description: 'Water has accumulated inside large asphalt pothole causing traffic slowdown.',
      category: 'POTHOLE',
      location: {
        address: 'SV Road, Andheri West',
        lat: 19.1197,
        lng: 72.8468,
      },
    });
    assert.equal(goodIssue.length, 0);
  });

  it('validates PATCH /issues/{id}/status rules', () => {
    // VERIFIED requires priority
    const verifyWithoutPriority = validateStatusUpdate({ status: 'VERIFIED' });
    assert.ok(verifyWithoutPriority.some((d) => d.field === 'priority'));

    // REJECTED requires note
    const rejectWithoutNote = validateStatusUpdate({ status: 'REJECTED' });
    assert.ok(rejectWithoutNote.some((d) => d.field === 'note'));

    // RESOLVED requires note
    const resolveWithoutNote = validateStatusUpdate({ status: 'RESOLVED' });
    assert.ok(resolveWithoutNote.some((d) => d.field === 'note'));

    const goodVerify = validateStatusUpdate({ status: 'VERIFIED', priority: 'HIGH' });
    assert.equal(goodVerify.length, 0);
  });

  it('validates POST /issues/{id}/assign rules', () => {
    const badAssign = validateAssignIssue({ department: 'INVALID', assignedTo: 'A' });
    assert.ok(badAssign.some((d) => d.field === 'department'));
    assert.ok(badAssign.some((d) => d.field === 'assignedTo'));

    const goodAssign = validateAssignIssue({ department: 'ROADS', assignedTo: 'Gangman Crew Alpha-4' });
    assert.equal(goodAssign.length, 0);
  });

  it('assertValid throws badRequest on errors', () => {
    assert.throws(
      () => assertValid([{ field: 'title', message: 'Required' }]),
      (err) => err instanceof AppError && err.statusCode === 400 && err.code === 'VALIDATION_ERROR'
    );
  });
});

describe('4. Router (router.mjs)', () => {
  it('registers routes and matches path parameters correctly', async () => {
    const testRouter = new Router();
    let capturedReq = null;

    testRouter.register('POST', '/issues/{id}/upvote', async (req) => {
      capturedReq = req;
      return json(200, { upvoted: true, id: req.params.id });
    });

    const res = await testRouter.handle({
      method: 'POST',
      path: '/issues/iss_8f3a1c2b9d04/upvote',
      query: { ref: 'feed' },
      body: null,
      headers: { authorization: 'Bearer token123' },
      requestId: 'req-test-1',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(capturedReq.params.id, 'iss_8f3a1c2b9d04');
    assert.equal(capturedReq.query.ref, 'feed');
    assert.equal(capturedReq.headers.authorization, 'Bearer token123');
    assert.equal(capturedReq.requestId, 'req-test-1');
  });

  it('throws 404 NOT_FOUND for unknown routes', async () => {
    const testRouter = new Router();
    await assert.rejects(
      async () => {
        await testRouter.handle({
          method: 'GET',
          path: '/unknown/endpoint',
          requestId: 'req-404',
        });
      },
      (err) => err instanceof AppError && err.statusCode === 404 && err.code === 'NOT_FOUND'
    );
  });
});

describe('5. AWS Lambda Handler (index.mjs)', () => {
  it('executes GET /health successfully with payload format 2.0', async () => {
    const event = {
      rawPath: '/health',
      requestContext: {
        http: {
          method: 'GET',
          path: '/health',
        },
        requestId: 'aws-req-health-1',
      },
      headers: {
        accept: 'application/json',
      },
    };

    const res = await handler(event);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/json');

    const parsed = JSON.parse(res.body);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.service, 'swadesh-api');
    assert.ok(parsed.time);
  });

  it('handles 404 NOT_FOUND for unmapped route in Blueprint error shape', async () => {
    const event = {
      rawPath: '/api/v1/non-existent',
      requestContext: {
        http: {
          method: 'GET',
          path: '/api/v1/non-existent',
        },
        requestId: 'aws-req-404-1',
      },
    };

    const res = await handler(event);
    assert.equal(res.statusCode, 404);
    const parsed = JSON.parse(res.body);
    assert.equal(parsed.error.code, 'NOT_FOUND');
    assert.ok(parsed.error.message);
  });

  it('handles malformed JSON body with 400 VALIDATION_ERROR', async () => {
    const event = {
      rawPath: '/health',
      requestContext: {
        http: {
          method: 'POST',
          path: '/health',
        },
        requestId: 'aws-req-bad-json',
      },
      headers: {
        'content-type': 'application/json',
      },
      body: '{ this is not valid json',
    };

    const res = await handler(event);
    assert.equal(res.statusCode, 400);
    const parsed = JSON.parse(res.body);
    assert.equal(parsed.error.code, 'VALIDATION_ERROR');
    assert.match(parsed.error.message, /JSON/i);
  });

  it('handles base64 encoded payload correctly', async () => {
    // Register temporary test route
    router.register('POST', '/test-base64', async (req) => {
      return json(200, { received: req.body });
    });

    const payload = JSON.stringify({ hello: 'mumbai' });
    const b64 = Buffer.from(payload).toString('base64');

    const event = {
      rawPath: '/test-base64',
      requestContext: {
        http: {
          method: 'POST',
          path: '/test-base64',
        },
        requestId: 'aws-req-b64-1',
      },
      headers: {
        'content-type': 'application/json',
      },
      isBase64Encoded: true,
      body: b64,
    };

    const res = await handler(event);
    assert.equal(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.deepEqual(parsed.received, { hello: 'mumbai' });
  });

  it('shields internal unexpected crashes and returns generic 500 INTERNAL_ERROR', async () => {
    // Register a route that throws an unhandled raw Error
    router.register('GET', '/test-crash', async () => {
      throw new Error('Database connection pool timeout: secret_db_password_123');
    });

    const event = {
      rawPath: '/test-crash',
      requestContext: {
        http: {
          method: 'GET',
          path: '/test-crash',
        },
        requestId: 'aws-req-crash-1',
      },
    };

    const res = await handler(event);
    assert.equal(res.statusCode, 500);
    const parsed = JSON.parse(res.body);

    // Verifies no internal sensitive information is leaked
    assert.equal(parsed.error.code, 'INTERNAL_ERROR');
    assert.equal(parsed.error.message, 'Internal server error');
    assert.equal(parsed.error.details, undefined);
    assert.equal(res.body.includes('secret_db_password_123'), false);
  });
});

