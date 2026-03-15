/**
 * Cactus Auth — Account Merge / Find-or-Create
 *
 * Handles the identity resolution flow:
 * 1. Look up by (provider, provider_id) — existing linked account
 * 2. If provider profile has email, look up user by email — merge
 * 3. Create new user — fresh account
 * Always links the provider to the resolved user.
 */

import * as usersDb from '../db/users.js';
import * as oauthDb from '../db/oauth-providers.js';

/**
 * Find or create a user from an OAuth provider profile.
 *
 * @param {D1Database} db
 * @param {string} provider — e.g. 'google'
 * @param {{ provider_id: string, email?: string, name?: string, avatar_url?: string, access_token?: string, refresh_token?: string }} profile
 * @returns {Promise<object>} the resolved user
 */
export const findOrCreateUser = async (db, provider, profile) => {
  const { provider_id, email, name, avatar_url, access_token, refresh_token } = profile;

  // Step 1: Check if this provider account is already linked
  const existingLink = await oauthDb.findByProvider(db, provider, provider_id);

  if (existingLink) {
    // Update the link with fresh tokens
    await oauthDb.linkProvider(db, {
      user_id: existingLink.user_id,
      provider,
      provider_id,
      email,
      name,
      avatar_url,
      access_token,
      refresh_token,
    });

    const user = await usersDb.findById(db, existingLink.user_id);
    if (!user) {
      throw new Error('Linked user not found — data integrity issue');
    }
    return user;
  }

  // Step 2: If profile has an email, check for existing user by email
  if (email) {
    const existingUser = await usersDb.findByEmail(db, email);

    if (existingUser) {
      // Link this provider to the existing user
      await oauthDb.linkProvider(db, {
        user_id: existingUser.id,
        provider,
        provider_id,
        email,
        name,
        avatar_url,
        access_token,
        refresh_token,
      });

      // Update avatar if user doesn't have one
      if (!existingUser.avatar_url && avatar_url) {
        await usersDb.updateAvatar(db, existingUser.id, avatar_url);
      }

      return existingUser;
    }
  }

  // Step 3: Create a brand-new user
  const newUserId = crypto.randomUUID();
  const newUser = await usersDb.create(db, {
    id: newUserId,
    email,
    name,
    avatar_url,
  });

  // Link the provider
  await oauthDb.linkProvider(db, {
    user_id: newUserId,
    provider,
    provider_id,
    email,
    name,
    avatar_url,
    access_token,
    refresh_token,
  });

  return newUser;
};

/**
 * Find or create a user from a magic link (email-only).
 *
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<object>} the resolved user
 */
export const findOrCreateUserByEmail = async (db, email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await usersDb.findByEmail(db, normalizedEmail);

  if (existingUser) return existingUser;

  const newUserId = crypto.randomUUID();
  return usersDb.create(db, {
    id: newUserId,
    email: normalizedEmail,
  });
};
