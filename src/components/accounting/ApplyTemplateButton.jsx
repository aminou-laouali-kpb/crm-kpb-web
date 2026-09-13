import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatCurrency';
import { buildMonthlyPreview, applyMonthlyTemplate } from '@/utils/expenseTemplates';
import { getMonthLabel } from '@/constants/months';

const ApplyTemplateButton = ({ selectedMonth, selectedYear, onApplied, variant = 'outline' }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({ items: [], skipped: [] });

  const month = parseInt(selectedMonth, 10);
  const year = parseInt(selectedYear, 10);

  const loadPreview = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const monthIndex = month - 1;
      const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
      const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

      const [{ data: templates, error: tplError }, { data: existing, error: expError }] =
        await Promise.all([
          supabase.from('expense_templates').select('*').eq('is_active', true).order('description'),
          supabase
            .from('expenses')
            .select('description')
            .gte('expense_date', startDate)
            .lte('expense_date', endDate),
        ]);

      if (tplError) throw tplError;
      if (expError) throw expError;

      const result = await buildMonthlyPreview(templates || [], month, year, existing || []);
      setPreview(result);
    } catch (error) {
      console.error('Erreur aperçu modèle:', error);
      toast.error("Impossible de préparer le modèle");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const count = await applyMonthlyTemplate(preview.items);
      toast.success(`${count} dépense(s) ajoutée(s) pour ${getMonthLabel(selectedMonth)} ${year}`);
      setOpen(false);
      onApplied?.();
    } catch (error) {
      console.error('Erreur application modèle:', error);
      toast.error("Erreur lors de l'application du modèle");
    } finally {
      setSaving(false);
    }
  };

  const total = preview.items.reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <Button variant={variant} onClick={loadPreview} className="gap-2">
        <CalendarPlus className="h-4 w-4" />
        Appliquer le modèle
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Modèle mensuel — {getMonthLabel(selectedMonth)} {year}
            </DialogTitle>
            <DialogDescription>
              Les dépenses ci-dessous seront créées en statut « En attente ». Tu pourras les
              modifier ensuite.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Préparation...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-72 overflow-y-auto space-y-1">
                {preview.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm border rounded-md px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.commission > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Base {formatCurrency(item.base_amount, 'XOF')} + commissions{' '}
                          {formatCurrency(item.commission, 'XOF')}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold">{formatCurrency(item.amount, 'XOF')}</span>
                  </div>
                ))}
                {preview.items.length === 0 && (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    Rien à ajouter — tout est déjà saisi pour ce mois.
                  </p>
                )}
              </div>

              {preview.skipped.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {preview.skipped.length} ligne(s) déjà présente(s) ce mois : ignorée(s).
                </p>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  Total à ajouter ({preview.items.length})
                </span>
                <span className="font-bold">{formatCurrency(total, 'XOF')}</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleApply} disabled={saving || preview.items.length === 0}>
                  {saving ? 'Ajout...' : 'Ajouter au mois'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApplyTemplateButton;
