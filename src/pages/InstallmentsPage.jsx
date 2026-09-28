import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useInstallments, useInvalidateInstallments } from '@/hooks/useInstallments';
import { getUrgency, daysLate, addDays, buildInstallmentReminderMessage } from '@/utils/installments';
import { formatCurrency } from '@/utils/formatCurrency';
import WhatsAppLink from '@/components/WhatsAppLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, BellRing, XCircle } from 'lucide-react';

const URGENCY = {
  overdue: { label: 'En retard', cls: 'bg-destructive text-destructive-foreground' },
  today: { label: "Aujourd'hui", cls: 'bg-orange-500 text-white' },
  upcoming: { label: 'À venir', cls: 'bg-muted text-muted-foreground' },
};

const InstallmentsPage = () => {
  const { isAdmin } = useAdminCheck();
  const { data: items = [], isLoading } = useInstallments('pending');
  const { data: allItems = [] } = useInstallments('all');
  const invalidate = useInvalidateInstallments();
  const [repFilter, setRepFilter] = useState('all');
  const [action, setAction] = useState(null); // { type, inst }
  const [comment, setComment] = useState('');
  const [nextDate, setNextDate] = useState(addDays(7));
  const [saving, setSaving] = useState(false);

  const reps = useMemo(() => [...new Set(items.map((i) => i.sales_rep))].sort(), [items]);
  const filtered = items.filter((i) => repFilter === 'all' || i.sales_rep === repFilter);
  const groups = {
    overdue: filtered.filter((i) => getUrgency(i.due_date) === 'overdue'),
    today: filtered.filter((i) => getUrgency(i.due_date) === 'today'),
    upcoming: filtered.filter((i) => getUrgency(i.due_date) === 'upcoming'),
  };

  const repStats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const map = {};
    allItems.forEach((i) => {
      const s = (map[i.sales_rep] ||= { pending: 0, overdue: 0, remaining: 0, reminders: 0, paid: 0 });
      if (i.status === 'pending') {
        s.pending++;
        s.remaining += Number(i.remaining_amount || 0);
        if (getUrgency(i.due_date) === 'overdue') s.overdue++;
      }
      if (i.status === 'paid' && i.closed_at && new Date(i.closed_at) >= monthStart) s.paid++;
      if (i.last_reminder_at && new Date(i.last_reminder_at) >= monthStart) s.reminders++;
    });
    return Object.entries(map).sort((a, b) => b[1].overdue - a[1].overdue);
  }, [allItems]);

  const openAction = (type, inst) => {
    setAction({ type, inst });
    setComment('');
    setNextDate(addDays(7));
  };

  const submitAction = async () => {
    const { type, inst } = action;
    if (type === 'abandon' && !comment.trim()) return toast.error('Motif obligatoire');
    if (type === 'remind' && !nextDate) return toast.error('Date de prochaine relance obligatoire');
    setSaving(true);
    try {
      if (type === 'remind') {
        const { error: e1 } = await supabase.from('installment_reminders').insert({
          installment_id: inst.id, comment: comment.trim() || null, next_due_date: nextDate,
        });
        if (e1) throw e1;
        const { error } = await supabase.from('payment_installments').update({
          due_date: nextDate, last_reminder_at: new Date().toISOString(), reminder_count: (inst.reminder_count || 0) + 1,
        }).eq('id', inst.id);
        if (error) throw error;
        toast.success('Relance enregistrée');
      } else {
        const { error } = await supabase.from('payment_installments').update({
          status: type === 'paid' ? 'paid' : 'abandoned',
          closed_reason: comment.trim() || null,
          closed_at: new Date().toISOString(),
        }).eq('id', inst.id);
        if (error) throw error;
        toast.success(type === 'paid' ? 'Solde marqué comme payé' : 'Échéance abandonnée');
      }
      setAction(null);
      invalidate();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ inst }) => {
    const u = getUrgency(inst.due_date);
    const late = daysLate(inst.due_date);
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{inst.client_name}</p>
            <p className="text-xs text-muted-foreground break-words">{inst.service}</p>
          </div>
          <Badge className={URGENCY[u].cls}>
            {u === 'overdue' ? `${late} j de retard` : URGENCY[u].label}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Prévu : {new Date(inst.due_date + 'T00:00').toLocaleDateString('fr-FR')}</span>
          {Number(inst.remaining_amount) > 0 && (
            <span className="font-medium text-foreground">Reste : {formatCurrency(inst.remaining_amount, inst.currency)}</span>
          )}
          <span>Relances : {inst.reminder_count}</span>
          {isAdmin && <span>Commercial : {inst.sales_rep}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {inst.client_whatsapp && inst.client_whatsapp !== 'n/a' && (
            <WhatsAppLink phone={inst.client_whatsapp} message={buildInstallmentReminderMessage(inst)} variant="outline" label="Relancer" />
          )}
          <Button size="sm" variant="outline" onClick={() => openAction('remind', inst)}>
            <BellRing className="h-3 w-3 mr-1" /> Relance faite
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAction('paid', inst)}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Solde payé
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openAction('abandon', inst)}>
            <XCircle className="h-3 w-3 mr-1" /> Abandon
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Relances tranches" subtitle="Clients avec un solde à encaisser">
      <div className="space-y-6 max-w-4xl">
        {isAdmin && repStats.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Contrôle par commercial</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left"><th className="py-1">Commercial</th><th>En attente</th><th>En retard</th><th>Reste</th><th>Relances (mois)</th><th>Soldés (mois)</th></tr>
                </thead>
                <tbody>
                  {repStats.map(([rep, s]) => (
                    <tr key={rep} className="border-t cursor-pointer hover:bg-muted/50" onClick={() => setRepFilter(rep)}>
                      <td className="py-2 font-medium">{rep}</td><td>{s.pending}</td>
                      <td className={s.overdue ? 'text-destructive font-semibold' : ''}>{s.overdue}</td>
                      <td>{formatCurrency(s.remaining, 'XOF')}</td><td>{s.reminders}</td><td>{s.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Select value={repFilter} onValueChange={setRepFilter}>
            <SelectTrigger className="w-full sm:w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les commerciaux</SelectItem>
              {reps.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {isLoading ? <p>Chargement...</p> : filtered.length === 0 ? (
          <p className="text-muted-foreground">Aucune tranche en attente 🎉</p>
        ) : (
          ['overdue', 'today', 'upcoming'].map((k) => groups[k].length > 0 && (
            <div key={k} className="space-y-2">
              <h2 className="font-semibold flex items-center gap-2">
                {k === 'overdue' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                {URGENCY[k].label} ({groups[k].length})
              </h2>
              {groups[k].map((inst) => <Row key={inst.id} inst={inst} />)}
            </div>
          ))
        )}
      </div>

      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action?.type === 'remind' ? 'Relance effectuée' : action?.type === 'paid' ? 'Solde payé' : 'Abandonner le suivi'}
            </DialogTitle>
            <DialogDescription>{action?.inst.client_name}</DialogDescription>
          </DialogHeader>
          {action?.type === 'remind' && (
            <div>
              <Label>Prochaine date de relance / paiement promis</Label>
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </div>
          )}
          {action?.type === 'paid' && (
            <p className="text-sm text-muted-foreground">Pensez à générer la facture du solde et à la marquer payée avec son reçu.</p>
          )}
          <div>
            <Label>{action?.type === 'abandon' ? 'Motif (obligatoire)' : 'Commentaire'}</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={submitAction} disabled={saving}>{saving ? '...' : 'Valider'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default InstallmentsPage;
