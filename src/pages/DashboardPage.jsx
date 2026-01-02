import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const DashboardPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Generate available years (from 2020 to current year)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2020; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [timeFilter, selectedMonth, selectedYear]);

  const fetchInvoices = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      let query = supabase.from('invoices').select('*');

      const now = new Date();
      let startDate = null;
      let endDate = null;

      switch (timeFilter) {
        case 'week':
          startDate = new Date();
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'specific_month':
          if (selectedMonth && selectedYear) {
            const monthIndex = parseInt(selectedMonth) - 1;
            const year = parseInt(selectedYear);
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
          }
          break;
        case 'specific_year':
          if (selectedYear) {
            const year = parseInt(selectedYear);
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
          }
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    if (value !== 'specific_month' && value !== 'specific_year') {
      setSelectedMonth('');
      setSelectedYear('');
    } else if (value === 'specific_month' && !selectedYear) {
      setSelectedYear(new Date().getFullYear().toString());
      setSelectedMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
    } else if (value === 'specific_year' && !selectedYear) {
      setSelectedYear(new Date().getFullYear().toString());
    }
  };

  const getServiceStats = () => {
    const serviceMap = {};
    
    invoices.forEach(inv => {
      const service = inv.service_description || 'Non spécifié';
      if (!serviceMap[service]) {
        serviceMap[service] = {
          name: service,
          totalAmount: 0,
          paidAmount: 0,
          count: 0
        };
      }
      serviceMap[service].totalAmount += parseFloat(inv.amount);
      serviceMap[service].count += 1;
      if (inv.status === 'paid') {
        serviceMap[service].paidAmount += parseFloat(inv.amount);
      }
    });

    return Object.values(serviceMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
  };

  const getSalesRepStats = () => {
    const stats = {};
    const salesReps = ['Josphin', 'Nadia', 'Donald', 'Richard'];

    salesReps.forEach(rep => {
      const repInvoices = invoices.filter(inv => inv.sales_representative === rep);
      const totalAmount = repInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const paidInvoices = repInvoices.filter(inv => inv.status === 'paid');
      const paidAmount = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

      stats[rep] = {
        totalInvoices: repInvoices.length,
        totalAmount,
        paidInvoices: paidInvoices.length,
        paidAmount,
        pendingInvoices: repInvoices.length - paidInvoices.length
      };
    });

    return stats;
  };

  const getOverallStats = () => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    return {
      totalInvoices,
      totalAmount,
      paidInvoices: paidInvoices.length,
      paidAmount,
      pendingInvoices: totalInvoices - paidInvoices.length,
      pendingAmount: totalAmount - paidAmount
    };
  };

  if (authLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Chargement...</div>;
  }

  const salesRepStats = getSalesRepStats();
  const overallStats = getOverallStats();
  const serviceStats = getServiceStats();

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'week':
        return '7 derniers jours';
      case 'month':
        return '30 derniers jours';
      case 'year':
        return '365 derniers jours';
      case 'specific_month':
        const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';
        return `${monthLabel} ${selectedYear}`;
      case 'specific_year':
        return `Année ${selectedYear}`;
      default:
        return 'Toutes les périodes';
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <Button variant="ghost" onClick={() => navigate('/crm')} size="sm">
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Retour au CRM</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8 gap-3">
        <h1 className="text-xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard - Performances
        </h1>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
            <SelectTrigger className="w-full sm:w-48 glass border-primary/20 shadow-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">📅 7 derniers jours</SelectItem>
              <SelectItem value="month">📆 30 derniers jours</SelectItem>
              <SelectItem value="year">🗓️ 365 derniers jours</SelectItem>
              <SelectItem value="specific_month">📆 Mois spécifique</SelectItem>
              <SelectItem value="specific_year">🗓️ Année spécifique</SelectItem>
              <SelectItem value="all">🌐 Toutes les périodes</SelectItem>
            </SelectContent>
          </Select>

          {timeFilter === 'specific_month' && (
            <>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 glass border-primary/20 shadow-md">
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
            </>
          )}

          {timeFilter === 'specific_year' && (
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
          )}
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth animate-slide-up">
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Factures totales</h3>
          <p className="text-xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">{overallStats.totalInvoices}</p>
        </div>
        <div className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Montant total</h3>
          <p className="text-lg md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">{formatCurrency(overallStats.totalAmount, 'XOF')}</p>
        </div>
        <div className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Payées</h3>
          <p className="text-xl md:text-3xl font-bold text-success">{overallStats.paidInvoices}</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{formatCurrency(overallStats.paidAmount, 'XOF')}</p>
        </div>
        <div className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">En attente</h3>
          <p className="text-xl md:text-3xl font-bold text-warning">{overallStats.pendingInvoices}</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{formatCurrency(overallStats.pendingAmount, 'XOF')}</p>
        </div>
      </div>

      {/* Service Performance Chart */}
      <div className="glass p-4 md:p-6 rounded-xl shadow-md mb-6 md:mb-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-lg md:text-2xl font-semibold mb-4 flex items-center gap-2">
          <span className="bg-gradient-primary bg-clip-text text-transparent">Services les plus rentables</span>
          <span className="text-sm text-muted-foreground font-normal">({getTimeFilterLabel()})</span>
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={serviceStats} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={120}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)'
              }}
              formatter={(value) => formatCurrency(value, 'XOF')}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => value === 'totalAmount' ? 'Montant Total' : 'Montant Payé'}
            />
            <Bar 
              dataKey="totalAmount" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
              name="totalAmount"
            />
            <Bar 
              dataKey="paidAmount" 
              fill="hsl(var(--success))" 
              radius={[8, 8, 0, 0]}
              name="paidAmount"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sales Rep Stats */}
      <h2 className="text-lg md:text-2xl font-semibold mb-3 md:mb-4 bg-gradient-primary bg-clip-text text-transparent">
        Performances par Commercial
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        {Object.entries(salesRepStats).map(([rep, stats], idx) => (
          <div key={rep} className="glass p-4 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth animate-slide-up" style={{ animationDelay: `${0.5 + idx * 0.1}s` }}>
            <h3 className="text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3 md:mb-4">{rep}</h3>
            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center text-sm md:text-base">
                <span className="text-muted-foreground">Factures générées</span>
                <span className="font-semibold text-foreground">{stats.totalInvoices}</span>
              </div>
              <div className="flex justify-between items-center text-sm md:text-base">
                <span className="text-muted-foreground">Montant total</span>
                <span className="font-semibold text-foreground truncate ml-2">{formatCurrency(stats.totalAmount, 'XOF')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-success">Factures payées</span>
                <span className="font-semibold text-success">{stats.paidInvoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-success">Montant encaissé</span>
                <span className="font-semibold text-success">{formatCurrency(stats.paidAmount, 'XOF')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-warning">Factures en attente</span>
                <span className="font-semibold text-warning">{stats.pendingInvoices}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taux de conversion</span>
                  <span className="font-semibold text-accent">
                    {stats.totalInvoices > 0 
                      ? `${((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
