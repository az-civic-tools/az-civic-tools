/**
 * Cactus Auth — GET /callback/:provider
 *
 * Handles the OAuth callback: decrypts state, exchanges code,
 * merges/creates account, creates session, generates auth code,
 * and redirects to the client app.
 */

import { decryptState } from './state.js';
import { exchangeCode, fetchProfile } from '../auth/oauth/base.js';
import { getGoogleConfig, mapGoogleProfile } from '../auth/oauth/google.js';
import { findOrCreateUser } from '../auth/account-merge.js';
import { createSession } from '../auth/session.js';
import * as authCodesDb from '../db/auth-codes.js';

const AUTH_CODE_TTL_MINUTES = 5;

/** Provider config builders by name */
const PROVIDER_CONFIGS = {
  google: getGoogleConfig,
};

/** Profile mappers by name */
const PROFILE_MAPPERS = {
  google: mapGoogleProfile,
};

/**
 * Handle GET /callback/:provider
 *
 * @param {Request} request
 * @param {object} env
 * @param {object} config
 * @param {string} provider — from URL path
 * @returns {Promise<Response>}
 */
export const handleCallback = async (request, env, config, provider) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Provider denied or user cancelled
  if (error) {
    return redirectWithError('Authentication was cancelled', '');
  }

  if (!code || !stateParam) {
    return redirectWithError('Missing authorization code or state', '');
  }

  // Validate provider
  const configBuilder = PROVIDER_CONFIGS[provider];
  const profileMapper = PROFILE_MAPPERS[provider];

  if (!configBuilder || !profileMapper) {
    return redirectWithError(`Unsupported provider: ${provider}`, '');
  }

  // Decrypt and validate state
  let state;
  try {
    state = await decryptState(stateParam, config.stateEncryptionKey);
  } catch (err) {
    console.error('State decryption failed:', err.message);
    return redirectWithError('Invalid or expired login session. Please try again.', '');
  }

  const { app_id, redirect_uri } = state;

  try {
    // Build provider config
    const providerConfig = configBuilder(config);

    // Exchange code for tokens
    const tokens = await exchangeCode(providerConfig, code, providerConfig.redirectUri);

    // Fetch user profile
    const rawProfile = await fetchProfile(providerConfig, tokens.access_token);
    const profile = profileMapper(rawProfile, tokens);

    // Find or create user (account merge)
    const user = await findOrCreateUser(env.DB, provider, profile);

    // Create session
    const { setCookieHeader } = await createSession(
      env.DB,
      user.id,
      request,
      config
    );

    // Generate auth code for the client app
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

    // Redirect back to the client app with the auth code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Set-Cookie': setCookieHeader,
      },
    });
  } catch (err) {
    console.error(`OAuth callback error (${provider}):`, err);
    return redirectWithError('Authentication failed. Please try again.', redirect_uri);
  }
};

/**
 * Redirect with an error message.
 */
const redirectWithError = (message, redirectUri) => {
  if (redirectUri) {
    const url = new URL(redirectUri);
    url.searchParams.set('error', message);
    return new Response(null, {
      status: 302,
      headers: { Location: url.toString() },
    });
  }

  return Response.json(
    { error: message },
    { status: 400 }
  );
};
