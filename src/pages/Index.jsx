import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';
import FloatingLabelInput from '../components/FloatingLabelInput';
import ClientInfoSection from '../components/ClientInfoSection';
import ServiceSection from '../components/ServiceSection';
import PaymentTypeSection from '../components/PaymentTypeSection';
import { templates } from "../utils/templateRegistry";
import { FiEdit, FiTrash2 } from "react-icons/fi";

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
  const [selectedCurrency, setSelectedCurrency] = useState("XOF");
  const [clientInfo, setClientInfo] = useState({ firstName: "", lastName: "" });
  const [invoice, setInvoice] = useState({
    date: "",
    number: "",
  });
  const [service, setService] = useState("");
  const [paymentType, setPaymentType] = useState("USA");
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    // Load form data from localStorage on component mount
    const savedFormData = localStorage.getItem("formData");
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      setClientInfo(parsedData.clientInfo || { firstName: "", lastName: "" });
      setInvoice(parsedData.invoice || { date: "", number: "" });
      setService(parsedData.service || "");
      setPaymentType(parsedData.paymentType || "USA");
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
      grandTotal,
      selectedCurrency,
    };
    localStorage.setItem("formData", JSON.stringify(formData));
  }, [
    clientInfo,
    invoice,
    service,
    paymentType,
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

  const handleTotalChange = (e) => {
    setGrandTotal(parseFloat(e.target.value) || 0);
  };

  const handleTemplateClick = (templateNumber) => {
    const formData = {
      clientInfo,
      invoice,
      service,
      paymentInfo: { type: paymentType },
      grandTotal,
      selectedCurrency,
    };
    navigate("/template", {
      state: { formData, selectedTemplate: templateNumber },
    });
  };

  const fillDummyData = () => {
    setClientInfo({
      firstName: "Jean",
      lastName: "Dupont",
    });
    setInvoice({
      date: new Date().toISOString().split("T")[0],
      number: generateRandomInvoiceNumber(),
    });
    setService("Formation en développement web - Programme complet de 6 mois incluant HTML, CSS, JavaScript, React et Node.js");
    setPaymentType("France");
    setGrandTotal(1500);
  };

  const clearForm = () => {
    setClientInfo({ firstName: "", lastName: "" });
    setInvoice({
      date: "",
      number: generateRandomInvoiceNumber(),
    });
    setService("");
    setPaymentType("USA");
    setGrandTotal(0);
    localStorage.removeItem("formData");
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <h1 className="text-3xl font-bold mb-8 text-center">Générateur de Factures KPB Education</h1>
      
      <div className="fixed top-4 left-4 flex gap-2">
        <button
          onClick={clearForm}
          className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600"
          aria-label="Effacer le formulaire"
        >
          <FiTrash2 size={24} />
        </button>
        <button
          onClick={fillDummyData}
          className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
          aria-label="Remplir avec des données test"
        >
          <FiEdit size={24} />
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
          </form>
        </div>

        <div className="w-full md:w-1/2">
          <h2 className="text-2xl font-semibold mb-4">Choisir un modèle</h2>
          <div className="grid grid-cols-1 gap-4">
            {templates.map((template, index) => (
              <div
                key={index}
                className="cursor-pointer p-6 border-2 rounded-lg hover:border-blue-500 transition-all hover:shadow-lg bg-white"
                onClick={() => handleTemplateClick(index + 1)}
              >
                <h3 className="text-lg font-semibold text-blue-600">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">Cliquez pour prévisualiser et générer la facture</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
