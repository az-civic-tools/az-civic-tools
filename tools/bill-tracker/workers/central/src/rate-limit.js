/**
 * Cactus Watch — IP-based Rate Limiting via KV
 *
 * Sliding window: tracks request count per IP per minute.
 * Returns 429 Too Many Requests when limit exceeded.
 */

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

/**
 * Check rate limit for the given request.
 * Returns null if allowed, or a 429 Response if over limit.
 */
export async function checkRateLimit(request, env) {
  if (!env.RATE_LIMIT) return null;

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / WINDOW_SECONDS);
  const key = `rl:${ip}:${windowKey}`;

  const current = parseInt(await env.RATE_LIMIT.get(key) || '0', 10);

  if (current >= MAX_REQUESTS) {
    const retryAfter = (windowKey + 1) * WINDOW_SECONDS - now;
    return Response.json(
      { error: 'Rate limit exceeded. Max 100 requests per minute.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String((windowKey + 1) * WINDOW_SECONDS),
        },
      }
    );
  }

  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS * 2 });

  return null;
}

