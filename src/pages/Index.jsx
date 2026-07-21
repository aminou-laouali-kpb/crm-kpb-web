import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';
import FloatingLabelInput from '../components/FloatingLabelInput';
import ClientInfoSection from '../components/ClientInfoSection';
import ServiceSection from '../components/ServiceSection';
import PaymentTypeSection from '../components/PaymentTypeSection';
import SalesRepSection from '../components/SalesRepSection';
import { templates } from "../utils/templateRegistry";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { validateInvoiceData, sanitizeText } from '../utils/validation';
import { generateSequentialInvoiceNumber, generateRandomInvoiceNumber } from '../utils/invoiceNumber';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useClients, useClientSignatureStatus } from '@/hooks/useClients';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState('');
  const { data: hasValidSignature, isLoading: checkingSignature } = useClientSignatureStatus(selectedClientId || null);
  const [selectedCurrency, setSelectedCurrency] = useState("XOF");
  const [clientInfo, setClientInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    whatsapp: ""
  });
  const [invoice, setInvoice] = useState({ date: "", number: "" });
  const [service, setService] = useState("");
  const [selectedPayments, setSelectedPayments] = useState(["USA"]);
  const [salesRep, setSalesRep] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);

  const signedClients = useMemo(
    () =>
      clients.filter((c) =>
        (c.contract_signatures || []).some((s) => s.signed_at)
      ),
    [clients]
  );

  useEffect(() => {
    const savedFormData = sessionStorage.getItem("formData");
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      setClientInfo(parsedData.clientInfo || { firstName: "", lastName: "", email: "", whatsapp: "" });
      setInvoice(parsedData.invoice || { date: "", number: "" });
      setService(parsedData.service || "");
      const savedPayments = parsedData.selectedPayments || parsedData.paymentType;
      if (Array.isArray(savedPayments)) {
        setSelectedPayments(savedPayments);
      } else if (savedPayments === 'All') {
        setSelectedPayments(['USA', 'Niamey', 'France']);
      } else if (savedPayments) {
        setSelectedPayments(savedPayments.split(','));
      } else {
        setSelectedPayments(['USA']);
      }
      setSalesRep(parsedData.salesRep || "");
      setGrandTotal(parsedData.grandTotal || 0);
      setSelectedCurrency(parsedData.selectedCurrency || "XOF");
      if (parsedData.clientId) setSelectedClientId(parsedData.clientId);
    } else {
      generateSequentialInvoiceNumber().then((number) => {
        setInvoice((prev) => ({ ...prev, number }));
      }).catch(() => {
        setInvoice((prev) => ({ ...prev, number: generateRandomInvoiceNumber() }));
      });
    }
  }, []);

  useEffect(() => {
    const formData = {
      clientInfo,
      invoice,
      service,
      selectedPayments,
      salesRep,
      grandTotal,
      selectedCurrency,
      clientId: selectedClientId,
    };
    sessionStorage.setItem("formData", JSON.stringify(formData));
  }, [clientInfo, invoice, service, selectedPayments, salesRep, grandTotal, selectedCurrency, selectedClientId]);

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setClientInfo({
        firstName: client.first_name || '',
        lastName: client.last_name || '',
        email: client.email || '',
        whatsapp: client.whatsapp || '',
      });
    }
  };

  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const canGenerate = !!selectedClientId && hasValidSignature === true && !checkingSignature;

  const handleTemplateClick = async (templateNumber) => {
    if (!selectedClientId) {
      toast.error("Sélectionnez un client ayant signé le contrat");
      return;
    }
    if (!hasValidSignature) {
      toast.error("Contrat non signé — envoyez le lien depuis Clients / Contrats");
      return;
    }
    if (!salesRep) {
      toast.error("Veuillez sélectionner un commercial");
      return;
    }

    const validation = validateInvoiceData({
      firstName: clientInfo.firstName,
      lastName: clientInfo.lastName,
      email: clientInfo.email,
      whatsapp: clientInfo.whatsapp,
      service: service,
      amount: grandTotal,
      invoiceNumber: invoice.number,
      invoiceDate: invoice.date
    });

    if (!validation.success) {
      toast.error(validation.error);
      return;
    }

    try {
      const validated = validation.data;
      const data = await createInvoice.mutateAsync({
        invoice_number: validated.invoiceNumber,
        invoice_date: validated.invoiceDate,
        client_id: selectedClientId,
        client_first_name: validated.firstName,
        client_last_name: validated.lastName,
        client_email: validated.email,
        client_whatsapp: validated.whatsapp,
        service_description: sanitizeText(validated.service),
        amount: validated.amount,
        currency: selectedCurrency,
        payment_type: selectedPayments.join(','),
        sales_representative: salesRep,
        template_number: templateNumber,
        status: 'generated'
      });

      toast.success("Facture enregistrée avec succès!");

      const formData = {
        clientInfo,
        invoice,
        service,
        paymentInfo: { types: selectedPayments },
        salesRep,
        grandTotal,
        selectedCurrency,
        clientId: selectedClientId,
      };
      sessionStorage.setItem("formData", JSON.stringify(formData));
      navigate("/template", {
        state: { formData, selectedTemplate: templateNumber, invoiceId: data.id },
      });
    } catch (error) {
      const msg = error?.message || "Erreur lors de l'enregistrement de la facture";
      toast.error(msg);
    }
  };

  const fillDummyData = () => {
    setClientInfo({
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@example.com",
      whatsapp: "+33612345678"
    });
    setInvoice({
      date: new Date().toISOString().split("T")[0],
      number: generateRandomInvoiceNumber(),
    });
    setService("Formation en développement web - Programme complet de 6 mois");
    setSelectedPayments(["France"]);
    setSalesRep("Josphin");
    setGrandTotal(1500);
  };

  const clearForm = async () => {
    setClientInfo({ firstName: "", lastName: "", email: "", whatsapp: "" });
    setSelectedClientId('');
    const number = await generateSequentialInvoiceNumber().catch(() => generateRandomInvoiceNumber());
    setInvoice({ date: "", number });
    setService("");
    setSelectedPayments(["USA"]);
    setSalesRep("");
    setGrandTotal(0);
    sessionStorage.removeItem("formData");
  };

  return (
    <AppLayout
      title="Générateur de Factures KPB"
      subtitle="Créez vos factures professionnelles en quelques clics"
    >
      <div className="relative pb-20 md:pb-8">
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 flex flex-col gap-3 z-50">
          <button
            onClick={clearForm}
            className="w-14 h-14 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:shadow-xl transition-smooth tap-highlight flex items-center justify-center group hover:scale-110"
            aria-label="Effacer le formulaire"
          >
            <FiTrash2 size={22} />
          </button>
          {import.meta.env.DEV && (
            <button
              onClick={fillDummyData}
              className="w-14 h-14 bg-gradient-primary text-white rounded-full shadow-lg hover:shadow-glow transition-smooth tap-highlight flex items-center justify-center group hover:scale-110"
              aria-label="Remplir avec des données test"
            >
              <FiEdit size={22} />
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="w-full md:w-1/2 glass rounded-2xl p-6 md:p-8 shadow-lg">
            <form>
              <div className="mb-6">
                <Label className="text-base font-semibold mb-2 block">Client (contrat signé requis)</Label>
                <Select value={selectedClientId} onValueChange={handleSelectClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client signé" />
                  </SelectTrigger>
                  <SelectContent>
                    {signedClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} — {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {signedClients.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Aucun client avec contrat signé.{' '}
                    <button type="button" className="underline text-primary" onClick={() => navigate('/clients')}>
                      Aller à Clients / Contrats
                    </button>
                  </p>
                )}
                {selectedClientId && hasValidSignature === false && !checkingSignature && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Contrat non signé pour la version active.{' '}
                      <button type="button" className="underline" onClick={() => navigate('/clients')}>
                        Envoyer le lien
                      </button>
                    </span>
                  </div>
                )}
              </div>

              <ClientInfoSection
                clientInfo={clientInfo}
                handleInputChange={handleInputChange(setClientInfo)}
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
              />

              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Informations de la facture</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FloatingLabelInput
                    id="invoiceNumber"
                    label="Numéro de facture"
                    value={invoice.number}
                    onChange={handleInputChange(setInvoice)}
                    name="number"
                  />
                  <FloatingLabelInput
                    id="invoiceDate"
                    label="Date de la facture"
                    type="date"
                    value={invoice.date}
                    onChange={handleInputChange(setInvoice)}
                    name="date"
                  />
                </div>
              </div>

              <ServiceSection service={service} handleServiceChange={(e) => setService(e.target.value)} />

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Montant total</h3>
                <input
                  type="number"
                  value={grandTotal}
                  onChange={(e) => setGrandTotal(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  placeholder="Entrez le montant total"
                />
                <p className="mt-2 text-sm text-gray-600">
                  {formatCurrency(grandTotal, selectedCurrency)}
                </p>
              </div>

              <PaymentTypeSection
                selectedPayments={selectedPayments}
                handlePaymentToggle={setSelectedPayments}
              />

              <SalesRepSection salesRep={salesRep} handleSalesRepChange={setSalesRep} />
            </form>
          </div>

          <div className="w-full md:w-1/2">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Choisir un modèle</h2>
            {!canGenerate && (
              <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
                Génération bloquée tant qu&apos;un client avec signature valide n&apos;est pas sélectionné.
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {templates.map((template, index) => (
                <div
                  key={index}
                  className={`group p-5 md:p-6 border-2 rounded-2xl transition-smooth glass ${
                    canGenerate
                      ? 'cursor-pointer border-border hover:border-primary hover:shadow-lg tap-highlight'
                      : 'opacity-50 cursor-not-allowed border-muted'
                  }`}
                  onClick={() => canGenerate && handleTemplateClick(index + 1)}
                  aria-disabled={!canGenerate}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold">{template.name}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {canGenerate ? 'Cliquez pour générer la facture' : 'Contrat requis'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="link" className="mt-4 px-0" onClick={() => navigate('/clients')}>
              Gérer les clients et contrats →
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
