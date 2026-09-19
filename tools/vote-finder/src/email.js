/**
 * POST /api/email — emails a voter the schedule for the site they picked,
 * plus the voter guides that apply to them. Sends through Resend.
 */
import { json, error, clientIp } from './http.js';
import { checkRateLimit } from './rate-limit.js';
import { ELECTION, guidesFor } from './config.js';
import { formatDate, describeHours, hoursFor, isOpenEntry } from './schedule.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const PER_IP_PER_HOUR = 8;
const PER_ADDRESS_PER_HOUR = 3;
const MODES = new Set(['vc', 'db']);

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const loadSites = async (env) => {
  const res = await env.ASSETS.fetch(new Request('https://assets.local/data/sites.json'));
  if (!res.ok) throw new Error(`sites.json unavailable (${res.status})`);
  return res.json();
};

const parseBody = async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return { err: error('Request body must be JSON.') };
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_LENGTH) return { err: error('Enter a valid email address.') };
  const siteId = Number.parseInt(body.siteId, 10);
  if (!Number.isInteger(siteId)) return { err: error('Pick a site first.') };
  const mode = MODES.has(body.mode) ? body.mode : 'vc';
  const ld = typeof body.ld === 'string' && /^\d{1,2}$/.test(body.ld) ? body.ld : null;
  const city = typeof body.city === 'string' ? body.city.slice(0, 60) : null;
  return { value: { email, siteId, mode, ld, city } };
};

const scheduleRows = (dates, hours) => dates
  .map((d, i) => ({ date: d, entry: hours[i] }))
  .filter((r) => isOpenEntry(r.entry))
  .map((r) => `<tr><td style="padding:6px 12px 6px 0;white-space:nowrap">${formatDate(r.date)}</td>`
    + `<td style="padding:6px 0">${describeHours(r.entry)}</td></tr>`)
  .join('');

const buildHtml = ({ site, mode, dates, hours, guides, siteUrl }) => {
  const address = `${site.street}, ${site.city}, AZ ${site.zip}`;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  const what = mode === 'vc' ? 'Vote in person' : 'Drop off your ballot';
  const guideItems = guides.map((g) => `<li><a href="${escapeHtml(new URL(g.url, siteUrl).href)}">${escapeHtml(g.label)}</a></li>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#F5F6F8;font-family:Helvetica,Arial,sans-serif;color:#14213D">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="background:#FFC53D;padding:20px 24px;border-radius:8px 8px 0 0">
    <div style="font-size:13px">${escapeHtml(ELECTION.name)}</div>
    <h1 style="margin:4px 0 0;font-size:24px">${escapeHtml(what)} at ${escapeHtml(site.name)}</h1>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 4px;font-size:16px"><strong>${escapeHtml(site.name)}</strong></p>
    <p style="margin:0 0 16px">${escapeHtml(address)}<br><a href="${mapsUrl}">Get directions</a></p>
    <h2 style="font-size:16px;margin:24px 0 8px">When it is open</h2>
    <table style="border-collapse:collapse;font-size:14px">${scheduleRows(dates, hours)}</table>
    <p style="font-size:13px;color:#5A6275;margin:16px 0 0">Hours can change. Confirm at <a href="${ELECTION.officialSource}">${ELECTION.officialSource.replace('https://', '')}</a> before you go.</p>
    <h2 style="font-size:16px;margin:24px 0 8px">Your voter guides</h2>
    <ul style="padding-left:20px;margin:0">${guideItems}</ul>
    <p style="font-size:13px;color:#5A6275;margin:24px 0 0">You asked for this email at <a href="${escapeHtml(siteUrl)}">${escapeHtml(siteUrl.replace('https://', ''))}</a>. We do not keep your address and will not email you again.</p>
  </div>
</div></body></html>`;
};

const sendViaResend = async ({ apiKey, from, to, subject, html }) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error(`Resend error ${res.status}: ${await res.text()}`);
    throw new Error('Email provider rejected the message');
  }
};

export const handleEmail = async (request, env) => {
  if (!env.RESEND_API_KEY) return error('Email is not set up on this site yet.', 503);
  const parsed = await parseBody(request);
  if (parsed.err) return parsed.err;
  const { email, siteId, mode, ld, city } = parsed.value;

  const ipRate = await checkRateLimit(env.RATE_LIMIT, `email:ip:${clientIp(request)}`, PER_IP_PER_HOUR);
  const addrRate = await checkRateLimit(env.RATE_LIMIT, `email:to:${email}`, PER_ADDRESS_PER_HOUR);
  if (!ipRate.allowed || !addrRate.allowed) return error('Too many emails requested. Try again in an hour.', 429);

  const data = await loadSites(env);
  const site = data.sites.find((s) => s.id === siteId);
  if (!site) return error('That site no longer exists in our data.', 404);
  const hours = hoursFor(site, mode, data.legend);
  if (!hours) return error('That site does not offer in-person voting.');

  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const html = buildHtml({ site, mode, dates: data.dates, hours, guides: guidesFor({ ld, city }), siteUrl });
  try {
    await sendViaResend({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM || 'Vote Finder <vote@cactus.watch>',
      to: email,
      subject: `${mode === 'vc' ? 'Your voting site' : 'Your ballot drop-off site'}: ${site.name}`,
      html,
    });
  } catch (err) {
    console.error('email send failed', err);
    return error('We could not send the email right now. Try again in a few minutes.', 502);
  }
  return json({ ok: true, sentTo: email });
};
