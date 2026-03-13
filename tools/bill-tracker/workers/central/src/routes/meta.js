/**
 * Cactus Watch — Meta API Route
 *
 * GET /api/meta — Session info, last scrape time, bill counts.
 */

import { CURRENT_SESSION, SESSIONS } from '../../shared/constants.js';

export async function handleMeta(env) {
  // Get bill counts by status for current session
  const statusCounts = await env.DB.prepare(`
    SELECT b.status, COUNT(*) as count
    FROM bills b
    JOIN sessions s ON b.session_id = s.id
    WHERE s.session_id = ?
    GROUP BY b.status
  `).bind(CURRENT_SESSION.id).all();

  // Get bill counts by chamber
  const chamberCounts = await env.DB.prepare(`
    SELECT b.chamber, COUNT(*) as count
    FROM bills b
    JOIN sessions s ON b.session_id = s.id
    WHERE s.session_id = ?
    GROUP BY b.chamber
  `).bind(CURRENT_SESSION.id).all();

  // Get total bill count
  const totalCount = await env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM bills b
    JOIN sessions s ON b.session_id = s.id
    WHERE s.session_id = ?
  `).bind(CURRENT_SESSION.id).first();

  // Get last scrape info
  const lastScrape = await env.DB.prepare(`
    SELECT started_at, completed_at, bills_found, bills_new, bills_updated, status
    FROM scrape_log
    WHERE session_id = ?
    ORDER BY started_at DESC
    LIMIT 1
  `).bind(CURRENT_SESSION.id).first();

  // Get available sessions
  const sessions = await env.DB.prepare(
    'SELECT session_id, legislature, session_code, name, year, is_current FROM sessions ORDER BY session_id DESC'
  ).all();

  return Response.json({
    current_session: {
      id: CURRENT_SESSION.id,
      legislature: CURRENT_SESSION.legislature,
      session: CURRENT_SESSION.session,
      name: CURRENT_SESSION.name,
      year: CURRENT_SESSION.year,
    },
    available_sessions: (sessions.results || []).map(s => ({
      id: s.session_id,
      legislature: s.legislature,
      session: s.session_code,
      name: s.name,
      year: s.year,
      is_current: !!s.is_current,
    })),
    bills: {
      total: totalCount?.total || 0,
      by_status: Object.fromEntries(
        (statusCounts.results || []).map(r => [r.status, r.count])
      ),
      by_chamber: Object.fromEntries(
        (chamberCounts.results || []).map(r => [r.chamber, r.count])
      ),
    },
    last_scrape: lastScrape ? {
      started_at: lastScrape.started_at,
      completed_at: lastScrape.completed_at,
      bills_found: lastScrape.bills_found,
      bills_new: lastScrape.bills_new,
      bills_updated: lastScrape.bills_updated,
      status: lastScrape.status,
    } : null,
  });
}
