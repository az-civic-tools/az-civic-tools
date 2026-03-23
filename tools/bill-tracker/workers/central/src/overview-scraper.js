/**
 * Cactus Watch — Bill Overview Scraper
 *
 * Fetches plain-language bill summaries from azleg.gov's DocType API.
 * For each bill, finds the latest summary document under "Misc. Bill Documents",
 * fetches the HTML, and extracts the first meaningful paragraph as the overview.
 *
 * Run nightly after the RTS scraper, or manually via POST /api/scrape/overviews.
 */

import { SCRAPE_RATE_LIMIT_MS } from '../shared/constants.js';

const AZLEG_API = 'https://apps.azleg.gov/api';

/**
 * Fetch document groups for a bill from the DocType API.
 */
async function fetchDocTypes(billId, sessionId) {
  const url = `${AZLEG_API}/DocType/?billStatusId=${billId}&sessionId=${sessionId}`;
  try {
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
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
 * Find the latest summary document URL from document groups.
 * Looks in "MiscBillDocuments" group for SUMMARY or FACT SHEET documents.
 */
function findLatestSummaryUrl(docGroups) {
  const miscGroup = docGroups.find(g => g.DocumentGroupCode === 'MiscBillDocuments');
  if (!miscGroup || !miscGroup.Documents?.length) return null;

  // Filter to summary/fact sheet documents with HTML paths
  const summaryDocs = miscGroup.Documents.filter(d =>
    d.HtmlPath &&
    (d.DocumentName || '').toUpperCase().match(/SUMMARY|FACT SHEET/)
  );

  if (summaryDocs.length === 0) return null;

  // Return the last one (most recent by position in the array)
  return summaryDocs[summaryDocs.length - 1].HtmlPath;
}

/**
 * Fetch an HTML summary document and extract the overview text.
 * The summary docs typically have a short description in the first paragraph(s).
 */
async function fetchOverviewFromHtml(url) {
  try {
    const resp = await fetch(url, { headers: { 'Accept': 'text/html' } });
    if (!resp.ok) return null;
    const html = await resp.text();
    return extractOverviewText(html);
  } catch {
    return null;
  }
}

/**
 * Extract plain-text overview from azleg summary HTML.
 * The summary documents are Word-exported HTML with the overview typically
 * in the first paragraph after the header information.
 */
function extractOverviewText(html) {
  // Remove HTML tags and decode entities
  const stripped = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // The overview is typically the text after "Overview" or "Purpose" header,
  // or just the first substantive paragraph
  const overviewMatch = stripped.match(/(?:Overview|Purpose|Description)\s*[:\-–]?\s*(.+?)(?:\.|$)/i);
  if (overviewMatch) {
    const text = overviewMatch[1].trim();
    // Get the first sentence or two (up to ~500 chars)
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (sentences) {
      let result = '';
      for (const s of sentences) {
        if (result.length + s.length > 500) break;
        result += s;
      }
      return result.trim() || text.slice(0, 500);
    }
    return text.slice(0, 500);
  }

  // Fallback: find the longest paragraph-like text that looks like a description
  const chunks = stripped.split(/\s{3,}/).filter(c => c.length > 40 && c.length < 1000);
  // Skip header-like chunks (all caps, short, bill numbers)
  const descriptive = chunks.filter(c =>
    c !== c.toUpperCase() &&
    !c.match(/^(HOUSE|SENATE|PREPARED BY|COMMITTEE|FACT SHEET|SUMMARY)/i)
  );

  if (descriptive.length > 0) {
    // Take first substantive chunk, limit to ~500 chars at sentence boundary
    const text = descriptive[0];
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (sentences) {
      let result = '';
      for (const s of sentences) {
        if (result.length + s.length > 500) break;
        result += s;
      }
      return result.trim() || text.slice(0, 500);
    }
    return text.slice(0, 500);
  }

  return null;
}

/**
 * Run the overview scraper — fetch summaries for bills that don't have one yet.
 *
 * @param {object} env - Worker environment with DB binding
 * @param {object} options
 * @param {boolean} [options.force] - Re-scrape even if overview already exists
 * @returns {object} Summary
 */
export async function runOverviewScraper(env, options = {}) {
  const force = options.force || false;

  // Get bills that need overviews — prioritize bills with upcoming hearings
  const condition = force ? '' : 'AND b.overview IS NULL';
  const result = await env.DB.prepare(`
    SELECT DISTINCT b.id, b.number, b.azleg_bill_id
    FROM bills b
    INNER JOIN rts_agendas ra ON ra.bill_number = b.number AND ra.is_past = 0
    WHERE b.azleg_bill_id IS NOT NULL ${condition}
    ORDER BY b.number
  `).all();

  const bills = result.results || [];
  const sessionId = 130; // Current session
  let fetched = 0;
  let updated = 0;
  let errors = 0;

  for (const bill of bills) {
    try {
      await sleep(SCRAPE_RATE_LIMIT_MS);

      // Step 1: Get document listing
      const docGroups = await fetchDocTypes(bill.azleg_bill_id, sessionId);
      const summaryUrl = findLatestSummaryUrl(docGroups);

      if (!summaryUrl) continue;
      fetched++;

      // Step 2: Fetch and extract overview
      await sleep(SCRAPE_RATE_LIMIT_MS);
      const overview = await fetchOverviewFromHtml(summaryUrl);

      if (!overview) continue;

      // Step 3: Store in D1
      await env.DB.prepare(
        'UPDATE bills SET overview = ? WHERE id = ?'
      ).bind(overview, bill.id).run();

      updated++;
    } catch (err) {
      console.error(`Overview scrape failed for ${bill.number}:`, err);
      errors++;
    }
  }

  return { billsChecked: bills.length, fetched, updated, errors };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
