/**
 * Cactus Auth — Users Repository
 *
 * CRUD operations for the users table.
 * All functions are pure — they accept DB as a parameter and return new objects.
 */

/**
 * Find a user by their UUID.
 *
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const findById = async (db, id) => {
  const result = await db
    .prepare('SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE id = ?')
    .bind(id)
    .first();
  return result || null;
};

/**
 * Find a user by email address.
 *
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export const findByEmail = async (db, email) => {
  const result = await db
    .prepare('SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first();
  return result || null;
};

/**
 * Create a new user.
 *
 * @param {D1Database} db
 * @param {{ id: string, email?: string, name?: string, avatar_url?: string }} data
 * @returns {Promise<object>} the created user
 */
export const create = async (db, data) => {
  const { id, email, name, avatar_url } = data;
  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  await db
    .prepare(
      'INSERT INTO users (id, email, name, avatar_url) VALUES (?, ?, ?, ?)'
    )
    .bind(id, normalizedEmail, name || null, avatar_url || null)
    .run();

  return Object.freeze({
    id,
    email: normalizedEmail,
    name: name || null,
    avatar_url: avatar_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

/**
 * Update a user's name.
 *
 * @param {D1Database} db
 * @param {string} id
 * @param {string} name
 * @returns {Promise<object|null>} the updated user or null if not found
 */
export const updateName = async (db, id, name) => {
  await db
    .prepare(
      "UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(name, id)
    .run();

  return findById(db, id);
};

/**
 * Update a user's avatar URL.
 *
 * @param {D1Database} db
 * @param {string} id
 * @param {string} avatarUrl
 * @returns {Promise<object|null>} the updated user or null if not found
 */
export const updateAvatar = async (db, id, avatarUrl) => {
  await db
    .prepare(
      "UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(avatarUrl, id)
    .run();

  return findById(db, id);
};
