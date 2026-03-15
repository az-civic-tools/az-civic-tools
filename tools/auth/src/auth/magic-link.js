/**
 * Cactus Auth — Magic Link (Email OTP)
 *
 * Generates 6-digit OTPs, sends them via Resend API,
 * and verifies submitted codes.
 */

import * as magicLinksDb from '../db/magic-links.js';

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;

/**
 * Generate a cryptographically random 6-digit OTP.
 *
 * @returns {string} 6-digit numeric string
 */
export const generateOtp = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 1_000_000).toString().padStart(OTP_LENGTH, '0');
  return code;
};

/**
 * Create and send a magic link OTP to the given email.
 *
 * @param {D1Database} db
 * @param {object} env — Worker env (for RESEND_API_KEY)
 * @param {{ email: string, app_id?: string, redirect_uri?: string }} params
 * @returns {Promise<{ success: boolean }>}
 */
export const sendMagicLink = async (db, env, params) => {
  const { email, app_id, redirect_uri } = params;
  const normalizedEmail = email.toLowerCase().trim();

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Invalid email address');
  }

  const code = generateOtp();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  await magicLinksDb.create(db, {
    id,
    email: normalizedEmail,
    code,
    app_id,
    redirect_uri,
    expires_at: expiresAt,
  });

  // Send email via Resend API or log to console in dev
  if (env.RESEND_API_KEY) {
    await sendViaResend(env.RESEND_API_KEY, normalizedEmail, code);
  } else {
    console.log(`[DEV] Magic link OTP for ${normalizedEmail}: ${code}`);
  }

  return { success: true };
};

/**
 * Verify a magic link OTP code.
 *
 * @param {D1Database} db
 * @param {string} email
 * @param {string} code
 * @returns {Promise<{ valid: boolean, magicLink?: object }>}
 */
export const verifyMagicLink = async (db, email, code) => {
  const normalizedEmail = email.toLowerCase().trim();

  if (!code || code.length !== OTP_LENGTH) {
    return { valid: false };
  }

  const magicLink = await magicLinksDb.findValidCode(db, normalizedEmail, code);

  if (!magicLink) {
    return { valid: false };
  }

  await magicLinksDb.markUsed(db, magicLink.id);

  return { valid: true, magicLink };
};

/* ── Helpers ──────────────────────────────────────────────── */

/**
 * Send OTP email via Resend API.
 */
const sendViaResend = async (apiKey, email, code) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Cactus Watch <auth@cactus.watch>',
      to: [email],
      subject: `Your sign-in code: ${code}`,
      html: buildOtpEmailHtml(code),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Resend API error (${response.status}): ${text}`);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Build the HTML email body for the OTP.
 */
const buildOtpEmailHtml = (code) => `
<!DOCTYPE html>
<html>
<body style="font-family: 'Georgia', serif; background: #FAF6F0; padding: 40px;">
  <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 8px rgba(44, 24, 16, 0.1);">
    <h1 style="color: #2C1810; font-size: 24px; margin-bottom: 8px;">Cactus Watch</h1>
    <p style="color: #6B5B4F; font-size: 16px; margin-bottom: 24px;">Your sign-in code:</p>
    <div style="background: #FAF6F0; border: 2px solid #C1440E; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: monospace; font-size: 32px; letter-spacing: 8px; color: #2C1810; font-weight: bold;">${code}</span>
    </div>
    <p style="color: #A69888; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore it.</p>
  </div>
</body>
</html>`;

/**
 * Basic email validation.
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
