/**
 * Cactus Watch — User Tracking Persistence
 *
 * GET  /api/user/tracking — Retrieve user's tracking data
 * PUT  /api/user/tracking — Save user's tracking data
 *
 * All endpoints require a valid cactus_session cookie.
 * Data is stored in D1 as a JSON blob per user.
 */

const MAX_TRACKING_SIZE = 500 * 1024; // 500 KB
const WRITE_WINDOW_SECONDS = 60;
const MAX_WRITES_PER_WINDOW = 30;

// Brief in-memory session cache to avoid hammering auth on rapid requests.
// Map<sessionToken, { user, expiresAt }>
const sessionCache = new Map();
const SESSION_CACHE_TTL_MS = 15_000; // 15 seconds

/**
 * Extract the cactus_session cookie from the request.
 */
function getSessionCookie(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)cactus_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Verify the user's session by forwarding the cookie to the auth service.
 * Returns { id, email, name } on success, null on failure.
 */
async function verifySession(request) {
  const sessionToken = getSessionCookie(request);
  if (!sessionToken) return null;

  // Check in-memory cache
  const cached = sessionCache.get(sessionToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const resp = await fetch('https://auth.cactus.watch/api/me', {
      headers: { 'Cookie': `cactus_session=${sessionToken}` },
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.authenticated || !data.user || !data.user.id) return null;

    const user = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || data.user.email,
    };

    // Cache it
    sessionCache.set(sessionToken, { user, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });

    // Evict old entries periodically
    if (sessionCache.size > 200) {
      const now = Date.now();
      for (const [key, val] of sessionCache) {
        if (val.expiresAt <= now) sessionCache.delete(key);
      }
    }

    return user;
  } catch (err) {
    console.error('Session verification failed:', err);
    return null;
  }
}

/**
 * Strip HTML/script tags from all string values in the tracking data.
 */
function sanitizeStrings(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeStrings);
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeStrings(value);
    }
    return result;
  }
  return obj;
}

/**
 * Per-user write rate limiting via KV.
 * Returns null if allowed, or a 429 Response if over limit.
 */
async function checkWriteRateLimit(userId, env) {
  if (!env.RATE_LIMIT) return null;

  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / WRITE_WINDOW_SECONDS);
  const key = `ut:${userId}:${windowKey}`;

  const current = parseInt(await env.RATE_LIMIT.get(key) || '0', 10);

  if (current >= MAX_WRITES_PER_WINDOW) {
    const retryAfter = (windowKey + 1) * WRITE_WINDOW_SECONDS - now;
    return Response.json(
      { error: 'Write rate limit exceeded. Max 30 saves per minute.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_WRITES_PER_WINDOW),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: WRITE_WINDOW_SECONDS * 2 });
  return null;
}

/**
 * GET /api/user/tracking — Retrieve tracking data for the authenticated user.
 */
export async function handleGetTracking(request, env) {
  const user = await verifySession(request);
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const row = await env.DB.prepare(
      'SELECT tracking_data, updated_at FROM user_tracking WHERE user_id = ?'
    ).bind(user.id).first();

    if (!row) {
      return Response.json({ data: null, updated_at: null });
    }

    return Response.json({
      data: JSON.parse(row.tracking_data),
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.error('Failed to fetch tracking data:', err);
    return Response.json({ error: 'Failed to retrieve tracking data' }, { status: 500 });
  }
}

/**
 * PUT /api/user/tracking — Save tracking data for the authenticated user.
 */
export async function handleSaveTracking(request, env) {
  const user = await verifySession(request);
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Per-user write rate limit
  const rateLimited = await checkWriteRateLimit(user.id, env);
  if (rateLimited) return rateLimited;

  let body;
  try {
    body = await request.text();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Size check before parsing
  if (body.length > MAX_TRACKING_SIZE) {
    return Response.json(
      { error: `Tracking data too large. Maximum ${MAX_TRACKING_SIZE / 1024}KB.` },
      { status: 413 }
    );
  }

  let trackingData;
  try {
    trackingData = JSON.parse(body);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof trackingData !== 'object' || trackingData === null) {
    return Response.json({ error: 'Tracking data must be a JSON object' }, { status: 400 });
  }

  // Sanitize all string fields
  const sanitized = sanitizeStrings(trackingData);
  const serialized = JSON.stringify(sanitized);
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO user_tracking (user_id, tracking_data, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET tracking_data = excluded.tracking_data, updated_at = excluded.updated_at`
    ).bind(user.id, serialized, now).run();

    return Response.json({ success: true, updated_at: now });
  } catch (err) {
    console.error('Failed to save tracking data:', err);
    return Response.json({ error: 'Failed to save tracking data' }, { status: 500 });
  }
}
