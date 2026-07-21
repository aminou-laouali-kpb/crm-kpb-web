import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useInvoiceStats = (startDate, endDate, enabled = true) => {
  return useQuery({
    queryKey: ['invoice-stats', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_invoice_stats', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!startDate && !!endDate,
  });
};

export const useSalesRepPoints = () => {
  return useQuery({
    queryKey: ['sales-rep-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_rep_points')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};
