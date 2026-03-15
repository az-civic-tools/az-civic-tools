/**
 * Cactus Auth — OAuth Providers Repository
 *
 * Manages linked OAuth provider accounts for users.
 */

/**
 * Find an OAuth link by provider name and the provider's unique user ID.
 *
 * @param {D1Database} db
 * @param {string} provider — e.g. 'google'
 * @param {string} providerId — provider's unique user ID
 * @returns {Promise<object|null>}
 */
export const findByProvider = async (db, provider, providerId) => {
  const result = await db
    .prepare(
      'SELECT * FROM oauth_providers WHERE provider = ? AND provider_id = ?'
    )
    .bind(provider, providerId)
    .first();
  return result || null;
};

/**
 * Find all OAuth links for a given email.
 *
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<object[]>}
 */
export const findByEmail = async (db, email) => {
  const { results } = await db
    .prepare('SELECT * FROM oauth_providers WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .all();
  return results || [];
};

/**
 * Find all OAuth links for a given user.
 *
 * @param {D1Database} db
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export const findByUserId = async (db, userId) => {
  const { results } = await db
    .prepare('SELECT * FROM oauth_providers WHERE user_id = ?')
    .bind(userId)
    .all();
  return results || [];
};

/**
 * Link an OAuth provider to a user. If the link already exists, update tokens.
 *
 * @param {D1Database} db
 * @param {object} data
 * @returns {Promise<void>}
 */
export const linkProvider = async (db, data) => {
  const {
    user_id,
    provider,
    provider_id,
    email,
    name,
    avatar_url,
    access_token,
    refresh_token,
  } = data;

  const existing = await findByProvider(db, provider, provider_id);

  if (existing) {
    await db
      .prepare(
        `UPDATE oauth_providers
         SET email = ?, name = ?, avatar_url = ?, access_token = ?,
             refresh_token = COALESCE(?, refresh_token),
             updated_at = datetime('now')
         WHERE provider = ? AND provider_id = ?`
      )
      .bind(
        email || null,
        name || null,
        avatar_url || null,
        access_token || null,
        refresh_token || null,
        provider,
        provider_id
      )
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO oauth_providers
         (user_id, provider, provider_id, email, name, avatar_url, access_token, refresh_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user_id,
      provider,
      provider_id,
      email || null,
      name || null,
      avatar_url || null,
      access_token || null,
      refresh_token || null
    )
    .run();
};
