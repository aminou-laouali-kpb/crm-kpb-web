import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FOLLOW_UP_DAYS,
  normalizeFollowUpDays,
  getPrimaryFollowUpThreshold,
  getFollowUpLevel,
} from '@/constants/followUpConfig';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

describe('followUpConfig', () => {
  it('normalise les seuils (tri, doublons, valeurs invalides)', () => {
    expect(normalizeFollowUpDays([14, '7', 7, -1, 'x'])).toEqual([7, 14]);
    expect(normalizeFollowUpDays([])).toEqual(DEFAULT_FOLLOW_UP_DAYS);
    expect(normalizeFollowUpDays(null)).toEqual(DEFAULT_FOLLOW_UP_DAYS);
  });

  it('utilise le plus petit seuil pour le passage automatique « À relancer »', () => {
    expect(getPrimaryFollowUpThreshold([14, 3, 7])).toBe(3);
  });

  it('renvoie le seuil le plus urgent dépassé', () => {
    expect(getFollowUpLevel(daysAgo(8), 'sent', [7, 14])).toBe(7);
    expect(getFollowUpLevel(daysAgo(15), 'sent', [7, 14])).toBe(14);
    expect(getFollowUpLevel(daysAgo(2), 'sent', [7, 14])).toBeNull();
    expect(getFollowUpLevel(daysAgo(30), 'paid', [7, 14])).toBeNull();
  });
});
