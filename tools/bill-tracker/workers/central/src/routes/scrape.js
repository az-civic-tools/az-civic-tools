/**
 * Cactus Watch — Manual Scrape Trigger
 *
 * POST /api/scrape       — Scrape a single prefix (requires { prefix: "HB" })
 * POST /api/scrape/all   — Scrape all prefixes sequentially (self-calling)
 */

import { runScraper, runFullScrape, BILL_PREFIXES } from '../scraper.js';

export async function handleScrape(request, env) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = env.SCRAPE_TOKEN;

  if (!expectedToken) {
    return Response.json({ error: 'Scrape endpoint not configured' }, { status: 503 });
  }

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine
  }

  const prefix = body.prefix;
  const sessionId = body.sessionId ? parseInt(body.sessionId, 10) : undefined;
  const startAt = body.startAt ? parseInt(body.startAt, 10) : undefined;

  if (!prefix) {
    return Response.json({
      error: 'Missing prefix. Send { "prefix": "HB" } to scrape House Bills, or POST /api/scrape/all for everything.',
      available_prefixes: BILL_PREFIXES.map(p => p.prefix),
    }, { status: 400 });
  }

  // Check if a scrape for this prefix is already running
  const running = await env.DB.prepare(
    "SELECT id FROM scrape_log WHERE status = 'running' AND started_at > datetime('now', '-10 minutes')"
  ).first();

  if (running) {
    return Response.json({ error: 'A scrape is already in progress' }, { status: 409 });
  }

  try {
    const result = await runScraper(env, { prefix, sessionId, startAt });
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json({ error: `Scrape failed: ${err.message}` }, { status: 500 });
  }
}

export async function handleScrapeAll(request, env) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = env.SCRAPE_TOKEN;

  if (!expectedToken) {
    return Response.json({ error: 'Scrape endpoint not configured' }, { status: 503 });
  }

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const sessionId = body.sessionId ? parseInt(body.sessionId, 10) : undefined;

  try {
    const result = await runFullScrape(env, sessionId);
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json({ error: `Full scrape failed: ${err.message}` }, { status: 500 });
  }
}
