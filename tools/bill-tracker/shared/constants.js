/**
 * Shared constants for Cactus Watch — Arizona Bill Tracker
 * Used by central scraper, personal tracker, and frontend.
 */

/** Arizona Legislature API base URL */
export const AZLEG_API = 'https://apps.azleg.gov/api';

/** Arizona Legislature website base URL */
export const AZLEG_WEB = 'https://www.azleg.gov';

/** Rate limit between azleg.gov API requests (ms) */
export const SCRAPE_RATE_LIMIT_MS = 200;

/** Consecutive misses before stopping enumeration for a bill prefix */
export const SCRAPE_MISS_THRESHOLD = 10;

/** Legislative sessions — most recent first */
export const SESSIONS = [
  { id: 130, legislature: 57, session: '2R', name: '57th Legislature, 2nd Regular Session', year: 2026 },
  { id: 129, legislature: 57, session: '1R', name: '57th Legislature, 1st Regular Session', year: 2025 },
  { id: 128, legislature: 56, session: '2R', name: '56th Legislature, 2nd Regular Session', year: 2024 },
  { id: 127, legislature: 56, session: '1R', name: '56th Legislature, 1st Regular Session', year: 2023 },
];

/** Current session — used as default for scraping and browsing */
export const CURRENT_SESSION = SESSIONS[0];

/** Legislative chambers */
export const CHAMBERS = {
  H: 'House',
  S: 'Senate',
};

/** Bill type prefixes and their metadata */
export const BILL_TYPES = {
  HB: { chamber: 'H', type: 'bill', label: 'House Bill' },
  SB: { chamber: 'S', type: 'bill', label: 'Senate Bill' },
  HCR: { chamber: 'H', type: 'concurrent_resolution', label: 'House Concurrent Resolution' },
  SCR: { chamber: 'S', type: 'concurrent_resolution', label: 'Senate Concurrent Resolution' },
  HM: { chamber: 'H', type: 'memorial', label: 'House Memorial' },
  SM: { chamber: 'S', type: 'memorial', label: 'Senate Memorial' },
  HJR: { chamber: 'H', type: 'joint_resolution', label: 'House Joint Resolution' },
  SJR: { chamber: 'S', type: 'joint_resolution', label: 'Senate Joint Resolution' },
  HR: { chamber: 'H', type: 'resolution', label: 'House Resolution' },
  SR: { chamber: 'S', type: 'resolution', label: 'Senate Resolution' },
};

/** Party codes */
export const PARTIES = {
  R: 'Republican',
  D: 'Democrat',
  I: 'Independent',
};

/** Bill status values (derived from azleg FinalDisposition + committee actions) */
export const BILL_STATUSES = {
  introduced: 'Introduced',
  in_committee: 'In Committee',
  passed_committee: 'Passed Committee',
  on_floor: 'On Floor',
  passed_house: 'Passed House',
  passed_senate: 'Passed Senate',
  passed_both: 'Passed Both Chambers',
  to_governor: 'Sent to Governor',
  signed: 'Signed',
  vetoed: 'Vetoed',
  dead: 'Dead',
  held: 'Held in Committee',
};

/** Committee action codes from azleg API */
export const COMMITTEE_ACTIONS = {
  DP: 'Do Pass',
  DPA: 'Do Pass Amended',
  DPS: 'Do Pass as Substituted',
  DPAS: 'Do Pass Amended as Substituted',
  PFC: 'Placed for Consent',
  W: 'Withdrawn',
  H: 'Held',
  PASSED: 'Passed',
  FAILED: 'Failed',
  RP: 'Retained on Calendar',
};

/** Vote values */
export const VOTE_VALUES = {
  Y: 'Yea',
  N: 'Nay',
  NV: 'Not Voting',
  EX: 'Excused',
  PR: 'Present',
};

/** Photo URL template for legislators on azleg.gov */
export const LEGISLATOR_PHOTO_URL = (chamber, shortName) =>
  `https://www.azleg.gov/alisImages/MemberPhotos/57leg/${chamber === 'H' ? 'House' : 'Senate'}/${shortName}.jpg`;
