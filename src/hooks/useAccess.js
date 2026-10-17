import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const ACCESS_QUERY_KEY = ['my-access'];

/** Rôles donnant accès à la partie commerciale (factures, CRM, dashboard…). */
export const COMMERCIAL_SIDE_ROLES = ['admin', 'commercial', 'comptable', 'sales_rep'];
/** Rôles limités à l'espace Dossiers. */
export const DOSSIER_ONLY_ROLES = ['agent', 'contractuel'];

const fetchAccess = async (userId) => {
  const { data, error } = await supabase.rpc('get_my_access');
  if (!error && data) return data;

  // Repli tant que la migration 0007 n'est pas appliquée
  const { data: rows } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  return {
    user_id: userId,
    roles: (rows || []).map((r) => r.role),
    profile: null,
  };
};

export const deriveAccess = (access) => {
  const roles = access?.roles || [];
  const profile = access?.profile || null;
  const has = (role) => roles.includes(role);
  const isActive = profile?.is_active !== false;
  const hasCommercialSide = isActive && roles.some((r) => COMMERCIAL_SIDE_ROLES.includes(r));
  const hasDossierSide = isActive && roles.some((r) => DOSSIER_ONLY_ROLES.includes(r));

  return {
    roles,
    profile,
    isActive,
    hasAnyRole: isActive && roles.length > 0,
    isAdmin: isActive && has('admin'),
    isAccountant: isActive && has('comptable'),
    isCommercial: isActive && (has('commercial') || has('sales_rep')),
    hasCommercialSide,
    isDossierOnly: hasDossierSide && !hasCommercialSide,
    /** Nom du commercial rattaché au compte (facture toujours en son nom). */
    linkedSalesRep: profile?.sales_rep_name || null,
    /** Codes de procédure visibles (null = toutes). */
    procedureScope: profile?.procedure_scope?.length ? profile.procedure_scope : null,
  };
};

export const useAccess = () => {
  const queryClient = useQueryClient();
  // undefined = session pas encore lue ; null = déconnecté
  const [userId, setUserId] = useState(undefined);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
      if (event === 'USER_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ACCESS_QUERY_KEY });
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Clé par utilisateur : jamais de droits d'un autre compte servis depuis le cache
  const { data, isLoading } = useQuery({
    queryKey: [...ACCESS_QUERY_KEY, userId],
    queryFn: () => fetchAccess(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const loading = userId === undefined || (Boolean(userId) && isLoading);
  return { ...deriveAccess(userId ? data : null), loading };
};
