/**
 * Fixed-window rate limiter backed by KV.
 * Returns { allowed, remaining }. Fails open if KV is unavailable so a KV
 * outage never takes the site down, but logs loudly.
 */

const WINDOW_SECONDS = 3600;

export const checkRateLimit = async (kv, key, limit) => {
  if (!kv) return { allowed: true, remaining: limit };
  const windowStart = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const kvKey = `rl:${key}:${windowStart}`;
  try {
    const current = Number.parseInt((await kv.get(kvKey)) || '0', 10);
    if (current >= limit) return { allowed: false, remaining: 0 };
    await kv.put(kvKey, String(current + 1), { expirationTtl: WINDOW_SECONDS * 2 });
    return { allowed: true, remaining: limit - current - 1 };
  } catch (err) {
    console.error('rate-limit KV error', err);
    return { allowed: true, remaining: limit };
  }
};
