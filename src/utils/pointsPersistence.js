import { supabase } from '@/integrations/supabase/client';
import { calculateLeaderboardData } from './commissionCalculations';

/**
 * Persist monthly points for all sales reps (idempotent upsert).
 * Called from Dashboard when viewing a completed month.
 */
export const persistMonthlyPoints = async (month, year, invoices) => {
  const monthIndex = parseInt(month) - 1;
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const leaderboardData = calculateLeaderboardData(invoices, { startDate, endDate });

  const upserts = leaderboardData
    .filter((rep) => rep.netSales > 0)
    .map((rep) => ({
      sales_rep: rep.name,
      month: parseInt(month),
      year: parseInt(year),
      points: rep.monthlyPoints,
      position: rep.position,
      total_sales: rep.grossSales,
      net_sales: rep.netSales,
      total_commission: rep.commission?.totalCommission || 0,
    }));

  if (upserts.length === 0) return { count: 0 };

  const { error } = await supabase
    .from('sales_rep_points')
    .upsert(upserts, { onConflict: 'sales_rep,month,year' });

  if (error) throw error;
  return { count: upserts.length };
};
