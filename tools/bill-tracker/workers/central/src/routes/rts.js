/**
 * Cactus Watch — RTS (Request to Speak) Route
 *
 * GET /api/rts/:billNumber — Read RTS agenda items from D1 (scraped nightly)
 *   Returns upcoming agenda items for a bill, including:
 *   - Direct deep-link to the RTS "Add Request" page
 *   - Committee name, date, time, room
 *   - Whether RTS is currently open
 *   - Public position tallies (For / Against / Neutral)
 *
 * Data is populated by the nightly RTS scraper (rts-scraper.js).
 */

/** Approximate session date range — update when session changes */
const SESSION_WINDOW = {
  start: '2026-01-01',
  end: '2026-06-30',
};

function isSessionActive() {
  const now = new Date().toISOString().slice(0, 10);
  return now >= SESSION_WINDOW.start && now <= SESSION_WINDOW.end;
}

function formatRow(a) {
  return {
    agenda_item_id: a.agenda_item_id,
    rts_url: a.rts_url,
    committee: a.committee_name,
    committee_short: a.committee_short,
    chamber: a.chamber,
    date: a.agenda_date,
    time: a.agenda_time,
    room: a.location,
    can_rts: !!a.can_rts,
    is_past: !!a.is_past,
    positions: { for: a.positions_for, against: a.positions_against, neutral: a.positions_neutral },
  };
}

export async function handleRts(billNumber, env) {
  if (!isSessionActive()) {
    return Response.json({
      bill: billNumber,
      session_active: false,
      agendas: [],
      message: 'Legislative session is not currently active. RTS data unavailable.',
    });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT agenda_item_id, committee_name, committee_short, chamber,
             agenda_date, agenda_time, location, can_rts, is_past,
             positions_for, positions_against, positions_neutral, rts_url
      FROM rts_agendas
      WHERE bill_number = ? AND is_past = 0
      ORDER BY agenda_date ASC
    `).bind(billNumber).all();

    return Response.json({
      bill: billNumber,
      session_active: true,
      agendas: (result.results || []).map(formatRow),
    });
  } catch (err) {
    console.error('RTS query error:', err);
    return Response.json(
      { error: 'Failed to query RTS data' },
      { status: 500 }
    );
  }
}
