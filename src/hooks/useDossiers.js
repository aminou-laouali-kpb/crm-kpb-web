import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { todayInNiamey } from '@/utils/dossiers';

export const DOSSIERS_QUERY_KEY = ['dossiers'];

export const useDossiers = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: DOSSIERS_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossiers')
        .select('*, dossier_collaborators(user_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

export const useDossierEvents = (dossierId) =>
  useQuery({
    queryKey: ['dossier-events', dossierId],
    enabled: Boolean(dossierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossier_events')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

/** Équipe de traitement (admin, agents, contractuels) pour l'affectation. */
export const useDossierTeam = () =>
  useQuery({
    queryKey: ['dossier-team'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_dossier_team');
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

/** Nombre de mes dossiers actifs sans mise à jour aujourd'hui (badge du menu). */
export const useMyPendingDailyCount = (userId, { enabled = true } = {}) =>
  useQuery({
    queryKey: [...DOSSIERS_QUERY_KEY, 'pending-daily', userId],
    enabled: enabled && Boolean(userId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('dossiers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'actif')
        .eq('assigned_to', userId)
        .or(`last_update_work_date.is.null,last_update_work_date.neq.${todayInNiamey()}`);
      if (error) return 0;
      return count || 0;
    },
    staleTime: 60_000,
  });

const useDossierMutation = (mutationFn, successMessage) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: DOSSIERS_QUERY_KEY });
      if (variables?.dossierId) {
        queryClient.invalidateQueries({ queryKey: ['dossier-events', variables.dossierId] });
      }
      if (successMessage) toast.success(successMessage);
    },
    onError: (error) => toast.error(error?.message || 'Opération impossible'),
  });
};

const rpc = async (name, params) => {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
};

export const useChangeStage = () =>
  useDossierMutation(
    ({ dossierId, stage, comment, result }) =>
      rpc('dossier_change_stage', { p_dossier_id: dossierId, p_stage: stage, p_comment: comment, p_result: result || null }),
    'Étape mise à jour'
  );

export const useAddDossierEntry = () =>
  useDossierMutation(
    ({ dossierId, type, body, nextAction, nextActionDue }) =>
      rpc('dossier_add_entry', {
        p_dossier_id: dossierId,
        p_type: type,
        p_body: body,
        p_next_action: nextAction || null,
        p_next_action_due: nextActionDue || null,
      }),
    'Entrée ajoutée au journal'
  );

export const useSetDossierBlocked = () =>
  useDossierMutation(
    ({ dossierId, blocked, reason }) =>
      rpc('dossier_set_blocked', { p_dossier_id: dossierId, p_blocked: blocked, p_reason: reason }),
    'Dossier mis à jour'
  );

export const useSetDossierStatus = () =>
  useDossierMutation(
    ({ dossierId, status, outcome, comment }) =>
      rpc('dossier_set_status', { p_dossier_id: dossierId, p_status: status, p_outcome: outcome || null, p_comment: comment }),
    'Statut du dossier mis à jour'
  );

export const useAssignDossier = () =>
  useDossierMutation(
    ({ dossierId, assignedTo, collaborators, comment }) =>
      rpc('dossier_assign', {
        p_dossier_id: dossierId,
        p_assigned_to: assignedTo || null,
        p_collaborators: collaborators ?? null,
        p_comment: comment || null,
      }),
    'Affectation enregistrée'
  );

export const useUpdateDossierInfo = () =>
  useDossierMutation(
    ({ dossierId, fields }) => rpc('dossier_update_info', { p_dossier_id: dossierId, p_fields: fields }),
    'Informations enregistrées'
  );

export const useCreateManualDossier = () =>
  useDossierMutation(
    (form) =>
      rpc('create_manual_dossier', {
        p_first_name: form.firstName,
        p_last_name: form.lastName,
        p_email: form.email || null,
        p_whatsapp: form.whatsapp || null,
        p_procedure_type: form.procedureType || null,
        p_destination_country: form.destinationCountry || null,
        p_includes_visa: Boolean(form.includesVisa),
        p_assigned_to: form.assignedTo || null,
        p_note: form.note || null,
      }),
    'Dossier créé'
  );

export const useImportPaidInvoices = () =>
  useDossierMutation((since) => rpc('import_paid_invoices_as_dossiers', { p_since: since }));
