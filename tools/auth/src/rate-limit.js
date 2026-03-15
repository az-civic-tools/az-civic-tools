/**
 * Cactus Auth — KV-based Rate Limiting
 *
 * Configurable sliding-window rate limiter.
 * Presets:
 *   general       — 100 req/min per IP
 *   magic-send    — 5 req/min per email
 *   magic-verify  — 10 req/min per IP
 */

/** Rate limit presets */
const PRESETS = Object.freeze({
  general: { windowSeconds: 60, maxRequests: 100 },
  'magic-send': { windowSeconds: 60, maxRequests: 5 },
  'magic-verify': { windowSeconds: 60, maxRequests: 10 },
});

/**
 * Check rate limit for a given key and preset.
 *
 * @param {object} env — Worker env with RATE_LIMIT KV binding
 * @param {string} preset — one of 'general', 'magic-send', 'magic-verify'
 * @param {string} identifier — IP address or email
 * @returns {Response|null} 429 Response if rate limited, null if allowed
 */
export const checkRateLimit = async (env, preset, identifier) => {
  if (!env.RATE_LIMIT) return null;

  const config = PRESETS[preset];
  if (!config) return null;

  const { windowSeconds, maxRequests } = config;
  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / windowSeconds);
  const key = `rl:${preset}:${identifier}:${windowKey}`;

  const current = parseInt(await env.RATE_LIMIT.get(key) || '0', 10);

  if (current >= maxRequests) {
    const retryAfter = (windowKey + 1) * windowSeconds - now;
    return Response.json(
      { error: `Rate limit exceeded. Max ${maxRequests} requests per minute.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String((windowKey + 1) * windowSeconds),
        },
      }
    );
  }

  await env.RATE_LIMIT.put(key, String(current + 1), {
    expirationTtl: windowSeconds * 2,
  });

  return null;
};

/**
 * Check general rate limit using client IP.
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Response|null}
 */
export const checkGeneralRateLimit = async (request, env) => {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return checkRateLimit(env, 'general', ip);
};

/**
 * Check magic link send rate limit using email.
 *
 * @param {object} env
 * @param {string} email
 * @returns {Response|null}
 */
export const checkMagicSendRateLimit = async (env, email) =>
  checkRateLimit(env, 'magic-send', email);

/**
 * Check magic link verify rate limit using IP.
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Response|null}
 */
export const checkMagicVerifyRateLimit = async (request, env) => {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return checkRateLimit(env, 'magic-verify', ip);
};
