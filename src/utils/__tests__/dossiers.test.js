import { describe, it, expect } from 'vitest';
import {
  todayInNiamey,
  isWorkday,
  isDossierMine,
  needsDailyUpdate,
  filterDossiers,
  teamDailySummary,
} from '@/utils/dossiers';

const base = {
  id: 'd1',
  reference: 'DOS-2026-0001',
  student_first_name: 'Awa',
  student_last_name: 'Diallo',
  student_email: 'awa@test.com',
  procedure_type: 'campus_france',
  status: 'actif',
  payment_status: 'paye',
  assigned_to: 'u1',
  dossier_collaborators: [{ user_id: 'u2' }],
  last_update_work_date: null,
};

describe('dates à Niamey', () => {
  it('23h30 UTC est déjà le lendemain à Niamey (UTC+1)', () => {
    expect(todayInNiamey(new Date('2026-10-16T23:30:00Z'))).toBe('2026-10-17');
  });
  it('samedi et dimanche ne sont pas des jours ouvrés', () => {
    expect(isWorkday(new Date('2026-10-17T10:00:00Z'))).toBe(false); // samedi
    expect(isWorkday(new Date('2026-10-19T10:00:00Z'))).toBe(true); // lundi
  });
});

describe('dossiers', () => {
  it('responsable et intervenants sont « mes dossiers »', () => {
    expect(isDossierMine(base, 'u1')).toBe(true);
    expect(isDossierMine(base, 'u2')).toBe(true);
    expect(isDossierMine(base, 'u3')).toBe(false);
  });

  it('point du jour requis seulement pour un dossier actif pas encore mis à jour', () => {
    expect(needsDailyUpdate(base, '2026-10-19')).toBe(true);
    expect(needsDailyUpdate({ ...base, last_update_work_date: '2026-10-19' }, '2026-10-19')).toBe(false);
    expect(needsDailyUpdate({ ...base, status: 'en_pause' }, '2026-10-19')).toBe(false);
  });

  it('filtre par recherche, statut, périmètre et « mes dossiers »', () => {
    const other = { ...base, id: 'd2', student_first_name: 'Moussa', procedure_type: 'canada', assigned_to: 'u3', dossier_collaborators: [] };
    const list = [base, other];
    expect(filterDossiers(list, { search: 'moussa' }).map((d) => d.id)).toEqual(['d2']);
    expect(filterDossiers(list, { scope: ['campus_france'] }).map((d) => d.id)).toEqual(['d1']);
    expect(filterDossiers(list, { mineOnly: true }, 'u3').map((d) => d.id)).toEqual(['d2']);
    expect(filterDossiers(list, { status: 'cloture' })).toEqual([]);
    expect(filterDossiers(list, { assignee: 'none' })).toEqual([]);
  });

  it('suivi équipe : actifs, à jour, bloqués', () => {
    const team = [{ user_id: 'u1', full_name: 'Judicaël' }];
    const rows = teamDailySummary(
      [
        { ...base, last_update_work_date: '2026-10-19' },
        { ...base, id: 'd2', is_blocked: true, next_action_due: '2026-10-01' },
        { ...base, id: 'd3', assigned_to: null },
      ],
      team,
      '2026-10-19'
    );
    expect(rows.find((r) => r.userId === 'u1')).toMatchObject({ active: 2, updatedToday: 1, blocked: 1, overdueActions: 1 });
    expect(rows.find((r) => r.userId === 'none')).toMatchObject({ name: 'Non affecté', active: 1 });
  });
});
