import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Calendar, FileText, Trophy, CreditCard, TrendingUp, DollarSign, Banknote, Smartphone, Globe, MapPin, FileDown, FileSpreadsheet } from 'lucide-react';
import {
  buildPeriodRange,
  defaultClosedMonthsRange,
  monthlySummaries,
  paymentModeStats,
  periodFileSlug,
  salesRepPerformance,
  serviceRanking,
  statusBreakdown,
  summarizePeriod,
} from '../utils/reportPeriod';
import { exportCommercialReportExcel } from '../utils/commercialReportExport';
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
  'Maroc': Banknote,
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
  const closedPreset = defaultClosedMonthsRange(now);
  const [startMonth, setStartMonth] = useState(now.getMonth().toString());
  const [startYear, setStartYear] = useState(now.getFullYear().toString());
  const [endMonth, setEndMonth] = useState(now.getMonth().toString());
  const [endYear, setEndYear] = useState(now.getFullYear().toString());

  const last3Months = getLast3Months();
  const yearOptions = getYearOptions();
  const range = buildPeriodRange(
    parseInt(startMonth, 10),
    parseInt(startYear, 10),
    parseInt(endMonth, 10),
    parseInt(endYear, 10),
  );
  const presetRange = buildPeriodRange(
    closedPreset.startMonth,
    closedPreset.startYear,
    closedPreset.endMonth,
    closedPreset.endYear,
  );
  const isPreset = range.valid
    && startMonth === String(closedPreset.startMonth)
    && startYear === String(closedPreset.startYear)
    && endMonth === String(closedPreset.endMonth)
    && endYear === String(closedPreset.endYear);

  useEffect(() => {
    let cancelled = false;
    const period = buildPeriodRange(
      parseInt(startMonth, 10),
      parseInt(startYear, 10),
      parseInt(endMonth, 10),
      parseInt(endYear, 10),
    );

    if (!period.valid) {
      setInvoices([]);
      setLoading(false);
      return undefined;
    }

    const load = async () => {
      try {
        setLoading(true);
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.rpc('get_invoice_stats', {
          p_start_date: period.startDate.toISOString(),
          p_end_date: period.endDate.toISOString()
        });
        if (cancelled) return;
        if (error) throw error;
        setInvoices(data || []);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching invoices:', error);
        setInvoices([]);
        toast.error("Erreur lors du chargement des données");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [startMonth, startYear, endMonth, endYear]);

  const handleQuickSelect = (month, year) => {
    setStartMonth(month.toString());
    setEndMonth(month.toString());
    setStartYear(year.toString());
    setEndYear(year.toString());
  };

  const applyClosedPreset = () => {
    setStartMonth(String(closedPreset.startMonth));
    setStartYear(String(closedPreset.startYear));
    setEndMonth(String(closedPreset.endMonth));
    setEndYear(String(closedPreset.endYear));
  };

  const periodDates = () => (
    range.valid
      ? { startDate: range.startDate, endDate: range.endDate }
      : { startDate: new Date(0), endDate: new Date(0) }
  );

  const getInvoicesForPaymentMode = (paymentMode) => {
    const { startDate, endDate } = periodDates();
    return invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.last_status_change) return false;
      const d = new Date(inv.last_status_change);
      if (d < startDate || d > endDate) return false;
      const types = (inv.payment_type || '').split(',').map(t => t.trim());
      return types.includes(paymentMode);
    });
  };

  const handleDownloadReceipt = async (receiptUrl) => {
    if (!receiptUrl) {
      toast.error("Aucun reçu disponible");
      return;
    }
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
      console.error('Receipt download failed:', e);
      toast.error("Erreur lors du téléchargement du reçu");
    }
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

      pdf.save(`Rapport_${periodFileSlug(range.label)}.pdf`);
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

  const { startDate, endDate } = periodDates();
  const overallStats = summarizePeriod(invoices, startDate, endDate);
  const paymentTracking = paymentModeStats(invoices, startDate, endDate);
  const topServices = serviceRanking(invoices, startDate, endDate);
  const salesRepStats = salesRepPerformance(invoices, startDate, endDate);
  const serviceStats = topServices.slice(0, 10);
  const statusStats = statusBreakdown(invoices);
  const monthRows = range.valid ? monthlySummaries(invoices, range.months) : [];
  const periodLabel = range.valid ? range.label : 'Période invalide';

  const exportExcel = async () => {
    if (!range.valid || invoices.length === 0) return;
    try {
      await exportCommercialReportExcel({
        periodLabel,
        overall: overallStats,
        months: monthRows,
        payments: paymentTracking.stats,
        services: topServices,
        salesReps: salesRepStats,
      });
      toast.success("Rapport Excel téléchargé");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export Excel");
    }
  };
  const maxServiceAmount = topServices.length > 0 ? topServices[0].totalAmount : 1;

  return (
    <AppLayout title="Rapports" subtitle={periodLabel}>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={exportExcel} disabled={!range.valid || invoices.length === 0}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button onClick={exportToPDF} disabled={exporting || !range.valid || invoices.length === 0} className="bg-gradient-primary hover:opacity-90">
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Export en cours...' : 'Exporter PDF'}
        </Button>
      </div>

      {/* Period Filter */}
      <div className="glass p-4 rounded-xl mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Sélectionner la période
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Le PDF et l’Excel regroupent toute la période dans un seul fichier.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={isPreset ? "default" : "outline"}
            size="sm"
            onClick={applyClosedPreset}
            className={isPreset ? "bg-gradient-primary" : ""}
          >
            {presetRange.label}
          </Button>
          {last3Months.map((m, idx) => {
            const selected = !range.isRange && startMonth === m.month.toString() && startYear === m.year.toString();
            return (
              <Button
                key={idx}
                variant={selected ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickSelect(m.month, m.year)}
                className={selected ? "bg-gradient-primary" : ""}
              >
                {m.label}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm text-muted-foreground w-8">Du</span>
            <Select value={startMonth} onValueChange={setStartMonth}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Mois" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (<SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={startYear} onValueChange={setStartYear}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Année" /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (<SelectItem key={`s-${year.value}`} value={year.value}>{year.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm text-muted-foreground w-8">Au</span>
            <Select value={endMonth} onValueChange={setEndMonth}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Mois" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (<SelectItem key={`e-${month.value}`} value={month.value}>{month.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={endYear} onValueChange={setEndYear}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Année" /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (<SelectItem key={`e-${year.value}`} value={year.value}>{year.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {!range.valid && <p className="text-sm text-destructive">{range.error}</p>}
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-background p-6 rounded-xl">
        <div className="text-center mb-8 border-b border-border pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{range.isRange ? 'Rapport de période' : 'Rapport Mensuel'}</h1>
          <p className="text-lg text-primary font-semibold">{periodLabel}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {!range.valid ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{range.error}</p>
          </div>
        ) : invoices.length === 0 ? (
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
                  <p className="text-2xl font-bold text-primary mt-1">{overallStats.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {range.isRange && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Évolution mensuelle</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-foreground">Mois</th>
                        <th className="text-center p-3 text-foreground">Créées</th>
                        <th className="text-right p-3 text-foreground">Montant créé</th>
                        <th className="text-center p-3 text-foreground">Payées</th>
                        <th className="text-right p-3 text-foreground">Encaissé</th>
                        <th className="text-center p-3 text-foreground">Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((month) => (
                        <tr key={month.key} className="border-b border-border/50">
                          <td className="p-3 font-medium text-foreground">{month.label}</td>
                          <td className="text-center p-3 text-foreground">{month.totalInvoices}</td>
                          <td className="text-right p-3 text-foreground">{formatCurrency(month.totalAmount, 'XOF')}</td>
                          <td className="text-center p-3 text-success">{month.paidInvoices}</td>
                          <td className="text-right p-3 text-success">{formatCurrency(month.paidAmount, 'XOF')}</td>
                          <td className="text-center p-3 font-semibold text-primary">{month.conversionRate.toFixed(0)}%</td>
                        </tr>
                      ))}
                      <tr className="border-t border-border">
                        <td className="p-3 font-semibold text-foreground">Total</td>
                        <td className="text-center p-3 font-semibold text-foreground">{overallStats.totalInvoices}</td>
                        <td className="text-right p-3 font-semibold text-foreground">{formatCurrency(overallStats.totalAmount, 'XOF')}</td>
                        <td className="text-center p-3 font-semibold text-success">{overallStats.paidInvoices}</td>
                        <td className="text-right p-3 font-semibold text-success">{formatCurrency(overallStats.paidAmount, 'XOF')}</td>
                        <td className="text-center p-3 font-semibold text-primary">{overallStats.conversionRate.toFixed(0)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                    {salesRepStats.map((stats) => (
                      <tr key={stats.name} className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">{stats.name}</td>
                        <td className="text-center p-3 text-foreground">{stats.totalInvoices}</td>
                        <td className="text-right p-3 text-foreground">{formatCurrency(stats.totalAmount, 'XOF')}</td>
                        <td className="text-center p-3 text-success">{stats.paidInvoices}</td>
                        <td className="text-right p-3 text-success">{formatCurrency(stats.paidAmount, 'XOF')}</td>
                        <td className="text-center p-3 font-semibold text-primary">
                          {stats.conversionRate.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">KPB Education — Rapport généré automatiquement</p>
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
