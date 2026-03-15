/**
 * Cactus Auth — Registered Apps Repository
 *
 * Client application registry for the auth service.
 */

/**
 * Find a registered app by its ID.
 *
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const findById = async (db, id) => {
  const result = await db
    .prepare('SELECT * FROM registered_apps WHERE id = ?')
    .bind(id)
    .first();

  if (!result) return null;

  // Parse JSON fields into arrays
  return Object.freeze({
    ...result,
    redirect_uris: safeParseJson(result.redirect_uris, []),
    allowed_origins: safeParseJson(result.allowed_origins, []),
  });
};

/**
 * Validate that a redirect URI is allowed for the given app.
 *
 * @param {D1Database} db
 * @param {string} appId
 * @param {string} redirectUri
 * @returns {Promise<{ valid: boolean, app: object|null, error?: string }>}
 */
export const validateRedirectUri = async (db, appId, redirectUri) => {
  const app = await findById(db, appId);

  if (!app) {
    return { valid: false, app: null, error: 'Unknown application' };
  }

  if (!redirectUri) {
    return { valid: false, app, error: 'Redirect URI is required' };
  }

  // Strict match against registered URIs
  const isAllowed = app.redirect_uris.some(
    (uri) => uri === redirectUri
  );

  if (!isAllowed) {
    return { valid: false, app, error: 'Redirect URI not allowed for this application' };
  }

  return { valid: true, app, error: undefined };
};

/**
 * Safely parse a JSON string, returning a fallback on failure.
 *
 * @param {string|null} json
 * @param {*} fallback
 * @returns {*}
 */
const safeParseJson = (json, fallback) => {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};
