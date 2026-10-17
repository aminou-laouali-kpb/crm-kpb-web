import { AlertTriangle } from 'lucide-react';
import {
  DOSSIER_STAGES,
  DOSSIER_STATUSES,
  PAYMENT_STATUSES,
  RESULT_LABELS,
  STAGE_INDEX,
} from '@/constants/dossiers';
import { todayInNiamey } from '@/utils/dossiers';
import { getContractState } from '@/utils/contracts';

const pill = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-transparent';

export const StatusBadge = ({ status }) => {
  const s = DOSSIER_STATUSES[status] || DOSSIER_STATUSES.actif;
  return <span className={`${pill} ${s.className}`}>{s.label}</span>;
};

export const PaymentBadge = ({ paymentStatus }) => {
  const p = PAYMENT_STATUSES[paymentStatus];
  if (!p) return null;
  return <span className={`${pill} border ${p.className}`}>{p.label}</span>;
};

/** État du contrat (dossiers issus d'une facture uniquement). */
export const ContractBadge = ({ dossier }) => {
  if (!dossier.invoice_id) return null;
  const state = getContractState(dossier.contract_status);
  return <span className={`${pill} ${state.className}`}>{state.label}</span>;
};

export const BlockedBadge = ({ dossier }) =>
  dossier.is_blocked ? (
    <span className={`${pill} bg-red-100 text-red-800`} title={dossier.blocked_reason || ''}>
      <AlertTriangle className="h-3 w-3" /> Bloqué
    </span>
  ) : null;

export const ResultBadges = ({ dossier }) => (
  <>
    {dossier.admission_result && (
      <span className={`${pill} ${dossier.admission_result === 'admis' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
        {RESULT_LABELS[dossier.admission_result]}
      </span>
    )}
    {dossier.visa_result && (
      <span className={`${pill} ${dossier.visa_result === 'obtenu' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
        {dossier.visa_result === 'obtenu' ? 'Visa obtenu' : 'Visa refusé'}
      </span>
    )}
  </>
);

/** Fraîcheur de la dernière mise à jour de l'équipe. */
export const UpdateFreshness = ({ dossier }) => {
  if (dossier.status !== 'actif') return null;
  const today = todayInNiamey();
  if (dossier.last_update_work_date === today) {
    return <span className="text-xs text-emerald-700">À jour aujourd’hui</span>;
  }
  if (!dossier.last_update_at) {
    return <span className="text-xs text-red-600 font-medium">Jamais mis à jour</span>;
  }
  return (
    <span className="text-xs text-red-600 font-medium">
      Dernier point : {new Date(dossier.last_update_at).toLocaleDateString('fr-FR')}
    </span>
  );
};

/** Barre d'avancement par étape (admission puis visa si inclus). */
export const StageProgress = ({ dossier, compact = false }) => {
  const current = STAGE_INDEX[dossier.stage] ?? 0;
  const stages = DOSSIER_STAGES.filter((s) => s.phase === 'admission' || dossier.includes_visa);
  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {stages.map((s) => {
          const index = STAGE_INDEX[s.code];
          const done = index < current;
          const active = index === current;
          return (
            <div
              key={s.code}
              title={s.label}
              className={`h-1.5 flex-1 rounded-full ${
                active ? 'bg-primary' : done ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          );
        })}
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Étape {current} / {stages.length - 1}
        </p>
      )}
    </div>
  );
};
