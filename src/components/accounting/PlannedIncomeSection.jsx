import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Check, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { supabase } from "@/integrations/supabase/client";
import { plannedIncomeSchema, validateAccountingData } from '../../utils/accountingValidation';
import { getMonthDateStrings, todayLocalDateStr } from '@/utils/dateRange';

const PlannedIncomeSection = ({ selectedMonth, selectedYear, onDataChange }) => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    source: '',
    is_recurring: false,
    recurrence_type: null,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { startDateStr, endDateStr } = getMonthDateStrings(selectedMonth, selectedYear);

      const { data, error } = await supabase
        .from('planned_income')
        .select('*')
        .gte('due_date', startDateStr)
        .lte('due_date', endDateStr)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Auto-update overdue status
      const today = todayLocalDateStr();
      const updatedIncomes = (data || []).map(income => {
        if (income.status === 'pending' && income.due_date < today) {
          return { ...income, status: 'overdue' };
        }
        return income;
      });
      
      setIncomes(updatedIncomes);
    } catch (error) {
      console.error('Error fetching incomes:', error);
      toast.error("Erreur lors du chargement des entrées");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Prepare data for validation
      const dataToValidate = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status,
        source: formData.source || null,
        is_recurring: formData.is_recurring || false,
        recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
        notes: formData.notes || null
      };

      // Validate input
      const validation = validateAccountingData(plannedIncomeSchema, dataToValidate);
      if (!validation.success) {
        toast.error(validation.error);
        return;
      }

      const incomeData = {
        ...validation.data,
        admin_id: user.id
      };

      if (selectedIncome) {
        const { error } = await supabase
          .from('planned_income')
          .update(incomeData)
          .eq('id', selectedIncome.id);

        if (error) throw error;
        toast.success("Entrée modifiée avec succès");
      } else {
        const { error } = await supabase
          .from('planned_income')
          .insert([incomeData]);

        if (error) throw error;
        toast.success("Entrée ajoutée avec succès");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
      onDataChange?.();
    } catch (error) {
      console.error('Error saving income:', error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (income) => {
    setSelectedIncome(income);
    setFormData({
      description: income.description,
      amount: income.amount.toString(),
      due_date: income.due_date,
      status: income.status,
      source: income.source || '',
      is_recurring: income.is_recurring || false,
      recurrence_type: income.recurrence_type,
      notes: income.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('planned_income')
        .delete()
        .eq('id', selectedIncome.id);

      if (error) throw error;
      
      toast.success("Entrée supprimée");
      setDeleteDialogOpen(false);
      setSelectedIncome(null);
      fetchData();
      onDataChange?.();
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleMarkReceived = async (income) => {
    try {
      const { error } = await supabase
        .from('planned_income')
        .update({ status: 'received' })
        .eq('id', income.id);

      if (error) throw error;
      toast.success("Marqué comme reçu");
      fetchData();
      onDataChange?.();
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const resetForm = () => {
    setSelectedIncome(null);
    setFormData({
      description: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      source: '',
      is_recurring: false,
      recurrence_type: null,
      notes: ''
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'received':
        return <Check className="h-4 w-4 text-success" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'received':
        return 'Reçu';
      case 'overdue':
        return 'En retard';
      default:
        return 'En attente';
    }
  };

  const totalPlanned = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
  const receivedAmount = incomes.filter(i => i.status === 'received').reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
  const overdueAmount = incomes.filter(i => i.status === 'overdue').reduce((sum, inc) => sum + parseFloat(inc.amount), 0);

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total planifié</p>
            <p className="text-xl font-bold">{formatCurrency(totalPlanned, 'XOF')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Reçu</p>
            <p className="text-xl font-bold text-success">{formatCurrency(receivedAmount, 'XOF')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">En retard</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(overdueAmount, 'XOF')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une entrée
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedIncome ? 'Modifier l\'entrée' : 'Nouvelle entrée planifiée'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Montant (XOF) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Date d'échéance *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Client, Partenaire..."
                  />
                </div>
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="received">Reçu</SelectItem>
                      <SelectItem value="overdue">En retard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    is_recurring: checked,
                    recurrence_type: checked ? 'monthly' : null 
                  })}
                />
                <Label htmlFor="is_recurring" className="cursor-pointer">Récurrent</Label>
              </div>
              {formData.is_recurring && (
                <div>
                  <Label htmlFor="recurrence_type">Fréquence</Label>
                  <Select 
                    value={formData.recurrence_type || ''} 
                    onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="quarterly">Trimestriel</SelectItem>
                      <SelectItem value="yearly">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {selectedIncome ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Income List */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Entrées planifiées</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length > 0 ? (
            <div className="space-y-2">
              {incomes.map((income) => (
                <div 
                  key={income.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    income.status === 'overdue' ? 'border-destructive/50 bg-destructive/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {income.is_recurring && (
                      <RefreshCw className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">{income.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {income.source && `${income.source} • `}
                        Échéance: {new Date(income.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(income.amount, 'XOF')}</p>
                      <div className={`inline-flex items-center gap-1 text-xs ${
                        income.status === 'received' ? 'text-success' : 
                        income.status === 'overdue' ? 'text-destructive' : 'text-warning'
                      }`}>
                        {getStatusIcon(income.status)}
                        {getStatusLabel(income.status)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {income.status !== 'received' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleMarkReceived(income)}
                          title="Marquer comme reçu"
                        >
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(income)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedIncome(income);
                          setDeleteDialogOpen(true);
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
            <p className="text-center text-muted-foreground py-8">
              Aucune entrée planifiée pour cette période
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'entrée sera définitivement supprimée.
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

export default PlannedIncomeSection;
