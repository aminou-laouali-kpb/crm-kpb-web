import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAuth } from '@/hooks/useAuth';
import UserAccessSection from '@/components/settings/UserAccessSection';
import DossierRoutingSection from '@/components/settings/DossierRoutingSection';
import { useFollowUpDays, useSaveFollowUpDays } from '@/hooks/useFollowUpDays';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DEFAULT_FOLLOW_UP_DAYS } from '@/constants/followUpConfig';
import { useSalesReps } from '@/hooks/useSalesReps';
import { supabase } from '@/integrations/supabase/client';
import { useContractConfig } from '@/hooks/useClients';
import { DEFAULT_CONTRACT_CONFIG } from '@/constants/contractConfig';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { user } = useAuth(false);
  const { data: salesReps = [] } = useSalesReps({ includeInactive: true });
  const queryClient = useQueryClient();
  const { followUpDays } = useFollowUpDays();
  const saveFollowUpDays = useSaveFollowUpDays();
  const [followUpInput, setFollowUpInput] = useState(DEFAULT_FOLLOW_UP_DAYS.join(', '));

  React.useEffect(() => {
    setFollowUpInput(followUpDays.join(', '));
  }, [followUpDays]);
  const [newRepName, setNewRepName] = useState('');

  const { data: contractConfigRemote } = useContractConfig();
  const [contractForm, setContractForm] = useState(DEFAULT_CONTRACT_CONFIG);

  React.useEffect(() => {
    if (contractConfigRemote && Object.keys(contractConfigRemote).length) {
      setContractForm({ ...DEFAULT_CONTRACT_CONFIG, ...contractConfigRemote });
    }
  }, [contractConfigRemote]);

  React.useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/crm');
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleSaveContractConfig = async () => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'contract_config', value: contractForm, updated_at: new Date().toISOString() });
    if (error) {
      toast.error('Erreur enregistrement config contrat');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['contract-config'] });
    toast.success('Configuration contrat enregistrée');
  };

  const handleSaveFollowUp = async () => {
    const days = followUpInput
      .split(',')
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d) && d > 0);
    if (days.length === 0) {
      toast.error('Entrez au moins un seuil valide (ex: 3, 7, 14)');
      return;
    }
    try {
      await saveFollowUpDays.mutateAsync(days);
      toast.success('Seuils de relance enregistrés pour toute l’équipe');
    } catch {
      toast.error('Erreur lors de l’enregistrement des seuils');
    }
  };

  const handleResetFollowUp = async () => {
    try {
      await saveFollowUpDays.mutateAsync(DEFAULT_FOLLOW_UP_DAYS);
      toast.success('Seuils réinitialisés');
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const handleAddSalesRep = async () => {
    if (!newRepName.trim()) return;
    const { error } = await supabase
      .from('sales_reps')
      .insert({ name: newRepName.trim(), active: true });
    if (error) {
      toast.error('Erreur lors de l\'ajout du commercial');
      return;
    }
    setNewRepName('');
    queryClient.invalidateQueries({ queryKey: ['sales-reps'] });
    toast.success('Commercial ajouté');
  };

  const handleToggleRep = async (rep) => {
    const { error } = await supabase
      .from('sales_reps')
      .update({ active: !rep.active })
      .eq('id', rep.id);
    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['sales-reps'] });
    toast.success(rep.active ? 'Commercial désactivé' : 'Commercial activé');
  };

  if (adminLoading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <AppLayout title="Paramètres" subtitle="Configuration de l'application">
      <div className="max-w-2xl space-y-6">
        <UserAccessSection currentUserId={user?.id} />

        <DossierRoutingSection />

        <Card>
          <CardHeader>
            <CardTitle>Relances automatiques</CardTitle>
            <CardDescription>
              Seuils en jours avant qu'une facture soit marquée « À relancer »
              (le plus bas seuil est utilisé pour le statut automatique ; les autres colorent les lignes).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="followUp">Seuils (jours, séparés par des virgules)</Label>
              <Input
                id="followUp"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder="3, 7, 14"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveFollowUp}>Enregistrer</Button>
              <Button variant="outline" onClick={handleResetFollowUp}>
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrat de prestation (variables KPB)</CardTitle>
            <CardDescription>
              Informations juridiques injectées dans le contrat (à compléter avant production).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['kpb_forme_juridique', 'Forme juridique'],
              ['kpb_capital', 'Capital'],
              ['kpb_rccm', 'RCCM'],
              ['kpb_siege', 'Siège'],
              ['kpb_representant', 'Représentant'],
              ['kpb_fonction', 'Fonction'],
              ['kpb_email', 'Email'],
              ['ville_juridiction', 'Ville juridiction'],
              ['lieu_signature_defaut', 'Lieu de signature'],
            ].map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={contractForm[key] || ''}
                  onChange={(e) => setContractForm({ ...contractForm, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              {[
                ['nb_tentatives_reorientation', 'Tentatives réorientation'],
                ['delai_reorientation_mois', 'Délai réorientation (mois)'],
                ['delai_mise_en_demeure_jours', 'Mise en demeure (j)'],
                ['delai_accuse_jours', 'Accusé (j)'],
                ['delai_decision_jours', 'Décision (j)'],
                ['delai_versement_jours', 'Versement (j)'],
                ['delai_amiable_jours', 'Amiable (j)'],
                ['frais_inscription_defaut', 'Frais inscription défaut'],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    value={contractForm[key] ?? ''}
                    onChange={(e) =>
                      setContractForm({
                        ...contractForm,
                        [key]: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveContractConfig}>Enregistrer le contrat</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commerciaux</CardTitle>
            <CardDescription>
              Gérez l'équipe commerciale sans modifier le code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {salesReps.map((rep) => (
                <div
                  key={rep.id || rep.name}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <span className={rep.active === false ? 'line-through text-muted-foreground' : ''}>
                    {rep.name}
                  </span>
                  {rep.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleRep(rep)}
                    >
                      {rep.active !== false ? 'Désactiver' : 'Activer'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nom du nouveau commercial"
                value={newRepName}
                onChange={(e) => setNewRepName(e.target.value)}
              />
              <Button onClick={handleAddSalesRep}>Ajouter</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
