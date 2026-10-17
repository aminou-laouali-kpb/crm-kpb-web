import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** { user_id: nom affiché } pour afficher les auteurs et responsables. */
export const useProfilesMap = () => {
  const { data = {} } = useQuery({
    queryKey: ['profiles-map'],
    queryFn: async () => {
      const { data: rows, error } = await supabase.from('profiles').select('user_id, full_name, email');
      if (error) return {};
      return Object.fromEntries((rows || []).map((p) => [p.user_id, p.full_name || p.email || 'Utilisateur']));
    },
    staleTime: 5 * 60 * 1000,
  });
  return data;
};
