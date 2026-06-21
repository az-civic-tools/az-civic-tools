/**
 * Session deadline configuration for Arizona Legislature.
 *
 * Each session has deadlines by which bills must clear certain stages
 * or they are effectively dead. These are set by chamber rules each session.
 */

export const SESSION_DEADLINES = {
  130: {
    // 57th Legislature, 2nd Regular Session (2026)
    origin_committee: '2026-02-20',     // Last day for bills in origin chamber committees
    crossover_committee: '2026-03-27',  // Last day for crossover bills in opposite chamber committees
    conference_committee: '2026-04-17', // Last day for conference committees
    sine_die: '2026-06-13',             // Actual adjournment sine die (10:06 AM, June 13, 2026)
    // Governor's post-adjournment action window. AZ Const. Art. 5 §7 gives the
    // Governor 10 days (Sundays excepted) after the Legislature adjourns to sign
    // or veto. Bills she does not sign within that window are pocket-vetoed (dead).
    // From sine die (Sat Jun 13), the 10th day excepting Sundays is Jun 25.
    governor_deadline: '2026-06-25',
  },
};

/** Human-readable labels for dead_reason values */
export const DEAD_REASONS = {
  missed_origin_deadline: 'Missed committee deadline in chamber of origin',
  missed_crossover_deadline: 'Missed crossover committee deadline',
  missed_crossover_stall: 'Passed origin chamber but stalled in the crossover chamber',
  missed_conference_deadline: 'Missed conference committee deadline',
  defeated: 'Defeated in committee or on the floor',
  defeated_floor_vote: 'Failed floor vote with no subsequent pass',
  withdrawn: 'Withdrawn by sponsor',
  held: 'Held in committee',
  final_disposition: 'Marked dead by the legislature',
  died_on_adjournment: 'Died when the Legislature adjourned sine die without final passage',
  pocket_veto: 'Pocket veto — Governor took no action before the post-adjournment deadline',
};

/**
 * Get deadlines for a given azleg session ID.
 * @param {number} sessionId
 * @returns {object|null}
 */
export function getDeadlinesForSession(sessionId) {
  return SESSION_DEADLINES[sessionId] || null;
}
