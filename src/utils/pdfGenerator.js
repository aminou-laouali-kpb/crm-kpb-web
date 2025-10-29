import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (invoiceData, templateNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting PDF generation...');
      
      // Use a robust selector for the rendered invoice element (mobile-safe)
      const existingInvoice = document.getElementById('invoice-root');
      
      console.log('Invoice element found:', !!existingInvoice);
      
      if (!existingInvoice) {
        console.error('Invoice element not found in DOM');
        throw new Error('Élément de facture introuvable. Veuillez réessayer.');
      }

      // Short delay to ensure DOM is fully rendered (optimize for speed)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Capturing invoice with html2canvas...');
      
      const canvas = await html2canvas(existingInvoice, {
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowWidth: existingInvoice.scrollWidth,
        windowHeight: existingInvoice.scrollHeight
      });
      
      console.log('Canvas created, generating PDF...');
      
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

      console.log('Downloading PDF:', fileName);
      
      // iOS/Safari-friendly download handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isIOS) {
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        pdf.save(fileName);
      }
      
      console.log('PDF generation completed successfully');
      resolve();
      
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
};
