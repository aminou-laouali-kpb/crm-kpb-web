import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAccountingData = (startDate, endDate, enabled = true) => {
  const startIso = startDate?.toISOString();
  const endIso = endDate?.toISOString();
  const startDateStr = startDate?.toISOString().split('T')[0];
  const endDateStr = endDate?.toISOString().split('T')[0];

  const invoicesQuery = useQuery({
    queryKey: ['accounting-invoices', startIso, endIso],
    queryFn: async () => {
      // Revenue based on payment date (last_status_change), not creation date
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid')
        .gte('last_status_change', startIso)
        .lte('last_status_change', endIso);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!startIso && !!endIso,
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses', startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_categories(name, color, icon)')
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!startDateStr && !!endDateStr,
  });

  const plannedIncomeQuery = useQuery({
    queryKey: ['planned-income', startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planned_income')
        .select('*')
        .gte('due_date', startDateStr)
        .lte('due_date', endDateStr);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!startDateStr && !!endDateStr,
  });

  return {
    invoices: invoicesQuery.data || [],
    expenses: expensesQuery.data || [],
    plannedIncome: plannedIncomeQuery.data || [],
    isLoading:
      invoicesQuery.isLoading ||
      expensesQuery.isLoading ||
      plannedIncomeQuery.isLoading,
    refetch: () => {
      invoicesQuery.refetch();
      expensesQuery.refetch();
      plannedIncomeQuery.refetch();
    },
  };
};
