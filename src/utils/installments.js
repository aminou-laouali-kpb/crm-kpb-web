import { z } from 'zod';

export const toLocalDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
};

/** 'overdue' | 'today' | 'upcoming' */
export const getUrgency = (dueDate) => {
  const today = toLocalDateString(new Date());
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  return 'upcoming';
};

export const daysLate = (dueDate) => {
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now - due) / 86400000);
};

export const installmentFormSchema = z.object({
  remaining_amount: z.coerce.number().positive('Montant restant requis'),
  total_amount: z.coerce.number().nonnegative().optional().or(z.literal('')),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date prévue obligatoire'),
});

export const buildInstallmentReminderMessage = (inst) =>
  `Bonjour ${inst.client_name},\n\n` +
  `Merci encore pour le paiement de votre première tranche (${inst.service}).\n` +
  (Number(inst.remaining_amount) > 0
    ? `Le montant restant à régler est de ${Number(inst.remaining_amount).toLocaleString('fr-FR')} ${inst.currency || 'XOF'}.\n`
    : '') +
  `Pouvons-nous convenir ensemble de la date du prochain paiement afin de poursuivre votre procédure ?\n\n` +
  `Cordialement,\nKPB Education`;
