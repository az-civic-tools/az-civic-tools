/**
 * Cactus Watch — RTS Agenda Scraper
 *
 * Paginates through the azleg.gov AgendaItem API to fetch ALL upcoming
 * agenda items, then does a full refresh of the rts_agendas table.
 *
 * Run nightly via cron alongside the bill scraper, or manually via
 * POST /api/scrape/rts.
 */

import { AZLEG_API, CURRENT_SESSION, SCRAPE_RATE_LIMIT_MS } from '../shared/constants.js';

const AZLEG_RTS_BASE = 'https://apps.azleg.gov/RequestToSpeak/New';
const PAGE_SIZE = 50;
const MAX_PAGES = 30; // safety valve — 1500 items max

/** Approximate session window — skip scraping outside this range */
const SESSION_WINDOW = {
  start: '2026-01-01',
  end: '2026-06-30',
};

function isSessionActive() {
  const now = new Date().toISOString().slice(0, 10);
  return now >= SESSION_WINDOW.start && now <= SESSION_WINDOW.end;
}

/**
 * Fetch a single page of agenda items from the azleg API.
 */
async function fetchAgendaPage(sessionId, page) {
  const params = new URLSearchParams({
    searchPhrase: '',
    sessionId: String(sessionId),
    body: '',
    page: String(page),
    pageSize: String(PAGE_SIZE),
    showPastAgendas: 'false',
    rtsOnly: 'false',
    includeRequests: 'false',
    filterUserRequests: 'false',
  });

  const resp = await fetch(`${AZLEG_API}/AgendaItem/?${params}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!resp.ok) {
    throw new Error(`AgendaItem API returned ${resp.status}`);
  }

  return resp.json();
}

/**
 * Tally position counts from a BillPositions array.
 */
function tallyPositions(billPositions) {
  const counts = { for: 0, against: 0, neutral: 0 };
  for (const bp of (billPositions || [])) {
    const opinion = (bp.Opinion || '').toLowerCase();
    if (opinion === 'for') counts.for++;
    else if (opinion === 'against') counts.against++;
    else if (opinion === 'neutral') counts.neutral++;
  }
  return counts;
}

/**
 * Transform an azleg AgendaItem into the shape for our D1 table.
 */
function transformAgendaItem(item, scrapedAt) {
  const positions = tallyPositions(item.BillPositions);
  return {
    agenda_item_id: item.AgendaItemId,
    bill_number: (item.BillNumber || '').trim().toUpperCase(),
    committee_name: item.CommitteeName || null,
    committee_short: item.CommitteeShortName || null,
    chamber: item.Body || null,
    agenda_date: item.Agenda?.Date || null,
    agenda_time: item.Agenda?.Time || null,
    location: item.Location || item.Agenda?.Room || null,
    can_rts: item.CanRts ? 1 : 0,
    is_past: item.IsPast ? 1 : 0,
    positions_for: positions.for,
    positions_against: positions.against,
    positions_neutral: positions.neutral,
    rts_url: `${AZLEG_RTS_BASE}/${item.AgendaItemId}`,
    scraped_at: scrapedAt,
  };
}

/**
 * Run the RTS agenda scraper — paginate through all items, full refresh D1.
 *
 * @param {object} env - Worker environment with DB binding
 * @returns {object} Summary: { itemsFound, itemsStored, pages, skipped }
 */
export async function runRtsScraper(env) {
  if (!isSessionActive()) {
    return { itemsFound: 0, itemsStored: 0, pages: 0, skipped: true, reason: 'session not active' };
  }

  const scrapedAt = new Date().toISOString();
  const allItems = [];
  let page = 1;

  // Paginate until we get an empty page or hit the safety limit
  // Note: as of ~Mar 2026, the API returns all items in one page (ignoring perPage)
  // with TotalPages showing an integer overflow. We handle both paginated and unpaginated.
  while (page <= MAX_PAGES) {
    await sleep(SCRAPE_RATE_LIMIT_MS);

    const data = await fetchAgendaPage(CURRENT_SESSION.id, page);
    // AgendaItem API returns { ListItems: [...] } — unwrap, with array fallback
    const items = data?.ListItems || (Array.isArray(data) ? data : []);

    if (items.length === 0) break;

    for (const item of items) {
      if (!item.BillNumber || !item.AgendaItemId) continue;
      allItems.push(transformAgendaItem(item, scrapedAt));
    }

    // If API returned all items at once (broken pagination) or fewer than PAGE_SIZE, stop
    const totalPages = data?.TotalPages;
    if (totalPages != null && (totalPages <= 1 || totalPages < 0)) break;
    if (items.length < PAGE_SIZE) break;
    page++;
  }

  // Full refresh: delete all old rows, insert fresh data
  // D1 batch limit is ~100 statements, so chunk inserts
  const CHUNK_SIZE = 50;
  const statements = [env.DB.prepare('DELETE FROM rts_agendas')];

  for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
    const chunk = allItems.slice(i, i + CHUNK_SIZE);
    for (const item of chunk) {
      statements.push(
        env.DB.prepare(`
          INSERT INTO rts_agendas (
            agenda_item_id, bill_number, committee_name, committee_short,
            chamber, agenda_date, agenda_time, location,
            can_rts, is_past, positions_for, positions_against, positions_neutral,
            rts_url, scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          item.agenda_item_id, item.bill_number, item.committee_name, item.committee_short,
          item.chamber, item.agenda_date, item.agenda_time, item.location,
          item.can_rts, item.is_past, item.positions_for, item.positions_against, item.positions_neutral,
          item.rts_url, item.scraped_at,
        )
      );
    }
  }

  await env.DB.batch(statements);

  return {
    itemsFound: allItems.length,
    itemsStored: allItems.length,
    pages: page,
    skipped: false,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
