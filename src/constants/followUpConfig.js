/** Configurable follow-up thresholds in days */
export const DEFAULT_FOLLOW_UP_DAYS = [3, 7, 14];

export const FOLLOW_UP_STORAGE_KEY = 'kpb_follow_up_days';

export const getFollowUpDays = () => {
  try {
    const stored = localStorage.getItem(FOLLOW_UP_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_FOLLOW_UP_DAYS;
};

export const setFollowUpDays = (days) => {
  localStorage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify(days));
};

/** Returns the most urgent follow-up threshold exceeded, or null */
export const getFollowUpLevel = (lastStatusChange, status, followUpDays = getFollowUpDays()) => {
  if (status === 'paid' || !lastStatusChange) return null;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastStatusChange).getTime()) / (1000 * 60 * 60 * 24)
  );
  const sorted = [...followUpDays].sort((a, b) => b - a);
  for (const threshold of sorted) {
    if (daysSince >= threshold) return threshold;
  }
  return null;
};

export const isStaleInvoice = (lastStatusChange, status, primaryThreshold = 7) => {
  if (status === 'paid' || !lastStatusChange) return false;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastStatusChange).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSince >= primaryThreshold;
};
