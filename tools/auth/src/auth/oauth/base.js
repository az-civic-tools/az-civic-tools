/**
 * Cactus Auth — Shared OAuth Utilities
 *
 * Provider-agnostic helpers: build auth URLs, exchange codes, fetch profiles.
 */

/**
 * Build the authorization URL to redirect the user to the OAuth provider.
 *
 * @param {object} providerConfig — { authUrl, clientId, scopes, extraParams }
 * @param {string} redirectUri — the callback URL on our side
 * @param {string} state — encrypted state parameter
 * @returns {string} full authorization URL
 */
export const buildAuthUrl = (providerConfig, redirectUri, state) => {
  const params = new URLSearchParams({
    client_id: providerConfig.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: providerConfig.scopes.join(' '),
    state,
    ...(providerConfig.extraParams || {}),
  });

  return `${providerConfig.authUrl}?${params.toString()}`;
};

/**
 * Exchange an authorization code for an access token.
 *
 * @param {object} providerConfig — { tokenUrl, clientId, clientSecret }
 * @param {string} code — authorization code from the callback
 * @param {string} redirectUri — must match the one used in the auth request
 * @returns {Promise<{ access_token: string, refresh_token?: string, id_token?: string }>}
 */
export const exchangeCode = async (providerConfig, code, redirectUri) => {
  const body = new URLSearchParams({
    client_id: providerConfig.clientId,
    client_secret: providerConfig.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(providerConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  return response.json();
};

/**
 * Fetch the user's profile from the provider's userinfo endpoint.
 *
 * @param {object} providerConfig — { profileUrl }
 * @param {string} accessToken
 * @returns {Promise<object>} raw profile data from the provider
 */
export const fetchProfile = async (providerConfig, accessToken) => {
  const response = await fetch(providerConfig.profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Profile fetch failed (${response.status}): ${text}`);
  }

  return response.json();
};
