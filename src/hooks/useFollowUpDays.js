import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_FOLLOW_UP_DAYS,
  FOLLOW_UP_SETTINGS_KEY,
  normalizeFollowUpDays,
} from '@/constants/followUpConfig';

const QUERY_KEY = ['app-settings', FOLLOW_UP_SETTINGS_KEY];

export const useFollowUpDays = () => {
  const { data = DEFAULT_FOLLOW_UP_DAYS, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', FOLLOW_UP_SETTINGS_KEY)
        .maybeSingle();
      if (error || !row) return DEFAULT_FOLLOW_UP_DAYS;
      return normalizeFollowUpDays(row.value);
    },
    staleTime: 5 * 60 * 1000,
  });
  return { followUpDays: data, loading: isLoading };
};

export const useSaveFollowUpDays = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (days) => {
      const value = normalizeFollowUpDays(days);
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: FOLLOW_UP_SETTINGS_KEY, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      return value;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
