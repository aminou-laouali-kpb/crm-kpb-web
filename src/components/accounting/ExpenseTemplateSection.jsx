import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatCurrency';
import ApplyTemplateButton from './ApplyTemplateButton';

const emptyForm = {
  description: '',
  amount: '',
  category_id: '',
  day_of_month: '5',
  active_from: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  active_to: '',
  months_pattern: '',
  notes: '',
  is_active: true,
};

const ExpenseTemplateSection = ({ selectedMonth, selectedYear, onDataChange }) => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [{ data: tpls, error: tErr }, { data: cats, error: cErr }] = await Promise.all([
        supabase.from('expense_templates').select('*, expense_categories(name, color)').order('description'),
        supabase.from('expense_categories').select('*').order('name'),
      ]);
      if (tErr) throw tErr;
      if (cErr) throw cErr;
      setTemplates(tpls || []);
      setCategories(cats || []);
    } catch (error) {
      console.error('Erreur chargement modèle:', error);
      toast.error('Erreur lors du chargement du modèle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setSelected(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (!formData.description.trim() || !Number.isFinite(amount) || amount < 0) {
      toast.error('Description et montant valides requis');
      return;
    }

    const payload = {
      description: formData.description.trim(),
      amount,
      category_id: formData.category_id || null,
      day_of_month: parseInt(formData.day_of_month, 10) || 1,
      active_from: formData.active_from,
      active_to: formData.active_to || null,
      months_pattern: formData.months_pattern
        ? formData.months_pattern
            .split(',')
            .map((v) => parseInt(v.trim(), 10))
            .filter((v) => v >= 1 && v <= 12)
        : null,
      notes: formData.notes || null,
      is_active: formData.is_active,
    };

    try {
      if (selected) {
        const { error } = await supabase.from('expense_templates').update(payload).eq('id', selected.id);
        if (error) throw error;
        toast.success('Ligne du modèle modifiée');
      } else {
        const { error } = await supabase.from('expense_templates').insert([payload]);
        if (error) throw error;
        toast.success('Ligne ajoutée au modèle');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erreur sauvegarde modèle:', error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (tpl) => {
    setSelected(tpl);
    setFormData({
      description: tpl.description,
      amount: String(tpl.amount),
      category_id: tpl.category_id || '',
      day_of_month: String(tpl.day_of_month || 1),
      active_from: tpl.active_from || '',
      active_to: tpl.active_to || '',
      months_pattern: Array.isArray(tpl.months_pattern) ? tpl.months_pattern.join(',') : '',
      notes: tpl.notes || '',
      is_active: tpl.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('expense_templates').delete().eq('id', selected.id);
      if (error) throw error;
      toast.success('Ligne supprimée');
      setDeleteOpen(false);
      setSelected(null);
      fetchData();
    } catch (error) {
      console.error('Erreur suppression modèle:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  const total = templates
    .filter((t) => t.is_active)
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Base mensuelle (hors commissions)</p>
          <p className="text-2xl font-bold">{formatCurrency(total, 'XOF')}</p>
        </div>
        <div className="flex gap-2">
          <ApplyTemplateButton
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onApplied={onDataChange}
          />
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une ligne
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selected ? 'Modifier la ligne' : 'Nouvelle ligne du modèle'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="tpl-description">Description *</Label>
                  <Input
                    id="tpl-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tpl-amount">Montant (XOF) *</Label>
                    <Input
                      id="tpl-amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tpl-day">Jour du mois</Label>
                    <Input
                      id="tpl-day"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tpl-from">À partir du</Label>
                    <Input
                      id="tpl-from"
                      type="date"
                      value={formData.active_from}
                      onChange={(e) => setFormData({ ...formData, active_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tpl-to">Jusqu'au (optionnel)</Label>
                    <Input
                      id="tpl-to"
                      type="date"
                      value={formData.active_to}
                      onChange={(e) => setFormData({ ...formData, active_to: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tpl-months">Mois concernés (ex : 4,6,8 — vide = tous)</Label>
                  <Input
                    id="tpl-months"
                    value={formData.months_pattern}
                    onChange={(e) => setFormData({ ...formData, months_pattern: e.target.value })}
                    placeholder="Tous les mois"
                  />
                </div>
                <div>
                  <Label htmlFor="tpl-notes">Notes</Label>
                  <Input
                    id="tpl-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Ligne active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">{selected ? 'Modifier' : 'Ajouter'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Dépenses récurrentes</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                    tpl.is_active ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tpl.expense_categories?.color || '#6b7280' }}
                    />
                    <div>
                      <p className="font-medium">{tpl.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tpl.expense_categories?.name || 'Non catégorisé'} • jour {tpl.day_of_month}
                        {tpl.active_to ? ` • jusqu'au ${tpl.active_to}` : ''}
                        {Array.isArray(tpl.months_pattern) && tpl.months_pattern.length > 0
                          ? ` • mois ${tpl.months_pattern.join(', ')}`
                          : ''}
                      </p>
                      {tpl.notes && <p className="text-xs text-muted-foreground">{tpl.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(tpl.amount, 'XOF')}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(tpl)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelected(tpl);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Aucune ligne dans le modèle</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ligne du modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les dépenses déjà créées ne seront pas supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseTemplateSection;
