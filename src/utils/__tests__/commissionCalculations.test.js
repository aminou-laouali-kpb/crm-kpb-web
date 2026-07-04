import { describe, it, expect } from 'vitest';
import {
  calculateCommission,
  getNetAmount,
  getMonthlyPoints,
  calculateLeaderboardData,
  COMMISSION_CONFIG,
} from '../commissionCalculations';

describe('commissionCalculations', () => {
  it('deducts 5% Maketou fee', () => {
    expect(getNetAmount(100000, 'Maketou')).toBe(95000);
    expect(getNetAmount(100000, 'France')).toBe(100000);
  });

  it('calculates base commission at 10%', () => {
    const result = calculateCommission(500000, false);
    expect(result.baseCommission).toBe(50000);
    expect(result.totalCommission).toBe(50000);
  });

  it('adds tier bonus at 850k threshold', () => {
    const result = calculateCommission(850000, false);
    expect(result.tierBonus).toBe(COMMISSION_CONFIG.TIER_BONUS);
    expect(result.totalCommission).toBe(85000 + COMMISSION_CONFIG.TIER_BONUS);
  });

  it('adds top seller bonus', () => {
    const result = calculateCommission(100000, true);
    expect(result.topSellerBonus).toBe(COMMISSION_CONFIG.TOP_SELLER_BONUS);
  });

  it('assigns points by position', () => {
    expect(getMonthlyPoints(0)).toBe(10);
    expect(getMonthlyPoints(1)).toBe(5);
    expect(getMonthlyPoints(3)).toBe(0);
  });

  it('calculates leaderboard from paid invoices', () => {
    const invoices = [
      {
        sales_representative: 'Josphin',
        status: 'paid',
        amount: 500000,
        payment_type: 'France',
        last_status_change: '2026-06-15T00:00:00Z',
      },
      {
        sales_representative: 'Nadia',
        status: 'paid',
        amount: 900000,
        payment_type: 'Maketou',
        last_status_change: '2026-06-20T00:00:00Z',
      },
    ];
    const periodDates = {
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30T23:59:59'),
    };
    const data = calculateLeaderboardData(invoices, periodDates);
    expect(data[0].name).toBe('Nadia');
    expect(data[0].netSales).toBe(855000);
  });
});
