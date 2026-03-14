/**
 * Cactus Watch — Bill API Routes
 *
 * GET /api/bills        — paginated, filterable bill list
 * GET /api/bills/:num   — single bill with full detail
 * GET /api/bills/sync   — bills changed since a date
 */

import { clampInt, isValidBillNumber } from '../../shared/validation.js';
import { formatBillNumber } from '../../shared/bill-utils.js';
import { CURRENT_SESSION } from '../../shared/constants.js';

/**
 * GET /api/bills — List bills with pagination and filters.
 *
 * Query params:
 *   page     — page number (default 1)
 *   limit    — results per page (default 50, max 200)
 *   session  — session ID (default current)
 *   chamber  — H or S
 *   status   — bill status key
 *   sponsor  — sponsor name (partial match)
 *   search   — search short_title and number
 *   type     — bill type (bill, memorial, resolution, etc.)
 *   sort     — field to sort by (number, updated_at, date_introduced, status)
 *   order    — asc or desc (default desc)
 */
export async function handleListBills(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const page = clampInt(params.get('page'), 1, 1, 1000);
  const limit = clampInt(params.get('limit'), 50, 1, 200);
  const offset = (page - 1) * limit;

  const sessionId = params.get('session') || null;
  const chamber = params.get('chamber');
  const status = params.get('status');
  const sponsor = params.get('sponsor');
  const search = params.get('search');
  const billType = params.get('type');
  const sort = params.get('sort') || 'updated_at';
  const order = params.get('order') === 'asc' ? 'ASC' : 'DESC';

  // Build query
  const conditions = [];
  const bindings = [];

  // Default to current session
  if (sessionId) {
    conditions.push('s.session_id = ?');
    bindings.push(parseInt(sessionId, 10));
  } else {
    conditions.push('s.session_id = ?');
    bindings.push(CURRENT_SESSION.id);
  }

  if (chamber && (chamber === 'H' || chamber === 'S')) {
    conditions.push('b.chamber = ?');
    bindings.push(chamber);
  }

  if (status) {
    conditions.push('b.status = ?');
    bindings.push(status);
  }

  if (sponsor) {
    conditions.push('b.sponsor LIKE ?');
    bindings.push(`%${sponsor}%`);
  }

  if (billType) {
    conditions.push('b.bill_type = ?');
    bindings.push(billType);
  }

  if (search) {
    conditions.push('(b.number LIKE ? OR b.short_title LIKE ? OR b.description LIKE ?)');
    const searchTerm = `%${search}%`;
    bindings.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort column
  const validSorts = {
    number: 'b.number',
    updated_at: 'b.updated_at',
    date_introduced: 'b.date_introduced',
    status: 'b.status',
    sponsor: 'b.sponsor',
  };
  const sortColumn = validSorts[sort] || 'b.updated_at';

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM bills b JOIN sessions s ON b.session_id = s.id ${whereClause}`;
  const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
  const total = countResult?.total || 0;

  // Fetch bills
  const dataQuery = `
    SELECT
      b.id, b.number, b.short_title, b.description,
      b.sponsor, b.sponsor_party, b.chamber, b.bill_type,
      b.date_introduced, b.last_action, b.last_action_date,
      b.status, b.final_disposition,
      b.governor_action, b.governor_action_date,
      b.azleg_url, b.keywords, b.updated_at,
      s.session_id as azleg_session_id, s.name as session_name
    FROM bills b
    JOIN sessions s ON b.session_id = s.id
    ${whereClause}
    ORDER BY ${sortColumn} ${order}
    LIMIT ? OFFSET ?
  `;

  const dataResult = await env.DB.prepare(dataQuery)
    .bind(...bindings, limit, offset)
    .all();

  const bills = (dataResult.results || []).map(formatBillRow);

  return Response.json({
    bills,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

/**
 * GET /api/bills/:number — Full bill detail with sponsors, committees, votes.
 */
export async function handleGetBill(number, env) {
  const normalized = number.trim().toUpperCase();

  if (!isValidBillNumber(normalized)) {
    return Response.json({ error: 'Invalid bill number' }, { status: 400 });
  }

  // Get bill with session info
  const bill = await env.DB.prepare(`
    SELECT
      b.*, s.session_id as azleg_session_id, s.name as session_name,
      s.legislature, s.session_code
    FROM bills b
    JOIN sessions s ON b.session_id = s.id
    WHERE b.number = ?
    ORDER BY s.session_id DESC
    LIMIT 1
  `).bind(normalized).first();

  if (!bill) {
    return Response.json({ error: 'Bill not found' }, { status: 404 });
  }

  // Fetch related data in parallel
  const [cosponsors, committeeActions, votes, floorActions] = await Promise.all([
    env.DB.prepare('SELECT name, party, sponsor_type FROM cosponsors WHERE bill_id = ? ORDER BY sponsor_type, name')
      .bind(bill.id).all(),
    env.DB.prepare('SELECT committee_name, committee_short, chamber, action, ayes, nays, action_date FROM committee_actions WHERE bill_id = ? ORDER BY action_date')
      .bind(bill.id).all(),
    env.DB.prepare('SELECT id, chamber, vote_date, yeas, nays, not_voting, excused, result FROM votes WHERE bill_id = ? ORDER BY vote_date')
      .bind(bill.id).all(),
    env.DB.prepare('SELECT chamber, action_type, action_date, total_votes FROM floor_actions WHERE bill_id = ? ORDER BY action_date')
      .bind(bill.id).all(),
  ]);

  // For each vote, fetch individual records
  const votesWithRecords = [];
  for (const vote of (votes.results || [])) {
    const records = await env.DB.prepare(
      'SELECT legislator, party, vote FROM vote_records WHERE vote_id = ? ORDER BY legislator'
    ).bind(vote.id).all();

    votesWithRecords.push({
      ...vote,
      records: (records.results || []),
    });
  }

  const result = {
    ...formatBillRow(bill),
    legislature: bill.legislature,
    session_code: bill.session_code,
    cosponsors: (cosponsors.results || []),
    committee_actions: (committeeActions.results || []),
    floor_actions: (floorActions.results || []),
    votes: votesWithRecords.map(v => ({
      chamber: v.chamber,
      vote_date: v.vote_date,
      yeas: v.yeas,
      nays: v.nays,
      not_voting: v.not_voting,
      excused: v.excused,
      result: v.result,
      records: v.records,
    })),
  };

  return Response.json(result);
}

/**
 * GET /api/bills/sync — Bills changed since a given date.
 *
 * Query params:
 *   since — ISO date string (required)
 *   session — session ID (default current)
 */
export async function handleSyncBills(request, env) {
  const url = new URL(request.url);
  const since = url.searchParams.get('since');

  if (!since) {
    return Response.json({ error: 'Missing required parameter: since' }, { status: 400 });
  }

  // Validate date
  const sinceDate = new Date(since);
  if (isNaN(sinceDate.getTime())) {
    return Response.json({ error: 'Invalid date format for since parameter' }, { status: 400 });
  }

  const sessionId = url.searchParams.get('session') || CURRENT_SESSION.id;

  const result = await env.DB.prepare(`
    SELECT
      b.id, b.number, b.short_title, b.description,
      b.sponsor, b.sponsor_party, b.chamber, b.bill_type,
      b.date_introduced, b.last_action, b.last_action_date,
      b.status, b.final_disposition,
      b.governor_action, b.governor_action_date,
      b.azleg_url, b.keywords, b.updated_at,
      s.session_id as azleg_session_id, s.name as session_name
    FROM bills b
    JOIN sessions s ON b.session_id = s.id
    WHERE b.updated_at > ? AND s.session_id = ?
    ORDER BY b.updated_at DESC
  `).bind(since, parseInt(sessionId, 10)).all();

  return Response.json({
    bills: (result.results || []).map(formatBillRow),
    since,
    count: result.results?.length || 0,
  });
}

/**
 * Format a raw DB bill row into the public API shape.
 */
function formatBillRow(row) {
  return {
    number: row.number,
    short_title: row.short_title,
    description: row.description,
    sponsor: row.sponsor,
    sponsor_party: row.sponsor_party,
    chamber: row.chamber,
    bill_type: row.bill_type,
    date_introduced: row.date_introduced,
    last_action: row.last_action,
    last_action_date: row.last_action_date,
    status: row.status,
    final_disposition: row.final_disposition,
    governor_action: row.governor_action,
    governor_action_date: row.governor_action_date,
    azleg_url: row.azleg_url,
    keywords: row.keywords ? row.keywords.split(', ') : [],
    session: row.azleg_session_id,
    session_name: row.session_name,
    updated_at: row.updated_at,
  };
}
