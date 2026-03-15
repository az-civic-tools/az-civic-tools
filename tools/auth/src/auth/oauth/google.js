/**
 * Cactus Auth — Google OAuth Provider
 *
 * Configuration and profile mapping for Google Sign-In.
 */

/**
 * Build the Google OAuth provider config from environment secrets.
 *
 * @param {object} config — { googleClientId, googleClientSecret, authDomain }
 * @returns {object} provider config for use with base.js
 */
export const getGoogleConfig = (config) =>
  Object.freeze({
    name: 'google',
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    redirectUri: `https://${config.authDomain}/callback/google`,
  });

/**
 * Map a Google userinfo response to the standard profile shape.
 *
 * @param {object} raw — Google userinfo API response
 * @param {{ access_token: string, refresh_token?: string }} tokens
 * @returns {object} normalized profile
 */
export const mapGoogleProfile = (raw, tokens) =>
  Object.freeze({
    provider_id: raw.id,
    email: raw.email || null,
    name: raw.name || null,
    avatar_url: raw.picture || null,
    access_token: tokens.access_token || null,
    refresh_token: tokens.refresh_token || null,
  });
