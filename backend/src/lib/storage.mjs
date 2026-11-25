/**
 * SWADESH S3 Object Storage & Presigned URL Service
 * Single Source of Truth: docs/BLUEPRINT.md (Sections 5 & 6)
 *
 * =========================================================================================
 * ARCHITECTURAL RATIONALE: WHY WE USE PRESIGNED URLs
 * =========================================================================================
 * 1. ZERO LAMBDA PAYLOAD BOTTLENECK:
 *    AWS API Gateway HTTP APIs enforce a strict 6 MB request payload size limit (and AWS Lambda
 *    has a 10 MB limit). If users uploaded multi-megabyte photos directly to Lambda, large uploads
 *    would fail or require expensive multipart memory buffering.
 *
 * 2. COST & COMPUTE EFFICIENCY:
 *    Lambda is billed on execution duration and allocated memory. By generating a presigned URL,
 *    the browser PUTs the image directly from the client to Amazon S3. Lambda executes in < 50ms
 *    to issue the ticket and consumes minimal compute resources.
 *
 * 3. SECURITY & LEAST PRIVILEGE:
 *    The S3 bucket remains COMPLETELY PRIVATE. We do not need public read or write access policies.
 *    The presigned PUT URL is cryptographically bound to a single safe key (`issues/<id>/<file>`),
 *    restricts the exact `ContentType`, and expires automatically in 5 minutes.
 * =========================================================================================
 */

import crypto from 'node:crypto';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '../config.mjs';
import { badRequest } from './errors.mjs';
import { VALID_IMAGE_CONTENT_TYPES } from './validate.mjs';

// Lazily initialized S3 Client (only instantiated when S3_MODE === 'aws')
let s3Client = null;

// Allow presigner injection for unit testing
let presignerFn = getSignedUrl;

export function setPresigner(fn) {
  presignerFn = fn || getSignedUrl;
}

export function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.AWS_REGION || 'us-east-1',
    });
  }
  return s3Client;
}

/**
 * Sanitizes an uploaded filename to prevent directory traversal and special character exploits.
 *
 * Examples:
 * - "../../etc/passwd" -> "passwd"
 * - "pothole road & street?.png" -> "pothole_road___street_.png"
 * - "..hidden..file.jpeg" -> "hidden.file.jpeg"
 *
 * @param {string} fileName
 * @returns {string} Sanitized, safe filename
 */
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return 'photo.jpg';
  }

  // 1. Extract basename to defeat path traversal attacks
  let base = path.basename(fileName).trim();

  // 2. Strip non-printable/control characters
  base = base.replace(/[\x00-\x1F\x7F]/g, '');

  // 3. Replace spaces, backslashes, slashes, and special characters with underscores
  base = base.replace(/[^a-zA-Z0-9._-]/g, '_');

  // 4. Strip leading dots (e.g. ".bashrc" or "../") to prevent hidden files
  base = base.replace(/^\.+/, '');

  // 5. Collapse multiple periods and underscores
  base = base.replace(/\.{2,}/g, '.').replace(/_+/g, '_');

  // 6. Non-empty fallback
  if (!base || base === '.' || base === '_') {
    return 'photo.jpg';
  }

  // 7. Limit length
  if (base.length > 80) {
    const ext = path.extname(base);
    const stem = path.basename(base, ext).slice(0, 70);
    base = `${stem}${ext}`;
  }

  return base;
}

/**
 * Generates an S3 storage key conforming to Blueprint Section 5:
 * "issues/<random-id>/<sanitised-filename>"
 *
 * @param {string} fileName
 * @returns {string}
 */
export function generateImageKey(fileName) {
  const randomId = crypto.randomBytes(6).toString('hex'); // 12 hex chars
  const safeName = sanitizeFileName(fileName);
  return `issues/${randomId}/${safeName}`;
}

/**
 * Creates a presigned PUT URL allowing the client browser to upload directly to S3.
 *
 * - Validates contentType is image/jpeg, image/png, or image/webp.
 * - Key structure: issues/<random-id>/<sanitised-filename>
 * - Presigned URL valid for 5 minutes (300 seconds).
 * - In local mode (config.S3_MODE === 'local'), returns http://localhost:3001/local-upload/<key>.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.fileName
 * @param {string} params.contentType
 * @returns {Promise<{ uploadUrl: string, imageKey: string }>}
 */
export async function createUploadUrl({ userId, fileName, contentType, s3Mode = config.S3_MODE }) {
  // 1. Validate content type
  if (!contentType || !VALID_IMAGE_CONTENT_TYPES.includes(contentType)) {
    throw badRequest(
      `Invalid image content-type '${contentType}'. Expected one of: ${VALID_IMAGE_CONTENT_TYPES.join(', ')}`,
      [
        {
          field: 'contentType',
          message: `ContentType must be one of: ${VALID_IMAGE_CONTENT_TYPES.join(', ')}`,
        },
      ]
    );
  }

  // 2. Generate safe storage key
  const imageKey = generateImageKey(fileName);

  // 3. Local Development Mode: No AWS calls made
  if (s3Mode === 'local') {
    return {
      uploadUrl: `http://localhost:3001/local-upload/${imageKey}`,
      imageKey,
    };
  }

  // 4. AWS S3 Mode: Generate presigned PUT URL valid for 5 minutes (300s)
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: config.IMAGE_BUCKET,
    Key: imageKey,
    ContentType: contentType,
  });

  const uploadUrl = await presignerFn(client, command, {
    expiresIn: 300, // 5 minutes
  });

  return {
    uploadUrl,
    imageKey,
  };
}

/**
 * Generates a presigned GET URL for viewing an issue photo.
 *
 * - Returns null when imageKey is absent or empty.
 * - In local mode, returns http://localhost:3001/local-files/<key>.
 * - In AWS mode, returns presigned GET URL valid for 1 hour (3600 seconds).
 *
 * @param {string | null | undefined} imageKey
 * @returns {Promise<string | null>}
 */
export async function getImageUrl(imageKey, s3Mode = config.S3_MODE) {
  if (!imageKey || typeof imageKey !== 'string' || !imageKey.trim()) {
    return null;
  }

  const trimmed = imageKey.trim();

  // If already an absolute URL (e.g. Picsum photo or external image)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Local development mode
  if (s3Mode === 'local') {
    return `http://localhost:3001/local-files/${trimmed}`;
  }

  // AWS S3 mode: presigned GET URL valid for 1 hour (3600s)
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: config.IMAGE_BUCKET,
    Key: trimmed,
  });

  return await presignerFn(client, command, {
    expiresIn: 3600, // 1 hour
  });
}

export default {
  createUploadUrl,
  getImageUrl,
  sanitizeFileName,
  generateImageKey,
  getS3Client,
};
