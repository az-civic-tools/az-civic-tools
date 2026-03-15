/**
 * Cactus Auth — POST /api/logout
 *
 * Destroys the session and clears the session cookie.
 */

import { destroySession } from '../auth/session.js';

/**
 * Handle POST /api/logout
 *
 * @param {Request} request
 * @param {object} env
 * @param {object} config
 * @returns {Promise<Response>}
 */
export const handleLogout = async (request, env, config) => {
  const clearCookieHeader = await destroySession(env.DB, request, config);

  return Response.json(
    { success: true },
    {
      status: 200,
      headers: { 'Set-Cookie': clearCookieHeader },
    }
  );
};
