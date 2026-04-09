/**
 * Cactus Watch — Arizona Legislature Bill Scraper
 *
 * Fetches bill data from the azleg.gov API and stores it in D1.
 * Strategy:
 *   1. Scrape ONE prefix at a time (e.g. HB, SB) to stay within Worker subrequest limits
 *   2. Enumerate bill numbers until 10 consecutive misses
 *   3. For each found bill, fetch sponsors via BillSponsor endpoint
 *   4. For bills with third reading floor votes, fetch individual vote records
 *   5. Orchestrator calls multiple times with different prefixes
 *
 * Rate limited to 200ms between azleg API requests.
 * ~1000 subrequest limit per Worker invocation → ~400 bills per run.
 */

import { AZLEG_API, CURRENT_SESSION, SCRAPE_RATE_LIMIT_MS } from '../shared/constants.js';
import { SESSIONS } from '../shared/constants.js';
import { deriveBillStatus, parseBillNumber } from '../shared/bill-utils.js';
import { checkResurrection } from './deadline-checker.js';

/**
 * Bill prefixes to enumerate and their starting numbers.
 * Each entry is one enumeration pass. Some prefixes have multiple passes
 * to cover gaps in azleg numbering (House bills jump from ~2999 to 4001).
 */
export const BILL_PREFIXES = [
  { prefix: 'HB', body: 'H', start: 2001 },
  { prefix: 'SB', body: 'S', start: 1001 },
  { prefix: 'HCR', body: 'H', start: 2001 },
  { prefix: 'SCR', body: 'S', start: 1001 },
  { prefix: 'HM', body: 'H', start: 2001 },
  { prefix: 'SM', body: 'S', start: 1001 },
  { prefix: 'HJR', body: 'H', start: 2001 },
  { prefix: 'SJR', body: 'S', start: 1001 },
  { prefix: 'HR', body: 'H', start: 2001 },
  { prefix: 'SR', body: 'S', start: 1001 },
];

/**
 * Additional ranges for prefixes with numbering gaps.
 * These run as separate enumeration passes after the main prefix scan.
 */
export const EXTRA_RANGES = [
  { prefix: 'HB', body: 'H', start: 4001 },  // House bills 4000+ series
];

/** Stop after this many consecutive misses per prefix */
const MISS_THRESHOLD = 10;

/**
 * Run scraper for a SINGLE prefix (e.g. "HB" or "SB").
 * Call multiple times with different prefixes to do a full scrape.
 *
 * @param {object} env - Worker environment (DB binding)
 * @param {object} options
 * @param {string} options.prefix - Bill prefix to scrape (e.g. "HB")
 * @param {number} [options.sessionId] - Override session ID
 * @param {number} [options.startAt] - Override starting number (for resuming)
 * @returns {object} Scrape result summary
 */
export async function runScraper(env, options = {}) {
  const sessionId = options.sessionId || CURRENT_SESSION.id;
  const targetPrefix = options.prefix;
  const startedAt = new Date().toISOString();

  // If no prefix specified, run all prefixes sequentially via self-calling
  // But for a single invocation, just do one prefix
  if (!targetPrefix) {
    return { error: 'prefix parameter required. Use /api/scrape/all to scrape all prefixes.' };
  }

  const prefixConfig = BILL_PREFIXES.find(p => p.prefix === targetPrefix.toUpperCase());
  if (!prefixConfig) {
    return { error: `Unknown prefix: ${targetPrefix}` };
  }

  // Create scrape log entry
  const logResult = await env.DB.prepare(
    'INSERT INTO scrape_log (session_id, started_at, status) VALUES (?, ?, ?)'
  ).bind(sessionId, startedAt, 'running').run();
  const logId = logResult.meta.last_row_id;

  // Ensure session row exists
  await ensureSession(env, sessionId);
  const sessionRow = await env.DB.prepare(
    'SELECT id FROM sessions WHERE session_id = ?'
  ).bind(sessionId).first();

  const dbSessionId = sessionRow.id;
  const errors = [];
  let billsFound = 0;
  let billsNew = 0;
  let billsUpdated = 0;

  try {
    const { prefix, body, start } = prefixConfig;
    const startNum = options.startAt || start;
    console.log(`Enumerating ${prefix} bills starting at ${prefix}${startNum}...`);

    let consecutiveMisses = 0;
    let num = startNum;

    while (consecutiveMisses < MISS_THRESHOLD) {
      const billNumber = `${prefix}${num}`;

      await sleep(SCRAPE_RATE_LIMIT_MS);

      const bill = await fetchBill(sessionId, body, billNumber);

      if (!bill || !bill.BillId) {
        consecutiveMisses++;
        num++;
        continue;
      }

      consecutiveMisses = 0;
      billsFound++;

      try {
        const result = await processBill(env, dbSessionId, sessionId, bill);
        if (result === 'new') billsNew++;
        if (result === 'updated') billsUpdated++;
      } catch (err) {
        errors.push(`Error processing ${billNumber}: ${err.message}`);
        console.error(`Error processing ${billNumber}:`, err);
      }

      num++;
    }

    const lastChecked = `${prefix}${num - 1}`;
    console.log(`${prefix} complete: ${billsFound} bills found, stopped at ${lastChecked}`);

    // Update scrape log
    await env.DB.prepare(
      `UPDATE scrape_log SET completed_at = ?, bills_found = ?, bills_new = ?,
       bills_updated = ?, errors = ?, status = ? WHERE id = ?`
    ).bind(
      new Date().toISOString(), billsFound, billsNew, billsUpdated,
      errors.length > 0 ? JSON.stringify(errors) : null,
      'complete', logId
    ).run();

    return { prefix, billsFound, billsNew, billsUpdated, lastChecked, errors };

  } catch (err) {
    await env.DB.prepare(
      `UPDATE scrape_log SET completed_at = ?, bills_found = ?, bills_new = ?,
       bills_updated = ?, errors = ?, status = ? WHERE id = ?`
    ).bind(
      new Date().toISOString(), billsFound, billsNew, billsUpdated,
      JSON.stringify([...errors, err.message]),
      'failed', logId
    ).run();
    throw err;
  }
}

/**
 * Run a full scrape of all bill prefixes.
 * Calls runScraper directly (avoids Worker self-fetch, which triggers error 1042).
 * Also runs EXTRA_RANGES to cover numbering gaps (e.g. HB4001+).
 */
export async function runFullScrape(env, sessionId) {
  const results = [];

  for (const { prefix } of BILL_PREFIXES) {
    console.log(`Starting scrape for prefix: ${prefix}`);

    try {
      const result = await runScraper(env, { prefix, sessionId });
      results.push({ prefix, ...result });
      console.log(`Prefix ${prefix}: ${result.billsFound || 0} bills`);
    } catch (err) {
      results.push({ prefix, error: err.message });
      console.error(`Failed prefix ${prefix}:`, err);
    }
  }

  // Run extra ranges for prefixes with numbering gaps
  for (const { prefix, start } of EXTRA_RANGES) {
    const label = `${prefix}@${start}`;
    console.log(`Starting extra range: ${label}`);

    try {
      const result = await runScraper(env, { prefix, sessionId, startAt: start });
      results.push({ prefix: label, ...result });
      console.log(`Extra range ${label}: ${result.billsFound || 0} bills`);
    } catch (err) {
      results.push({ prefix: label, error: err.message });
      console.error(`Failed extra range ${label}:`, err);
    }
  }

  const totals = results.reduce((acc, r) => ({
    billsFound: acc.billsFound + (r.billsFound || 0),
    billsNew: acc.billsNew + (r.billsNew || 0),
    billsUpdated: acc.billsUpdated + (r.billsUpdated || 0),
  }), { billsFound: 0, billsNew: 0, billsUpdated: 0 });

  return { ...totals, prefixes: results };
}

/**
 * Fetch a single bill from the azleg API.
 *
 * As of March 2026, the old per-field query format
 *   /Bill/?sessionId=X&legislativeBody=H&billNumber=2008
 * returns null. The working format uses the full bill number:
 *   /Bill/?sessionId=X&billNumber=HB2008
 * which returns the bill object directly (not wrapped in ListItems).
 */
export async function fetchBill(sessionId, body, billNumber) {
  const url = `${AZLEG_API}/Bill/?sessionId=${sessionId}&billNumber=${billNumber}`;
  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data) return null;

    // Handle both possible response shapes: direct object, ListItems wrapper, or array
    if (data.ListItems) return data.ListItems[0] || null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${billNumber}:`, err);
    return null;
  }
}

/**
 * Fetch sponsors for a bill.
 */
async function fetchSponsors(billId) {
  const url = `${AZLEG_API}/BillSponsor/?id=${billId}`;
  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    // Defensive: unwrap ListItems if API response shape changes
    if (data && data.ListItems) return data.ListItems;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch document types for a bill to detect strike-everything amendments.
 * Returns array of document groups from the azleg DocType endpoint.
 */
async function fetchDocTypes(billId, sessionId) {
  const url = `${AZLEG_API}/DocType/?billStatusId=${billId}&sessionId=${sessionId}`;
  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data && data.ListItems) return data.ListItems;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Check document types for strike-everything amendments.
 * Returns { hasStriker, detail } where detail is a JSON-serializable object.
 */
function detectStriker(docGroups) {
  const strikers = [];

  for (const group of docGroups) {
    const code = group.DocumentGroupCode || '';
    if (code !== 'AdoptedAmendments' && code !== 'ProposedAmendments') continue;

    for (const doc of (group.Documents || [])) {
      const name = doc.DocumentName || '';
      if (!name.toLowerCase().includes('strike everything')) continue;

      // Parse committee from pattern: "CHAMBER - Committee Name - Strike Everything"
      const parts = name.split(' - ');
      const committee = parts.length >= 3 ? parts.slice(1, -1).join(' - ') : null;
      const chamber = parts[0]?.trim().toUpperCase() || null;

      strikers.push({
        status: code === 'AdoptedAmendments' ? 'adopted' : 'proposed',
        committee,
        chamber: chamber === 'HOUSE' ? 'H' : chamber === 'SENATE' ? 'S' : null,
        doc_id: doc.Id || null,
        pdf_path: doc.PdfPath || null,
      });
    }
  }

  if (strikers.length === 0) return { hasStriker: false, detail: null };

  // Prefer adopted over proposed
  const adopted = strikers.find(s => s.status === 'adopted');
  return { hasStriker: true, detail: adopted || strikers[0] };
}

/**
 * Fetch floor vote details with individual records.
 */
async function fetchFloorVote(billId, actionId) {
  const url = `${AZLEG_API}/BillStatusFloorAction/?billStatusId=${billId}&billStatusActionId=${actionId}&includeVotes=true`;
  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    // Unwrap ListItems if API response shape changed
    const items = data?.ListItems || data;
    // API returns an array — take the first element
    if (Array.isArray(items)) return items[0] || null;
    return items;
  } catch {
    return null;
  }
}

/**
 * Process a single bill — upsert into D1 with sponsors, committees, and votes.
 */
export async function processBill(env, dbSessionId, azlegSessionId, bill) {
  const number = (bill.Number || '').trim().toUpperCase();
  if (!number) return null;

  const parsed = parseBillNumber(number);
  if (!parsed) return null;

  const now = new Date().toISOString();
  const status = deriveBillStatus(bill);
  const primeSponsor = extractPrimeSponsor(bill);
  const azlegUrl = `https://apps.azleg.gov/BillStatus/BillOverview/${bill.BillId}?SessionId=${azlegSessionId}`;
  const lastAction = extractLastAction(bill);
  const keywords = bill.Keywords
    ? bill.Keywords.map(k => k.Keyword || k).join(', ')
    : null;

  const existing = await env.DB.prepare(
    'SELECT id, updated_at, deadline_dead_at, dead_reason FROM bills WHERE session_id = ? AND number = ?'
  ).bind(dbSessionId, number).first();

  let billDbId;
  let result;

  if (existing) {
    await env.DB.prepare(`
      UPDATE bills SET
        azleg_bill_id = ?, short_title = ?, description = ?,
        sponsor = ?, sponsor_party = ?,
        last_action = ?, last_action_date = ?,
        status = ?, final_disposition = ?,
        governor_action = ?, governor_action_date = ?,
        azleg_url = ?, keywords = ?,
        scraped_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      bill.BillId, bill.ShortTitle || bill.NOWTitle || null,
      bill.Description || null,
      primeSponsor?.name || null, primeSponsor?.party || null,
      lastAction?.text || null, lastAction?.date || null,
      status, bill.FinalDisposition || null,
      bill.GovernorAction || null, bill.GovernorActionDate || null,
      azlegUrl, keywords,
      now, now,
      existing.id
    ).run();
    billDbId = existing.id;
    result = 'updated';

    // Check if a deadline-dead bill should be resurrected
    if (existing.deadline_dead_at) {
      const resurrected = await checkResurrection(env, billDbId, status);
      if (resurrected) result = 'resurrected';
    }
  } else {
    const shortTitle = bill.ShortTitle || bill.NOWTitle || null;
    const insertResult = await env.DB.prepare(`
      INSERT INTO bills (
        session_id, azleg_bill_id, number, short_title, description,
        sponsor, sponsor_party, chamber, bill_type,
        date_introduced, last_action, last_action_date,
        status, final_disposition,
        governor_action, governor_action_date,
        azleg_url, keywords, original_short_title, scraped_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dbSessionId, bill.BillId, number,
      shortTitle,
      bill.Description || null,
      primeSponsor?.name || null, primeSponsor?.party || null,
      parsed.chamber, parsed.type,
      bill.DateIntroduced || bill.PreFileDate || null,
      lastAction?.text || null, lastAction?.date || null,
      status, bill.FinalDisposition || null,
      bill.GovernorAction || null, bill.GovernorActionDate || null,
      azlegUrl, keywords, shortTitle,
      now, now
    ).run();
    billDbId = insertResult.meta.last_row_id;
    result = 'new';
  }

  // Fetch and store sponsors
  await sleep(SCRAPE_RATE_LIMIT_MS);
  await processSponsors(env, billDbId, bill.BillId);

  // Process committee actions from the bill data (already in response, no extra fetch)
  await processCommitteeActions(env, billDbId, bill);

  // Process floor actions — readings, COW (already in response, no extra fetch)
  await processFloorActions(env, billDbId, bill);

  // Process floor votes (requires extra fetch per vote)
  await processFloorVotes(env, billDbId, bill);

  // Check for strike-everything amendments (skip if already flagged)
  const existingStriker = existing ? await env.DB.prepare(
    'SELECT has_striker FROM bills WHERE id = ?'
  ).bind(billDbId).first() : null;

  if (!existingStriker || !existingStriker.has_striker) {
    await sleep(SCRAPE_RATE_LIMIT_MS);
    const docGroups = await fetchDocTypes(bill.BillId, azlegSessionId);
    const { hasStriker, detail } = detectStriker(docGroups);

    await env.DB.prepare(
      `UPDATE bills SET has_striker = ?, striker_detail = ?, updated_at = ?
       ${hasStriker ? ', striker_detected_at = COALESCE(striker_detected_at, ?)' : ''}
       WHERE id = ?`
    ).bind(
      ...(hasStriker
        ? [1, JSON.stringify(detail), new Date().toISOString(), new Date().toISOString(), billDbId]
        : [0, null, new Date().toISOString(), billDbId])
    ).run();

    if (hasStriker) {
      console.log(`Striker detected: ${number} — ${detail.status} by ${detail.committee || 'unknown'}`);
    }
  }

  return result;
}

function extractPrimeSponsor(bill) {
  const sponsors = bill.Sponsors || [];
  const prime = sponsors.find(s => s.SponsorType === 'Prime');
  if (prime?.Legislator) {
    return {
      name: prime.Legislator.FullName || `${prime.Legislator.FirstName} ${prime.Legislator.LastName}`,
      party: prime.Legislator.Party || null,
    };
  }
  return null;
}

function extractLastAction(bill) {
  const actions = [];

  if (bill.GovernorAction && bill.GovernorAction !== 'None') {
    actions.push({ text: `Governor: ${bill.GovernorAction}`, date: bill.GovernorActionDate || null, priority: 100 });
  }

  for (const fh of (bill.FloorHeaders || [])) {
    actions.push({ text: `${fh.CommitteeName || 'Floor'}: ${fh.TotalVotes ? 'Voted' : 'Action'}`, date: fh.ActionDate || null, priority: 80 });
  }

  for (const bsa of (bill.BillStatusAction || [])) {
    const name = bsa.Committee?.CommitteeShortName || bsa.Committee?.CommitteeName || 'Committee';
    actions.push({ text: `${name}: ${bsa.Action || 'Action'}`, date: bsa.ReportDate || null, priority: 60 });
  }

  if (bill.BodyTransmittedTo?.length > 0) {
    const t = bill.BodyTransmittedTo[bill.BodyTransmittedTo.length - 1];
    actions.push({ text: `Transmitted to ${t.LegislativeBody === 'H' ? 'House' : 'Senate'}`, date: t.TransmitDate || null, priority: 70 });
  }

  if (actions.length === 0) {
    return { text: 'Introduced', date: bill.DateIntroduced || bill.PreFileDate || null };
  }

  actions.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return b.priority - a.priority;
  });

  return actions[0];
}

async function processSponsors(env, billDbId, azlegBillId) {
  const sponsors = await fetchSponsors(azlegBillId);
  if (!sponsors || sponsors.length === 0) return;

  await env.DB.prepare('DELETE FROM cosponsors WHERE bill_id = ?').bind(billDbId).run();

  // Find prime sponsor and update the bill's sponsor column
  const prime = sponsors.find(s => s.SponsorType === 'Prime');
  if (prime?.Legislator) {
    const primeName = prime.Legislator.FullName || `${prime.Legislator.FirstName} ${prime.Legislator.LastName}`;
    await env.DB.prepare(
      'UPDATE bills SET sponsor = ?, sponsor_party = ? WHERE id = ?'
    ).bind(primeName.trim(), prime.Legislator.Party || null, billDbId).run();
  }

  for (const s of sponsors) {
    const leg = s.Legislator;
    if (!leg) continue;
    const name = leg.FullName || `${leg.FirstName} ${leg.LastName}`;
    await env.DB.prepare(
      'INSERT OR IGNORE INTO cosponsors (bill_id, name, party, sponsor_type) VALUES (?, ?, ?, ?)'
    ).bind(billDbId, name.trim(), leg.Party || null, s.SponsorType || 'CoSponsor').run();
  }
}

async function processCommitteeActions(env, billDbId, bill) {
  const actions = bill.BillStatusAction || [];
  if (actions.length === 0) return;

  await env.DB.prepare('DELETE FROM committee_actions WHERE bill_id = ?').bind(billDbId).run();

  for (const a of actions) {
    const committee = a.Committee || {};
    if (committee.CommitteeShortName === 'THIRD' || committee.CommitteeShortName === 'COW') continue;
    // Committee.LegislativeBody is the reliable source for which chamber the
    // committee belongs to. The action-level LegislativeBody is often null.
    const chamber = a.Committee?.LegislativeBody || a.LegislativeBody || (bill.Number?.startsWith('H') ? 'H' : 'S');

    await env.DB.prepare(`
      INSERT INTO committee_actions (bill_id, committee_name, committee_short, chamber, action, ayes, nays, action_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      billDbId, committee.CommitteeName || 'Unknown', committee.CommitteeShortName || '',
      chamber, a.Action || null, a.Ayes || 0, a.Nays || 0, a.ReportDate || null
    ).run();
  }
}

async function processFloorActions(env, billDbId, bill) {
  const actions = [];

  // Parse top-level reading date fields (House1stRead, Senate2ndRead, etc.)
  for (const [chamber, prefix] of [['H', 'House'], ['S', 'Senate']]) {
    if (bill[`${prefix}1stRead`]) {
      actions.push({ chamber, action_type: '1st_read', action_date: bill[`${prefix}1stRead`] });
    }
    if (bill[`${prefix}2ndRead`]) {
      actions.push({ chamber, action_type: '2nd_read', action_date: bill[`${prefix}2ndRead`] });
    }
  }

  // Parse FloorHeaders for COW and 3rd reading (with action IDs and vote totals)
  for (const fh of (bill.FloorHeaders || [])) {
    if (fh.CommitteeShortName === 'COW') {
      actions.push({
        chamber: fh.LegislativeBody,
        action_type: 'cow',
        action_date: fh.ActionDate,
        azleg_action_id: fh.BillStatusActionId,
        total_votes: fh.TotalVotes || 0,
      });
    } else if (fh.CommitteeShortName === 'THIRD') {
      actions.push({
        chamber: fh.LegislativeBody,
        action_type: '3rd_read',
        action_date: fh.ActionDate,
        azleg_action_id: fh.BillStatusActionId,
        total_votes: fh.TotalVotes || 0,
      });
    }
  }

  if (actions.length === 0) return;

  // Upsert floor actions (replace on conflict)
  for (const a of actions) {
    await env.DB.prepare(`
      INSERT INTO floor_actions (bill_id, chamber, action_type, action_date, azleg_action_id, total_votes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(bill_id, chamber, action_type) DO UPDATE SET
        action_date = excluded.action_date,
        azleg_action_id = excluded.azleg_action_id,
        total_votes = excluded.total_votes
    `).bind(
      billDbId, a.chamber, a.action_type,
      a.action_date || null, a.azleg_action_id || null, a.total_votes || 0
    ).run();
  }
}

async function processFloorVotes(env, billDbId, bill) {
  const floorHeaders = bill.FloorHeaders || [];
  if (floorHeaders.length === 0) return;

  for (const fh of floorHeaders) {
    if (fh.CommitteeShortName !== 'THIRD') continue;

    const existingVote = await env.DB.prepare(
      'SELECT id, yeas, nays FROM votes WHERE bill_id = ? AND chamber = ? AND azleg_action_id = ?'
    ).bind(billDbId, fh.LegislativeBody, fh.BillStatusActionId).first();

    // Skip if we already have complete vote data; re-fetch if yeas+nays=0 (incomplete from earlier failed scrape)
    if (existingVote && (existingVote.yeas > 0 || existingVote.nays > 0)) continue;

    // Delete incomplete vote data before re-fetching
    if (existingVote) {
      await env.DB.prepare('DELETE FROM vote_records WHERE vote_id = ?').bind(existingVote.id).run();
      await env.DB.prepare('DELETE FROM votes WHERE id = ?').bind(existingVote.id).run();
    }

    await sleep(SCRAPE_RATE_LIMIT_MS);

    const voteData = await fetchFloorVote(bill.BillId, fh.BillStatusActionId);
    if (!voteData) continue;

    const voteResult = await env.DB.prepare(`
      INSERT INTO votes (bill_id, azleg_action_id, chamber, vote_date, yeas, nays, not_voting, excused, result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      billDbId, fh.BillStatusActionId, fh.LegislativeBody,
      voteData.AssignedDate || fh.ActionDate || null,
      voteData.Ayes || 0, voteData.Nays || 0,
      voteData.NotVoting || 0, voteData.Excused || 0,
      voteData.Action || (voteData.Ayes > voteData.Nays ? 'Passed' : 'Failed')
    ).run();

    const voteDbId = voteResult.meta.last_row_id;
    const records = voteData.Votes || [];
    for (const rec of records) {
      const leg = rec.Legislator || {};
      const name = leg.FullName || `${leg.FirstName || ''} ${leg.LastName || ''}`.trim();
      if (!name) continue;
      await env.DB.prepare(
        'INSERT OR IGNORE INTO vote_records (vote_id, legislator, party, vote) VALUES (?, ?, ?, ?)'
      ).bind(voteDbId, name, leg.Party || null, rec.Vote || 'NV').run();
    }
  }
}

async function ensureSession(env, azlegSessionId) {
  const existing = await env.DB.prepare(
    'SELECT id FROM sessions WHERE session_id = ?'
  ).bind(azlegSessionId).first();

  if (existing) return;

  const sessionInfo = SESSIONS.find(s => s.id === azlegSessionId);

  if (sessionInfo) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO sessions (session_id, legislature, session_code, name, year, is_current) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      sessionInfo.id, sessionInfo.legislature, sessionInfo.session,
      sessionInfo.name, sessionInfo.year,
      sessionInfo.id === SESSIONS[0].id ? 1 : 0
    ).run();
  } else {
    const resp = await fetch(`${AZLEG_API}/Session/`);
    const rawSessions = await resp.json();
    // Defensive: unwrap ListItems if API response shape changes
    const sessions = rawSessions?.ListItems || (Array.isArray(rawSessions) ? rawSessions : []);
    const s = sessions.find(s => s.SessionId === azlegSessionId);
    if (s) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO sessions (session_id, legislature, session_code, name, year, is_current) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        s.SessionId, parseInt(s.Legislature) || 0, s.Code || '',
        s.Name || '', parseInt(s.Name) || 2026, 0
      ).run();
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
