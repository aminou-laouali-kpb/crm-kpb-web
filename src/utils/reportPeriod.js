/**
 * Périodes de rapport (mois calendaires, index 0 = janvier).
 * Les bornes sont des Date locales, comme le rapport mensuel existant.
 */

export const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/** Commerciaux historiques : Donald reste visible sur les périodes passées. */
export const REPORT_SALES_REPS = ['Josphin', 'Nadia', 'Donald', 'Richard'];

const STATUS_LABELS = {
  generated: 'Générées',
  sent: 'Envoyées',
  awaiting_payment: 'En attente',
  to_follow_up: 'À relancer',
  paid: 'Payées',
};

export const monthBounds = (monthIndex, year) => {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

/**
 * Janvier → mois précédent. En janvier, l'année civile précédente.
 * Le 3 octobre 2026, cela donne janvier–septembre 2026.
 */
export const defaultClosedMonthsRange = (now = new Date()) => {
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month === 0) {
    return { startMonth: 0, startYear: year - 1, endMonth: 11, endYear: year - 1 };
  }
  return { startMonth: 0, startYear: year, endMonth: month - 1, endYear: year };
};

export const buildPeriodRange = (startMonth, startYear, endMonth, endYear) => {
  const startKey = startYear * 12 + startMonth;
  const endKey = endYear * 12 + endMonth;
  if (!Number.isInteger(startKey) || !Number.isInteger(endKey)) {
    return { valid: false, error: 'Période invalide.' };
  }
  if (endKey < startKey) {
    return { valid: false, error: 'La fin de période est antérieure au début.' };
  }

  const months = [];
  for (let key = startKey; key <= endKey; key += 1) {
    const year = Math.floor(key / 12);
    const month = key % 12;
    months.push({
      month,
      year,
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${MONTH_LABELS[month]} ${year}`,
      ...monthBounds(month, year),
    });
  }

  const label = months.length === 1
    ? months[0].label
    : `${months[0].label} – ${months[months.length - 1].label}`;

  return {
    valid: true,
    startDate: months[0].startDate,
    endDate: months[months.length - 1].endDate,
    label,
    months,
    isRange: months.length > 1,
  };
};

export const periodFileSlug = (label) => String(label || 'rapport')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

export const inRange = (dateValue, startDate, endDate) => {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startDate && d <= endDate;
};

const sumAmounts = (rows) => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

export const summarizePeriod = (invoices, startDate, endDate) => {
  const created = invoices.filter((inv) => inRange(inv.created_at, startDate, endDate));
  const paid = invoices.filter(
    (inv) => inv.status === 'paid' && inRange(inv.last_status_change, startDate, endDate),
  );
  const totalAmount = sumAmounts(created);
  const paidAmount = sumAmounts(paid);
  return {
    totalInvoices: created.length,
    totalAmount,
    paidInvoices: paid.length,
    paidAmount,
    pendingAmount: totalAmount - paidAmount,
    conversionRate: created.length > 0 ? (paid.length / created.length) * 100 : 0,
  };
};

export const monthlySummaries = (invoices, months) => months.map((month) => ({
  label: month.label,
  key: month.key,
  ...summarizePeriod(invoices, month.startDate, month.endDate),
}));

export const paymentModeStats = (invoices, startDate, endDate) => {
  const paidInvoices = invoices.filter(
    (inv) => inv.status === 'paid' && inRange(inv.last_status_change, startDate, endDate),
  );
  const paymentMap = {};
  let totalPaid = 0;

  paidInvoices.forEach((inv) => {
    const amount = Number(inv.amount || 0);
    totalPaid += amount;
    const types = (inv.payment_type || 'Non spécifié').split(',').map((t) => t.trim()).filter(Boolean);
    const modes = types.length > 0 ? types : ['Non spécifié'];
    const splitAmount = amount / modes.length;
    modes.forEach((type) => {
      if (!paymentMap[type]) paymentMap[type] = { count: 0, amount: 0 };
      paymentMap[type].count += 1;
      paymentMap[type].amount += splitAmount;
    });
  });

  const stats = Object.entries(paymentMap)
    .map(([name, data]) => ({
      name,
      ...data,
      percentage: totalPaid > 0 ? (data.amount / totalPaid) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { stats, totalPaid, totalCount: paidInvoices.length };
};

export const serviceRanking = (invoices, startDate, endDate) => {
  const serviceMap = {};

  invoices.forEach((inv) => {
    const service = inv.service_description || 'Non spécifié';
    if (!serviceMap[service]) {
      serviceMap[service] = { name: service, totalAmount: 0, paidAmount: 0, count: 0, paidCount: 0 };
    }
    if (inRange(inv.created_at, startDate, endDate)) {
      serviceMap[service].totalAmount += Number(inv.amount || 0);
      serviceMap[service].count += 1;
    }
    if (inv.status === 'paid' && inRange(inv.last_status_change, startDate, endDate)) {
      serviceMap[service].paidAmount += Number(inv.amount || 0);
      serviceMap[service].paidCount += 1;
    }
  });

  return Object.values(serviceMap)
    .filter((service) => service.count > 0 || service.paidCount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);
};

export const salesRepPerformance = (invoices, startDate, endDate, baseReps = REPORT_SALES_REPS) => {
  const names = [...baseReps];
  invoices.forEach((inv) => {
    if (inv.sales_representative && !names.includes(inv.sales_representative)) {
      names.push(inv.sales_representative);
    }
  });

  return names.map((rep) => {
    const created = invoices.filter(
      (inv) => inv.sales_representative === rep && inRange(inv.created_at, startDate, endDate),
    );
    const paid = invoices.filter(
      (inv) => inv.sales_representative === rep
        && inv.status === 'paid'
        && inRange(inv.last_status_change, startDate, endDate),
    );
    const totalAmount = sumAmounts(created);
    const paidAmount = sumAmounts(paid);
    return {
      name: rep,
      totalInvoices: created.length,
      totalAmount,
      paidInvoices: paid.length,
      paidAmount,
      pendingInvoices: created.length - paid.length,
      pendingAmount: totalAmount - paidAmount,
      conversionRate: created.length > 0 ? (paid.length / created.length) * 100 : 0,
    };
  });
};

export const statusBreakdown = (invoices) => {
  const statusMap = Object.fromEntries(
    Object.entries(STATUS_LABELS).map(([key, name]) => [key, { name, count: 0, amount: 0 }]),
  );
  invoices.forEach((inv) => {
    if (statusMap[inv.status]) {
      statusMap[inv.status].count += 1;
      statusMap[inv.status].amount += Number(inv.amount || 0);
    }
  });
  return Object.values(statusMap).filter((status) => status.count > 0);
};

/** Clé YYYY-MM. Les dates calendaires (sans heure) ne passent pas par le fuseau. */
export const calendarMonthKey = (value) => {
  if (value == null || value === '') return null;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
