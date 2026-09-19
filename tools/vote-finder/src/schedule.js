/**
 * Schedule helpers shared by the email builder.
 * (public/app.js carries an equivalent copy for the browser; keep them in sync.)
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const parseDate = (mdy) => {
  const [m, d, y] = mdy.split('/').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const formatDate = (mdy) => {
  const dt = parseDate(mdy);
  return `${DAY_NAMES[dt.getUTCDay()]}, ${MONTH_NAMES[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
};

export const formatTime = (minutes) => {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
};

export const describeHours = (entry) => {
  if (entry === '24h') return 'Open 24 hours';
  if (Array.isArray(entry)) return `${formatTime(entry[0])} to ${formatTime(entry[1])}`;
  return 'Closed';
};

export const isOpenEntry = (entry) => entry === '24h' || Array.isArray(entry);

/** Resolve a site's hour codes for a mode ('vc' or 'db') into legend entries. */
export const hoursFor = (site, mode, legend) => {
  const codes = mode === 'vc' ? site.vc : (site.db || site.vc);
  if (!codes) return null;
  return codes.map((c) => legend[c]);
};
