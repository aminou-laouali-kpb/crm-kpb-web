import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SALES_REPS } from '@/constants/salesReps';

export const useSalesReps = () => {
  return useQuery({
    queryKey: ['sales-reps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_reps')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        // Fallback to defaults if table doesn't exist yet
        return DEFAULT_SALES_REPS;
      }
      return data?.length ? data : DEFAULT_SALES_REPS;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useSalesRepNames = () => {
  const { data: reps = DEFAULT_SALES_REPS } = useSalesReps();
  return reps.map((r) => r.name);
};
