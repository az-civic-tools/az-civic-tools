/**
 * Cactus Auth — Auth Codes Repository
 *
 * Short-lived authorization codes for the OAuth code-for-token exchange.
 * Single-use with a 5-minute TTL.
 */

/**
 * Create a new authorization code.
 *
 * @param {D1Database} db
 * @param {{ id: string, code: string, user_id: string, app_id: string, redirect_uri: string, expires_at: string }} data
 * @returns {Promise<object>}
 */
export const create = async (db, data) => {
  const { id, code, user_id, app_id, redirect_uri, expires_at } = data;

  await db
    .prepare(
      'INSERT INTO auth_codes (id, code, user_id, app_id, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, code, user_id, app_id, redirect_uri, expires_at)
    .run();

  return Object.freeze({ id, code, user_id, app_id, redirect_uri, used: 0, expires_at });
};

/**
 * Find and consume an auth code in a single operation.
 * Returns the code row if valid (unused, non-expired, matching app_id),
 * marks it used, and returns the data. Returns null otherwise.
 *
 * @param {D1Database} db
 * @param {string} code
 * @param {string} appId
 * @returns {Promise<object|null>}
 */
export const findAndConsume = async (db, code, appId) => {
  const row = await db
    .prepare(
      `SELECT * FROM auth_codes
       WHERE code = ? AND app_id = ? AND used = 0
         AND expires_at > datetime('now')
       LIMIT 1`
    )
    .bind(code, appId)
    .first();

  if (!row) return null;

  // Mark as consumed immediately
  await db
    .prepare('UPDATE auth_codes SET used = 1 WHERE id = ?')
    .bind(row.id)
    .run();

  return Object.freeze({ ...row, used: 1 });
};

/**
 * Delete all expired auth codes.
 *
 * @param {D1Database} db
 * @returns {Promise<number>} number of rows deleted
 */
export const deleteExpired = async (db) => {
  const result = await db
    .prepare("DELETE FROM auth_codes WHERE expires_at <= datetime('now')")
    .run();
  return result.meta?.changes || 0;
};
