/**
 * Cactus Auth — Sessions Repository
 *
 * Session lifecycle: create, validate, destroy.
 * The session ID doubles as the token stored in the cookie.
 */

/**
 * Create a new session.
 *
 * @param {D1Database} db
 * @param {{ id: string, user_id: string, ip_address?: string, user_agent?: string, expires_at: string }} data
 * @returns {Promise<object>}
 */
export const create = async (db, data) => {
  const { id, user_id, ip_address, user_agent, expires_at } = data;

  await db
    .prepare(
      'INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(id, user_id, ip_address || null, user_agent || null, expires_at)
    .run();

  return Object.freeze({
    id,
    user_id,
    ip_address: ip_address || null,
    user_agent: user_agent || null,
    created_at: new Date().toISOString(),
    expires_at,
  });
};

/**
 * Find a session by ID. Returns null if expired or not found.
 *
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const findById = async (db, id) => {
  const result = await db
    .prepare(
      "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')"
    )
    .bind(id)
    .first();
  return result || null;
};

/**
 * Delete a session by ID.
 *
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteById = async (db, id) => {
  await db
    .prepare('DELETE FROM sessions WHERE id = ?')
    .bind(id)
    .run();
};

/**
 * Delete all expired sessions.
 *
 * @param {D1Database} db
 * @returns {Promise<number>} number of rows deleted
 */
export const deleteExpired = async (db) => {
  const result = await db
    .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
    .run();
  return result.meta?.changes || 0;
};

/**
 * Delete all sessions for a given user.
 *
 * @param {D1Database} db
 * @param {string} userId
 * @returns {Promise<number>} number of rows deleted
 */
export const deleteAllForUser = async (db, userId) => {
  const result = await db
    .prepare('DELETE FROM sessions WHERE user_id = ?')
    .bind(userId)
    .run();
  return result.meta?.changes || 0;
};
