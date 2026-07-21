import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  DEFAULT_FOLLOW_UP_DAYS,
  getFollowUpDays,
  setFollowUpDays,
} from '@/constants/followUpConfig';
import { useSalesReps } from '@/hooks/useSalesReps';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { data: salesReps = [] } = useSalesReps();
  const queryClient = useQueryClient();
  const [followUpInput, setFollowUpInput] = useState(
    getFollowUpDays().join(', ')
  );
  const [newRepName, setNewRepName] = useState('');

  React.useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/crm');
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleSaveFollowUp = () => {
    const days = followUpInput
      .split(',')
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d) && d > 0);
    if (days.length === 0) {
      toast.error('Entrez au moins un seuil valide (ex: 3, 7, 14)');
      return;
    }
    setFollowUpDays(days);
    toast.success('Seuils de relance enregistrés');
  };

  const handleResetFollowUp = () => {
    setFollowUpDays(DEFAULT_FOLLOW_UP_DAYS);
    setFollowUpInput(DEFAULT_FOLLOW_UP_DAYS.join(', '));
    toast.success('Seuils réinitialisés');
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
        <Card>
          <CardHeader>
            <CardTitle>Relances automatiques</CardTitle>
            <CardDescription>
              Seuils en jours avant qu'une facture soit marquée « À relancer »
              (le plus bas seuil actif est utilisé pour le statut automatique).
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
