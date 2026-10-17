import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { STAGE_INDEX, getStage } from '@/constants/dossiers';
import {
  StatusBadge,
  PaymentBadge,
  BlockedBadge,
  ContractBadge,
  ResultBadges,
  StageProgress,
  UpdateFreshness,
} from '@/components/dossiers/DossierBits';
import { getProcedureLabel } from '@/hooks/useProcedureTypes';
import { studentName, todayInNiamey } from '@/utils/dossiers';

const columns = [
  { key: 'reference', label: 'Dossier' },
  { key: 'student', label: 'Étudiant' },
  { key: 'procedure', label: 'Procédure' },
  { key: 'stage', label: 'Étape' },
  { key: 'assigned', label: 'Responsable' },
  { key: 'last_update_at', label: 'Dernier point' },
  { key: 'next_action_due', label: 'Prochaine action' },
];

const sortValue = (d, key, names, procedureTypes) => {
  switch (key) {
    case 'student': return studentName(d).toLowerCase();
    case 'procedure': return getProcedureLabel(procedureTypes, d.procedure_type);
    case 'stage': return STAGE_INDEX[d.stage] ?? 0;
    case 'assigned': return names[d.assigned_to] || '';
    default: return d[key] || '';
  }
};

const DossierTable = ({ dossiers, onOpen, names, procedureTypes }) => {
  const [sort, setSort] = useState({ key: 'last_update_at', dir: 'asc' });
  const today = todayInNiamey();

  const rows = useMemo(() => {
    const sorted = [...dossiers].sort((a, b) => {
      const va = sortValue(a, sort.key, names, procedureTypes);
      const vb = sortValue(b, sort.key, names, procedureTypes);
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [dossiers, sort, names, procedureTypes]);

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  if (!dossiers.length) {
    return <p className="text-center py-12 text-muted-foreground">Aucun dossier</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                <button type="button" className="inline-flex items-center gap-1" onClick={() => toggle(c.key)}>
                  {c.label} <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            ))}
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">État</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((d) => (
            <tr key={d.id} onClick={() => onOpen(d)} className="cursor-pointer hover:bg-muted/40">
              <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{d.reference}</td>
              <td className="px-3 py-2">
                <p className="font-medium">{studentName(d)}</p>
                <p className="text-xs text-muted-foreground">{d.sales_rep || (d.origin === 'manuel' ? 'Hors CRM' : '')}</p>
              </td>
              <td className="px-3 py-2 text-xs">{getProcedureLabel(procedureTypes, d.procedure_type) || '—'}</td>
              <td className="px-3 py-2 min-w-[160px]">
                <p className="text-xs mb-1">{getStage(d.stage).short}</p>
                <StageProgress dossier={d} compact />
              </td>
              <td className="px-3 py-2 text-xs whitespace-nowrap">{d.assigned_to ? names[d.assigned_to] || 'Agent' : 'Non affecté'}</td>
              <td className="px-3 py-2 whitespace-nowrap"><UpdateFreshness dossier={d} /></td>
              <td className="px-3 py-2 text-xs max-w-[200px]">
                <p className="truncate">{d.next_action || '—'}</p>
                {d.next_action_due && (
                  <p className={d.next_action_due < today ? 'text-red-600' : 'text-muted-foreground'}>
                    {new Date(d.next_action_due).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={d.status} />
                  <PaymentBadge paymentStatus={d.payment_status} />
                  {d.contract_status !== 'signe' && <ContractBadge dossier={d} />}
                  <BlockedBadge dossier={d} />
                  <ResultBadges dossier={d} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DossierTable;
