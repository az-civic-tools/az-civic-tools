/**
 * Cactus Watch — Central API Worker
 *
 * Public bill data API + scheduled scraper for Arizona Legislature bills.
 * Routes:
 *   GET  /api/bills          — list bills (paginated, filterable)
 *   GET  /api/bills/:number  — single bill detail
 *   GET  /api/bills/sync     — changed bills since a given date
 *   GET  /api/meta           — session info, last scrape, counts
 *   POST /api/scrape         — trigger single-prefix scrape (auth required)
 *   POST /api/scrape/all     — trigger full scrape, all prefixes (auth required)
 */

import { handleListBills, handleGetBill, handleSyncBills } from './routes/bills.js';
import { handleMeta } from './routes/meta.js';
import { handleScrape, handleScrapeAll } from './routes/scrape.js';
import { runScraper, BILL_PREFIXES } from './scraper.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      let response;

      if (path === '/api/bills' && request.method === 'GET') {
        response = await handleListBills(request, env);
      } else if (path === '/api/bills/sync' && request.method === 'GET') {
        response = await handleSyncBills(request, env);
      } else if (path.match(/^\/api\/bills\/[A-Za-z]+\d+$/) && request.method === 'GET') {
        const number = path.split('/').pop();
        response = await handleGetBill(number, env);
      } else if (path === '/api/meta' && request.method === 'GET') {
        response = await handleMeta(env);
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

      return addCorsHeaders(response);
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
 * Cron-triggered scrape: run each prefix sequentially.
 */
async function runScheduledScrape(env) {
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

function addCorsHeaders(response) {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
