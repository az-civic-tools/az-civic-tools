/**
 * Cactus Auth — Session Management
 *
 * Creates, validates, and destroys sessions.
 * Session IDs are UUID v4 tokens stored in HttpOnly cookies.
 */

import * as sessionsDb from '../db/sessions.js';

const COOKIE_NAME = 'cactus_session';

/**
 * Create a new session and return the Set-Cookie header string.
 *
 * @param {D1Database} db
 * @param {string} userId
 * @param {Request} request — for IP and User-Agent
 * @param {object} config — { cookieDomain, sessionTtlDays, sessionTtlSeconds, isProduction }
 * @returns {Promise<{ session: object, setCookieHeader: string }>}
 */
export const createSession = async (db, userId, request, config) => {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000).toISOString();
  const ip = request.headers.get('cf-connecting-ip') || null;
  const ua = request.headers.get('user-agent') || null;

  const session = await sessionsDb.create(db, {
    id: sessionId,
    user_id: userId,
    ip_address: ip,
    user_agent: ua,
    expires_at: expiresAt,
  });

  const maxAge = config.sessionTtlSeconds;
  const secure = config.isProduction ? 'Secure; ' : '';
  const setCookieHeader = [
    `${COOKIE_NAME}=${sessionId}`,
    `Domain=${config.cookieDomain}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    `${secure}SameSite=Lax`,
  ].join('; ');

  return { session, setCookieHeader };
};

/**
 * Validate a session from the request cookie.
 * Returns the session row (with user_id) if valid, null otherwise.
 *
 * @param {D1Database} db
 * @param {Request} request
 * @returns {Promise<object|null>}
 */
export const validateSession = async (db, request) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionId = parseCookie(cookieHeader, COOKIE_NAME);

  if (!sessionId) return null;

  return sessionsDb.findById(db, sessionId);
};

/**
 * Destroy a session and return a Set-Cookie header that clears the cookie.
 *
 * @param {D1Database} db
 * @param {Request} request
 * @param {object} config
 * @returns {Promise<string>} Set-Cookie header string that expires the cookie
 */
export const destroySession = async (db, request, config) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionId = parseCookie(cookieHeader, COOKIE_NAME);

  if (sessionId) {
    await sessionsDb.deleteById(db, sessionId);
  }

  const secure = config.isProduction ? 'Secure; ' : '';
  return [
    `${COOKIE_NAME}=deleted`,
    `Domain=${config.cookieDomain}`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    `${secure}SameSite=Lax`,
  ].join('; ');
};

/**
 * Parse a single cookie value from a Cookie header string.
 *
 * @param {string} cookieHeader
 * @param {string} name
 * @returns {string|null}
 */
const parseCookie = (cookieHeader, name) => {
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));

  return match ? match.slice(name.length + 1) : null;
};
