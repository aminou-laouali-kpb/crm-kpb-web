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
import { MIN_COMMENT_LENGTH } from '@/constants/dossiers';

/**
 * Action qui exige un commentaire (statut, blocage…). `options` ajoute un choix
 * obligatoire (ex. issue d'une clôture).
 */
const CommentActionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  commentLabel = 'Commentaire *',
  placeholder,
  options,
  optionLabel,
  confirmLabel = 'Valider',
  destructive = false,
  pending = false,
  onConfirm,
}) => {
  const [comment, setComment] = useState('');
  const [option, setOption] = useState('');

  useEffect(() => {
    if (open) {
      setComment('');
      setOption('');
    }
  }, [open]);

  const commentOk = comment.trim().length >= MIN_COMMENT_LENGTH;
  const canSubmit = commentOk && (!options || option) && !pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          {options && (
            <div className="grid gap-2">
              <Label>{optionLabel}</Label>
              <div className="flex flex-wrap gap-2">
                {options.map((o) => (
                  <Button
                    key={o.value}
                    type="button"
                    size="sm"
                    variant={option === o.value ? 'default' : 'outline'}
                    onClick={() => setOption(o.value)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="action-comment">{commentLabel}</Label>
            <Textarea
              id="action-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={placeholder}
            />
            {!commentOk && (
              <p className="text-xs text-muted-foreground">{MIN_COMMENT_LENGTH} caractères minimum.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={!canSubmit}
            onClick={() => onConfirm({ comment: comment.trim(), option })}
          >
            {pending ? 'Enregistrement…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentActionDialog;
