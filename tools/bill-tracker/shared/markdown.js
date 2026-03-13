/**
 * Shared markdown utilities for Cactus Watch
 * Used by personal tracker and frontend for export/display.
 */

import { formatBillNumber, statusLabel, formatDate } from './bill-utils.js';
import { PARTIES, VOTE_VALUES } from './constants.js';

/**
 * Generate a markdown summary for a single bill.
 * @param {object} bill - Bill object with standard fields
 * @param {object} [tracking] - Optional personal tracking data (stance, notes, tags)
 * @returns {string} Markdown string
 */
export function billToMarkdown(bill, tracking) {
  const lines = [];

  lines.push(`## ${formatBillNumber(bill.number)} — ${bill.short_title || 'Untitled'}`);
  lines.push('');

  if (tracking?.stance) {
    const stanceEmoji = { support: '+', oppose: '-', watch: '~' };
    lines.push(`**Position:** ${stanceEmoji[tracking.stance] || ''} ${tracking.stance.charAt(0).toUpperCase() + tracking.stance.slice(1)}`);
  }

  lines.push(`**Status:** ${statusLabel(bill.status)}`);
  lines.push(`**Sponsor:** ${bill.sponsor || 'Unknown'}${bill.sponsor_party ? ` (${bill.sponsor_party})` : ''}`);

  if (bill.last_action) {
    lines.push(`**Last Action:** ${bill.last_action}${bill.last_action_date ? ` (${formatDate(bill.last_action_date)})` : ''}`);
  }

  if (bill.description) {
    lines.push('');
    lines.push(bill.description);
  }

  if (tracking?.notes) {
    lines.push('');
    lines.push('### Notes');
    lines.push('');
    lines.push(tracking.notes);
  }

  if (tracking?.tags?.length) {
    lines.push('');
    lines.push(`**Tags:** ${tracking.tags.map(t => `\`${t}\``).join(' ')}`);
  }

  if (bill.azleg_url) {
    lines.push('');
    lines.push(`[View on AZLeg.gov](${bill.azleg_url})`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate a markdown list of bills grouped by tag.
 * @param {Array<{ bill: object, tracking: object }>} items
 * @param {object} [options]
 * @param {string} [options.title] - List title
 * @param {boolean} [options.groupByTag] - Group by first tag (default true)
 * @returns {string}
 */
export function billListToMarkdown(items, options = {}) {
  const { title = 'Bill Tracker Export', groupByTag = true } = options;
  const lines = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`*Exported ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`);
  lines.push('');

  if (!groupByTag) {
    for (const item of items) {
      lines.push(billToMarkdown(item.bill, item.tracking));
      lines.push('---');
      lines.push('');
    }
    return lines.join('\n');
  }

  const grouped = new Map();
  const untagged = [];

  for (const item of items) {
    const tags = item.tracking?.tags || [];
    if (tags.length === 0) {
      untagged.push(item);
    } else {
      for (const tag of tags) {
        if (!grouped.has(tag)) grouped.set(tag, []);
        grouped.get(tag).push(item);
      }
    }
  }

  const seen = new Set();

  for (const [tag, tagItems] of grouped) {
    lines.push(`## ${tag}`);
    lines.push('');

    for (const item of tagItems) {
      const key = item.bill.number;
      if (seen.has(key)) {
        lines.push(`- *${formatBillNumber(key)}* — see above`);
        continue;
      }
      seen.add(key);
      lines.push(billToMarkdown(item.bill, item.tracking));
    }

    lines.push('---');
    lines.push('');
  }

  if (untagged.length > 0) {
    lines.push('## Untagged');
    lines.push('');
    for (const item of untagged) {
      const key = item.bill.number;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(billToMarkdown(item.bill, item.tracking));
    }
  }

  return lines.join('\n');
}

/**
 * Generate a markdown table of vote records.
 * @param {object} vote - Vote object with records array
 * @returns {string}
 */
export function voteToMarkdown(vote) {
  if (!vote?.records?.length) return '';

  const lines = [];
  const chamber = vote.chamber === 'H' ? 'House' : 'Senate';
  lines.push(`### ${chamber} Third Reading — ${vote.result || ''}`);
  lines.push(`Yeas: ${vote.yeas} | Nays: ${vote.nays} | Not Voting: ${vote.not_voting || 0}`);
  lines.push('');
  lines.push('| Legislator | Party | Vote |');
  lines.push('|---|---|---|');

  const sorted = [...vote.records].sort((a, b) => (a.legislator || '').localeCompare(b.legislator || ''));
  for (const rec of sorted) {
    const party = PARTIES[rec.party] || rec.party || '';
    const voteLabel = VOTE_VALUES[rec.vote] || rec.vote || '';
    lines.push(`| ${rec.legislator} | ${party} | ${voteLabel} |`);
  }

  lines.push('');
  return lines.join('\n');
}
