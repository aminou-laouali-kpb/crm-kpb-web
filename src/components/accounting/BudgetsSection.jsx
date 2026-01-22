import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Edit2, AlertTriangle, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { supabase } from "@/integrations/supabase/client";
import { budgetSchema, validateAccountingData } from '../../utils/accountingValidation';

const BudgetsSection = ({ selectedMonth, selectedYear, expenses }) => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    budgeted_amount: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch budgets for the selected period
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*, expense_categories(name, color, icon)')
        .eq('month', month)
        .eq('year', year);

      if (budgetsError) throw budgetsError;
      setBudgets(budgetsData || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error("Erreur lors du chargement des budgets");
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
        category_id: formData.category_id,
        budgeted_amount: parseFloat(formData.budgeted_amount)
      };

      // Validate input
      const validation = validateAccountingData(budgetSchema, dataToValidate);
      if (!validation.success) {
        toast.error(validation.error);
        return;
      }

      const budgetData = {
        ...validation.data,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        admin_id: user.id
      };

      if (selectedBudget) {
        const { error } = await supabase
          .from('budgets')
          .update({ budgeted_amount: budgetData.budgeted_amount })
          .eq('id', selectedBudget.id);

        if (error) throw error;
        toast.success("Budget modifié avec succès");
      } else {
        // Check if budget already exists for this category/month/year
        const existing = budgets.find(b => b.category_id === formData.category_id);
        if (existing) {
          toast.error("Un budget existe déjà pour cette catégorie ce mois-ci");
          return;
        }

        const { error } = await supabase
          .from('budgets')
          .insert([budgetData]);

        if (error) throw error;
        toast.success("Budget ajouté avec succès");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (budget) => {
    setSelectedBudget(budget);
    setFormData({
      category_id: budget.category_id,
      budgeted_amount: budget.budgeted_amount.toString()
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedBudget(null);
    setFormData({
      category_id: '',
      budgeted_amount: ''
    });
  };

  // Calculate spent amount per category from expenses
  const getSpentByCategory = (categoryId) => {
    return expenses
      .filter(exp => exp.category_id === categoryId)
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  };

  // Get categories without budgets
  const categoriesWithoutBudget = categories.filter(
    cat => !budgets.find(b => b.category_id === cat.id)
  );

  const totalBudgeted = budgets.reduce((sum, b) => sum + parseFloat(b.budgeted_amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + getSpentByCategory(b.category_id), 0);
  const budgetVariance = totalBudgeted - totalSpent;

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Budget total</p>
            <p className="text-xl font-bold">{formatCurrency(totalBudgeted, 'XOF')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Dépensé</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totalSpent, 'XOF')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Restant</p>
            <p className={`text-xl font-bold ${budgetVariance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {budgetVariance >= 0 ? '+' : ''}{formatCurrency(budgetVariance, 'XOF')}
            </p>
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
            <Button className="gap-2" disabled={categoriesWithoutBudget.length === 0 && !selectedBudget}>
              <Plus className="h-4 w-4" />
              Définir un budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedBudget ? 'Modifier le budget' : 'Nouveau budget'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Catégorie *</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  disabled={!!selectedBudget}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedBudget ? categories : categoriesWithoutBudget).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budgeted_amount">Montant budgété (XOF) *</Label>
                <Input
                  id="budgeted_amount"
                  type="number"
                  value={formData.budgeted_amount}
                  onChange={(e) => setFormData({ ...formData, budgeted_amount: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {selectedBudget ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget List */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Suivi des budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const spent = getSpentByCategory(budget.category_id);
                const budgeted = parseFloat(budget.budgeted_amount);
                const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                const isOverBudget = spent > budgeted;
                const remaining = budgeted - spent;

                return (
                  <div 
                    key={budget.id} 
                    className={`p-4 rounded-lg border transition-colors ${
                      isOverBudget ? 'border-destructive/50 bg-destructive/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: budget.expense_categories?.color || '#6b7280' }}
                        />
                        <span className="font-medium">{budget.expense_categories?.name}</span>
                        {isOverBudget && (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Dépassé
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(budget)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Dépensé: <span className={isOverBudget ? 'text-destructive font-medium' : ''}>
                            {formatCurrency(spent, 'XOF')}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Budget: {formatCurrency(budgeted, 'XOF')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {isOverBudget ? (
                          <>
                            <TrendingDown className="h-4 w-4 text-destructive" />
                            <span className="text-destructive font-medium">
                              Dépassement: {formatCurrency(Math.abs(remaining), 'XOF')} ({(percentage - 100).toFixed(0)}%)
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 text-success" />
                            <span className="text-success">
                              Restant: {formatCurrency(remaining, 'XOF')} ({(100 - percentage).toFixed(0)}%)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Aucun budget défini pour cette période
              </p>
              <p className="text-sm text-muted-foreground">
                Définissez des budgets par catégorie pour suivre vos dépenses
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unbudgeted Categories Alert */}
      {categoriesWithoutBudget.length > 0 && budgets.length > 0 && (
        <Card className="glass border-warning/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Catégories sans budget</p>
                <p className="text-sm text-muted-foreground">
                  {categoriesWithoutBudget.map(c => c.name).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetsSection;
