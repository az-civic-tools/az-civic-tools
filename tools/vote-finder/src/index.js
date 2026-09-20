/**
 * Vote Finder Worker — serves the static frontend (via the ASSETS binding)
 * and a small JSON API:
 *   GET  /api/config   — site copy + voter-guide links
 *   GET  /api/geocode  — address → coordinates, legislative district, city
 *   GET  /api/locate   — coordinates → legislative district, city
 *   POST /api/email    — email a voter their chosen site's schedule + guides
 *   GET  /guides/<slug> — voter guide PDFs from R2
 */
import { json, error } from './http.js';
import { publicConfig } from './config.js';
import { handleGeocode, handleLocate } from './geocode.js';
import { handleEmail } from './email.js';
import { handleGuide } from './guides.js';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

const withHeaders = (response, headers) => {
  const out = new Response(response.body, response);
  Object.entries(headers).forEach(([k, v]) => out.headers.set(k, v));
  return out;
};

const routeApi = async (request, env, pathname) => {
  const method = request.method;
  if (pathname === '/api/config' && method === 'GET') {
    return json(publicConfig(), 200, { 'cache-control': 'public, max-age=300' });
  }
  if (pathname === '/api/geocode' && method === 'GET') return handleGeocode(request, env);
  if (pathname === '/api/locate' && method === 'GET') return handleLocate(request, env);
  if (pathname === '/api/email' && method === 'POST') return handleEmail(request, env);
  if (pathname === '/api/health') return json({ ok: true });
  return error('Not found', 404);
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname.startsWith('/api/')) {
        return withHeaders(await routeApi(request, env, pathname), SECURITY_HEADERS);
      }
      if (pathname.startsWith('/guides/')) {
        return withHeaders(await handleGuide(request, env, pathname), SECURITY_HEADERS);
      }
      const asset = await env.ASSETS.fetch(request);
      return withHeaders(asset, SECURITY_HEADERS);
    } catch (err) {
      console.error(`Unhandled error on ${request.method} ${pathname}`, err);
      return error('Something went wrong on our end. Please try again.', 500);
    }
  },
};
