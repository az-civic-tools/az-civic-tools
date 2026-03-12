# AZ Civic Tools

Free, open-source civic engagement tools for Arizona advocacy groups. Find your legislators, track bills, and help your community participate in the political process.

**No frameworks. No build step. Just HTML, CSS, and JS you can drop into any website.**

## Available Tools

| Tool | Status | Description |
|------|--------|-------------|
| [District Finder](tools/district-finder/) | **Live** | Interactive map of Arizona's 30 legislative districts. Search by address or click to find your Senator and Representatives. |
| Bill Tracker | Coming Soon | Filterable, searchable bill tracking for the Arizona Legislature. |

## Quick Start

### Option 1: Embed via iframe (easiest)

Paste this into your website's HTML:

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

### Option 2: Fork & Customize

```bash
git clone https://github.com/az-civic-tools/az-civic-tools.git
cd az-civic-tools/tools/district-finder
```

Then:
- Edit `themes/default.css` to change colors, fonts, and spacing
- Edit `data/legislators.json` to update legislator information
- Deploy to any static host (GitHub Pages, Cloudflare Pages, Netlify, etc.)

### Option 3: Use as a JS Widget

Add the district finder to an existing page:

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

## Customization

See the [Wiki](https://github.com/az-civic-tools/az-civic-tools/wiki) for detailed guides:

- **Customizing Colors & Fonts** — Override CSS variables to match your brand
- **Updating Legislator Data** — Edit the JSON file when legislators change
- **Embedding via iframe** — Sizing, responsive tips, and URL parameters
- **Example Themes** — See `tools/district-finder/themes/` for examples

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

When using the standalone HTML page or iframe, you can pass URL parameters:

- `?district=7` — Pre-select a district on load
- `?source=My+Org` — Set the copy-markdown attribution

### Theming

All visual properties use CSS custom properties prefixed with `--df-`. Override them in your own stylesheet:

```css
:root {
  --df-font-heading: 'Your Font', sans-serif;
  --df-color-primary: #2E5090;
  --df-color-accent: #E8A317;
  --df-color-bg: #FAFAFA;
}
```

See `tools/district-finder/themes/` for complete examples.

## Project Structure

```
az-civic-tools/
├── docs/                        # GitHub Pages demo site
│   ├── index.html               # Landing page
│   └── district-finder/         # District finder demo
├── tools/
│   ├── district-finder/         # District finder tool
│   │   ├── district-finder.html # Standalone page (iframe this)
│   │   ├── district-finder.js   # All logic
│   │   ├── district-finder.css  # Styles
│   │   ├── themes/              # CSS variable themes
│   │   └── data/                # Legislator JSON + GeoJSON
│   └── bill-tracker/            # Coming soon
├── README.md
├── LICENSE                      # MIT
└── CONTRIBUTING.md
```

## Data Sources

- **District boundaries**: [Arizona Independent Redistricting Commission](https://irc.az.gov) (effective 2022)
- **Legislator information**: [Arizona State Legislature](https://www.azleg.gov)
- **Address geocoding**: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) (1 request/second limit)

## Dependencies

- [Leaflet 1.9.4](https://leafletjs.com) — Interactive maps (loaded via CDN)
- No other dependencies

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We welcome:
- Data corrections (legislator info changes after elections)
- New themes
- Bug fixes
- New tools for the toolkit

## License

[MIT](LICENSE) — Use it however you want. No attribution required.
>>>>>>> 6f93d19 (feat: initial az-civic-tools monorepo with district finder)
