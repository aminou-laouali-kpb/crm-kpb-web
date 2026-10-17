import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DOSSIER_STAGES, STAGE_RESULTS, MIN_COMMENT_LENGTH, getStage } from '@/constants/dossiers';
import { useChangeStage } from '@/hooks/useDossiers';
import { studentName } from '@/utils/dossiers';

/** Changement d'étape : le commentaire est obligatoire (règle vérifiée aussi en base). */
const StageChangeDialog = ({ dossier, targetStage, open, onOpenChange }) => {
  const changeStage = useChangeStage();
  const [stage, setStage] = useState('');
  const [result, setResult] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open && dossier) {
      setStage(targetStage || dossier.stage);
      setResult('');
      setComment('');
    }
  }, [open, dossier, targetStage]);

  if (!dossier) return null;

  const results = STAGE_RESULTS[stage];
  const commentOk = comment.trim().length >= MIN_COMMENT_LENGTH;
  const canSubmit = commentOk && (!results || result) && !changeStage.isPending;

  const handleSubmit = async () => {
    await changeStage.mutateAsync({ dossierId: dossier.id, stage, comment: comment.trim(), result });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Changer l’étape</DialogTitle>
          <DialogDescription>
            {dossier.reference} — {studentName(dossier)} · actuellement : {getStage(dossier.stage).label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="stage-select">Nouvelle étape</Label>
            <select
              id="stage-select"
              value={stage}
              onChange={(e) => { setStage(e.target.value); setResult(''); }}
              className="w-full p-2 border rounded-md text-sm"
            >
              {DOSSIER_STAGES.map((s, index) => (
                <option key={s.code} value={s.code}>
                  {index}. {s.label}
                </option>
              ))}
            </select>
          </div>

          {results && (
            <div className="grid gap-2">
              <Label>Résultat *</Label>
              <div className="flex flex-wrap gap-2">
                {results.map((r) => (
                  <Button
                    key={r.value}
                    type="button"
                    size="sm"
                    variant={result === r.value ? 'default' : 'outline'}
                    onClick={() => setResult(r.value)}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="stage-comment">Commentaire *</Label>
            <Textarea
              id="stage-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ce qui a été fait, ce qui a déclenché le changement…"
            />
            {!commentOk && (
              <p className="text-xs text-muted-foreground">
                Obligatoire : {MIN_COMMENT_LENGTH} caractères minimum.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {changeStage.isPending ? 'Enregistrement…' : 'Valider le changement'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StageChangeDialog;
