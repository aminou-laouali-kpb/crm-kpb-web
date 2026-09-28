import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toLocalDateString } from '@/utils/installments';

export const useInstallments = (status = 'pending') =>
  useQuery({
    queryKey: ['installments', status],
    queryFn: async () => {
      let q = supabase.from('payment_installments').select('*').order('due_date', { ascending: true });
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useDueInstallmentsCount = () =>
  useQuery({
    queryKey: ['installments', 'due-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payment_installments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('due_date', toLocalDateString(new Date()));
      if (error) return 0;
      return count || 0;
    },
    staleTime: 60_000,
  });

export const useInvalidateInstallments = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['installments'] });
};
