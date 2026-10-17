import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateManualDossier, useDossierTeam } from '@/hooks/useDossiers';
import { useProcedureTypes } from '@/hooks/useProcedureTypes';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  whatsapp: '',
  procedureType: '',
  destinationCountry: '',
  includesVisa: false,
  assignedTo: '',
  note: '',
};

/** Dossier hors CRM : contact direct, admission avant paiement… */
const NewDossierDialog = ({ open, onOpenChange, isAdmin, procedureScope, onCreated }) => {
  const createDossier = useCreateManualDossier();
  const { data: procedureTypes = [] } = useProcedureTypes();
  const { data: team = [] } = useDossierTeam();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const allowedTypes = procedureTypes.filter((t) => t.active && (!procedureScope || procedureScope.includes(t.code)));
  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.procedureType && !createDossier.isPending;

  const submit = async () => {
    const id = await createDossier.mutateAsync(form);
    onOpenChange(false);
    onCreated?.(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            Pour un étudiant hors CRM (contact direct, admission avant paiement…). Si une facture est payée plus tard
            avec le même email, elle sera rattachée automatiquement à ce dossier.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label>Prénom *</Label>
              <Input value={form.firstName} onChange={set('firstName')} />
            </div>
            <div className="grid gap-1">
              <Label>Nom *</Label>
              <Input value={form.lastName} onChange={set('lastName')} />
            </div>
            <div className="grid gap-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="grid gap-1">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={set('whatsapp')} placeholder="+227…" />
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Procédure *</Label>
            <select value={form.procedureType} onChange={set('procedureType')} className="w-full p-2 border rounded-md text-sm">
              <option value="">Choisir…</option>
              {allowedTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="grid gap-1">
              <Label>Pays de destination</Label>
              <Input value={form.destinationCountry} onChange={set('destinationCountry')} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.includesVisa}
                onChange={(e) => setForm({ ...form, includesVisa: e.target.checked })}
              />
              Visa inclus
            </label>
          </div>
          {isAdmin && (
            <div className="grid gap-1">
              <Label>Responsable</Label>
              <select value={form.assignedTo} onChange={set('assignedTo')} className="w-full p-2 border rounded-md text-sm">
                <option value="">Affectation automatique selon la procédure</option>
                {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-1">
            <Label>Contexte</Label>
            <Textarea rows={3} value={form.note} onChange={set('note')} placeholder="Comment l’étudiant nous a contactés, ce qui est convenu…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {createDossier.isPending ? 'Création…' : 'Créer le dossier'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewDossierDialog;
