# AZ Civic Tools

Free, open-source civic engagement tools for Arizona advocacy groups. Find your legislators, track bills, and help your community participate in the political process.

**No frameworks. No build step. Just HTML, CSS, and JS you can drop into any website.**

## Available Tools

| Tool | Status | Description |
|------|--------|-------------|
| [District Finder](tools/district-finder/) | **Live** | Interactive map of Arizona's 30 legislative districts. Search by address or click to find your Senator and Representatives. |
| [Cactus Watch](tools/bill-tracker/) | **Live** | Real-time bill tracker for the Arizona Legislature — scrapes azleg.gov daily, serves a public REST API. |

---

## Cactus Watch — Arizona Bill Tracker

Cactus Watch is an automated bill tracking system for the Arizona Legislature. A Cloudflare Worker scrapes [azleg.gov](https://www.azleg.gov) daily, stores everything in a D1 database, and exposes a free, public REST API.

### What It Tracks

- **All bill types**: House/Senate Bills, Concurrent Resolutions, Joint Resolutions, Memorials, and Resolutions
- **Sponsors & cosponsors**: Prime sponsor with party affiliation, plus all cosponsors
- **Committee actions**: Committee assignments, votes (DP, DPA, W, H, etc.), and dates
- **Floor votes**: Third-reading vote totals plus every individual legislator's vote (Yea/Nay/Not Voting/Excused)
- **Bill status**: Automatically derived from legislative activity — introduced through signed/vetoed/dead
- **Multiple sessions**: Currently tracking sessions 127–130 (2023–2026)

### Architecture

```
azleg.gov API                 Cloudflare Worker              D1 Database
┌─────────────┐    scrape    ┌──────────────────┐    store   ┌──────────┐
│ Bill         │───────────→ │ cactus-watch-     │─────────→ │ bills    │
│ BillSponsor  │             │ central           │           │ sponsors │
│ FloorAction  │             │                   │           │ votes    │
│ Session      │             │ cron: daily 6AM   │           │ ...      │
└─────────────┘              └──────────────────┘           └──────────┘
                                      │
                                      │ REST API
                                      ▼
                              Your app / website
```

### Public API

**Base URL**: `https://cactus-watch-central.alex-logvin.workers.dev`

No API key required. CORS enabled for all origins.

#### `GET /api/bills` — List Bills

Paginated, filterable list of all bills.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 50 | Results per page (max 200) |
| `session` | int | current | Session ID (130, 129, 128, 127) |
| `chamber` | string | — | `H` (House) or `S` (Senate) |
| `status` | string | — | `introduced`, `in_committee`, `passed_committee`, `on_floor`, `passed_house`, `passed_senate`, `passed_both`, `to_governor`, `signed`, `vetoed`, `dead`, `held` |
| `sponsor` | string | — | Partial sponsor name match |
| `search` | string | — | Search bill number, title, and description |
| `type` | string | — | `bill`, `memorial`, `resolution`, `concurrent_resolution`, `joint_resolution` |
| `sort` | string | `updated_at` | `number`, `updated_at`, `date_introduced`, `status`, `sponsor` |
| `order` | string | `desc` | `asc` or `desc` |

```bash
# All House bills about education
curl "https://cactus-watch-central.alex-logvin.workers.dev/api/bills?chamber=H&search=education"

# Recently signed bills
curl "https://cactus-watch-central.alex-logvin.workers.dev/api/bills?status=signed"
```

**Response:**
```json
{
  "bills": [
    {
      "number": "HB2839",
      "short_title": "community colleges; workforce programs",
      "description": "Relates to community college workforce development...",
      "sponsor": "Rep. Smith",
      "sponsor_party": "R",
      "chamber": "H",
      "bill_type": "bill",
      "status": "passed_house",
      "date_introduced": "2026-01-21T00:00:00",
      "last_action": "Third Read",
      "last_action_date": "2026-02-15T00:00:00",
      "azleg_url": "https://apps.azleg.gov/BillStatus/BillOverview/...",
      "keywords": ["education", "workforce"],
      "session": 130,
      "session_name": "57th Legislature, 2nd Regular Session",
      "updated_at": "2026-03-13T14:58:22"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1959, "pages": 40 }
}
```

#### `GET /api/bills/:number` — Bill Detail

Full bill data including cosponsors, committee actions, and individual vote records.

```bash
curl "https://cactus-watch-central.alex-logvin.workers.dev/api/bills/HB2839"
```

**Response** includes everything from the list endpoint plus:
```json
{
  "cosponsors": [
    { "name": "Rep. Jane Doe", "party": "R", "sponsor_type": "CoSponsor" }
  ],
  "committee_actions": [
    {
      "committee_name": "Health and Human Services",
      "committee_short": "HHS",
      "chamber": "H",
      "action": "DP",
      "ayes": 8,
      "nays": 1,
      "action_date": "2026-02-10T00:00:00"
    }
  ],
  "votes": [
    {
      "chamber": "H",
      "vote_date": "2026-02-15T00:00:00",
      "yeas": 45,
      "nays": 15,
      "not_voting": 0,
      "excused": 0,
      "result": "Passed",
      "records": [
        { "legislator": "Rep. John Smith", "party": "R", "vote": "Y" }
      ]
    }
  ]
}
```

#### `GET /api/bills/sync` — Changed Bills

Fetch bills updated since a given timestamp. Useful for syncing local caches.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `since` | ISO date | Yes | Return bills updated after this date |
| `session` | int | No | Session ID (default: current) |

```bash
curl "https://cactus-watch-central.alex-logvin.workers.dev/api/bills/sync?since=2026-03-01T00:00:00"
```

#### `GET /api/meta` — Metadata

Session info, bill counts by status/chamber, and last scrape details.

```bash
curl "https://cactus-watch-central.alex-logvin.workers.dev/api/meta"
```

### Scraper Details

The scraper runs daily at **6:00 AM Arizona time** (1:00 PM UTC) via Cloudflare Cron Triggers.

**Strategy:**
1. Enumerates bill numbers per prefix (HB2001, HB2002, ...) until 10 consecutive misses
2. For each bill found, fetches sponsors via the BillSponsor endpoint
3. For bills with third-reading floor votes, fetches individual vote records
4. Upserts all data into D1 with conflict resolution on `(session_id, number)`
5. Rate limited to 200ms between azleg.gov API calls

**Bill prefixes scraped:**

| Prefix | Type | Starting Number |
|--------|------|-----------------|
| HB / SB | Bills | 2001 / 1001 |
| HCR / SCR | Concurrent Resolutions | 2001 / 1001 |
| HM / SM | Memorials | 2001 / 1001 |
| HJR / SJR | Joint Resolutions | 2001 / 1001 |
| HR / SR | Resolutions | 2001 / 1001 |

**Manual scrape** (requires `SCRAPE_TOKEN`):
```bash
# Single prefix
curl -X POST https://cactus-watch-central.alex-logvin.workers.dev/api/scrape \
  -H "Authorization: Bearer $SCRAPE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prefix": "HB"}'

# All prefixes
curl -X POST https://cactus-watch-central.alex-logvin.workers.dev/api/scrape/all \
  -H "Authorization: Bearer $SCRAPE_TOKEN"
```

### Database Schema

D1 database with 7 tables:

| Table | Purpose |
|-------|---------|
| `sessions` | Legislative session metadata (ID, legislature, year) |
| `bills` | All bill data — number, title, sponsor, status, dates, keywords |
| `cosponsors` | Bill cosponsors with party affiliation |
| `committee_actions` | Committee assignments, actions (DP/DPA/W/H), and vote counts |
| `votes` | Floor vote summaries — chamber, date, yeas/nays/result |
| `vote_records` | Individual legislator votes (Yea/Nay/Not Voting/Excused/Present) |
| `scrape_log` | Audit trail for scraper runs |

### Shared Modules

Reusable utilities in `tools/bill-tracker/shared/` — designed for use by any bill tracking tool:

| Module | Exports |
|--------|---------|
| `constants.js` | Sessions, bill types, parties, statuses, committee actions, vote values, azleg URLs |
| `bill-utils.js` | `parseBillNumber()`, `deriveBillStatus()`, `formatDate()`, `azlegBillUrl()` |
| `validation.js` | `escHtml()`, `isSafeUrl()`, `isValidEmail()`, `toSlug()`, `isValidBillNumber()` |
| `markdown.js` | `billToMarkdown()`, `billListToMarkdown()`, `voteToMarkdown()` |

### Status Derivation

Bill status is automatically derived from azleg.gov data in this priority order:

1. Governor signed/vetoed → `signed` / `vetoed`
2. Held in committee → `held`
3. Has final disposition → `dead`
4. Sent to governor → `to_governor`
5. Both chambers passed → `passed_both`
6. One chamber passed → `passed_house` / `passed_senate`
7. On floor → `on_floor`
8. Passed committee → `passed_committee`
9. Assigned to committee → `in_committee`
10. Default → `introduced`

### Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| Scraper + API | Cloudflare Worker | `cactus-watch-central` |
| Database | Cloudflare D1 | `cactus-watch-db` |
| Scheduling | Cron Triggers | Daily at `0 13 * * *` (6 AM AZ) |
| Data Source | azleg.gov | Undocumented API at `apps.azleg.gov/api/` |

---

## District Finder

Interactive map of Arizona's 30 legislative districts. Search by address or click to find your Senator and Representatives.

**Live demo**: [az-civic-tools.github.io/az-civic-tools/district-finder/](https://az-civic-tools.github.io/az-civic-tools/district-finder/)

### Quick Start

**Embed via iframe** (easiest):

```html
<iframe
  src="https://az-civic-tools.github.io/az-civic-tools/tools/district-finder/district-finder.html"
  width="100%"
  height="900"
  frameborder="0"
  style="border: none;"
></iframe>
```

**Fork & customize**:

```bash
git clone https://github.com/az-civic-tools/az-civic-tools.git
cd az-civic-tools/tools/district-finder
```

Edit `themes/default.css` to change colors, `data/legislators.json` to update legislator info. Deploy to any static host.

**Use as a JS widget**:

```html
<link rel="stylesheet" href="path/to/themes/default.css">
<link rel="stylesheet" href="path/to/district-finder.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

<div id="my-district-finder"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="path/to/district-finder.js"></script>
<script>
  AZDistrictFinder.init({
    container: '#my-district-finder',
    dataUrl: 'path/to/legislators.json',
    geojsonUrl: 'path/to/az-districts.geojson'
  });
</script>
```

### Configuration Options

```javascript
AZDistrictFinder.init({
  container: '#my-element',           // CSS selector or DOM element
  dataUrl: './data/legislators.json', // Path to legislator data
  geojsonUrl: './data/az-districts.geojson', // Path to district boundaries
  source: 'My Organization',         // Attribution in copy-markdown output
  sourceUrl: 'https://myorg.org',    // Link for attribution
  legislature: '57th Legislature'    // Legislature label
});
```

### URL Parameters

- `?district=7` — Pre-select a district on load
- `?source=My+Org` — Set the copy-markdown attribution

### Theming

All visual properties use CSS custom properties prefixed with `--df-`. Override them:

```css
:root {
  --df-font-heading: 'Your Font', sans-serif;
  --df-color-primary: #2E5090;
  --df-color-accent: #E8A317;
  --df-color-bg: #FAFAFA;
}
```

See `tools/district-finder/themes/` for complete examples (default, desert, modern dark).

---

## Project Structure

```
az-civic-tools/
├── docs/                            # GitHub Pages demo site
│   ├── index.html                   # Landing page
│   └── district-finder/             # District finder demo
├── tools/
│   ├── district-finder/             # District finder tool
│   │   ├── district-finder.html     # Standalone page
│   │   ├── district-finder.js       # IIFE — AZDistrictFinder.init(config)
│   │   ├── district-finder.css      # Styles (df- prefix)
│   │   ├── themes/                  # CSS variable themes
│   │   └── data/                    # legislators.json + az-districts.geojson
│   └── bill-tracker/                # Cactus Watch bill tracker
│       ├── shared/                  # Reusable modules
│       │   ├── constants.js         # Sessions, bill types, statuses, URLs
│       │   ├── bill-utils.js        # Parsing, formatting, status derivation
│       │   ├── validation.js        # Sanitization, URL/email checks
│       │   └── markdown.js          # Bill-to-markdown export
│       └── workers/central/         # Cloudflare Worker
│           ├── wrangler.toml        # Worker config, D1 binding, cron
│           ├── schema.sql           # D1 table definitions
│           └── src/
│               ├── index.js         # Router, CORS, scheduled handler
│               ├── scraper.js       # azleg.gov enumeration + D1 upsert
│               └── routes/
│                   ├── bills.js     # GET /api/bills, /bills/:num, /bills/sync
│                   ├── meta.js      # GET /api/meta
│                   └── scrape.js    # POST /api/scrape, /api/scrape/all
├── README.md
├── LICENSE                          # MIT
└── CONTRIBUTING.md
```

## Data Sources

- **District boundaries**: [Arizona Independent Redistricting Commission](https://irc.az.gov) (effective 2022)
- **Legislator information**: [Arizona State Legislature](https://www.azleg.gov)
- **Bill data**: [azleg.gov API](https://apps.azleg.gov/api/) — Bill, BillSponsor, BillStatusFloorAction endpoints
- **Address geocoding**: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) (1 request/second limit)

## Dependencies

- [Leaflet 1.9.4](https://leafletjs.com) — Interactive maps (CDN, district finder only)
- [Cloudflare Workers](https://workers.cloudflare.com) — Scraper + API runtime (bill tracker only)
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — SQLite database (bill tracker only)
- No frontend frameworks

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We welcome:
- Data corrections (legislator info changes after elections)
- New themes
- Bug fixes
- New tools for the toolkit

## License

[MIT](LICENSE) — Use it however you want. No attribution required.
