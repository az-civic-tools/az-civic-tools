# AZ Civic Tools

Free, open-source civic engagement tools for Arizona advocacy groups. Find your legislators, track bills, and help your community participate in the political process.

**No frameworks. No build step. Just HTML, CSS, and JS you can drop into any website.**

## Available Tools

| Tool | Status | Description |
|------|--------|-------------|
| [Cactus Watch](#cactus-watch--bill-tracker) | **Live** | Real-time bill tracker for the Arizona Legislature with a free public API |
| [District Finder](#district-finder) | **Live** | Interactive map — find your Senator and Representatives by address or district |

---

## Cactus Watch — Bill Tracker

Cactus Watch tracks every bill in the Arizona Legislature and serves the data through a free, public API. Updated daily at 6:00 AM Arizona time.

### What You Get

- **Every bill** from the current session — House, Senate, resolutions, memorials, joint resolutions
- **Sponsors and cosponsors** with party affiliation
- **Committee votes** — which committees acted, how they voted
- **Floor votes** — how every individual legislator voted on every bill
- **Bill status** — from introduction through committee, floor votes, and governor action
- **Search and filter** — by chamber, status, sponsor, bill type, or keyword

### Use the API

No API key needed. Just fetch and go.

```bash
# Get all bills
curl "https://cactus.watch/api/bills"

# Search for education bills
curl "https://cactus.watch/api/bills?search=education"

# House bills that passed committee
curl "https://cactus.watch/api/bills?chamber=H&status=passed_committee"

# Full detail on a specific bill (sponsors, committee actions, individual votes)
curl "https://cactus.watch/api/bills/HB2839"

# Session metadata and bill count summary
curl "https://cactus.watch/api/meta"

# Bills that changed since a date (for syncing)
curl "https://cactus.watch/api/bills/sync?since=2026-03-01"
```

### Filter Options

| Filter | Values | Example |
|--------|--------|---------|
| Chamber | `H` (House), `S` (Senate) | `?chamber=H` |
| Status | `introduced`, `in_committee`, `passed_committee`, `on_floor`, `passed_house`, `passed_senate`, `passed_both`, `to_governor`, `signed`, `vetoed`, `dead`, `held` | `?status=signed` |
| Type | `bill`, `memorial`, `resolution`, `concurrent_resolution`, `joint_resolution` | `?type=bill` |
| Sponsor | Any name (partial match) | `?sponsor=Smith` |
| Search | Keywords in title, number, or description | `?search=water+rights` |
| Sort | `number`, `updated_at`, `date_introduced`, `status`, `sponsor` | `?sort=date_introduced&order=asc` |
| Pagination | `page` (default 1), `limit` (default 50, max 200) | `?page=2&limit=100` |

Full API documentation: **[Wiki — API Reference](https://github.com/az-civic-tools/az-civic-tools/wiki/Cactus-Watch-API-Reference)**

---

## District Finder

Interactive map of Arizona's 30 legislative districts. Search by address or click the map to find your Senator and Representatives.

**[Live Demo](https://az-civic-tools.github.io/az-civic-tools/district-finder/)**

### Embed in Your Website

Paste this into your HTML:

```html
<iframe
  src="https://az-civic-tools.github.io/az-civic-tools/tools/district-finder/district-finder.html"
  width="100%"
  height="900"
  frameborder="0"
  style="border: none;"
></iframe>
```

That's it. Works on any website.

### Fork and Customize

```bash
git clone https://github.com/az-civic-tools/az-civic-tools.git
cd az-civic-tools/tools/district-finder
```

- Edit `themes/default.css` to change colors, fonts, and spacing
- Edit `data/legislators.json` to update legislator information
- Deploy to any static host (GitHub Pages, Cloudflare Pages, Netlify, etc.)

### Use as a JS Widget

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
    geojsonUrl: 'path/to/az-districts.geojson',
    source: 'My Organization',
    sourceUrl: 'https://myorg.org'
  });
</script>
```

### URL Parameters

- `?district=7` — Pre-select a district on load
- `?source=My+Org` — Set the copy-markdown attribution

### Theming

Override CSS custom properties (all prefixed `--df-`) to match your brand:

```css
:root {
  --df-font-heading: 'Your Font', sans-serif;
  --df-color-primary: #2E5090;
  --df-color-accent: #E8A317;
}
```

More guides: **[Wiki — Customizing Colors & Fonts](https://github.com/az-civic-tools/az-civic-tools/wiki/Customizing-Colors-and-Fonts)**

---

## Data Sources

- **Bill data**: [Arizona State Legislature](https://www.azleg.gov) — scraped daily via azleg.gov API
- **District boundaries**: [Arizona Independent Redistricting Commission](https://irc.az.gov) (effective 2022)
- **Legislator information**: [Arizona State Legislature](https://www.azleg.gov)
- **Address geocoding**: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We welcome data corrections, new themes, bug fixes, and new tools.

## Documentation

Visit the **[Wiki](https://github.com/az-civic-tools/az-civic-tools/wiki)** for detailed technical docs:
- [Cactus Watch API Reference](https://github.com/az-civic-tools/az-civic-tools/wiki/Cactus-Watch-API-Reference)
- [Cactus Watch Architecture](https://github.com/az-civic-tools/az-civic-tools/wiki/Cactus-Watch-Architecture)
- [District Finder Customization Guides](https://github.com/az-civic-tools/az-civic-tools/wiki)

## License

[MIT](LICENSE) — Use it however you want. No attribution required.
