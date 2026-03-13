/**
 * Shared bill utility functions for Cactus Watch
 * Used by central scraper, personal tracker, and frontend.
 */

import { BILL_TYPES, AZLEG_WEB, BILL_STATUSES, COMMITTEE_ACTIONS } from './constants.js';

/**
 * Parse a bill number string into its components.
 * @param {string} number - e.g. "HB2839", "SCR1001"
 * @returns {{ prefix: string, num: number, chamber: string, type: string, label: string } | null}
 */
export function parseBillNumber(number) {
  if (!number) return null;
  const clean = number.trim().toUpperCase();
  const match = clean.match(/^(HB|SB|HCR|SCR|HM|SM|HJR|SJR|HR|SR)(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const meta = BILL_TYPES[prefix];
  if (!meta) return null;

  return {
    prefix,
    num: parseInt(match[2], 10),
    chamber: meta.chamber,
    type: meta.type,
    label: meta.label,
    full: clean,
  };
}

/**
 * Format a bill number for display (normalized uppercase).
 * @param {string} number
 * @returns {string}
 */
export function formatBillNumber(number) {
  const parsed = parseBillNumber(number);
  return parsed ? parsed.full : String(number || '').toUpperCase();
}

/**
 * Build the azleg.gov Bill Status URL for a bill.
 * @param {number} billId - The azleg BillId
 * @param {number} sessionId - The session ID
 * @returns {string}
 */
export function azlegBillUrl(billId, sessionId) {
  return `https://apps.azleg.gov/BillStatus/BillOverview/${billId}?SessionId=${sessionId}`;
}

/**
 * Build the azleg.gov bill text URL.
 * @param {number} legislature - e.g. 57
 * @param {string} session - e.g. "2R"
 * @param {string} billNumber - e.g. "HB2839"
 * @returns {string}
 */
export function azlegBillTextUrl(legislature, session, billNumber) {
  const sessionMap = { '1R': '1rs', '2R': '2rs', '1S': '1ss', '2S': '2ss', '3S': '3ss' };
  const sessionPath = sessionMap[session] || session.toLowerCase();
  const num = billNumber.toLowerCase();
  return `${AZLEG_WEB}/legtext/${legislature}leg/${sessionPath}/bills/${num}p.htm`;
}

/**
 * Derive bill status from azleg API response fields.
 * @param {object} bill - Raw azleg API bill object
 * @returns {string} One of BILL_STATUSES keys
 */
export function deriveBillStatus(bill) {
  if (!bill) return 'introduced';

  const disposition = (bill.FinalDisposition || '').toLowerCase();

  if (disposition === 'signed' || bill.GovernorAction === 'Signed') return 'signed';
  if (disposition === 'vetoed' || bill.GovernorAction === 'Vetoed') return 'vetoed';
  if (disposition.includes('held in committee')) return 'held';
  if (disposition !== 'none' && disposition !== '') return 'dead';

  if (bill.GovernorAction && bill.GovernorAction !== 'None') return 'to_governor';

  const hasHouseFloor = bill.FloorHeaders?.some(f => f.LegislativeBody === 'H' && f.CommitteeShortName === 'THIRD');
  const hasSenateFloor = bill.FloorHeaders?.some(f => f.LegislativeBody === 'S' && f.CommitteeShortName === 'THIRD');

  if (hasHouseFloor && hasSenateFloor) return 'passed_both';

  const parsed = parseBillNumber(bill.Number);
  if (parsed) {
    if (parsed.chamber === 'H' && hasHouseFloor && hasSenateFloor) return 'passed_both';
    if (parsed.chamber === 'H' && hasHouseFloor) return 'passed_house';
    if (parsed.chamber === 'S' && hasSenateFloor) return 'passed_senate';
  }

  const hasFloorAction = (bill.FloorHeaders || []).length > 0;
  if (hasFloorAction) return 'on_floor';

  const committeeActions = [
    ...(bill.BillStatusAction || []),
  ];
  const hasPassedCommittee = committeeActions.some(a =>
    ['DP', 'DPA', 'DPS', 'DPAS', 'PFC'].includes(a.Action)
  );
  if (hasPassedCommittee) return 'passed_committee';

  const hasCommittee = (bill.StandingCommittee || []).length > 0 ||
    (bill.HouseCommitteeActions && bill.HouseCommitteeActions !== '') ||
    (bill.SenateCommitteeActions && bill.SenateCommitteeActions !== '');
  if (hasCommittee) return 'in_committee';

  return 'introduced';
}

/**
 * Get the human-readable label for a bill status key.
 * @param {string} status
 * @returns {string}
 */
export function statusLabel(status) {
  return BILL_STATUSES[status] || status;
}

/**
 * Get the human-readable label for a committee action code.
 * @param {string} action
 * @returns {string}
 */
export function committeeActionLabel(action) {
  return COMMITTEE_ACTIONS[action] || action;
}

/**
 * Format an ISO date string to a readable format.
 * @param {string} isoDate - e.g. "2026-01-21T12:08:00"
 * @returns {string} e.g. "January 21, 2026"
 */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Format an ISO date to short format.
 * @param {string} isoDate
 * @returns {string} e.g. "1/21/26"
 */
export function formatDateShort(isoDate) {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
  } catch {
    return '';
  }
}
