import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useDossierTeam, useImportPaidInvoices } from '@/hooks/useDossiers';

const useRouting = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const { data } = await supabase
      .from('procedure_types')
      .select('code, label, sort_order, default_assignee_id, default_collaborator_ids')
      .order('sort_order');
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return { rows, setRows, loading };
};

/** Qui reçoit automatiquement les dossiers de chaque procédure. */
const DossierRoutingSection = () => {
  const queryClient = useQueryClient();
  const { data: team = [] } = useDossierTeam();
  const { rows, setRows, loading } = useRouting();
  const [saving, setSaving] = useState(false);
  const importPaid = useImportPaidInvoices();
  const [since, setSince] = useState('');

  const update = (code, patch) =>
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, ...patch } : r)));

  const toggleCollaborator = (row, userId) => {
    const current = row.default_collaborator_ids || [];
    update(row.code, {
      default_collaborator_ids: current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const row of rows) {
        const { error } = await supabase
          .from('procedure_types')
          .update({
            default_assignee_id: row.default_assignee_id || null,
            default_collaborator_ids: (row.default_collaborator_ids || []).filter((id) => id !== row.default_assignee_id),
          })
          .eq('code', row.code);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['procedure-types'] });
      toast.success('Affectation automatique enregistrée');
    } catch (e) {
      toast.error(e.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const runImport = async () => {
    const count = await importPaid.mutateAsync(since);
    toast.success(`${count} dossier(s) créé(s) à partir des factures payées`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dossiers : affectation automatique</CardTitle>
        <CardDescription>
          Dès qu’une facture est payée, le dossier est créé et confié au responsable de sa procédure.
          Sans responsable, il arrive dans « Non affectés ».
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && team.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun agent : créez d’abord les comptes (rôle Agent ou Contractuel) dans « Utilisateurs et accès ».
          </p>
        )}
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.code} className="rounded border p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium sm:w-1/2">{row.label}</span>
                <select
                  value={row.default_assignee_id || ''}
                  onChange={(e) => update(row.code, { default_assignee_id: e.target.value || null })}
                  className="flex-1 p-2 border rounded-md text-sm"
                >
                  <option value="">Non affecté</option>
                  {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
                </select>
              </div>
              {team.length > 1 && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Intervenants :</span>
                  {team.filter((m) => m.user_id !== row.default_assignee_id).map((m) => (
                    <label key={m.user_id} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={(row.default_collaborator_ids || []).includes(m.user_id)}
                        onChange={() => toggleCollaborator(row, m.user_id)}
                      />
                      {m.full_name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving || loading}>
          {saving ? 'Enregistrement…' : 'Enregistrer l’affectation'}
        </Button>

        <div className="border-t pt-4 space-y-2">
          <Label htmlFor="import-since">Reprise : créer les dossiers des factures payées depuis le</Label>
          <div className="flex gap-2">
            <Input id="import-since" type="date" value={since} onChange={(e) => setSince(e.target.value)} className="max-w-[200px]" />
            <Button variant="outline" disabled={!since || importPaid.isPending} onClick={runImport}>
              {importPaid.isPending ? 'Import…' : 'Créer les dossiers'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sans doublon : une facture qui a déjà son dossier est ignorée. Les Guides ultimes ne créent pas de dossier.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DossierRoutingSection;
