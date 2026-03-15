/**
 * Cactus Auth — POST /api/magic-link/verify
 *
 * Verifies a 6-digit OTP code, creates session + auth code,
 * and returns the redirect URI with auth code.
 */

import { checkMagicVerifyRateLimit } from '../rate-limit.js';
import { verifyMagicLink } from '../auth/magic-link.js';
import { findOrCreateUserByEmail } from '../auth/account-merge.js';
import { createSession } from '../auth/session.js';
import { decryptState } from './state.js';
import * as authCodesDb from '../db/auth-codes.js';

const AUTH_CODE_TTL_MINUTES = 5;

/**
 * Handle POST /api/magic-link/verify
 *
 * Body: { email: string, code: string, state: string }
 *
 * @param {Request} request
 * @param {object} env
 * @param {object} config
 * @returns {Promise<Response>}
 */
export const handleMagicLinkVerify = async (request, env, config) => {
  // Rate limit check
  const rateLimited = await checkMagicVerifyRateLimit(request, env);
  if (rateLimited) return rateLimited;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { email, code, state: stateParam } = body;

  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return Response.json({ error: 'A 6-digit code is required' }, { status: 400 });
  }

  if (!stateParam || typeof stateParam !== 'string') {
    return Response.json({ error: 'State parameter is required' }, { status: 400 });
  }

  // Decrypt state to get app_id and redirect_uri
  let state;
  try {
    state = await decryptState(stateParam, config.stateEncryptionKey);
  } catch (err) {
    console.error('State decryption failed:', err.message);
    return Response.json(
      { error: 'Login session expired. Please start over.' },
      { status: 400 }
    );
  }

  const { app_id, redirect_uri } = state;

  // Verify OTP
  const { valid } = await verifyMagicLink(env.DB, email, code);

  if (!valid) {
    return Response.json(
      { error: 'Invalid or expired code. Please try again.' },
      { status: 400 }
    );
  }

  try {
    // Find or create user by email
    const user = await findOrCreateUserByEmail(env.DB, email);

    // Create session
    const { setCookieHeader } = await createSession(
      env.DB,
      user.id,
      request,
      config
    );

    // Generate auth code
    const authCode = crypto.randomUUID();
    const authCodeExpiry = new Date(
      Date.now() + AUTH_CODE_TTL_MINUTES * 60 * 1000
    ).toISOString();

    await authCodesDb.create(env.DB, {
      id: crypto.randomUUID(),
      code: authCode,
      user_id: user.id,
      app_id,
      redirect_uri,
      expires_at: authCodeExpiry,
    });

    // Build redirect URL
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode);

    return Response.json(
      { success: true, redirect: redirectUrl.toString() },
      {
        status: 200,
        headers: { 'Set-Cookie': setCookieHeader },
      }
    );
  } catch (err) {
    console.error('Magic link verify error:', err);
    return Response.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
};
