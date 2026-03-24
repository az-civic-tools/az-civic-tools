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
 *   POST /api/scrape         — trigger single-prefix scrape (auth required)
 *   POST /api/scrape/all     — trigger full scrape, all prefixes (auth required)
 *   POST /api/scrape/rts     — trigger RTS agenda scrape (auth required)
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
import { runScraper, BILL_PREFIXES } from './scraper.js';
import { runRtsScraper } from './rts-scraper.js';
import { runOverviewScraper } from './overview-scraper.js';
import { runDeadlineChecker } from './deadline-checker.js';
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
    // Route based on which cron fired: :00 = bills, :30 = RTS/overviews/deadlines
    const minute = new Date(event.scheduledTime).getUTCMinutes();
    if (minute >= 30) {
      ctx.waitUntil(runScheduledPostProcess(env));
    } else {
      ctx.waitUntil(runScheduledScrape(env));
    }
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
 * Cron-triggered scrape: run each prefix sequentially.
 * Skips scraping entirely outside the legislative session window.
 */
/**
 * Cron :00 — Scrape bill data from azleg API (all prefixes).
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
