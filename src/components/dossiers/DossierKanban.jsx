import { useState } from 'react';
import { DOSSIER_STAGES } from '@/constants/dossiers';
import { BlockedBadge, PaymentBadge, ResultBadges } from '@/components/dossiers/DossierBits';
import StageChangeDialog from '@/components/dossiers/StageChangeDialog';
import { isDossierMine, needsDailyUpdate, studentName, todayInNiamey } from '@/utils/dossiers';

/** Vue Kanban par étape ; glisser une carte ouvre le changement d'étape (commentaire obligatoire). */
const DossierKanban = ({ dossiers, onOpen, canEditDossier, names, userId }) => {
  const [drop, setDrop] = useState(null); // { dossier, stage }
  const [dragOver, setDragOver] = useState(null);
  const today = todayInNiamey();

  const onDrop = (stage, e) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const dossier = dossiers.find((d) => d.id === id);
    if (dossier && dossier.stage !== stage && canEditDossier(dossier)) {
      setDrop({ dossier, stage });
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {DOSSIER_STAGES.map((stage, index) => {
          const items = dossiers.filter((d) => d.stage === stage.code);
          return (
            <div
              key={stage.code}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage.code); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(stage.code, e)}
              className={`w-64 shrink-0 rounded-lg border bg-muted/30 flex flex-col max-h-[70vh] ${
                dragOver === stage.code ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="p-2 border-b bg-card rounded-t-lg">
                <p className="text-xs font-semibold" title={stage.label}>
                  {index}. {stage.short}
                </p>
                <p className="text-xs text-muted-foreground">{items.length} dossier(s)</p>
              </div>
              <div className="p-2 space-y-2 overflow-y-auto">
                {items.map((d) => {
                  const editable = canEditDossier(d);
                  const late = needsDailyUpdate(d, today) && isDossierMine(d, userId);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      draggable={editable}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', d.id)}
                      onClick={() => onOpen(d)}
                      className={`w-full text-left rounded-md border bg-card p-2 space-y-1 hover:border-primary transition-colors ${
                        editable ? 'cursor-grab' : ''
                      } ${late ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      <p className="text-sm font-medium truncate">{studentName(d)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.reference} · {d.assigned_to ? names[d.assigned_to] || 'Agent' : 'Non affecté'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <BlockedBadge dossier={d} />
                        {d.payment_status !== 'paye' && <PaymentBadge paymentStatus={d.payment_status} />}
                        <ResultBadges dossier={d} />
                      </div>
                      {d.next_action && (
                        <p className={`text-xs truncate ${d.next_action_due && d.next_action_due < today ? 'text-red-600' : 'text-muted-foreground'}`}>
                          → {d.next_action}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <StageChangeDialog
        dossier={drop?.dossier}
        targetStage={drop?.stage}
        open={Boolean(drop)}
        onOpenChange={(o) => !o && setDrop(null)}
      />
    </>
  );
};

export default DossierKanban;
