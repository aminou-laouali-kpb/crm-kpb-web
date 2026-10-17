import { useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MIN_COMMENT_LENGTH, getStage } from '@/constants/dossiers';
import { BlockedBadge, PaymentBadge } from '@/components/dossiers/DossierBits';
import StageChangeDialog from '@/components/dossiers/StageChangeDialog';
import { useAddDossierEntry } from '@/hooks/useDossiers';
import {
  hourInNiamey,
  isDossierMine,
  isWorkday,
  needsDailyUpdate,
  studentName,
  todayInNiamey,
} from '@/utils/dossiers';

/** Saisie rapide du point du jour, dossier par dossier. */
const QuickUpdateRow = ({ dossier, onOpen }) => {
  const addEntry = useAddDossierEntry();
  const [body, setBody] = useState('');
  const [nextAction, setNextAction] = useState(dossier.next_action || '');
  const [nextActionDue, setNextActionDue] = useState(dossier.next_action_due || '');
  const [stageOpen, setStageOpen] = useState(false);
  const ok = body.trim().length >= MIN_COMMENT_LENGTH;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button type="button" className="text-left" onClick={() => onOpen(dossier)}>
          <p className="font-medium hover:underline">{studentName(dossier)}</p>
          <p className="text-xs text-muted-foreground">
            {dossier.reference} · {getStage(dossier.stage).label}
          </p>
        </button>
        <div className="flex flex-wrap gap-1">
          <BlockedBadge dossier={dossier} />
          {dossier.payment_status !== 'paye' && <PaymentBadge paymentStatus={dossier.payment_status} />}
        </div>
      </div>
      <Textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Point du jour : où en est exactement le dossier ?"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Input className="flex-1" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Prochaine action" />
        <Input className="sm:w-40" type="date" value={nextActionDue} onChange={(e) => setNextActionDue(e.target.value)} />
        <Button variant="outline" onClick={() => setStageOpen(true)}>Changer l’étape</Button>
        <Button
          disabled={!ok || addEntry.isPending}
          onClick={() =>
            addEntry.mutate({
              dossierId: dossier.id,
              type: 'daily_update',
              body: body.trim(),
              nextAction,
              nextActionDue,
            })
          }
        >
          Enregistrer
        </Button>
      </div>
      <StageChangeDialog dossier={dossier} open={stageOpen} onOpenChange={setStageOpen} />
    </div>
  );
};

const DailyClosePanel = ({ dossiers, userId, onOpen, isProcessor }) => {
  const today = todayInNiamey();
  const workday = isWorkday();
  const mine = dossiers.filter((d) => d.status === 'actif' && isDossierMine(d, userId));
  const pending = mine.filter((d) => needsDailyUpdate(d, today));
  const done = mine.filter((d) => !needsDailyUpdate(d, today));
  const overdue = mine.filter((d) => d.next_action_due && d.next_action_due < today);
  const unassigned = isProcessor ? dossiers.filter((d) => d.status === 'actif' && !d.assigned_to) : [];
  const lateInDay = hourInNiamey() >= 16;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Mes dossiers actifs</p>
          <p className="text-2xl font-semibold">{mine.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Point du jour fait</p>
          <p className="text-2xl font-semibold text-emerald-700">{done.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Reste à faire</p>
          <p className={`text-2xl font-semibold ${pending.length ? 'text-red-600' : ''}`}>{pending.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Actions en retard</p>
          <p className={`text-2xl font-semibold ${overdue.length ? 'text-orange-600' : ''}`}>{overdue.length}</p>
        </div>
      </div>

      {!workday && (
        <p className="text-sm rounded-md bg-muted p-3">Week-end : le point du jour n’est pas obligatoire.</p>
      )}
      {workday && lateInDay && pending.length > 0 && (
        <p className="text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-900 p-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Fin de journée : {pending.length} dossier(s) sans point du jour. Merci de les compléter avant de partir.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Clôture de journée</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Tous vos dossiers ont leur point du jour.
          </p>
        ) : (
          pending.map((d) => <QuickUpdateRow key={d.id} dossier={d} onOpen={onOpen} />)
        )}
      </section>

      {unassigned.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Dossiers non affectés ({unassigned.length})</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {unassigned.map((d) => (
              <button key={d.id} type="button" onClick={() => onOpen(d)} className="text-left rounded-lg border bg-card p-3 hover:border-primary">
                <p className="font-medium">{studentName(d)}</p>
                <p className="text-xs text-muted-foreground">{d.reference} · {getStage(d.stage).short}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-muted-foreground">À jour aujourd’hui ({done.length})</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {done.map((d) => (
              <button key={d.id} type="button" onClick={() => onOpen(d)} className="text-left rounded-lg border bg-card p-3 hover:border-primary">
                <p className="font-medium">{studentName(d)}</p>
                <p className="text-xs text-muted-foreground">{d.reference} · {getStage(d.stage).short}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DailyClosePanel;
