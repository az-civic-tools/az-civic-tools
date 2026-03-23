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
    sine_die: '2026-04-25',            // Adjournment sine die (target)
  },
};

/** Human-readable labels for dead_reason values */
export const DEAD_REASONS = {
  missed_origin_deadline: 'Missed committee deadline in chamber of origin',
  missed_crossover_deadline: 'Missed crossover committee deadline',
  missed_conference_deadline: 'Missed conference committee deadline',
  defeated: 'Defeated in committee or on the floor',
  withdrawn: 'Withdrawn by sponsor',
  held: 'Held in committee',
  final_disposition: 'Marked dead by the legislature',
};

/**
 * Get deadlines for a given azleg session ID.
 * @param {number} sessionId
 * @returns {object|null}
 */
export function getDeadlinesForSession(sessionId) {
  return SESSION_DEADLINES[sessionId] || null;
}
