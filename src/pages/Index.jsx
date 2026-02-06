import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';
import FloatingLabelInput from '../components/FloatingLabelInput';
import ClientInfoSection from '../components/ClientInfoSection';
import ServiceSection from '../components/ServiceSection';
import PaymentTypeSection from '../components/PaymentTypeSection';
import SalesRepSection from '../components/SalesRepSection';
import { templates } from "../utils/templateRegistry";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from '@/hooks/useAuth';
import { validateInvoiceData, sanitizeText } from '../utils/validation';

const generateRandomInvoiceNumber = () => {
  const length = Math.floor(Math.random() * 6) + 3;
  const alphabetCount = Math.min(Math.floor(Math.random() * 4), length);
  let result = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  for (let i = 0; i < alphabetCount; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  for (let i = alphabetCount; i < length; i++) {
    result += numbers[Math.floor(Math.random() * numbers.length)];
  }

  return result;
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState("XOF");
  const [clientInfo, setClientInfo] = useState({ 
    firstName: "", 
    lastName: "",
    email: "",
    whatsapp: ""
  });
  const [invoice, setInvoice] = useState({
    date: "",
    number: "",
  });
  const [service, setService] = useState("");
  const [selectedPayments, setSelectedPayments] = useState(["USA"]);
  const [salesRep, setSalesRep] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    // Load form data from sessionStorage on component mount
    // Using sessionStorage instead of localStorage for PII protection:
    // - Data clears automatically when tab/browser closes
    // - Reduces exposure on shared devices
    const savedFormData = sessionStorage.getItem("formData");
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      setClientInfo(parsedData.clientInfo || { firstName: "", lastName: "", email: "", whatsapp: "" });
      setInvoice(parsedData.invoice || { date: "", number: "" });
      setService(parsedData.service || "");
      // Normalize old payment types for backward compatibility
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
    } else {
      // If no saved data, set invoice number
      setInvoice((prev) => ({
        ...prev,
        number: generateRandomInvoiceNumber(),
      }));
    }
  }, []);

  useEffect(() => {
    // Save form data to sessionStorage whenever it changes
    // Using sessionStorage for PII protection - clears on tab close
    const formData = {
      clientInfo,
      invoice,
      service,
      selectedPayments,
      salesRep,
      grandTotal,
      selectedCurrency,
    };
    sessionStorage.setItem("formData", JSON.stringify(formData));
  }, [
    clientInfo,
    invoice,
    service,
    selectedPayments,
    salesRep,
    grandTotal,
    selectedCurrency,
  ]);

  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (e) => {
    setService(e.target.value);
  };

  const handlePaymentToggle = (newPayments) => {
    setSelectedPayments(newPayments);
  };

  const handleSalesRepChange = (value) => {
    setSalesRep(value);
  };

  const handleTotalChange = (e) => {
    setGrandTotal(parseFloat(e.target.value) || 0);
  };

  const handleTemplateClick = async (templateNumber) => {
    // Basic presence validation
    if (!salesRep) {
      toast.error("Veuillez sélectionner un commercial");
      return;
    }

    // UX-only check - actual security is enforced by RLS policies on the database
    if (!user) {
      toast.error("Vous devez être connecté pour créer des factures");
      navigate('/auth');
      return;
    }

    // Comprehensive validation with Zod
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

    // Save to database with validated and sanitized data
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const validated = validation.data;
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: validated.invoiceNumber,
          invoice_date: validated.invoiceDate,
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
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Facture enregistrée avec succès!");

      const formData = {
        clientInfo,
        invoice,
        service,
        paymentInfo: { types: selectedPayments },
        salesRep,
        grandTotal,
        selectedCurrency,
      };
      navigate("/template", {
        state: { formData, selectedTemplate: templateNumber, invoiceId: data.id },
      });
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la facture");
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
    setService("Formation en développement web - Programme complet de 6 mois incluant HTML, CSS, JavaScript, React et Node.js");
    setSelectedPayments(["France"]);
    setSalesRep("Josphin");
    setGrandTotal(1500);
  };

  if (authLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  const clearForm = () => {
    setClientInfo({ firstName: "", lastName: "", email: "", whatsapp: "" });
    setInvoice({
      date: "",
      number: generateRandomInvoiceNumber(),
    });
    setService("");
    setSelectedPayments(["USA"]);
    setSalesRep("");
    setGrandTotal(0);
    sessionStorage.removeItem("formData");
  };

  return (
    <div className="min-h-screen bg-gradient-hero animate-gradient">
      <div className="container mx-auto px-4 py-4 md:py-8 relative pb-20 md:pb-8">
        {/* Modern Header with Glassmorphism */}
        <div className="glass rounded-2xl p-4 md:p-6 mb-6 animate-slide-up shadow-lg sticky top-4 z-40">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">
                Générateur de Factures KPB
              </h1>
              <p className="text-sm text-muted-foreground">Créez vos factures professionnelles en quelques clics</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
              <span className="text-xs md:text-sm text-muted-foreground truncate max-w-full px-3 py-1.5 bg-secondary rounded-full">
                {user?.email}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 sm:flex-none tap-highlight hover:bg-destructive/10 hover:text-destructive transition-smooth">
                  <LogOut className="h-4 w-4 md:mr-2" /> <span className="hidden sm:inline">Déconnexion</span>
                </Button>
                <Button onClick={() => navigate('/crm')} className="flex-1 sm:flex-none text-xs md:text-sm bg-gradient-primary hover:opacity-90 transition-smooth tap-highlight">
                  CRM
                </Button>
              </div>
            </div>
          </div>
        </div>
      
        {/* Floating Action Buttons with Modern Design */}
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 flex flex-col gap-3 z-50">
          <button
            onClick={clearForm}
            className="w-14 h-14 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:shadow-xl transition-smooth tap-highlight flex items-center justify-center group hover:scale-110"
            aria-label="Effacer le formulaire"
          >
            <FiTrash2 size={22} className="group-hover:scale-110 transition-smooth" />
          </button>
          <button
            onClick={fillDummyData}
            className="w-14 h-14 bg-gradient-primary text-white rounded-full shadow-lg hover:shadow-glow transition-smooth tap-highlight flex items-center justify-center group hover:scale-110"
            aria-label="Remplir avec des données test"
          >
            <FiEdit size={22} className="group-hover:scale-110 transition-smooth" />
          </button>
        </div>

        {/* Main Content with Modern Cards */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="w-full md:w-1/2 glass rounded-2xl p-6 md:p-8 shadow-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <form>
            <ClientInfoSection
              clientInfo={clientInfo}
              handleInputChange={handleInputChange(setClientInfo)}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
            />

            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">
                Informations de la facture
              </h2>
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

            <ServiceSection 
              service={service}
              handleServiceChange={handleServiceChange}
            />

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Montant total</h3>
              <input
                type="number"
                value={grandTotal}
                onChange={handleTotalChange}
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
              handlePaymentToggle={handlePaymentToggle}
            />

            <SalesRepSection 
              salesRep={salesRep}
              handleSalesRepChange={handleSalesRepChange}
            />
          </form>
        </div>

          {/* Templates Section with Modern Cards */}
          <div className="w-full md:w-1/2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl md:text-2xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              Choisir un modèle
            </h2>
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {templates.map((template, index) => (
                <div
                  key={index}
                  className="group cursor-pointer p-5 md:p-6 border-2 border-border rounded-2xl hover:border-primary transition-smooth hover:shadow-lg glass tap-highlight hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => handleTemplateClick(index + 1)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-smooth">
                        {template.name}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        Cliquez pour générer la facture
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-gradient-primary group-hover:scale-110 transition-smooth">
                      <svg className="w-5 h-5 text-primary group-hover:text-white transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
