import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Pencil, Trash2 } from 'lucide-react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statusLabels = {
  generated: 'Facture générée',
  sent: 'Facture envoyée',
  awaiting_payment: 'En attente de paiement',
  to_follow_up: 'À relancer',
  paid: 'Facture payée'
};

const statusColors = {
  generated: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  awaiting_payment: 'bg-yellow-100 text-yellow-800',
  to_follow_up: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800'
};

const CRMPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSalesRep, setFilterSalesRep] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editForm, setEditForm] = useState({
    client_first_name: '',
    client_last_name: '',
    client_email: '',
    client_whatsapp: '',
    amount: ''
  });

  useEffect(() => {
    fetchInvoices();
    
    // Check for invoices to mark as "to_follow_up"
    checkAndUpdateStaleInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching invoices:', error);
      }
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const checkAndUpdateStaleInvoices = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .lt('last_status_change', sevenDaysAgo.toISOString())
        .neq('status', 'to_follow_up')
        .neq('status', 'paid');

      if (error) throw error;

      if (data && data.length > 0) {
        const updates = data.map(invoice => 
          supabase
            .from('invoices')
            .update({ status: 'to_follow_up' })
            .eq('id', invoice.id)
        );

        await Promise.all(updates);
        fetchInvoices();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating stale invoices:', error);
      }
    }
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      toast.success("Statut mis à jour avec succès");
      fetchInvoices();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating status:', error);
      }
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleEditClick = (invoice) => {
    setSelectedInvoice(invoice);
    setEditForm({
      client_first_name: invoice.client_first_name,
      client_last_name: invoice.client_last_name,
      client_email: invoice.client_email,
      client_whatsapp: invoice.client_whatsapp,
      amount: invoice.amount
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('invoices')
        .update({
          client_first_name: editForm.client_first_name,
          client_last_name: editForm.client_last_name,
          client_email: editForm.client_email,
          client_whatsapp: editForm.client_whatsapp,
          amount: parseFloat(editForm.amount)
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success("Facture modifiée avec succès");
      setEditDialogOpen(false);
      fetchInvoices();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating invoice:', error);
      }
      toast.error("Erreur lors de la modification de la facture");
    }
  };

  const handleDeleteClick = (invoice) => {
    setSelectedInvoice(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success("Facture supprimée avec succès");
      setDeleteDialogOpen(false);
      fetchInvoices();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting invoice:', error);
      }
      toast.error("Erreur lors de la suppression de la facture");
    }
  };

  const isStale = (lastStatusChange) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(lastStatusChange) < sevenDaysAgo;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.client_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSalesRep = filterSalesRep === 'all' || invoice.sales_representative === filterSalesRep;
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;

    return matchesSearch && matchesSalesRep && matchesStatus;
  });

  if (authLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8">Gestion des Factures CRM</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 p-3 border border-gray-300 rounded-md"
          />
        </div>

        <Select value={filterSalesRep} onValueChange={setFilterSalesRep}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par commercial" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les commerciaux</SelectItem>
            <SelectItem value="Josphin">Josphin</SelectItem>
            <SelectItem value="Nadia">Nadia</SelectItem>
            <SelectItem value="Donald">Donald</SelectItem>
            <SelectItem value="Richard">Richard</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="generated">Facture générée</SelectItem>
            <SelectItem value="sent">Facture envoyée</SelectItem>
            <SelectItem value="awaiting_payment">En attente de paiement</SelectItem>
            <SelectItem value="to_follow_up">À relancer</SelectItem>
            <SelectItem value="paid">Facture payée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commercial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr 
                  key={invoice.id}
                  className={`${
                    isStale(invoice.last_status_change) && invoice.status !== 'paid' 
                      ? 'bg-orange-50' 
                      : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.client_first_name} {invoice.client_last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{invoice.client_email}</div>
                    <div className="text-xs">{invoice.client_whatsapp}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.sales_representative}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={invoice.status}
                      onValueChange={(value) => handleStatusChange(invoice.id, value)}
                    >
                      <SelectTrigger className={`w-48 ${statusColors[invoice.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(invoice)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(invoice)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucune facture trouvée
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
            <DialogDescription>
              Modifiez les informations du client et de la facture
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                value={editForm.client_first_name}
                onChange={(e) => setEditForm({ ...editForm, client_first_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={editForm.client_last_name}
                onChange={(e) => setEditForm({ ...editForm, client_last_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.client_email}
                onChange={(e) => setEditForm({ ...editForm, client_email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={editForm.client_whatsapp}
                onChange={(e) => setEditForm({ ...editForm, client_whatsapp: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditSubmit}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la facture {selectedInvoice?.invoice_number} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CRMPage;
