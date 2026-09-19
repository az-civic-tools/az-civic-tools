/**
 * Editable site content and voter-guide links.
 * The frontend fetches this via GET /api/config, and the email builder uses it
 * directly, so this file is the single source of truth for copy and guide URLs.
 */

export const ELECTION = {
  name: 'November 3, 2026 General Election',
  county: 'Maricopa County',
  electionDay: '11/3/2026',
  officialSource: 'https://Locations.Maricopa.Vote',
};

export const COPY = {
  title: 'Find your voting site',
  intro:
    'Maricopa County Recorder Justin Heap built a terrible website that does an awful job of showing where you can '
    + 'find a voting location that is open on the day you want to vote. We think everyone should be able to find a '
    + 'voting location in Maricopa County easily, so we built a better way to look it up. All data comes from '
    + 'elections.maricopa.gov; we only fixed a handful of spelling and grammar mistakes that Heap\'s office published '
    + 'in its official spreadsheet. Every voter in the county can vote at any vote center or drop a mail ballot at any '
    + 'drop box. Pick how you want to vote, enter your address, and we will show you the closest sites and exactly '
    + 'when they are open.',
  question: 'Do you want to vote in person, or drop off your mail-in ballot?',
};

/**
 * Voter guide links. All placeholders for now; swap in real URLs when the guides exist.
 * `local` is keyed by lowercase city name as returned by the Census "Incorporated Places" layer.
 */
export const GUIDES = {
  statewide: { label: 'Statewide voter guide', url: '/guides/statewide' },
  ldPattern: { label: 'Legislative District {ld} voter guide', url: '/guides/ld-{ld}' },
  local: {
    phoenix: { label: 'Phoenix local voter guide', url: '/guides/local/phoenix' },
    mesa: { label: 'Mesa local voter guide', url: '/guides/local/mesa' },
    tempe: { label: 'Tempe local voter guide', url: '/guides/local/tempe' },
  },
  localFallback: { label: 'Local voter guides (city and school board)', url: '/guides/local' },
};

/** Guides that apply to a voter given their legislative district and city. */
export const guidesFor = ({ ld, city } = {}) => {
  const list = [GUIDES.statewide];
  const ldNum = Number.parseInt(ld, 10);
  if (Number.isInteger(ldNum) && ldNum >= 1 && ldNum <= 30) {
    list.push({
      label: GUIDES.ldPattern.label.replace('{ld}', String(ldNum)),
      url: GUIDES.ldPattern.url.replace('{ld}', String(ldNum)),
    });
  }
  const key = typeof city === 'string' ? city.trim().toLowerCase() : '';
  list.push(GUIDES.local[key] || GUIDES.localFallback);
  return list;
};

export const publicConfig = () => ({
  election: ELECTION,
  copy: COPY,
  guides: {
    statewide: GUIDES.statewide,
    ldPattern: GUIDES.ldPattern,
    localFallback: GUIDES.localFallback,
    local: GUIDES.local,
  },
});
