import { describe, it, expect } from 'vitest';
import {
  buildPeriodRange,
  defaultClosedMonthsRange,
  periodFileSlug,
  summarizePeriod,
  monthlySummaries,
  paymentModeStats,
  serviceRanking,
  salesRepPerformance,
  calendarMonthKey,
} from '../reportPeriod';
import { buildMonthlyAccounting, computeFinancialStats } from '../accountingStats';
import { buildCommercialWorkbook } from '../commercialReportExport';

const inv = (overrides) => ({
  amount: 100000,
  status: 'paid',
  sales_representative: 'Josphin',
  service_description: 'Orientation',
  payment_type: 'Wave',
  created_at: '2026-01-10T10:00:00.000Z',
  last_status_change: '2026-01-12T10:00:00.000Z',
  ...overrides,
});

describe('buildPeriodRange', () => {
  it('couvre janvier à septembre 2026 en neuf mois', () => {
    const range = buildPeriodRange(0, 2026, 8, 2026);
    expect(range.valid).toBe(true);
    expect(range.isRange).toBe(true);
    expect(range.months).toHaveLength(9);
    expect(range.label).toBe('Janvier 2026 – Septembre 2026');
    expect(range.months[0].key).toBe('2026-01');
    expect(range.months[8].key).toBe('2026-09');
    expect(range.startDate).toEqual(new Date(2026, 0, 1));
    expect(range.endDate.getMonth()).toBe(8);
    expect(range.endDate.getDate()).toBe(30);
  });

  it('refuse une fin antérieure au début', () => {
    const range = buildPeriodRange(8, 2026, 0, 2026);
    expect(range.valid).toBe(false);
  });

  it('propose janvier–septembre quand on est en octobre 2026', () => {
    const preset = defaultClosedMonthsRange(new Date(2026, 9, 3));
    const range = buildPeriodRange(preset.startMonth, preset.startYear, preset.endMonth, preset.endYear);
    expect(range.label).toBe('Janvier 2026 – Septembre 2026');
  });

  it('en janvier, prend toute l’année précédente', () => {
    const preset = defaultClosedMonthsRange(new Date(2026, 0, 15));
    expect(preset).toEqual({ startMonth: 0, startYear: 2025, endMonth: 11, endYear: 2025 });
  });
});

describe('résumé commercial', () => {
  const invoices = [
    inv({ amount: 200000, created_at: '2026-01-05T08:00:00', last_status_change: '2026-01-20T08:00:00' }),
    inv({
      amount: 50000,
      status: 'sent',
      created_at: '2026-02-02T08:00:00',
      last_status_change: '2026-02-03T08:00:00',
      sales_representative: 'Richard',
    }),
    inv({
      amount: 80000,
      created_at: '2025-12-20T08:00:00',
      last_status_change: '2026-03-04T08:00:00',
      payment_type: 'Maketou, Wave',
      sales_representative: 'Nadia',
      service_description: 'Guide ultime',
    }),
  ];

  const range = buildPeriodRange(0, 2026, 8, 2026);

  it('sépare les factures créées et les encaissements de la période', () => {
    const stats = summarizePeriod(invoices, range.startDate, range.endDate);
    expect(stats.totalInvoices).toBe(2);
    expect(stats.totalAmount).toBe(250000);
    expect(stats.paidInvoices).toBe(2);
    expect(stats.paidAmount).toBe(280000);
    expect(stats.conversionRate).toBe(100);
  });

  it('détaille chaque mois, y compris les mois vides', () => {
    const months = monthlySummaries(invoices, range.months);
    expect(months).toHaveLength(9);
    expect(months[0].paidAmount).toBe(200000);
    expect(months[1].totalInvoices).toBe(1);
    expect(months[1].paidAmount).toBe(0);
    expect(months[2].paidAmount).toBe(80000);
    expect(months[3].totalInvoices).toBe(0);
  });

  it('répartit un paiement mixte entre les modes', () => {
    const { stats, totalPaid } = paymentModeStats(invoices, range.startDate, range.endDate);
    expect(totalPaid).toBe(280000);
    const wave = stats.find((mode) => mode.name === 'Wave');
    const maketou = stats.find((mode) => mode.name === 'Maketou');
    expect(wave.amount).toBe(200000 + 40000);
    expect(maketou.amount).toBe(40000);
  });

  it('classe les services et garde Donald dans les commerciaux', () => {
    const services = serviceRanking(invoices, range.startDate, range.endDate);
    expect(services[0].name).toBe('Orientation');
    expect(services.find((s) => s.name === 'Guide ultime').paidAmount).toBe(80000);

    const reps = salesRepPerformance(invoices, range.startDate, range.endDate);
    expect(reps.map((rep) => rep.name)).toEqual(['Josphin', 'Nadia', 'Donald', 'Richard']);
    expect(reps.find((rep) => rep.name === 'Nadia').paidAmount).toBe(80000);
    expect(reps.find((rep) => rep.name === 'Donald').totalInvoices).toBe(0);
  });
});

describe('comptabilité sur la période', () => {
  it('groupe revenus et dépenses par mois calendaire', () => {
    const range = buildPeriodRange(0, 2026, 2, 2026);
    const { rows, totals } = buildMonthlyAccounting(
      [
        { amount: 100000, last_status_change: '2026-01-18T12:00:00.000Z' },
        { amount: 40000, last_status_change: '2026-03-02T12:00:00.000Z' },
      ],
      [
        { amount: 150000, expense_date: '2026-01-31' },
        { amount: 30000, expense_date: '2026-02-15' },
      ],
      [{ amount: 5000, status: 'received', due_date: '2026-02-10' }],
      range.months,
    );

    expect(rows.map((row) => row.key)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(rows[0].revenue).toBe(100000);
    expect(rows[0].totalExpenses).toBe(150000);
    expect(rows[0].net).toBe(-50000);
    expect(rows[1].revenue).toBe(5000);
    expect(rows[1].totalExpenses).toBe(30000);
    expect(rows[2].salesCount).toBe(1);
    expect(totals.revenue).toBe(145000);
    expect(totals.totalExpenses).toBe(180000);
    expect(totals.net).toBe(-35000);
  });

  it('ne décale pas une date de dépense sans heure', () => {
    expect(calendarMonthKey('2026-09-30')).toBe('2026-09');
  });

  it('calcule le solde net comme en page comptabilité', () => {
    const stats = computeFinancialStats(
      [{ amount: 100 }],
      [{ amount: 40, status: 'paid' }],
      [{ amount: 10, status: 'received' }, { amount: 7, status: 'pending' }],
    );
    expect(stats.totalRevenue).toBe(110);
    expect(stats.netBalance).toBe(70);
    expect(stats.pendingIncome).toBe(7);
  });
});

describe('classeur du rapport', () => {
  it('met toute la période dans un seul classeur', async () => {
    const range = buildPeriodRange(0, 2026, 8, 2026);
    const overall = summarizePeriod([], range.startDate, range.endDate);
    const wb = buildCommercialWorkbook({
      periodLabel: range.label,
      overall,
      months: monthlySummaries([], range.months),
      payments: [],
      services: [],
      salesReps: salesRepPerformance([], range.startDate, range.endDate),
    });

    expect(wb.worksheets.map((sheet) => sheet.name)).toEqual([
      'Résumé', 'Mensuel', 'Paiements', 'Services', 'Commerciaux',
    ]);
    expect(wb.getWorksheet('Mensuel').rowCount).toBe(11);
    expect(wb.getWorksheet('Résumé').getRow(1).getCell(1).value).toContain('Janvier 2026');
    expect(periodFileSlug(range.label)).toBe('Janvier_2026_Septembre_2026');

    const buffer = await wb.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
