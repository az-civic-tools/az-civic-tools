## Cactus Watch — Data Sources Reference

### Primary: azleg API

- **Base URL:** `https://apps.azleg.gov/api`
- **Endpoints:** `/Bill/`, `/BillSponsor/`, `/BillStatusFloorAction/`, `/AgendaItem/`, `/DocType/`, `/Session/`
- **Session ID format:** Integer (e.g., 130 = 57th Legislature, 2nd Regular Session, 2026)
- **Known limitation:** Governor action fields (`GovernorAction`, `GovernorActionDate`) can lag behind real-world signing/vetoing by 1-2+ days. This causes our DB to show `passed_both` when a bill has already been signed or vetoed.

### Secondary (potential): Senate Daily Posting Sheets

The Senate Secretary's Office publishes daily posting sheets with same-day results including COW actions, floor votes, consent calendar, conference committees, and governor transmissions.

**URL pattern:**
```
https://www.azleg.gov/legtext/{leg}leg/{session}/posting/POSTING%20SHEET%20{N}.DOC.htm
```

**Current session (57th Leg, 2R):**
```
https://www.azleg.gov/legtext/57leg/2R/posting/POSTING%20SHEET%20{N}.DOC.htm
```

**Notes:**
- `{leg}` = Legislature number (e.g., 57)
- `{session}` = Session code (e.g., `1R` = 1st Regular, `2R` = 2nd Regular, `1S` = 1st Special)
- `{N}` = Sequential sheet number, but **numbering has gaps** (not every integer has a sheet)
- Sheets are **Senate only** — the House does not publish through this pattern
- Directory listing at `/posting/` returns 403 (no index), so sheets must be discovered by iterating
- Sheet #87 was the latest as of 2026-04-08
- Content includes: COW actions, 3rd read votes (with vote counts), consent calendar, conference committee appointments, governor transmissions
- These update same-day, unlike the azleg API which can lag

**Potential use:** Scrape posting sheets as a secondary source to catch governor transmissions and floor results faster than the azleg API reflects them. Could also be used to validate/cross-reference our existing data.

### Not available: House Posting Sheets

The House of Representatives does not publish equivalent daily posting sheets via azleg.gov. Tried variations: `H.POSTING SHEET`, `HOUSE POSTING SHEET`, `HPOSTING SHEET` — all 404. House floor results must come from the azleg API or other sources.
