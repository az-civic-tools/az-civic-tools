/**
 * Cactus Watch — Upcoming Hearings Route
 *
 * GET /api/hearings — All upcoming RTS-open agenda items joined with bill data.
 *   Sorted by date ASC, then total positions DESC.
 *   Supports filtering by chamber and committee.
 */

export async function handleHearings(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const chamber = params.get('chamber');
  const committee = params.get('committee');

  const conditions = ['ra.is_past = 0'];
  const bindings = [];

  if (chamber && (chamber === 'H' || chamber === 'S' || chamber === 'House' || chamber === 'Senate')) {
    conditions.push('ra.chamber = ?');
    bindings.push(chamber);
  }

  if (committee) {
    conditions.push('ra.committee_short = ?');
    bindings.push(committee);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await env.DB.prepare(`
    SELECT
      ra.agenda_item_id, ra.bill_number, ra.committee_name, ra.committee_short,
      ra.chamber, ra.agenda_date, ra.agenda_time, ra.location,
      ra.can_rts, ra.is_past,
      ra.positions_for, ra.positions_against, ra.positions_neutral,
      ra.rts_url,
      b.short_title, b.description, b.overview, b.sponsor, b.sponsor_party,
      b.status, b.bill_type, b.azleg_url
    FROM rts_agendas ra
    LEFT JOIN bills b ON ra.bill_number = b.number
    ${whereClause}
    ORDER BY ra.agenda_date ASC,
             (ra.positions_for + ra.positions_against + ra.positions_neutral) DESC
  `).bind(...bindings).all();

  // Fetch org recommendations for all bills in one query
  const orgRecs = await env.DB.prepare(
    'SELECT bill_number, org_code, org_name, position, category, source_url FROM org_recommendations'
  ).all();
  const recsByBill = {};
  for (const rec of (orgRecs.results || [])) {
    if (!recsByBill[rec.bill_number]) recsByBill[rec.bill_number] = [];
    recsByBill[rec.bill_number].push({
      org_code: rec.org_code,
      org_name: rec.org_name,
      position: rec.position,
      category: rec.category,
      source_url: rec.source_url,
    });
  }

  // Collect distinct committees for filter UI
  const committees = new Set();
  const hearings = (result.results || []).map(row => {
    if (row.committee_short) committees.add(row.committee_short);
    return {
      agenda_item_id: row.agenda_item_id,
      bill_number: row.bill_number,
      committee: row.committee_name,
      committee_short: row.committee_short,
      chamber: row.chamber,
      date: row.agenda_date,
      time: row.agenda_time,
      room: row.location,
      can_rts: !!row.can_rts,
      is_past: !!row.is_past,
      rts_url: row.rts_url,
      positions: {
        for: row.positions_for,
        against: row.positions_against,
        neutral: row.positions_neutral,
      },
      bill: {
        number: row.bill_number,
        short_title: row.short_title,
        description: row.description,
        overview: row.overview,
        sponsor: row.sponsor,
        sponsor_party: row.sponsor_party,
        status: row.status,
        bill_type: row.bill_type,
        azleg_url: row.azleg_url,
        org_recommendations: recsByBill[row.bill_number] || [],
      },
    };
  });

  return Response.json({
    hearings,
    total: hearings.length,
    committees: [...committees].sort(),
  });
}
