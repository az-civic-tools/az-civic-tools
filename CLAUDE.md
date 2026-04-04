# AZ Civic Tools

## What This Is

A monorepo of free, open-source civic engagement tools for Arizona. The tools are designed to be used by advocacy groups, embedded in websites, or forked and customized.

**Cactus Watch** (the bill tracker at cactus.watch) is one implementation built on this codebase. The repo itself is the toolkit... Cactus Watch is the flagship deployment.

## Architecture

No frameworks. No build step. Plain HTML, CSS, and JavaScript throughout.

### Directory Structure

- `tools/` — Source code for all tools
  - `bill-tracker/` — Bill tracker (Cactus Watch is the reference deployment)
    - `frontend/` — Vanilla HTML/CSS/JS, deployed to Cloudflare Pages
    - `workers/central/` — Cloudflare Worker: bill scraper + public REST API (D1, KV, R2)
    - `shared/` — Constants, utilities shared between frontend and workers
  - `auth/` — Cloudflare Worker: authentication service (Google OAuth, magic links, sessions)
  - `district-finder/` — Embeddable interactive legislative district map (Leaflet.js)
  - `how-it-works/` — "How the Sausage Gets Made" civics education guide
- `docs/` — GitHub Pages site with demo copies of tools (for az-civic-tools.github.io)
- `.github/workflows/` — CI/CD for frontend (Pages) and Workers

### Deployment Model

- **Bill tracker frontend** — Cloudflare Pages (deployed via GitHub Actions on push to `tools/bill-tracker/frontend/`)
- **Central Worker** — Cloudflare Workers with D1, KV, R2 bindings (deployed via GitHub Actions on push to `tools/bill-tracker/workers/central/`)
- **Auth Worker** — Cloudflare Workers with D1, KV (deployed via GitHub Actions on push to `tools/auth/`)
- **District Finder, How It Works** — Static files served via GitHub Pages from `docs/`
- Smaller tools that don't need server-side logic use GitHub Pages, not Cloudflare

### Data Flow

- Central Worker scrapes azleg.gov daily via cron (6:00 AM AZ / 1 PM UTC for bills, 6:30 AM for RTS/overviews/deadlines)
- Bill data stored in D1 database
- Frontend fetches from the public API at cactus.watch/api/
- Rate limiting via KV namespace

## Conventions

- CSS classes use tool prefixes: `df-` (district finder), `bt-` (bill tracker)
- No external dependencies except Leaflet (for maps)
- All tools must work when embedded via iframe
- All tools must be responsive (test mobile)
- Immutable data patterns... never mutate objects, always create new ones
- Files should stay under 800 lines, functions under 50 lines

## Cloudflare Resources

All Cloudflare resources are managed via MCP tools, not wrangler CLI.

### Workers
- `cactus-watch-central` — Bill scraper + API
- `cactus-auth` — Authentication service

### D1 Databases
- `cactus-watch-db` — Bill data, votes, hearings, org recommendations
- `cactus-auth-db` — Users, sessions, OAuth providers, magic links

### KV Namespaces
- Rate limiting for both workers

### R2 Buckets
- `nokings-images` — Image storage for NoKings3 gallery

## Testing

- Test in Chrome, Firefox, and Safari
- Test on mobile
- Test iframe embedding for embeddable tools
- Use Playwright for frontend testing before deploying

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`
- One feature or fix per PR
- Branch names: `feat/description`, `fix/description`
