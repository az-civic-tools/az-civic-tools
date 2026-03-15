/**
 * Cactus Auth — Central Authentication Worker
 *
 * OAuth + Magic Link auth service for cactus.watch apps.
 * Routes:
 *   GET  /login                  — serve login page
 *   GET  /auth/:provider         — start OAuth redirect
 *   GET  /callback/:provider     — OAuth callback
 *   POST /api/magic-link/send    — send OTP email
 *   POST /api/magic-link/verify  — verify OTP code
 *   POST /api/exchange           — code-for-token exchange
 *   GET  /api/me                 — current user from session
 *   POST /api/logout             — destroy session
 *   GET  /api/health             — uptime check
 *   GET  /.well-known/jwks.json  — public key for JWT verification
 */

import { buildConfig } from './config.js';
import { checkGeneralRateLimit } from './rate-limit.js';
import { handleLogin } from './routes/login.js';
import { handleCallback } from './routes/callback.js';
import { handleMagicLinkSend } from './routes/magic-link-send.js';
import { handleMagicLinkVerify } from './routes/magic-link-verify.js';
import { handleExchange } from './routes/exchange.js';
import { handleMe } from './routes/me.js';
import { handleLogout } from './routes/logout.js';
import { buildAuthUrl } from './auth/oauth/base.js';
import { getGoogleConfig } from './auth/oauth/google.js';
import { getJwks } from './auth/jwt.js';
import { encryptState } from './routes/state.js';

/** Startup timestamp for /api/health */
const STARTED_AT = new Date().toISOString();

export default {
  async fetch(request, env) {
    // Build config from env (validates secrets in production)
    let config;
    try {
      config = buildConfig(env);
    } catch (err) {
      console.error('Config error:', err.message);
      return Response.json(
        { error: 'Service misconfigured' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return handleCorsPreFlight(request, env);
    }

    // General rate limit (all non-OPTIONS)
    const rateLimited = await checkGeneralRateLimit(request, env);
    if (rateLimited) return addCorsHeaders(rateLimited, request, env);

    try {
      let response;

      // --- HTML routes ---
      if (path === '/login' && method === 'GET') {
        response = await handleLogin(request, env, config);
      }

      // --- OAuth flow ---
      else if (path.match(/^\/auth\/[a-z]+$/) && method === 'GET') {
        const provider = path.split('/').pop();
        response = await handleAuthRedirect(request, env, config, provider);
      }
      else if (path.match(/^\/callback\/[a-z]+$/) && method === 'GET') {
        const provider = path.split('/').pop();
        response = await handleCallback(request, env, config, provider);
      }

      // --- Magic Link ---
      else if (path === '/api/magic-link/send' && method === 'POST') {
        response = await handleMagicLinkSend(request, env, config);
      }
      else if (path === '/api/magic-link/verify' && method === 'POST') {
        response = await handleMagicLinkVerify(request, env, config);
      }

      // --- Token exchange ---
      else if (path === '/api/exchange' && method === 'POST') {
        response = await handleExchange(request, env, config);
      }

      // --- Session ---
      else if (path === '/api/me' && method === 'GET') {
        response = await handleMe(request, env);
      }
      else if (path === '/api/logout' && method === 'POST') {
        response = await handleLogout(request, env, config);
      }

      // --- Public endpoints ---
      else if (path === '/api/health' && method === 'GET') {
        response = Response.json({
          status: 'ok',
          service: 'cactus-auth',
          started_at: STARTED_AT,
          timestamp: new Date().toISOString(),
        });
      }
      else if (path === '/.well-known/jwks.json' && method === 'GET') {
        const jwks = await getJwks(config);
        response = Response.json(jwks, {
          headers: { 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // --- 404 ---
      else {
        response = Response.json(
          { error: 'Not found' },
          { status: 404 }
        );
      }

      return addCorsHeaders(response, request, env);
    } catch (err) {
      console.error('Unhandled error:', err);
      return addCorsHeaders(
        Response.json(
          { error: 'Internal server error' },
          { status: 500 }
        ),
        request,
        env
      );
    }
  },
};

/* ── OAuth Redirect ──────────────────────────────────────── */

/**
 * GET /auth/:provider — build the OAuth authorization URL and redirect.
 */
const handleAuthRedirect = async (request, env, config, provider) => {
  const url = new URL(request.url);
  const stateParam = url.searchParams.get('state');

  if (!stateParam) {
    return Response.json(
      { error: 'Missing state parameter. Please start from the login page.' },
      { status: 400 }
    );
  }

  const providerConfigs = { google: getGoogleConfig };
  const configBuilder = providerConfigs[provider];

  if (!configBuilder) {
    return Response.json(
      { error: `Unsupported provider: ${provider}` },
      { status: 400 }
    );
  }

  const providerConfig = configBuilder(config);
  const authUrl = buildAuthUrl(providerConfig, providerConfig.redirectUri, stateParam);

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl },
  });
};

/* ── CORS ────────────────────────────────────────────────── */

/**
 * Handle CORS preflight (OPTIONS).
 */
const handleCorsPreFlight = async (request, env) => {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = await resolveAllowedOrigin(origin, env);

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
};

/**
 * Add CORS headers to a response (credentials mode — specific origin required).
 */
const addCorsHeaders = async (response, request, env) => {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = await resolveAllowedOrigin(origin, env);

  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return newResponse;
};

/**
 * Resolve the allowed origin from the request's Origin header.
 * Checks against registered apps' allowed_origins.
 * Falls back to the auth domain itself.
 */
const resolveAllowedOrigin = async (origin, env) => {
  if (!origin) return 'https://auth.cactus.watch';

  // Always allow the auth domain itself
  if (origin === 'https://auth.cactus.watch') return origin;

  // In development, allow localhost origins
  try {
    const originUrl = new URL(origin);
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
      return origin;
    }
  } catch {
    // Invalid origin URL
  }

  // Check against registered apps (lightweight — could be cached)
  // For Phase 1, also allow all *.cactus.watch subdomains
  try {
    const originUrl = new URL(origin);
    if (originUrl.hostname === 'cactus.watch' || originUrl.hostname.endsWith('.cactus.watch')) {
      return origin;
    }
  } catch {
    // Invalid origin
  }

  return 'https://auth.cactus.watch';
};
