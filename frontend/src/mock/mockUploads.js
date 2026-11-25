/**
 * Mock Uploads Service
 * Conforms to docs/BLUEPRINT.md (Section 6)
 */
import { simulateLatency } from './mockStore.js';
import { ApiError } from '../api/client.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function getUploadUrl({ fileName, contentType } = {}) {
  await simulateLatency(150, 300);

  if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Only JPEG, PNG, or WebP images are allowed', [
      { field: 'contentType', message: 'Supported: image/jpeg, image/png, image/webp' },
    ]);
  }

  const safeName = (fileName || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const imageKey = `issues/mock_${Date.now()}/${safeName}`;
  const uploadUrl = `https://mock-s3.swadesh.local/${imageKey}?presigned=true`;

  return {
    uploadUrl,
    imageKey,
  };
}

export async function uploadImage(file) {
  await simulateLatency(300, 600);

  if (!file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided for upload');
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Only JPEG, PNG, or WebP images are allowed');
  }

  if (file.size && file.size > MAX_SIZE_BYTES) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Image file exceeds 5 MB limit');
  }

  // Generate object URL for browser preview or mock path
  let objectUrl = `https://picsum.photos/seed/user_upload_${Date.now()}/800/600`;
  if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // Fallback
    }
  }

  // Return the object URL as specified for the mock upload layer
  return objectUrl;
}
