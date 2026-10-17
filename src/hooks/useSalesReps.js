import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SALES_REPS } from '@/constants/salesReps';

export const useSalesReps = ({ includeInactive = false } = {}) => {
  return useQuery({
    queryKey: ['sales-reps', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      let query = supabase.from('sales_reps').select('*').order('name');
      if (!includeInactive) query = query.eq('active', true);
      const { data, error } = await query;

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
