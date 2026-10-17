import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Search, Pencil, Trash2, RotateCcw, Upload, FileDown, ChevronLeft, ChevronRight, ArrowUpDown, Receipt, FileSignature } from 'lucide-react';
import { useAdminCheck } from '../hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { formatCurrency } from '../utils/formatCurrency';
import { MONTHS, getAvailableYears } from '@/constants/months';
import { PAYMENT_FILTER_OPTIONS, PAYMENT_CRM_OPTIONS, invoiceMatchesPaymentFilter } from '@/constants/paymentMethods';
import { STATUS_LABELS, STATUS_COLORS } from '@/constants/invoiceStatuses';
import { getFollowUpLevel, getPrimaryFollowUpThreshold } from '@/constants/followUpConfig';
import { useFollowUpDays } from '@/hooks/useFollowUpDays';
import { useProcedureTypes } from '@/hooks/useProcedureTypes';
import { useInvoices } from '@/hooks/useInvoices';
import { useContractFollowups } from '@/hooks/useContracts';
import SendContractDialog from '@/components/contracts/SendContractDialog';
import { getContractState } from '@/utils/contracts';
import { useSalesRepNames } from '@/hooks/useSalesReps';
import AppLayout from '@/components/layout/AppLayout';
import WhatsAppLink from '@/components/WhatsAppLink';
import InvoiceStatusStepper from '@/components/InvoiceStatusStepper';
import ClientHistoryPanel from '@/components/ClientHistoryPanel';
import { buildInvoiceWhatsAppMessage } from '@/utils/whatsappUtils';
import { installmentFormSchema } from '@/utils/installments';
import { GUIDE_ULTIME, isGuideUltime } from '@/constants/products';
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

const CRMPage = () => {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAdminCheck();
  const salesRepNames = useSalesRepNames();
  const { data: invoices = [], isLoading: loading, refetch } = useInvoices();
  const { followUpDays, loading: followUpLoading } = useFollowUpDays();
  const { data: procedureTypes = [] } = useProcedureTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSalesRep, setFilterSalesRep] = useState('all');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [filterPaymentType, setFilterPaymentType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [filterGuide, setFilterGuide] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
  const [partialForm, setPartialForm] = useState({ total_amount: '', remaining_amount: '', due_date: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [contractInvoice, setContractInvoice] = useState(null);
  const { data: contractRows = [] } = useContractFollowups({ includeSigned: true });
  const contractStateByInvoice = useMemo(
    () => Object.fromEntries(contractRows.map((r) => [r.invoice_id, r.contract_state])),
    [contractRows]
  );
  const [editForm, setEditForm] = useState({
    client_first_name: '',
    client_last_name: '',
    client_email: '',
    client_whatsapp: '',
    amount: '',
    procedure_type: ''
  });

  useEffect(() => {
    if (!followUpLoading) checkAndUpdateStaleInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUpLoading]);

  // Une facture payée n'est modifiable (statut, montant) que par un admin
  const isLockedForUser = (invoice) => invoice?.status === 'paid' && !isAdmin;

  const fetchInvoices = () => refetch();

  const checkAndUpdateStaleInvoices = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const primaryThreshold = getPrimaryFollowUpThreshold(followUpDays);
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - primaryThreshold);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .lt('last_status_change', thresholdDate.toISOString())
        .neq('status', 'to_follow_up')
        .neq('status', 'paid');

      if (error) throw error;

      if (data && data.length > 0) {
        await Promise.all(
          data.map((invoice) =>
            supabase.from('invoices').update({ status: 'to_follow_up' }).eq('id', invoice.id)
          )
        );
        refetch();
      }
    } catch {
      // non-critical
    }
  };

  const handleStatusChange = async (invoiceId, newStatus, currentPaymentType = '', invoice = null) => {
    if (newStatus === 'paid') {
      // Ouvrir la boîte de dialogue pour choisir le mode de paiement
      setPendingStatusChange({ invoiceId, newStatus, invoice });
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
      toast.error(error?.message || "Erreur lors de la mise à jour du statut");
    }
  };

  const resetPaymentDialog = () => {
    setPendingStatusChange(null);
    setSelectedPaymentMethod('');
    setReceiptFile(null);
    setIsPartial(false);
    setPartialForm({ total_amount: '', remaining_amount: '', due_date: '' });
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) {
      toast.error("Veuillez sélectionner un mode de paiement");
      return;
    }
    if (!receiptFile) {
      toast.error("Veuillez télécharger le reçu de paiement");
      return;
    }
    let partialData = null;
    if (isPartial) {
      const parsed = installmentFormSchema.safeParse(partialForm);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || 'Informations de tranche invalides');
        return;
      }
      partialData = parsed.data;
    }
    
    setUploadingReceipt(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Upload receipt file
      const fileExt = receiptFile.name.split('.').pop();
      const filePath = `${pendingStatusChange.invoiceId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, receiptFile);
      
      if (uploadError) throw uploadError;

      // Update invoice with status, payment type, and receipt URL
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          payment_type: selectedPaymentMethod,
          receipt_url: filePath
        })
        .eq('id', pendingStatusChange.invoiceId);
        
      if (error) throw error;

      if (partialData) {
        const inv = pendingStatusChange.invoice || invoices.find((i) => i.id === pendingStatusChange.invoiceId) || {};
        const { data: { user: me } } = await supabase.auth.getUser();
        const { error: instError } = await supabase.from('payment_installments').insert({
          invoice_id: pendingStatusChange.invoiceId,
          client_id: inv.client_id || null,
          owner_user_id: inv.user_id || me?.id,
          sales_rep: inv.sales_representative || 'N/A',
          client_name: `${inv.client_first_name || ''} ${inv.client_last_name || ''}`.trim() || 'Client',
          client_whatsapp: inv.client_whatsapp || null,
          service: inv.service_description || '',
          currency: inv.currency || 'XOF',
          total_amount: partialData.total_amount === '' ? null : partialData.total_amount ?? null,
          remaining_amount: partialData.remaining_amount,
          due_date: partialData.due_date,
        });
        if (instError) toast.error("Paiement enregistré, mais l'échéance n'a pas pu être créée");
        else toast.success('Prochaine tranche ajoutée aux relances');
      }

      // Log the action
      try {
        await supabase.rpc('create_audit_log', {
          p_action: 'STATUS_CHANGE',
          p_table_name: 'invoices',
          p_record_id: pendingStatusChange.invoiceId,
          p_metadata: { new_status: 'paid', payment_method: selectedPaymentMethod, has_receipt: true, partial: !!partialData }
        });
      } catch (e) { /* non-critical */ }
      setIsPartial(false);
      setPartialForm({ total_amount: '', remaining_amount: '', due_date: '' });
      
      toast.success("Facture marquée comme payée avec reçu");
      setPaymentDialogOpen(false);

      const paidInvoice = pendingStatusChange?.invoice;
      const paidInvoiceId = pendingStatusChange?.invoiceId;
      setPendingStatusChange(null);
      setSelectedPaymentMethod('');
      setReceiptFile(null);
      fetchInvoices();

      // Contrat électronique : rappelé au paiement s'il n'est pas encore signé
      if (paidInvoice && contractStateByInvoice[paidInvoiceId] !== 'signe' && !isGuideUltime(paidInvoice)) {
        toast.message("Facture payée — envoyer le contrat ?", {
          description: "Envoyez au client le lien de signature électronique du contrat.",
          action: {
            label: "Envoyer le contrat",
            onClick: () => setContractInvoice({ ...paidInvoice, id: paidInvoiceId, status: 'paid' }),
          },
          duration: 15000,
        });
      }
    } catch (error) {
      toast.error(error?.message || "Erreur lors de la mise à jour");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleViewReceipt = async (receiptPath) => {
    if (!receiptPath) {
      toast.error("Aucun reçu disponible pour cette facture");
      return;
    }

    // Open synchronously to avoid popup blockers after the async storage call
    const previewWindow = window.open('about:blank', '_blank');

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(receiptPath, 300);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Signed URL missing');

      if (previewWindow) {
        previewWindow.location.href = data.signedUrl;
      } else {
        // Fallback when the browser blocked window.open
        window.location.assign(data.signedUrl);
      }
    } catch (err) {
      if (previewWindow) previewWindow.close();
      console.error('Receipt open failed:', err);
      toast.error("Impossible d'ouvrir le reçu");
    }
  };

  const handleEditClick = (invoice) => {
    setSelectedInvoice(invoice);
    setEditForm({
      client_first_name: invoice.client_first_name,
      client_last_name: invoice.client_last_name,
      client_email: invoice.client_email,
      client_whatsapp: invoice.client_whatsapp,
      amount: String(invoice.amount ?? ''),
      procedure_type: invoice.procedure_type || ''
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
          procedure_type: editForm.procedure_type || null,
          ...(isLockedForUser(selectedInvoice) ? {} : { amount: parseFloat(validated.amount) })
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      // Log the edit action
      try {
        await supabase.rpc('create_audit_log', {
          p_action: 'EDIT',
          p_table_name: 'invoices',
          p_record_id: selectedInvoice.id,
          p_metadata: { edited_fields: Object.keys(editForm), invoice_number: selectedInvoice.invoice_number }
        });
      } catch (e) { /* non-critical */ }

      toast.success("Facture modifiée avec succès");
      setEditDialogOpen(false);
      fetchInvoices();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error?.message || "Erreur lors de la modification de la facture");
      }
    }
  };

  const handleDeleteClick = (invoice) => {
    setSelectedInvoice(invoice);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;
    setDeleteSubmitting(true);
    try {
      if (isAdmin) {
        try {
          await supabase.rpc('create_audit_log', {
            p_action: 'DELETE',
            p_table_name: 'invoices',
            p_record_id: selectedInvoice.id,
            p_metadata: { invoice_number: selectedInvoice.invoice_number, amount: selectedInvoice.amount }
          });
        } catch (e) { /* non-critical */ }

        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', selectedInvoice.id);

        if (error) throw error;
        toast.success("Facture supprimée avec succès");
      } else {
        if (!deleteReason.trim()) {
          toast.error("Merci d'indiquer le motif de la suppression");
          setDeleteSubmitting(false);
          return;
        }
        const { error } = await supabase.rpc('request_invoice_deletion', {
          p_invoice_id: selectedInvoice.id,
          p_reason: deleteReason.trim(),
        });
        if (error) throw error;
        toast.success("Demande envoyée à l'administrateur pour validation");
      }
      setDeleteDialogOpen(false);
      setDeleteReason('');
      refetch();
    } catch (error) {
      toast.error(error?.message || "Erreur lors de la suppression de la facture");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const isStale = (lastStatusChange, status) =>
    getFollowUpLevel(lastStatusChange, status, followUpDays) !== null;

  // Extract unique services from invoices
  const uniqueServices = useMemo(() => {
    const services = [...new Set(invoices.map(inv => inv.service_description))];
    return services.filter(Boolean).sort();
  }, [invoices]);

  const availableYears = useMemo(() => getAvailableYears(), []);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredInvoices = useMemo(() => {
    const filtered = invoices.filter((invoice) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        [invoice.client_first_name, invoice.client_last_name, invoice.invoice_number]
          .some((value) => String(value || '').toLowerCase().includes(term));

      const matchesSalesRep = filterSalesRep === 'all' || invoice.sales_representative === filterSalesRep;
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      const matchesPaymentType = invoiceMatchesPaymentFilter(invoice.payment_type, filterPaymentType);

      const invoiceDate = new Date(invoice.created_at);
      const matchesMonth =
        filterMonth === 'all' ||
        (invoiceDate.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
      const matchesYear =
        filterYear === 'all' || invoiceDate.getFullYear().toString() === filterYear;
      const matchesService =
        filterService === 'all' || invoice.service_description === filterService;
      const matchesGuide = !filterGuide || isGuideUltime(invoice);

      return (
        matchesSearch &&
        matchesSalesRep &&
        matchesStatus &&
        matchesPaymentType &&
        matchesMonth &&
        matchesYear &&
        matchesService &&
        matchesGuide
      );
    });

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'amount') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      } else if (sortField === 'created_at' || sortField === 'last_status_change') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [invoices, searchTerm, filterSalesRep, filterStatus, filterPaymentType, filterMonth, filterYear, filterService, filterGuide, sortField, sortDir]);

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSalesRep, filterStatus, filterPaymentType, filterMonth, filterYear, filterService, filterGuide]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSalesRep('all');
    setFilterStatus('all');
    setFilterPaymentType('all');
    setFilterMonth('all');
    setFilterYear('all');
    setFilterService('all');
    setFilterGuide(false);
  };

  const hasActiveFilters = searchTerm || filterSalesRep !== 'all' || filterStatus !== 'all' ||
    filterPaymentType !== 'all' || filterMonth !== 'all' || filterYear !== 'all' || filterService !== 'all' || filterGuide;

  if (loading) {
    return (
      <AppLayout title="Gestion CRM">
        <div className="py-8">Chargement...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Gestion CRM" subtitle={`${filteredInvoices.length} facture(s)`}>

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

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filterGuide ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filterGuide}
            onClick={() => setFilterGuide((current) => !current)}
          >
            {GUIDE_ULTIME.buttonLabel}
          </Button>
        </div>

        {/* Filter grid - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Select value={filterSalesRep} onValueChange={setFilterSalesRep}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Commercial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les commerciaux</SelectItem>
              {salesRepNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
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
              {PAYMENT_FILTER_OPTIONS.filter((pt) => pt.value !== 'All').map((pt) => (
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
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('amount')}>
                  Montant <ArrowUpDown className="inline h-3 w-3" />
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell cursor-pointer" onClick={() => toggleSort('created_at')}>
                  Date <ArrowUpDown className="inline h-3 w-3" />
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
              {paginatedInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={`${
                    isStale(invoice.last_status_change, invoice.status)
                      ? 'bg-orange-50'
                      : ''
                  }`}
                >
                  <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-gray-900">
                    <div>{invoice.invoice_number}</div>
                    {isGuideUltime(invoice) && (
                      <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {GUIDE_ULTIME.buttonLabel}
                      </span>
                    )}
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
                      disabled={isLockedForUser(invoice)}
                      onValueChange={(value) => handleStatusChange(invoice.id, value, invoice.payment_type, invoice)}
                    >
                      <SelectTrigger className={`w-32 md:w-48 text-xs md:text-sm ${STATUS_COLORS[invoice.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-1 md:gap-2">
                      <WhatsAppLink
                        phone={invoice.client_whatsapp}
                        message={buildInvoiceWhatsAppMessage(invoice)}
                      />
                      {invoice.receipt_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceipt(invoice.receipt_url)}
                          className="p-1 md:p-2"
                          title="Voir le reçu"
                        >
                          <Receipt className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                        </Button>
                      )}
                      {!isGuideUltime(invoice) && (() => {
                        const state = contractStateByInvoice[invoice.id] || 'non_envoye';
                        const signed = state === 'signe';
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => !signed && setContractInvoice(invoice)}
                            className="p-1 md:p-2"
                            title={signed ? 'Contrat signé' : `${getContractState(state).label} — envoyer le contrat`}
                          >
                            <FileSignature
                              className={`h-3 w-3 md:h-4 md:w-4 ${
                                signed ? 'text-emerald-600' : state === 'non_envoye' ? 'text-slate-400' : 'text-amber-500'
                              }`}
                            />
                          </Button>
                        );
                      })()}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
          {selectedInvoice && (
            <div className="py-2">
              <InvoiceStatusStepper currentStatus={selectedInvoice.status} />
            </div>
          )}
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
                disabled={isLockedForUser(selectedInvoice)}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
              {isLockedForUser(selectedInvoice) && (
                <p className="text-xs text-muted-foreground">
                  Facture payée : seul un administrateur peut modifier le montant.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="procedure_type">Type de procédure</Label>
              <Select
                value={editForm.procedure_type || 'none'}
                onValueChange={(value) => setEditForm({ ...editForm, procedure_type: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="procedure_type">
                  <SelectValue placeholder="Non renseigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non renseigné</SelectItem>
                  {procedureTypes.filter((t) => t.active || t.code === editForm.procedure_type).map((t) => (
                    <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedInvoice && (
            <ClientHistoryPanel
              invoices={invoices}
              clientEmail={selectedInvoice.client_email}
              clientWhatsapp={selectedInvoice.client_whatsapp}
            />
          )}
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
            <AlertDialogTitle>
              {isAdmin ? 'Confirmer la suppression' : 'Demander la suppression'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin
                ? `Êtes-vous sûr de vouloir supprimer la facture ${selectedInvoice?.invoice_number || ''} ? Cette action est irréversible.`
                : `La facture ${selectedInvoice?.invoice_number || ''} ne sera supprimée qu'après validation de l'administrateur. Indiquez le motif.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Motif de la demande *</Label>
              <Input
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex : facture créée en double"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
              disabled={deleteSubmitting || (!isAdmin && !deleteReason.trim())}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isAdmin ? 'Supprimer' : 'Envoyer la demande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        setPaymentDialogOpen(open);
        if (!open) resetPaymentDialog();
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Sélectionnez le mode de paiement et téléchargez le reçu
            </DialogDescription>
          </DialogHeader>
          
          {/* Payment method selection */}
          <RadioGroup 
            value={selectedPaymentMethod} 
            onValueChange={setSelectedPaymentMethod}
            className="grid gap-2 py-2"
          >
            {PAYMENT_CRM_OPTIONS.map((option) => (
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

          {/* Receipt upload */}
          <div className="border-t border-border pt-4 mt-2">
            <Label className="text-sm font-medium mb-2 block">
              <Upload className="h-4 w-4 inline mr-2" />
              Reçu de paiement (obligatoire)
            </Label>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              receiptFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            }`}>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="hidden"
                id="receipt-upload"
              />
              <label htmlFor="receipt-upload" className="cursor-pointer">
                {receiptFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <FileDown className="h-5 w-5" />
                    <span className="text-sm font-medium">{receiptFile.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Cliquez pour télécharger le reçu</p>
                    <p className="text-xs text-muted-foreground mt-1">Image ou PDF</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Partial payment / installment */}
          <div className="border-t border-border pt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={isPartial} onChange={(e) => setIsPartial(e.target.checked)} className="h-4 w-4" />
              Paiement partiel (tranche) — il reste un solde à encaisser
            </label>
            {isPartial && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Total du service</Label>
                  <Input type="number" min="0" value={partialForm.total_amount}
                    onChange={(e) => setPartialForm({ ...partialForm, total_amount: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Montant restant *</Label>
                  <Input type="number" min="0" value={partialForm.remaining_amount}
                    onChange={(e) => setPartialForm({ ...partialForm, remaining_amount: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Date prévue *</Label>
                  <Input type="date" value={partialForm.due_date}
                    onChange={(e) => setPartialForm({ ...partialForm, due_date: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => {
              setPaymentDialogOpen(false);
              resetPaymentDialog();
            }}>
              Annuler
            </Button>
            <Button 
              onClick={handlePaymentConfirm} 
              disabled={!selectedPaymentMethod || !receiptFile || uploadingReceipt}
            >
              {uploadingReceipt ? 'Upload en cours...' : 'Confirmer le paiement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SendContractDialog
        invoice={contractInvoice}
        open={Boolean(contractInvoice)}
        onOpenChange={(open) => !open && setContractInvoice(null)}
      />
    </AppLayout>
  );
};

export default CRMPage;
