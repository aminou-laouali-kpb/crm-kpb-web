import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '../hooks/useAuth';
import { useAccountingAccess } from '../hooks/useAccountingAccess';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar,
  PlusCircle,
  Receipt,
  PiggyBank,
  AlertTriangle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import ExpensesSection from '../components/accounting/ExpensesSection';
import PlannedIncomeSection from '../components/accounting/PlannedIncomeSection';
import BudgetsSection from '../components/accounting/BudgetsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportAccountingToExcel, exportAccountingToPDF } from '../utils/accountingExport';

const MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const AccountingPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { hasAccess, isAdmin, loading: accessLoading } = useAccountingAccess();
  
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [plannedIncome, setPlannedIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear + 1; year >= 2020; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  useEffect(() => {
    if (!accessLoading && !hasAccess) {
      toast.error("Accès réservé aux administrateurs et comptables");
      navigate('/crm');
    }
  }, [hasAccess, accessLoading, navigate]);

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    }
  }, [selectedMonth, selectedYear, hasAccess]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const monthIndex = parseInt(selectedMonth) - 1;
      const year = parseInt(selectedYear);
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

      // Fetch paid invoices (revenue from sales)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (invoicesError) throw invoicesError;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*, expense_categories(name, color, icon)')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);

      if (expensesError) throw expensesError;

      // Fetch planned income
      const { data: incomeData, error: incomeError } = await supabase
        .from('planned_income')
        .select('*')
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0]);

      if (incomeError) throw incomeError;

      setInvoices(invoicesData || []);
      setExpenses(expensesData || []);
      setPlannedIncome(incomeData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';
    return `${monthLabel} ${selectedYear}`;
  };

  const getFinancialStats = () => {
    // Revenue from sales
    const salesRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    
    // Other income (received)
    const otherIncome = plannedIncome
      .filter(inc => inc.status === 'received')
      .reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    
    const totalRevenue = salesRevenue + otherIncome;
    
    // Total expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const paidExpenses = expenses
      .filter(exp => exp.status === 'paid')
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    // Net balance
    const netBalance = totalRevenue - totalExpenses;
    
    // Pending income
    const pendingIncome = plannedIncome
      .filter(inc => inc.status === 'pending')
      .reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    
    // Overdue income
    const overdueIncome = plannedIncome
      .filter(inc => inc.status === 'overdue')
      .reduce((sum, inc) => sum + parseFloat(inc.amount), 0);

    return {
      salesRevenue,
      otherIncome,
      totalRevenue,
      totalExpenses,
      paidExpenses,
      netBalance,
      pendingIncome,
      overdueIncome,
      salesCount: invoices.length,
      expensesCount: expenses.length
    };
  };

  const getExpensesByCategory = () => {
    const categoryMap = {};
    
    expenses.forEach(exp => {
      const categoryName = exp.expense_categories?.name || 'Non catégorisé';
      const categoryColor = exp.expense_categories?.color || '#6b7280';
      
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          amount: 0,
          color: categoryColor
        };
      }
      categoryMap[categoryName].amount += parseFloat(exp.amount);
    });

    return Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
  };

  if (authLoading || accessLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Chargement...</div>;
  }

  if (!hasAccess) {
    return null;
  }

  const stats = getFinancialStats();
  const expensesByCategory = getExpensesByCategory();

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <Button variant="ghost" onClick={() => navigate('/crm')} size="sm">
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Retour au CRM</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Comptabilité
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            📅 {getPeriodLabel()}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36 glass border-primary/20 shadow-md">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 glass border-primary/20 shadow-md">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Export buttons */}
          <div className="flex gap-2 ml-auto sm:ml-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                await exportAccountingToExcel(
                  { invoices, expenses, plannedIncome, stats, expensesByCategory },
                  getPeriodLabel()
                );
                toast.success("Export Excel téléchargé");
              }}
              className="flex items-center gap-1 text-xs"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                exportAccountingToPDF(
                  { invoices, expenses, plannedIncome, stats, expensesByCategory },
                  getPeriodLabel()
                );
                toast.success("Export PDF téléchargé");
              }}
              className="flex items-center gap-1 text-xs"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full mb-6 ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Dépenses</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="income" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Entrées</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="budgets" className="flex items-center gap-1">
              <PiggyBank className="h-4 w-4" />
              <span className="hidden sm:inline">Budgets</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Financial Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Card className="glass shadow-md hover:shadow-glow transition-smooth">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Revenus totaux
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg md:text-2xl font-bold text-success">{formatCurrency(stats.totalRevenue, 'XOF')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.salesCount} ventes payées
                </p>
              </CardContent>
            </Card>

            <Card className="glass shadow-md hover:shadow-glow transition-smooth">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Dépenses totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg md:text-2xl font-bold text-destructive">{formatCurrency(stats.totalExpenses, 'XOF')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.expensesCount} dépenses
                </p>
              </CardContent>
            </Card>

            <Card className="glass shadow-md hover:shadow-glow transition-smooth">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Solde net
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-lg md:text-2xl font-bold ${stats.netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.netBalance >= 0 ? '+' : ''}{formatCurrency(stats.netBalance, 'XOF')}
                </p>
              </CardContent>
            </Card>

            <Card className="glass shadow-md hover:shadow-glow transition-smooth">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  En attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg md:text-2xl font-bold text-warning">{formatCurrency(stats.pendingIncome, 'XOF')}</p>
                {stats.overdueIncome > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    ⚠️ {formatCurrency(stats.overdueIncome, 'XOF')} en retard
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Répartition des revenus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-success/10 border border-success/20">
                    <span className="text-muted-foreground">Ventes (factures payées)</span>
                    <span className="font-bold text-success">{formatCurrency(stats.salesRevenue, 'XOF')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-muted-foreground">Autres entrées reçues</span>
                    <span className="font-bold text-primary">{formatCurrency(stats.otherIncome, 'XOF')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Dépenses par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {expensesByCategory.length > 0 ? (
                    expensesByCategory.map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-sm">{cat.name}</span>
                        </div>
                        <span className="font-semibold text-sm">{formatCurrency(cat.amount, 'XOF')}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      Aucune dépense ce mois
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {expensesByCategory.length > 0 && (
            <Card className="glass shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Visualisation des dépenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expensesByCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => formatCurrency(value, 'XOF')}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))" 
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <ExpensesSection 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear}
            onDataChange={fetchData}
          />
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income">
          <PlannedIncomeSection 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear}
            onDataChange={fetchData}
          />
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets">
          <BudgetsSection 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear}
            expenses={expenses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingPage;
