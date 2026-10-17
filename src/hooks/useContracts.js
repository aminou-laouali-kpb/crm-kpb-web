import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { contractUrl } from '@/utils/contracts';

export const CONTRACT_FOLLOWUPS_KEY = ['contract-followups'];

/** Contrats des factures (du commercial connecté, ou toutes pour l'admin). */
export const useContractFollowups = ({ includeSigned = false, enabled = true } = {}) =>
  useQuery({
    queryKey: [...CONTRACT_FOLLOWUPS_KEY, includeSigned],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_contract_followups', { p_include_signed: includeSigned });
      if (error) return [];
      return data || [];
    },
    staleTime: 60_000,
  });

const friendlyError = (error) => {
  const msg = error?.message || '';
  if (/modèle de contrat/i.test(msg)) return 'Aucun modèle de contrat actif — contactez un admin';
  return msg || 'Impossible de créer le lien de signature';
};

/** Crée le lien de signature d'une facture, ou renvoie le lien en cours. */
export const useSendInvoiceContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, forceNew = false, entityKey = 'kpb_education_ne' }) => {
      const { data, error } = await supabase.rpc('create_contract_request_from_invoice', {
        p_invoice_id: invoiceId,
        p_entity_key: entityKey,
        p_force_new: forceNew,
      });
      if (error) throw new Error(friendlyError(error));
      if (!data?.ok) throw new Error('Impossible de créer le lien de signature');
      return {
        token: data.token,
        requestId: data.request_id,
        reused: Boolean(data.reused),
        url: contractUrl(data.token),
        expiresAt: data.expires_at,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTRACT_FOLLOWUPS_KEY });
      qc.invalidateQueries({ queryKey: ['contract-status'] });
    },
  });
};

export const useLogContractReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId) => {
      const { error } = await supabase.rpc('log_contract_reminder', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTRACT_FOLLOWUPS_KEY }),
  });
};
