/**
 * SWADESH Local Development Server
 * Port: 3001 (or PORT env var)
 *
 * Capabilities:
 * 1. Simulates Amazon API Gateway HTTP API v2.0 execution locally.
 * 2. Translates Node http.IncomingMessage -> API Gateway v2 event payload.
 * 3. Invokes the actual Lambda `handler` from `../src/index.mjs`.
 * 4. Adds permissive CORS for frontend dev server at http://localhost:5173 (incl. OPTIONS preflight).
 * 5. In S3 local mode (S3_MODE=local):
 *    - PUT /local-upload/* -> saves file under backend/.local-uploads/
 *    - GET /local-files/*  -> streams file back to client
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handler } from '../src/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(__dirname, '..');
export const UPLOADS_DIR = path.resolve(BACKEND_ROOT, '.local-uploads');
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Injects permissive CORS headers for local Vite development.
 *
 * @param {http.ServerResponse} res
 * @param {string | undefined} [origin='http://localhost:5173']
 */
export function setCorsHeaders(res, origin = 'http://localhost:5173') {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Maps common image file extensions to standard MIME types.
 *
 * @param {string} filePath
 * @returns {string}
 */
export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Core Request Listener handling CORS, local uploads/files, and API Gateway v2 event conversion.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
export function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3001'}`);
  const pathname = parsedUrl.pathname;
  const origin = req.headers.origin || 'http://localhost:5173';

  // 1. Handle OPTIONS CORS Preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    res.statusCode = 204;
    res.end();
    return;
  }

  // 2. Handle Local S3 Uploads (PUT /local-upload/*)
  if (req.method === 'PUT' && pathname.startsWith('/local-upload/')) {
    const rawKey = decodeURIComponent(pathname.slice('/local-upload/'.length));

    // Guard against directory traversal
    if (rawKey.includes('..')) {
      setCorsHeaders(res, origin);
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'FORBIDDEN', message: 'Directory traversal forbidden' },
        })
      );
      return;
    }

    const safeKey = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, '');
    const targetPath = path.resolve(UPLOADS_DIR, safeKey);

    if (!targetPath.startsWith(UPLOADS_DIR)) {
      setCorsHeaders(res, origin);
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'FORBIDDEN', message: 'Forbidden upload path' },
        })
      );
      return;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      setCorsHeaders(res, origin);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ok: true,
          message: 'File uploaded successfully',
          key: safeKey,
        })
      );
    });

    writeStream.on('error', (err) => {
      setCorsHeaders(res, origin);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: err.message },
        })
      );
    });
    return;
  }

  // 3. Handle Local S3 Downloads (GET /local-files/*)
  if (req.method === 'GET' && pathname.startsWith('/local-files/')) {
    const rawKey = decodeURIComponent(pathname.slice('/local-files/'.length));

    // Guard against directory traversal
    if (rawKey.includes('..')) {
      setCorsHeaders(res, origin);
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'FORBIDDEN', message: 'Directory traversal forbidden' },
        })
      );
      return;
    }

    const safeKey = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, '');
    const targetPath = path.resolve(UPLOADS_DIR, safeKey);

    if (!targetPath.startsWith(UPLOADS_DIR) || !fs.existsSync(targetPath)) {
      setCorsHeaders(res, origin);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'NOT_FOUND', message: 'File not found' },
        })
      );
      return;
    }

    setCorsHeaders(res, origin);
    res.statusCode = 200;
    res.setHeader('Content-Type', getMimeType(targetPath));

    const readStream = fs.createReadStream(targetPath);
    readStream.pipe(res);
    return;
  }

  // 4. Translate Standard HTTP Request -> AWS Lambda API Gateway v2.0 Event
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));

  req.on('end', async () => {
    const rawBodyBuffer = Buffer.concat(chunks);
    const rawBody = rawBodyBuffer.length > 0 ? rawBodyBuffer.toString('utf-8') : null;

    // Normalize headers to lowercase keys
    const lowerCasedHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      lowerCasedHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(',') : value;
    }

    // Extract query parameters
    const queryStringParameters = {};
    for (const [key, value] of parsedUrl.searchParams.entries()) {
      queryStringParameters[key] = value;
    }

    // Build event matching API Gateway HTTP API payload format version 2.0
    const event = {
      version: '2.0',
      routeKey: '$default',
      rawPath: pathname,
      rawQueryString: parsedUrl.search ? parsedUrl.search.slice(1) : '',
      headers: lowerCasedHeaders,
      queryStringParameters,
      requestContext: {
        http: {
          method: req.method.toUpperCase(),
          path: pathname,
          protocol: 'HTTP/1.1',
          sourceIp: req.socket?.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'swadesh-dev-server',
        },
        requestId: `req-dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timeEpoch: Date.now(),
      },
      body: rawBody,
      isBase64Encoded: false,
    };

    try {
      const response = await handler(event, {});

      setCorsHeaders(res, origin);

      if (response?.headers) {
        for (const [headerName, headerVal] of Object.entries(response.headers)) {
          if (!headerName.toLowerCase().startsWith('access-control-')) {
            res.setHeader(headerName, headerVal);
          }
        }
      }

      res.statusCode = response?.statusCode || 200;
      res.end(response?.body || '');
    } catch (err) {
      setCorsHeaders(res, origin);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message,
          },
        })
      );
    }
  });
}

export const server = http.createServer(handleRequest);

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectExecution) {
  server.listen(PORT, () => {
    console.log(`\n🚀 SWADESH Backend Dev Server listening at http://localhost:${PORT}`);
    console.log(`   - Data Store: ${process.env.DATA_STORE || 'memory'}`);
    console.log(`   - S3 Storage: ${process.env.S3_MODE || 'local'} (${UPLOADS_DIR})`);
    console.log(`   - Permissive CORS active for http://localhost:5173\n`);
  });
}

export default server;
