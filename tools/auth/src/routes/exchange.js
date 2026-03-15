/**
 * Cactus Auth — POST /api/exchange
 *
 * Exchanges an authorization code for user info + JWT.
 * Validates app_id + app_secret, consumes the single-use auth code.
 */

import * as authCodesDb from '../db/auth-codes.js';
import * as registeredAppsDb from '../db/registered-apps.js';
import * as usersDb from '../db/users.js';
import { signJwt } from '../auth/jwt.js';

/**
 * Handle POST /api/exchange
 *
 * Body: { code: string, app_id: string, app_secret: string }
 *
 * @param {Request} request
 * @param {object} env
 * @param {object} config
 * @returns {Promise<Response>}
 */
export const handleExchange = async (request, env, config) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { code, app_id, app_secret } = body;

  if (!code || !app_id || !app_secret) {
    return Response.json(
      { error: 'Missing required fields: code, app_id, app_secret' },
      { status: 400 }
    );
  }

  // Validate app credentials
  const app = await registeredAppsDb.findById(env.DB, app_id);

  if (!app) {
    return Response.json(
      { error: 'Invalid application credentials' },
      { status: 401 }
    );
  }

  // Constant-time comparison of app secret
  if (!constantTimeEqual(app_secret, app.secret)) {
    return Response.json(
      { error: 'Invalid application credentials' },
      { status: 401 }
    );
  }

  // Consume the auth code (single-use)
  const authCode = await authCodesDb.findAndConsume(env.DB, code, app_id);

  if (!authCode) {
    return Response.json(
      { error: 'Invalid, expired, or already-used authorization code' },
      { status: 400 }
    );
  }

  // Look up the user
  const user = await usersDb.findById(env.DB, authCode.user_id);

  if (!user) {
    return Response.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Sign a JWT
  const jwt = await signJwt(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      app_id,
    },
    config
  );

  return Response.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    },
    token: jwt,
  });
};

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const constantTimeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.length !== bBytes.length) return false;

  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
};
