import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Calendar, FileText, Trophy, CreditCard, TrendingUp, DollarSign, Banknote, Smartphone, Globe, MapPin, FileDown, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
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
  DialogDescription,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AppLayout from '@/components/layout/AppLayout';

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

const PAYMENT_ICONS = {
  'USA': Globe,
  'Niamey': MapPin,
  'NiameyAminou': MapPin,
  'France': Globe,
  'BOA': Banknote,
  'Maketou': Smartphone,
  'MyNITA': Smartphone,
  'Wave': Smartphone,
  'Espèces': Banknote,
  'Especes': Banknote,
};

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_LABELS = ['🥇', '🥈', '🥉'];

const ReportsPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);
  const [paymentDrilldown, setPaymentDrilldown] = useState(null);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

  const last3Months = getLast3Months();
  const yearOptions = getYearOptions();

  useEffect(() => {
    fetchInvoices();
  }, [selectedMonth, selectedYear]);

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

  // ── Stats helpers ──

  const getOverallStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const invoicesCreated = invoices.filter(inv => {
      const d = new Date(inv.created_at);
      return d >= startDate && d <= endDate;
    });
    const invoicesPaid = invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.last_status_change) return false;
      const d = new Date(inv.last_status_change);
      return d >= startDate && d <= endDate;
    });
    const totalInvoices = invoicesCreated.length;
    const totalAmount = invoicesCreated.reduce((s, i) => s + parseFloat(i.amount), 0);
    const paidAmount = invoicesPaid.reduce((s, i) => s + parseFloat(i.amount), 0);
    return {
      totalInvoices,
      totalAmount,
      paidInvoices: invoicesPaid.length,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      conversionRate: totalInvoices > 0 ? ((invoicesPaid.length / totalInvoices) * 100).toFixed(1) : 0
    };
  };

  const getPaymentTrackingStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const paymentMap = {};
    let totalPaid = 0;

    const paidInvoices = invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.last_status_change) return false;
      const d = new Date(inv.last_status_change);
      return d >= startDate && d <= endDate;
    });

    paidInvoices.forEach(inv => {
      const amount = parseFloat(inv.amount);
      totalPaid += amount;
      const types = (inv.payment_type || 'Non spécifié').split(',').map(t => t.trim());
      const splitAmount = amount / types.length;
      types.forEach(type => {
        if (!paymentMap[type]) paymentMap[type] = { count: 0, amount: 0 };
        paymentMap[type].count += 1;
        paymentMap[type].amount += splitAmount;
      });
    });

    const stats = Object.entries(paymentMap)
      .map(([name, data]) => ({ name, ...data, percentage: totalPaid > 0 ? (data.amount / totalPaid) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    return { stats, totalPaid, totalCount: paidInvoices.length, paidInvoices };
  };

  const getInvoicesForPaymentMode = (paymentMode) => {
    const { startDate, endDate } = getPeriodDates();
    return invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.last_status_change) return false;
      const d = new Date(inv.last_status_change);
      if (d < startDate || d > endDate) return false;
      const types = (inv.payment_type || '').split(',').map(t => t.trim());
      return types.includes(paymentMode);
    });
  };

  const handleDownloadReceipt = async (receiptUrl) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .download(receiptUrl);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = receiptUrl.split('/').pop();
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Erreur lors du téléchargement du reçu");
    }
  };

  const getTopServices = () => {
    const { startDate, endDate } = getPeriodDates();
    const serviceMap = {};

    invoices.forEach(inv => {
      const service = inv.service_description || 'Non spécifié';
      const createdAt = new Date(inv.created_at);
      const isCreated = createdAt >= startDate && createdAt <= endDate;

      if (!serviceMap[service]) serviceMap[service] = { name: service, totalAmount: 0, paidAmount: 0, count: 0, paidCount: 0 };

      if (isCreated) {
        serviceMap[service].totalAmount += parseFloat(inv.amount);
        serviceMap[service].count += 1;
      }

      if (inv.status === 'paid' && inv.last_status_change) {
        const pd = new Date(inv.last_status_change);
        if (pd >= startDate && pd <= endDate) {
          serviceMap[service].paidAmount += parseFloat(inv.amount);
          serviceMap[service].paidCount += 1;
        }
      }
    });

    return Object.values(serviceMap)
      .filter(s => s.count > 0 || s.paidCount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
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

  const getSalesRepStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const stats = {};
    const salesReps = ['Josphin', 'Nadia', 'Donald', 'Richard'];
    salesReps.forEach(rep => {
      const created = invoices.filter(inv => {
        if (inv.sales_representative !== rep) return false;
        const d = new Date(inv.created_at);
        return d >= startDate && d <= endDate;
      });
      const paid = invoices.filter(inv => {
        if (inv.sales_representative !== rep || inv.status !== 'paid' || !inv.last_status_change) return false;
        const d = new Date(inv.last_status_change);
        return d >= startDate && d <= endDate;
      });
      const totalAmount = created.reduce((s, i) => s + parseFloat(i.amount), 0);
      const paidAmount = paid.reduce((s, i) => s + parseFloat(i.amount), 0);
      stats[rep] = {
        totalInvoices: created.length,
        totalAmount,
        paidInvoices: paid.length,
        paidAmount,
        pendingInvoices: created.length - paid.length,
        pendingAmount: totalAmount - paidAmount
      };
    });
    return stats;
  };

  const getServiceStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const serviceMap = {};
    invoices.forEach(inv => {
      const service = inv.service_description || 'Non spécifié';
      const createdAt = new Date(inv.created_at);
      const isCreated = createdAt >= startDate && createdAt <= endDate;
      if (!serviceMap[service]) serviceMap[service] = { name: service, totalAmount: 0, paidAmount: 0, count: 0 };
      if (isCreated) {
        serviceMap[service].totalAmount += parseFloat(inv.amount);
        serviceMap[service].count += 1;
      }
      if (inv.status === 'paid' && inv.last_status_change) {
        const pd = new Date(inv.last_status_change);
        if (pd >= startDate && pd <= endDate) serviceMap[service].paidAmount += parseFloat(inv.amount);
      }
    });
    return Object.values(serviceMap).filter(s => s.count > 0 || s.paidAmount > 0).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10);
  };

  // ── PDF Export ──

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    toast.info("Génération du PDF en cours...");
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff', scrollY: -window.scrollY });

      const imgWidth = 210;
      const pageHeight = 297;
      const pxPerMm = canvas.width / imgWidth;
      const pageHeightPx = Math.floor(pageHeight * pxPerMm);
      const totalPages = Math.ceil(canvas.height / pageHeightPx);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        const sliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, i * pageHeightPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const pageImg = pageCanvas.toDataURL('image/jpeg', 0.75);
        const sliceHeightMm = (sliceHeight / canvas.width) * imgWidth;
        pdf.addImage(pageImg, 'JPEG', 0, 0, imgWidth, sliceHeightMm, undefined, 'FAST');
      }

      pdf.save(`Rapport_${MONTHS[parseInt(selectedMonth)].label}_${selectedYear}.pdf`);
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
  const paymentTracking = getPaymentTrackingStats();
  const topServices = getTopServices();
  const salesRepStats = getSalesRepStats();
  const serviceStats = getServiceStats();
  const statusStats = getStatusStats();
  const periodLabel = `${MONTHS[parseInt(selectedMonth)].label} ${selectedYear}`;
  const maxServiceAmount = topServices.length > 0 ? topServices[0].totalAmount : 1;

  return (
    <AppLayout title="Rapports" subtitle={periodLabel}>
      <div className="flex justify-end mb-4">
        <Button onClick={exportToPDF} disabled={exporting || invoices.length === 0} className="bg-gradient-primary hover:opacity-90">
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Export en cours...' : 'Exporter PDF'}
        </Button>
      </div>

      {/* Period Filter */}
      <div className="glass p-4 rounded-xl mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Sélectionner la période
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {last3Months.map((m, idx) => (
            <Button
              key={idx}
              variant={selectedMonth === m.month.toString() && selectedYear === m.year.toString() ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickSelect(m.month, m.year)}
              className={selectedMonth === m.month.toString() && selectedYear === m.year.toString() ? "bg-gradient-primary" : ""}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Mois" /></SelectTrigger>
            <SelectContent>
              {MONTHS.map(month => (<SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (<SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-background p-6 rounded-xl">
        <div className="text-center mb-8 border-b border-border pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Rapport Mensuel</h1>
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
            {/* 1. Résumé Global */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Résumé Global
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wide">Factures créées</h3>
                  <p className="text-2xl font-bold text-foreground mt-1">{overallStats.totalInvoices}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wide">Montant total</h3>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(overallStats.totalAmount, 'XOF')}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wide">Encaissé</h3>
                  <p className="text-lg font-bold text-success mt-1">{formatCurrency(overallStats.paidAmount, 'XOF')}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wide">Taux conversion</h3>
                  <p className="text-2xl font-bold text-primary mt-1">{overallStats.conversionRate}%</p>
                </div>
              </div>
            </div>

            {/* 2. Suivi des Paiements par Mode */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Suivi des Paiements par Mode
              </h2>
              {paymentTracking.stats.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun paiement enregistré pour cette période.</p>
              ) : (
                <>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total encaissé ce mois</span>
                      <span className="text-xl font-bold text-success">{formatCurrency(paymentTracking.totalPaid, 'XOF')}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Factures payées</span>
                      <span className="text-lg font-semibold text-foreground">{paymentTracking.totalCount}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentTracking.stats.map((pm) => {
                      const IconComp = PAYMENT_ICONS[pm.name] || DollarSign;
                      return (
                        <div key={pm.name} className="bg-muted/30 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => setPaymentDrilldown(pm.name)}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <IconComp className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground text-sm">{pm.name}</h4>
                              <span className="text-xs text-muted-foreground">{pm.count} facture{pm.count > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <p className="text-lg font-bold text-foreground mb-2">{formatCurrency(pm.amount, 'XOF')}</p>
                          <div className="flex items-center gap-2">
                            <Progress value={pm.percentage} className="h-2 flex-1" />
                            <span className="text-xs font-medium text-muted-foreground w-12 text-right">{pm.percentage.toFixed(1)}%</span>
                          </div>
                          <p className="text-xs text-primary mt-2">Cliquez pour voir les détails →</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* 3. Top Services */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" /> Classement des Services
              </h2>
              {topServices.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun service pour cette période.</p>
              ) : (
                <div className="space-y-3">
                  {topServices.map((service, idx) => (
                    <div key={service.name} className="bg-muted/30 p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {idx < 3 ? (
                            <span className="text-2xl">{MEDAL_LABELS[idx]}</span>
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                              {idx + 1}
                            </span>
                          )}
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">{service.name}</h4>
                            <span className="text-xs text-muted-foreground">{service.count} facture{service.count > 1 ? 's' : ''} créée{service.count > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatCurrency(service.totalAmount, 'XOF')}</p>
                          <p className="text-xs text-success">{formatCurrency(service.paidAmount, 'XOF')} encaissé</p>
                        </div>
                      </div>
                      <Progress value={(service.totalAmount / maxServiceAmount) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Répartition par Statut */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Répartition par Statut</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusStats} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {statusStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {statusStats.map((status, idx) => (
                    <div key={status.name} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
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

            {/* 5. Graphique Performances par Service */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Performances par Service</h2>
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={serviceStats} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value) => formatCurrency(value, 'XOF')} />
                    <Legend formatter={(value) => value === 'totalAmount' ? 'Montant Total' : 'Montant Payé'} />
                    <Bar dataKey="totalAmount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="totalAmount" />
                    <Bar dataKey="paidAmount" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="paidAmount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. Performances par Commercial */}
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
                          {stats.totalInvoices > 0 ? `${((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(0)}%` : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">Karaté Pour Tous - Rapport généré automatiquement</p>
            </div>
          </>
        )}
      </div>

      {/* Payment Drilldown Dialog */}
      <Dialog open={!!paymentDrilldown} onOpenChange={(open) => !open && setPaymentDrilldown(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factures payées via {paymentDrilldown}</DialogTitle>
            <DialogDescription>{periodLabel}</DialogDescription>
          </DialogHeader>
          {paymentDrilldown && (() => {
            const drillInvoices = getInvoicesForPaymentMode(paymentDrilldown);
            const totalDrill = drillInvoices.reduce((s, i) => s + parseFloat(i.amount), 0);
            return (
              <div>
                <div className="flex justify-between items-center mb-4 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{drillInvoices.length} facture(s)</span>
                  <span className="font-bold text-foreground">{formatCurrency(totalDrill, 'XOF')}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-muted-foreground">Commercial</th>
                        <th className="text-right p-2 text-muted-foreground">Montant</th>
                        <th className="text-left p-2 text-muted-foreground">Service</th>
                        <th className="text-left p-2 text-muted-foreground">Date paiement</th>
                        <th className="text-center p-2 text-muted-foreground">Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillInvoices.map(inv => (
                        <tr key={inv.id} className="border-b border-border/50">
                          <td className="p-2 text-foreground">{inv.sales_representative}</td>
                          <td className="p-2 text-right font-medium text-foreground">{formatCurrency(parseFloat(inv.amount), 'XOF')}</td>
                          <td className="p-2 text-muted-foreground text-xs max-w-[150px] truncate">{inv.service_description}</td>
                          <td className="p-2 text-muted-foreground">
                            {inv.last_status_change ? new Date(inv.last_status_change).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="p-2 text-center">
                            {inv.receipt_url ? (
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(inv.receipt_url)}>
                                <FileDown className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ReportsPage;
