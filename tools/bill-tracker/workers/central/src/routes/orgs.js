/**
 * Cactus Watch — Organization Recommendations Route
 *
 * GET /api/orgs — All org recommendations grouped by org and category
 */

export async function handleOrgs(request, env) {
  const result = await env.DB.prepare(
    `SELECT r.org_code, r.org_name, r.bill_number, r.position, r.category, r.description, r.source_url, r.source_date,
            b.short_title, b.status
     FROM org_recommendations r
     LEFT JOIN bills b ON r.bill_number = b.number
     ORDER BY r.org_code, r.category, r.bill_number`
  ).all();

  const rows = result.results || [];

  // Known org websites
  const ORG_WEBSITES = {
    CEBV: 'https://cebv.us',
    SecularAZ: 'https://secularaz.org',
    SOSAZ: 'https://sosarizona.org',
  };

  // Group by org, then by category
  const orgs = {};
  for (const row of rows) {
    if (!orgs[row.org_code]) {
      orgs[row.org_code] = { code: row.org_code, name: row.org_name, website: ORG_WEBSITES[row.org_code] || null, categories: {} };
    }
    const cat = row.category || 'All Bills';
    if (!orgs[row.org_code].categories[cat]) {
      orgs[row.org_code].categories[cat] = [];
    }
    orgs[row.org_code].categories[cat].push({
      bill_number: row.bill_number,
      position: row.position,
      description: row.description,
      short_title: row.short_title || null,
      status: row.status || null,
      source_url: row.source_url,
      source_date: row.source_date,
    });
  }

  return Response.json({ orgs: Object.values(orgs) });
}
