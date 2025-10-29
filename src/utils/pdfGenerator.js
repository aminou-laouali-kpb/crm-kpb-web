import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (invoiceData, templateNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Find the existing invoice element on the page instead of creating a new one
      const existingInvoice = document.querySelector('.w-\\[210mm\\].h-\\[297mm\\]');
      
      if (!existingInvoice) {
        throw new Error('Invoice element not found');
      }

      // Wait a bit to ensure all content is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(existingInvoice, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      const { number, date } = invoiceData.invoice;
      const { firstName, lastName } = invoiceData.clientInfo;
      const timestamp = new Date().getTime();

      let fileName;
      switch (templateNumber) {
        case 1:
          fileName = `Facture_KPB_${number}.pdf`;
          break;
        case 2:
          fileName = `KPB_${firstName}_${lastName}_${number}.pdf`;
          break;
        case 3:
          fileName = `Facture_${number}_${date}.pdf`;
          break;
        default:
          fileName = `facture_kpb_${timestamp}.pdf`;
      }

      pdf.save(fileName);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
