import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { peekNextInvoiceNumber, PENDING_INVOICE_NUMBER, isDuplicateInvoiceNumberError } from '../utils/invoiceNumber';
import {
  getMissingInvoiceFields,
  parseAmountInput,
  todayISODate,
} from '../utils/invoiceFormCompleteness';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { GUIDE_ULTIME } from '@/constants/products';
import AppLayout from '@/components/layout/AppLayout';

const emptyClient = { firstName: "", lastName: "", email: "", whatsapp: "" };

const Index = () => {
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const hydratedRef = useRef(false);
  const [selectedCurrency, setSelectedCurrency] = useState("XOF");
  const [clientInfo, setClientInfo] = useState(emptyClient);
  const [invoice, setInvoice] = useState({ date: todayISODate(), number: "" });
  const [service, setService] = useState("");
  const [selectedPayments, setSelectedPayments] = useState(["USA"]);
  const [salesRep, setSalesRep] = useState("");
  const [grandTotal, setGrandTotal] = useState('');
  const [isGuideUltime, setIsGuideUltime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const refreshPreviewNumber = async () => {
    try {
      return await peekNextInvoiceNumber();
    } catch {
      return PENDING_INVOICE_NUMBER;
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const savedFormData = sessionStorage.getItem("formData");
      let nextClient = emptyClient;
      let nextInvoice = { date: todayISODate(), number: "" };
      let nextService = "";
      let nextPayments = ["USA"];
      let nextSalesRep = "";
      let nextTotal = '';
      let nextCurrency = "XOF";
      let nextGuide = false;

      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          nextClient = parsedData.clientInfo || emptyClient;
          nextInvoice = {
            date: parsedData.invoice?.date || todayISODate(),
            // Never reuse a consumed number — always show the next global preview
            number: '',
          };
          nextService = parsedData.service || "";
          const savedPayments =
            parsedData.selectedPayments
            || parsedData.paymentInfo?.types
            || parsedData.paymentType;
          if (Array.isArray(savedPayments) && savedPayments.length) {
            nextPayments = savedPayments;
          } else if (savedPayments === 'All') {
            nextPayments = ['USA', 'Niamey', 'France'];
          } else if (typeof savedPayments === 'string' && savedPayments.trim()) {
            nextPayments = savedPayments.split(',').map((p) => p.trim()).filter(Boolean);
          }
          nextSalesRep = parsedData.salesRep || "";
          nextTotal = parsedData.grandTotal === 0 || parsedData.grandTotal
            ? String(parsedData.grandTotal)
            : '';
          nextCurrency = parsedData.selectedCurrency || "XOF";
          nextGuide = Boolean(parsedData.isGuideUltime);
        } catch {
          // ignore corrupt session data
        }
      }

      if (nextGuide) {
        nextService = GUIDE_ULTIME.label;
        nextTotal = String(GUIDE_ULTIME.price);
        nextCurrency = GUIDE_ULTIME.currency;
      }

      // Preview only — the real number is assigned server-side on INSERT (global sequence)
      nextInvoice.number = await refreshPreviewNumber();
      if (!nextInvoice.date) nextInvoice.date = todayISODate();

      setClientInfo(nextClient);
      setInvoice(nextInvoice);
      setService(nextService);
      setSelectedPayments(nextPayments.length ? nextPayments : ["USA"]);
      setSalesRep(nextSalesRep);
      setGrandTotal(nextTotal);
      setSelectedCurrency(nextCurrency);
      setIsGuideUltime(nextGuide);
      hydratedRef.current = true;
    };

    bootstrap();
  }, []);

  useEffect(() => {
    // Avoid wiping a previous draft with empty state on first mount
    if (!hydratedRef.current) return;
    const formData = {
      clientInfo,
      invoice,
      service,
      selectedPayments,
      paymentInfo: { types: selectedPayments },
      salesRep,
      grandTotal: parseAmountInput(grandTotal),
      selectedCurrency,
      isGuideUltime,
    };
    try {
      sessionStorage.setItem("formData", JSON.stringify(formData));
    } catch {
      // Safari private mode blocks storage writes — draft saving is optional
    }
  }, [clientInfo, invoice, service, selectedPayments, salesRep, grandTotal, selectedCurrency, isGuideUltime]);

  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const amountValue = parseAmountInput(grandTotal);
  const saleService = isGuideUltime ? GUIDE_ULTIME.label : service;
  const saleAmount = isGuideUltime ? GUIDE_ULTIME.price : amountValue;
  const saleCurrency = isGuideUltime ? GUIDE_ULTIME.currency : selectedCurrency;
  const missingFields = useMemo(
    () => getMissingInvoiceFields({
      clientInfo,
      invoice,
      service: saleService,
      salesRep,
      grandTotal: saleAmount,
    }),
    [clientInfo, invoice, saleService, salesRep, saleAmount]
  );
  const canGenerate = missingFields.length === 0 && !submitting;

  const handleTemplateClick = async (templateNumber) => {
    setSubmitError('');
    if (missingFields.length > 0) {
      const msg = `Formulaire incomplet : ${missingFields.join(', ')}`;
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    // Normalize WhatsApp: strip spaces/dashes commercials often type
    const normalizedWhatsapp = String(clientInfo.whatsapp || '')
      .trim()
      .replace(/[\s().-]/g, '');

    setSubmitting(true);

    // Placeholder only — the DB trigger assigns the real global KPB-YYYY-NNNN
    const invoiceNumber = PENDING_INVOICE_NUMBER;

    const validation = validateInvoiceData({
      firstName: clientInfo.firstName,
      lastName: clientInfo.lastName,
      email: clientInfo.email,
      whatsapp: normalizedWhatsapp,
      service: saleService,
      amount: saleAmount,
      invoiceNumber,
      invoiceDate: invoice.date
    });

    if (!validation.success) {
      setSubmitting(false);
      setSubmitError(validation.error);
      toast.error(validation.error);
      return;
    }

    try {
      const validated = validation.data;

      let data;
      try {
        data = await createInvoice.mutateAsync({
          invoice_number: PENDING_INVOICE_NUMBER,
          invoice_date: validated.invoiceDate,
          client_first_name: validated.firstName,
          client_last_name: validated.lastName,
          client_email: validated.email,
          client_whatsapp: validated.whatsapp,
          service_description: isGuideUltime ? GUIDE_ULTIME.label : sanitizeText(validated.service),
          amount: isGuideUltime ? GUIDE_ULTIME.price : validated.amount,
          currency: saleCurrency,
          product_code: isGuideUltime ? GUIDE_ULTIME.productCode : null,
          payment_type: (Array.isArray(selectedPayments) ? selectedPayments : ['USA']).join(','),
          sales_representative: salesRep,
          template_number: templateNumber,
          status: 'generated'
        });
      } catch (invoiceError) {
        const raw = invoiceError?.message || '';
        if (/invalid input value for enum sales_rep/i.test(raw)) {
          throw new Error(
            `Le commercial « ${salesRep} » n'est pas reconnu en base. Contactez un admin pour mettre à jour la liste.`
          );
        }
        if (/accès refusé|row-level security/i.test(raw)) {
          throw new Error(
            "Accès refusé : votre compte n'a pas les droits nécessaires. Contactez un admin."
          );
        }
        if (/get_next_invoice_number|numérotation|sequence/i.test(raw)) {
          throw new Error(
            "Numérotation globale indisponible. Demandez à un admin d'appliquer la migration de séquence sur Supabase."
          );
        }
        throw invoiceError;
      }

      const usedNumber = data?.invoice_number || invoice.number;
      setInvoice((prev) => ({ ...prev, number: usedNumber }));
      toast.success(`Facture enregistrée (${usedNumber})`);

      const formData = {
        clientInfo: {
          ...clientInfo,
          whatsapp: validated.whatsapp,
        },
        invoice: { ...invoice, number: usedNumber },
        service: isGuideUltime ? GUIDE_ULTIME.label : service,
        paymentInfo: { types: selectedPayments },
        selectedPayments,
        salesRep,
        grandTotal: saleAmount,
        selectedCurrency: saleCurrency,
        isGuideUltime,
        invoiceNumberConsumed: true,
      };
      try {
        sessionStorage.setItem("formData", JSON.stringify(formData));
      } catch {
        // Safari private mode can block storage — navigation still works
      }
      navigate("/template", {
        state: { formData, selectedTemplate: templateNumber, invoiceId: data.id },
      });
    } catch (error) {
      const msg = isDuplicateInvoiceNumberError(error)
        ? "Conflit de numéro de facture. Réessayez."
        : (error?.message || "Erreur lors de l'enregistrement de la facture");
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDummyData = async () => {
    setClientInfo({
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@example.com",
      whatsapp: "+33612345678"
    });
    setInvoice({
      date: todayISODate(),
      number: await refreshPreviewNumber(),
    });
    setService("Formation en développement web - Programme complet de 6 mois");
    setSelectedPayments(["France"]);
    setSalesRep("Josphin");
    setGrandTotal('1500');
    setIsGuideUltime(false);
  };

  const clearForm = async () => {
    hydratedRef.current = false;
    setClientInfo(emptyClient);
    const number = await refreshPreviewNumber();
    setInvoice({ date: todayISODate(), number });
    setService("");
    setSelectedPayments(["USA"]);
    setSalesRep("");
    setGrandTotal('');
    setIsGuideUltime(false);
    sessionStorage.removeItem("formData");
    hydratedRef.current = true;
  };

  return (
    <AppLayout
      title="Générateur de Factures KPB"
      subtitle="Créez des factures professionnelles en quelques clics"
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <ClientInfoSection
                clientInfo={clientInfo}
                handleInputChange={handleInputChange(setClientInfo)}
                selectedCurrency={saleCurrency}
                setSelectedCurrency={(value) => {
                  if (!isGuideUltime) setSelectedCurrency(value);
                }}
                currencyLocked={isGuideUltime}
              />

              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Informations de la facture</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FloatingLabelInput
                    id="invoiceNumber"
                    label="N° facture (aperçu — attribué à l'enregistrement)"
                    value={invoice.number}
                    onChange={handleInputChange(setInvoice)}
                    name="number"
                    disabled
                    className="opacity-80"
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

              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Produit</h2>
                <button
                  type="button"
                  aria-pressed={isGuideUltime}
                  onClick={() => {
                    if (isGuideUltime) {
                      setIsGuideUltime(false);
                      return;
                    }
                    setIsGuideUltime(true);
                    setService(GUIDE_ULTIME.label);
                    setGrandTotal(String(GUIDE_ULTIME.price));
                    setSelectedCurrency(GUIDE_ULTIME.currency);
                  }}
                  className={`w-full text-left flex items-start gap-3 p-3 border rounded-md transition-colors tap-highlight ${
                    isGuideUltime
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${
                      isGuideUltime
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-primary'
                    }`}
                  >
                    {isGuideUltime ? '✓' : ''}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold">{GUIDE_ULTIME.buttonLabel}</span>
                    <span className="block text-sm text-muted-foreground mt-1">
                      {GUIDE_ULTIME.label} — {formatCurrency(GUIDE_ULTIME.price, GUIDE_ULTIME.currency, 0)}
                    </span>
                    {isGuideUltime && (
                      <span className="block text-sm font-medium text-primary mt-1">
                        Commission : {formatCurrency(GUIDE_ULTIME.commission, GUIDE_ULTIME.currency, 0)}
                      </span>
                    )}
                  </span>
                </button>
              </div>

              <ServiceSection
                service={saleService}
                handleServiceChange={(e) => setService(e.target.value)}
                disabled={isGuideUltime}
              />

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Montant total</h3>
                <input
                  type="text"
                  inputMode="decimal"
                  value={isGuideUltime ? String(GUIDE_ULTIME.price) : grandTotal}
                  onChange={(e) => setGrandTotal(e.target.value)}
                  disabled={isGuideUltime}
                  className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isGuideUltime ? 'bg-muted cursor-not-allowed opacity-80' : ''
                  }`}
                  placeholder="Ex: 150000"
                />
                <p className="mt-2 text-sm text-gray-600">
                  {saleAmount > 0
                    ? formatCurrency(saleAmount, saleCurrency)
                    : 'Saisissez le montant'}
                </p>
              </div>

              <PaymentTypeSection
                selectedPayments={Array.isArray(selectedPayments) ? selectedPayments : ['USA']}
                handlePaymentToggle={(next) => {
                  const safe = Array.isArray(next) && next.length ? next : ['USA'];
                  setSelectedPayments(safe);
                }}
              />

              <SalesRepSection salesRep={salesRep} handleSalesRepChange={setSalesRep} />
            </form>
          </div>

          <div className="w-full md:w-1/2">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Choisir un modèle</h2>
            {!canGenerate && (
              <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
                <p className="font-medium mb-1">Formulaire incomplet</p>
                {missingFields.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-0.5">
                    {missingFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Enregistrement en cours…</p>
                )}
                <p className="mt-2 text-xs text-amber-800">
                  Astuce : vérifiez surtout la <strong>date</strong>, le <strong>montant</strong> et le <strong>commercial</strong>.
                </p>
              </div>
            )}
            {submitError && (
              <div className="mb-4 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
                {submitError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:gap-4">

              {templates.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleTemplateClick(index + 1)}
                  className={`group w-full text-left p-5 md:p-6 border-2 rounded-2xl transition-smooth glass cursor-pointer tap-highlight ${
                    canGenerate
                      ? 'border-border hover:border-primary hover:shadow-lg'
                      : 'opacity-60 border-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold">{template.name}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {canGenerate
                          ? (submitting ? 'Enregistrement…' : 'Appuyez pour générer la facture')
                          : (missingFields[0]
                            ? `Manque : ${missingFields[0]}${missingFields.length > 1 ? ` (+${missingFields.length - 1})` : ''}`
                            : 'Formulaire incomplet')}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
