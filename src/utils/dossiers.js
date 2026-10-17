import { NIAMEY_TIMEZONE, STAGE_INDEX } from '@/constants/dossiers';

/** Date du jour à Niamey au format AAAA-MM-JJ (même référence que la base). */
export const todayInNiamey = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: NIAMEY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/** Heure (0-23) à Niamey. */
export const hourInNiamey = (now = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: NIAMEY_TIMEZONE, hour: '2-digit', hour12: false }).format(now));

/** Lundi → vendredi à Niamey. */
export const isWorkday = (now = new Date()) => {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: NIAMEY_TIMEZONE, weekday: 'short' }).format(now);
  return !['Sat', 'Sun'].includes(day);
};

export const isDossierMine = (dossier, userId) =>
  Boolean(userId) &&
  (dossier.assigned_to === userId ||
    (dossier.dossier_collaborators || []).some((c) => c.user_id === userId));

/** Un dossier actif doit recevoir au moins une mise à jour de l'équipe chaque jour ouvré. */
export const needsDailyUpdate = (dossier, today = todayInNiamey()) =>
  dossier.status === 'actif' && dossier.last_update_work_date !== today;

/** Jours écoulés depuis la dernière mise à jour (null si jamais). */
export const daysSinceUpdate = (dossier, now = new Date()) => {
  if (!dossier.last_update_at) return null;
  return Math.floor((now.getTime() - new Date(dossier.last_update_at).getTime()) / 86400000);
};

export const studentName = (dossier) =>
  `${dossier.student_first_name || ''} ${dossier.student_last_name || ''}`.trim() || 'Étudiant';

export const filterDossiers = (dossiers, filters, userId) => {
  const {
    search = '',
    procedure = 'all',
    assignee = 'all',
    status = 'actif',
    payment = 'all',
    mineOnly = false,
    scope = null,
  } = filters;
  const term = search.trim().toLowerCase();

  return dossiers.filter((d) => {
    if (status !== 'all' && d.status !== status) return false;
    if (procedure !== 'all' && (d.procedure_type || 'none') !== procedure) return false;
    if (assignee === 'none' && d.assigned_to) return false;
    if (assignee !== 'all' && assignee !== 'none' && d.assigned_to !== assignee) return false;
    if (payment !== 'all' && d.payment_status !== payment) return false;
    if (mineOnly && !isDossierMine(d, userId)) return false;
    if (scope && !scope.includes(d.procedure_type)) return false;
    if (!term) return true;
    return [d.reference, d.student_first_name, d.student_last_name, d.student_email, d.student_whatsapp, d.sales_rep]
      .some((v) => String(v || '').toLowerCase().includes(term));
  });
};

export const sortByStageThenUpdate = (a, b) =>
  (STAGE_INDEX[a.stage] ?? 0) - (STAGE_INDEX[b.stage] ?? 0) ||
  String(a.last_update_at || '').localeCompare(String(b.last_update_at || ''));

/** Suivi d'équipe : dossiers actifs et mis à jour aujourd'hui, par responsable. */
export const teamDailySummary = (dossiers, team, today = todayInNiamey()) => {
  const rows = new Map();
  const ensure = (id, name) => {
    if (!rows.has(id)) rows.set(id, { userId: id, name, active: 0, updatedToday: 0, blocked: 0, overdueActions: 0 });
    return rows.get(id);
  };
  team.forEach((m) => ensure(m.user_id, m.full_name));
  dossiers
    .filter((d) => d.status === 'actif')
    .forEach((d) => {
      const member = team.find((m) => m.user_id === d.assigned_to);
      const row = ensure(d.assigned_to || 'none', member?.full_name || (d.assigned_to ? 'Autre' : 'Non affecté'));
      row.active += 1;
      if (d.last_update_work_date === today) row.updatedToday += 1;
      if (d.is_blocked) row.blocked += 1;
      if (d.next_action_due && d.next_action_due < today) row.overdueActions += 1;
    });
  return [...rows.values()].filter((r) => r.active > 0 || r.userId !== 'none');
};
