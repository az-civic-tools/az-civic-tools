/**
 * GET /guides/<slug> — streams a voter guide PDF from the GUIDES R2 bucket.
 */
import { error } from './http.js';
import { guideKeyForSlug } from './config.js';

const CACHE_CONTROL = 'public, max-age=3600';

export const handleGuide = async (request, env, pathname) => {
  const slug = pathname.replace(/^\/guides\//, '').replace(/\/$/, '');
  const key = guideKeyForSlug(slug);
  if (!key) return error('No guide by that name.', 404);
  if (!env.GUIDES) return error('Guides are not available right now.', 503);
  const object = await env.GUIDES.get(key);
  if (!object) return error('That guide has not been uploaded yet.', 404);
  const headers = new Headers({
    'content-type': 'application/pdf',
    'content-disposition': `inline; filename="${key}"`,
    'cache-control': CACHE_CONTROL,
    etag: object.httpEtag,
  });
  return new Response(object.body, { headers });
};
