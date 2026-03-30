import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '../hooks/useAuth';
import { useAccountingAccess } from '../hooks/useAccountingAccess';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Pencil, Trash2, Calculator, RotateCcw, Upload, FileDown, ClipboardList } from 'lucide-react';
import { useAdminCheck } from '../hooks/useAdminCheck';
import { z } from 'zod';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const PAYMENT_TYPES = [
  { value: 'All', label: 'Toutes les options' },
  { value: 'USA', label: 'Paiement aux USA' },
  { value: 'Niamey', label: 'Paiement à Niamey' },
  { value: 'France', label: 'Paiement en France' },
];

const PAYMENT_OPTIONS = [
  { id: 'USA', label: 'Paiement aux USA', icon: '🇺🇸' },
  { id: 'Niamey', label: 'Paiement à Niamey', icon: '🇳🇪' },
  { id: 'France', label: 'Virement bancaire France', icon: '🇫🇷' },
  { id: 'Maketou', label: 'Maketou (Mobile Money)', icon: '📱' },
  { id: 'MyNITA', label: 'MyNITA (Niger)', icon: '💳' },
  { id: 'Wave', label: 'Wave (Sénégal/CI)', icon: '🌊' },
  { id: 'Especes', label: 'Espèces', icon: '💵' }
];

const CRMPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { hasAccess: hasAccountingAccess } = useAccountingAccess();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSalesRep, setFilterSalesRep] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentType, setFilterPaymentType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
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
      // Silently fail - stale invoice check is non-critical
    }
  };

  const handleStatusChange = async (invoiceId, newStatus, currentPaymentType = '') => {
    if (newStatus === 'paid') {
      // Ouvrir la boîte de dialogue pour choisir le mode de paiement
      setPendingStatusChange({ invoiceId, newStatus });
      setSelectedPaymentMethod(currentPaymentType || '');
      setPaymentDialogOpen(true);
      return;
    }
    // Pour les autres statuts, mise à jour directe
    await updateInvoiceStatus(invoiceId, newStatus);
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
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
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) {
      toast.error("Veuillez sélectionner un mode de paiement");
      return;
    }
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          payment_type: selectedPaymentMethod 
        })
        .eq('id', pendingStatusChange.invoiceId);
        
      if (error) throw error;
      
      toast.success("Facture marquée comme payée");
      setPaymentDialogOpen(false);
      setPendingStatusChange(null);
      setSelectedPaymentMethod('');
      fetchInvoices();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
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
    // Validation schema for edit form
    const editSchema = z.object({
      client_first_name: z.string()
        .trim()
        .min(1, "Le prénom est requis")
        .max(100, "Le prénom ne peut pas dépasser 100 caractères")
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le prénom contient des caractères invalides"),
      client_last_name: z.string()
        .trim()
        .min(1, "Le nom est requis")
        .max(100, "Le nom ne peut pas dépasser 100 caractères")
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom contient des caractères invalides"),
      client_email: z.string()
        .trim()
        .email("Format d'email invalide")
        .max(255, "L'email ne peut pas dépasser 255 caractères"),
      client_whatsapp: z.string()
        .trim()
        .regex(/^\+?[1-9]\d{1,14}$/, "Numéro WhatsApp invalide (format: +33612345678)"),
      amount: z.string()
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
          message: "Le montant doit être supérieur à 0"
        })
        .refine((val) => parseFloat(val) <= 999999999, {
          message: "Le montant maximum est 999,999,999"
        })
    });

    try {
      // Validate the form data
      const validated = editSchema.parse(editForm);
      
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('invoices')
        .update({
          client_first_name: validated.client_first_name,
          client_last_name: validated.client_last_name,
          client_email: validated.client_email.toLowerCase(),
          client_whatsapp: validated.client_whatsapp,
          amount: parseFloat(validated.amount)
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success("Facture modifiée avec succès");
      setEditDialogOpen(false);
      fetchInvoices();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erreur lors de la modification de la facture");
      }
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
      toast.error("Erreur lors de la suppression de la facture");
    }
  };

  const isStale = (lastStatusChange) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(lastStatusChange) < sevenDaysAgo;
  };

  // Extract unique services from invoices
  const uniqueServices = useMemo(() => {
    const services = [...new Set(invoices.map(inv => inv.service_description))];
    return services.filter(Boolean).sort();
  }, [invoices]);

  // Generate year range (2020 to current year + 1)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2020; year <= currentYear + 1; year++) {
      years.push(year.toString());
    }
    return years;
  }, []);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSalesRep('all');
    setFilterStatus('all');
    setFilterPaymentType('all');
    setFilterMonth('all');
    setFilterYear('all');
    setFilterService('all');
  };

  const hasActiveFilters = searchTerm || filterSalesRep !== 'all' || filterStatus !== 'all' || 
    filterPaymentType !== 'all' || filterMonth !== 'all' || filterYear !== 'all' || filterService !== 'all';

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.client_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSalesRep = filterSalesRep === 'all' || invoice.sales_representative === filterSalesRep;
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    
    const matchesPaymentType = filterPaymentType === 'all' || invoice.payment_type === filterPaymentType;
    
    const invoiceDate = new Date(invoice.created_at);
    const matchesMonth = filterMonth === 'all' || 
      (invoiceDate.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
    
    const matchesYear = filterYear === 'all' || 
      invoiceDate.getFullYear().toString() === filterYear;
    
    const matchesService = filterService === 'all' || 
      invoice.service_description === filterService;

    return matchesSearch && matchesSalesRep && matchesStatus && 
           matchesPaymentType && matchesMonth && matchesYear && matchesService;
  });

  if (authLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8 gap-3">
        <Button variant="ghost" onClick={() => navigate('/')} size="sm">
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
        </Button>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1 sm:flex-none text-xs md:text-sm">
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate('/reports')} className="flex-1 sm:flex-none text-xs md:text-sm">
            Rapports
          </Button>
          {hasAccountingAccess && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/accounting')} 
              className="flex-1 sm:flex-none text-xs md:text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600"
            >
              <Calculator className="mr-1 h-4 w-4" />
              Comptabilité
            </Button>
          )}
        </div>
      </div>

      <h1 className="text-xl md:text-3xl font-bold mb-4 md:mb-8">Gestion CRM</h1>

      {/* Filters */}
      <div className="space-y-3 mb-4 md:mb-6">
        {/* Search bar - full width */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro de facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 p-2 md:p-3 border border-input bg-background rounded-md text-sm"
          />
        </div>

        {/* Filter grid - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Select value={filterSalesRep} onValueChange={setFilterSalesRep}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Commercial" />
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
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Statut" />
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

          <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Mode de paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les méthodes</SelectItem>
              {PAYMENT_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              {uniqueServices.map((service) => (
                <SelectItem key={service} value={service}>
                  {service.length > 30 ? `${service.substring(0, 30)}...` : service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter grid - Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les mois</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les années</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="col-span-2 md:col-span-1 text-sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Results counter */}
        <div className="text-sm text-muted-foreground">
          {filteredInvoices.length} facture(s) trouvée(s)
          {hasActiveFilters && ` sur ${invoices.length}`}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Facture
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                  Contact
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Commercial
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Montant
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                  Date
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">
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
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    <div>{invoice.client_first_name}</div>
                    <div className="md:hidden text-xs text-gray-500">{invoice.client_last_name}</div>
                    <div className="hidden md:inline">{invoice.client_last_name}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-500 hidden lg:table-cell">
                    <div className="truncate max-w-[150px]">{invoice.client_email}</div>
                    <div className="text-xs truncate max-w-[150px]">{invoice.client_whatsapp}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                    {invoice.sales_representative}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500 hidden md:table-cell">
                    {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <Select
                      value={invoice.status}
                      onValueChange={(value) => handleStatusChange(invoice.id, value, invoice.payment_type)}
                    >
                      <SelectTrigger className={`w-32 md:w-48 text-xs md:text-sm ${statusColors[invoice.status]}`}>
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
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-1 md:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(invoice)}
                        className="p-1 md:p-2"
                      >
                        <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(invoice)}
                        className="p-1 md:p-2"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
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

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Sélectionnez le mode de paiement utilisé par le client
            </DialogDescription>
          </DialogHeader>
          <RadioGroup 
            value={selectedPaymentMethod} 
            onValueChange={setSelectedPaymentMethod}
            className="grid gap-3 py-4"
          >
            {PAYMENT_OPTIONS.map((option) => (
              <div 
                key={option.id} 
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === option.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPaymentMethod(option.id)}
              >
                <RadioGroupItem value={option.id} id={`payment-${option.id}`} />
                <Label htmlFor={`payment-${option.id}`} className="cursor-pointer flex items-center gap-2 flex-1">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setPaymentDialogOpen(false);
              setPendingStatusChange(null);
              setSelectedPaymentMethod('');
            }}>
              Annuler
            </Button>
            <Button onClick={handlePaymentConfirm}>
              Confirmer le paiement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMPage;
