/**
 * Cactus Watch — RTS (Request to Speak) Proxy Route
 *
 * GET /api/rts/:billNumber — Proxy to azleg.gov AgendaItem API
 *   Returns active agenda items for a bill, including:
 *   - Direct deep-link to the RTS "Add Request" page
 *   - Committee name, date, time, room
 *   - Whether RTS is currently open
 *   - Public position tallies (For / Against / Neutral)
 *
 * Caches responses for 1 hour to minimize azleg.gov calls.
 * Returns empty results when the legislative session is not active.
 */

import { AZLEG_API, CURRENT_SESSION } from '../../shared/constants.js';

/** Approximate session date range — update when session changes */
const SESSION_WINDOW = {
  start: '2026-01-01',
  end: '2026-06-30',  // AZ regular sessions typically end by late June
};

const AZLEG_RTS_BASE = 'https://apps.azleg.gov/RequestToSpeak/New';

/**
 * Check whether the current legislative session is likely active.
 * Returns false outside the session window, preventing unnecessary
 * API calls to azleg.gov during the interim.
 */
function isSessionActive() {
  const now = new Date().toISOString().slice(0, 10);
  return now >= SESSION_WINDOW.start && now <= SESSION_WINDOW.end;
}

export async function handleRts(billNumber, env) {
  // Outside session window — return empty without calling azleg
  if (!isSessionActive()) {
    return Response.json({
      bill: billNumber,
      session_active: false,
      agendas: [],
      message: 'Legislative session is not currently active. RTS data unavailable.',
    });
  }

  try {
    const params = new URLSearchParams({
      searchPhrase: billNumber,
      sessionId: String(CURRENT_SESSION.id),
      body: '',
      page: '1',
      pageSize: '10',
      showPastAgendas: 'false',
      rtsOnly: 'true',
      includeRequests: 'false',
      filterUserRequests: 'false',
    });

    const resp = await fetch(`${AZLEG_API}/AgendaItem/?${params}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      return Response.json(
        { error: 'Failed to fetch RTS data from azleg.gov', status: resp.status },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const items = data.ListItems || [];

    // Transform azleg response into our clean format
    const agendas = items
      .filter(item => item.BillNumber === billNumber)
      .map(item => {
        // Tally public positions
        const positions = { for: 0, against: 0, neutral: 0 };
        for (const bp of (item.BillPositions || [])) {
          const opinion = (bp.Opinion || '').toLowerCase();
          if (opinion === 'for') positions.for++;
          else if (opinion === 'against') positions.against++;
          else if (opinion === 'neutral') positions.neutral++;
        }

        return {
          agenda_item_id: item.AgendaItemId,
          rts_url: `${AZLEG_RTS_BASE}/${item.AgendaItemId}`,
          committee: item.CommitteeName,
          committee_short: item.CommitteeShortName,
          chamber: item.Body,
          date: item.Agenda?.Date || null,
          time: item.Agenda?.Time || null,
          room: item.Location || item.Agenda?.Room || null,
          can_rts: !!item.CanRts,
          is_past: !!item.IsPast,
          positions,
        };
      });

    return Response.json({
      bill: billNumber,
      session_active: true,
      agendas,
    });
  } catch (err) {
    console.error('RTS proxy error:', err);
    return Response.json(
      { error: 'Failed to fetch RTS data' },
      { status: 502 }
    );
  }
}
