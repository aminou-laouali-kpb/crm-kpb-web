import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyClosePanel from '@/components/dossiers/DailyClosePanel';
import DossierKanban from '@/components/dossiers/DossierKanban';
import DossierTable from '@/components/dossiers/DossierTable';
import DossierDetailSheet from '@/components/dossiers/DossierDetailSheet';
import NewDossierDialog from '@/components/dossiers/NewDossierDialog';
import TeamFollowUp from '@/components/dossiers/TeamFollowUp';
import { useAccess } from '@/hooks/useAccess';
import { useAuth } from '@/hooks/useAuth';
import { useDossiers, useDossierTeam } from '@/hooks/useDossiers';
import { useProcedureTypes } from '@/hooks/useProcedureTypes';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { DOSSIER_STATUSES, PAYMENT_STATUSES } from '@/constants/dossiers';
import { filterDossiers, isDossierMine } from '@/utils/dossiers';

const selectClass = 'p-2 border rounded-md text-sm bg-background';

const DossiersPage = () => {
  const access = useAccess();
  const { user } = useAuth(false);
  const userId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: dossiers = [], isLoading, error } = useDossiers();
  const { data: team = [] } = useDossierTeam();
  const { data: procedureTypes = [] } = useProcedureTypes();
  const names = useProfilesMap();

  const isProcessor = access.isAdmin || access.roles.includes('agent') || access.roles.includes('contractuel');
  const defaultTab = isProcessor && !access.isAdmin ? 'today' : 'table';
  const [tab, setTab] = useState(searchParams.get('vue') || defaultTab);
  const [newOpen, setNewOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    procedure: 'all',
    assignee: 'all',
    status: 'actif',
    payment: 'all',
    mineOnly: false,
    // Vue filtrée par défaut sur le périmètre de l'agent (désactivable)
    useScope: true,
  });

  const selectedId = searchParams.get('dossier');
  const selected = dossiers.find((d) => d.id === selectedId) || null;

  const openDossier = (d) => {
    const next = new URLSearchParams(searchParams);
    next.set('dossier', d.id || d);
    setSearchParams(next);
  };
  const closeDossier = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('dossier');
    setSearchParams(next);
  };

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (next.get('vue') !== tab) {
      next.set('vue', tab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const scope = filters.useScope ? access.procedureScope : null;
  const filtered = useMemo(
    () => filterDossiers(dossiers, { ...filters, scope }, userId),
    [dossiers, filters, scope, userId]
  );

  const canEditDossier = (d) => access.isAdmin || (isProcessor && isDossierMine(d, userId));
  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  return (
    <AppLayout title="Dossiers" subtitle="Suivi des procédures, du paiement au départ de l’étudiant">
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">
            Dossiers indisponibles : la migration « 0008_dossiers » doit être appliquée.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Rechercher un étudiant, une référence…" value={filters.search} onChange={set('search')} />
          </div>
          <select className={selectClass} value={filters.procedure} onChange={set('procedure')}>
            <option value="all">Toutes procédures</option>
            {procedureTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            <option value="none">Non renseignée</option>
          </select>
          <select className={selectClass} value={filters.assignee} onChange={set('assignee')}>
            <option value="all">Tous les responsables</option>
            <option value="none">Non affectés</option>
            {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
          </select>
          <select className={selectClass} value={filters.status} onChange={set('status')}>
            <option value="all">Tous statuts</option>
            {Object.entries(DOSSIER_STATUSES).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
          </select>
          <select className={selectClass} value={filters.payment} onChange={set('payment')}>
            <option value="all">Tous paiements</option>
            {Object.entries(PAYMENT_STATUSES).map(([value, p]) => <option key={value} value={value}>{p.label}</option>)}
          </select>
          {isProcessor && (
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={filters.mineOnly} onChange={(e) => setFilters({ ...filters, mineOnly: e.target.checked })} />
              Mes dossiers
            </label>
          )}
          {access.procedureScope && (
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={filters.useScope} onChange={(e) => setFilters({ ...filters, useScope: e.target.checked })} />
              Mon périmètre
            </label>
          )}
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau dossier
          </Button>
        </div>

        <Tabs
          value={(tab === 'today' && !isProcessor) || (tab === 'team' && !access.isAdmin) ? 'table' : tab}
          onValueChange={setTab}
        >
          <TabsList>
            {isProcessor && <TabsTrigger value="today">Ma journée</TabsTrigger>}
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="table">Tableau</TabsTrigger>
            {access.isAdmin && <TabsTrigger value="team">Suivi équipe</TabsTrigger>}
          </TabsList>

          {isLoading && <p className="text-sm text-muted-foreground py-6">Chargement…</p>}

          {isProcessor && (
            <TabsContent value="today">
              <DailyClosePanel dossiers={dossiers} userId={userId} onOpen={openDossier} isProcessor={isProcessor} />
            </TabsContent>
          )}
          <TabsContent value="kanban">
            <DossierKanban
              dossiers={filtered}
              onOpen={openDossier}
              canEditDossier={canEditDossier}
              names={names}
              userId={userId}
            />
          </TabsContent>
          <TabsContent value="table">
            <DossierTable dossiers={filtered} onOpen={openDossier} names={names} procedureTypes={procedureTypes} />
          </TabsContent>
          {access.isAdmin && (
            <TabsContent value="team">
              <TeamFollowUp dossiers={dossiers} team={team} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <DossierDetailSheet
        dossier={selected}
        open={Boolean(selected)}
        onOpenChange={(o) => !o && closeDossier()}
        access={access}
        userId={userId}
      />
      <NewDossierDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        isAdmin={access.isAdmin}
        procedureScope={access.roles.includes('contractuel') && !access.isAdmin ? access.procedureScope : null}
        onCreated={(id) => id && openDossier(id)}
      />
    </AppLayout>
  );
};

export default DossiersPage;
