# Cactus Watch — Frontend

Browse, search, and filter Arizona Legislature bills. See sponsors, committee actions, and individual legislator votes.

## Modes

The frontend runs in two modes depending on where it's hosted:

### Demo Mode (static data)

Used on **GitHub Pages** and when running locally. Reads from bundled JSON files in `demo-data/` — a curated snapshot of real bills. Filtering and pagination happen client-side in the browser.

**This is not live data.** The demo shows how the interface works, but the bills shown are a point-in-time snapshot and may be outdated.

Demo mode activates automatically when:
- Hosted on `*.github.io`
- Opened from `localhost` or `127.0.0.1`
- Opened via `file://`
- The URL includes `?demo`

### Production Mode (live API)

Used on **Cloudflare Pages** and any host that isn't GitHub Pages. Queries the live [Cactus Watch API](https://cactus-watch-central.alex-logvin.workers.dev) for real-time bill data with server-side filtering and pagination.

Production mode activates automatically for any hostname not listed above.

## Self-Hosting

### Option 1: Static demo only

Just serve the files. No backend needed.

```bash
git clone https://github.com/az-civic-tools/az-civic-tools.git
cd az-civic-tools/tools/bill-tracker/frontend
python3 -m http.server 8080
# Open http://localhost:8080/cactus-watch.html
```

This runs in **demo mode** with the bundled sample data. It's a fully static site — deploy it anywhere (Netlify, Vercel, S3, any web server). The data is a snapshot and will not update.

### Option 2: Connect to the public API

Point the frontend at the live Cactus Watch API:

```html
<script src="cactus-watch.js" data-api="https://cactus-watch-central.alex-logvin.workers.dev"></script>
```

Or via URL parameter:
```
cactus-watch.html?api=https://cactus-watch-central.alex-logvin.workers.dev
```

This gives you real-time data with server-side filtering. The API is free, public, and rate-limited to 100 requests/minute per IP.

### Option 3: Run your own backend

Deploy your own Cactus Watch Worker + D1 database (see `workers/central/`), then point the frontend at your Worker URL:

```html
<script src="cactus-watch.js" data-api="https://your-worker.your-account.workers.dev"></script>
```

## Configuration

The frontend detects its environment automatically. To override:

| Method | Example | Priority |
|--------|---------|----------|
| `data-api` attribute on script tag | `<script src="cactus-watch.js" data-api="https://...">` | Highest |
| `?api=` URL parameter | `cactus-watch.html?api=https://...` | Medium |
| `?demo` URL parameter | `cactus-watch.html?demo` | Forces demo mode |
| Auto-detection by hostname | GitHub Pages → demo, everything else → production | Default |

## Files

```
frontend/
├── cactus-watch.html    # Standalone page
├── cactus-watch.css     # Styles (bt- prefix, CSS custom properties)
├── cactus-watch.js      # All logic (IIFE, no dependencies)
├── demo-data/
│   ├── meta.json        # Session metadata snapshot
│   ├── bills.json       # ~60 curated bills for demo
│   └── bills/           # Bill detail snapshots
│       ├── HB2001.json
│       ├── SB1001.json
│       └── ...
└── README.md            # This file
```

## Updating Demo Data

The demo data is a static snapshot. To refresh it from the live API:

```bash
curl -s "https://cactus-watch-central.alex-logvin.workers.dev/api/meta" > demo-data/meta.json
curl -s "https://cactus-watch-central.alex-logvin.workers.dev/api/bills?limit=200" > /tmp/bills.json
# Curate a subset and save to demo-data/bills.json
# Fetch individual bill details to demo-data/bills/{number}.json
```

After updating, copy the new files to `docs/bill-tracker/demo-data/` as well (for GitHub Pages).

## Theming

All styles use CSS custom properties prefixed `--bt-`. Override them to match your brand:

```css
:root {
  --bt-terracotta: #your-accent-color;
  --bt-mesa: #your-dark-color;
  --bt-sand: #your-background;
  --bt-font-display: 'Your Font', serif;
  --bt-font-body: 'Your Font', sans-serif;
}
```
