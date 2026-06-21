/**
 * Cactus Watch — Incremental Bill Scraper
 *
 * Replaces the full-enumeration scraper for cron use.
 * Instead of scraping all ~2,100 bills in one Worker invocation
 * (which exceeds the 30-second CPU limit), this scrapes a small
 * batch of bills per invocation. A cron firing every few minutes
 * cycles through all bills over the course of hours.
 *
 * Strategy:
 *   1. Query D1 for the N oldest-scraped bills (ORDER BY scraped_at ASC)
 *   2. Re-fetch each from the azleg API
 *   3. Run full processBill() to update all data (sponsors, votes, etc.)
 *   4. Repeat on next cron fire with the next batch
 *
 * At 15 bills every 3 minutes: ~7,200 checks/day, full cycle every ~7 hours.
 * Each invocation uses ~45-60 azleg API calls, well within Worker limits.
 */

import { CURRENT_SESSION, SCRAPE_RATE_LIMIT_MS } from '../shared/constants.js';
import { fetchBill, processBill } from './scraper.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Default batch size per invocation */
const DEFAULT_BATCH_SIZE = 15;

/**
 * Scrape a small batch of bills, prioritizing the oldest-scraped ones.
 * @param {object} env - Cloudflare Worker env bindings
 * @param {number} [batchSize] - Number of bills to process this invocation
 * @returns {object} { checked, updated, skipped, errors }
 */
export async function runIncrementalScrape(env, batchSize = DEFAULT_BATCH_SIZE) {
  const sessionRow = await env.DB.prepare(
    'SELECT id FROM sessions WHERE session_id = ?'
  ).bind(CURRENT_SESSION.id).first();

  if (!sessionRow) {
    console.log('Incremental scraper: no session row found');
    return { checked: 0, updated: 0, skipped: 0, errors: [] };
  }

  const dbSessionId = sessionRow.id;

  // Grab the oldest-scraped bills
  const candidates = await env.DB.prepare(`
    SELECT id, number, scraped_at
    FROM bills
    WHERE session_id = ?
    ORDER BY scraped_at ASC
    LIMIT ?
  `).bind(dbSessionId, batchSize).all();

  const bills = candidates.results || [];
  if (bills.length === 0) {
    return { checked: 0, updated: 0, skipped: 0, errors: [] };
  }

  const oldest = bills[0].scraped_at;
  const newest = bills[bills.length - 1].scraped_at;
  console.log(`Incremental scraper: ${bills.length} bills (oldest: ${oldest}, newest: ${newest})`);

  let updated = 0;
  let skipped = 0;
  const errors = [];
  const now = new Date().toISOString();

  for (const bill of bills) {
    await sleep(SCRAPE_RATE_LIMIT_MS);

    const prefix = bill.number.replace(/\d+/, '');
    const body = prefix.startsWith('H') ? 'H' : 'S';

    let fresh;
    try {
      fresh = await fetchBill(CURRENT_SESSION.id, body, bill.number);
    } catch (err) {
      errors.push(`${bill.number}: fetch failed — ${err.message}`);
      // Touch scraped_at so we don't retry this one immediately
      await env.DB.prepare(
        'UPDATE bills SET scraped_at = ? WHERE id = ?'
      ).bind(now, bill.id).run();
      continue;
    }

    if (!fresh || !fresh.BillId) {
      // Bill not found on azleg — touch scraped_at and move on
      await env.DB.prepare(
        'UPDATE bills SET scraped_at = ? WHERE id = ?'
      ).bind(now, bill.id).run();
      skipped++;
      continue;
    }

    try {
      await processBill(env, dbSessionId, CURRENT_SESSION.id, fresh);
      updated++;
    } catch (err) {
      errors.push(`${bill.number}: process failed — ${err.message}`);
      // Still touch scraped_at so we cycle past it
      await env.DB.prepare(
        'UPDATE bills SET scraped_at = ? WHERE id = ?'
      ).bind(now, bill.id).run();
    }
  }

  const result = { checked: bills.length, updated, skipped, errors };
  console.log(`Incremental scraper complete:`, JSON.stringify({ ...result, errors: errors.length }));

  await writeHeartbeat(env, result, now);

  return result;
}

/**
 * Record a scraper heartbeat so /api/meta's `last_scrape` reflects the live
 * incremental cron (which otherwise never writes to scrape_log), and self-heal
 * any row left stuck in 'running' by a crashed full scrape.
 *
 * Keeps a single 'ok' heartbeat row per session, updated in place each run, so
 * the table doesn't grow by ~480 rows/day.
 */
async function writeHeartbeat(env, result, now) {
  const logSessionId = CURRENT_SESSION.id; // scrape_log keys on the azleg session id

  try {
    // Mark any scrape that's been 'running' for over 30 minutes as stalled —
    // a full scrape that crashed mid-run leaves a perpetual "running" row that
    // makes the scraper look dead in /api/meta.
    await env.DB.prepare(
      `UPDATE scrape_log SET status = 'stalled', completed_at = ?
       WHERE status = 'running' AND started_at < datetime('now', '-30 minutes')`
    ).bind(now).run();

    // Upsert the single heartbeat row for this session.
    const upd = await env.DB.prepare(
      `UPDATE scrape_log SET started_at = ?, completed_at = ?, bills_found = ?, bills_updated = ?, status = 'ok'
       WHERE session_id = ? AND status = 'ok'`
    ).bind(now, now, result.checked, result.updated, logSessionId).run();

    if (!upd.meta?.changes) {
      await env.DB.prepare(
        `INSERT INTO scrape_log (session_id, started_at, completed_at, bills_found, bills_updated, status)
         VALUES (?, ?, ?, ?, ?, 'ok')`
      ).bind(logSessionId, now, now, result.checked, result.updated).run();
    }
  } catch (err) {
    console.error('Incremental scraper: heartbeat write failed:', err.message);
  }
}
