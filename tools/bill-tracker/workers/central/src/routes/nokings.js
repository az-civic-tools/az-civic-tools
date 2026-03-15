/**
 * Cactus Watch — NoKings3 Image API Routes
 *
 * GET    /api/nokings/images        — list all images grouped by city
 * POST   /api/nokings/images        — upload a new image (admin only)
 * GET    /api/nokings/image/:id     — serve image bytes from R2
 * DELETE /api/nokings/images/:id    — delete an image (admin only)
 * GET    /api/nokings/admins        — list admins (super admin only)
 * POST   /api/nokings/admins        — add admin (super admin only)
 * PUT    /api/nokings/admins        — update admin note (super admin only)
 * DELETE /api/nokings/admins/:email — remove admin (super admin only)
 */

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
// Super admin email comes from env.ADMIN_EMAIL (set in wrangler.toml vars)

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Get the authenticated user from the session cookie.
 * Returns user object or null.
 */
async function getAuthUser(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!cookie) return null;

  try {
    const resp = await fetch('https://auth.cactus.watch/api/me', {
      headers: { cookie },
    });
    if (!resp.ok) return null;
    const { user } = await resp.json();
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Check if a user email is in the nokings_admins table.
 */
async function isAdmin(env, email) {
  if (!email) return false;
  const row = await env.DB.prepare(
    'SELECT email FROM nokings_admins WHERE email = ?'
  ).bind(email).first();
  return !!row;
}

/**
 * Validate the admin session. Returns user if admin, null otherwise.
 */
async function requireAdmin(request, env) {
  const user = await getAuthUser(request);
  if (!user) return null;
  const admin = await isAdmin(env, user.email);
  return admin ? user : null;
}

/**
 * Validate the super admin session. Returns user if super admin, null otherwise.
 */
async function requireSuperAdmin(request, env) {
  const user = await getAuthUser(request);
  if (!user || user.email !== env.ADMIN_EMAIL) return null;
  return user;
}

/**
 * GET /api/nokings/me — Check current user's admin status.
 * Returns { email, is_admin, is_super_admin } or 401.
 */
export async function handleAdminCheck(request, env) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const admin = await isAdmin(env, user.email);
  return Response.json({
    email: user.email,
    is_admin: admin,
    is_super_admin: user.email === env.ADMIN_EMAIL,
  });
}

/**
 * Extract file extension from a filename string.
 * Returns lowercase extension or empty string.
 */
function getExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
}

/**
 * Generate a UUID v4 using the Web Crypto API.
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * GET /api/nokings/images — List all images grouped by city.
 *
 * Response: { cities: [{ name: "Phoenix", images: [...] }, ...] }
 * Cities sorted alphabetically, images within each city sorted by uploaded_at DESC.
 */
export async function handleListImages(request, env) {
  const result = await env.DB.prepare(`
    SELECT id, city, image_url, source_url, caption, address, uploaded_by, uploaded_at
    FROM nokings_images
    ORDER BY city ASC, uploaded_at DESC
  `).all();

  const rows = result.results || [];

  // Group by city using a Map to preserve insertion order (already sorted by city ASC)
  const cityMap = new Map();
  for (const row of rows) {
    const cityName = row.city;
    if (!cityMap.has(cityName)) {
      cityMap.set(cityName, []);
    }
    cityMap.get(cityName).push({
      id: row.id,
      city: row.city,
      image_url: `/api/nokings/image/${row.id}`,
      source_url: row.source_url || null,
      caption: row.caption || null,
      address: row.address || null,
      uploaded_by: row.uploaded_by,
      uploaded_at: row.uploaded_at,
    });
  }

  const cities = Array.from(cityMap.entries()).map(([name, images]) => ({
    name,
    images,
  }));

  return Response.json({ cities });
}

/**
 * POST /api/nokings/images — Upload a new image.
 *
 * Multipart form fields:
 *   image      — file (required, max 10 MB, jpg/jpeg/png/webp/gif)
 *   city       — string (required)
 *   source_url — string (optional)
 *   caption    — string (optional)
 */
export async function handleUploadImage(request, env) {
  const user = await requireAdmin(request, env);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('image');
  const city = formData.get('city');
  const rawSourceUrl = formData.get('source_url') || null;
  const caption = formData.get('caption') || null;

  // Validate source_url if provided — only allow http(s) to prevent javascript: XSS
  let sourceUrl = null;
  if (rawSourceUrl && typeof rawSourceUrl === 'string' && rawSourceUrl.trim()) {
    try {
      const parsed = new URL(rawSourceUrl.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return Response.json({ error: 'source_url must use http or https' }, { status: 400 });
      }
      sourceUrl = parsed.href;
    } catch {
      return Response.json({ error: 'Invalid source_url' }, { status: 400 });
    }
  }

  // Validate required fields
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Missing required field: image (must be a file)' }, { status: 400 });
  }
  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    return Response.json({ error: 'Missing required field: city' }, { status: 400 });
  }

  // Validate file extension
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return Response.json(
      { error: `Invalid file type: .${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
      { status: 400 },
    );
  }

  const id = generateId();
  const r2Key = `images/${id}.${ext}`;
  const trimmedCity = city.trim();
  const uploadedAt = new Date().toISOString();

  // Upload to R2
  try {
    await env.NOKINGS_IMAGES.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: CONTENT_TYPES[ext],
      },
    });
  } catch (err) {
    console.error('R2 upload failed:', err);
    return Response.json({ error: 'Failed to upload image' }, { status: 500 });
  }

  // Store metadata in D1
  try {
    await env.DB.prepare(`
      INSERT INTO nokings_images (id, city, image_url, source_url, caption, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, trimmedCity, r2Key, sourceUrl, caption, user.email, uploadedAt).run();
  } catch (err) {
    // Clean up R2 object if D1 insert fails
    console.error('D1 insert failed, cleaning up R2 object:', err);
    try {
      await env.NOKINGS_IMAGES.delete(r2Key);
    } catch (cleanupErr) {
      console.error('R2 cleanup also failed:', cleanupErr);
    }
    return Response.json({ error: 'Failed to save image metadata' }, { status: 500 });
  }

  return Response.json({
    success: true,
    image: {
      id,
      city: trimmedCity,
      image_url: `/api/nokings/image/${id}`,
      source_url: sourceUrl,
      caption,
      uploaded_at: uploadedAt,
    },
  }, { status: 201 });
}

/**
 * GET /api/nokings/image/:id — Serve image bytes from R2.
 *
 * Returns the raw image with correct Content-Type and immutable caching.
 */
export async function handleGetImage(request, env, id) {
  // Look up the R2 key from D1
  const row = await env.DB.prepare(
    'SELECT image_url FROM nokings_images WHERE id = ?'
  ).bind(id).first();

  if (!row) {
    return Response.json({ error: 'Image not found' }, { status: 404 });
  }

  const r2Key = row.image_url;

  // Fetch from R2
  const object = await env.NOKINGS_IMAGES.get(r2Key);
  if (!object) {
    console.error(`R2 object missing for key: ${r2Key} (image id: ${id})`);
    return Response.json({ error: 'Image not found in storage' }, { status: 404 });
  }

  const ext = r2Key.split('.').pop();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': object.size.toString(),
    },
  });
}

/**
 * PATCH /api/nokings/images/:id — Edit image metadata.
 *
 * Body: { city?, caption?, source_url?, address? }
 * Admin only.
 */
export async function handleEditImage(request, env, id) {
  const user = await requireAdmin(request, env);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Check image exists
  const existing = await env.DB.prepare(
    'SELECT id FROM nokings_images WHERE id = ?'
  ).bind(id).first();
  if (!existing) return Response.json({ error: 'Image not found' }, { status: 404 });

  // Build update fields
  const updates = [];
  const bindings = [];

  if (body.city !== undefined) {
    const city = (body.city || '').trim();
    if (!city) return Response.json({ error: 'City cannot be empty' }, { status: 400 });
    updates.push('city = ?');
    bindings.push(city);
  }
  if (body.caption !== undefined) {
    updates.push('caption = ?');
    bindings.push(body.caption || null);
  }
  if (body.source_url !== undefined) {
    if (body.source_url && body.source_url.trim()) {
      try {
        const parsed = new URL(body.source_url.trim());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return Response.json({ error: 'source_url must use http or https' }, { status: 400 });
        }
        updates.push('source_url = ?');
        bindings.push(parsed.href);
      } catch {
        return Response.json({ error: 'Invalid source_url' }, { status: 400 });
      }
    } else {
      updates.push('source_url = ?');
      bindings.push(null);
    }
  }
  if (body.address !== undefined) {
    updates.push('address = ?');
    bindings.push(body.address || null);
  }

  if (updates.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  bindings.push(id);
  try {
    await env.DB.prepare(
      `UPDATE nokings_images SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...bindings).run();
  } catch (err) {
    console.error('Edit image failed:', err);
    return Response.json({ error: 'Failed to update image' }, { status: 500 });
  }

  return Response.json({ success: true });
}

/**
 * DELETE /api/nokings/images/:id — Delete an image.
 *
 * Removes from both R2 and D1.
 */
export async function handleDeleteImage(request, env, id) {
  const user = await requireAdmin(request, env);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up the R2 key from D1
  const row = await env.DB.prepare(
    'SELECT image_url FROM nokings_images WHERE id = ?'
  ).bind(id).first();

  if (!row) {
    return Response.json({ error: 'Image not found' }, { status: 404 });
  }

  const r2Key = row.image_url;

  // Delete from R2 and D1
  try {
    await Promise.all([
      env.NOKINGS_IMAGES.delete(r2Key),
      env.DB.prepare('DELETE FROM nokings_images WHERE id = ?').bind(id).run(),
    ]);
  } catch (err) {
    console.error('Delete failed:', err);
    return Response.json({ error: 'Failed to delete image' }, { status: 500 });
  }

  return Response.json({ success: true });
}

/* ── Admin Management ────────────────────────────────────── */

/**
 * GET /api/nokings/admins — List all admins.
 * Super admin only.
 */
export async function handleListAdmins(request, env) {
  const user = await requireSuperAdmin(request, env);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await env.DB.prepare(
    'SELECT email, note, created_at FROM nokings_admins ORDER BY created_at ASC'
  ).all();

  return Response.json({
    admins: (result.results || []).map(r => ({
      email: r.email,
      note: r.note || '',
      created_at: r.created_at,
      is_super: r.email === env.ADMIN_EMAIL,
    })),
  });
}

/**
 * POST /api/nokings/admins — Add an admin.
 * Body: { email, note }
 * Super admin only.
 */
export async function handleAddAdmin(request, env) {
  const user = await requireSuperAdmin(request, env);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const note = (body.note || '').trim();

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required' }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO nokings_admins (email, note, added_by) VALUES (?, ?, ?)'
    ).bind(email, note, user.email).run();
  } catch (err) {
    console.error('Add admin failed:', err);
    return Response.json({ error: 'Failed to add admin' }, { status: 500 });
  }

  return Response.json({ success: true, email, note }, { status: 201 });
}

/**
 * PUT /api/nokings/admins — Update an admin's note.
 * Body: { email, note }
 * Super admin only.
 */
export async function handleUpdateAdmin(request, env) {
  const user = await requireSuperAdmin(request, env);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const note = (body.note || '').trim();

  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

  await env.DB.prepare(
    'UPDATE nokings_admins SET note = ? WHERE email = ?'
  ).bind(note, email).run();

  return Response.json({ success: true, email, note });
}

/**
 * DELETE /api/nokings/admins/:email — Remove an admin.
 * Super admin only. Cannot remove yourself.
 */
export async function handleDeleteAdmin(request, env, email) {
  const user = await requireSuperAdmin(request, env);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = decodeURIComponent(email).toLowerCase();

  if (decoded === env.ADMIN_EMAIL) {
    return Response.json({ error: 'Cannot remove the super admin' }, { status: 400 });
  }

  await env.DB.prepare(
    'DELETE FROM nokings_admins WHERE email = ?'
  ).bind(decoded).run();

  return Response.json({ success: true });
}
