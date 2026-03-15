/**
 * Cactus Auth — GET /login
 *
 * Validates app_id + redirect_uri against registered_apps,
 * encrypts state, and serves the login page HTML.
 */

import { validateRedirectUri } from '../db/registered-apps.js';
import { encryptState } from './state.js';
import { renderLoginPage } from '../ui/login-page.js';

/**
 * Handle GET /login
 *
 * Query params:
 *   app_id       — registered application ID (required)
 *   redirect_uri — where to send user after auth (required)
 *
 * @param {Request} request
 * @param {object} env
 * @param {object} config
 * @returns {Promise<Response>}
 */
export const handleLogin = async (request, env, config) => {
  const url = new URL(request.url);
  const appId = url.searchParams.get('app_id');
  const redirectUri = url.searchParams.get('redirect_uri');

  // Validate required params
  if (!appId || !redirectUri) {
    return new Response(
      renderLoginPage({
        appName: 'Cactus Watch',
        providers: [],
        error: 'Missing required parameters: app_id and redirect_uri',
        state: '',
        csrfToken: '',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Validate redirect URI against registered app
  const { valid, app, error } = await validateRedirectUri(env.DB, appId, redirectUri);

  if (!valid) {
    return new Response(
      renderLoginPage({
        appName: 'Cactus Watch',
        providers: [],
        error: error || 'Invalid application configuration',
        state: '',
        csrfToken: '',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Encrypt state parameter
  const statePayload = {
    app_id: appId,
    redirect_uri: redirectUri,
    ts: Date.now(),
  };
  const state = await encryptState(statePayload, config.stateEncryptionKey);

  // Generate CSRF token
  const csrfToken = crypto.randomUUID();

  // Phase 1: Google + Magic Link enabled
  const providers = ['google'];

  const html = renderLoginPage({
    appName: app.name,
    providers,
    error: null,
    state,
    csrfToken,
  });

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
