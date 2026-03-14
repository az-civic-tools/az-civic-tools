/**
 * Cactus Watch — Central API Worker
 *
 * Public bill data API + scheduled scraper for Arizona Legislature bills.
 * Routes:
 *   GET  /api/bills          — list bills (paginated, filterable)
 *   GET  /api/bills/:number  — single bill detail
 *   GET  /api/bills/sync     — changed bills since a given date
 *   GET  /api/meta           — session info, last scrape, counts
 *   GET  /api/rts/:number    — RTS agenda items + deep links for a bill
 *   POST /api/scrape         — trigger single-prefix scrape (auth required)
 *   POST /api/scrape/all     — trigger full scrape, all prefixes (auth required)
 */

import { handleListBills, handleGetBill, handleSyncBills } from './routes/bills.js';
import { handleMeta } from './routes/meta.js';
import { handleScrape, handleScrapeAll } from './routes/scrape.js';
import { handleRts } from './routes/rts.js';
import { runScraper, BILL_PREFIXES } from './scraper.js';
import { checkRateLimit } from './rate-limit.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Rate limit all non-OPTIONS requests
    const rateLimited = await checkRateLimit(request, env);
    if (rateLimited) return addCorsHeaders(rateLimited);

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
      } else if (path.match(/^\/api\/rts\/[A-Za-z]+\d+$/) && request.method === 'GET') {
        const number = path.split('/').pop().toUpperCase();
        response = await handleRts(number, env);
        cacheTtl = CACHE_TTL.rts;
      } else if (path === '/api/scrape/all' && request.method === 'POST') {
        response = await handleScrapeAll(request, env);
      } else if (path === '/api/scrape' && request.method === 'POST') {
        response = await handleScrape(request, env);
      } else {
        response = Response.json(
          { error: 'Not found' },
          { status: 404 }
        );
      }

      return addCorsHeaders(addCacheHeaders(response, cacheTtl));
    } catch (err) {
      console.error('Unhandled error:', err);
      return addCorsHeaders(
        Response.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledScrape(env));
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
async function runScheduledScrape(env) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < SESSION_WINDOW.start || today > SESSION_WINDOW.end) {
    console.log(`Cron: session not active (${today} outside ${SESSION_WINDOW.start}–${SESSION_WINDOW.end}). Skipping.`);
    return;
  }

  console.log('Cron-triggered scrape starting...');

  for (const { prefix } of BILL_PREFIXES) {
    try {
      console.log(`Cron: scraping ${prefix}...`);
      const result = await runScraper(env, { prefix });
      console.log(`Cron: ${prefix} done — ${result.billsFound} bills`);
    } catch (err) {
      console.error(`Cron: ${prefix} failed:`, err);
    }
  }

  console.log('Cron scrape complete');
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

function addCorsHeaders(response) {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
