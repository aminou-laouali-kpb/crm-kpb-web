import { calendarMonthKey } from './reportPeriod';

const sumAmounts = (rows) => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

export const computeFinancialStats = (invoices, expenses, plannedIncome) => {
  const salesRevenue = sumAmounts(invoices);
  const otherIncome = sumAmounts(plannedIncome.filter((inc) => inc.status === 'received'));
  const totalRevenue = salesRevenue + otherIncome;
  const totalExpenses = sumAmounts(expenses);
  const paidExpenses = sumAmounts(expenses.filter((exp) => exp.status === 'paid'));
  const pendingIncome = sumAmounts(plannedIncome.filter((inc) => inc.status === 'pending'));
  const overdueIncome = sumAmounts(plannedIncome.filter((inc) => inc.status === 'overdue'));

  return {
    salesRevenue,
    otherIncome,
    totalRevenue,
    totalExpenses,
    paidExpenses,
    netBalance: totalRevenue - totalExpenses,
    pendingIncome,
    overdueIncome,
    salesCount: invoices.length,
    expensesCount: expenses.length,
  };
};

export const groupExpensesByCategory = (expenses) => {
  const categoryMap = {};
  expenses.forEach((exp) => {
    const categoryName = exp.expense_categories?.name || 'Non catégorisé';
    const categoryColor = exp.expense_categories?.color || '#6b7280';
    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = { name: categoryName, amount: 0, color: categoryColor };
    }
    categoryMap[categoryName].amount += Number(exp.amount || 0);
  });
  return Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
};

export const buildMonthlyAccounting = (invoices, expenses, plannedIncome, months) => {
  const rows = months.map((month) => {
    const sales = invoices.filter((inv) => calendarMonthKey(inv.last_status_change) === month.key);
    const monthExpenses = expenses.filter((exp) => calendarMonthKey(exp.expense_date) === month.key);
    const other = plannedIncome.filter(
      (inc) => inc.status === 'received' && calendarMonthKey(inc.due_date) === month.key,
    );
    const salesRevenue = sumAmounts(sales);
    const otherIncome = sumAmounts(other);
    const revenue = salesRevenue + otherIncome;
    const totalExpenses = sumAmounts(monthExpenses);
    return {
      key: month.key,
      label: month.label,
      salesRevenue,
      otherIncome,
      revenue,
      totalExpenses,
      net: revenue - totalExpenses,
      salesCount: sales.length,
      expensesCount: monthExpenses.length,
    };
  });

  const totals = rows.reduce((acc, row) => ({
    revenue: acc.revenue + row.revenue,
    totalExpenses: acc.totalExpenses + row.totalExpenses,
    net: acc.net + row.net,
    salesCount: acc.salesCount + row.salesCount,
    expensesCount: acc.expensesCount + row.expensesCount,
  }), { revenue: 0, totalExpenses: 0, net: 0, salesCount: 0, expensesCount: 0 });

  return { rows, totals };
};
