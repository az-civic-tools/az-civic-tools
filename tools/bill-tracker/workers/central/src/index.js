/**
 * Cactus Watch — Central API Worker
 *
 * Public bill data API + scheduled scraper for Arizona Legislature bills.
 * Routes:
 *   GET  /api/bills          — list bills (paginated, filterable)
 *   GET  /api/bills/:number  — single bill detail
 *   GET  /api/bills/sync     — changed bills since a given date
 *   GET  /api/meta           — session info, last scrape, counts
 *   GET  /api/hearings        — all upcoming hearings with bill data
 *   GET  /api/rts/:number    — RTS agenda items + deep links for a bill
 *   POST /api/scrape          — trigger single-prefix scrape (auth required)
 *   POST /api/scrape/all      — trigger full scrape, all prefixes (auth required)
 *   POST /api/scrape/rts      — trigger RTS agenda scrape (auth required)
 *   POST /api/scrape/governor — re-check passed_both bills for governor actions
 *   GET  /api/nokings/images — list NoKings3 images grouped by city
 *   POST /api/nokings/images — upload image (admin only)
 *   GET  /api/nokings/image/:id    — serve image bytes
 *   DELETE /api/nokings/images/:id — delete image (admin only)
 */

import { handleListBills, handleGetBill, handleSyncBills } from './routes/bills.js';
import { handleMeta } from './routes/meta.js';
import { handleScrape, handleScrapeAll, handleScrapeRts, handleScrapeOverviews, handleScrapeDeadlines } from './routes/scrape.js';
import { handleRts } from './routes/rts.js';
import { handleHearings } from './routes/hearings.js';
import { handleOrgs } from './routes/orgs.js';
import { handleFeedback } from './routes/feedback.js';
import { handleGetTracking, handleSaveTracking } from './routes/user-tracking.js';
import { handleListImages, handleUploadImage, handleGetImage, handleEditImage, handleDeleteImage, handleListAdmins, handleAddAdmin, handleUpdateAdmin, handleDeleteAdmin, handleAdminCheck } from './routes/nokings.js';
import { runScraper, BILL_PREFIXES, EXTRA_RANGES } from './scraper.js';
import { runIncrementalScrape } from './incremental-scraper.js';
import { runRtsScraper } from './rts-scraper.js';
import { runOverviewScraper } from './overview-scraper.js';
import { runDeadlineChecker } from './deadline-checker.js';
import { runGovernorChecker } from './governor-checker.js';
import { runDailyDigest, listDigests, getDigest } from './digest.js';
import { checkRateLimit } from './rate-limit.js';

const ALLOWED_ORIGINS = new Set([
  'https://cactus.watch',
  'https://www.cactus.watch',
  'https://nokings.cactus.watch',
]);

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

/** Cache durations (seconds) by route */
const CACHE_TTL = {
  bills_list: 300,      // 5 min — list changes when new bills scraped
  bill_detail: 900,     // 15 min — individual bill changes less often
  bills_sync: 300,      // 5 min — sync endpoint
  meta: 600,            // 10 min — counts/session info
  rts: 3600,            // 1 hour — agenda items change infrequently
};

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Rate limit all non-OPTIONS requests
    const rateLimited = await checkRateLimit(request, env);
    if (rateLimited) return addCorsHeaders(rateLimited, corsHeaders);

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      let response;
      let cacheTtl = 0;

      if (path === '/api/bills' && request.method === 'GET') {
        response = await handleListBills(request, env);
        cacheTtl = CACHE_TTL.bills_list;
      } else if (path === '/api/bills/sync' && request.method === 'GET') {
        response = await handleSyncBills(request, env);
        cacheTtl = CACHE_TTL.bills_sync;
      } else if (path.match(/^\/api\/bills\/[A-Za-z]+\d+$/) && request.method === 'GET') {
        const number = path.split('/').pop();
        response = await handleGetBill(number, env);
        cacheTtl = CACHE_TTL.bill_detail;
      } else if (path === '/api/meta' && request.method === 'GET') {
        response = await handleMeta(env);
        cacheTtl = CACHE_TTL.meta;
      } else if (path === '/api/orgs' && request.method === 'GET') {
        response = await handleOrgs(request, env);
        cacheTtl = CACHE_TTL.rts;
      } else if (path === '/api/hearings' && request.method === 'GET') {
        response = await handleHearings(request, env);
        cacheTtl = CACHE_TTL.rts;
      } else if (path.match(/^\/api\/rts\/[A-Za-z]+\d+$/) && request.method === 'GET') {
        const number = path.split('/').pop().toUpperCase();
        response = await handleRts(number, env);
        cacheTtl = CACHE_TTL.rts;
      } else if (path === '/api/user/tracking' && request.method === 'GET') {
        response = await handleGetTracking(request, env);
      } else if (path === '/api/user/tracking' && request.method === 'PUT') {
        response = await handleSaveTracking(request, env);
      } else if (path === '/api/feedback' && request.method === 'POST') {
        response = await handleFeedback(request, env);
      } else if (path === '/api/digests' && request.method === 'GET') {
        const digests = await listDigests(env);
        response = Response.json(digests);
        cacheTtl = 300;
      } else if (path.match(/^\/api\/digests\/\d+$/) && request.method === 'GET') {
        const id = parseInt(path.split('/').pop(), 10);
        const digest = await getDigest(env, id);
        if (digest) {
          response = Response.json(digest);
          cacheTtl = 3600;
        } else {
          response = Response.json({ error: 'Digest not found' }, { status: 404 });
        }
      } else if (path === '/api/digest/preview' && request.method === 'GET') {
        const url = new URL(request.url);
        const since = url.searchParams.get('since') || undefined;
        const result = await runDailyDigest(env, { preview: true, since });
        response = new Response(result.markdown, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      } else if (path === '/api/digest/send' && request.method === 'POST') {
        const url = new URL(request.url);
        const since = url.searchParams.get('since') || undefined;
        const result = await runDailyDigest(env, { since });
        response = new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (path === '/api/scrape/incremental' && request.method === 'POST') {
        const url = new URL(request.url);
        const batch = parseInt(url.searchParams.get('batch') || '15', 10);
        const result = await runIncrementalScrape(env, batch);
        response = new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (path === '/api/scrape/governor' && request.method === 'POST') {
        const result = await runGovernorChecker(env);
        response = new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (path === '/api/scrape/deadlines' && request.method === 'POST') {
        response = await handleScrapeDeadlines(request, env);
      } else if (path === '/api/scrape/overviews' && request.method === 'POST') {
        response = await handleScrapeOverviews(request, env);
      } else if (path === '/api/scrape/rts' && request.method === 'POST') {
        response = await handleScrapeRts(request, env);
      } else if (path === '/api/scrape/all' && request.method === 'POST') {
        response = await handleScrapeAll(request, env);
      } else if (path === '/api/scrape' && request.method === 'POST') {
        response = await handleScrape(request, env);
      } else if (path === '/api/nokings/images' && request.method === 'GET') {
        response = await handleListImages(request, env);
        cacheTtl = 300;
      } else if (path === '/api/nokings/images' && request.method === 'POST') {
        response = await handleUploadImage(request, env);
      } else if (path.match(/^\/api\/nokings\/image\/[a-zA-Z0-9-]+$/) && request.method === 'GET') {
        const id = path.split('/').pop();
        response = await handleGetImage(request, env, id);
      } else if (path.match(/^\/api\/nokings\/images\/[a-zA-Z0-9-]+$/) && request.method === 'PATCH') {
        const id = path.split('/').pop();
        response = await handleEditImage(request, env, id);
      } else if (path.match(/^\/api\/nokings\/images\/[a-zA-Z0-9-]+$/) && request.method === 'DELETE') {
        const id = path.split('/').pop();
        response = await handleDeleteImage(request, env, id);
      } else if (path === '/api/nokings/me' && request.method === 'GET') {
        response = await handleAdminCheck(request, env);
      } else if (path === '/api/nokings/admins' && request.method === 'GET') {
        response = await handleListAdmins(request, env);
      } else if (path === '/api/nokings/admins' && request.method === 'POST') {
        response = await handleAddAdmin(request, env);
      } else if (path === '/api/nokings/admins' && request.method === 'PUT') {
        response = await handleUpdateAdmin(request, env);
      } else if (path.match(/^\/api\/nokings\/admins\/[^/]+$/) && request.method === 'DELETE') {
        const email = path.split('/').pop();
        response = await handleDeleteAdmin(request, env, email);
      } else {
        response = Response.json(
          { error: 'Not found' },
          { status: 404 }
        );
      }

      return addCorsHeaders(addCacheHeaders(response, cacheTtl), corsHeaders);
    } catch (err) {
      console.error('Unhandled error:', err);
      return addCorsHeaders(
        Response.json(
          { error: 'Internal server error' },
          { status: 500 }
        ),
        corsHeaders,
      );
    }
  },

  async scheduled(event, env, ctx) {
    const scheduledTime = new Date(event.scheduledTime);
    const hour = scheduledTime.getUTCHours();
    const minute = scheduledTime.getUTCMinutes();

    // Daily at 13:30 UTC (6:30 AM AZ): post-processing (RTS, overviews, deadlines, governor)
    if (hour === 13 && minute === 30) {
      ctx.waitUntil(runScheduledPostProcess(env));
      return;
    }

    // Daily at 14:00 UTC (7:00 AM AZ): daily digest email
    if (hour === 14 && minute === 0) {
      ctx.waitUntil(runScheduledDigest(env));
      return;
    }

    // Every 3 minutes: incremental bill scrape (15 bills per batch)
    ctx.waitUntil(runScheduledIncrementalScrape(env));
  },
};

/**
 * Approximate session date range — update when CURRENT_SESSION changes.
 * Prevents daily scraping (and unnecessary azleg.gov API calls) during interim.
 * The cron still fires but exits immediately outside this window.
 */
const SESSION_WINDOW = {
  start: '2026-01-01',
  end: '2026-06-30',
};

/**
 * Cron (every 3 min) - Incremental bill scrape (15 bills per batch, oldest first).
 * Replaces the full-enumeration cron which exceeded the 30s CPU limit.
 * Cycles through all ~2,100 bills every ~7 hours.
 */
async function runScheduledIncrementalScrape(env) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < SESSION_WINDOW.start || today > SESSION_WINDOW.end) {
    return;
  }

  try {
    const result = await runIncrementalScrape(env);
    console.log(`Cron: incremental scrape — ${result.checked} checked, ${result.updated} updated`);
  } catch (err) {
    console.error('Cron: incremental scrape failed:', err);
  }
}

/**
 * Cron 14:00 UTC (7 AM AZ) - Daily digest email.
 */
async function runScheduledDigest(env) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < SESSION_WINDOW.start || today > SESSION_WINDOW.end) {
    return;
  }

  try {
    const result = await runDailyDigest(env);
    console.log(`Cron: digest — sent=${result.sent}, events=${JSON.stringify(result.events)}`);
  } catch (err) {
    console.error('Cron: digest failed:', err);
  }
}

/**
 * Full-enumeration scrape (all prefixes). Retained for manual use via /api/scrape/all.
 * WARNING: This will exceed the 30s CPU limit on cron — use incremental scrape for cron.
 */
async function runScheduledScrape(env) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < SESSION_WINDOW.start || today > SESSION_WINDOW.end) {
    console.log(`Cron: session not active (${today} outside ${SESSION_WINDOW.start}–${SESSION_WINDOW.end}). Skipping.`);
    return;
  }

  console.log('Cron :00 — bill scraper starting...');

  for (const { prefix } of BILL_PREFIXES) {
    try {
      console.log(`Cron: scraping ${prefix}...`);
      const result = await runScraper(env, { prefix });
      console.log(`Cron: ${prefix} done — ${result.billsFound} bills`);
    } catch (err) {
      console.error(`Cron: ${prefix} failed:`, err);
    }
  }

  // Scrape extra ranges (e.g. HB4001+ for House bills past the numbering gap)
  for (const { prefix, start } of EXTRA_RANGES) {
    try {
      console.log(`Cron: scraping ${prefix}@${start}...`);
      const result = await runScraper(env, { prefix, startAt: start });
      console.log(`Cron: ${prefix}@${start} done — ${result.billsFound} bills`);
    } catch (err) {
      console.error(`Cron: ${prefix}@${start} failed:`, err);
    }
  }

  console.log('Cron :00 — bill scraper complete');
}

/**
 * Cron :30 — RTS agendas, overviews, deadline checker.
 * Runs separately so it completes even if the bill scraper times out.
 */
async function runScheduledPostProcess(env) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < SESSION_WINDOW.start || today > SESSION_WINDOW.end) {
    console.log(`Cron: session not active (${today} outside ${SESSION_WINDOW.start}–${SESSION_WINDOW.end}). Skipping.`);
    return;
  }

  console.log('Cron :30 — post-processing starting...');

  try {
    console.log('Cron: scraping RTS agendas...');
    const rtsResult = await runRtsScraper(env);
    console.log(`Cron: RTS done — ${rtsResult.itemsStored} agenda items from ${rtsResult.pages} pages`);
  } catch (err) {
    console.error('Cron: RTS scrape failed:', err);
  }

  try {
    console.log('Cron: scraping bill overviews...');
    const overviewResult = await runOverviewScraper(env);
    console.log(`Cron: overviews done — ${overviewResult.updated}/${overviewResult.billsChecked} updated`);
  } catch (err) {
    console.error('Cron: overview scrape failed:', err);
  }

  try {
    console.log('Cron: running deadline checker...');
    const deadlineResult = await runDeadlineChecker(env);
    console.log(`Cron: deadline checker done — ${deadlineResult.billsMarkedDead} marked dead, ${deadlineResult.strikers} potential strikers`);
  } catch (err) {
    console.error('Cron: deadline checker failed:', err);
  }

  try {
    console.log('Cron: checking governor actions...');
    const govResult = await runGovernorChecker(env);
    console.log(`Cron: governor checker done — ${govResult.checked} checked, ${govResult.signed} signed, ${govResult.vetoed} vetoed`);
  } catch (err) {
    console.error('Cron: governor checker failed:', err);
  }

  console.log('Cron :30 — post-processing complete');
}

/**
 * Add Cache-Control headers to successful GET responses.
 */
function addCacheHeaders(response, ttl) {
  if (!ttl || response.status >= 400) return response;

  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
  return newResponse;
}

function addCorsHeaders(response, corsHeaders) {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
