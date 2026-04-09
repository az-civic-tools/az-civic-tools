/**
 * Cactus Watch -- Daily Legislative Digest
 *
 * Queries D1 for notable legislative activity since the last digest,
 * formats a markdown email, and sends it via Resend.
 *
 * "Interesting" events:
 *   - Floor votes (3rd read) in either chamber
 *   - Party-line crossover votes (legislator voting against their party)
 *   - Governor actions (signed/vetoed)
 *   - Bills tracked by advocacy orgs that had status changes
 *   - Bills that died or were defeated on the floor
 *   - Strike-everything amendments detected
 *
 * Cron: 7 AM AZ (2 PM UTC) daily
 * Manual: POST /api/digest/send, GET /api/digest/preview
 */

import { CURRENT_SESSION } from '../shared/constants.js';

const DIGEST_FROM = 'Cactus Watch <digest@cactus.watch>';
const DIGEST_TO = 'alex.logvin@gmail.com';
const KV_LAST_SENT_KEY = 'digest:last_sent';

const WIKI_BASE = 'https://github.com/az-civic-tools/az-civic-tools/wiki';
const WIKI_LINKS = {
  governor: `${WIKI_BASE}/Governor-Actions`,
  floorVotes: `${WIKI_BASE}/Floor-Votes`,
  crossovers: `${WIKI_BASE}/Party-Line-Crossovers`,
  advocacy: `${WIKI_BASE}/Advocacy-Watch`,
  defeated: `${WIKI_BASE}/Defeated-Bills`,
  strikers: `${WIKI_BASE}/Strike-Everything-Amendments`,
};

/**
 * Run the daily digest: query, format, send.
 */
export async function runDailyDigest(env, options = {}) {
  const since = options.since || await getLastSent(env);
  console.log(`Digest: querying events since ${since}`);

  const events = await queryInterestingEvents(env, since);
  const markdown = formatDigestMarkdown(events, since);

  if (options.preview) {
    return { sent: false, markdown, events: summarizeEvents(events) };
  }

  if (isEmptyDigest(events)) {
    console.log('Digest: no interesting events, skipping send');
    await setLastSent(env);
    return { sent: false, markdown: null, events: summarizeEvents(events), reason: 'nothing_interesting' };
  }

  const html = markdownToHtml(markdown);
  await sendDigest(env, html, markdown);
  await setLastSent(env);
  await storeDigest(env, since, markdown, events);

  return { sent: true, markdown, events: summarizeEvents(events) };
}

async function getLastSent(env) {
  const stored = await env.RATE_LIMIT.get(KV_LAST_SENT_KEY);
  if (stored) return stored;
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

async function setLastSent(env) {
  await env.RATE_LIMIT.put(KV_LAST_SENT_KEY, new Date().toISOString());
}

// ─── Queries ────────────────────────────────────────────────────────────────

async function queryInterestingEvents(env, since) {
  const sessionRow = await env.DB.prepare(
    'SELECT id FROM sessions WHERE session_id = ?'
  ).bind(CURRENT_SESSION.id).first();

  if (!sessionRow) return { floorVotes: [], crossovers: [], governorActions: [], orgBills: [], deadBills: [], strikers: [] };

  const [floorVotes, voteRecords, governorActions, orgBills, deadBills, strikers] = await Promise.all([
    queryFloorVotes(env, since),
    queryVoteRecords(env, since),
    queryGovernorActions(env, since),
    queryOrgBillChanges(env, since),
    queryDeadBills(env, since),
    queryStrikers(env, since),
  ]);

  const crossovers = detectCrossovers(floorVotes, voteRecords);

  return { floorVotes, crossovers, governorActions, orgBills, deadBills, strikers };
}

async function queryFloorVotes(env, since) {
  const result = await env.DB.prepare(`
    SELECT b.number, b.short_title, b.sponsor, b.sponsor_party, b.status, b.azleg_url,
           b.description,
           v.id as vote_id, v.chamber, v.yeas, v.nays, v.not_voting, v.excused, v.result, v.vote_date
    FROM votes v
    JOIN bills b ON b.id = v.bill_id
    WHERE v.vote_date >= ?
    ORDER BY v.vote_date DESC
  `).bind(since).all();
  return result.results || [];
}

async function queryVoteRecords(env, since) {
  const result = await env.DB.prepare(`
    SELECT vr.vote_id, vr.legislator, vr.party, vr.vote
    FROM vote_records vr
    JOIN votes v ON v.id = vr.vote_id
    WHERE v.vote_date >= ?
  `).bind(since).all();
  return result.results || [];
}

async function queryGovernorActions(env, since) {
  const result = await env.DB.prepare(`
    SELECT number, short_title, sponsor, sponsor_party, governor_action, governor_action_date,
           azleg_url, description
    FROM bills
    WHERE governor_action_date >= ?
      AND governor_action IN ('Signed', 'Vetoed')
    ORDER BY governor_action_date DESC
  `).bind(since).all();
  return result.results || [];
}

async function queryOrgBillChanges(env, since) {
  const result = await env.DB.prepare(`
    SELECT DISTINCT b.number, b.short_title, b.sponsor, b.sponsor_party, b.status,
           b.last_action, b.last_action_date, b.azleg_url, b.description,
           r.org_code, r.org_name, r.position, r.category, r.description as org_description, r.source_url
    FROM bills b
    JOIN org_recommendations r ON r.bill_number = b.number
    WHERE b.number IN (
      SELECT DISTINCT b2.number FROM bills b2
      LEFT JOIN floor_actions fa ON fa.bill_id = b2.id AND fa.action_date >= ?
      LEFT JOIN committee_actions ca ON ca.bill_id = b2.id AND ca.action_date >= ?
      WHERE b2.number IN (SELECT bill_number FROM org_recommendations)
        AND (fa.id IS NOT NULL OR ca.id IS NOT NULL OR b2.governor_action_date >= ?)
    )
    ORDER BY b.number, r.org_code
  `).bind(since, since, since).all();
  return result.results || [];
}

async function queryDeadBills(env, since) {
  // Use floor vote failure date for defeated bills, not updated_at (which gets bumped by scraper)
  const result = await env.DB.prepare(`
    SELECT b.number, b.short_title, b.sponsor, b.sponsor_party, b.dead_reason, b.last_action,
           b.azleg_url, b.description
    FROM bills b
    WHERE b.dead_reason = 'defeated'
      AND b.number IN (
        SELECT b2.number FROM bills b2
        JOIN votes v ON v.bill_id = b2.id
        WHERE v.result = 'Failed' AND v.vote_date >= ?
      )
    ORDER BY b.number
  `).bind(since).all();
  return result.results || [];
}

async function queryStrikers(env, since) {
  const result = await env.DB.prepare(`
    SELECT number, short_title, original_short_title, sponsor, sponsor_party,
           striker_detail, striker_detected_at, status, azleg_url, description
    FROM bills
    WHERE has_striker = 1
      AND striker_detected_at >= ?
    ORDER BY striker_detected_at DESC
  `).bind(since).all();
  return result.results || [];
}

// ─── Crossover Detection ────────────────────────────────────────────────────

function detectCrossovers(floorVotes, voteRecords) {
  const crossovers = [];

  for (const vote of floorVotes) {
    const records = voteRecords.filter(vr => vr.vote_id === vote.vote_id);
    if (records.length === 0) continue;

    const rVotes = records.filter(r => r.party === 'R');
    const dVotes = records.filter(r => r.party === 'D');

    const rYea = rVotes.filter(r => r.vote === 'Y').length;
    const rNay = rVotes.filter(r => r.vote === 'N').length;
    const dYea = dVotes.filter(r => r.vote === 'Y').length;
    const dNay = dVotes.filter(r => r.vote === 'N').length;

    const rMajorityYea = rYea > rNay;
    const dMajorityYea = dYea > dNay;

    if (rMajorityYea === dMajorityYea) continue;

    const defectors = [];
    for (const r of records) {
      if (r.vote !== 'Y' && r.vote !== 'N') continue;
      const votedYea = r.vote === 'Y';

      if (r.party === 'R' && votedYea !== rMajorityYea) {
        defectors.push({ legislator: r.legislator, party: 'R', vote: r.vote });
      } else if (r.party === 'D' && votedYea !== dMajorityYea) {
        defectors.push({ legislator: r.legislator, party: 'D', vote: r.vote });
      }
    }

    if (defectors.length > 0 && defectors.length <= 5) {
      crossovers.push({ ...vote, defectors, rYea, rNay, dYea, dNay });
    }
  }

  return crossovers;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function billLink(number, url) {
  return `[${number}](${url})`;
}

function partyTag(party) {
  if (party === 'R') return '(R)';
  if (party === 'D') return '(D)';
  return `(${party})`;
}

function fmtDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const yr = String(d.getUTCFullYear()).slice(2);
  return `${m}/${day}/${yr}`;
}

function fmtVote(v) {
  const date = fmtDate(v.vote_date);
  const result = v.result === 'Passed' ? 'Passed' : '**FAILED**';
  return `${result} ${date}: ${v.yeas} YES - ${v.nays} NO - ${v.not_voting} DNV`;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function isEmptyDigest(events) {
  return events.floorVotes.length === 0
    && events.governorActions.length === 0
    && events.orgBills.length === 0
    && events.deadBills.length === 0
    && events.strikers.length === 0;
}

function summarizeEvents(events) {
  return {
    floorVotes: events.floorVotes.length,
    crossovers: events.crossovers.length,
    governorActions: events.governorActions.length,
    orgBills: events.orgBills.length,
    deadBills: events.deadBills.length,
    strikers: events.strikers.length,
  };
}

// ─── Org Recommendation Lookup ──────────────────────────────────────────────

function buildOrgMap(orgBills) {
  const map = new Map();
  for (const row of orgBills) {
    if (!map.has(row.number)) {
      map.set(row.number, []);
    }
    const existing = map.get(row.number);
    if (!existing.find(o => o.code === row.org_code)) {
      existing.push({ code: row.org_code, position: row.position, source_url: row.source_url });
    }
  }
  return map;
}

function orgTagsForBill(orgMap, number) {
  const orgs = orgMap.get(number);
  if (!orgs || orgs.length === 0) return '';
  return orgs.map(o => `[${o.code}: ${capitalize(o.position)}](${o.source_url})`).join(' | ');
}

// ─── Markdown Formatting ────────────────────────────────────────────────────

function formatDigestMarkdown(events, since) {
  const sinceDate = new Date(since);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });
  const sinceFormatted = sinceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });

  const orgMap = buildOrgMap(events.orgBills);
  const lines = [];

  lines.push(`# Arizona Legislature Daily Digest`);
  lines.push(`**${today}** | Changes since ${sinceFormatted} | Source: [cactus.watch](https://cactus.watch)`);
  lines.push('');

  // ── Summary Table ──
  const rFloorVotes = events.floorVotes.filter(v => v.sponsor_party === 'R');
  const dFloorVotes = events.floorVotes.filter(v => v.sponsor_party === 'D');
  const rPassed = rFloorVotes.filter(v => v.result === 'Passed').length;
  const rFailed = rFloorVotes.filter(v => v.result !== 'Passed').length;
  const dPassed = dFloorVotes.filter(v => v.result === 'Passed').length;
  const dFailed = dFloorVotes.filter(v => v.result !== 'Passed').length;

  const rGovSigned = events.governorActions.filter(b => b.sponsor_party === 'R' && b.governor_action === 'Signed').length;
  const rGovVetoed = events.governorActions.filter(b => b.sponsor_party === 'R' && b.governor_action === 'Vetoed').length;
  const dGovSigned = events.governorActions.filter(b => b.sponsor_party === 'D' && b.governor_action === 'Signed').length;
  const dGovVetoed = events.governorActions.filter(b => b.sponsor_party === 'D' && b.governor_action === 'Vetoed').length;

  const rDefeated = events.deadBills.filter(b => b.sponsor_party === 'R').length;
  const dDefeated = events.deadBills.filter(b => b.sponsor_party === 'D').length;

  lines.push('## At a Glance');
  lines.push('');
  lines.push('| Activity | R-Sponsored | D-Sponsored |');
  lines.push('|----------|-------------|-------------|');
  lines.push(`| Floor votes | ${rPassed} passed, ${rFailed} failed | ${dPassed} passed, ${dFailed} failed |`);
  lines.push(`| Governor signed | ${rGovSigned} | ${dGovSigned} |`);
  lines.push(`| Governor vetoed | ${rGovVetoed} | ${dGovVetoed} |`);
  lines.push(`| Defeated on floor | ${rDefeated} | ${dDefeated} |`);
  lines.push(`| Crossover votes | ${events.crossovers.length} | |`);
  lines.push(`| Advocacy-tracked bills | ${events.orgBills.length} with activity | |`);
  if (events.strikers.length > 0) {
    lines.push(`| New strikers detected | ${events.strikers.length} | |`);
  }
  lines.push('');

  // ── Democrat Sponsored Bills ──
  lines.push('---');
  lines.push('');
  lines.push('## Democrat Sponsored Bills');
  lines.push('');
  if (dFloorVotes.length === 0) {
    if (rFloorVotes.length > 0) {
      lines.push(`The AZ GOP refused to allow a floor vote on any Democrat-sponsored bills since the last update. All ${rFloorVotes.length} floor votes were on Republican-sponsored legislation.`);
    } else {
      lines.push('No floor votes on any bills since the last update.');
    }
    lines.push('');
  } else {
    lines.push(`${dFloorVotes.length} Democrat-sponsored bill(s) received a floor vote:`);
    lines.push('');
    for (const v of dFloorVotes) {
      const orgs = orgTagsForBill(orgMap, v.number);
      let line = `- **${billLink(v.number, v.azleg_url)}** -- ${v.short_title} (${v.sponsor}, ${v.sponsor_party}) -- ${fmtVote(v)}`;
      if (orgs) line += ` | ${orgs}`;
      lines.push(line);
    }
    lines.push('');
  }

  // ── Governor's Desk ──
  const signed = events.governorActions.filter(b => b.governor_action === 'Signed');
  const vetoed = events.governorActions.filter(b => b.governor_action === 'Vetoed');

  if (signed.length > 0 || vetoed.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## [Governor's Desk](${WIKI_LINKS.governor})`);
    lines.push('');

    if (signed.length > 0) {
      lines.push('### Signed');
      lines.push('');
      for (const b of signed) {
        const orgs = orgTagsForBill(orgMap, b.number);
        let line = `- **${billLink(b.number, b.azleg_url)}** -- ${b.short_title} (${b.sponsor}, ${b.sponsor_party})`;
        if (orgs) line += ` | ${orgs}`;
        lines.push(line);
      }
      lines.push('');
    }

    if (vetoed.length > 0) {
      lines.push('### Vetoed');
      lines.push('');
      for (const b of vetoed) {
        const orgs = orgTagsForBill(orgMap, b.number);
        let line = `- **${billLink(b.number, b.azleg_url)}** -- ${b.short_title} (${b.sponsor}, ${b.sponsor_party}) | [Veto Letter](https://azgovernor.gov/office-arizona-governor/veto-letters)`;
        if (orgs) line += ` | ${orgs}`;
        lines.push(line);
      }
      lines.push('');
    }
  }

  // ── Floor Votes ──
  if (events.floorVotes.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## [Floor Votes](${WIKI_LINKS.floorVotes})`);
    lines.push('');

    const senateVotes = events.floorVotes.filter(v => v.chamber === 'S');
    const houseVotes = events.floorVotes.filter(v => v.chamber === 'H');

    for (const [label, votes] of [['Senate', senateVotes], ['House', houseVotes]]) {
      if (votes.length === 0) continue;
      lines.push(`### ${label}`);
      lines.push('');
      for (const v of votes) {
        const orgs = orgTagsForBill(orgMap, v.number);
        let line = `- **${billLink(v.number, v.azleg_url)}** -- ${v.short_title} (${v.sponsor}, ${v.sponsor_party}) -- ${fmtVote(v)}`;
        if (orgs) line += ` | ${orgs}`;
        lines.push(line);
      }
      lines.push('');
    }
  }

  // ── Party-Line Crossovers ──
  if (events.crossovers.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## [Party-Line Crossovers](${WIKI_LINKS.crossovers})`);
    lines.push('');
    lines.push('Votes where one or more legislators broke with their party.');
    lines.push('');

    for (const c of events.crossovers) {
      const chamberLabel = c.chamber === 'S' ? 'Senate' : 'House';
      lines.push(`### ${billLink(c.number, c.azleg_url)} -- ${c.short_title}`);
      lines.push('');
      lines.push(`**Sponsor:** ${c.sponsor} ${partyTag(c.sponsor_party)} | **${chamberLabel} Vote ${fmtDate(c.vote_date)}:** ${c.result === 'Passed' ? 'Passed' : 'FAILED'} ${c.yeas}-${c.nays}-${c.not_voting}`);
      lines.push('');
      lines.push(`| Party | YES | NO |`);
      lines.push(`|-------|-----|-----|`);
      lines.push(`| R | ${c.rYea} | ${c.rNay} |`);
      lines.push(`| D | ${c.dYea} | ${c.dNay} |`);
      lines.push('');
      lines.push('**Crossovers:**');
      lines.push('');
      for (const d of c.defectors) {
        const action = d.vote === 'Y' ? 'voted **YES** with the opposing party' : 'voted **NO** against their party';
        lines.push(`- ${d.legislator} ${partyTag(d.party)} ${action}`);
      }
      lines.push('');
    }
  }

  // ── Strike-Everything Amendments ──
  if (events.strikers.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## [Strike-Everything Amendments](${WIKI_LINKS.strikers})`);
    lines.push('');
    lines.push('Bills whose original content was replaced with entirely new legislation.');
    lines.push('');

    for (const s of events.strikers) {
      let detail;
      try { detail = JSON.parse(s.striker_detail); } catch { detail = {}; }
      const statusLabel = detail.status === 'adopted' ? 'Adopted' : 'Proposed';
      const committee = detail.committee || 'Unknown';
      const titleChanged = s.original_short_title && s.original_short_title !== s.short_title;

      let line = `- **${billLink(s.number, s.azleg_url)}** -- ${s.short_title} (${s.sponsor}, ${s.sponsor_party}) -- ${statusLabel} by ${committee}`;
      if (titleChanged) {
        line += ` | Was: "${s.original_short_title}"`;
      }
      lines.push(line);
    }
    lines.push('');
  }

  // ── Advocacy Watch ──
  if (events.orgBills.length > 0) {
    const billMap = new Map();
    for (const row of events.orgBills) {
      if (!billMap.has(row.number)) {
        billMap.set(row.number, {
          number: row.number, short_title: row.short_title,
          sponsor: row.sponsor, sponsor_party: row.sponsor_party,
          status: row.status, last_action: row.last_action,
          azleg_url: row.azleg_url, org_description: row.org_description,
          orgs: [],
        });
      }
      const entry = billMap.get(row.number);
      if (!entry.orgs.find(o => o.code === row.org_code)) {
        entry.orgs.push({ code: row.org_code, position: row.position, source_url: row.source_url });
      }
    }

    const coveredBills = new Set([
      ...events.governorActions.map(b => b.number),
      ...events.floorVotes.map(v => v.number),
    ]);
    const uncoveredOrgBills = [...billMap.values()].filter(b => !coveredBills.has(b.number));

    if (uncoveredOrgBills.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push(`## [Advocacy Watch](${WIKI_LINKS.advocacy})`);
      lines.push('');
      lines.push('Bills tracked by advocacy organizations that had activity.');
      lines.push('');
      for (const b of uncoveredOrgBills) {
        const orgTags = b.orgs.map(o => `[${o.code}: ${capitalize(o.position)}](${o.source_url})`).join(' | ');
        lines.push(`- **${billLink(b.number, b.azleg_url)}** -- ${b.short_title} (${b.sponsor}, ${b.sponsor_party}) | ${orgTags}`);
        lines.push(`  Status: ${b.last_action || b.status}`);
        if (b.org_description) {
          lines.push(`  ${b.org_description}`);
        }
      }
      lines.push('');
    }
  }

  // ── Defeated ──
  const defeated = events.deadBills.filter(b => b.dead_reason === 'defeated');
  if (defeated.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## [Defeated](${WIKI_LINKS.defeated})`);
    lines.push('');
    for (const b of defeated) {
      const orgs = orgTagsForBill(orgMap, b.number);
      let line = `- **${billLink(b.number, b.azleg_url)}** -- ${b.short_title} (${b.sponsor}, ${b.sponsor_party})`;
      if (orgs) line += ` | ${orgs}`;
      lines.push(line);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Generated by [Cactus Watch](https://cactus.watch) -- Free, open-source AZ bill tracking*');

  return lines.join('\n');
}

// ─── HTML Conversion ────────────────────────────────────────────────────────

function markdownToHtml(md) {
  // Party color coding for HTML email
  const partyColorize = (html) => {
    return html
      .replace(/\(R\)/g, '<span style="color: #C41E3A; font-weight: bold;">(R)</span>')
      .replace(/\(D\)/g, '<span style="color: #1A5AAB; font-weight: bold;">(D)</span>');
  };

  let html = md;

  // Tables
  html = html.replace(/\|([^\n]+)\|\n\|[-| ]+\|\n((?:\|[^\n]+\|\n?)+)/g, (match, header, body) => {
    const headers = header.split('|').map(h => h.trim()).filter(Boolean);
    const headerRow = headers.map(h => `<th style="padding: 4px 12px; text-align: left; border-bottom: 2px solid #C1440E;">${h}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      return `<tr>${cells.map(c => `<td style="padding: 4px 12px;">${c}</td>`).join('')}</tr>`;
    }).join('');
    return `<table style="border-collapse: collapse; margin: 8px 0; font-size: 14px;"><tr>${headerRow}</tr>${rows}</table>`;
  });

  // Block elements
  html = html
    .replace(/^# (.+)$/gm, '<h1 style="color: #C1440E; margin: 0 0 8px;">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="color: #C1440E; margin: 24px 0 8px; border-bottom: 1px solid #E5DDD4; padding-bottom: 4px;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="color: #6B4E3D; margin: 16px 0 6px;">$1</h3>')
    .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #E5DDD4; margin: 16px 0;">')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #C1440E;">$1</a>')
    .replace(/^- (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')
    .replace(/^  (.+)$/gm, '<div style="margin-left: 24px; font-size: 13px; color: #666;">$1</div>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');

  // Paragraphs for standalone text lines
  html = html.replace(/^(?!<[hluotd]|<\/)(.+)$/gm, '<p style="margin: 8px 0; font-size: 14px;">$1</p>');

  // Party colors
  html = partyColorize(html);

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 700px; margin: 0 auto; background: #FAF6F0; padding: 32px; border-radius: 8px; color: #333; line-height: 1.6;">
      ${html}
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5DDD4; font-size: 12px; color: #999;">
        You're receiving this because you're subscribed to Cactus Watch daily digests.
      </div>
    </div>
  `;
}

// ─── Storage ────────────────────────────────────────────────────────────────

async function storeDigest(env, since, markdown, events) {
  try {
    await env.DB.prepare(`
      INSERT OR REPLACE INTO digests (sent_at, since, markdown, events_summary)
      VALUES (?, ?, ?, ?)
    `).bind(
      new Date().toISOString(),
      since,
      markdown,
      JSON.stringify(summarizeEvents(events))
    ).run();
  } catch (err) {
    console.error('Failed to store digest:', err);
  }
}

/**
 * Public: list recent digests for archive page.
 */
export async function listDigests(env, limit = 30) {
  const result = await env.DB.prepare(`
    SELECT id, sent_at, since, events_summary
    FROM digests
    ORDER BY sent_at DESC
    LIMIT ?
  `).bind(limit).all();
  return result.results || [];
}

/**
 * Public: get a single digest by ID.
 */
export async function getDigest(env, id) {
  return env.DB.prepare(
    'SELECT id, sent_at, since, markdown, events_summary FROM digests WHERE id = ?'
  ).bind(id).first();
}

// ─── Send ───────────────────────────────────────────────────────────────────

async function sendDigest(env, html, markdown) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'America/Phoenix'
  });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: DIGEST_FROM,
      to: [DIGEST_TO],
      subject: `AZ Legislature Digest -- ${today}`,
      html,
      text: markdown,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('Digest send error:', err);
    throw new Error(`Resend API error: ${resp.status}`);
  }

  console.log('Digest sent successfully');
}
