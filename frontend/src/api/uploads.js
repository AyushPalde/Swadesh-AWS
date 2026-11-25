/**
 * Uploads API Module
 * Conforms to docs/BLUEPRINT.md (Section 6)
 */
import client from './client.js';
import withMock from './adapter.js';
import * as mockUploads from '../mock/mockUploads.js';

/**
 * POST /upload-url (auth)
 * Requests an S3 pre-signed PUT URL.
 *
 * @param {Object} payload
 * @param {string} payload.fileName
 * @param {string} payload.contentType
 * @returns {Promise<{ uploadUrl: string, imageKey: string }>}
 */
export async function getUploadUrl(payload) {
  return withMock(
    () => client.post('/upload-url', payload),
    () => mockUploads.getUploadUrl(payload)
  );
}

/**
 * Uploads an image file to S3 storage.
 * - In real mode: requests presigned URL, then PUTs the file straight to it
 *   WITHOUT the Authorization header, and returns the imageKey.
 * - In mock mode: validates file and returns an object URL for preview.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>} imageKey (in real mode) or object URL (in mock mode)
 */
export async function uploadImage(file) {
  if (!file) {
    throw new Error('File is required for upload');
  }

  return withMock(
    async () => {
      const contentType = file.type || 'image/jpeg';
      const fileName = file.name || 'photo.jpg';

      // 1. Request presigned URL from API Gateway / Lambda
      const { uploadUrl, imageKey } = await getUploadUrl({ fileName, contentType });

      // 2. PUT directly to S3 without Authorization header
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error(`Direct S3 upload failed with HTTP status ${s3Response.status}`);
      }

      // 3. Return S3 imageKey for issue creation
      return imageKey;
    },
    () => mockUploads.uploadImage(file)
  );
}

export default {
  getUploadUrl,
  uploadImage,
};
