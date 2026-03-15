/**
 * Cactus Auth — Magic Links Repository
 *
 * OTP-based email authentication codes.
 */

/**
 * Create a new magic link OTP entry.
 *
 * @param {D1Database} db
 * @param {{ id: string, email: string, code: string, app_id?: string, redirect_uri?: string, expires_at: string }} data
 * @returns {Promise<object>}
 */
export const create = async (db, data) => {
  const { id, email, code, app_id, redirect_uri, expires_at } = data;

  await db
    .prepare(
      'INSERT INTO magic_links (id, email, code, app_id, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, email.toLowerCase().trim(), code, app_id || null, redirect_uri || null, expires_at)
    .run();

  return Object.freeze({
    id,
    email: email.toLowerCase().trim(),
    code,
    app_id: app_id || null,
    redirect_uri: redirect_uri || null,
    used: 0,
    created_at: new Date().toISOString(),
    expires_at,
  });
};

/**
 * Find a valid (unused, non-expired) magic link by email and code.
 *
 * @param {D1Database} db
 * @param {string} email
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export const findValidCode = async (db, email, code) => {
  const result = await db
    .prepare(
      `SELECT * FROM magic_links
       WHERE email = ? AND code = ? AND used = 0
         AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(email.toLowerCase().trim(), code)
    .first();
  return result || null;
};

/**
 * Mark a magic link as used.
 *
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<void>}
 */
export const markUsed = async (db, id) => {
  await db
    .prepare('UPDATE magic_links SET used = 1 WHERE id = ?')
    .bind(id)
    .run();
};

/**
 * Delete all expired magic links.
 *
 * @param {D1Database} db
 * @returns {Promise<number>} number of rows deleted
 */
export const deleteExpired = async (db) => {
  const result = await db
    .prepare("DELETE FROM magic_links WHERE expires_at <= datetime('now')")
    .run();
  return result.meta?.changes || 0;
};
