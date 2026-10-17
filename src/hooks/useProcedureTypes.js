import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Types de procédure (table procedure_types), triés pour les listes déroulantes. */
export const useProcedureTypes = () =>
  useQuery({
    queryKey: ['procedure-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procedure_types')
        .select('code, label, active, sort_order')
        .order('sort_order');
      if (error) return [];
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

export const getProcedureLabel = (types, code) =>
  types.find((t) => t.code === code)?.label || code || '';
