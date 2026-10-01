import { describe, it, expect } from 'vitest';
import {
  calculateCommission,
  getNetAmount,
  getMonthlyPoints,
  calculateLeaderboardData,
  COMMISSION_CONFIG,
} from '../commissionCalculations';
import { GUIDE_ULTIME } from '@/constants/products';

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

  it('pays a flat guide commission instead of 10%', () => {
    const invoices = [
      {
        sales_representative: 'Josphin',
        status: 'paid',
        amount: 100000,
        payment_type: 'France',
        product_code: null,
        last_status_change: '2026-06-15T00:00:00Z',
      },
      {
        sales_representative: 'Josphin',
        status: 'paid',
        amount: GUIDE_ULTIME.price,
        payment_type: 'Maketou',
        product_code: GUIDE_ULTIME.productCode,
        last_status_change: '2026-06-16T00:00:00Z',
      },
      {
        sales_representative: 'Josphin',
        status: 'paid',
        amount: GUIDE_ULTIME.price,
        payment_type: 'France',
        product_code: GUIDE_ULTIME.productCode,
        last_status_change: '2026-06-17T00:00:00Z',
      },
      {
        sales_representative: 'Richard',
        status: 'paid',
        amount: 200000,
        payment_type: 'France',
        last_status_change: '2026-06-18T00:00:00Z',
      },
    ];
    const periodDates = {
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30T23:59:59'),
    };
    const data = calculateLeaderboardData(invoices, periodDates, [], ['Richard', 'Josphin']);
    const rep = data.find((row) => row.name === 'Josphin');

    expect(rep.guideSalesCount).toBe(2);
    expect(rep.netSales).toBe(100000 + GUIDE_ULTIME.price * 0.95 + GUIDE_ULTIME.price);
    expect(rep.commission.baseCommission).toBe(10000);
    expect(rep.commission.guideCommission).toBe(GUIDE_ULTIME.commission * 2);
    expect(rep.commission.totalCommission).toBe(12000);
  });

  it('counts guide revenue toward the 850k tier without adding it to the 10% base', () => {
    const standardAmount = 841000;
    const invoices = [
      {
        sales_representative: 'Nadia',
        status: 'paid',
        amount: standardAmount,
        payment_type: 'France',
        last_status_change: '2026-06-10T00:00:00Z',
      },
      {
        sales_representative: 'Nadia',
        status: 'paid',
        amount: GUIDE_ULTIME.price,
        payment_type: 'France',
        product_code: GUIDE_ULTIME.productCode,
        last_status_change: '2026-06-11T00:00:00Z',
      },
      {
        sales_representative: 'Josphin',
        status: 'paid',
        amount: 900000,
        payment_type: 'France',
        last_status_change: '2026-06-12T00:00:00Z',
      },
    ];
    const periodDates = {
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30T23:59:59'),
    };
    const data = calculateLeaderboardData(invoices, periodDates, [], ['Josphin', 'Nadia']);
    const rep = data.find((row) => row.name === 'Nadia');

    expect(rep.netSales).toBe(850000);
    expect(rep.commission.baseCommission).toBe(84100);
    expect(rep.commission.guideCommission).toBe(GUIDE_ULTIME.commission);
    expect(rep.commission.tierBonus).toBe(COMMISSION_CONFIG.TIER_BONUS);
    expect(rep.commission.totalCommission).toBe(84100 + GUIDE_ULTIME.commission + COMMISSION_CONFIG.TIER_BONUS);
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
