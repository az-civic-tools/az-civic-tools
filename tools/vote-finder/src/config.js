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
 * Voter guides. PDFs live in guides/ and are uploaded to the vote-finder-guides R2
 * bucket on deploy; the Worker serves them at /guides/<slug>.
 * LD_GUIDES lists the legislative districts that have a guide PDF.
 */
export const LD_GUIDES = [2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 22, 23, 24, 25, 26, 27, 28, 29, 30];

export const GUIDES = {
  statewide: { label: 'Statewide LD and CD Guide', url: '/guides/statewide', key: 'AZ_LD_and_CD_Guide.pdf' },
};

export const ldGuide = (ld) => ({ ld, label: `LD${ld} Voter Guide`, url: `/guides/ld-${ld}`, key: `AZ_LD${ld}_Ballot_Guide.pdf` });

/** R2 object key for a /guides/<slug> path, or null when the slug is unknown. */
export const guideKeyForSlug = (slug) => {
  if (slug === 'statewide') return GUIDES.statewide.key;
  const m = /^ld-(\d{1,2})$/.exec(slug);
  const ld = m ? Number.parseInt(m[1], 10) : NaN;
  return LD_GUIDES.includes(ld) ? ldGuide(ld).key : null;
};

/** The one guide to send a voter: their LD guide when we know it, else the statewide guide. */
export const guidesFor = ({ ld } = {}) => {
  const ldNum = Number.parseInt(ld, 10);
  return LD_GUIDES.includes(ldNum) ? [ldGuide(ldNum)] : [GUIDES.statewide];
};

export const publicConfig = () => ({
  election: ELECTION,
  copy: COPY,
  guides: {
    statewide: { label: GUIDES.statewide.label, url: GUIDES.statewide.url },
    lds: LD_GUIDES.map((ld) => { const g = ldGuide(ld); return { ld: g.ld, label: g.label, url: g.url }; }),
  },
});
