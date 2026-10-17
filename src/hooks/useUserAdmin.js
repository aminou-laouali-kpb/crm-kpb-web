import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ACCESS_QUERY_KEY } from '@/hooks/useAccess';

const USERS_QUERY_KEY = ['admin-users'];

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'agent', label: 'Agent dossiers' },
  { value: 'contractuel', label: 'Contractuel (dossiers)' },
];

export const getRoleLabel = (role) =>
  ROLE_OPTIONS.find((r) => r.value === role)?.label || (role === 'sales_rep' ? 'Commercial (ancien)' : role);

export const useAdminUsers = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: USERS_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      return data || [];
    },
  });

const invokeAdminUsers = async (body) => {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // Message métier renvoyé par la fonction (400/403)
    let message = error.message;
    try {
      const payload = await error.context?.json?.();
      if (payload?.error) message = payload.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

const useInvalidateUsers = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ACCESS_QUERY_KEY });
  };
};

export const useCreateUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload) => invokeAdminUsers({ action: 'create_user', ...payload }),
    onSuccess: invalidate,
  });
};

export const useUpdateUserAccess = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ userId, roles, fullName, salesRepId, procedureScope, isActive }) => {
      const { error } = await supabase.rpc('admin_update_user_access', {
        p_user_id: userId,
        p_roles: roles,
        p_full_name: fullName || null,
        p_sales_rep_id: salesRepId || null,
        p_procedure_scope: procedureScope?.length ? procedureScope : null,
        p_is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
};

export const useSetUserActive = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ userId, isActive }) =>
      invokeAdminUsers({ action: 'set_active', user_id: userId, is_active: isActive }),
    onSuccess: invalidate,
  });
};

export const useResetUserPassword = () =>
  useMutation({
    mutationFn: ({ userId, password }) =>
      invokeAdminUsers({ action: 'reset_password', user_id: userId, password }),
  });

/** Mot de passe provisoire lisible, à transmettre par WhatsApp. */
export const generateTempPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};
