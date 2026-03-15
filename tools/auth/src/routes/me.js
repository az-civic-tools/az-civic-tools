/**
 * Cactus Auth — GET /api/me
 *
 * Returns the currently authenticated user from the session cookie.
 */

import { validateSession } from '../auth/session.js';
import * as usersDb from '../db/users.js';

/**
 * Handle GET /api/me
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<Response>}
 */
export const handleMe = async (request, env) => {
  const session = await validateSession(env.DB, request);

  if (!session) {
    return Response.json(
      { authenticated: false, user: null },
      { status: 401 }
    );
  }

  const user = await usersDb.findById(env.DB, session.user_id);

  if (!user) {
    return Response.json(
      { authenticated: false, user: null },
      { status: 401 }
    );
  }

  return Response.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    },
  });
};
