/**
 * Cactus Watch — Organization Recommendations Route
 *
 * GET /api/orgs — All org recommendations grouped by org and category
 */

export async function handleOrgs(request, env) {
  const result = await env.DB.prepare(
    'SELECT org_code, org_name, bill_number, position, category, description, source_url, source_date FROM org_recommendations ORDER BY org_code, category, bill_number'
  ).all();

  const rows = result.results || [];

  // Known org websites
  const ORG_WEBSITES = {
    CEBV: 'https://cebv.us',
    SecularAZ: 'https://secularaz.org',
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
      source_url: row.source_url,
      source_date: row.source_date,
    });
  }

  return Response.json({ orgs: Object.values(orgs) });
}
