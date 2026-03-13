/**
 * Shared validation utilities for Cactus Watch
 * Used by central scraper, personal tracker, and frontend.
 */

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Escaped string safe for innerHTML
 */
export function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validate that a URL uses http or https protocol.
 * @param {string} url - URL to validate
 * @returns {boolean} True if safe
 */
export function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, 'https://placeholder.invalid');
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validate an email address (basic format check).
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Sanitize a string for use as a URL slug.
 * @param {string} str
 * @returns {string}
 */
export function toSlug(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate and clamp a pagination parameter.
 * @param {*} value - Raw value (from query string)
 * @param {number} defaultVal - Default if invalid
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @returns {number}
 */
export function clampInt(value, defaultVal, min, max) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return defaultVal;
  return Math.max(min, Math.min(max, n));
}

/**
 * Validate that a string looks like a bill number (e.g. HB2001, SB1234, HCR2001).
 * @param {string} num
 * @returns {boolean}
 */
export function isValidBillNumber(num) {
  if (!num || typeof num !== 'string') return false;
  return /^(H|S)(B|CR|M|JR|R)\d{1,4}$/i.test(num.trim());
}
