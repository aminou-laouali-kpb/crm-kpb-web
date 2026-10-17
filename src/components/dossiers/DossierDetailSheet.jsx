import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Lock, Pause, Play, CheckCircle2, XCircle, UserPlus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import WhatsAppLink from '@/components/WhatsAppLink';
import StageChangeDialog from '@/components/dossiers/StageChangeDialog';
import CommentActionDialog from '@/components/dossiers/CommentActionDialog';
import {
  StatusBadge,
  PaymentBadge,
  BlockedBadge,
  ResultBadges,
  StageProgress,
  UpdateFreshness,
} from '@/components/dossiers/DossierBits';
import { ENTRY_TYPE_OPTIONS, EVENT_TYPES, MIN_COMMENT_LENGTH, getStage } from '@/constants/dossiers';
import {
  useDossierEvents,
  useDossierTeam,
  useAddDossierEntry,
  useSetDossierBlocked,
  useSetDossierStatus,
  useAssignDossier,
  useUpdateDossierInfo,
} from '@/hooks/useDossiers';
import { useProcedureTypes, getProcedureLabel } from '@/hooks/useProcedureTypes';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { isDossierMine, studentName } from '@/utils/dossiers';

const formatDateTime = (value) =>
  new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const EntryForm = ({ dossier, canEdit }) => {
  const addEntry = useAddDossierEntry();
  const [type, setType] = useState(canEdit ? 'daily_update' : 'note');
  const [body, setBody] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDue, setNextActionDue] = useState('');

  useEffect(() => {
    setType(canEdit ? 'daily_update' : 'note');
    setBody('');
    setNextAction(dossier.next_action || '');
    setNextActionDue(dossier.next_action_due || '');
  }, [dossier.id, canEdit, dossier.next_action, dossier.next_action_due]);

  const ok = body.trim().length >= MIN_COMMENT_LENGTH;

  const submit = async () => {
    await addEntry.mutateAsync({
      dossierId: dossier.id,
      type,
      body: body.trim(),
      nextAction: canEdit ? nextAction : null,
      nextActionDue: canEdit ? nextActionDue : null,
    });
    setBody('');
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPE_OPTIONS.map((o) => (
            <Button key={o.value} size="sm" variant={type === o.value ? 'default' : 'outline'} onClick={() => setType(o.value)}>
              {o.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm font-medium">Ajouter un commentaire</p>
      )}
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          canEdit
            ? 'Où en est le dossier exactement ? Ce qui a été fait aujourd’hui…'
            : 'Ex : arrêter avant le visa tant que la 2e tranche n’est pas payée'
        }
      />
      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 grid gap-1">
            <Label className="text-xs">Prochaine action</Label>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Ex : recevoir les relevés de notes" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Pour le</Label>
            <Input type="date" value={nextActionDue} onChange={(e) => setNextActionDue(e.target.value)} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {ok ? '' : `${MIN_COMMENT_LENGTH} caractères minimum`}
        </span>
        <Button size="sm" onClick={submit} disabled={!ok || addEntry.isPending}>
          {addEntry.isPending ? 'Envoi…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
};

const AssignmentBlock = ({ dossier, isAdmin, isProcessor, userId, names }) => {
  const { data: team = [] } = useDossierTeam();
  const assign = useAssignDossier();
  const [assignee, setAssignee] = useState(dossier.assigned_to || '');
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    setAssignee(dossier.assigned_to || '');
    setCollaborators((dossier.dossier_collaborators || []).map((c) => c.user_id));
  }, [dossier.id, dossier.assigned_to, dossier.dossier_collaborators]);

  const currentCollaborators = (dossier.dossier_collaborators || []).map((c) => names[c.user_id] || 'Intervenant');

  return (
    <div className="space-y-2">
      <div className="text-sm">
        <span className="text-muted-foreground">Responsable : </span>
        <span className="font-medium">{dossier.assigned_to ? names[dossier.assigned_to] || 'Agent' : 'Non affecté'}</span>
        {currentCollaborators.length > 0 && (
          <span className="text-muted-foreground"> · Intervenants : {currentCollaborators.join(', ')}</span>
        )}
      </div>

      {!dossier.assigned_to && isProcessor && !isAdmin && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => assign.mutate({ dossierId: dossier.id, assignedTo: userId, collaborators: null, comment: 'Je prends ce dossier.' })}
        >
          <UserPlus className="h-4 w-4 mr-1" /> Prendre ce dossier
        </Button>
      )}

      {isAdmin && (
        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-xs">Affecter à</Label>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full p-2 border rounded-md text-sm">
            <option value="">Non affecté</option>
            {team.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
            ))}
          </select>
          <Label className="text-xs">Intervenants</Label>
          <div className="flex flex-wrap gap-3">
            {team.filter((m) => m.user_id !== assignee).map((m) => (
              <label key={m.user_id} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={collaborators.includes(m.user_id)}
                  onChange={() =>
                    setCollaborators((prev) =>
                      prev.includes(m.user_id) ? prev.filter((id) => id !== m.user_id) : [...prev, m.user_id]
                    )
                  }
                />
                {m.full_name}
              </label>
            ))}
          </div>
          <Button
            size="sm"
            disabled={assign.isPending}
            onClick={() =>
              assign.mutate({
                dossierId: dossier.id,
                assignedTo: assignee || null,
                collaborators: collaborators.filter((id) => id !== assignee),
              })
            }
          >
            Enregistrer l’affectation
          </Button>
        </div>
      )}
    </div>
  );
};

const InfoForm = ({ dossier, onDone }) => {
  const update = useUpdateDossierInfo();
  const { data: procedureTypes = [] } = useProcedureTypes();
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({
      student_first_name: dossier.student_first_name || '',
      student_last_name: dossier.student_last_name || '',
      student_email: dossier.student_email || '',
      student_whatsapp: dossier.student_whatsapp || '',
      procedure_type: dossier.procedure_type || '',
      destination_country: dossier.destination_country || '',
      includes_visa: dossier.includes_visa,
      target_date: dossier.target_date || '',
    });
  }, [dossier]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input value={form.student_first_name || ''} onChange={set('student_first_name')} placeholder="Prénom" />
        <Input value={form.student_last_name || ''} onChange={set('student_last_name')} placeholder="Nom" />
        <Input value={form.student_email || ''} onChange={set('student_email')} placeholder="Email" />
        <Input value={form.student_whatsapp || ''} onChange={set('student_whatsapp')} placeholder="WhatsApp" />
        <select value={form.procedure_type || ''} onChange={set('procedure_type')} className="p-2 border rounded-md text-sm">
          <option value="">Procédure non renseignée</option>
          {procedureTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
        <Input value={form.destination_country || ''} onChange={set('destination_country')} placeholder="Pays de destination" />
        <div className="grid gap-1">
          <Label className="text-xs">Date cible (rentrée, date limite…)</Label>
          <Input type="date" value={form.target_date || ''} onChange={set('target_date')} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mt-5">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(form.includes_visa)}
            onChange={(e) => setForm({ ...form, includes_visa: e.target.checked })}
          />
          Visa inclus
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onDone}>Annuler</Button>
        <Button
          size="sm"
          disabled={update.isPending}
          onClick={async () => {
            await update.mutateAsync({ dossierId: dossier.id, fields: form });
            onDone();
          }}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
};

const DossierDetailSheet = ({ dossier, open, onOpenChange, access, userId }) => {
  const { data: events = [], isLoading } = useDossierEvents(open ? dossier?.id : null);
  const { data: procedureTypes = [] } = useProcedureTypes();
  const names = useProfilesMap();
  const setBlocked = useSetDossierBlocked();
  const setStatus = useSetDossierStatus();
  const [stageDialog, setStageDialog] = useState(false);
  const [action, setAction] = useState(null); // 'block' | 'unblock' | 'pause' | 'resume' | 'close' | 'abandon'
  const [editingInfo, setEditingInfo] = useState(false);

  const isProcessor = access.isAdmin || access.roles.includes('agent') || access.roles.includes('contractuel');
  const canEdit = useMemo(
    () => Boolean(dossier) && (access.isAdmin || (isProcessor && isDossierMine(dossier, userId))),
    [dossier, access.isAdmin, isProcessor, userId]
  );

  useEffect(() => setEditingInfo(false), [dossier?.id]);

  if (!dossier) return null;

  const runAction = async ({ comment, option }) => {
    if (action === 'block' || action === 'unblock') {
      await setBlocked.mutateAsync({ dossierId: dossier.id, blocked: action === 'block', reason: comment });
    } else {
      const status = { pause: 'en_pause', resume: 'actif', close: 'cloture', abandon: 'abandonne' }[action];
      await setStatus.mutateAsync({ dossierId: dossier.id, status, outcome: option, comment });
    }
    setAction(null);
  };

  const actionConfig = {
    block: { title: 'Signaler un blocage', commentLabel: 'Motif du blocage *', placeholder: 'Ex : attente des relevés de notes de l’étudiant', confirmLabel: 'Bloquer', destructive: true },
    unblock: { title: 'Lever le blocage', commentLabel: 'Comment le blocage a été levé *', confirmLabel: 'Débloquer' },
    pause: { title: 'Mettre en pause', commentLabel: 'Raison *', placeholder: 'Ex : étudiant injoignable, attente 2e tranche', confirmLabel: 'Mettre en pause' },
    resume: { title: 'Réactiver le dossier', commentLabel: 'Raison *', confirmLabel: 'Réactiver' },
    close: {
      title: 'Clôturer le dossier',
      commentLabel: 'Bilan *',
      options: [{ value: 'succes', label: 'Succès' }, { value: 'echec', label: 'Échec' }],
      optionLabel: 'Issue *',
      confirmLabel: 'Clôturer',
    },
    abandon: { title: 'Abandonner le dossier', commentLabel: 'Motif *', placeholder: 'Ex : désistement, remboursement', confirmLabel: 'Abandonner', destructive: true },
  }[action] || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            {studentName(dossier)}
            <span className="text-sm font-normal text-muted-foreground">{dossier.reference}</span>
          </SheetTitle>
          <SheetDescription>
            {getProcedureLabel(procedureTypes, dossier.procedure_type) || 'Procédure non renseignée'}
            {dossier.destination_country ? ` · ${dossier.destination_country}` : ''}
            {dossier.includes_visa ? ' · visa inclus' : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dossier.status} />
            <PaymentBadge paymentStatus={dossier.payment_status} />
            <BlockedBadge dossier={dossier} />
            <ResultBadges dossier={dossier} />
            <UpdateFreshness dossier={dossier} />
          </div>

          {dossier.is_blocked && dossier.blocked_reason && (
            <p className="text-sm rounded-md bg-red-50 text-red-800 p-2">Blocage : {dossier.blocked_reason}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{getStage(dossier.stage).label}</p>
              {canEdit && dossier.status === 'actif' && (
                <Button size="sm" onClick={() => setStageDialog(true)}>
                  Changer l’étape <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
            <StageProgress dossier={dossier} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Prochaine action</p>
              <p>{dossier.next_action || '—'}{dossier.next_action_due ? ` (le ${new Date(dossier.next_action_due).toLocaleDateString('fr-FR')})` : ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date cible</p>
              <p>{dossier.target_date ? new Date(dossier.target_date).toLocaleDateString('fr-FR') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commercial</p>
              <p>{dossier.sales_rep || (dossier.origin === 'manuel' ? 'Dossier hors CRM' : '—')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="flex items-center gap-1 truncate">
                {dossier.student_whatsapp && <WhatsAppLink phone={dossier.student_whatsapp} message="" />}
                <span className="truncate">{dossier.student_email || dossier.student_whatsapp || '—'}</span>
              </p>
            </div>
          </div>

          <AssignmentBlock dossier={dossier} isAdmin={access.isAdmin} isProcessor={isProcessor} userId={userId} names={names} />

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {dossier.is_blocked ? (
                <Button size="sm" variant="outline" onClick={() => setAction('unblock')}>Lever le blocage</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setAction('block')}>
                  <Lock className="h-4 w-4 mr-1" /> Bloqué
                </Button>
              )}
              {dossier.status === 'actif' && (
                <Button size="sm" variant="outline" onClick={() => setAction('pause')}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              )}
              {dossier.status !== 'actif' && (
                <Button size="sm" variant="outline" onClick={() => setAction('resume')}>
                  <Play className="h-4 w-4 mr-1" /> Réactiver
                </Button>
              )}
              {['actif', 'en_pause'].includes(dossier.status) && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setAction('close')}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Clôturer
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setAction('abandon')}>
                    <XCircle className="h-4 w-4 mr-1" /> Abandon
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditingInfo((v) => !v)}>
                Modifier les informations
              </Button>
            </div>
          )}

          {editingInfo && <InfoForm dossier={dossier} onDone={() => setEditingInfo(false)} />}

          <EntryForm dossier={dossier} canEdit={canEdit} />

          <div className="space-y-3">
            <p className="font-medium">Journal</p>
            {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {events.map((e) => {
              const t = EVENT_TYPES[e.type] || EVENT_TYPES.note;
              return (
                <div key={e.id} className="border-l-2 pl-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${t.className}`}>{t.label}</span>
                    <span className="text-muted-foreground">
                      {formatDateTime(e.created_at)} · {e.author_id ? names[e.author_id] || 'Utilisateur' : 'Système'}
                    </span>
                    {e.edited_at && <span className="text-muted-foreground">(modifié)</span>}
                  </div>
                  {e.type === 'stage_change' && (
                    <p className="text-xs text-muted-foreground">
                      {getStage(e.from_stage).short} → <span className="font-medium text-foreground">{getStage(e.to_stage).short}</span>
                    </p>
                  )}
                  {e.body && <p className="text-sm whitespace-pre-wrap">{e.body}</p>}
                  {e.meta?.next_action && (
                    <p className="text-xs text-muted-foreground">
                      Prochaine action : {e.meta.next_action}
                      {e.meta.next_action_due ? ` (le ${new Date(e.meta.next_action_due).toLocaleDateString('fr-FR')})` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <StageChangeDialog dossier={dossier} open={stageDialog} onOpenChange={setStageDialog} />
        <CommentActionDialog
          open={Boolean(action)}
          onOpenChange={(o) => !o && setAction(null)}
          pending={setBlocked.isPending || setStatus.isPending}
          onConfirm={runAction}
          {...actionConfig}
        />
      </SheetContent>
    </Sheet>
  );
};

export default DossierDetailSheet;
