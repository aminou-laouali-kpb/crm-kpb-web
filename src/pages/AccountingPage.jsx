import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAccountingAccess } from '../hooks/useAccountingAccess';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  PlusCircle,
  Receipt,
  PiggyBank,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  FileDown,
  CalendarPlus,
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
import ExpenseTemplateSection from '../components/accounting/ExpenseTemplateSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MONTHS, getAvailableYears } from '@/constants/months';
import { useAccountingData } from '@/hooks/useAccountingData';
import AppLayout from '@/components/layout/AppLayout';
import { exportAccountingToExcel, exportAccountingToPDF, exportAccountingToCSV } from '../utils/accountingExport';
import { computeFinancialStats, groupExpensesByCategory } from '../utils/accountingStats';
import PeriodExportDialog from '../components/accounting/PeriodExportDialog';

const AccountingPage = () => {
  const navigate = useNavigate();
  const { hasAccess, isAdmin, loading: accessLoading } = useAccountingAccess();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const [activeTab, setActiveTab] = useState('overview');

  const periodDates = useMemo(() => {
    const monthIndex = parseInt(selectedMonth) - 1;
    const year = parseInt(selectedYear);
    return {
      startDate: new Date(year, monthIndex, 1),
      endDate: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
    };
  }, [selectedMonth, selectedYear]);

  const { invoices, expenses, plannedIncome, isLoading: loading, refetch } = useAccountingData(
    periodDates.startDate,
    periodDates.endDate,
    hasAccess
  );

  const availableYears = useMemo(() => getAvailableYears(), []);

  useEffect(() => {
    if (!accessLoading && !hasAccess) {
      toast.error("Accès réservé aux administrateurs et comptables");
      navigate('/crm');
    }
  }, [hasAccess, accessLoading, navigate]);

  const getPeriodLabel = () => {
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';
    return `${monthLabel} ${selectedYear}`;
  };

  if (accessLoading || loading) {
    return (
      <AppLayout title="Comptabilité">
        <div className="py-8">Chargement...</div>
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const stats = computeFinancialStats(invoices, expenses, plannedIncome);
  const expensesByCategory = groupExpensesByCategory(expenses);

  return (
    <AppLayout title="Comptabilité" subtitle={getPeriodLabel()}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
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
            <PeriodExportDialog />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportAccountingToCSV(
                  { invoices, expenses, plannedIncome, stats },
                  getPeriodLabel()
                );
                toast.success("Export CSV téléchargé");
              }}
              className="flex items-center gap-1 text-xs"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full mb-6 ${isAdmin ? 'grid-cols-5' : 'grid-cols-2'}`}>
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
          {isAdmin && (
            <TabsTrigger value="template" className="flex items-center gap-1">
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Modèle</span>
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
            onDataChange={refetch}
          />
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income">
          <PlannedIncomeSection 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear}
            onDataChange={refetch}
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

        {/* Template Tab */}
        <TabsContent value="template">
          <ExpenseTemplateSection
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onDataChange={refetch}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default AccountingPage;
