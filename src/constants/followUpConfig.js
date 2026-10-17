/** Configurable follow-up thresholds in days (shared via app_settings.follow_up_days) */
export const DEFAULT_FOLLOW_UP_DAYS = [7, 14];

export const FOLLOW_UP_SETTINGS_KEY = 'follow_up_days';

/** Keeps positive integers, sorted ascending, without duplicates. */
export const normalizeFollowUpDays = (days) => {
  if (!Array.isArray(days)) return DEFAULT_FOLLOW_UP_DAYS;
  const clean = [...new Set(days.map((d) => parseInt(d, 10)).filter((d) => !isNaN(d) && d > 0))]
    .sort((a, b) => a - b);
  return clean.length ? clean : DEFAULT_FOLLOW_UP_DAYS;
};

/** Threshold after which an unpaid invoice automatically becomes « À relancer » (the lowest one). */
export const getPrimaryFollowUpThreshold = (followUpDays = DEFAULT_FOLLOW_UP_DAYS) =>
  normalizeFollowUpDays(followUpDays)[0];

/** Returns the most urgent follow-up threshold exceeded, or null */
export const getFollowUpLevel = (lastStatusChange, status, followUpDays = DEFAULT_FOLLOW_UP_DAYS) => {
  if (status === 'paid' || !lastStatusChange) return null;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastStatusChange).getTime()) / (1000 * 60 * 60 * 24)
  );
  const sorted = [...normalizeFollowUpDays(followUpDays)].sort((a, b) => b - a);
  for (const threshold of sorted) {
    if (daysSince >= threshold) return threshold;
  }
  return null;
};
