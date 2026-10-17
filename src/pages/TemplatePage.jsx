import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink, Send, FileSignature } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import InvoiceTemplate from '../components/InvoiceTemplate';
import { generatePDF } from '../utils/pdfGenerator';
import { templates } from '../utils/templateRegistry';
import { useUpdateInvoice } from '@/hooks/useInvoices';
import { buildWhatsAppLink, buildInvoiceSentMessage } from '@/utils/whatsappUtils';
import AppLayout from '@/components/layout/AppLayout';
import SendContractDialog from '@/components/contracts/SendContractDialog';

const TemplatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const updateInvoice = useUpdateInvoice();
  const [formData, setFormData] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(1);
  const [invoiceId, setInvoiceId] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  useEffect(() => {
    if (location.state?.formData) {
      setFormData(location.state.formData);
      setCurrentTemplate(location.state.selectedTemplate || 1);
      setInvoiceId(location.state.invoiceId || null);
      sessionStorage.setItem('formData', JSON.stringify(location.state.formData));
    } else {
      const savedFormData = sessionStorage.getItem('formData');
      if (savedFormData) {
        const parsedData = JSON.parse(savedFormData);
        setFormData({
          ...parsedData,
          paymentInfo: parsedData.paymentInfo || { types: parsedData.selectedPayments || ['USA'] },
          clientInfo: parsedData.clientInfo || { firstName: '', lastName: '', email: '', whatsapp: '' },
          invoice: parsedData.invoice || { date: '', number: '' },
          service: parsedData.service || '',
          salesRep: parsedData.salesRep || '',
          selectedCurrency: parsedData.selectedCurrency || 'XOF',
          grandTotal: parsedData.grandTotal || 0,
        });
      }
    }
  }, [location.state]);

  const handleDownloadPDF = async () => {
    if (formData && !isDownloading) {
      setIsDownloading(true);
      try {
        await generatePDF(formData, currentTemplate);
        toast.success("PDF généré avec succès");
      } catch (error) {
        toast.error(error.message || "Échec de génération du PDF. Réessayez.");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleMarkAsSent = async () => {
    if (!invoiceId) {
      navigate('/crm');
      return;
    }
    try {
      await updateInvoice.mutateAsync({ id: invoiceId, updates: { status: 'sent' } });
      toast.success('Facture marquée comme envoyée');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleWhatsAppSend = () => {
    if (!formData?.clientInfo?.whatsapp) {
      toast.error('Numéro WhatsApp client manquant');
      return;
    }
    const invoice = {
      client_first_name: formData.clientInfo.firstName,
      client_last_name: formData.clientInfo.lastName,
      invoice_number: formData.invoice?.number,
      amount: formData.grandTotal,
      currency: formData.selectedCurrency,
    };
    const link = buildWhatsAppLink(
      formData.clientInfo.whatsapp,
      buildInvoiceSentMessage(invoice)
    );
    window.open(link, '_blank');
  };

  if (!formData) {
    return (
      <AppLayout title="Aperçu facture">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Aucune donnée de facture trouvée.</p>
          <Button onClick={() => navigate('/')}>Retour au générateur</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Aperçu de la facture" subtitle={`Modèle ${currentTemplate}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadPDF} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Téléchargement...
              </>
            ) : (
              'Télécharger PDF'
            )}
          </Button>
          <Button variant="outline" onClick={handleMarkAsSent}>
            <Send className="mr-2 h-4 w-4" />
            Marquer envoyée
          </Button>
          <Button variant="outline" onClick={handleWhatsAppSend}>
            WhatsApp client
          </Button>
          {invoiceId && !formData.isGuideUltime && (
            <Button variant="outline" onClick={() => setContractOpen(true)}>
              <FileSignature className="mr-2 h-4 w-4 text-emerald-600" />
              Envoyer le contrat à signer
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/crm')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Ouvrir CRM
          </Button>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {templates.map((template, index) => (
            <div
              key={index}
              className={`cursor-pointer p-2 md:p-4 border rounded whitespace-nowrap text-xs md:text-base ${
                currentTemplate === index + 1
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
              }`}
              onClick={() => setCurrentTemplate(index + 1)}
            >
              {template.name}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[210mm] mx-auto border shadow-lg overflow-auto bg-white">
        <div id="invoice-root" className="w-full">
          <InvoiceTemplate data={formData} templateNumber={currentTemplate} />
        </div>
      </div>

      <SendContractDialog
        invoice={invoiceId ? {
          id: invoiceId,
          invoice_number: formData.invoice?.number,
          client_first_name: formData.clientInfo?.firstName,
          client_last_name: formData.clientInfo?.lastName,
          client_whatsapp: formData.clientInfo?.whatsapp,
        } : null}
        open={contractOpen}
        onOpenChange={setContractOpen}
      />
    </AppLayout>
  );
};

export default TemplatePage;
