/**
 * Cactus Auth — POST /api/magic-link/send
 *
 * Sends a 6-digit OTP to the provided email address.
 * Rate limited: 5 per minute per email.
 */

import { checkMagicSendRateLimit } from '../rate-limit.js';
import { sendMagicLink } from '../auth/magic-link.js';

/**
 * Handle POST /api/magic-link/send
 *
 * Body: { email: string, state: string }
 *
 * @param {Request} request
 * @param {object} env
 * @param {object} config
 * @returns {Promise<Response>}
 */
export const handleMagicLinkSend = async (request, env, config) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { email, state } = body;

  if (!email || typeof email !== 'string') {
    return Response.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  if (!state || typeof state !== 'string') {
    return Response.json(
      { error: 'State parameter is required' },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit check
  const rateLimited = await checkMagicSendRateLimit(env, normalizedEmail);
  if (rateLimited) return rateLimited;

  try {
    // We pass state-derived app_id/redirect_uri but don't decrypt here —
    // that happens during verify. Store raw state reference.
    await sendMagicLink(env.DB, env, {
      email: normalizedEmail,
      app_id: null,    // will be resolved from state during verify
      redirect_uri: null,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('Magic link send error:', err);

    if (err.message === 'Invalid email address') {
      return Response.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    return Response.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
};
