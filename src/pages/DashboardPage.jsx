import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');

  useEffect(() => {
    fetchInvoices();
  }, [timeFilter]);

  const fetchInvoices = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      let query = supabase.from('invoices').select('*');

      const now = new Date();
      let startDate = new Date();

      switch (timeFilter) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching invoices:', error);
      }
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
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

  const timeFilterLabels = {
    week: 'Cette semaine',
    month: 'Ce mois',
    year: 'Cette année',
    all: 'Tout'
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/crm')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour au CRM
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard - Performances Commerciales</h1>
        
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Factures totales</h3>
          <p className="text-3xl font-bold text-gray-900">{overallStats.totalInvoices}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Montant total</h3>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(overallStats.totalAmount, 'XOF')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Factures payées</h3>
          <p className="text-3xl font-bold text-green-600">{overallStats.paidInvoices}</p>
          <p className="text-sm text-gray-500 mt-1">{formatCurrency(overallStats.paidAmount, 'XOF')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">En attente</h3>
          <p className="text-3xl font-bold text-orange-600">{overallStats.pendingInvoices}</p>
          <p className="text-sm text-gray-500 mt-1">{formatCurrency(overallStats.pendingAmount, 'XOF')}</p>
        </div>
      </div>

      {/* Sales Rep Stats */}
      <h2 className="text-2xl font-semibold mb-4">Performances par Commercial</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(salesRepStats).map(([rep, stats]) => (
          <div key={rep} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{rep}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Factures générées</span>
                <span className="font-semibold">{stats.totalInvoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Montant total</span>
                <span className="font-semibold">{formatCurrency(stats.totalAmount, 'XOF')}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-green-600">Factures payées</span>
                <span className="font-semibold text-green-600">{stats.paidInvoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-600">Montant encaissé</span>
                <span className="font-semibold text-green-600">{formatCurrency(stats.paidAmount, 'XOF')}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-orange-600">Factures en attente</span>
                <span className="font-semibold text-orange-600">{stats.pendingInvoices}</span>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taux de conversion</span>
                  <span className="font-semibold text-blue-600">
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
