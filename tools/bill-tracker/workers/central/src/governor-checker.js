/**
 * Cactus Watch — Governor Action Checker
 *
 * Post-processing step that runs alongside the deadline checker.
 * Targets only bills in 'passed_both' or 'to_governor' status and
 * re-fetches them from the azleg API to catch governor sign/veto
 * actions that the API was slow to reflect during the main scrape.
 *
 * Typically checks ~20-40 bills per run vs 2,100+ for a full scrape.
 */

import { AZLEG_API, CURRENT_SESSION, SCRAPE_RATE_LIMIT_MS } from '../shared/constants.js';
import { fetchBill } from './scraper.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Re-check bills awaiting governor action for sign/veto updates.
 * @param {object} env - Cloudflare Worker env bindings
 * @returns {object} { checked, signed, vetoed, unchanged }
 */
export async function runGovernorChecker(env) {
  const sessionRow = await env.DB.prepare(
    'SELECT id FROM sessions WHERE session_id = ?'
  ).bind(CURRENT_SESSION.id).first();

  if (!sessionRow) {
    console.log('Governor checker: no session row found');
    return { checked: 0, signed: 0, vetoed: 0, unchanged: 0 };
  }

  const candidates = await env.DB.prepare(`
    SELECT id, number, azleg_bill_id
    FROM bills
    WHERE session_id = ?
      AND status IN ('passed_both', 'to_governor')
      AND governor_action IS NULL
    ORDER BY number
  `).bind(sessionRow.id).all();

  const bills = candidates.results || [];
  console.log(`Governor checker: ${bills.length} bills awaiting governor action`);

  if (bills.length === 0) {
    return { checked: 0, signed: 0, vetoed: 0, unchanged: 0 };
  }

  let signed = 0;
  let vetoed = 0;
  let unchanged = 0;
  const now = new Date().toISOString();

  for (const bill of bills) {
    await sleep(SCRAPE_RATE_LIMIT_MS);

    const prefix = bill.number.replace(/\d+/, '');
    const body = prefix.startsWith('H') ? 'H' : 'S';

    const fresh = await fetchBill(CURRENT_SESSION.id, body, bill.number);
    if (!fresh) {
      console.log(`Governor checker: failed to fetch ${bill.number}`);
      unchanged++;
      continue;
    }

    const action = fresh.GovernorAction;
    const actionDate = fresh.GovernorActionDate;

    if (action === 'Signed') {
      await env.DB.prepare(`
        UPDATE bills SET
          governor_action = ?, governor_action_date = ?,
          status = 'signed', updated_at = ?
        WHERE id = ?
      `).bind(action, actionDate, now, bill.id).run();
      signed++;
      console.log(`Governor checker: ${bill.number} → Signed`);

    } else if (action === 'Vetoed') {
      await env.DB.prepare(`
        UPDATE bills SET
          governor_action = ?, governor_action_date = ?,
          status = 'vetoed', dead_reason = 'vetoed', updated_at = ?
        WHERE id = ?
      `).bind(action, actionDate, now, bill.id).run();
      vetoed++;
      console.log(`Governor checker: ${bill.number} → Vetoed`);

    } else if (action && action !== 'None') {
      await env.DB.prepare(`
        UPDATE bills SET
          governor_action = ?, governor_action_date = ?,
          status = 'to_governor', updated_at = ?
        WHERE id = ?
      `).bind(action, actionDate, now, bill.id).run();
      console.log(`Governor checker: ${bill.number} → ${action}`);
      unchanged++;

    } else {
      unchanged++;
    }
  }

  const result = { checked: bills.length, signed, vetoed, unchanged };
  console.log(`Governor checker complete:`, JSON.stringify(result));
  return result;
}
