import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler } from './dist/server/entry.mjs';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 4321);
const clientRoot = fileURLToPath(new URL('./dist/client/', import.meta.url));
const canonicalOrigin = 'https://fullmuscle-equipment.com';
const canonicalHost = 'fullmuscle-equipment.com';
const redirectHosts = new Set([
  'www.fullmuscle-equipment.com',
  'fullmuscle-equipment.it',
  'www.fullmuscle-equipment.it',
]);

const contentTypes = new Map([
  ['.avif', 'image/avif'], ['.css', 'text/css; charset=utf-8'], ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'], ['.ico', 'image/x-icon'], ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'], ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.png', 'image/png'], ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'], ['.webp', 'image/webp'], ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function firstHeader(value) {
  return String(value || '').split(',')[0].trim();
}

function requestHost(request) {
  return firstHeader(request.headers['x-forwarded-host'] || request.headers.host).toLowerCase().replace(/:\d+$/, '');
}

function requestProtocol(request) {
  return firstHeader(request.headers['x-forwarded-proto']) || (request.socket.encrypted ? 'https' : 'http');
}

function redirectLocation(request) {
  if (process.env.PUBLIC_SITE_READY !== 'true') return undefined;
  const incomingHost = requestHost(request);
  const protocol = requestProtocol(request);
  if (!redirectHosts.has(incomingHost) && !(incomingHost === canonicalHost && protocol !== 'https')) return undefined;
  return new URL(request.url || '/', canonicalOrigin).toString();
}

function candidatesFor(pathname) {
  const relativePath = pathname.replace(/^\/+/, '');
  if (!relativePath || pathname.endsWith('/')) return [`${relativePath}index.html`];
  return [relativePath, `${relativePath}/index.html`];
}

async function serveStatic(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://local').pathname);
  } catch {
    return false;
  }
  for (const candidate of candidatesFor(pathname)) {
    const filePath = resolve(clientRoot, candidate);
    const childPath = relative(clientRoot, filePath);
    if (!childPath || childPath.startsWith('..') || isAbsolute(childPath)) continue;
    let details;
    try {
      details = await stat(filePath);
    } catch {
      continue;
    }
    if (!details.isFile()) continue;
    const etag = `W/\"${details.size.toString(16)}-${Math.trunc(details.mtimeMs).toString(16)}\"`;
    response.setHeader('Content-Type', contentTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream');
    response.setHeader('Content-Length', details.size);
    response.setHeader('Last-Modified', details.mtime.toUTCString());
    response.setHeader('ETag', etag);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', childPath.startsWith('_astro\\') || childPath.startsWith('_astro/')
      ? 'public, max-age=31536000, immutable'
      : extname(filePath) === '.html'
        ? 'public, max-age=0, must-revalidate'
        : 'public, max-age=3600');
    if (request.headers['if-none-match'] === etag) {
      response.statusCode = 304;
      response.end();
      return true;
    }
    response.statusCode = 200;
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath).on('error', (error) => response.destroy(error)).pipe(response);
    return true;
  }
  return false;
}

const server = createServer(async (request, response) => {
  try {
    const location = redirectLocation(request);
    if (location) {
      response.statusCode = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308;
      response.setHeader('Location', location);
      response.end();
      return;
    }
    if (await serveStatic(request, response)) return;
    await handler(request, response, (error) => {
      if (response.writableEnded) return;
      response.statusCode = error ? 500 : 404;
      response.end(error ? 'Internal Server Error' : 'Not Found');
    });
  } catch (error) {
    if (!response.headersSent) response.statusCode = 500;
    response.end('Internal Server Error');
    console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`FullMuscle server listening on http://${host}:${port}`);
});
