import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Calendar, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MONTHS = [
  { value: '0', label: 'Janvier' },
  { value: '1', label: 'Février' },
  { value: '2', label: 'Mars' },
  { value: '3', label: 'Avril' },
  { value: '4', label: 'Mai' },
  { value: '5', label: 'Juin' },
  { value: '6', label: 'Juillet' },
  { value: '7', label: 'Août' },
  { value: '8', label: 'Septembre' },
  { value: '9', label: 'Octobre' },
  { value: '10', label: 'Novembre' },
  { value: '11', label: 'Décembre' },
];

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push({ value: i.toString(), label: i.toString() });
  }
  return years;
};

const getLast3Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      label: `${MONTHS[date.getMonth()].label} ${date.getFullYear()}`
    });
  }
  return months;
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];

const ReportsPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

  const last3Months = getLast3Months();
  const yearOptions = getYearOptions();

  useEffect(() => {
    fetchInvoices();
  }, [selectedMonth, selectedYear]);

  // Calculer les dates de début et fin de la période sélectionnée
  const getPeriodDates = () => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Utiliser la fonction RPC get_invoice_stats qui retourne aussi last_status_change
      // pour pouvoir filtrer les paiements par date de paiement
      const { data, error } = await supabase.rpc('get_invoice_stats', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (month, year) => {
    setSelectedMonth(month.toString());
    setSelectedYear(year.toString());
  };

  const getServiceStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const serviceMap = {};
    
    invoices.forEach(inv => {
      const service = inv.service_description || 'Non spécifié';
      const createdAt = new Date(inv.created_at);
      const isCreatedInPeriod = createdAt >= startDate && createdAt <= endDate;
      
      if (!serviceMap[service]) {
        serviceMap[service] = {
          name: service,
          totalAmount: 0,
          paidAmount: 0,
          count: 0
        };
      }
      
      // Comptabiliser le total seulement si créé dans la période
      if (isCreatedInPeriod) {
        serviceMap[service].totalAmount += parseFloat(inv.amount);
        serviceMap[service].count += 1;
      }
      
      // Comptabiliser le paiement seulement si payé dans la période (basé sur last_status_change)
      if (inv.status === 'paid' && inv.last_status_change) {
        const paymentDate = new Date(inv.last_status_change);
        if (paymentDate >= startDate && paymentDate <= endDate) {
          serviceMap[service].paidAmount += parseFloat(inv.amount);
        }
      }
    });

    return Object.values(serviceMap)
      .filter(s => s.count > 0 || s.paidAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
  };

  const getSalesRepStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const stats = {};
    const salesReps = ['Josphin', 'Nadia', 'Donald', 'Richard'];

    salesReps.forEach(rep => {
      // Factures créées dans la période (basé sur created_at)
      const repInvoicesCreated = invoices.filter(inv => {
        if (inv.sales_representative !== rep) return false;
        const createdAt = new Date(inv.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      });
      
      // Factures payées dans la période (basé sur last_status_change)
      const repInvoicesPaid = invoices.filter(inv => {
        if (inv.sales_representative !== rep || inv.status !== 'paid') return false;
        if (!inv.last_status_change) return false;
        const paymentDate = new Date(inv.last_status_change);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
      
      const totalAmount = repInvoicesCreated.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const paidAmount = repInvoicesPaid.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

      stats[rep] = {
        totalInvoices: repInvoicesCreated.length,
        totalAmount,
        paidInvoices: repInvoicesPaid.length,
        paidAmount,
        pendingInvoices: repInvoicesCreated.length - repInvoicesPaid.length,
        pendingAmount: totalAmount - paidAmount
      };
    });

    return stats;
  };

  const getStatusStats = () => {
    const statusMap = {
      generated: { name: 'Générées', count: 0, amount: 0 },
      sent: { name: 'Envoyées', count: 0, amount: 0 },
      awaiting_payment: { name: 'En attente', count: 0, amount: 0 },
      to_follow_up: { name: 'À relancer', count: 0, amount: 0 },
      paid: { name: 'Payées', count: 0, amount: 0 }
    };

    invoices.forEach(inv => {
      if (statusMap[inv.status]) {
        statusMap[inv.status].count += 1;
        statusMap[inv.status].amount += parseFloat(inv.amount);
      }
    });

    return Object.values(statusMap).filter(s => s.count > 0);
  };

  const getPaymentTypeStats = () => {
    const paymentMap = {};
    
    invoices.forEach(inv => {
      const type = inv.payment_type || 'Non spécifié';
      if (!paymentMap[type]) {
        paymentMap[type] = { name: type, count: 0, amount: 0 };
      }
      paymentMap[type].count += 1;
      paymentMap[type].amount += parseFloat(inv.amount);
    });

    return Object.values(paymentMap);
  };

  const getOverallStats = () => {
    const { startDate, endDate } = getPeriodDates();
    
    // Factures créées dans la période (pour le total)
    const invoicesCreated = invoices.filter(inv => {
      const createdAt = new Date(inv.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });
    
    // Factures payées dans la période (basé sur last_status_change)
    const invoicesPaidInPeriod = invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.last_status_change) return false;
      const paymentDate = new Date(inv.last_status_change);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    
    const totalInvoices = invoicesCreated.length;
    const totalAmount = invoicesCreated.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const paidAmount = invoicesPaidInPeriod.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    return {
      totalInvoices,
      totalAmount,
      paidInvoices: invoicesPaidInPeriod.length,
      paidAmount,
      pendingInvoices: totalInvoices - invoicesPaidInPeriod.length,
      pendingAmount: totalAmount - paidAmount,
      conversionRate: totalInvoices > 0 ? ((invoicesPaidInPeriod.length / totalInvoices) * 100).toFixed(1) : 0
    };
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setExporting(true);
    toast.info("Génération du PDF en cours...");

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const monthLabel = MONTHS[parseInt(selectedMonth)].label;
      const fileName = `Rapport_${monthLabel}_${selectedYear}.pdf`;
      pdf.save(fileName);

      toast.success("Rapport PDF exporté avec succès!");
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Chargement...</div>;
  }

  const overallStats = getOverallStats();
  const salesRepStats = getSalesRepStats();
  const serviceStats = getServiceStats();
  const statusStats = getStatusStats();
  const paymentTypeStats = getPaymentTypeStats();
  const periodLabel = `${MONTHS[parseInt(selectedMonth)].label} ${selectedYear}`;

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <Button variant="ghost" onClick={() => navigate('/crm')} size="sm">
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Retour au CRM</span>
        </Button>
        <Button 
          onClick={exportToPDF} 
          disabled={exporting || invoices.length === 0}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Export en cours...' : 'Exporter PDF'}
        </Button>
      </div>

      {/* Period Filter */}
      <div className="glass p-4 rounded-xl mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Sélectionner la période
        </h3>
        
        {/* Quick Select - Last 3 Months */}
        <div className="flex flex-wrap gap-2 mb-4">
          {last3Months.map((m, idx) => (
            <Button
              key={idx}
              variant={selectedMonth === m.month.toString() && selectedYear === m.year.toString() ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickSelect(m.month, m.year)}
              className={selectedMonth === m.month.toString() && selectedYear === m.year.toString() 
                ? "bg-gradient-primary" 
                : ""}
            >
              {m.label}
            </Button>
          ))}
        </div>

        {/* Custom Selection */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-48">
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
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-background p-6 rounded-xl">
        {/* Header */}
        <div className="text-center mb-8 border-b border-border pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Rapport Mensuel
          </h1>
          <p className="text-lg text-primary font-semibold">{periodLabel}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Aucune facture pour cette période</p>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Résumé Global</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm text-muted-foreground">Factures totales</h3>
                  <p className="text-2xl font-bold text-foreground">{overallStats.totalInvoices}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm text-muted-foreground">Montant total</h3>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(overallStats.totalAmount, 'XOF')}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm text-muted-foreground">Montant encaissé</h3>
                  <p className="text-xl font-bold text-success">{formatCurrency(overallStats.paidAmount, 'XOF')}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm text-muted-foreground">Taux de conversion</h3>
                  <p className="text-2xl font-bold text-primary">{overallStats.conversionRate}%</p>
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Répartition par Statut</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusStats}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {statusStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {statusStats.map((status, idx) => (
                    <div key={status.name} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-foreground">{status.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{status.count} factures</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(status.amount, 'XOF')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Chart */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Performances par Service</h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={serviceStats} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--foreground))' }}
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
                    <Legend formatter={(value) => value === 'totalAmount' ? 'Montant Total' : 'Montant Payé'} />
                    <Bar dataKey="totalAmount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="totalAmount" />
                    <Bar dataKey="paidAmount" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="paidAmount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Types */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Modes de Paiement</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {paymentTypeStats.map((type, idx) => (
                  <div key={type.name} className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground">{type.name}</h3>
                    <p className="text-2xl font-bold text-primary mt-1">{type.count}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(type.amount, 'XOF')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales Rep Performance */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Performances par Commercial</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-foreground">Commercial</th>
                      <th className="text-center p-3 text-foreground">Factures</th>
                      <th className="text-right p-3 text-foreground">Montant Total</th>
                      <th className="text-center p-3 text-foreground">Payées</th>
                      <th className="text-right p-3 text-foreground">Montant Encaissé</th>
                      <th className="text-center p-3 text-foreground">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(salesRepStats).map(([rep, stats]) => (
                      <tr key={rep} className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">{rep}</td>
                        <td className="text-center p-3 text-foreground">{stats.totalInvoices}</td>
                        <td className="text-right p-3 text-foreground">{formatCurrency(stats.totalAmount, 'XOF')}</td>
                        <td className="text-center p-3 text-success">{stats.paidInvoices}</td>
                        <td className="text-right p-3 text-success">{formatCurrency(stats.paidAmount, 'XOF')}</td>
                        <td className="text-center p-3 font-semibold text-primary">
                          {stats.totalInvoices > 0 
                            ? `${((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(0)}%`
                            : '0%'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Karaté Pour Tous - Rapport généré automatiquement
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
