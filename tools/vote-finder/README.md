# Vote Finder

A one-page site that helps Maricopa County voters find the closest vote center or
ballot drop box for the November 3, 2026 general election, see exactly which days and
hours it is open, and email themselves the details plus the voter guides that apply to
their legislative district and city.

Live (temporary) URL: https://vote-finder.alex-logvin.workers.dev

## How it works

- `public/` is the whole frontend: plain HTML, CSS, and JS served as Cloudflare Workers
  static assets. Leaflet (from unpkg) draws the map with OpenStreetMap tiles.
- Flow: pick in-person or drop box. In-person voters then pick early voting or Election
  Day; early voters can pick a specific day, which filters the list and map to sites open
  that day (the county sheet shows many sites open only in the final days).
- `public/data/sites.json` is generated from the county's "Voting Sites Schedule" XLSX
  by `scripts/build-data.py`. Each site carries per-day hour codes for in-person voting
  (`vc`) and drop-off (`db`, only when it differs), decoded through `legend`.
- `src/` is the Worker. It serves the assets and four small API routes:
  - `GET /api/config` copy and voter-guide links (edit `src/config.js`)
  - `GET /api/geocode?q=` address to coordinates, legislative district, and city
    (US Census geocoder)
  - `GET /api/locate?lat=&lng=` coordinates to district and city
  - `POST /api/email` sends the chosen site's schedule and guides via Resend

## Updating the site list

When the county publishes a new schedule:

```bash
pip install openpyxl
python3 scripts/build-data.py "~/Downloads/2026 General Election Voting Sites Schedule.xlsx"
```

Geocoding results are cached in `data/geocode-cache.json`, so only new addresses hit the
Census or Nominatim APIs. Addresses neither service can place go in `MANUAL_COORDS`.

## Editing copy and guide links

Everything a human reads lives in `src/config.js`: the title, intro paragraph, the
question, and the voter-guide URLs (statewide, per-LD pattern, and per-city local guides).

## Deploying

Pushing changes under `tools/vote-finder/` to `main` deploys via
`.github/workflows/deploy-vote-finder.yml`. The Worker needs one secret set in the
Cloudflare dashboard: `RESEND_API_KEY` (the "email me this site" button returns a
friendly "not set up yet" message until it exists).

## Data notes

- The county sheet lists 282 rows; eight locations appear twice (once as a vote center,
  once as a drop box) and are merged into one site with separate in-person and drop-off
  hours.
- Two addresses on tribal land (Kaka Village near Ajo and Fort McDowell) could not be
  geocoded and are hand-placed; they are flagged "Map pin is approximate" in the UI.
- A handful of source cells have obvious typos (for example `8:00A-4:00A`). The build
  script assumes a PM close when the close time would otherwise be before the open time.
