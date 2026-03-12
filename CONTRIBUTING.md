# Contributing to AZ Civic Tools

Thank you for your interest in contributing! This project exists to help Arizona advocacy groups engage their communities more effectively.

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/az-civic-tools/az-civic-tools/issues) to report bugs or request features.
- Include steps to reproduce the issue and what browser/device you're using.

### Updating Legislator Data

If you notice outdated legislator information:

1. Fork the repo
2. Edit `tools/district-finder/data/legislators.json`
3. Update the `meta.lastUpdated` date
4. Submit a pull request with a brief description of what changed

### Adding a New Theme

1. Create a new CSS file in `tools/district-finder/themes/`
2. Override the `--df-*` CSS variables (see `themes/default.css` for the full list)
3. Submit a PR — include a screenshot showing your theme

### Code Changes

1. Fork the repo and create a feature branch
2. Keep changes focused — one feature or fix per PR
3. Test in Chrome, Firefox, and Safari
4. Test on mobile (the tools must be responsive)
5. Submit a PR with a clear description

## Guidelines

- No build tools required — this is plain HTML, CSS, and JS
- Keep it simple and accessible
- No frameworks or dependencies beyond Leaflet (for maps)
- All CSS classes must use the tool prefix (`df-` for district finder, `bt-` for bill tracker)
- Test that your changes work when embedded via iframe

## Code of Conduct

Be respectful. We're all here to make civic engagement easier for Arizonans. Harassment, discrimination, and bad-faith contributions will not be tolerated.
