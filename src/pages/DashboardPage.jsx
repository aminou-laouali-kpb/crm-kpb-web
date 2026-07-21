import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Leaderboard from '../components/Leaderboard';
import { MONTHS, getAvailableYears } from '@/constants/months';
import { useInvoiceStats } from '@/hooks/useInvoiceStats';
import { persistMonthlyPoints } from '@/utils/pointsPersistence';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import AppLayout from '@/components/layout/AppLayout';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const availableYears = useMemo(() => getAvailableYears(), []);

  const getPeriodDates = () => {
    const monthIndex = parseInt(selectedMonth) - 1;
    const year = parseInt(selectedYear);
    return {
      startDate: new Date(year, monthIndex, 1),
      endDate: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
    };
  };

  const { startDate, endDate } = getPeriodDates();
  const { data: invoices = [], isLoading: loading } = useInvoiceStats(
    startDate.toISOString(),
    endDate.toISOString()
  );

  useEffect(() => {
    const persistPoints = async () => {
      const now = new Date();
      const isPastMonth =
        parseInt(selectedYear) < now.getFullYear() ||
        (parseInt(selectedYear) === now.getFullYear() &&
          parseInt(selectedMonth) < now.getMonth() + 1);
      if (isPastMonth && isAdmin && invoices.length > 0) {
        try {
          await persistMonthlyPoints(selectedMonth, selectedYear, invoices);
        } catch {
          // non-critical
        }
      }
    };
    persistPoints();
  }, [selectedMonth, selectedYear, invoices, isAdmin]);

  const getPeriodLabel = () => {
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';
    return `${monthLabel} ${selectedYear}`;
  };

  const getServiceStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const serviceMap = {};
    invoices.forEach(inv => {
      const service = inv.service_description || 'Non spécifié';
      const createdAt = new Date(inv.created_at);
      const isCreatedInPeriod = createdAt >= startDate && createdAt <= endDate;
      if (!serviceMap[service]) {
        serviceMap[service] = { name: service, totalAmount: 0, paidAmount: 0, count: 0 };
      }
      if (isCreatedInPeriod) {
        serviceMap[service].totalAmount += parseFloat(inv.amount);
        serviceMap[service].count += 1;
      }
      if (inv.status === 'paid' && inv.last_status_change) {
        const paymentDate = new Date(inv.last_status_change);
        if (paymentDate >= startDate && paymentDate <= endDate) {
          serviceMap[service].paidAmount += parseFloat(inv.amount);
        }
      }
    });
    return Object.values(serviceMap).sort((a, b) => b.paidAmount - a.paidAmount);
  };

  const getSalesRepStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const repMap = {};
    invoices.forEach(inv => {
      const rep = inv.sales_representative || 'Non assigné';
      if (!repMap[rep]) {
        repMap[rep] = { name: rep, total: 0, paid: 0, count: 0 };
      }
      const createdAt = new Date(inv.created_at);
      if (createdAt >= startDate && createdAt <= endDate) {
        repMap[rep].total += parseFloat(inv.amount);
        repMap[rep].count += 1;
      }
      if (inv.status === 'paid' && inv.last_status_change) {
        const paymentDate = new Date(inv.last_status_change);
        if (paymentDate >= startDate && paymentDate <= endDate) {
          repMap[rep].paid += parseFloat(inv.amount);
        }
      }
    });
    return Object.values(repMap).sort((a, b) => b.paid - a.paid);
  };

  const getOverallStats = () => {
    const { startDate, endDate } = getPeriodDates();
    const invoicesCreated = invoices.filter(inv => {
      const createdAt = new Date(inv.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });
    const invoicesPaidInPeriod = invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.last_status_change) return false;
      const paymentDate = new Date(inv.last_status_change);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    const totalAmount = invoicesCreated.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const paidAmount = invoicesPaidInPeriod.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    return {
      totalInvoices: invoicesCreated.length,
      totalAmount,
      paidInvoices: invoicesPaidInPeriod.length,
      paidAmount,
      pendingInvoices: invoicesCreated.length - invoicesPaidInPeriod.length,
      pendingAmount: totalAmount - paidAmount,
    };
  };

  const navigateToCRM = (status) => {
    navigate(status ? `/crm?status=${status}` : '/crm');
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="py-8">Chargement...</div>
      </AppLayout>
    );
  }

  const salesRepStats = getSalesRepStats();
  const overallStats = getOverallStats();
  const serviceStats = getServiceStats();

  return (
    <AppLayout title="Dashboard - Performances" subtitle={getPeriodLabel()}>
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Mois" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(month => (
              <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Leaderboard invoices={invoices} periodLabel={getPeriodLabel()} periodDates={getPeriodDates()} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <button
          type="button"
          onClick={() => navigateToCRM()}
          className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth text-left"
        >
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Factures totales</h3>
          <p className="text-xl md:text-3xl font-bold">{overallStats.totalInvoices}</p>
        </button>
        <button
          type="button"
          onClick={() => navigateToCRM()}
          className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth text-left"
        >
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Montant total</h3>
          <p className="text-lg md:text-3xl font-bold truncate">{formatCurrency(overallStats.totalAmount, 'XOF')}</p>
        </button>
        <button
          type="button"
          onClick={() => navigateToCRM('paid')}
          className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth text-left"
        >
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Payées</h3>
          <p className="text-xl md:text-3xl font-bold text-success">{overallStats.paidInvoices}</p>
          <p className="text-xs text-muted-foreground truncate">{formatCurrency(overallStats.paidAmount, 'XOF')}</p>
        </button>
        <button
          type="button"
          onClick={() => navigateToCRM('awaiting_payment')}
          className="glass p-3 md:p-6 rounded-xl shadow-md hover:shadow-glow transition-smooth text-left"
        >
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1">En attente</h3>
          <p className="text-xl md:text-3xl font-bold text-warning">{overallStats.pendingInvoices}</p>
          <p className="text-xs text-muted-foreground truncate">{formatCurrency(overallStats.pendingAmount, 'XOF')}</p>
        </button>
      </div>

      <div className="glass p-4 md:p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-lg md:text-2xl font-semibold mb-4">Services les plus rentables</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={serviceStats} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value) => formatCurrency(value, 'XOF')} />
            <Legend />
            <Bar dataKey="totalAmount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="totalAmount" />
            <Bar dataKey="paidAmount" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} name="paidAmount" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass p-4 md:p-6 rounded-xl shadow-md">
        <h2 className="text-lg md:text-2xl font-semibold mb-4">Performance par commercial</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesRepStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value) => formatCurrency(value, 'XOF')} />
            <Legend />
            <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[8, 8, 0, 0]} />
            <Bar dataKey="paid" fill="hsl(var(--success))" name="Payé" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
