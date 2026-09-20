/**
 * Geocoding proxy around the US Census Bureau geocoder.
 * Returns coordinates plus the voter's state legislative district and city,
 * which drive the voter-guide links. Only Arizona results are returned.
 */
import { json, error, clientIp } from './http.js';
import { checkRateLimit } from './rate-limit.js';

const CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies';
const BENCHMARK = 'Public_AR_Current';
const VINTAGE = 'Current_Current';
const LD_LAYER_PATTERN = /State Legislative Districts - Lower/;
const PLACE_LAYER = 'Incorporated Places';
const COUNTY_LAYER = 'Counties';
const MAX_QUERY_LENGTH = 200;
const RATE_LIMIT_PER_HOUR = 120;
const FETCH_TIMEOUT_MS = 8000;

const censusFetch = async (url) => {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: 86400, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`Census geocoder responded ${res.status}`);
  return res.json();
};

const pickGeographies = (geos = {}) => {
  const ldKey = Object.keys(geos).find((k) => LD_LAYER_PATTERN.test(k));
  const ld = ldKey ? geos[ldKey]?.[0]?.BASENAME : null;
  const city = geos[PLACE_LAYER]?.[0]?.BASENAME || null;
  const county = geos[COUNTY_LAYER]?.[0]?.BASENAME || null;
  const state = geos.States?.[0]?.BASENAME || null;
  return { ld: ld ? String(Number.parseInt(ld, 10)) : null, city, county, state };
};

const guardRate = async (request, env) => {
  const rate = await checkRateLimit(env.RATE_LIMIT, `geo:${clientIp(request)}`, RATE_LIMIT_PER_HOUR);
  return rate.allowed ? null : error('Too many lookups from this network. Try again in a little while.', 429);
};

/** GET /api/geocode?q=<address> */
export const handleGeocode = async (request, env) => {
  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  if (q.length < 4 || q.length > MAX_QUERY_LENGTH) return error('Enter a street address, like 424 N Central Ave, Phoenix.');
  const limited = await guardRate(request, env);
  if (limited) return limited;

  const address = /\baz\b|arizona/i.test(q) ? q : `${q}, AZ`;
  const params = new URLSearchParams({ address, benchmark: BENCHMARK, vintage: VINTAGE, format: 'json' });
  try {
    const data = await censusFetch(`${CENSUS}/onelineaddress?${params}`);
    const match = data?.result?.addressMatches?.[0];
    if (!match) return error('We could not find that address. Try adding the city, or search by ZIP code instead.', 404);
    const geo = pickGeographies(match.geographies);
    if (geo.state && geo.state !== 'Arizona') return error('That address is outside Arizona.', 404);
    return json({
      ok: true,
      lat: match.coordinates.y,
      lng: match.coordinates.x,
      label: match.matchedAddress,
      ...geo,
    });
  } catch (err) {
    console.error('geocode failed', err);
    return error('The address lookup service is not responding. Try a ZIP code instead.', 502);
  }
};

/** GET /api/locate?lat=&lng= (reverse lookup for "use my location" and ZIP searches) */
export const handleLocate = async (request, env) => {
  const sp = new URL(request.url).searchParams;
  const lat = Number.parseFloat(sp.get('lat'));
  const lng = Number.parseFloat(sp.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 31 || lat > 37.1 || lng < -115 || lng > -109) {
    return error('That location is outside Arizona.');
  }
  const limited = await guardRate(request, env);
  if (limited) return limited;
  const params = new URLSearchParams({ x: String(lng), y: String(lat), benchmark: BENCHMARK, vintage: VINTAGE, format: 'json' });
  try {
    const data = await censusFetch(`${CENSUS}/coordinates?${params}`);
    return json({ ok: true, lat, lng, ...pickGeographies(data?.result?.geographies) });
  } catch (err) {
    console.error('locate failed', err);
    return json({ ok: true, lat, lng, ld: null, city: null, county: null, state: null });
  }
};
