import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const CLIENTS_QUERY_KEY = ['clients'];

export const useClients = () =>
  useQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, engagements(*), contract_signatures(id, signed_at, template_version, pdf_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useClientSignatureStatus = (clientId) =>
  useQuery({
    queryKey: ['client-signature', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('client_has_valid_signature', {
        p_client_id: clientId,
      });
      if (error) throw error;
      return !!data;
    },
  });

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data: { user } } = await supabase.auth.getUser();
      const email = String(payload.email || '').trim().toLowerCase();
      const insertPayload = {
        ...payload,
        email,
        created_by: user?.id,
      };

      // Prefer upsert by email so commercials don't hit unique-constraint failures
      const { data, error } = await supabase
        .from('clients')
        .upsert(insertPayload, { onConflict: 'email' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      toast.success('Client enregistré');
    },
    onError: (e) => toast.error(e.message || 'Erreur création client'),
  });
};

export const useUpsertClientFromInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ firstName, lastName, email, whatsapp }) => {
      const { data, error } = await supabase.rpc('upsert_client_from_invoice', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: email,
        p_whatsapp: whatsapp,
      });
      if (error) {
        const msg = error.message || '';
        if (/accès refusé/i.test(msg)) {
          throw new Error(
            "Accès refusé : votre compte n'a pas le droit de créer un client. Demandez le rôle commercial à un admin."
          );
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    },
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      toast.success('Client mis à jour');
    },
    onError: (e) => toast.error(e.message || 'Erreur mise à jour'),
  });
};

export const useCreateEngagement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('engagements')
        .insert({ ...payload, created_by: user?.id, status: 'draft' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      toast.success('Engagement créé');
    },
    onError: (e) => toast.error(e.message || 'Erreur engagement'),
  });
};

export const useCreateSigningLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      engagementId,
      entityKey = 'kpb_education_ne',
      entity = {},
    }) => {
      const { data, error } = await supabase.rpc('create_signature_request', {
        p_client_id: clientId,
        p_engagement_id: engagementId,
        p_entity_key: entityKey,
        p_entity: entity,
      });
      if (error) throw error;
      if (!data?.ok) {
        const missing = (data?.missing_fields || []).join(', ');
        throw new Error(
          missing
            ? `Champs client manquants : ${missing}`
            : (data?.error || 'Impossible de créer le lien')
        );
      }

      const origin = window.location.origin;
      return {
        token: data.token,
        request_id: data.request_id,
        url: `${origin}/contrat/${data.token}`,
        expires_at: data.expires_at,
        entity_key: data.entity_key,
        template_version: data.template_version,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['contract-status'] });
    },
    onError: (e) => toast.error(e.message || 'Erreur génération du lien'),
  });
};

export const useSendContractFromInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, entityKey = 'kpb_education_ne' }) => {
      const { data, error } = await supabase.rpc('create_contract_request_from_invoice', {
        p_invoice_id: invoiceId,
        p_entity_key: entityKey,
      });
      if (error) {
        const msg = error.message || '';
        if (/après paiement/i.test(msg)) {
          throw new Error('Le contrat ne peut être envoyé qu’après paiement de la facture');
        }
        if (/modèle de contrat/i.test(msg)) {
          throw new Error('Aucun modèle de contrat actif — contactez un admin');
        }
        throw error;
      }
      if (!data?.ok) {
        throw new Error(data?.error || 'Impossible de créer le lien de signature');
      }
      return {
        token: data.token,
        request_id: data.request_id,
        url: `${window.location.origin}/contrat/${data.token}`,
        expires_at: data.expires_at,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['contract-status'] });
    },
    onError: (e) => toast.error(e.message || 'Erreur génération du lien de signature'),
  });
};

export const useContractStatusList = () =>
  useQuery({
    queryKey: ['contract-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_contract_status')
        .select('*')
        .order('link_created_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useContractConfig = () =>
  useQuery({
    queryKey: ['contract-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'contract_config')
        .maybeSingle();
      if (error) throw error;
      return data?.value || {};
    },
  });
