import { useMemo } from 'react';
import { teamDailySummary, todayInNiamey } from '@/utils/dossiers';

/** Suivi d'équipe (admin) : régularité des points du jour par responsable. */
const TeamFollowUp = ({ dossiers, team }) => {
  const today = todayInNiamey();
  const rows = useMemo(() => teamDailySummary(dossiers, team, today), [dossiers, team, today]);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Responsable</th>
            <th className="px-3 py-2 text-right">Dossiers actifs</th>
            <th className="px-3 py-2 text-right">Point du jour fait</th>
            <th className="px-3 py-2 text-right">Manquants</th>
            <th className="px-3 py-2 text-right">Bloqués</th>
            <th className="px-3 py-2 text-right">Actions en retard</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => {
            const missing = r.active - r.updatedToday;
            const rate = r.active ? Math.round((r.updatedToday / r.active) * 100) : 100;
            return (
              <tr key={r.userId}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-right">{r.active}</td>
                <td className="px-3 py-2 text-right">
                  {r.updatedToday} <span className="text-xs text-muted-foreground">({rate} %)</span>
                </td>
                <td className={`px-3 py-2 text-right ${missing > 0 ? 'text-red-600 font-medium' : ''}`}>{missing}</td>
                <td className="px-3 py-2 text-right">{r.blocked}</td>
                <td className={`px-3 py-2 text-right ${r.overdueActions > 0 ? 'text-orange-600' : ''}`}>{r.overdueActions}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TeamFollowUp;
