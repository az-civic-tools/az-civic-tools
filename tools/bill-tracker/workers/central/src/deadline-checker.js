/**
 * Cactus Watch — Deadline-Based Dead Bill Detection
 *
 * Post-processing step that runs after the nightly scrape.
 * Marks bills as dead when they've missed procedural deadlines,
 * and resurrects bills that show new activity after being deadline-dead.
 *
 * This does NOT override azleg's own FinalDisposition — it only applies
 * to bills that azleg hasn't marked as dead but are effectively dead
 * due to missed deadlines.
 */

import { CURRENT_SESSION } from '../shared/constants.js';
import { getDeadlinesForSession, DEAD_REASONS } from '../shared/session-deadlines.js';

/**
 * Run the deadline checker against the current session.
 * @param {object} env - Cloudflare Worker env bindings
 * @returns {object} { billsMarkedDead, billsResurrected, deadByReason }
 */
export async function runDeadlineChecker(env) {
  const deadlines = getDeadlinesForSession(CURRENT_SESSION.id);
  if (!deadlines) {
    console.log('Deadline checker: no deadlines configured for session', CURRENT_SESSION.id);
    return { billsMarkedDead: 0, billsResurrected: 0, deadByReason: {} };
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const sessionId = await getDbSessionId(env);
  if (!sessionId) {
    console.log('Deadline checker: session not found in DB');
    return { billsMarkedDead: 0, billsResurrected: 0, deadByReason: {} };
  }

  const deadByReason = {};
  let totalMarkedDead = 0;

  // --- 1. Origin chamber committee deadline ---
  if (today > deadlines.origin_committee) {
    // House bills still in House committee or never assigned
    // Exclude bills that have floor actions (they passed committee even if status isn't updated yet)
    // Exclude bills with upcoming hearings (they're clearly still alive)
    const houseResult = await env.DB.prepare(`
      UPDATE bills SET
        status = 'dead',
        dead_reason = 'missed_origin_deadline',
        deadline_dead_at = ?,
        updated_at = ?
      WHERE session_id = ?
        AND chamber = 'H'
        AND status IN ('introduced', 'in_committee')
        AND (dead_reason IS NULL OR dead_reason = '')
        AND (deadline_dead_at IS NULL OR deadline_dead_at = '')
        AND (final_disposition IS NULL OR final_disposition = '' OR final_disposition = 'None')
        AND NOT EXISTS (SELECT 1 FROM floor_actions fa WHERE fa.bill_id = bills.id)
        AND NOT EXISTS (SELECT 1 FROM rts_agendas ra WHERE ra.bill_number = bills.number AND ra.is_past = 0)
    `).bind(now, now, sessionId).run();

    // Senate bills still in Senate committee or never assigned
    const senateResult = await env.DB.prepare(`
      UPDATE bills SET
        status = 'dead',
        dead_reason = 'missed_origin_deadline',
        deadline_dead_at = ?,
        updated_at = ?
      WHERE session_id = ?
        AND chamber = 'S'
        AND status IN ('introduced', 'in_committee')
        AND (dead_reason IS NULL OR dead_reason = '')
        AND (deadline_dead_at IS NULL OR deadline_dead_at = '')
        AND (final_disposition IS NULL OR final_disposition = '' OR final_disposition = 'None')
        AND NOT EXISTS (SELECT 1 FROM floor_actions fa WHERE fa.bill_id = bills.id)
        AND NOT EXISTS (SELECT 1 FROM rts_agendas ra WHERE ra.bill_number = bills.number AND ra.is_past = 0)
    `).bind(now, now, sessionId).run();

    const originDead = (houseResult.meta?.changes || 0) + (senateResult.meta?.changes || 0);
    deadByReason.missed_origin_deadline = originDead;
    totalMarkedDead += originDead;
    if (originDead > 0) console.log(`Deadline checker: ${originDead} bills missed origin committee deadline`);
  }

  // --- 2. Crossover committee deadline ---
  if (today > deadlines.crossover_committee) {
    // House bills that passed the House but are stuck in Senate committee
    // Status would still be 'passed_house' if they haven't progressed in the Senate
    // We need to check bills that crossed over but didn't get heard
    // These show as 'passed_house' (for HBs) or 'passed_senate' (for SBs) but
    // haven't advanced to 'passed_both' or beyond
    // However, 'passed_house'/'passed_senate' doesn't tell us if they're stuck
    // in committee on the other side. We'd need to check committee_actions.
    // For now, we'll check bills with passed_committee status that haven't
    // progressed — these are likely stuck between chambers.

    // Only kill 'passed_committee' bills that have NO activity in the crossover chamber.
    // If a bill has committee actions or floor actions in the opposite chamber,
    // it crossed over and is still alive.
    const crossoverResult = await env.DB.prepare(`
      UPDATE bills SET
        status = 'dead',
        dead_reason = 'missed_crossover_deadline',
        deadline_dead_at = ?,
        updated_at = ?
      WHERE session_id = ?
        AND status = 'passed_committee'
        AND (dead_reason IS NULL OR dead_reason = '')
        AND (deadline_dead_at IS NULL OR deadline_dead_at = '')
        AND NOT EXISTS (
          SELECT 1 FROM committee_actions ca
          WHERE ca.bill_id = bills.id
          AND ca.chamber != bills.chamber
        )
        AND NOT EXISTS (
          SELECT 1 FROM floor_actions fa
          WHERE fa.bill_id = bills.id
          AND fa.chamber != bills.chamber
        )
    `).bind(now, now, sessionId).run();

    const crossoverDead = crossoverResult.meta?.changes || 0;
    deadByReason.missed_crossover_deadline = crossoverDead;
    totalMarkedDead += crossoverDead;
    if (crossoverDead > 0) console.log(`Deadline checker: ${crossoverDead} bills missed crossover deadline`);
  }

  // --- 2b. Failed floor votes (past crossover deadline) ---
  // Bills whose status shows passed_house/passed_senate because a THIRD reading
  // FloorHeader exists, but the actual vote(s) all failed. The legislature can
  // retain and revote, so we only mark dead after the crossover deadline passes.
  if (today > deadlines.crossover_committee) {
    const failedFloorResult = await env.DB.prepare(`
      UPDATE bills SET
        status = 'dead',
        dead_reason = 'defeated',
        deadline_dead_at = ?,
        updated_at = ?
      WHERE session_id = ?
        AND status IN ('passed_house', 'passed_senate')
        AND (dead_reason IS NULL OR dead_reason = '')
        AND (deadline_dead_at IS NULL OR deadline_dead_at = '')
        AND id IN (
          SELECT b.id FROM bills b
          JOIN votes v ON v.bill_id = b.id AND v.chamber = b.chamber
          WHERE b.session_id = ?
            AND b.status IN ('passed_house', 'passed_senate')
          GROUP BY b.id
          HAVING SUM(CASE WHEN v.result = 'Passed' OR v.result = 'Adopted' OR v.result = 'Passed Amended' THEN 1 ELSE 0 END) = 0
        )
    `).bind(now, now, sessionId, sessionId).run();

    const failedFloorDead = failedFloorResult.meta?.changes || 0;
    deadByReason.defeated_floor_vote = failedFloorDead;
    totalMarkedDead += failedFloorDead;
    if (failedFloorDead > 0) console.log(`Deadline checker: ${failedFloorDead} bills failed floor votes with no subsequent pass`);
  }

  // --- 2c. Crossover stalls (past crossover deadline) ---
  // Bills that legitimately passed their origin chamber but have ZERO activity
  // in the crossover chamber — no committee actions, no floor actions, no readings.
  // A bill with ANY crossover-chamber activity (committee hearings, readings, caucus,
  // consent calendar, etc.) is still alive and must not be marked dead here.
  if (today > deadlines.crossover_committee) {
    const crossoverStallResult = await env.DB.prepare(`
      UPDATE bills SET
        status = 'dead',
        dead_reason = 'missed_crossover_deadline',
        deadline_dead_at = ?,
        updated_at = ?
      WHERE session_id = ?
        AND ((chamber = 'H' AND status = 'passed_house') OR (chamber = 'S' AND status = 'passed_senate'))
        AND (dead_reason IS NULL OR dead_reason = '')
        AND (deadline_dead_at IS NULL OR deadline_dead_at = '')
        AND (final_disposition IS NULL OR final_disposition = '' OR final_disposition = 'None')
        AND NOT EXISTS (
          SELECT 1 FROM floor_actions fa
          WHERE fa.bill_id = bills.id
          AND fa.chamber != bills.chamber
        )
        AND NOT EXISTS (
          SELECT 1 FROM committee_actions ca
          WHERE ca.bill_id = bills.id
          AND ca.chamber != bills.chamber
        )
    `).bind(now, now, sessionId).run();

    const crossoverStallDead = crossoverStallResult.meta?.changes || 0;
    deadByReason.missed_crossover_stall = crossoverStallDead;
    totalMarkedDead += crossoverStallDead;
    if (crossoverStallDead > 0) console.log(`Deadline checker: ${crossoverStallDead} bills passed origin but stalled in crossover chamber`);
  }

  // --- 3. Conference committee deadline ---
  if (today > deadlines.conference_committee) {
    const confResult = await env.DB.prepare(`
      UPDATE bills SET
        status = 'dead',
        dead_reason = 'missed_conference_deadline',
        deadline_dead_at = ?,
        updated_at = ?
      WHERE session_id = ?
        AND status = 'passed_both'
        AND (dead_reason IS NULL OR dead_reason = '')
        AND (deadline_dead_at IS NULL OR deadline_dead_at = '')
    `).bind(now, now, sessionId).run();

    const confDead = confResult.meta?.changes || 0;
    deadByReason.missed_conference_deadline = confDead;
    totalMarkedDead += confDead;
    if (confDead > 0) console.log(`Deadline checker: ${confDead} bills missed conference deadline`);
  }

  // --- 4. Backfill dead_reason for azleg-marked dead bills ---
  const backfillResult = await env.DB.prepare(`
    UPDATE bills SET dead_reason = CASE
      WHEN lower(final_disposition) LIKE '%defeated%' OR lower(final_disposition) LIKE '%failed%' THEN 'defeated'
      WHEN lower(final_disposition) LIKE '%withdrawn%' THEN 'withdrawn'
      WHEN status = 'vetoed' THEN 'vetoed'
      WHEN status = 'held' THEN 'held'
      ELSE 'final_disposition'
    END
    WHERE session_id = ?
      AND status IN ('dead', 'vetoed', 'held')
      AND (dead_reason IS NULL OR dead_reason = '')
      AND deadline_dead_at IS NULL
  `).bind(sessionId).run();

  const backfilled = backfillResult.meta?.changes || 0;
  if (backfilled > 0) console.log(`Deadline checker: backfilled dead_reason for ${backfilled} azleg-marked bills`);

  // --- 5. Backfill original_short_title ---
  const titleResult = await env.DB.prepare(`
    UPDATE bills SET original_short_title = short_title
    WHERE session_id = ? AND original_short_title IS NULL AND short_title IS NOT NULL
  `).bind(sessionId).run();

  const titlesBackfilled = titleResult.meta?.changes || 0;
  if (titlesBackfilled > 0) console.log(`Deadline checker: backfilled ${titlesBackfilled} original titles`);

  // --- 6. Striker detection: flag bills whose title changed (supplemental to DocType scraping) ---
  const strikerResult = await env.DB.prepare(`
    SELECT id, number, short_title, original_short_title, has_striker
    FROM bills
    WHERE session_id = ?
      AND original_short_title IS NOT NULL
      AND short_title IS NOT NULL
      AND short_title != original_short_title
  `).bind(sessionId).all();

  const strikers = strikerResult.results || [];
  let strikersFromTitle = 0;
  if (strikers.length > 0) {
    console.log(`Deadline checker: ${strikers.length} bills have changed titles (potential strikers):`);
    for (const s of strikers.slice(0, 10)) {
      console.log(`  ${s.number}: "${s.original_short_title}" → "${s.short_title}"`);
    }
    // Flag any title-changed bills that weren't caught by DocType scraping
    for (const s of strikers) {
      if (!s.has_striker) {
        await env.DB.prepare(
          'UPDATE bills SET has_striker = 1, striker_detail = ?, updated_at = ? WHERE id = ?'
        ).bind(
          JSON.stringify({ status: 'adopted', committee: null, chamber: null, doc_id: null, pdf_path: null, detected_by: 'title_change' }),
          now, s.id
        ).run();
        strikersFromTitle++;
      }
    }
    if (strikersFromTitle > 0) {
      console.log(`Deadline checker: flagged ${strikersFromTitle} additional strikers from title changes`);
    }
  }

  return {
    billsMarkedDead: totalMarkedDead,
    billsResurrected: 0, // resurrection happens in processBill during scraper run
    deadByReason,
    backfilled,
    strikers: strikers.length,
    strikersFromTitle,
  };
}

/**
 * Resurrect a bill that was deadline-dead but now shows progress in azleg API.
 * Called from processBill() in scraper.js when updating an existing bill.
 *
 * @param {object} env
 * @param {number} billId - Database bill ID
 * @param {string} newStatus - Status derived from azleg API
 * @returns {boolean} Whether the bill was resurrected
 */
export async function checkResurrection(env, billId, newStatus) {
  const PROGRESS_STATUSES = [
    'passed_committee', 'on_floor', 'passed_house', 'passed_senate',
    'passed_both', 'to_governor', 'signed',
  ];

  if (!PROGRESS_STATUSES.includes(newStatus)) return false;

  const bill = await env.DB.prepare(
    'SELECT id, number, deadline_dead_at, dead_reason FROM bills WHERE id = ?'
  ).bind(billId).first();

  if (!bill || !bill.deadline_dead_at) return false;

  // Bill was deadline-dead but azleg now shows progress — resurrect it
  await env.DB.prepare(`
    UPDATE bills SET
      status = ?,
      dead_reason = NULL,
      deadline_dead_at = NULL,
      updated_at = ?
    WHERE id = ?
  `).bind(newStatus, new Date().toISOString(), billId).run();

  console.log(`Deadline checker: RESURRECTED ${bill.number} — was '${bill.dead_reason}', now '${newStatus}'`);
  return true;
}

/**
 * Get the internal DB session ID for the current session.
 */
async function getDbSessionId(env) {
  const row = await env.DB.prepare(
    'SELECT id FROM sessions WHERE session_id = ?'
  ).bind(CURRENT_SESSION.id).first();
  return row?.id || null;
}
