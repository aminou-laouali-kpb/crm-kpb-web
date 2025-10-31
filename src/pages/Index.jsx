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
  const [paymentType, setPaymentType] = useState("USA");
  const [salesRep, setSalesRep] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    // Load form data from localStorage on component mount
    const savedFormData = localStorage.getItem("formData");
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      setClientInfo(parsedData.clientInfo || { firstName: "", lastName: "", email: "", whatsapp: "" });
      setInvoice(parsedData.invoice || { date: "", number: "" });
      setService(parsedData.service || "");
      setPaymentType(parsedData.paymentType || "USA");
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
    // Save form data to localStorage whenever it changes
    const formData = {
      clientInfo,
      invoice,
      service,
      paymentType,
      salesRep,
      grandTotal,
      selectedCurrency,
    };
    localStorage.setItem("formData", JSON.stringify(formData));
  }, [
    clientInfo,
    invoice,
    service,
    paymentType,
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

  const handlePaymentTypeChange = (value) => {
    setPaymentType(value);
  };

  const handleSalesRepChange = (value) => {
    setSalesRep(value);
  };

  const handleTotalChange = (e) => {
    setGrandTotal(parseFloat(e.target.value) || 0);
  };

  const handleTemplateClick = async (templateNumber) => {
    // Validation
    if (!clientInfo.firstName || !clientInfo.lastName) {
      toast.error("Veuillez renseigner le prénom et le nom du client");
      return;
    }
    if (!clientInfo.email || !clientInfo.whatsapp) {
      toast.error("Veuillez renseigner l'email et le WhatsApp du client");
      return;
    }
    if (!service) {
      toast.error("Veuillez renseigner le service");
      return;
    }
    if (!salesRep) {
      toast.error("Veuillez sélectionner un commercial");
      return;
    }
    if (!invoice.date || !invoice.number) {
      toast.error("Veuillez renseigner la date et le numéro de facture");
      return;
    }
    if (grandTotal <= 0) {
      toast.error("Le montant total doit être supérieur à 0");
      return;
    }

    // UX-only check - actual security is enforced by RLS policies on the database
    if (!user) {
      toast.error("Vous devez être connecté pour créer des factures");
      navigate('/auth');
      return;
    }

    // Save to database
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoice.number,
          invoice_date: invoice.date,
          client_first_name: clientInfo.firstName,
          client_last_name: clientInfo.lastName,
          client_email: clientInfo.email,
          client_whatsapp: clientInfo.whatsapp,
          service_description: service,
          amount: grandTotal,
          currency: selectedCurrency,
          payment_type: paymentType,
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
        paymentInfo: { type: paymentType },
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
    setPaymentType("France");
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
    setPaymentType("USA");
    setSalesRep("");
    setGrandTotal(0);
    localStorage.removeItem("formData");
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 relative pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 gap-3">
        <h1 className="text-xl md:text-3xl font-bold">Générateur de Factures KPB Education</h1>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
          <span className="text-xs md:text-sm text-gray-600 truncate max-w-full">{user?.email}</span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 sm:flex-none">
              <LogOut className="h-4 w-4 md:mr-2" /> <span className="hidden sm:inline">Déconnexion</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm')} className="flex-1 sm:flex-none text-xs md:text-sm">
              CRM
            </Button>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-4 right-4 md:top-4 md:left-4 md:bottom-auto md:right-auto flex gap-2 z-50">
        <button
          onClick={clearForm}
          className="bg-red-500 text-white p-2 md:p-2 rounded-full shadow-lg hover:bg-red-600"
          aria-label="Effacer le formulaire"
        >
          <FiTrash2 size={20} className="md:w-6 md:h-6" />
        </button>
        <button
          onClick={fillDummyData}
          className="bg-blue-500 text-white p-2 md:p-2 rounded-full shadow-lg hover:bg-blue-600"
          aria-label="Remplir avec des données test"
        >
          <FiEdit size={20} className="md:w-6 md:h-6" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2 bg-white p-6 rounded-lg shadow-md">
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
              paymentType={paymentType}
              handlePaymentTypeChange={handlePaymentTypeChange}
            />

            <SalesRepSection 
              salesRep={salesRep}
              handleSalesRepChange={handleSalesRepChange}
            />
          </form>
        </div>

        <div className="w-full md:w-1/2">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Choisir un modèle</h2>
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {templates.map((template, index) => (
              <div
                key={index}
                className="cursor-pointer p-4 md:p-6 border-2 rounded-lg hover:border-blue-500 transition-all hover:shadow-lg bg-white"
                onClick={() => handleTemplateClick(index + 1)}
              >
                <h3 className="text-base md:text-lg font-semibold text-blue-600">{template.name}</h3>
                <p className="text-xs md:text-sm text-gray-600 mt-1">Cliquez pour générer la facture</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
