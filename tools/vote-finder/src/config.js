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
 * MARICOPA_LDS is every legislative district that intersects Maricopa County
 * (from Census TIGERweb, 2024/2026 state legislative district boundaries).
 */
export const MARICOPA_LDS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 22, 23, 24, 25, 26, 27, 28, 29, 30];

export const GUIDES = {
  statewide: { label: 'Statewide LD and CD Guide', url: '/guides/statewide' },
  county: { label: 'Judges, County, and Ballot Prop Guide', url: '/guides/county' },
  ldPattern: { label: 'LD{ld} Voter Guide', url: '/guides/ld-{ld}' },
};

export const ldGuide = (ld) => ({
  ld,
  label: GUIDES.ldPattern.label.replace('{ld}', String(ld)),
  url: GUIDES.ldPattern.url.replace('{ld}', String(ld)),
});

/** Guides that apply to a voter given their legislative district. */
export const guidesFor = ({ ld } = {}) => {
  const list = [GUIDES.statewide, GUIDES.county];
  const ldNum = Number.parseInt(ld, 10);
  if (MARICOPA_LDS.includes(ldNum)) list.push(ldGuide(ldNum));
  return list;
};

export const publicConfig = () => ({
  election: ELECTION,
  copy: COPY,
  guides: {
    statewide: GUIDES.statewide,
    county: GUIDES.county,
    lds: MARICOPA_LDS.map(ldGuide),
  },
});
