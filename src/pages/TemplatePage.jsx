import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import InvoiceTemplate from '../components/InvoiceTemplate';
import { generatePDF } from '../utils/pdfGenerator';
import { templates } from '../utils/templateRegistry';

const TemplatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (location.state && location.state.formData) {
      setFormData(location.state.formData);
      setCurrentTemplate(location.state.selectedTemplate || 1);
    } else {
      // If no form data in location state, try to load from localStorage
      const savedFormData = localStorage.getItem('formData');
      if (savedFormData) {
        const parsedData = JSON.parse(savedFormData);
        // Ensure paymentInfo exists with correct structure
        const formattedData = {
          ...parsedData,
          paymentInfo: parsedData.paymentInfo || { type: parsedData.paymentType || 'USA' },
          clientInfo: parsedData.clientInfo || { firstName: '', lastName: '', email: '', whatsapp: '' },
          invoice: parsedData.invoice || { date: '', number: '' },
          service: parsedData.service || '',
          salesRep: parsedData.salesRep || '',
          selectedCurrency: parsedData.selectedCurrency || 'XOF',
          grandTotal: parsedData.grandTotal || 0
        };
        setFormData(formattedData);
      }
    }
  }, [location.state]);

  const handleTemplateChange = (templateNumber) => {
    setCurrentTemplate(templateNumber);
  };

  const handleDownloadPDF = async () => {
    if (formData && !isDownloading) {
      setIsDownloading(true);
      try {
        await generatePDF(formData, currentTemplate);
        toast.success("PDF généré avec succès");
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error("Échec de génération du PDF. Réessayez.");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!formData) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8 gap-3">
        <Button variant="ghost" onClick={handleBack} size="sm">
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" /> Retour
        </Button>
        <Button onClick={handleDownloadPDF} disabled={isDownloading} className="w-full sm:w-auto">
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm md:text-base">Téléchargement...</span>
            </>
          ) : (
            <span className="text-sm md:text-base">Télécharger PDF</span>
          )}
        </Button>
      </div>

      <div className="mb-4 md:mb-8 overflow-x-auto">
        <div className="flex space-x-2 md:space-x-4 pb-2">
          {templates.map((template, index) => (
            <div
              key={index}
              className={`cursor-pointer p-2 md:p-4 border rounded whitespace-nowrap text-xs md:text-base ${
                currentTemplate === index + 1
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
              }`}
              onClick={() => handleTemplateChange(index + 1)}
            >
              {template.name}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[210mm] mx-auto border shadow-lg overflow-auto bg-white">
        <div id="invoice-root" className="min-w-0 md:min-w-[600px]">
          <InvoiceTemplate data={formData} templateNumber={currentTemplate} />
        </div>
      </div>
    </div>
  );
};

export default TemplatePage;
