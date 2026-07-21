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
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      toast.success('Client créé');
    },
    onError: (e) => toast.error(e.message || 'Erreur création client'),
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
    mutationFn: async ({ clientId, engagementId, daysValid = 14 }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const expires = new Date();
      expires.setDate(expires.getDate() + daysValid);

      const { data, error } = await supabase
        .from('contract_signing_tokens')
        .insert({
          client_id: clientId,
          engagement_id: engagementId,
          expires_at: expires.toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from('engagements')
        .update({ status: 'awaiting_signature' })
        .eq('id', engagementId);

      const origin = window.location.origin;
      return {
        token: data.token,
        url: `${origin}/sign/${data.token}`,
        expires_at: data.expires_at,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    },
    onError: (e) => toast.error(e.message || 'Erreur génération du lien'),
  });
};

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
