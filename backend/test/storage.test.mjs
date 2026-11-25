import './setup.mjs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeFileName,
  generateImageKey,
  createUploadUrl,
  getImageUrl,
  setPresigner,
} from '../src/lib/storage.mjs';
import { signToken } from '../src/lib/auth.mjs';
import { handler } from '../src/index.mjs';
import { AppError } from '../src/lib/errors.mjs';
import { config } from '../src/config.mjs';

describe('SWADESH Storage & Presigned URLs (storage.mjs)', () => {
  describe('1. Filename Sanitization (sanitizeFileName)', () => {
    it('preserves clean standard filenames', () => {
      assert.equal(sanitizeFileName('pothole_view.jpg'), 'pothole_view.jpg');
      assert.equal(sanitizeFileName('street-light-broken.png'), 'street-light-broken.png');
      assert.equal(sanitizeFileName('water_leakage.webp'), 'water_leakage.webp');
    });

    it('strips directory traversal paths', () => {
      assert.equal(sanitizeFileName('../../etc/passwd'), 'passwd');
      assert.equal(sanitizeFileName('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe');
      assert.equal(sanitizeFileName('/root/var/log/syslog.png'), 'syslog.png');
    });

    it('sanitizes special characters, punctuation, and spaces', () => {
      assert.equal(
        sanitizeFileName('crater on link road #1 (urgent)!.PNG'),
        'crater_on_link_road_1_urgent_.PNG'
      );
      assert.equal(sanitizeFileName('pothole<script>alert(1)</script>.jpg'), 'script_.jpg');
      assert.equal(sanitizeFileName('pothole_script_alert(1).jpg'), 'pothole_script_alert_1_.jpg');
    });

    it('strips leading dots and collapses consecutive periods', () => {
      assert.equal(sanitizeFileName('...hidden..photo.jpeg'), 'hidden.photo.jpeg');
      assert.equal(sanitizeFileName('.bashrc'), 'bashrc');
    });

    it('falls back to safe default for empty or malicious inputs', () => {
      assert.equal(sanitizeFileName(''), 'photo.jpg');
      assert.equal(sanitizeFileName('   '), 'photo.jpg');
      assert.equal(sanitizeFileName(null), 'photo.jpg');
      assert.equal(sanitizeFileName(undefined), 'photo.jpg');
      assert.equal(sanitizeFileName('...'), 'photo.jpg');
      assert.equal(sanitizeFileName('///'), 'photo.jpg');
    });
  });

  describe('2. Storage Key Generation (generateImageKey)', () => {
    it('generates a safe key adhering to Blueprint: issues/<12-hex-id>/<filename>', () => {
      const key = generateImageKey('broken_pipe.jpg');
      assert.match(key, /^issues\/[a-f0-9]{12}\/broken_pipe\.jpg$/);
    });

    it('sanitizes the filename component within the generated key', () => {
      const key = generateImageKey('../../dangerous file & name!.png');
      assert.match(key, /^issues\/[a-f0-9]{12}\/dangerous_file_name_\.png$/);
    });
  });

  describe('3. Content-Type Validation & Rejection', () => {
    it('accepts allowed image types (image/jpeg, image/png, image/webp)', async () => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      for (const ct of allowed) {
        const res = await createUploadUrl({
          userId: 'u_123456789012',
          fileName: 'test.jpg',
          contentType: ct,
        });
        assert.ok(res.uploadUrl);
        assert.ok(res.imageKey);
      }
    });

    it('rejects disallowed image and document types with 400 VALIDATION_ERROR', async () => {
      const disallowed = [
        'image/gif',
        'image/bmp',
        'image/svg+xml',
        'application/pdf',
        'text/plain',
        'application/octet-stream',
        '',
        null,
        undefined,
      ];

      for (const ct of disallowed) {
        await assert.rejects(
          () =>
            createUploadUrl({
              userId: 'u_123456789012',
              fileName: 'file.ext',
              contentType: ct,
            }),
          (err) => {
            assert.ok(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert.equal(err.code, 'VALIDATION_ERROR');
            assert.ok(err.details.some((d) => d.field === 'contentType'));
            return true;
          }
        );
      }
    });
  });

  describe('4. Local S3 Mode Behavior (S3_MODE === "local")', () => {
    it('createUploadUrl returns http://localhost:3001/local-upload/<key> without AWS calls', async () => {
      const res = await createUploadUrl({
        userId: 'u_test_user_1',
        fileName: 'pothole_evidence.png',
        contentType: 'image/png',
      });

      assert.equal(res.uploadUrl, `http://localhost:3001/local-upload/${res.imageKey}`);
      assert.match(res.imageKey, /^issues\/[a-f0-9]{12}\/pothole_evidence\.png$/);
    });

    it('getImageUrl returns http://localhost:3001/local-files/<key> without AWS calls', async () => {
      const imageKey = 'issues/a1b2c3d4e5f6/photo.jpg';
      const url = await getImageUrl(imageKey);
      assert.equal(url, 'http://localhost:3001/local-files/issues/a1b2c3d4e5f6/photo.jpg');
    });

    it('getImageUrl returns null when imageKey is absent or empty', async () => {
      assert.equal(await getImageUrl(null), null);
      assert.equal(await getImageUrl(''), null);
      assert.equal(await getImageUrl(undefined), null);
    });

    it('getImageUrl passes through existing external URLs unchanged', async () => {
      const external = 'https://picsum.photos/seed/123/800/600';
      assert.equal(await getImageUrl(external), external);
    });
  });

  describe('5. AWS S3 Presigner Mode (Mocked Presigner)', () => {
    it('calls getSignedUrl with 5-minute expiry (300s) and bound ContentType for upload', async () => {
      let capturedCommand = null;
      let capturedOptions = null;

      setPresigner(async (client, command, options) => {
        capturedCommand = command;
        capturedOptions = options;
        return `https://s3.us-east-1.amazonaws.com/${command.input.Bucket}/${command.input.Key}?signature=mock123`;
      });

      try {
        const res = await createUploadUrl({
          userId: 'u_test_aws_user',
          fileName: 'hazardous_wire.jpg',
          contentType: 'image/jpeg',
          s3Mode: 'aws',
        });

        assert.equal(capturedCommand.input.Bucket, config.IMAGE_BUCKET);
        assert.equal(capturedCommand.input.ContentType, 'image/jpeg');
        assert.equal(capturedCommand.input.Key, res.imageKey);
        assert.equal(capturedOptions.expiresIn, 300);
        assert.match(res.uploadUrl, /^https:\/\/s3\.us-east-1\.amazonaws\.com/);
      } finally {
        setPresigner(null);
      }
    });

    it('calls getSignedUrl with 1-hour expiry (3600s) for viewing photo', async () => {
      let capturedCommand = null;
      let capturedOptions = null;

      setPresigner(async (client, command, options) => {
        capturedCommand = command;
        capturedOptions = options;
        return `https://s3.us-east-1.amazonaws.com/${command.input.Bucket}/${command.input.Key}?signature=view123`;
      });

      try {
        const imageKey = 'issues/1234567890ab/pothole.png';
        const url = await getImageUrl(imageKey, 'aws');

        assert.equal(capturedCommand.input.Bucket, config.IMAGE_BUCKET);
        assert.equal(capturedCommand.input.Key, imageKey);
        assert.equal(capturedOptions.expiresIn, 3600);
        assert.match(url, /^https:\/\/s3\.us-east-1\.amazonaws\.com/);
      } finally {
        setPresigner(null);
      }
    });
  });

  describe('5. POST /upload-url Endpoint Routing & Authentication', () => {
    const validCitizenToken = signToken({
      userId: 'u_test_asha_patil',
      name: 'Asha Patil',
      role: 'citizen',
    });

    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const event = {
        rawPath: '/upload-url',
        requestContext: {
          http: { method: 'POST', path: '/upload-url' },
          requestId: 'req-auth-fail',
        },
        body: JSON.stringify({
          fileName: 'pothole.jpg',
          contentType: 'image/jpeg',
        }),
      };

      const res = await handler(event);
      assert.equal(res.statusCode, 401);
      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'UNAUTHORIZED');
    });

    it('rejects requests with invalid body parameters with 400 VALIDATION_ERROR', async () => {
      const event = {
        rawPath: '/upload-url',
        requestContext: {
          http: { method: 'POST', path: '/upload-url' },
          requestId: 'req-valid-fail',
        },
        headers: {
          authorization: `Bearer ${validCitizenToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fileName: '', // Missing
          contentType: 'image/gif', // Disallowed
        }),
      };

      const res = await handler(event);
      assert.equal(res.statusCode, 400);
      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error.code, 'VALIDATION_ERROR');
      assert.ok(parsed.error.details.length >= 2);
    });

    it('successfully generates uploadUrl and imageKey for authenticated citizen', async () => {
      const event = {
        rawPath: '/upload-url',
        requestContext: {
          http: { method: 'POST', path: '/upload-url' },
          requestId: 'req-upload-success',
        },
        headers: {
          authorization: `Bearer ${validCitizenToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fileName: 'andheri_subway_crater.jpg',
          contentType: 'image/jpeg',
        }),
      };

      const res = await handler(event);
      assert.equal(res.statusCode, 200);

      const parsed = JSON.parse(res.body);
      assert.ok(parsed.uploadUrl);
      assert.ok(parsed.imageKey);
      assert.match(parsed.imageKey, /^issues\/[a-f0-9]{12}\/andheri_subway_crater\.jpg$/);
      assert.equal(parsed.uploadUrl, `http://localhost:3001/local-upload/${parsed.imageKey}`);
    });
  });
});
